#!/bin/bash
# =============================================================================
# Post-create — installs infra management tools in the toolbox container
# =============================================================================
set -euo pipefail

echo "[INFO] Setting up infrastructure toolbox..."

# Install decK CLI
echo "[INFO] Installing decK CLI..."
curl -sL https://github.com/kong/deck/releases/latest/download/deck_$(uname -s)_$(uname -m).tar.gz \
  | tar -xz -C /tmp
sudo mv /tmp/deck /usr/local/bin/deck
deck version

# Install httpie, redis-cli, and psql
echo "[INFO] Installing httpie, redis-tools, and postgresql-client..."
sudo apt-get update -qq && sudo apt-get install -y -qq httpie redis-tools postgresql-client > /dev/null 2>&1

# Wait for Kong
echo "[WAIT] Waiting for Kong Admin API..."
timeout=60
elapsed=0
until curl -sf http://kong:8001/status > /dev/null 2>&1; do
  sleep 2
  elapsed=$((elapsed + 2))
  if [ $elapsed -ge $timeout ]; then
    echo "[WARN] Kong did not become ready in ${timeout}s"
    break
  fi
done

if curl -sf http://kong:8001/status > /dev/null 2>&1; then
  echo "[OK] Kong is ready"

  # Apply seed config from project-level kong/ directory
  if [ -f "kong/kong.yml" ]; then
    echo "[INFO] Applying Kong configuration via decK..."
    deck gateway sync kong/kong.yml --kong-addr http://kong:8001
    echo "[OK] Kong config applied"
  fi
fi

# Verify Redis
if redis-cli -h redis ping > /dev/null 2>&1; then
  echo "[OK] Redis is ready"
else
  echo "[WARN] Redis not responding"
fi

# Verify Postgres
if pg_isready -h kong-db -U kong > /dev/null 2>&1; then
  echo "[OK] Postgres is ready"
else
  echo "[WARN] Postgres not responding"
fi

echo ""
echo "========================================="
echo "  Infrastructure ready!"
echo "========================================="
echo "  Kong Admin:   http://localhost:8001"
echo "  Kong Proxy:   http://localhost:8000"
echo "  Kong Manager: http://localhost:8002"
echo "  Redis:        redis://localhost:6379"
echo ""
echo "  From your host, manage Kong with:"
echo "    deck gateway sync kong/kong.yml"
echo "    deck gateway dump"
echo "========================================="

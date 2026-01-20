# Integration Tests - Network Configuration

## Issue: Bun Fetch with Remote Kong

The integration tests use Bun's native `fetch` API, which has a known networking issue connecting to Kong instances running on remote IPs (e.g., `192.168.x.x:30001`). While `curl` works fine, Bun's fetch fails with "FailedToOpenSocket".

## Solution 1: SSH Port Forward (Recommended)

Forward your remote Kong to localhost:

```bash
# If Kong is on a different machine (e.g., Kubernetes node at 192.168.178.3:30001)
ssh -L 8001:192.168.178.3:30001 user@192.168.178.3 -N -f

# Update .env to use localhost
KONG_ADMIN_URL=http://localhost:8001
```

## Solution 2: Use kubectl port-forward

If Kong is in Kubernetes:

```bash
kubectl port-forward -n kong svc/kong-admin 8001:8001

# Update .env
KONG_ADMIN_URL=http://localhost:8001
```

## Solution 3: Skip Integration Tests

Integration tests are optional and skip gracefully when Kong is not accessible on expected ports. Unit tests (1523 tests) don't require Kong.

```bash
# Run only unit tests (no Kong/Redis needed)
bun run test:bun
```

## Verification

Test if Kong is accessible:

```bash
curl http://localhost:8001/status
```

Should return Kong status with `database.reachable: true`.

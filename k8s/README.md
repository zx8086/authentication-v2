# Kubernetes Deployment for Authentication Service

This directory contains Kubernetes manifests for deploying the authentication service to a Kubernetes cluster.

## Overview

The deployment includes:
- **Namespace**: Isolated environment for the authentication service
- **Deployment**: Main application deployment with security best practices
- **Service**: ClusterIP service for internal cluster communication
- **ConfigMap**: Non-sensitive configuration variables
- **Secret**: Sensitive configuration (template - requires actual values)
- **ServiceAccount**: Security context for pods
- **HPA**: Horizontal Pod Autoscaler for automatic scaling
- **Ingress**: External access configuration with security headers
- **PDB**: PodDisruptionBudget for maintenance stability
- **PrometheusRule**: AlertManager rules based on SLA thresholds
- **Kustomization**: Kustomize configuration for environment-specific deployments

## Security Features

- **Distroless base image**: Minimal attack surface
- **Non-root user**: Runs as user 65532 (nonroot)
- **Read-only root filesystem**: Prevents runtime modifications
- **Security contexts**: Comprehensive security policies
- **Resource limits**: Memory and CPU constraints
- **Pod anti-affinity**: Distributes pods across nodes
- **Health probes**: Liveness, readiness, and startup probes

## Prerequisites

1. **Kubernetes cluster** (v1.20+)
2. **kubectl** configured to access your cluster
3. **Docker image** built and available in your registry
4. **Ingress controller** (NGINX, ALB, etc.) if using Ingress

## Quick Deployment

### 1. Build and Push Docker Image

```bash
# Build the image
bun run docker:build

# Tag for your registry
docker tag authentication-service:2.4.0 your-registry/authentication-service:2.4.0

# Push to registry
docker push your-registry/authentication-service:2.4.0
```

### 2. Update Secret Values

Edit `secret.yaml` and replace placeholder values:

```bash
# Edit the secret file
vim k8s/secret.yaml

# Or create secrets via kubectl
kubectl create secret generic authentication-secrets \
  --namespace=authentication \
  --from-literal=KONG_JWT_AUTHORITY='https://api.example.com' \
  --from-literal=KONG_ADMIN_TOKEN='your-actual-token'
```

### 3. Deploy to Kubernetes

```bash
# Apply all manifests
kubectl apply -f k8s/

# Or use Kustomize
kubectl apply -k k8s/

# Check deployment status
kubectl get pods -n authentication
kubectl get services -n authentication
```

## Environment-Specific Deployments

### Using Kustomize Overlays

Create environment-specific overlays:

```bash
# Create overlays structure
mkdir -p k8s/overlays/{dev,staging,prod}

# Example dev overlay
cat > k8s/overlays/dev/kustomization.yaml << EOF
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: authentication-dev

resources:
- ../../base

patchesStrategicMerge:
- deployment-dev.yaml

images:
- name: authentication-service
  newTag: dev-latest

replicas:
- name: authentication-service
  count: 1
EOF

# Deploy dev environment
kubectl apply -k k8s/overlays/dev/
```

## Configuration

### Required Secrets

Replace these values in `secret.yaml` before deployment:

| Variable | Description | Example |
|----------|-------------|---------|
| `KONG_JWT_AUTHORITY` | JWT authority URL | `https://api.example.com` |
| `KONG_JWT_AUDIENCE` | JWT audience | `example-api` |
| `KONG_ADMIN_URL` | Kong Admin API URL | `https://kong-admin:8001` |
| `KONG_ADMIN_TOKEN` | Kong Admin API token | `32+ character token` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OpenTelemetry collector | `https://apm.example.com` |

### ConfigMap Variables

Non-sensitive configuration in `configmap.yaml`:

- Server settings (PORT, NODE_ENV)
- JWT configuration (expiration, key claim)
- Circuit breaker settings
- OpenTelemetry configuration

## Monitoring & Observability

### Health Checks

- **Liveness**: `/health` endpoint
- **Readiness**: `/health` endpoint
- **Startup**: `/health` endpoint with extended timeout

### Metrics

- **Prometheus**: Metrics exposed at `/metrics`
- **OpenTelemetry**: Full observability with traces, metrics, and logs

### Scaling

```bash
# Manual scaling
kubectl scale deployment authentication-service -n authentication --replicas=5

# Check HPA status
kubectl get hpa -n authentication

# View HPA events
kubectl describe hpa authentication-service -n authentication
```

## Networking

### Internal Access

```bash
# Access from within cluster
curl http://authentication-service.authentication.svc.cluster.local/health
```

### External Access

Update `ingress.yaml` with your domain:

```yaml
spec:
  tls:
  - hosts:
    - auth.yourdomain.com  # Replace with your domain
    secretName: authentication-tls

  rules:
  - host: auth.yourdomain.com  # Replace with your domain
```

## Troubleshooting

### Check Pod Status

```bash
# List pods
kubectl get pods -n authentication

# Describe pod
kubectl describe pod <pod-name> -n authentication

# View logs
kubectl logs <pod-name> -n authentication

# Follow logs
kubectl logs -f deployment/authentication-service -n authentication
```

### Common Issues

1. **ImagePullBackOff**: Update image reference in deployment.yaml
2. **CrashLoopBackOff**: Check secret values and environment variables
3. **Service Unavailable**: Verify health check endpoints
4. **Permission Denied**: Check security contexts and service account

### Debug Commands

```bash
# Port forward for local testing
kubectl port-forward svc/authentication-service 3000:80 -n authentication

# Execute into pod
kubectl exec -it <pod-name> -n authentication -- /bin/sh

# Check service endpoints
kubectl get endpoints -n authentication

# View events
kubectl get events -n authentication --sort-by='.lastTimestamp'
```

## Secret Management Options

The service supports multiple secret management approaches. Choose based on your compliance requirements.

### Option 1: Kubernetes Secrets (Default)

Use `secret.yaml` for simple deployments with good RBAC:

```bash
kubectl apply -f k8s/secret.yaml
```

**Recommended when:**
- Simple deployment with limited secret scope
- etcd encryption at rest is enabled
- Strong RBAC policies in place

### Option 2: External Secrets Operator

Use `external-secret.yaml` for centralized secret management:

```bash
# Install ESO
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets -n external-secrets --create-namespace

# Apply ExternalSecret (choose AWS or Vault variant)
kubectl apply -f k8s/external-secret.yaml
```

**Recommended when:**
- SOC2/PCI compliance required
- Secret rotation needed
- Multi-team secret access
- Centralized audit logging required

### Option 3: Sealed Secrets

Use `sealed-secret.yaml` for GitOps-compatible encrypted secrets:

```bash
# Install Sealed Secrets
helm repo add sealed-secrets https://bitnami-labs.github.io/sealed-secrets
helm install sealed-secrets sealed-secrets/sealed-secrets -n kube-system

# Seal your secrets
kubeseal --format yaml < k8s/secret.yaml > k8s/sealed-secret-generated.yaml

# Apply sealed secret
kubectl apply -f k8s/sealed-secret-generated.yaml
```

**Recommended when:**
- GitOps workflow required
- Simpler than ESO but more secure than plain secrets
- No external secret store available

### Decision Matrix

| Requirement | K8s Secrets | Sealed Secrets | External Secrets |
|-------------|-------------|----------------|------------------|
| Simple setup | Yes | Medium | Complex |
| GitOps compatible | No | Yes | Yes |
| Secret rotation | Manual | Manual | Automatic |
| Audit logging | K8s audit | K8s audit | Backend audit |
| SOC2/PCI | Maybe | Maybe | Yes |
| Multi-cluster | Manual sync | Per-cluster | Centralized |

## Security Considerations

### Production Hardening

1. **Use external secret management** (AWS Secrets Manager, Vault) - see above
2. **Enable Pod Security Standards**
3. **Configure Network Policies**
4. **Use private container registry**
5. **Enable audit logging**
6. **Regular security scanning**

### Network Policies

Example network policy for additional security:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: authentication-service
  namespace: authentication
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: authentication-service
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to: []
    ports:
    - protocol: TCP
      port: 53
    - protocol: UDP
      port: 53
  - to:
    - namespaceSelector:
        matchLabels:
          name: kong
    ports:
    - protocol: TCP
      port: 8001
```

## Performance Tuning

### Resource Requests/Limits

Adjust based on your workload:

```yaml
resources:
  requests:
    memory: "64Mi"   # Baseline: ~50-80MB
    cpu: "50m"       # Baseline: <2% CPU
  limits:
    memory: "256Mi"  # Allow for 4x growth
    cpu: "500m"      # Allow for 10x CPU spike
```

### HPA Configuration

Tune autoscaling based on load patterns:

```yaml
metrics:
- type: Resource
  resource:
    name: cpu
    target:
      type: Utilization
      averageUtilization: 70  # Scale at 70% CPU
- type: Resource
  resource:
    name: memory
    target:
      type: Utilization
      averageUtilization: 80  # Scale at 80% memory
```

## Prometheus AlertManager Rules

The `prometheus-rules.yaml` defines AlertManager rules based on the SLA thresholds documented in `docs/operations/SLA.md`.

### Alert Groups

| Group | Alerts | Description |
|-------|--------|-------------|
| `auth-service-resources` | Memory warning/critical | Memory usage >70%/80% of 256MB limit |
| `auth-service-event-loop` | Event loop delay warning/critical | Event loop delay >50ms/100ms |
| `auth-service-http-errors` | HTTP 5xx rate warning/critical | Error rate >2%/5% |
| `auth-service-kong-latency` | Kong latency warning/critical | P95 latency >200ms/500ms |
| `auth-service-circuit-breaker` | Circuit breaker opens | Opens >1/3 per hour |
| `auth-service-token-errors` | Token error rate warning/critical | Error rate >1%/5% |
| `auth-service-response-time` | Endpoint SLA violations | P95 exceeds SLA targets |
| `auth-service-availability` | Service down, pods not ready | Availability issues |
| `auth-service-cache` | Cache hit rate, Redis status | Cache performance |

### Severity Levels

- **warning**: Non-critical issues requiring attention
- **critical**: Immediate action required, potential service impact

### Prerequisites

Requires Prometheus Operator (kube-prometheus-stack) to be installed:

```bash
# Install kube-prometheus-stack
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install kube-prometheus prometheus-community/kube-prometheus-stack -n monitoring
```

### Customizing Runbook URLs

Update the `runbook_url` annotations in `prometheus-rules.yaml` to point to your organization's runbooks.

## Pod Disruption Budget

The `pdb.yaml` ensures service availability during Kubernetes node maintenance, upgrades, and voluntary disruptions.

### Configuration

```yaml
spec:
  maxUnavailable: 1  # Only 1 pod can be disrupted at a time
```

With 3 replicas configured, at least 2 pods will always be available during voluntary disruptions (node drains, upgrades).

### Testing PDB During Node Drain

```bash
# Check PDB status
kubectl get pdb -n authentication

# View PDB details
kubectl describe pdb authentication-service-pdb -n authentication

# Simulate node drain (on a test node)
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# Verify pods are evicted one at a time
kubectl get pods -n authentication -w
```

## Production Checklist

- [ ] Replace all placeholder values in `secret.yaml`
- [ ] Update image references to your registry
- [ ] Configure TLS certificates
- [x] Set up monitoring and alerting
- [ ] Configure backup and disaster recovery
- [ ] Enable audit logging
- [ ] Configure network policies
- [ ] Set resource quotas
- [x] Configure pod disruption budgets
- [ ] Test scaling and failover scenarios
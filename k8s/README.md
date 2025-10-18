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

## Security Considerations

### Production Hardening

1. **Use external secret management** (AWS Secrets Manager, Vault)
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

## Production Checklist

- [ ] Replace all placeholder values in `secret.yaml`
- [ ] Update image references to your registry
- [ ] Configure TLS certificates
- [ ] Set up monitoring and alerting
- [ ] Configure backup and disaster recovery
- [ ] Enable audit logging
- [ ] Configure network policies
- [ ] Set resource quotas
- [ ] Configure pod disruption budgets
- [ ] Test scaling and failover scenarios
# TaskFlow - Oracle Cloud K3s Deployment

This directory contains Kubernetes manifests for deploying TaskFlow on Oracle Cloud using K3s.

## Prerequisites

- Oracle Cloud Always Free Tier account
- K3s cluster provisioned (use Terraform in `infrastructure/oracle-cloud/`)
- kubectl configured to access your cluster
- Optional: Helm for cert-manager and monitoring

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Load Balancer (Ingress)            │
│       taskflow.yourdomain.com                   │
│       api.taskflow.yourdomain.com               │
└────────────┬────────────────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
┌───▼────┐     ┌─────▼──────┐
│Frontend│     │  Backend   │
│(2 pods)│     │  (3 pods)  │
│        │     │    +HPA    │
└────────┘     └─────┬──────┘
                     │
              ┌──────┴───────┐
              │              │
       ┌──────▼──────┐  ┌───▼────┐
       │  PostgreSQL │  │ Redis  │
       │(StatefulSet)│  │        │
       │    +PVC     │  │        │
       └─────────────┘  └────────┘
```

## Quick Start

### 1. Create Namespace and Secrets

```bash
# Create namespace
kubectl apply -f namespace.yaml

# Copy secrets template and fill in your values
cp secrets.yaml.template secrets.yaml
# Edit secrets.yaml with your actual secrets (base64 encoded)
kubectl apply -f secrets.yaml

# Apply ConfigMaps
kubectl apply -f configmap.yaml
kubectl apply -f postgres-init-configmap.yaml
```

### 2. Deploy Database Layer

```bash
# Deploy PostgreSQL StatefulSet
kubectl apply -f postgres-statefulset.yaml
kubectl apply -f postgres-service.yaml

# Deploy Redis
kubectl apply -f redis-deployment.yaml
kubectl apply -f redis-service.yaml

# Wait for databases to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n taskflow --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n taskflow --timeout=300s
```

### 3. Deploy Application Layer

```bash
# Deploy Backend
kubectl apply -f backend-deployment.yaml
kubectl apply -f backend-service.yaml
kubectl apply -f backend-hpa.yaml

# Deploy Frontend
kubectl apply -f frontend-deployment.yaml
kubectl apply -f frontend-service.yaml

# Wait for applications to be ready
kubectl wait --for=condition=ready pod -l app=backend -n taskflow --timeout=300s
kubectl wait --for=condition=ready pod -l app=frontend -n taskflow --timeout=300s
```

### 4. Setup Ingress (Optional but Recommended)

```bash
# Install cert-manager for TLS (if not already installed)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Wait for cert-manager to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=cert-manager -n cert-manager --timeout=300s

# Create ClusterIssuer for Let's Encrypt
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: traefik
EOF

# Update ingress.yaml with your domain
# Edit ingress.yaml and replace taskflow.yourdomain.com
kubectl apply -f ingress.yaml
```

### 5. Verify Deployment

```bash
# Check all pods
kubectl get pods -n taskflow

# Check services
kubectl get svc -n taskflow

# Check ingress
kubectl get ingress -n taskflow

# View logs
kubectl logs -l app=backend -n taskflow --tail=50
kubectl logs -l app=frontend -n taskflow --tail=50

# Check HPA status
kubectl get hpa -n taskflow

# Check persistent volumes
kubectl get pvc -n taskflow
```

## Accessing the Application

### Via LoadBalancer (Direct)

```bash
# Get LoadBalancer external IP
kubectl get svc frontend-service -n taskflow

# Access via:
http://<EXTERNAL-IP>
```

### Via Ingress (with Domain)

```bash
# Access via your configured domain
https://taskflow.yourdomain.com      # Frontend
https://api.taskflow.yourdomain.com  # Backend API
```

## Scaling

### Manual Scaling

```bash
# Scale backend
kubectl scale deployment backend -n taskflow --replicas=5

# Scale frontend
kubectl scale deployment frontend -n taskflow --replicas=3
```

### Auto-Scaling

Backend has HPA configured:
- Min replicas: 3
- Max replicas: 10
- CPU target: 70%
- Memory target: 80%

```bash
# Monitor auto-scaling
kubectl get hpa backend-hpa -n taskflow --watch

# View HPA details
kubectl describe hpa backend-hpa -n taskflow
```

## Database Management

### Accessing PostgreSQL

```bash
# Get PostgreSQL pod name
PGPOD=$(kubectl get pod -l app=postgres -n taskflow -o jsonpath='{.items[0].metadata.name}')

# Access PostgreSQL shell
kubectl exec -it $PGPOD -n taskflow -- psql -U taskflow_user -d taskflow

# Backup database
kubectl exec $PGPOD -n taskflow -- pg_dump -U taskflow_user taskflow > backup.sql

# Restore database
kubectl exec -i $PGPOD -n taskflow -- psql -U taskflow_user taskflow < backup.sql
```

### Accessing Redis

```bash
# Get Redis pod name
REDISPOD=$(kubectl get pod -l app=redis -n taskflow -o jsonpath='{.items[0].metadata.name}')

# Access Redis CLI
kubectl exec -it $REDISPOD -n taskflow -- redis-cli

# Clear cache
kubectl exec -it $REDISPOD -n taskflow -- redis-cli FLUSHALL
```

## Monitoring

### Built-in Kubernetes Monitoring

```bash
# Resource usage by pod
kubectl top pods -n taskflow

# Resource usage by node
kubectl top nodes

# View events
kubectl get events -n taskflow --sort-by='.lastTimestamp'
```

### Application Logs

```bash
# Backend logs
kubectl logs -f -l app=backend -n taskflow

# Frontend logs
kubectl logs -f -l app=frontend -n taskflow

# All logs from last hour
kubectl logs -l app=backend -n taskflow --since=1h

# Stream logs from all backend pods
kubectl logs -f -l app=backend -n taskflow --all-containers=true
```

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n taskflow

# Check events
kubectl get events -n taskflow --field-selector involvedObject.name=<pod-name>

# Check resource constraints
kubectl top pods -n taskflow
```

### Database Connection Issues

```bash
# Test database connectivity from backend pod
BACKEND_POD=$(kubectl get pod -l app=backend -n taskflow -o jsonpath='{.items[0].metadata.name}')
kubectl exec -it $BACKEND_POD -n taskflow -- nc -zv postgres-service 5432

# Check database logs
kubectl logs -l app=postgres -n taskflow --tail=100
```

### Ingress Not Working

```bash
# Check ingress status
kubectl describe ingress taskflow-ingress -n taskflow

# Check cert-manager certificate
kubectl get certificate -n taskflow

# Check Traefik logs (K3s default ingress)
kubectl logs -n kube-system -l app.kubernetes.io/name=traefik
```

## Updating the Application

### Rolling Update

```bash
# Update backend image
kubectl set image deployment/backend backend=your-registry/taskflow-backend:v2.0.0 -n taskflow

# Update frontend image
kubectl set image deployment/frontend frontend=your-registry/taskflow-frontend:v2.0.0 -n taskflow

# Check rollout status
kubectl rollout status deployment/backend -n taskflow
kubectl rollout status deployment/frontend -n taskflow
```

### Rollback

```bash
# Rollback backend
kubectl rollout undo deployment/backend -n taskflow

# Rollback to specific revision
kubectl rollout undo deployment/backend --to-revision=2 -n taskflow

# View rollout history
kubectl rollout history deployment/backend -n taskflow
```

## Cleanup

```bash
# Delete all resources in namespace
kubectl delete namespace taskflow

# Or delete individual resources
kubectl delete -f .

# Note: PersistentVolumeClaims may need manual deletion
kubectl delete pvc --all -n taskflow
```

## Resource Requirements

### Minimum (1 replica each)
- CPU: ~600m (0.6 cores)
- Memory: ~1.5Gi
- Storage: 20Gi (PostgreSQL)

### Recommended (auto-scaling enabled)
- CPU: 2-4 cores
- Memory: 4-8Gi
- Storage: 50Gi (PostgreSQL with room for growth)

### Oracle Cloud Free Tier Allocation
- 4 ARM-based Ampere A1 cores
- 24 GB RAM
- 200 GB block storage

This easily accommodates TaskFlow with room for monitoring stack!

## Security Considerations

1. **Secrets Management**: Use external secrets manager in production
2. **Network Policies**: Implement NetworkPolicies to restrict pod communication
3. **RBAC**: Configure appropriate RBAC rules
4. **TLS**: Use cert-manager for automatic TLS certificate management
5. **Image Security**: Scan images for vulnerabilities before deployment
6. **Resource Limits**: Always set resource limits to prevent resource exhaustion

## Next Steps

- [ ] Set up Prometheus and Grafana for monitoring
- [ ] Configure automated backups for PostgreSQL
- [ ] Implement NetworkPolicies for pod isolation
- [ ] Set up external secrets management (e.g., Sealed Secrets)
- [ ] Configure log aggregation (e.g., Loki)
- [ ] Implement GitOps with ArgoCD or Flux

## Support

For issues specific to this deployment, please check:
- Oracle Cloud documentation
- K3s documentation
- Kubernetes documentation

# TaskFlow on Minikube

Deploy TaskFlow to a local Minikube cluster for learning and development.

## Prerequisites

- [Minikube](https://minikube.sigs.k8s.io/docs/start/) installed
- [kubectl](https://kubernetes.io/docs/tasks/tools/) installed
- Docker images built and available

## Quick Start

### 1. Start Minikube

```bash
# Start cluster with enough resources
minikube start --cpus=4 --memory=8192 --disk-size=20g

# Enable ingress addon
minikube addons enable ingress

# Enable metrics server (for HPA)
minikube addons enable metrics-server
```

### 2. Build and Load Docker Images

```bash
# Build images
cd app/frontend
docker build -t taskflow-frontend:latest .

cd ../backend
docker build -t taskflow-backend:latest .

# Load images into Minikube
minikube image load taskflow-frontend:latest
minikube image load taskflow-backend:latest
```

### 3. Create Secrets

```bash
# Copy template and edit with your values
cp secrets.yaml.template secrets.yaml

# Edit secrets.yaml with base64-encoded values
# To encode: echo -n 'your-value' | base64

# Or create secrets directly
kubectl create secret generic taskflow-secrets \
  --from-literal=DB_USER=taskflow_user \
  --from-literal=DB_PASSWORD=your_secure_password \
  --from-literal=JWT_SECRET=your_jwt_secret \
  --from-literal=POSTGRES_PASSWORD=your_postgres_password \
  -n taskflow
```

### 4. Deploy Application

```bash
# Apply all manifests
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secrets.yaml
kubectl apply -f postgres-pvc.yaml
kubectl apply -f postgres-deployment.yaml
kubectl apply -f postgres-service.yaml
kubectl apply -f backend-deployment.yaml
kubectl apply -f backend-service.yaml
kubectl apply -f backend-hpa.yaml
kubectl apply -f frontend-deployment.yaml
kubectl apply -f frontend-service.yaml
kubectl apply -f ingress.yaml

# Or apply all at once
kubectl apply -f .
```

### 5. Verify Deployment

```bash
# Check all resources
kubectl get all -n taskflow

# Check pod status
kubectl get pods -n taskflow

# Check services
kubectl get svc -n taskflow

# Check ingress
kubectl get ingress -n taskflow
```

### 6. Access Application

#### Option A: Via Ingress

```bash
# Get Minikube IP
minikube ip

# Add to /etc/hosts
echo "$(minikube ip) taskflow.local" | sudo tee -a /etc/hosts

# Access application
open http://taskflow.local
```

#### Option B: Via Port Forward

```bash
# Forward frontend port
kubectl port-forward -n taskflow svc/frontend-service 8080:80

# Forward backend port
kubectl port-forward -n taskflow svc/backend-service 3000:3000

# Access application
open http://localhost:8080
```

#### Option C: Via LoadBalancer (with tunnel)

```bash
# Start minikube tunnel (needs to stay running)
minikube tunnel

# Get external IP
kubectl get svc -n taskflow frontend-service

# Access via EXTERNAL-IP
open http://<EXTERNAL-IP>
```

## Manifest Files

### Core Resources

- `namespace.yaml` - Creates taskflow namespace
- `configmap.yaml` - Non-sensitive configuration
- `secrets.yaml.template` - Template for secrets (create secrets.yaml)

### Database

- `postgres-pvc.yaml` - Persistent storage for PostgreSQL
- `postgres-deployment.yaml` - PostgreSQL deployment
- `postgres-service.yaml` - PostgreSQL service

### Backend

- `backend-deployment.yaml` - Backend API deployment (2 replicas)
- `backend-service.yaml` - Backend service (ClusterIP)
- `backend-hpa.yaml` - Auto-scaling based on CPU/memory

### Frontend

- `frontend-deployment.yaml` - Frontend deployment (2 replicas)
- `frontend-service.yaml` - Frontend service (LoadBalancer)

### Networking

- `ingress.yaml` - Ingress routing rules

## Common Operations

### View Logs

```bash
# View backend logs
kubectl logs -n taskflow -l app=backend -f

# View frontend logs
kubectl logs -n taskflow -l app=frontend -f

# View specific pod logs
kubectl logs -n taskflow <pod-name> -f
```

### Execute Commands in Pod

```bash
# Get shell in backend pod
kubectl exec -it -n taskflow <backend-pod-name> -- sh

# Get shell in postgres pod
kubectl exec -it -n taskflow <postgres-pod-name> -- psql -U taskflow_user -d taskflow
```

### Scale Deployments

```bash
# Manual scaling
kubectl scale deployment backend -n taskflow --replicas=3

# View HPA status
kubectl get hpa -n taskflow

# Describe HPA
kubectl describe hpa backend-hpa -n taskflow
```

### Rolling Updates

```bash
# Update image
kubectl set image deployment/backend backend=taskflow-backend:v2 -n taskflow

# Check rollout status
kubectl rollout status deployment/backend -n taskflow

# View rollout history
kubectl rollout history deployment/backend -n taskflow

# Rollback if needed
kubectl rollout undo deployment/backend -n taskflow
```

### Resource Usage

```bash
# View resource usage
kubectl top nodes
kubectl top pods -n taskflow

# Describe resources
kubectl describe deployment backend -n taskflow
kubectl describe pod <pod-name> -n taskflow
```

## Monitoring

### Built-in Dashboard

```bash
# Enable dashboard
minikube addons enable dashboard

# Open dashboard
minikube dashboard
```

### View Metrics

```bash
# Get metrics
kubectl get --raw /apis/metrics.k8s.io/v1beta1/nodes
kubectl get --raw /apis/metrics.k8s.io/v1beta1/pods

# Top commands
kubectl top nodes
kubectl top pods -n taskflow --containers
```

## Database Management

### Seed Database

```bash
# Get backend pod name
BACKEND_POD=$(kubectl get pods -n taskflow -l app=backend -o jsonpath='{.items[0].metadata.name}')

# Run seed script
kubectl exec -n taskflow $BACKEND_POD -- npm run seed
```

### Database Backup

```bash
# Create backup
kubectl exec -n taskflow <postgres-pod> -- pg_dump -U taskflow_user taskflow > backup.sql

# Restore backup
kubectl exec -i -n taskflow <postgres-pod> -- psql -U taskflow_user taskflow < backup.sql
```

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl get pods -n taskflow

# Describe pod
kubectl describe pod <pod-name> -n taskflow

# Check events
kubectl get events -n taskflow --sort-by='.lastTimestamp'

# View logs
kubectl logs <pod-name> -n taskflow
```

### Image Pull Errors

```bash
# Verify images are loaded
minikube image ls | grep taskflow

# Load images if missing
minikube image load taskflow-frontend:latest
minikube image load taskflow-backend:latest
```

### Service Not Accessible

```bash
# Check service endpoints
kubectl get endpoints -n taskflow

# Verify service selectors match pod labels
kubectl get svc backend-service -n taskflow -o yaml
kubectl get pods -n taskflow --show-labels
```

### Database Connection Issues

```bash
# Check if postgres is running
kubectl get pods -n taskflow -l app=postgres

# Test database connection
kubectl exec -it -n taskflow <backend-pod> -- nc -zv postgres-service 5432

# Check database logs
kubectl logs -n taskflow -l app=postgres
```

### Ingress Not Working

```bash
# Check ingress status
kubectl get ingress -n taskflow

# Describe ingress
kubectl describe ingress taskflow-ingress -n taskflow

# Check ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx
```

## Clean Up

### Delete Application

```bash
# Delete all resources
kubectl delete -f .

# Or delete namespace (removes everything)
kubectl delete namespace taskflow
```

### Stop Minikube

```bash
# Stop cluster
minikube stop

# Delete cluster
minikube delete
```

## Best Practices

1. **Resource Limits** - Always set requests and limits
2. **Health Checks** - Configure liveness and readiness probes
3. **Multiple Replicas** - Run at least 2 replicas for HA
4. **Secrets Management** - Never commit secrets to git
5. **Labels** - Use consistent labeling
6. **Namespace** - Use namespaces to organize resources
7. **Monitoring** - Enable metrics server and monitor resources

## Next Steps

- Configure persistent storage with different storage classes
- Set up network policies for security
- Configure resource quotas
- Set up RBAC for access control
- Deploy monitoring stack (Prometheus/Grafana)
- Configure cert-manager for TLS

## Resources

- [Minikube Documentation](https://minikube.sigs.k8s.io/docs/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)

## License

MIT

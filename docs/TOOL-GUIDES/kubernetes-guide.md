# Kubernetes Guide for TaskFlow

Quick reference for Kubernetes operations with TaskFlow.

## Essential Commands

### Cluster Management
```bash
kubectl cluster-info
kubectl get nodes
kubectl top nodes
```

### Pods
```bash
kubectl get pods -n taskflow
kubectl describe pod <pod-name> -n taskflow
kubectl logs <pod-name> -n taskflow
kubectl logs -f <pod-name> -n taskflow  # Follow
kubectl exec -it <pod-name> -n taskflow -- sh
kubectl delete pod <pod-name> -n taskflow
```

### Deployments
```bash
kubectl get deployments -n taskflow
kubectl scale deployment backend --replicas=5 -n taskflow
kubectl rollout status deployment/backend -n taskflow
kubectl rollout undo deployment/backend -n taskflow
kubectl rollout history deployment/backend -n taskflow
```

### Services
```bash
kubectl get svc -n taskflow
kubectl describe svc backend-service -n taskflow
kubectl port-forward svc/backend-service 3000:3000 -n taskflow
```

### ConfigMaps & Secrets
```bash
kubectl get configmaps -n taskflow
kubectl get secrets -n taskflow
kubectl describe configmap taskflow-config -n taskflow
kubectl create secret generic my-secret --from-literal=key=value -n taskflow
```

## TaskFlow Deployment

### Deploy to Minikube
```bash
minikube start --cpus=4 --memory=8192
kubectl apply -f kubernetes/local-minikube/
kubectl get pods -n taskflow -w
```

### Deploy to K3s (Oracle Cloud)
```bash
kubectl apply -f kubernetes/oracle-k3s/
kubectl wait --for=condition=ready pod --all -n taskflow --timeout=300s
```

### Access Applications
```bash
# Via port-forward
kubectl port-forward -n taskflow svc/frontend-service 8080:80

# Get LoadBalancer IP
kubectl get svc frontend-service -n taskflow
```

## Troubleshooting

```bash
# Check pod events
kubectl get events -n taskflow --sort-by='.lastTimestamp'

# Check pod logs
kubectl logs -l app=backend -n taskflow --tail=100

# Describe resource
kubectl describe pod <pod-name> -n taskflow

# Check resource usage
kubectl top pods -n taskflow
```

## Resources
- [Kubernetes Docs](https://kubernetes.io/docs/)
- [Kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)

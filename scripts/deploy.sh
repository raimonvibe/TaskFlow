#!/bin/bash
# TaskFlow - Deploy Script
# Deploys TaskFlow application to Kubernetes cluster

set -euo pipefail

# Configuration
NAMESPACE="taskflow"
LOG_FILE="/var/log/taskflow-deploy.log"
BACKUP_BEFORE_DEPLOY=true
ROLLBACK_ON_FAILURE=true

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "ERROR: $1"
    exit 1
}

# Success message
success() {
    log "SUCCESS: $1"
}

# Warning message
warning() {
    log "WARNING: $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   error_exit "This script must be run as root"
fi

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check kubectl
    if ! command -v kubectl >/dev/null 2>&1; then
        error_exit "kubectl is not installed"
    fi
    
    # Check cluster access
    if ! kubectl cluster-info >/dev/null 2>&1; then
        error_exit "Cannot access Kubernetes cluster"
    fi
    
    # Check namespace
    if ! kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
        log "Creating namespace $NAMESPACE..."
        kubectl create namespace "$NAMESPACE"
    fi
    
    success "Prerequisites check passed"
}

# Backup before deployment
backup_before_deploy() {
    if [[ "$BACKUP_BEFORE_DEPLOY" == "true" ]]; then
        log "Creating backup before deployment..."
        if [[ -f "/usr/local/bin/backup-taskflow.sh" ]]; then
            /usr/local/bin/backup-taskflow.sh
            success "Backup completed"
        else
            warning "Backup script not found, skipping backup"
        fi
    fi
}

# Deploy application
deploy_application() {
    log "Deploying TaskFlow application..."
    
    # Deploy namespace
    kubectl apply -f kubernetes/oracle-k3s/namespace.yaml
    
    # Deploy configmap
    kubectl apply -f kubernetes/oracle-k3s/configmap.yaml
    
    # Deploy secrets (if exists)
    if [[ -f "kubernetes/oracle-k3s/secrets.yaml" ]]; then
        kubectl apply -f kubernetes/oracle-k3s/secrets.yaml
    else
        warning "Secrets file not found, using default values"
    fi
    
    # Deploy PostgreSQL
    kubectl apply -f kubernetes/oracle-k3s/postgres-deployment.yaml
    kubectl apply -f kubernetes/oracle-k3s/postgres-service.yaml
    kubectl apply -f kubernetes/oracle-k3s/postgres-pvc.yaml
    
    # Wait for PostgreSQL
    log "Waiting for PostgreSQL to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/postgres -n "$NAMESPACE"
    
    # Deploy backend
    kubectl apply -f kubernetes/oracle-k3s/backend-deployment.yaml
    kubectl apply -f kubernetes/oracle-k3s/backend-service.yaml
    kubectl apply -f kubernetes/oracle-k3s/backend-hpa.yaml
    
    # Wait for backend
    log "Waiting for backend to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/backend -n "$NAMESPACE"
    
    # Deploy frontend
    kubectl apply -f kubernetes/oracle-k3s/frontend-deployment.yaml
    kubectl apply -f kubernetes/oracle-k3s/frontend-service.yaml
    
    # Wait for frontend
    log "Waiting for frontend to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/frontend -n "$NAMESPACE"
    
    # Deploy ingress
    kubectl apply -f kubernetes/oracle-k3s/ingress.yaml
    
    success "Application deployment completed"
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    # Check pods
    local pods
    pods=$(kubectl get pods -n "$NAMESPACE" --no-headers | wc -l)
    
    if [[ $pods -gt 0 ]]; then
        log "OK: Found $pods pods in $NAMESPACE namespace"
    else
        error_exit "No pods found in $NAMESPACE namespace"
    fi
    
    # Check services
    local services
    services=$(kubectl get svc -n "$NAMESPACE" --no-headers | wc -l)
    
    if [[ $services -gt 0 ]]; then
        log "OK: Found $services services in $NAMESPACE namespace"
    else
        error_exit "No services found in $NAMESPACE namespace"
    fi
    
    # Check ingress
    if kubectl get ingress -n "$NAMESPACE" >/dev/null 2>&1; then
        log "OK: Ingress is configured"
    else
        warning "No ingress found"
    fi
    
    # Check pod status
    local failed_pods
    failed_pods=$(kubectl get pods -n "$NAMESPACE" --no-headers | grep -v Running | wc -l)
    
    if [[ $failed_pods -eq 0 ]]; then
        log "OK: All pods are running"
    else
        log "WARNING: $failed_pods pods are not running"
        kubectl get pods -n "$NAMESPACE" --no-headers | grep -v Running
    fi
    
    success "Deployment verification completed"
}

# Rollback deployment
rollback_deployment() {
    if [[ "$ROLLBACK_ON_FAILURE" == "true" ]]; then
        log "Rolling back deployment..."
        
        # Delete deployments
        kubectl delete deployment backend frontend -n "$NAMESPACE" --ignore-not-found=true
        
        # Delete services
        kubectl delete service backend-service frontend-service -n "$NAMESPACE" --ignore-not-found=true
        
        # Delete ingress
        kubectl delete ingress taskflow-ingress -n "$NAMESPACE" --ignore-not-found=true
        
        # Restore from backup
        if [[ -f "/var/backups/taskflow/latest_backup.tar.gz" ]]; then
            log "Restoring from backup..."
            cd /var/backups/taskflow
            tar -xzf latest_backup.tar.gz
            kubectl apply -f *.yaml
        fi
        
        success "Rollback completed"
    fi
}

# Main deployment function
main() {
    log "Starting TaskFlow deployment..."
    
    # Run deployment steps
    check_prerequisites
    backup_before_deploy
    deploy_application
    verify_deployment
    
    success "TaskFlow deployment completed successfully"
    
    # Display deployment information
    log "Deployment Information:"
    kubectl get all -n "$NAMESPACE"
    kubectl get ingress -n "$NAMESPACE"
    
    log "Access the application at: http://your-domain.com"
    log "Monitor with: kubectl get pods -n $NAMESPACE -w"
}

# Error handling
trap 'log "Deployment failed, rolling back..."; rollback_deployment; exit 1' ERR

# Run main function
main "$@"

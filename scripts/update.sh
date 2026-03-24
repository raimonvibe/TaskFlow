#!/bin/bash
# TaskFlow - Update Script
# Updates TaskFlow application and system packages

set -euo pipefail

# Configuration
NAMESPACE="taskflow"
LOG_FILE="/var/log/taskflow-update.log"
BACKUP_BEFORE_UPDATE=true
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

# Update system packages
update_system() {
    log "Updating system packages..."
    
    # Update apt cache
    apt update
    
    # Upgrade packages
    apt upgrade -y
    
    # Install security updates
    apt dist-upgrade -y
    
    # Clean up
    apt autoremove -y
    apt autoclean
    
    success "System packages updated"
}

# Update Docker images
update_docker() {
    log "Updating Docker images..."
    
    # Pull latest images
    docker pull postgres:15-alpine
    docker pull node:18-alpine
    docker pull nginx:alpine
    
    # Clean up old images
    docker image prune -f
    
    success "Docker images updated"
}

# Update Kubernetes resources
update_kubernetes() {
    log "Updating Kubernetes resources..."
    
    # Update deployments
    kubectl rollout restart deployment/backend -n "$NAMESPACE"
    kubectl rollout restart deployment/frontend -n "$NAMESPACE"
    
    # Wait for rollouts
    kubectl rollout status deployment/backend -n "$NAMESPACE" --timeout=300s
    kubectl rollout status deployment/frontend -n "$NAMESPACE" --timeout=300s
    
    success "Kubernetes resources updated"
}

# Update application code
update_application() {
    log "Updating application code..."
    
    # Update backend
    kubectl set image deployment/backend backend=taskflow-backend:latest -n "$NAMESPACE"
    
    # Update frontend
    kubectl set image deployment/frontend frontend=taskflow-frontend:latest -n "$NAMESPACE"
    
    # Wait for updates
    kubectl rollout status deployment/backend -n "$NAMESPACE" --timeout=300s
    kubectl rollout status deployment/frontend -n "$NAMESPACE" --timeout=300s
    
    success "Application code updated"
}

# Update monitoring
update_monitoring() {
    log "Updating monitoring..."
    
    # Update Prometheus
    helm upgrade prometheus prometheus-community/kube-prometheus-stack \
        --namespace monitoring \
        --reuse-values
    
    # Update Grafana
    helm upgrade grafana grafana/grafana \
        --namespace monitoring \
        --reuse-values
    
    success "Monitoring updated"
}

# Verify update
verify_update() {
    log "Verifying update..."
    
    # Check pod status
    local failed_pods
    failed_pods=$(kubectl get pods -n "$NAMESPACE" --no-headers | grep -v Running | wc -l)
    
    if [[ $failed_pods -eq 0 ]]; then
        log "OK: All pods are running"
    else
        log "WARNING: $failed_pods pods are not running"
        kubectl get pods -n "$NAMESPACE" --no-headers | grep -v Running
    fi
    
    # Check application health
    if curl -f -s http://localhost:30080 >/dev/null; then
        log "OK: Frontend is accessible"
    else
        log "WARNING: Frontend is not accessible"
    fi
    
    if curl -f -s http://localhost:30000/health >/dev/null; then
        log "OK: Backend health check passed"
    else
        log "WARNING: Backend health check failed"
    fi
    
    success "Update verification completed"
}

# Rollback update
rollback_update() {
    if [[ "$ROLLBACK_ON_FAILURE" == "true" ]]; then
        log "Rolling back update..."
        
        # Rollback deployments
        kubectl rollout undo deployment/backend -n "$NAMESPACE"
        kubectl rollout undo deployment/frontend -n "$NAMESPACE"
        
        # Wait for rollbacks
        kubectl rollout status deployment/backend -n "$NAMESPACE" --timeout=300s
        kubectl rollout status deployment/frontend -n "$NAMESPACE" --timeout=300s
        
        success "Rollback completed"
    fi
}

# Main update function
main() {
    log "Starting TaskFlow update..."
    
    # Run update steps
    update_system
    update_docker
    update_kubernetes
    update_application
    update_monitoring
    verify_update
    
    success "TaskFlow update completed successfully"
    
    # Display update information
    log "Update Information:"
    kubectl get all -n "$NAMESPACE"
    kubectl get ingress -n "$NAMESPACE"
    
    log "Application updated and running"
}

# Error handling
trap 'log "Update failed, rolling back..."; rollback_update; exit 1' ERR

# Run main function
main "$@"

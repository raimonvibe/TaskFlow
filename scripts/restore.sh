#!/bin/bash
# TaskFlow - Restore Script
# Restores application data and configuration from backup

set -euo pipefail

# Configuration
BACKUP_DIR="/var/backups/taskflow"
LOG_FILE="/var/log/taskflow-restore.log"

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

# Parse command line arguments
BACKUP_FILE=""
RESTORE_TYPE="full"

usage() {
    echo "Usage: $0 -f <backup_file> [-t <restore_type>]"
    echo "  -f <backup_file>   Path to backup file (required)"
    echo "  -t <restore_type>  Type of restore: full, database, config (default: full)"
    echo ""
    echo "Example:"
    echo "  $0 -f /var/backups/taskflow/taskflow_backup_20231008_120000.tar.gz"
    exit 1
}

while getopts "f:t:h" opt; do
    case $opt in
        f) BACKUP_FILE="$OPTARG" ;;
        t) RESTORE_TYPE="$OPTARG" ;;
        h) usage ;;
        *) usage ;;
    esac
done

if [[ -z "$BACKUP_FILE" ]]; then
    usage
fi

# Verify backup file exists
if [[ ! -f "$BACKUP_FILE" ]]; then
    error_exit "Backup file not found: $BACKUP_FILE"
fi

log "Starting TaskFlow restore process..."
log "Backup file: $BACKUP_FILE"
log "Restore type: $RESTORE_TYPE"

# Create temporary directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Extract backup
log "Extracting backup..."
if tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"; then
    success "Backup extracted successfully"
else
    error_exit "Failed to extract backup"
fi

# Restore database
if [[ "$RESTORE_TYPE" == "full" ]] || [[ "$RESTORE_TYPE" == "database" ]]; then
    log "Restoring database..."

    # Find database backup file
    DB_BACKUP=$(find "$TEMP_DIR" -name "database_*.sql" | head -1)

    if [[ -z "$DB_BACKUP" ]]; then
        error_exit "Database backup not found in archive"
    fi

    # Confirm database restore
    warning "This will overwrite the current database!"
    read -p "Are you sure you want to continue? (yes/no): " confirm

    if [[ "$confirm" != "yes" ]]; then
        error_exit "Database restore cancelled by user"
    fi

    # Drop and recreate database
    log "Dropping existing database..."
    kubectl exec -n taskflow postgres-0 -- psql -U taskflow_user -c "DROP DATABASE IF EXISTS taskflow;" postgres || warning "Failed to drop database"

    log "Creating new database..."
    kubectl exec -n taskflow postgres-0 -- psql -U taskflow_user -c "CREATE DATABASE taskflow;" postgres || error_exit "Failed to create database"

    # Restore database
    log "Restoring database from backup..."
    if kubectl exec -n taskflow postgres-0 -i -- psql -U taskflow_user taskflow < "$DB_BACKUP"; then
        success "Database restored successfully"
    else
        error_exit "Database restore failed"
    fi
fi

# Restore Kubernetes resources
if [[ "$RESTORE_TYPE" == "full" ]] || [[ "$RESTORE_TYPE" == "config" ]]; then
    log "Restoring Kubernetes resources..."

    # Find resource backups
    K8S_BACKUP=$(find "$TEMP_DIR" -name "k8s_resources_*.yaml" | head -1)
    CONFIGMAP_BACKUP=$(find "$TEMP_DIR" -name "configmaps_*.yaml" | head -1)
    SECRET_BACKUP=$(find "$TEMP_DIR" -name "secrets_*.yaml" | head -1)
    PVC_BACKUP=$(find "$TEMP_DIR" -name "pvc_*.yaml" | head -1)

    # Restore ConfigMaps
    if [[ -f "$CONFIGMAP_BACKUP" ]]; then
        log "Restoring ConfigMaps..."
        kubectl apply -f "$CONFIGMAP_BACKUP" || warning "Failed to restore some ConfigMaps"
    fi

    # Restore Secrets
    if [[ -f "$SECRET_BACKUP" ]]; then
        log "Restoring Secrets..."
        kubectl apply -f "$SECRET_BACKUP" || warning "Failed to restore some Secrets"
    fi

    # Restore PVCs
    if [[ -f "$PVC_BACKUP" ]]; then
        log "Restoring PVCs..."
        kubectl apply -f "$PVC_BACKUP" || warning "Failed to restore some PVCs"
    fi

    # Restore other resources (optional)
    if [[ -f "$K8S_BACKUP" ]]; then
        log "Restoring other Kubernetes resources..."
        kubectl apply -f "$K8S_BACKUP" || warning "Failed to restore some resources"
    fi

    success "Kubernetes resources restored"
fi

# Verify restoration
log "Verifying restoration..."

# Check database connection
if kubectl exec -n taskflow postgres-0 -- psql -U taskflow_user -d taskflow -c "SELECT 1;" > /dev/null 2>&1; then
    success "Database is accessible"
else
    error_exit "Database verification failed"
fi

# Check if pods are running
READY_PODS=$(kubectl get pods -n taskflow --field-selector=status.phase=Running --no-headers | wc -l)
log "Running pods: $READY_PODS"

# Wait for pods to be ready
log "Waiting for pods to be ready..."
kubectl wait --for=condition=ready pod --all -n taskflow --timeout=300s || warning "Some pods are not ready"

success "Restore completed successfully"

# Post-restore recommendations
log ""
log "POST-RESTORE RECOMMENDATIONS:"
log "1. Verify application functionality"
log "2. Check logs for errors: kubectl logs -n taskflow <pod-name>"
log "3. Test API endpoints: curl http://localhost:3000/health"
log "4. Verify data integrity in the database"
log "5. Review monitoring dashboards"

log "TaskFlow restore process completed"

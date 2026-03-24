#!/bin/bash
# TaskFlow - Backup Script
# Creates backups of application data and configuration

set -euo pipefail

# Configuration
BACKUP_DIR="/var/backups/taskflow"
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/taskflow-backup.log"
RETENTION_DAYS=7

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

# Create backup directory
mkdir -p "$BACKUP_DIR"

log "Starting TaskFlow backup process..."

# Backup database
log "Backing up database..."
if kubectl exec -n taskflow postgres-0 -- pg_dump -U taskflow_user taskflow > "$BACKUP_DIR/database_$DATE.sql"; then
    success "Database backup completed"
else
    error_exit "Database backup failed"
fi

# Backup Kubernetes resources
log "Backing up Kubernetes resources..."
kubectl get all -n taskflow -o yaml > "$BACKUP_DIR/k8s_resources_$DATE.yaml"

# Backup configuration files
log "Backing up configuration files..."
kubectl get configmap -n taskflow -o yaml > "$BACKUP_DIR/configmaps_$DATE.yaml"
kubectl get secret -n taskflow -o yaml > "$BACKUP_DIR/secrets_$DATE.yaml"

# Backup persistent volumes
log "Backing up persistent volumes..."
kubectl get pvc -n taskflow -o yaml > "$BACKUP_DIR/pvc_$DATE.yaml"

# Create backup manifest
log "Creating backup manifest..."
cat > "$BACKUP_DIR/manifest_$DATE.yaml" << EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: backup-manifest-$DATE
  namespace: taskflow
data:
  backup_date: "$DATE"
  backup_type: "full"
  backup_size: "$(du -sh $BACKUP_DIR | cut -f1)"
  backup_files: "$(ls -1 $BACKUP_DIR | wc -l)"
EOF

# Compress backup
log "Compressing backup..."
cd "$BACKUP_DIR"
tar -czf "taskflow_backup_$DATE.tar.gz" *.sql *.yaml
rm -f *.sql *.yaml

# Cleanup old backups
log "Cleaning up old backups..."
find "$BACKUP_DIR" -name "taskflow_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete

# Verify backup
if [[ -f "$BACKUP_DIR/taskflow_backup_$DATE.tar.gz" ]]; then
    success "Backup completed successfully: taskflow_backup_$DATE.tar.gz"
    log "Backup size: $(du -sh $BACKUP_DIR/taskflow_backup_$DATE.tar.gz | cut -f1)"
else
    error_exit "Backup verification failed"
fi

log "TaskFlow backup process completed"

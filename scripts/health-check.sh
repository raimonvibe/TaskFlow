#!/bin/bash
# TaskFlow - Health Check Script
# Comprehensive health check for TaskFlow application

set -euo pipefail

# Configuration
LOG_FILE="/var/log/taskflow-health.log"
ALERT_EMAIL="admin@taskflow.com"
THRESHOLD_CPU=80
THRESHOLD_MEMORY=90
THRESHOLD_DISK=85

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Check function
check() {
    local name="$1"
    local command="$2"
    local threshold="$3"
    local value
    
    if value=$(eval "$command" 2>/dev/null); then
        if (( $(echo "$value > $threshold" | bc -l) )); then
            log "WARNING: $name is above threshold ($value% > $threshold%)"
            return 1
        else
            log "OK: $name is within limits ($value% <= $threshold%)"
            return 0
        fi
    else
        log "ERROR: Failed to check $name"
        return 1
    fi
}

# Check Kubernetes cluster
check_cluster() {
    log "Checking Kubernetes cluster..."
    
    if kubectl cluster-info >/dev/null 2>&1; then
        log "OK: Kubernetes cluster is accessible"
    else
        log "ERROR: Kubernetes cluster is not accessible"
        return 1
    fi
}

# Check application pods
check_pods() {
    log "Checking application pods..."
    
    local pods
    pods=$(kubectl get pods -n taskflow --no-headers | wc -l)
    
    if [[ $pods -gt 0 ]]; then
        log "OK: Found $pods pods in taskflow namespace"
    else
        log "ERROR: No pods found in taskflow namespace"
        return 1
    fi
    
    # Check pod status
    local failed_pods
    failed_pods=$(kubectl get pods -n taskflow --no-headers | grep -v Running | wc -l)
    
    if [[ $failed_pods -eq 0 ]]; then
        log "OK: All pods are running"
    else
        log "WARNING: $failed_pods pods are not running"
        kubectl get pods -n taskflow --no-headers | grep -v Running
    fi
}

# Check application services
check_services() {
    log "Checking application services..."
    
    local services
    services=$(kubectl get svc -n taskflow --no-headers | wc -l)
    
    if [[ $services -gt 0 ]]; then
        log "OK: Found $services services in taskflow namespace"
    else
        log "ERROR: No services found in taskflow namespace"
        return 1
    fi
}

# Check application endpoints
check_endpoints() {
    log "Checking application endpoints..."
    
    # Check frontend
    if curl -f -s http://localhost:30080 >/dev/null; then
        log "OK: Frontend is accessible"
    else
        log "ERROR: Frontend is not accessible"
        return 1
    fi
    
    # Check backend
    if curl -f -s http://localhost:30000/health >/dev/null; then
        log "OK: Backend health check passed"
    else
        log "ERROR: Backend health check failed"
        return 1
    fi
    
    # Check database
    if kubectl exec -n taskflow postgres-0 -- pg_isready -U taskflow_user >/dev/null 2>&1; then
        log "OK: Database is accessible"
    else
        log "ERROR: Database is not accessible"
        return 1
    fi
}

# Check system resources
check_resources() {
    log "Checking system resources..."
    
    # Check CPU usage
    check "CPU Usage" "top -bn1 | grep 'Cpu(s)' | awk '{print \$2}' | sed 's/%us,//'" "$THRESHOLD_CPU"
    
    # Check memory usage
    check "Memory Usage" "free | grep Mem | awk '{printf \"%.1f\", \$3/\$2 * 100.0}'" "$THRESHOLD_MEMORY"
    
    # Check disk usage
    check "Disk Usage" "df / | tail -1 | awk '{print \$5}' | sed 's/%//'" "$THRESHOLD_DISK"
}

# Check monitoring
check_monitoring() {
    log "Checking monitoring..."
    
    # Check Prometheus
    if curl -f -s http://localhost:30000:9090 >/dev/null; then
        log "OK: Prometheus is accessible"
    else
        log "WARNING: Prometheus is not accessible"
    fi
    
    # Check Grafana
    if curl -f -s http://localhost:30001 >/dev/null; then
        log "OK: Grafana is accessible"
    else
        log "WARNING: Grafana is not accessible"
    fi
}

# Send alert
send_alert() {
    local message="$1"
    log "ALERT: $message"
    
    # Send email alert
    if command -v mail >/dev/null 2>&1; then
        echo "$message" | mail -s "TaskFlow Health Alert" "$ALERT_EMAIL"
    fi
    
    # Send webhook alert
    if [[ -n "${WEBHOOK_URL:-}" ]]; then
        curl -X POST -H "Content-Type: application/json" \
             -d "{\"text\":\"$message\"}" \
             "$WEBHOOK_URL"
    fi
}

# Main health check
main() {
    log "Starting TaskFlow health check..."
    
    local failed_checks=0
    
    # Run all checks
    check_cluster || ((failed_checks++))
    check_pods || ((failed_checks++))
    check_services || ((failed_checks++))
    check_endpoints || ((failed_checks++))
    check_resources || ((failed_checks++))
    check_monitoring || ((failed_checks++))
    
    # Summary
    if [[ $failed_checks -eq 0 ]]; then
        log "All health checks passed"
        exit 0
    else
        log "Health check failed with $failed_checks errors"
        send_alert "TaskFlow health check failed with $failed_checks errors"
        exit 1
    fi
}

# Run main function
main "$@"

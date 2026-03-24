# TaskFlow - Automation Scripts

Collection of automation scripts for TaskFlow DevOps learning project.

## 📋 Available Scripts

### 1. **backup.sh** - Backup Script
- **Purpose**: Creates comprehensive backups of application data and configuration
- **Features**:
  - Database backup (PostgreSQL)
  - Kubernetes resources backup
  - Configuration files backup
  - Persistent volumes backup
  - Automatic compression and cleanup
  - Retention policy (7 days by default)

**Usage:**
```bash
sudo ./backup.sh
```

### 2. **health-check.sh** - Health Check Script
- **Purpose**: Comprehensive health monitoring for TaskFlow application
- **Features**:
  - Kubernetes cluster health
  - Application pods status
  - Service endpoints verification
  - System resource monitoring
  - Database connectivity
  - Monitoring stack verification
  - Alert notifications

**Usage:**
```bash
sudo ./health-check.sh
```

### 3. **deploy.sh** - Deploy Script
- **Purpose**: Deploys TaskFlow application to Kubernetes cluster
- **Features**:
  - Prerequisites verification
  - Pre-deployment backup
  - Application deployment
  - Deployment verification
  - Automatic rollback on failure
  - Comprehensive logging

**Usage:**
```bash
sudo ./deploy.sh
```

### 4. **update.sh** - Update Script
- **Purpose**: Updates TaskFlow application and system packages
- **Features**:
  - System package updates
  - Docker image updates
  - Kubernetes resource updates
  - Application code updates
  - Monitoring updates
  - Update verification
  - Automatic rollback on failure

**Usage:**
```bash
sudo ./update.sh
```

## 🔧 Configuration

### Environment Variables
```bash
# Backup configuration
BACKUP_DIR="/var/backups/taskflow"
RETENTION_DAYS=7

# Health check configuration
THRESHOLD_CPU=80
THRESHOLD_MEMORY=90
THRESHOLD_DISK=85
ALERT_EMAIL="admin@taskflow.com"

# Deployment configuration
NAMESPACE="taskflow"
BACKUP_BEFORE_DEPLOY=true
ROLLBACK_ON_FAILURE=true
```

### Log Files
- **Backup**: `/var/log/taskflow-backup.log`
- **Health Check**: `/var/log/taskflow-health.log`
- **Deploy**: `/var/log/taskflow-deploy.log`
- **Update**: `/var/log/taskflow-update.log`

## 🚀 Quick Start

### 1. Make Scripts Executable
```bash
chmod +x scripts/*.sh
```

### 2. Run Health Check
```bash
sudo ./scripts/health-check.sh
```

### 3. Deploy Application
```bash
sudo ./scripts/deploy.sh
```

### 4. Create Backup
```bash
sudo ./scripts/backup.sh
```

### 5. Update Application
```bash
sudo ./scripts/update.sh
```

## 📊 Monitoring and Alerts

### Health Check Metrics
- **CPU Usage**: Threshold 80%
- **Memory Usage**: Threshold 90%
- **Disk Usage**: Threshold 85%
- **Pod Status**: All pods must be running
- **Service Health**: All endpoints must be accessible

### Alert Channels
- **Email**: SMTP alerts to admin@taskflow.com
- **Webhook**: HTTP POST to configured webhook URL
- **Log Files**: Detailed logging to /var/log/

## 🔄 Automation

### Cron Jobs
```bash
# Health check every 15 minutes
*/15 * * * * /path/to/scripts/health-check.sh

# Backup daily at 2 AM
0 2 * * * /path/to/scripts/backup.sh

# Update weekly on Sunday at 3 AM
0 3 * * 0 /path/to/scripts/update.sh
```

### Systemd Services
```bash
# Create systemd service for health monitoring
sudo systemctl enable taskflow-health
sudo systemctl start taskflow-health
```

## 🛠️ Troubleshooting

### Common Issues

**1. Permission Denied**
```bash
# Check script permissions
ls -la scripts/*.sh

# Fix permissions
chmod +x scripts/*.sh
```

**2. Kubernetes Access**
```bash
# Check kubectl access
kubectl cluster-info

# Check namespace
kubectl get namespace taskflow
```

**3. Backup Failures**
```bash
# Check backup directory
ls -la /var/backups/taskflow/

# Check disk space
df -h /var/backups/
```

**4. Health Check Failures**
```bash
# Check application status
kubectl get pods -n taskflow

# Check service endpoints
curl -I http://localhost:30080
curl -I http://localhost:30000/health
```

### Debug Commands
```bash
# Check script logs
tail -f /var/log/taskflow-*.log

# Check Kubernetes events
kubectl get events -n taskflow

# Check pod logs
kubectl logs -n taskflow deployment/backend
kubectl logs -n taskflow deployment/frontend
```

## 📚 Learning Objectives

These scripts teach:

1. **Automation**: Scripting and task automation
2. **Monitoring**: Health checks and alerting
3. **Backup**: Data protection and recovery
4. **Deployment**: Application deployment strategies
5. **Updates**: System and application updates
6. **Troubleshooting**: Debugging and problem solving
7. **DevOps**: Operations and maintenance

## 📝 License

MIT License - See [LICENSE](../../LICENSE) file for details.
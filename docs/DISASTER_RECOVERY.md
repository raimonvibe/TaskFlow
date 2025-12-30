# 🚨 TaskFlow Disaster Recovery Plan

**Document Version:** 1.0
**Last Updated:** November 17, 2025
**Status:** Active
**Review Schedule:** Quarterly

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Recovery Objectives](#recovery-objectives)
3. [Backup Strategy](#backup-strategy)
4. [Recovery Procedures](#recovery-procedures)
5. [Disaster Scenarios](#disaster-scenarios)
6. [Emergency Contacts](#emergency-contacts)
7. [Testing Schedule](#testing-schedule)
8. [Appendices](#appendices)

---

## 🎯 Overview

This document outlines the disaster recovery (DR) procedures for TaskFlow. It defines the processes for backing up, restoring, and recovering the application in the event of system failures, data loss, or catastrophic events.

### Scope

- **Application:** TaskFlow (Frontend, Backend, Database)
- **Infrastructure:** Kubernetes clusters, Docker containers, PostgreSQL
- **Data:** User data, task data, configuration, secrets
- **Monitoring:** Prometheus, Grafana dashboards

### Objectives

1. Minimize data loss (RPO)
2. Minimize downtime (RTO)
3. Ensure business continuity
4. Maintain data integrity
5. Comply with security requirements

---

## 📊 Recovery Objectives

### Recovery Point Objective (RPO)

**Target RPO: 1 hour**

Maximum acceptable data loss:
- **Production:** 1 hour (hourly backups)
- **Staging:** 24 hours (daily backups)
- **Development:** 7 days (weekly backups)

### Recovery Time Objective (RTO)

**Target RTO: 4 hours**

Maximum acceptable downtime:
- **Complete System Failure:** 4 hours
- **Database Failure:** 2 hours
- **Application Failure:** 30 minutes
- **Configuration Failure:** 15 minutes

### Service Level Objectives

| Component | Availability | Downtime/Year |
|-----------|--------------|---------------|
| **Overall System** | 99.9% | 8.76 hours |
| **Database** | 99.95% | 4.38 hours |
| **API** | 99.9% | 8.76 hours |
| **Frontend** | 99.8% | 17.52 hours |

---

## 💾 Backup Strategy

### Backup Types

#### 1. Full Backups

**Frequency:** Daily at 2:00 AM UTC
**Retention:** 30 days
**Contents:**
- Complete database dump
- All Kubernetes resources
- Configuration files and secrets
- Persistent volume claims
- Application logs (last 7 days)

**Storage Locations:**
- Primary: Local Kubernetes persistent volume
- Secondary: Oracle Cloud Object Storage
- Tertiary: Offsite backup location (recommended)

#### 2. Incremental Backups

**Frequency:** Every 6 hours
**Retention:** 7 days
**Contents:**
- Database transaction logs
- Changed configuration files
- Application logs

#### 3. Configuration Backups

**Frequency:** On every change
**Retention:** 90 days
**Contents:**
- Kubernetes manifests
- ConfigMaps and Secrets
- Environment variables
- Ansible playbooks
- Terraform state files

### Backup Automation

```bash
# Automated backup via cron
0 2 * * * /usr/local/bin/taskflow-backup.sh full
0 */6 * * * /usr/local/bin/taskflow-backup.sh incremental
```

### Backup Verification

**Frequency:** Weekly
**Method:** Automated restore to test environment

Verification checklist:
- [ ] Backup file integrity check (checksums)
- [ ] Database restore successful
- [ ] Application starts without errors
- [ ] Data integrity validation (row counts, checksums)
- [ ] Configuration restored correctly
- [ ] Secrets accessible and valid

---

## 🔄 Recovery Procedures

### Procedure 1: Complete System Recovery

**Scenario:** Total infrastructure failure
**RTO:** 4 hours
**RPO:** 1 hour

#### Prerequisites
- [ ] Access to backup files
- [ ] Kubernetes cluster available (or provision new)
- [ ] Network connectivity
- [ ] Admin credentials

#### Steps

1. **Assess the Situation (15 min)**
   ```bash
   # Check cluster status
   kubectl cluster-info
   kubectl get nodes

   # Check namespace
   kubectl get all -n taskflow
   ```

2. **Provision Infrastructure if Needed (60 min)**
   ```bash
   # If cluster is down, provision new cluster
   cd infrastructure/oracle-cloud
   terraform init
   terraform plan
   terraform apply

   # Or use local Minikube
   minikube start --cpus=4 --memory=8192
   ```

3. **Restore Kubernetes Resources (30 min)**
   ```bash
   # Create namespace
   kubectl create namespace taskflow

   # Restore secrets
   kubectl apply -f /var/backups/taskflow/latest/secrets.yaml

   # Restore ConfigMaps
   kubectl apply -f /var/backups/taskflow/latest/configmaps.yaml

   # Restore PVCs
   kubectl apply -f /var/backups/taskflow/latest/pvc.yaml
   ```

4. **Restore Database (60 min)**
   ```bash
   # Start PostgreSQL pod
   kubectl apply -f kubernetes/postgres/

   # Wait for pod to be ready
   kubectl wait --for=condition=ready pod/postgres-0 -n taskflow --timeout=300s

   # Restore database
   /usr/local/bin/restore.sh -f /var/backups/taskflow/latest/taskflow_backup.tar.gz -t database
   ```

5. **Deploy Application (30 min)**
   ```bash
   # Deploy backend
   kubectl apply -f kubernetes/backend/

   # Deploy frontend
   kubectl apply -f kubernetes/frontend/

   # Verify deployments
   kubectl get deployments -n taskflow
   kubectl get pods -n taskflow
   ```

6. **Verify Recovery (30 min)**
   ```bash
   # Check health endpoints
   curl http://taskflow-backend:3000/health

   # Verify database
   kubectl exec -n taskflow postgres-0 -- psql -U taskflow_user -d taskflow -c "SELECT COUNT(*) FROM users;"

   # Check application logs
   kubectl logs -n taskflow -l app=backend --tail=100
   ```

7. **Post-Recovery Tasks (30 min)**
   - [ ] Notify stakeholders
   - [ ] Update DNS if needed
   - [ ] Monitor system for 24 hours
   - [ ] Document incident
   - [ ] Schedule post-mortem

**Total Time:** ~4 hours

---

### Procedure 2: Database-Only Recovery

**Scenario:** Database corruption or failure
**RTO:** 2 hours
**RPO:** 1 hour

#### Steps

1. **Stop Application Access (5 min)**
   ```bash
   # Scale down backend to prevent writes
   kubectl scale deployment backend -n taskflow --replicas=0
   ```

2. **Backup Current State (10 min)**
   ```bash
   # Even if corrupted, backup current state
   kubectl exec -n taskflow postgres-0 -- pg_dump -U taskflow_user taskflow > /tmp/pre-recovery-backup.sql
   ```

3. **Restore Database (60 min)**
   ```bash
   # Use restore script
   /usr/local/bin/restore.sh -f /var/backups/taskflow/latest/taskflow_backup.tar.gz -t database
   ```

4. **Verify Database Integrity (30 min)**
   ```bash
   # Run integrity checks
   kubectl exec -n taskflow postgres-0 -- psql -U taskflow_user -d taskflow <<EOF
   -- Check tables
   SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM tasks;

   -- Check constraints
   SELECT conname FROM pg_constraint WHERE contype = 'f';

   -- Check indexes
   SELECT schemaname, tablename, indexname FROM pg_indexes WHERE schemaname = 'public';
   EOF
   ```

5. **Restart Application (10 min)**
   ```bash
   # Scale backend back up
   kubectl scale deployment backend -n taskflow --replicas=3

   # Verify pods are running
   kubectl get pods -n taskflow -l app=backend
   ```

6. **Smoke Tests (15 min)**
   - [ ] Login functionality
   - [ ] Task creation
   - [ ] Task retrieval
   - [ ] User profile access
   - [ ] API response times

**Total Time:** ~2 hours

---

### Procedure 3: Configuration Recovery

**Scenario:** Configuration corruption or accidental deletion
**RTO:** 15 minutes
**RPO:** Real-time (Git tracked)

#### Steps

1. **Identify Issue (5 min)**
   ```bash
   kubectl get configmaps -n taskflow
   kubectl get secrets -n taskflow
   kubectl describe configmap <name> -n taskflow
   ```

2. **Restore from Git (5 min)**
   ```bash
   # Configuration is version controlled
   git checkout HEAD -- kubernetes/configmaps/
   kubectl apply -f kubernetes/configmaps/
   ```

3. **Or Restore from Backup (5 min)**
   ```bash
   kubectl apply -f /var/backups/taskflow/latest/configmaps.yaml
   ```

4. **Verify and Restart (5 min)**
   ```bash
   # Restart affected pods
   kubectl rollout restart deployment/backend -n taskflow
   kubectl rollout restart deployment/frontend -n taskflow
   ```

**Total Time:** ~15 minutes

---

### Procedure 4: Application Recovery

**Scenario:** Application failure without data loss
**RTO:** 30 minutes
**RPO:** 0 (no data loss)

#### Steps

1. **Check Pod Status (2 min)**
   ```bash
   kubectl get pods -n taskflow
   kubectl describe pod <failing-pod> -n taskflow
   kubectl logs <failing-pod> -n taskflow --tail=100
   ```

2. **Attempt Automatic Recovery (5 min)**
   ```bash
   # Kubernetes will auto-restart, but can force
   kubectl delete pod <failing-pod> -n taskflow
   ```

3. **Rollback if Needed (10 min)**
   ```bash
   # Check deployment history
   kubectl rollout history deployment/backend -n taskflow

   # Rollback to previous version
   kubectl rollout undo deployment/backend -n taskflow
   ```

4. **Verify Recovery (10 min)**
   ```bash
   kubectl get pods -n taskflow
   curl http://taskflow-backend:3000/health
   ```

**Total Time:** ~30 minutes

---

## 🔥 Disaster Scenarios

### Scenario 1: Data Center Failure

**Impact:** Complete infrastructure loss
**Probability:** Low
**Severity:** Critical

**Response:**
1. Activate DR site (if available)
2. Provision new infrastructure in alternate region
3. Execute Complete System Recovery procedure
4. Update DNS to point to new location

**Preventive Measures:**
- Multi-region deployment
- Geographic backup distribution
- Regular DR drills

---

### Scenario 2: Ransomware Attack

**Impact:** Data encryption, system compromise
**Probability:** Medium
**Severity:** Critical

**Response:**
1. **Immediate Actions:**
   - Isolate infected systems
   - Disconnect from network
   - Contact security team
   - Preserve evidence

2. **Recovery:**
   - Do NOT pay ransom
   - Restore from clean backup (before infection)
   - Rebuild compromised systems
   - Apply security patches
   - Reset all credentials

3. **Post-Recovery:**
   - Security audit
   - Incident report
   - Update security measures

**Preventive Measures:**
- Immutable backups
- Network segmentation
- Security monitoring
- Regular security training
- Email filtering

---

### Scenario 3: Accidental Data Deletion

**Impact:** User data loss
**Probability:** Medium
**Severity:** Medium

**Response:**
1. Identify scope of deletion
2. Check if soft-delete is available
3. Restore from most recent backup
4. Replay transaction logs if available

**Preventive Measures:**
- Soft delete implementation
- Audit logging
- RBAC enforcement
- Change management process

---

### Scenario 4: Database Corruption

**Impact:** Data integrity issues
**Probability:** Low
**Severity:** High

**Response:**
1. Stop writes immediately
2. Assess corruption extent
3. Attempt database repair
4. If repair fails, restore from backup
5. Validate data integrity

**Preventive Measures:**
- Regular integrity checks
- Backup verification
- Redundant database replicas
- ACID compliance

---

### Scenario 5: Human Error

**Impact:** Configuration changes, accidental deletions
**Probability:** High
**Severity:** Low to Medium

**Response:**
1. Identify the change
2. Restore from Git (configuration)
3. Restore from backup (data)
4. Document incident

**Preventive Measures:**
- Change management process
- Peer review requirements
- Infrastructure as Code
- Automated testing
- Role-based access control

---

## 📞 Emergency Contacts

### Primary Contacts

| Role | Name | Phone | Email | Availability |
|------|------|-------|-------|--------------|
| **DevOps Lead** | [Name] | [Phone] | devops@taskflow.com | 24/7 |
| **Database Admin** | [Name] | [Phone] | dba@taskflow.com | 24/7 |
| **Security Lead** | [Name] | [Phone] | security@taskflow.com | 24/7 |
| **Infrastructure** | [Name] | [Phone] | infra@taskflow.com | Business hours |

### Escalation Path

1. **Level 1:** On-call engineer (Response: 15 min)
2. **Level 2:** DevOps lead (Response: 30 min)
3. **Level 3:** Engineering manager (Response: 1 hour)
4. **Level 4:** CTO (Response: 2 hours)

### External Contacts

- **Cloud Provider (Oracle):** [Support Portal]
- **Database Vendor:** [Support Number]
- **Security Consultant:** [Contact Info]
- **Legal Team:** [Contact Info]

---

## 🧪 Testing Schedule

### DR Drill Schedule

| Test Type | Frequency | Duration | Last Test | Next Test |
|-----------|-----------|----------|-----------|-----------|
| **Backup Verification** | Weekly | 1 hour | [Date] | [Date] |
| **Application Recovery** | Monthly | 2 hours | [Date] | [Date] |
| **Database Recovery** | Quarterly | 4 hours | [Date] | [Date] |
| **Complete DR Test** | Annually | 8 hours | [Date] | [Date] |
| **Tabletop Exercise** | Quarterly | 2 hours | [Date] | [Date] |

### Test Checklist

#### Pre-Test
- [ ] Schedule test date and time
- [ ] Notify all stakeholders
- [ ] Prepare test environment
- [ ] Review procedures
- [ ] Assign roles

#### During Test
- [ ] Document start time
- [ ] Follow procedure step-by-step
- [ ] Record any issues
- [ ] Time each phase
- [ ] Verify success criteria

#### Post-Test
- [ ] Document results
- [ ] Identify improvements
- [ ] Update procedures
- [ ] Schedule remediation
- [ ] Report to management

---

## 📚 Appendices

### Appendix A: Backup Locations

```
Primary:   /var/backups/taskflow/
Secondary: oci://taskflow-backups/
Tertiary:  [Offsite location]
```

### Appendix B: Critical File Locations

```
Kubernetes Configs: /opt/taskflow/kubernetes/
Application Code:   /opt/taskflow/app/
Backup Scripts:     /usr/local/bin/taskflow-*.sh
Log Files:          /var/log/taskflow/
```

### Appendix C: Database Credentials Location

- Kubernetes Secrets: `taskflow-db-credentials`
- Vault Path: `secret/taskflow/database`
- Emergency Access: Sealed envelope in safe

### Appendix D: Recovery Time Tracking

| Recovery Phase | Target Time | Actual Time | Notes |
|----------------|-------------|-------------|-------|
| Assessment | 15 min | | |
| Infrastructure | 60 min | | |
| Database | 60 min | | |
| Application | 30 min | | |
| Verification | 30 min | | |
| **Total** | **4 hours** | | |

### Appendix E: Post-Recovery Checklist

- [ ] All services running
- [ ] Health checks passing
- [ ] Database accessible
- [ ] Data integrity verified
- [ ] Monitoring active
- [ ] Alerts configured
- [ ] DNS updated
- [ ] SSL certificates valid
- [ ] Users notified
- [ ] Incident documented
- [ ] Post-mortem scheduled
- [ ] Backup resumed

---

## 📝 Document Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-17 | TaskFlow Team | Initial version |

---

## ✅ Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **DevOps Lead** | | | |
| **Engineering Manager** | | | |
| **CTO** | | | |

---

**Note:** This document should be reviewed and updated quarterly, or after any major infrastructure changes or DR events.

**Document Location:** `/docs/DISASTER_RECOVERY.md`
**Classification:** Internal Use Only
**Review Date:** February 17, 2026

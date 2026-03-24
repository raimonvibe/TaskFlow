# TaskFlow - Oracle Cloud Infrastructure Setup

Complete infrastructure setup for TaskFlow on Oracle Cloud Always Free tier using Terraform.

## 🆓 Always Free Tier Resources

This configuration uses **100% free resources** that never expire:

- **4 ARM-based Ampere A1 instances** (24GB RAM total) - FREE FOREVER
- **200GB block storage** - FREE FOREVER  
- **Load balancer** (10 Mbps) - FREE FOREVER
- **VCN and networking** - FREE FOREVER
- **No time limits** - resources are free forever

## 📋 Prerequisites

### 1. Oracle Cloud Account
- Sign up at [Oracle Cloud](https://cloud.oracle.com)
- Verify your identity (required for free tier)
- No credit card required in most regions

### 2. Local Tools
```bash
# Install Terraform
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
sudo apt-get update && sudo apt-get install terraform

# Install OCI CLI (optional)
bash -c "$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)"

# Install Ansible
sudo apt-get update
sudo apt-get install ansible
```

### 3. SSH Keys
```bash
# Generate SSH key pair
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# Your public key will be at ~/.ssh/id_rsa.pub
# Your private key will be at ~/.ssh/id_rsa
```

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone <your-repo-url>
cd TaskFlow/infrastructure/oracle-cloud
```

### 2. Configure Variables
```bash
# Copy the example file
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
nano terraform.tfvars
```

**Required variables:**
```hcl
compartment_ocid = "ocid1.compartment.oc1..aaaaaaaa..."
```

### 3. Set Up Authentication
Choose one method:

**Method A: Environment Variables (Recommended)**
```bash
export TF_VAR_tenancy_ocid="ocid1.tenancy.oc1..xxxxx"
export TF_VAR_user_ocid="ocid1.user.oc1..xxxxx"
export TF_VAR_fingerprint="xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx"
export TF_VAR_private_key_path="~/.oci/oci_api_key.pem"
```

**Method B: Terraform Variables**
```hcl
tenancy_ocid = "ocid1.tenancy.oc1..xxxxx"
user_ocid = "ocid1.user.oc1..xxxxx"
fingerprint = "xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx"
private_key_path = "~/.oci/oci_api_key.pem"
```

### 4. Deploy Infrastructure
```bash
# Initialize Terraform
terraform init

# Review the plan
terraform plan

# Apply the configuration
terraform apply
```

### 5. Access Your Cluster
```bash
# Get connection information
terraform output

# SSH to master node
ssh -i ~/.ssh/id_rsa opc@<master-ip>

# Check K3s status
sudo systemctl status k3s

# Get kubeconfig
sudo cat /etc/rancher/k3s/k3s.yaml
```

## 🏗️ Infrastructure Components

### Compute Instances
- **K3s Master**: 1 OCPU, 6GB RAM, 50GB storage
- **K3s Workers**: 2 x (1 OCPU, 6GB RAM, 50GB storage each)
- **Bastion Host**: 1 OCPU, 1GB RAM, 50GB storage

### Networking
- **VCN**: 10.0.0.0/16
- **Subnet**: 10.0.1.0/24
- **Load Balancer**: 10 Mbps bandwidth
- **Security Lists**: Configured for K3s and web traffic

### Storage
- **Boot Volumes**: 4 x 50GB (200GB total)
- **Block Volume**: 200GB for persistent storage
- **Total Storage**: 400GB (within free tier)

## 🔧 Configuration Details

### K3s Cluster
- **Version**: Latest stable
- **Network**: Flannel (default)
- **Storage**: Local storage class
- **Monitoring**: Prometheus + Grafana
- **Security**: RBAC enabled, admission controllers

### Security Features
- **Firewall**: UFW configured
- **Fail2ban**: SSH protection
- **Security Lists**: Restrictive rules
- **SSH**: Key-based authentication only

### Monitoring Stack
- **Prometheus**: Metrics collection
- **Grafana**: Dashboards and visualization
- **Node Exporter**: System metrics
- **Kube State Metrics**: Kubernetes metrics

## 📊 Cost Breakdown

| Resource | Quantity | Cost |
|----------|----------|------|
| ARM Instances | 4 | $0.00 |
| Block Storage | 200GB | $0.00 |
| Load Balancer | 10 Mbps | $0.00 |
| Networking | VCN + Subnet | $0.00 |
| **Total** | | **$0.00** |

## 🚨 Important Notes

### Free Tier Limits
- **Maximum 4 ARM instances**
- **Maximum 24GB RAM total**
- **Maximum 200GB storage**
- **Maximum 10 Mbps load balancer**

### Staying in Free Tier
- Monitor usage in OCI Console
- Set up billing alerts
- Use resource tags for tracking
- Regular cleanup of unused resources

### Security Considerations
- Change SSH source CIDR to your IP
- Enable fail2ban and UFW
- Regular security updates
- Monitor access logs

## 🔄 Next Steps

### 1. Deploy TaskFlow Application
```bash
# SSH to master
ssh -i ~/.ssh/id_rsa opc@<master-ip>

# Deploy TaskFlow
kubectl apply -f /path/to/kubernetes/manifests

# Check deployment
kubectl get pods -A
```

### 2. Access Application
```bash
# Get load balancer IP
terraform output load_balancer_ip

# Access application
curl http://<load-balancer-ip>
```

### 3. Set Up Monitoring
```bash
# Access Grafana
http://<load-balancer-ip>:3001
# Default credentials: admin/admin

# Access Prometheus
http://<load-balancer-ip>:9090
```

## 🛠️ Troubleshooting

### Common Issues

**1. "Out of capacity" error**
```bash
# Try different availability domain
# Check OCI Console for capacity
```

**2. SSH connection failed**
```bash
# Check security list rules
# Verify SSH key is correct
# Check if instance is running
```

**3. K3s not starting**
```bash
# Check cloud-init logs
sudo journalctl -u cloud-init

# Check K3s logs
sudo journalctl -u k3s -f
```

**4. Load balancer not accessible**
```bash
# Check firewall rules
# Verify security list configuration
# Check if services are running
```

### Debug Commands
```bash
# Check instance status
oci compute instance list --compartment-id <compartment-ocid>

# Check security lists
oci network security-list list --vcn-id <vcn-id>

# Check load balancer
oci lb load-balancer list --compartment-id <compartment-ocid>
```

## 🧹 Cleanup

### Destroy Infrastructure
```bash
# Destroy all resources
terraform destroy

# Confirm destruction
terraform destroy -auto-approve
```

### Manual Cleanup
```bash
# Delete resources in OCI Console
# Check for orphaned resources
# Verify all resources are deleted
```

## 📚 Additional Resources

### Documentation
- [Oracle Cloud Always Free](https://www.oracle.com/cloud/free/)
- [Terraform OCI Provider](https://registry.terraform.io/providers/oracle/oci/latest/docs)
- [K3s Documentation](https://k3s.io/)

### Support
- [Oracle Cloud Support](https://docs.oracle.com/en-us/iaas/Content/GSG/Concepts/help.htm)
- [Terraform OCI Examples](https://github.com/oracle/terraform-provider-oci/tree/master/examples)
- [K3s GitHub](https://github.com/k3s-io/k3s)

## 🎯 Learning Objectives

This infrastructure setup teaches:

1. **Infrastructure as Code** with Terraform
2. **Cloud Resource Management** on Oracle Cloud
3. **Kubernetes Cluster Setup** with K3s
4. **Network Security** with security lists
5. **Load Balancing** and high availability
6. **Monitoring** with Prometheus and Grafana
7. **Cost Optimization** within free tier limits

## 📝 License

MIT License - See [LICENSE](../../../LICENSE) file for details.
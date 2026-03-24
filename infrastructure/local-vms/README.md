# TaskFlow - Local VMs Setup

Complete local development environment for TaskFlow using VirtualBox VMs. **100% free and offline** - no cloud account required.

## 🆓 Cost: $0.00 Forever

This setup uses only free and open-source tools:
- **VirtualBox**: Free and open-source
- **Ubuntu VMs**: Free and open-source  
- **K3s**: Free and open-source
- **No cloud resources**: Runs entirely on your machine
- **No internet required**: After initial setup

## 📋 Prerequisites

### 1. Host Machine Requirements
- **RAM**: 8GB minimum, 16GB recommended
- **Disk**: 50GB minimum, 100GB recommended
- **CPU**: 4+ cores recommended
- **Virtualization**: Intel VT-x or AMD-V required

### 2. Software
```bash
# Install VirtualBox
# Ubuntu/Debian:
sudo apt-get update
sudo apt-get install virtualbox virtualbox-ext-pack

# macOS:
brew install --cask virtualbox

# Windows:
# Download from https://www.virtualbox.org/

# Install Terraform
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
sudo apt-get update && sudo apt-get install terraform

# Install Ansible
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
cd TaskFlow/infrastructure/local-vms
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
ssh_public_key_path  = "~/.ssh/id_rsa.pub"
ssh_private_key_path = "~/.ssh/id_rsa"
```

### 3. Deploy VMs
```bash
# Initialize Terraform
terraform init

# Review the plan
terraform plan

# Apply the configuration
terraform apply
```

### 4. Access Your Cluster
```bash
# Get connection information
terraform output

# SSH to master node
ssh -i ~/.ssh/id_rsa ubuntu@<master-ip>

# Check K3s status
sudo systemctl status k3s

# Get kubeconfig
sudo cat /etc/rancher/k3s/k3s.yaml
```

## 🏗️ Infrastructure Components

### VirtualBox VMs
- **K3s Master**: 2 CPU, 2GB RAM
- **K3s Workers**: 2 x (2 CPU, 2GB RAM each)
- **Bastion Host**: 1 CPU, 1GB RAM (optional)

### Networking
- **Bridged Networking**: VMs get IPs on your local network
- **Port Forwarding**: SSH access to all VMs
- **Shared Folders**: Development files accessible from VMs

### Storage
- **Boot Disks**: 50GB each (150GB total)
- **Shared Storage**: Accessible from all VMs
- **No persistent volumes**: Uses local storage

## 🔧 Configuration Details

### K3s Cluster
- **Version**: Latest stable
- **Network**: Flannel (default)
- **Storage**: Local storage class
- **Monitoring**: Prometheus + Grafana
- **Security**: RBAC enabled

### Development Features
- **Shared Folders**: Edit code on host, run on VMs
- **SSH Access**: Direct access to all VMs
- **Port Forwarding**: Access services from host
- **Offline Development**: No internet required

## 📊 Resource Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Host RAM | 8GB | 16GB |
| Host Disk | 50GB | 100GB |
| Host CPU | 4 cores | 8+ cores |
| VM RAM | 6GB total | 12GB total |
| VM CPU | 6 cores total | 12+ cores total |

## 🚨 Important Notes

### VirtualBox Requirements
- **Virtualization**: Must be enabled in BIOS
- **Memory**: VMs need sufficient RAM
- **Network**: Bridged networking required
- **Storage**: Sufficient disk space

### Development Workflow
- **Edit Code**: On host machine
- **Test Code**: On VMs
- **Deploy**: Via K3s cluster
- **Monitor**: Via Prometheus/Grafana

### Offline Development
- **No Internet**: Required after setup
- **Local Registry**: Use local Docker registry
- **Shared Storage**: Accessible from all VMs
- **Full Control**: Over entire environment

## 🔄 Next Steps

### 1. Deploy TaskFlow Application
```bash
# SSH to master
ssh -i ~/.ssh/id_rsa ubuntu@<master-ip>

# Deploy TaskFlow
kubectl apply -f /path/to/kubernetes/manifests

# Check deployment
kubectl get pods -A
```

### 2. Access Application
```bash
# Get master IP
terraform output k3s_master_ip

# Access application
curl http://<master-ip>:30080
```

### 3. Set Up Monitoring
```bash
# Access Grafana
http://<master-ip>:30001
# Default credentials: admin/admin

# Access Prometheus
http://<master-ip>:30000
```

## 🛠️ Troubleshooting

### Common Issues

**1. "Network interface not found"**
```bash
# Check your network interface
ip addr show  # Linux
ifconfig      # macOS
ipconfig      # Windows

# Update host_interface in terraform.tfvars
```

**2. "VM won't start"**
```bash
# Check VirtualBox installation
VBoxManage --version

# Check virtualization support
lscpu | grep Virtualization  # Linux
sysctl -n machdep.cpu.features | grep VMX  # macOS
```

**3. "SSH connection failed"**
```bash
# Check SSH key path
ls -la ~/.ssh/id_rsa*

# Check VM IP
terraform output k3s_master_ip
```

**4. "K3s not starting"**
```bash
# Check VM resources
VBoxManage showvminfo taskflow-k3s-master

# Check K3s logs
ssh -i ~/.ssh/id_rsa ubuntu@<master-ip> 'sudo journalctl -u k3s -f'
```

### Debug Commands
```bash
# Check VM status
VBoxManage list runningvms

# Check VM network
VBoxManage showvminfo taskflow-k3s-master --machinereadable | grep NIC

# Check K3s status
ssh -i ~/.ssh/id_rsa ubuntu@<master-ip> 'kubectl get nodes'
```

## 🧹 Cleanup

### Destroy VMs
```bash
# Destroy all VMs
terraform destroy

# Confirm destruction
terraform destroy -auto-approve
```

### Manual Cleanup
```bash
# Stop all VMs
VBoxManage controlvm taskflow-k3s-master poweroff
VBoxManage controlvm taskflow-k3s-worker-1 poweroff
VBoxManage controlvm taskflow-k3s-worker-2 poweroff

# Remove VMs
VBoxManage unregistervm taskflow-k3s-master --delete
VBoxManage unregistervm taskflow-k3s-worker-1 --delete
VBoxManage unregistervm taskflow-k3s-worker-2 --delete
```

## 📚 Additional Resources

### Documentation
- [VirtualBox Documentation](https://www.virtualbox.org/manual/)
- [K3s Documentation](https://k3s.io/)
- [Terraform VirtualBox Provider](https://registry.terraform.io/providers/terra-farm/virtualbox/latest/docs)

### Support
- [VirtualBox Forums](https://forums.virtualbox.org/)
- [K3s GitHub](https://github.com/k3s-io/k3s)
- [Terraform VirtualBox Provider](https://github.com/terra-farm/terraform-provider-virtualbox)

## 🎯 Learning Objectives

This local setup teaches:

1. **Virtualization** with VirtualBox
2. **Local Development** environment setup
3. **Kubernetes Cluster** management
4. **Network Configuration** for VMs
5. **Offline Development** workflows
6. **Resource Management** for VMs
7. **Troubleshooting** VM issues

## 📝 License

MIT License - See [LICENSE](../../../LICENSE) file for details.

# TaskFlow - Oracle Cloud Variables
# Configuration variables for OCI Always Free tier setup

variable "compartment_ocid" {
  description = "The OCID of the compartment where resources will be created"
  type        = string
  
  # Get this from: OCI Console > Identity > Compartments
  # Or use: oci iam compartment list --compartment-id-in-subtree true
}

variable "region" {
  description = "The OCI region where resources will be created"
  type        = string
  default     = "us-ashburn-1"  # US East (Ashburn)
  
  # Other free tier regions:
  # - us-phoenix-1 (US West - Phoenix)
  # - eu-frankfurt-1 (Europe - Frankfurt)
  # - uk-london-1 (UK - London)
  # - ap-sydney-1 (Australia - Sydney)
  # - ap-mumbai-1 (India - Mumbai)
  # - ap-seoul-1 (South Korea - Seoul)
  # - ap-tokyo-1 (Japan - Tokyo)
  # - ca-toronto-1 (Canada - Toronto)
  # - sa-saopaulo-1 (Brazil - São Paulo)
  # - me-mexicocity-1 (Mexico - Mexico City)
}

variable "instance_shape" {
  description = "The shape of the compute instances (must be ARM-based for free tier)"
  type        = string
  default     = "VM.Standard.A1.Flex"
  
  # Free tier ARM shapes:
  # - VM.Standard.A1.Flex (1-4 OCPUs, 6-24GB RAM)
  # Maximum free resources: 4 OCPUs, 24GB RAM total
}

variable "ssh_public_key_path" {
  description = "Path to the SSH public key file"
  type        = string
  default     = "~/.ssh/id_rsa.pub"
  
  # Generate with: ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
}

variable "ssh_private_key_path" {
  description = "Path to the SSH private key file"
  type        = string
  default     = "~/.ssh/id_rsa"
}

variable "ssh_source_cidr" {
  description = "CIDR block for SSH access (your public IP)"
  type        = string
  default     = "0.0.0.0/0"  # WARNING: Change this to your IP for security
  
  # Get your IP: curl -s ifconfig.me
  # Example: "203.0.113.1/32"
}

variable "k3s_token" {
  description = "Token for K3s cluster authentication (leave empty to auto-generate)"
  type        = string
  default     = null
  sensitive   = true
  
  # Generate a secure token for K3s cluster
  # This will be used by worker nodes to join the cluster
}

variable "project_name" {
  description = "Name of the project (used for resource naming)"
  type        = string
  default     = "taskflow"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default = {
    Project     = "TaskFlow"
    Environment = "dev"
    Purpose     = "DevOps Learning"
    ManagedBy   = "Terraform"
    CostCenter  = "Learning"
  }
}

# Optional: Tenancy and User OCIDs (if not using environment variables)
variable "tenancy_ocid" {
  description = "The OCID of the tenancy"
  type        = string
  default     = null
  
  # Get from: OCI Console > Profile > Tenancy
  # Or use: oci iam tenancy get
}

variable "user_ocid" {
  description = "The OCID of the user"
  type        = string
  default     = null
  
  # Get from: OCI Console > Profile > User Settings
  # Or use: oci iam user get --user-id <user-ocid>
}

variable "fingerprint" {
  description = "Fingerprint of the API key"
  type        = string
  default     = null
  
  # Get from: OCI Console > Profile > API Keys
  # Or use: oci iam user api-key list --user-id <user-ocid>
}

variable "private_key_path" {
  description = "Path to the private key file for API authentication"
  type        = string
  default     = null
  
  # Path to the .pem file generated when creating API key
}

# Resource sizing variables (within free tier limits)
variable "master_cpu" {
  description = "Number of OCPUs for master node"
  type        = number
  default     = 1
  
  # Free tier: 1-4 OCPUs total across all instances
}

variable "master_memory" {
  description = "Memory in GB for master node"
  type        = number
  default     = 6
  
  # Free tier: 6-24GB total across all instances
}

variable "worker_cpu" {
  description = "Number of OCPUs for each worker node"
  type        = number
  default     = 1
  
  # Free tier: 1-4 OCPUs total across all instances
}

variable "worker_memory" {
  description = "Memory in GB for each worker node"
  type        = number
  default     = 6
  
  # Free tier: 6-24GB total across all instances
}

variable "bastion_cpu" {
  description = "Number of OCPUs for bastion host"
  type        = number
  default     = 1
  
  # Free tier: 1-4 OCPUs total across all instances
}

variable "bastion_memory" {
  description = "Memory in GB for bastion host"
  type        = number
  default     = 1
  
  # Free tier: 6-24GB total across all instances
}

variable "storage_size_gb" {
  description = "Size of the block volume in GB"
  type        = number
  default     = 200
  
  # Free tier: 200GB block storage
}

variable "load_balancer_bandwidth" {
  description = "Load balancer bandwidth in Mbps"
  type        = number
  default     = 10
  
  # Free tier: 10 Mbps load balancer
}

# Network configuration
variable "vcn_cidr" {
  description = "CIDR block for the VCN"
  type        = string
  default     = "10.0.0.0/16"
}

variable "subnet_cidr" {
  description = "CIDR block for the subnet"
  type        = string
  default     = "10.0.1.0/24"
}

# K3s configuration
variable "k3s_version" {
  description = "K3s version to install"
  type        = string
  default     = "latest"
}

variable "k3s_channel" {
  description = "K3s channel (stable, latest, testing)"
  type        = string
  default     = "stable"
}

# Application configuration
variable "app_namespace" {
  description = "Kubernetes namespace for the application"
  type        = string
  default     = "taskflow"
}

variable "app_domain" {
  description = "Domain name for the application"
  type        = string
  default     = "taskflow.local"
}

# Monitoring configuration
variable "enable_monitoring" {
  description = "Enable Prometheus and Grafana monitoring"
  type        = bool
  default     = true
}

variable "enable_logging" {
  description = "Enable centralized logging"
  type        = bool
  default     = true
}

# Security configuration
variable "enable_firewall" {
  description = "Enable UFW firewall on instances"
  type        = bool
  default     = true
}

variable "enable_fail2ban" {
  description = "Enable fail2ban for SSH protection"
  type        = bool
  default     = true
}

variable "enable_ssl" {
  description = "Enable SSL/TLS with Let's Encrypt"
  type        = bool
  default     = true
}

# Backup configuration
variable "enable_backups" {
  description = "Enable automated backups"
  type        = bool
  default     = true
}

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 7
}

# Cost optimization
variable "enable_cost_optimization" {
  description = "Enable cost optimization features"
  type        = bool
  default     = true
}

variable "schedule_shutdown" {
  description = "Schedule automatic shutdown (for cost savings)"
  type        = bool
  default     = false
}

variable "shutdown_time" {
  description = "Time to shutdown instances (24h format)"
  type        = string
  default     = "22:00"
}

variable "startup_time" {
  description = "Time to startup instances (24h format)"
  type        = string
  default     = "08:00"
}
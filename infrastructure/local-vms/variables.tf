# TaskFlow - Local VMs Variables
# Configuration variables for VirtualBox VMs

variable "ubuntu_image" {
  description = "Ubuntu cloud image for VMs"
  type        = string
  default     = "https://cloud-images.ubuntu.com/focal/current/focal-server-cloudimg-amd64.ova"
}

variable "master_cpu" {
  description = "Number of CPUs for master node"
  type        = number
  default     = 2
}

variable "master_memory" {
  description = "Memory in MB for master node"
  type        = number
  default     = 2048
}

variable "worker_count" {
  description = "Number of worker nodes"
  type        = number
  default     = 2
}

variable "worker_cpu" {
  description = "Number of CPUs for each worker node"
  type        = number
  default     = 2
}

variable "worker_memory" {
  description = "Memory in MB for each worker node"
  type        = number
  default     = 2048
}

variable "bastion_cpu" {
  description = "Number of CPUs for bastion host"
  type        = number
  default     = 1
}

variable "bastion_memory" {
  description = "Memory in MB for bastion host"
  type        = number
  default     = 1024
}

variable "enable_bastion" {
  description = "Enable bastion host"
  type        = bool
  default     = false
}

variable "ssh_public_key_path" {
  description = "Path to SSH public key"
  type        = string
  default     = "~/.ssh/id_rsa.pub"
}

variable "ssh_private_key_path" {
  description = "Path to SSH private key"
  type        = string
  default     = "~/.ssh/id_rsa"
}

variable "network_device" {
  description = "Network device for bridged networking"
  type        = string
  default     = "IntelPro1000MTDesktop"
}

variable "host_interface" {
  description = "Host network interface for bridged networking"
  type        = string
  default     = "en0"  # Change to your network interface
}

variable "shared_folder_path" {
  description = "Path to shared folder on host"
  type        = string
  default     = "~/TaskFlow"
}

variable "k3s_token" {
  description = "K3s cluster token (leave empty to auto-generate)"
  type        = string
  default     = null
  sensitive   = true
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "taskflow"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "local"
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default = {
    Project     = "TaskFlow"
    Environment = "local"
    Purpose     = "DevOps Learning"
    ManagedBy   = "Terraform"
    CostCenter  = "Learning"
  }
}

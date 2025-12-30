# TaskFlow - Local VirtualBox VMs Configuration
# 100% Local Development Environment
# No cloud account required - runs entirely on your machine

terraform {
  required_version = ">= 1.0"
  required_providers {
    virtualbox = {
      source  = "terra-farm/virtualbox"
      version = "~> 0.2"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }
}

# Configure the VirtualBox Provider
provider "virtualbox" {
  # VirtualBox provider configuration
  # No additional configuration needed for local development
}

# Data sources
data "local_file" "ssh_public_key" {
  filename = var.ssh_public_key_path
}

# Generate K3s token if not provided
resource "random_password" "k3s_token" {
  count   = var.k3s_token == null ? 1 : 0
  length  = 32
  special = false
  upper   = true
  lower   = true
  numeric = true
}

# Use provided token or generated token
locals {
  k3s_token = var.k3s_token != null ? var.k3s_token : "taskflow-k3s-token-${random_password.k3s_token[0].result}"
}

# VirtualBox VMs for K3s cluster
resource "virtualbox_vm" "k3s_master" {
  name   = "taskflow-k3s-master"
  image  = var.ubuntu_image
  cpus   = var.master_cpu
  memory = var.master_memory
  
  # Network configuration
  network_adapter {
    type           = "bridged"
    device         = var.network_device
    host_interface = var.host_interface
  }
  
  # Port forwarding for SSH
  network_adapter {
    type           = "nat"
    device         = "IntelPro1000MTDesktop"
    host_interface = "vboxnet0"
  }
  
  # Shared folder for development
  shared_folder {
    name = "taskflow-shared"
    path = var.shared_folder_path
  }
  
  # User data for cloud-init
  user_data = base64encode(templatefile("${path.module}/cloud-init-master.yaml", {
    k3s_token = local.k3s_token
  }))
  
  # SSH key
  ssh_key = data.local_file.ssh_public_key.content
  
  # VM settings
  boot_order = ["disk", "dvd"]
  guest_os   = "Ubuntu_64"
  
  # Resource limits
  vram = 16  # Video RAM in MB
  
  lifecycle {
    create_before_destroy = true
  }
}

resource "virtualbox_vm" "k3s_workers" {
  count  = var.worker_count
  name   = "taskflow-k3s-worker-${count.index + 1}"
  image  = var.ubuntu_image
  cpus   = var.worker_cpu
  memory = var.worker_memory
  
  # Network configuration
  network_adapter {
    type           = "bridged"
    device         = var.network_device
    host_interface = var.host_interface
  }
  
  # Port forwarding for SSH
  network_adapter {
    type           = "nat"
    device         = "IntelPro1000MTDesktop"
    host_interface = "vboxnet0"
  }
  
  # Shared folder for development
  shared_folder {
    name = "taskflow-shared"
    path = var.shared_folder_path
  }
  
  # User data for cloud-init
  user_data = base64encode(templatefile("${path.module}/cloud-init-worker.yaml", {
    k3s_master_ip = virtualbox_vm.k3s_master.ipv4_address
    k3s_token     = local.k3s_token
  }))
  
  # SSH key
  ssh_key = data.local_file.ssh_public_key.content
  
  # VM settings
  boot_order = ["disk", "dvd"]
  guest_os   = "Ubuntu_64"
  
  # Resource limits
  vram = 16  # Video RAM in MB
  
  lifecycle {
    create_before_destroy = true
  }
}

# Bastion host (optional)
resource "virtualbox_vm" "bastion" {
  count  = var.enable_bastion ? 1 : 0
  name   = "taskflow-bastion"
  image  = var.ubuntu_image
  cpus   = var.bastion_cpu
  memory = var.bastion_memory
  
  # Network configuration
  network_adapter {
    type           = "bridged"
    device         = var.network_device
    host_interface = var.host_interface
  }
  
  # Port forwarding for SSH
  network_adapter {
    type           = "nat"
    device         = "IntelPro1000MTDesktop"
    host_interface = "vboxnet0"
  }
  
  # Shared folder for development
  shared_folder {
    name = "taskflow-shared"
    path = var.shared_folder_path
  }
  
  # User data for cloud-init
  user_data = base64encode(file("${path.module}/cloud-init-bastion.yaml"))
  
  # SSH key
  ssh_key = data.local_file.ssh_public_key.content
  
  # VM settings
  boot_order = ["disk", "dvd"]
  guest_os   = "Ubuntu_64"
  
  # Resource limits
  vram = 16  # Video RAM in MB
  
  lifecycle {
    create_before_destroy = true
  }
}

# Ansible inventory file
resource "local_file" "ansible_inventory" {
  content = templatefile("${path.module}/inventory.tpl", {
    master_ip    = virtualbox_vm.k3s_master.ipv4_address
    worker1_ip   = virtualbox_vm.k3s_workers[0].ipv4_address
    worker2_ip   = virtualbox_vm.k3s_workers[1].ipv4_address
    bastion_ip   = var.enable_bastion ? virtualbox_vm.bastion[0].ipv4_address : ""
    ssh_key_path = var.ssh_private_key_path
    k3s_token    = local.k3s_token
  })
  filename = "${path.module}/inventory.ini"
  
  depends_on = [
    virtualbox_vm.k3s_master,
    virtualbox_vm.k3s_workers,
    virtualbox_vm.bastion
  ]
}

# Connection script
resource "local_file" "connection_script" {
  content = templatefile("${path.module}/connect.sh.tpl", {
    master_ip = virtualbox_vm.k3s_master.ipv4_address
    worker1_ip = virtualbox_vm.k3s_workers[0].ipv4_address
    worker2_ip = virtualbox_vm.k3s_workers[1].ipv4_address
    bastion_ip = var.enable_bastion ? virtualbox_vm.bastion[0].ipv4_address : ""
    ssh_key_path = var.ssh_private_key_path
  })
  filename = "${path.module}/connect.sh"
  file_permission = "0755"
}

# Setup script
resource "local_file" "setup_script" {
  content = templatefile("${path.module}/setup.sh.tpl", {
    master_ip = virtualbox_vm.k3s_master.ipv4_address
    worker1_ip = virtualbox_vm.k3s_workers[0].ipv4_address
    worker2_ip = virtualbox_vm.k3s_workers[1].ipv4_address
    bastion_ip = var.enable_bastion ? virtualbox_vm.bastion[0].ipv4_address : ""
    ssh_key_path = var.ssh_private_key_path
    shared_folder_path = var.shared_folder_path
  })
  filename = "${path.module}/setup.sh"
  file_permission = "0755"
}

# Cost summary (always $0 for local)
resource "local_file" "cost_summary" {
  content = <<-EOT
# TaskFlow Local VMs Cost Summary
# ===================================

## Local Development Environment
- VirtualBox VMs running on your machine
- No cloud resources used
- No internet required after setup
- No ongoing costs

## Monthly Cost: $0.00
## One-time setup cost: $0.00

## Resource Requirements:
- Host machine: 8GB RAM minimum, 50GB disk space
- VirtualBox: Free and open-source
- Ubuntu VMs: Free and open-source
- K3s: Free and open-source

## VM Configuration:
- K3s Master: ${var.master_cpu} CPU, ${var.master_memory}GB RAM
- K3s Workers: ${var.worker_count} x (${var.worker_cpu} CPU, ${var.worker_memory}GB RAM each)
- Bastion: ${var.enable_bastion ? "${var.bastion_cpu} CPU, ${var.bastion_memory}GB RAM" : "Disabled"}

## Benefits of Local Development:
- No internet dependency
- No cloud account required
- Full control over environment
- No usage limits
- Offline development possible
- Faster iteration cycles

EOT
  filename = "${path.module}/COST_SUMMARY.md"
}

# TaskFlow - Oracle Cloud Infrastructure (OCI) Configuration
# Always Free Tier Setup for DevOps Learning
# 
# This configuration creates a complete K3s cluster on Oracle Cloud Always Free tier
# Resources included:
# - 4 ARM-based Ampere A1 instances (24GB RAM total - FREE FOREVER)
# - 200GB block storage (FREE FOREVER)
# - Load balancer (FREE FOREVER)
# - VCN with public subnet
# - Security lists (firewall rules)

terraform {
  required_version = ">= 1.0"
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 5.0"
    }
  }
  
  # Optional: Use Terraform Cloud for state management (free tier available)
  # cloud {
  #   organization = "your-org"
  #   workspaces {
  #     name = "taskflow-oracle-cloud"
  #   }
  # }
}

# Configure the OCI Provider
provider "oci" {
  region = var.region
  
  # Authentication methods (choose one):
  # 1. API Key authentication (recommended for learning)
  # 2. Instance Principal (for OCI instances)
  # 3. Resource Principal (for functions)
  
  # For API Key auth, set these environment variables:
  # export TF_VAR_tenancy_ocid="ocid1.tenancy.oc1..xxxxx"
  # export TF_VAR_user_ocid="ocid1.user.oc1..xxxxx"
  # export TF_VAR_fingerprint="xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx"
  # export TF_VAR_private_key_path="~/.oci/oci_api_key.pem"
}

# Data sources
data "oci_identity_availability_domains" "ads" {
  compartment_id = var.compartment_ocid
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

data "oci_core_images" "arm_images" {
  compartment_id           = var.compartment_ocid
  operating_system         = "Oracle Linux"
  operating_system_version = "8"
  shape                    = var.instance_shape
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

# VCN (Virtual Cloud Network)
resource "oci_core_vcn" "taskflow_vcn" {
  compartment_id = var.compartment_ocid
  cidr_blocks    = ["10.0.0.0/16"]
  display_name   = "taskflow-vcn"
  dns_label      = "taskflow"
  
  lifecycle {
    create_before_destroy = true
  }
}

# Internet Gateway
resource "oci_core_internet_gateway" "taskflow_igw" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.taskflow_vcn.id
  display_name   = "taskflow-internet-gateway"
  
  lifecycle {
    create_before_destroy = true
  }
}

# Route Table
resource "oci_core_route_table" "taskflow_rt" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.taskflow_vcn.id
  display_name   = "taskflow-route-table"
  
  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.taskflow_igw.id
  }
  
  lifecycle {
    create_before_destroy = true
  }
}

# Security List for Web Traffic
resource "oci_core_security_list" "taskflow_web_sl" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.taskflow_vcn.id
  display_name   = "taskflow-web-security-list"
  
  # Allow HTTP traffic
  ingress_security_rules {
    protocol  = "6" # TCP
    source     = "0.0.0.0/0"
    source_type = "CIDR_BLOCK"
    stateless = false
    tcp_options {
      min = 80
      max = 80
    }
  }
  
  # Allow HTTPS traffic
  ingress_security_rules {
    protocol  = "6" # TCP
    source     = "0.0.0.0/0"
    source_type = "CIDR_BLOCK"
    stateless = false
    tcp_options {
      min = 443
      max = 443
    }
  }
  
  # Allow SSH from your IP only
  ingress_security_rules {
    protocol  = "6" # TCP
    source     = var.ssh_source_cidr
    source_type = "CIDR_BLOCK"
    stateless = false
    tcp_options {
      min = 22
      max = 22
    }
  }
  
  # Allow Kubernetes API server
  ingress_security_rules {
    protocol  = "6" # TCP
    source     = "10.0.0.0/16"
    source_type = "CIDR_BLOCK"
    stateless = false
    tcp_options {
      min = 6443
      max = 6443
    }
  }
  
  # Allow NodePort range
  ingress_security_rules {
    protocol  = "6" # TCP
    source     = "0.0.0.0/0"
    source_type = "CIDR_BLOCK"
    stateless = false
    tcp_options {
      min = 30000
      max = 32767
    }
  }
  
  # Allow all outbound traffic
  egress_security_rules {
    protocol    = "all"
    destination = "0.0.0.0/0"
    destination_type = "CIDR_BLOCK"
    stateless   = false
  }
  
  lifecycle {
    create_before_destroy = true
  }
}

# Subnet
resource "oci_core_subnet" "taskflow_subnet" {
  compartment_id      = var.compartment_ocid
  vcn_id              = oci_core_vcn.taskflow_vcn.id
  cidr_block          = "10.0.1.0/24"
  display_name        = "taskflow-subnet"
  dns_label           = "taskflow"
  route_table_id      = oci_core_route_table.taskflow_rt.id
  security_list_ids   = [oci_core_security_list.taskflow_web_sl.id]
  
  lifecycle {
    create_before_destroy = true
  }
}

# Load Balancer
resource "oci_core_load_balancer" "taskflow_lb" {
  compartment_id = var.compartment_ocid
  display_name   = "taskflow-load-balancer"
  shape          = "flexible"
  shape_details {
    minimum_bandwidth_in_mbps = 10
    maximum_bandwidth_in_mbps = 10
  }
  subnet_ids = [oci_core_subnet.taskflow_subnet.id]
  
  # Free tier load balancer configuration
  is_private = false
  
  lifecycle {
    create_before_destroy = true
  }
}

# K3s Master Node
resource "oci_core_instance" "k3s_master" {
  compartment_id      = var.compartment_ocid
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  display_name        = "taskflow-k3s-master"
  shape               = var.instance_shape
  
  # Free tier: 1 OCPU, 6GB RAM (can be adjusted up to 4 OCPU, 24GB RAM)
  shape_config {
    ocpus         = 1
    memory_in_gb  = 6
  }
  
  source_details {
    source_type = "image"
    source_id   = data.oci_core_images.arm_images.images[0].id
  }
  
  create_vnic_details {
    subnet_id        = oci_core_subnet.taskflow_subnet.id
    display_name     = "taskflow-master-vnic"
    assign_public_ip = true
    hostname_label   = "k3s-master"
  }
  
  metadata = {
    ssh_authorized_keys = file(var.ssh_public_key_path)
    user_data = base64encode(templatefile("${path.module}/cloud-init-master.yaml", {
      k3s_token = local.k3s_token
    }))
  }
  
  # Free tier: 50GB boot volume
  agent_config {
    plugins_s3_bucket_name = null
  }
  
  lifecycle {
    create_before_destroy = true
  }
}

# K3s Worker Nodes (2 nodes)
resource "oci_core_instance" "k3s_workers" {
  count          = 2
  compartment_id = var.compartment_ocid
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  display_name        = "taskflow-k3s-worker-${count.index + 1}"
  shape               = var.instance_shape
  
  # Free tier: 1 OCPU, 6GB RAM each (total: 3 OCPU, 18GB RAM)
  shape_config {
    ocpus         = 1
    memory_in_gb  = 6
  }
  
  source_details {
    source_type = "image"
    source_id   = data.oci_core_images.arm_images.images[0].id
  }
  
  create_vnic_details {
    subnet_id        = oci_core_subnet.taskflow_subnet.id
    display_name     = "taskflow-worker-${count.index + 1}-vnic"
    assign_public_ip = true
    hostname_label   = "k3s-worker-${count.index + 1}"
  }
  
  metadata = {
    ssh_authorized_keys = file(var.ssh_public_key_path)
    user_data = base64encode(templatefile("${path.module}/cloud-init-worker.yaml", {
      k3s_master_ip = oci_core_instance.k3s_master.public_ip
      k3s_token     = local.k3s_token
    }))
  }
  
  # Free tier: 50GB boot volume each
  agent_config {
    plugins_s3_bucket_name = null
  }
  
  lifecycle {
    create_before_destroy = true
  }
}

# Bastion Host (Optional - for secure access)
resource "oci_core_instance" "bastion" {
  compartment_id      = var.compartment_ocid
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  display_name        = "taskflow-bastion"
  shape               = var.instance_shape
  
  # Free tier: 1 OCPU, 1GB RAM (minimal for bastion)
  shape_config {
    ocpus         = 1
    memory_in_gb  = 1
  }
  
  source_details {
    source_type = "image"
    source_id   = data.oci_core_images.arm_images.images[0].id
  }
  
  create_vnic_details {
    subnet_id        = oci_core_subnet.taskflow_subnet.id
    display_name     = "taskflow-bastion-vnic"
    assign_public_ip = true
    hostname_label   = "bastion"
  }
  
  metadata = {
    ssh_authorized_keys = file(var.ssh_public_key_path)
    user_data = base64encode(file("${path.module}/cloud-init-bastion.yaml"))
  }
  
  # Free tier: 50GB boot volume
  agent_config {
    plugins_s3_bucket_name = null
  }
  
  lifecycle {
    create_before_destroy = true
  }
}

# Block Volume for persistent storage (200GB free tier)
resource "oci_core_volume" "taskflow_storage" {
  compartment_id      = var.compartment_ocid
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  display_name        = "taskflow-storage"
  size_in_gbs         = 200  # Free tier: 200GB
  
  # Free tier: Balanced performance
  vpus_per_gb = 10
  
  lifecycle {
    create_before_destroy = true
  }
}

# Volume Attachment to Master
resource "oci_core_volume_attachment" "taskflow_storage_attachment" {
  attachment_type = "iscsi"
  instance_id     = oci_core_instance.k3s_master.id
  volume_id      = oci_core_volume.taskflow_storage.id
  display_name   = "taskflow-storage-attachment"
  
  # Free tier: No additional charges
  is_read_only = false
  is_shareable  = false
  
  lifecycle {
    create_before_destroy = true
  }
}

# Dynamic Inventory for Ansible
resource "local_file" "ansible_inventory" {
  content = templatefile("${path.module}/inventory.tpl", {
    master_ip    = oci_core_instance.k3s_master.public_ip
    worker1_ip   = oci_core_instance.k3s_workers[0].public_ip
    worker2_ip   = oci_core_instance.k3s_workers[1].public_ip
    bastion_ip   = oci_core_instance.bastion.public_ip
    ssh_key_path = var.ssh_private_key_path
    k3s_token    = local.k3s_token
  })
  filename = "${path.module}/inventory.ini"
  
  depends_on = [
    oci_core_instance.k3s_master,
    oci_core_instance.k3s_workers,
    oci_core_instance.bastion
  ]
}

# Cost tracking (always free tier)
resource "local_file" "cost_summary" {
  content = <<-EOT
# TaskFlow Oracle Cloud Cost Summary
# ===================================

## Always Free Tier Resources Used:
- 4 ARM-based Ampere A1 instances (24GB RAM total) - FREE FOREVER
- 200GB block storage - FREE FOREVER  
- Load balancer (10 Mbps) - FREE FOREVER
- VCN and networking - FREE FOREVER

## Monthly Cost: $0.00
## No credit card required (in most regions)
## No time limits - resources are free forever

## Resource Breakdown:
- K3s Master: 1 OCPU, 6GB RAM, 50GB storage
- K3s Workers: 2 x (1 OCPU, 6GB RAM, 50GB storage each)
- Bastion: 1 OCPU, 1GB RAM, 50GB storage
- Additional Storage: 200GB block volume
- Load Balancer: 10 Mbps bandwidth

## Free Tier Limits:
- Maximum 4 ARM instances
- Maximum 24GB RAM total
- Maximum 200GB storage
- Maximum 10 Mbps load balancer

## Staying in Free Tier:
- Monitor usage in OCI Console
- Set up billing alerts
- Use resource tags for tracking
- Regular cleanup of unused resources

EOT
  filename = "${path.module}/COST_SUMMARY.md"
}
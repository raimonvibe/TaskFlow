# TaskFlow - Oracle Cloud Outputs
# Output values for the OCI Always Free tier infrastructure

# Instance Information
output "k3s_master_public_ip" {
  description = "Public IP address of the K3s master node"
  value       = oci_core_instance.k3s_master.public_ip
}

output "k3s_master_private_ip" {
  description = "Private IP address of the K3s master node"
  value       = oci_core_instance.k3s_master.private_ip
}

output "k3s_workers_public_ips" {
  description = "Public IP addresses of the K3s worker nodes"
  value       = oci_core_instance.k3s_workers[*].public_ip
}

output "k3s_workers_private_ips" {
  description = "Private IP addresses of the K3s worker nodes"
  value       = oci_core_instance.k3s_workers[*].private_ip
}

output "bastion_public_ip" {
  description = "Public IP address of the bastion host"
  value       = oci_core_instance.bastion.public_ip
}

output "bastion_private_ip" {
  description = "Private IP address of the bastion host"
  value       = oci_core_instance.bastion.private_ip
}

# Load Balancer Information
output "load_balancer_ip" {
  description = "IP address of the load balancer"
  value       = oci_core_load_balancer.taskflow_lb.ip_addresses[0].ip_address
}

output "load_balancer_hostname" {
  description = "Hostname of the load balancer"
  value       = oci_core_load_balancer.taskflow_lb.hostname
}

# Network Information
output "vcn_id" {
  description = "ID of the Virtual Cloud Network"
  value       = oci_core_vcn.taskflow_vcn.id
}

output "vcn_cidr" {
  description = "CIDR block of the VCN"
  value       = oci_core_vcn.taskflow_vcn.cidr_blocks[0]
}

output "subnet_id" {
  description = "ID of the subnet"
  value       = oci_core_subnet.taskflow_subnet.id
}

output "subnet_cidr" {
  description = "CIDR block of the subnet"
  value       = oci_core_subnet.taskflow_subnet.cidr_block
}

# Storage Information
output "block_volume_id" {
  description = "ID of the block volume"
  value       = oci_core_volume.taskflow_storage.id
}

output "block_volume_size" {
  description = "Size of the block volume in GB"
  value       = oci_core_volume.taskflow_storage.size_in_gbs
}

# Connection Information
output "ssh_connection_commands" {
  description = "SSH connection commands for all instances"
  value = {
    master = "ssh -i ${var.ssh_private_key_path} opc@${oci_core_instance.k3s_master.public_ip}"
    worker1 = "ssh -i ${var.ssh_private_key_path} opc@${oci_core_instance.k3s_workers[0].public_ip}"
    worker2 = "ssh -i ${var.ssh_private_key_path} opc@${oci_core_instance.k3s_workers[1].public_ip}"
    bastion = "ssh -i ${var.ssh_private_key_path} opc@${oci_core_instance.bastion.public_ip}"
  }
}

output "kubectl_setup_command" {
  description = "Command to set up kubectl access"
  value = "ssh -i ${var.ssh_private_key_path} opc@${oci_core_instance.k3s_master.public_ip} 'sudo cat /etc/rancher/k3s/k3s.yaml' > k3s.yaml && sed -i 's/127.0.0.1/${oci_core_instance.k3s_master.public_ip}/g' k3s.yaml"
}

# Application Access
output "application_url" {
  description = "URL to access the TaskFlow application"
  value       = "http://${oci_core_load_balancer.taskflow_lb.ip_addresses[0].ip_address}"
}

output "grafana_url" {
  description = "URL to access Grafana monitoring"
  value       = "http://${oci_core_load_balancer.taskflow_lb.ip_addresses[0].ip_address}:3001"
}

output "prometheus_url" {
  description = "URL to access Prometheus metrics"
  value       = "http://${oci_core_load_balancer.taskflow_lb.ip_addresses[0].ip_address}:9090"
}

# Cost Information
output "cost_summary" {
  description = "Summary of costs (should be $0 for free tier)"
  value = {
    monthly_cost = "$0.00"
    resources_used = {
      instances = "4 ARM instances (24GB RAM total)"
      storage = "200GB block storage"
      load_balancer = "10 Mbps bandwidth"
      networking = "VCN and security lists"
    }
    free_tier_limits = {
      max_instances = 4
      max_ram = "24GB"
      max_storage = "200GB"
      max_bandwidth = "10 Mbps"
    }
  }
}

# Ansible Inventory
output "ansible_inventory_file" {
  description = "Path to the generated Ansible inventory file"
  value       = "${path.module}/inventory.ini"
}

output "ansible_connection_info" {
  description = "Information for Ansible connections"
  value = {
    inventory_file = "${path.module}/inventory.ini"
    ssh_key = var.ssh_private_key_path
    user = "opc"
    become = true
  }
}

# Deployment Information
output "deployment_status" {
  description = "Status of the infrastructure deployment"
  value = {
    master_ready = "Check with: ssh -i ${var.ssh_private_key_path} opc@${oci_core_instance.k3s_master.public_ip} 'kubectl get nodes'"
    workers_ready = "Check with: ssh -i ${var.ssh_private_key_path} opc@${oci_core_instance.k3s_master.public_ip} 'kubectl get nodes'"
    load_balancer_ready = "Check with: curl -I http://${oci_core_load_balancer.taskflow_lb.ip_addresses[0].ip_address}"
  }
}

# Next Steps
output "next_steps" {
  description = "Next steps after infrastructure is created"
  value = [
    "1. Wait 5-10 minutes for instances to fully initialize",
    "2. SSH to master: ssh -i ${var.ssh_private_key_path} opc@${oci_core_instance.k3s_master.public_ip}",
    "3. Check K3s status: sudo systemctl status k3s",
    "4. Get kubeconfig: sudo cat /etc/rancher/k3s/k3s.yaml",
    "5. Deploy TaskFlow: kubectl apply -f /path/to/kubernetes/manifests",
    "6. Access application: http://${oci_core_load_balancer.taskflow_lb.ip_addresses[0].ip_address}",
    "7. Monitor with Grafana: http://${oci_core_load_balancer.taskflow_lb.ip_addresses[0].ip_address}:3001"
  ]
}

# Troubleshooting
output "troubleshooting_commands" {
  description = "Useful commands for troubleshooting"
  value = {
    check_master_logs = "ssh -i ${var.ssh_private_key_path} opc@${oci_core_instance.k3s_master.public_ip} 'sudo journalctl -u k3s -f'"
    check_worker_logs = "ssh -i ${var.ssh_private_key_path} opc@${oci_core_instance.k3s_workers[0].public_ip} 'sudo journalctl -u k3s-agent -f'"
    check_k3s_status = "ssh -i ${var.ssh_private_key_path} opc@${oci_core_instance.k3s_master.public_ip} 'kubectl get nodes -o wide'"
    check_pods = "ssh -i ${var.ssh_private_key_path} opc@${oci_core_instance.k3s_master.public_ip} 'kubectl get pods -A'"
    check_services = "ssh -i ${var.ssh_private_key_path} opc@${oci_core_instance.k3s_master.public_ip} 'kubectl get svc -A'"
  }
}

# Security Information
output "security_notes" {
  description = "Important security considerations"
  value = [
    "SSH access is currently open to 0.0.0.0/0 - restrict this to your IP",
    "Kubernetes API is accessible on port 6443 - consider firewall rules",
    "NodePort services are accessible on ports 30000-32767",
    "Consider setting up a VPN for secure access",
    "Enable fail2ban and UFW firewall on all instances",
    "Regular security updates are recommended"
  ]
}

# Resource Limits
output "free_tier_usage" {
  description = "Current usage of free tier resources"
  value = {
    instances_used = 4
    instances_limit = 4
    ram_used_gb = 19  # 6+6+6+1
    ram_limit_gb = 24
    storage_used_gb = 200
    storage_limit_gb = 200
    bandwidth_used_mbps = 10
    bandwidth_limit_mbps = 10
  }
}

# Monitoring Setup
output "monitoring_setup" {
  description = "Commands to set up monitoring"
  value = {
    install_prometheus = "kubectl apply -f https://raw.githubusercontent.com/prometheus-operator/prometheus-operator/main/bundle.yaml"
    install_grafana = "kubectl apply -f https://raw.githubusercontent.com/grafana/helm-charts/main/charts/grafana/values.yaml"
    access_grafana = "kubectl port-forward svc/grafana 3000:80"
  }
}
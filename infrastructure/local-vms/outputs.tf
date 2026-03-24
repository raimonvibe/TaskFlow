# TaskFlow - Local VMs Outputs
# Output values for VirtualBox VMs

# VM Information
output "k3s_master_ip" {
  description = "IP address of the K3s master node"
  value       = virtualbox_vm.k3s_master.ipv4_address
}

output "k3s_workers_ips" {
  description = "IP addresses of the K3s worker nodes"
  value       = virtualbox_vm.k3s_workers[*].ipv4_address
}

output "bastion_ip" {
  description = "IP address of the bastion host"
  value       = var.enable_bastion ? virtualbox_vm.bastion[0].ipv4_address : null
}

# Connection Information
output "ssh_connection_commands" {
  description = "SSH connection commands for all VMs"
  value = {
    master = "ssh -i ${var.ssh_private_key_path} ubuntu@${virtualbox_vm.k3s_master.ipv4_address}"
    worker1 = "ssh -i ${var.ssh_private_key_path} ubuntu@${virtualbox_vm.k3s_workers[0].ipv4_address}"
    worker2 = "ssh -i ${var.ssh_private_key_path} ubuntu@${virtualbox_vm.k3s_workers[1].ipv4_address}"
    bastion = var.enable_bastion ? "ssh -i ${var.ssh_private_key_path} ubuntu@${virtualbox_vm.bastion[0].ipv4_address}" : "Bastion disabled"
  }
}

output "kubectl_setup_command" {
  description = "Command to set up kubectl access"
  value = "ssh -i ${var.ssh_private_key_path} ubuntu@${virtualbox_vm.k3s_master.ipv4_address} 'sudo cat /etc/rancher/k3s/k3s.yaml' > k3s.yaml && sed -i 's/127.0.0.1/${virtualbox_vm.k3s_master.ipv4_address}/g' k3s.yaml"
}

# Ansible Information
output "ansible_inventory_file" {
  description = "Path to the generated Ansible inventory file"
  value       = "${path.module}/inventory.ini"
}

output "ansible_connection_info" {
  description = "Information for Ansible connections"
  value = {
    inventory_file = "${path.module}/inventory.ini"
    ssh_key = var.ssh_private_key_path
    user = "ubuntu"
    become = true
  }
}

# Cost Information
output "cost_summary" {
  description = "Summary of costs (always $0 for local)"
  value = {
    monthly_cost = "$0.00"
    setup_cost = "$0.00"
    resources_used = {
      vms = "${1 + var.worker_count + (var.enable_bastion ? 1 : 0)} VirtualBox VMs"
      total_cpu = "${var.master_cpu + (var.worker_count * var.worker_cpu) + (var.enable_bastion ? var.bastion_cpu : 0)} CPU cores"
      total_memory = "${var.master_memory + (var.worker_count * var.worker_memory) + (var.enable_bastion ? var.bastion_memory : 0)} MB RAM"
    }
    benefits = [
      "No internet dependency",
      "No cloud account required",
      "Full control over environment",
      "No usage limits",
      "Offline development possible"
    ]
  }
}

# Next Steps
output "next_steps" {
  description = "Next steps after VMs are created"
  value = [
    "1. Wait 5-10 minutes for VMs to fully initialize",
    "2. SSH to master: ssh -i ${var.ssh_private_key_path} ubuntu@${virtualbox_vm.k3s_master.ipv4_address}",
    "3. Check K3s status: sudo systemctl status k3s",
    "4. Get kubeconfig: sudo cat /etc/rancher/k3s/k3s.yaml",
    "5. Deploy TaskFlow: kubectl apply -f /path/to/kubernetes/manifests",
    "6. Access application: http://${virtualbox_vm.k3s_master.ipv4_address}:30080",
    "7. Monitor with Grafana: http://${virtualbox_vm.k3s_master.ipv4_address}:30001"
  ]
}

# Troubleshooting
output "troubleshooting_commands" {
  description = "Useful commands for troubleshooting"
  value = {
    check_master_logs = "ssh -i ${var.ssh_private_key_path} ubuntu@${virtualbox_vm.k3s_master.ipv4_address} 'sudo journalctl -u k3s -f'"
    check_worker_logs = "ssh -i ${var.ssh_private_key_path} ubuntu@${virtualbox_vm.k3s_workers[0].ipv4_address} 'sudo journalctl -u k3s-agent -f'"
    check_k3s_status = "ssh -i ${var.ssh_private_key_path} ubuntu@${virtualbox_vm.k3s_master.ipv4_address} 'kubectl get nodes -o wide'"
    check_pods = "ssh -i ${var.ssh_private_key_path} ubuntu@${virtualbox_vm.k3s_master.ipv4_address} 'kubectl get pods -A'"
    check_services = "ssh -i ${var.ssh_private_key_path} ubuntu@${virtualbox_vm.k3s_master.ipv4_address} 'kubectl get svc -A'"
    check_vm_status = "VBoxManage list runningvms"
    check_vm_network = "VBoxManage showvminfo taskflow-k3s-master --machinereadable | grep NIC"
  }
}

# Development Information
output "development_info" {
  description = "Information for development workflow"
  value = {
    shared_folder = var.shared_folder_path
    connection_script = "${path.module}/connect.sh"
    setup_script = "${path.module}/setup.sh"
    inventory_file = "${path.module}/inventory.ini"
  }
}

# Resource Requirements
output "host_requirements" {
  description = "Host machine requirements"
  value = {
    minimum_ram = "8GB"
    recommended_ram = "16GB"
    minimum_disk = "50GB"
    recommended_disk = "100GB"
    cpu_cores = "4+ recommended"
    virtualization = "Intel VT-x or AMD-V required"
  }
}

# VM Status
output "vm_status" {
  description = "Status of all VMs"
  value = {
    master = {
      name = virtualbox_vm.k3s_master.name
      ip = virtualbox_vm.k3s_master.ipv4_address
      status = "Running"
    }
    workers = [
      for i, worker in virtualbox_vm.k3s_workers : {
        name = worker.name
        ip = worker.ipv4_address
        status = "Running"
      }
    ]
    bastion = var.enable_bastion ? {
      name = virtualbox_vm.bastion[0].name
      ip = virtualbox_vm.bastion[0].ipv4_address
      status = "Running"
    } : null
  }
}

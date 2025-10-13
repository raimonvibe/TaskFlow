# Terraform Guide for TaskFlow

Infrastructure as Code with Terraform.

## Installation

```bash
# Ubuntu/Debian
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform -y

# Verify
terraform --version
```

## Quick Start

```bash
cd infrastructure/oracle-cloud

# Initialize
terraform init

# Plan
terraform plan

# Apply
terraform apply

# Destroy
terraform destroy
```

## TaskFlow Infrastructure

### Oracle Cloud (Free Tier)
```bash
cd infrastructure/oracle-cloud
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your OCI credentials
terraform init
terraform plan
terraform apply -auto-approve
```

### Local VMs (VirtualBox)
```bash
cd infrastructure/local-vms
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform apply
```

### Hybrid Setup
```bash
cd infrastructure/hybrid
terraform init
terraform apply
```

## Common Commands

```bash
# Format code
terraform fmt

# Validate configuration
terraform validate

# Show current state
terraform show

# List resources
terraform state list

# Show specific resource
terraform state show <resource>

# Import existing resource
terraform import <resource> <id>

# Refresh state
terraform refresh

# Target specific resource
terraform apply -target=<resource>

# Output values
terraform output
```

## Best Practices

1. Use variables for configuration
2. Store state remotely (S3, Terraform Cloud)
3. Use workspaces for environments
4. Version control your code
5. Use modules for reusability
6. Always run `plan` before `apply`
7. Use `.tfvars` for secrets (don't commit!)
8. Document your infrastructure

## Variables

```bash
# Pass variables
terraform apply -var="instance_count=3"

# Use var file
terraform apply -var-file="production.tfvars"

# Environment variables
export TF_VAR_region="us-west-1"
terraform apply
```

## State Management

```bash
# List state
terraform state list

# Move resource
terraform state mv <source> <dest>

# Remove resource from state
terraform state rm <resource>

# Pull current state
terraform state pull

# Push state
terraform state push
```

## Troubleshooting

```bash
# Enable debug logging
export TF_LOG=DEBUG
terraform apply

# Refresh state if out of sync
terraform refresh

# Force unlock if locked
terraform force-unlock <lock-id>
```

## Resources
- [Terraform Documentation](https://www.terraform.io/docs)
- [Oracle Cloud Provider](https://registry.terraform.io/providers/oracle/oci/latest/docs)
- [Best Practices](https://www.terraform.io/docs/cloud/guides/recommended-practices/index.html)

# TaskFlow - Local VMs Terraform Version Constraints
# Version constraints for Terraform and providers

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
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

# Provider configurations
provider "virtualbox" {
  # VirtualBox provider configuration
  # No additional configuration needed for local development
}

provider "local" {
  # Used for generating local files (inventory, scripts)
}

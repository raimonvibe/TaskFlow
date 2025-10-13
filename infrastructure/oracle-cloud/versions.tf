# TaskFlow - Oracle Cloud Terraform Version Constraints
# Version constraints for Terraform and providers

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 5.0"
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
  
  # Optional: Use Terraform Cloud for state management
  # This provides:
  # - Remote state storage
  # - State locking
  # - Team collaboration
  # - Cost: Free for up to 5 users
  cloud {
    organization = "taskflow-devops"
    workspaces {
      name = "oracle-cloud-infrastructure"
    }
  }
}

# Provider configurations
provider "oci" {
  region = var.region
  
  # Authentication methods (in order of precedence):
  # 1. API Key authentication (recommended for learning)
  # 2. Instance Principal (for OCI instances)
  # 3. Resource Principal (for functions)
  # 4. Security Token (for federated users)
  
  # For API Key authentication, set these environment variables:
  # export TF_VAR_tenancy_ocid="ocid1.tenancy.oc1..xxxxx"
  # export TF_VAR_user_ocid="ocid1.user.oc1..xxxxx"
  # export TF_VAR_fingerprint="xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx"
  # export TF_VAR_private_key_path="~/.oci/oci_api_key.pem"
  
  # Alternative: Use config file
  # config_file_profile = "DEFAULT"
}

provider "local" {
  # Used for generating local files (inventory, configs)
}
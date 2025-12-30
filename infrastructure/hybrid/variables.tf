# TaskFlow - Hybrid Cloud Variables
# Configuration variables for hybrid cloud setup

variable "github_repo" {
  description = "GitHub repository URL"
  type        = string
  default     = "https://github.com/your-username/TaskFlow"
}

variable "domain_name" {
  description = "Custom domain name for the application"
  type        = string
  default     = "taskflow.your-domain.com"
}

variable "jwt_secret" {
  description = "JWT secret for authentication"
  type        = string
  sensitive   = true
  default     = "your-jwt-secret-here"
}

variable "redis_password" {
  description = "Redis password"
  type        = string
  sensitive   = true
  default     = "your-redis-password-here"
}

variable "database_password" {
  description = "Database password"
  type        = string
  sensitive   = true
  default     = "your-database-password-here"
}

variable "supabase_org_id" {
  description = "Supabase organization ID"
  type        = string
}

variable "supabase_region" {
  description = "Supabase region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "taskflow"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default = {
    Project     = "TaskFlow"
    Environment = "production"
    Purpose     = "DevOps Learning"
    ManagedBy   = "Terraform"
    CostCenter  = "Learning"
  }
}

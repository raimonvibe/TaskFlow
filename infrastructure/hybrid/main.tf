# TaskFlow - Hybrid Cloud Infrastructure
# Mix of free services for maximum cost efficiency
# Frontend: Vercel (free) + Backend: Railway (free credit) + Database: Supabase (free)

terraform {
  required_version = ">= 1.0"
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 0.15"
    }
    railway = {
      source  = "railway/railway"
      version = "~> 0.2"
    }
    supabase = {
      source  = "supabase/supabase"
      version = "~> 0.1"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }
}

# Configure providers
provider "vercel" {
  # Authentication via VERCEL_TOKEN environment variable
  # Get token from: https://vercel.com/account/tokens
}

provider "railway" {
  # Authentication via RAILWAY_TOKEN environment variable
  # Get token from: https://railway.app/account/tokens
}

provider "supabase" {
  # Authentication via SUPABASE_ACCESS_TOKEN environment variable
  # Get token from: https://supabase.com/dashboard/account/tokens
}

# Vercel Frontend Configuration
resource "vercel_project" "taskflow_frontend" {
  name = "taskflow-frontend"
  
  # Git repository integration
  git_repository = {
    type = "github"
    repo = var.github_repo
  }
  
  # Build settings
  build_command = "npm run build"
  output_directory = "dist"
  install_command = "npm install"
  
  # Environment variables
  env = {
    VITE_API_URL = "https://${railway_service.taskflow_backend.domain}"
    NODE_ENV = "production"
  }
  
  # Framework detection
  framework = "vite"
  
  # Root directory
  root_directory = "app/frontend"
}

# Vercel Domain
resource "vercel_domain" "taskflow_domain" {
  project_id = vercel_project.taskflow_frontend.id
  name       = var.domain_name
}

# Railway Backend Configuration
resource "railway_service" "taskflow_backend" {
  name = "taskflow-backend"
  
  # Source configuration
  source = {
    repo = var.github_repo
    root_directory = "app/backend"
  }
  
  # Build configuration
  build_command = "npm run build"
  start_command = "npm start"
  
  # Environment variables
  variables = {
    NODE_ENV = "production"
    PORT = "3000"
    DATABASE_URL = supabase_project.taskflow_db.database_url
    JWT_SECRET = var.jwt_secret
    REDIS_URL = railway_service.taskflow_redis.redis_url
  }
  
  # Resource limits (free tier)
  cpu_limit = 1000  # 1 vCPU
  memory_limit = 1024  # 1GB RAM
}

# Railway Redis Service
resource "railway_service" "taskflow_redis" {
  name = "taskflow-redis"
  
  # Redis configuration
  image = "redis:7-alpine"
  
  # Environment variables
  variables = {
    REDIS_PASSWORD = var.redis_password
  }
  
  # Resource limits (free tier)
  cpu_limit = 500  # 0.5 vCPU
  memory_limit = 512  # 512MB RAM
}

# Supabase Database
resource "supabase_project" "taskflow_db" {
  name = "taskflow-database"
  organization_id = var.supabase_org_id
  region = var.supabase_region
  
  # Database configuration
  database_password = var.database_password
  
  # Free tier settings
  plan = "free"
  
  # Features
  features = {
    database = true
    auth = true
    storage = true
    edge_functions = false
    realtime = true
  }
}

# Supabase Database Schema
resource "supabase_migration" "taskflow_schema" {
  project_id = supabase_project.taskflow_db.id
  
  # SQL migration files
  sql_files = [
    "${path.module}/../app/database/schema.sql",
    "${path.module}/../app/database/migrations/1_create_users_table.sql",
    "${path.module}/../app/database/migrations/2_create_tasks_table.sql",
    "${path.module}/../app/database/migrations/3_create_updated_at_trigger.sql"
  ]
  
  depends_on = [supabase_project.taskflow_db]
}

# Railway Environment Variables
resource "railway_variable" "backend_env" {
  for_each = {
    NODE_ENV = "production"
    PORT = "3000"
    DATABASE_URL = supabase_project.taskflow_db.database_url
    JWT_SECRET = var.jwt_secret
    REDIS_URL = railway_service.taskflow_redis.redis_url
    CORS_ORIGIN = "https://${vercel_project.taskflow_frontend.domain}"
  }
  
  service_id = railway_service.taskflow_backend.id
  key        = each.key
  value      = each.value
}

# Railway Environment Variables for Redis
resource "railway_variable" "redis_env" {
  for_each = {
    REDIS_PASSWORD = var.redis_password
  }
  
  service_id = railway_service.taskflow_redis.id
  key        = each.key
  value    = each.value
}

# Deployment configuration
resource "local_file" "deployment_config" {
  content = templatefile("${path.module}/deployment.yaml.tpl", {
    frontend_url = vercel_project.taskflow_frontend.domain
    backend_url = railway_service.taskflow_backend.domain
    database_url = supabase_project.taskflow_db.database_url
    redis_url = railway_service.taskflow_redis.redis_url
  })
  filename = "${path.module}/deployment.yaml"
}

# Cost summary
resource "local_file" "cost_summary" {
  content = <<-EOT
# TaskFlow Hybrid Cloud Cost Summary
# ===================================

## Free Tier Resources Used:
- Vercel: Unlimited free projects
- Railway: $5/month free credit
- Supabase: 500MB PostgreSQL free
- Total Monthly Cost: $0.00

## Resource Breakdown:
- Frontend: Vercel (unlimited free)
- Backend: Railway ($5 free credit)
- Database: Supabase (500MB free)
- Redis: Railway (included in free credit)

## Free Tier Limits:
- Vercel: 100GB bandwidth, unlimited projects
- Railway: $5/month credit, 512MB RAM, 1 vCPU
- Supabase: 500MB database, 1GB storage, 2GB bandwidth

## Cost Optimization:
- Use Railway free credit efficiently
- Monitor Supabase usage
- Optimize Vercel builds
- Use Redis for caching

EOT
  filename = "${path.module}/COST_SUMMARY.md"
}

# Health check configuration
resource "local_file" "health_check" {
  content = templatefile("${path.module}/health-check.sh.tpl", {
    frontend_url = vercel_project.taskflow_frontend.domain
    backend_url = railway_service.taskflow_backend.domain
    database_url = supabase_project.taskflow_db.database_url
  })
  filename = "${path.module}/health-check.sh"
  file_permission = "0755"
}

# TaskFlow - Hybrid Cloud Outputs
# Output values for hybrid cloud infrastructure

# Frontend Information
output "frontend_url" {
  description = "URL of the frontend application"
  value       = "https://${vercel_project.taskflow_frontend.domain}"
}

output "frontend_domain" {
  description = "Domain of the frontend application"
  value       = vercel_project.taskflow_frontend.domain
}

# Backend Information
output "backend_url" {
  description = "URL of the backend API"
  value       = "https://${railway_service.taskflow_backend.domain}"
}

output "backend_domain" {
  description = "Domain of the backend API"
  value       = railway_service.taskflow_backend.domain
}

# Database Information
output "database_url" {
  description = "Database connection URL"
  value       = supabase_project.taskflow_db.database_url
  sensitive   = true
}

output "database_host" {
  description = "Database host"
  value       = supabase_project.taskflow_db.database_host
}

output "database_port" {
  description = "Database port"
  value       = supabase_project.taskflow_db.database_port
}

# Redis Information
output "redis_url" {
  description = "Redis connection URL"
  value       = railway_service.taskflow_redis.redis_url
  sensitive   = true
}

# Application URLs
output "application_urls" {
  description = "All application URLs"
  value = {
    frontend = "https://${vercel_project.taskflow_frontend.domain}"
    backend = "https://${railway_service.taskflow_backend.domain}"
    api_docs = "https://${railway_service.taskflow_backend.domain}/api/docs"
    health = "https://${railway_service.taskflow_backend.domain}/health"
    metrics = "https://${railway_service.taskflow_backend.domain}/metrics"
  }
}

# Cost Information
output "cost_summary" {
  description = "Summary of costs (should be $0 for free tier)"
  value = {
    monthly_cost = "$0.00"
    resources_used = {
      frontend = "Vercel (unlimited free)"
      backend = "Railway ($5 free credit)"
      database = "Supabase (500MB free)"
      redis = "Railway (included in free credit)"
    }
    free_tier_limits = {
      vercel = "100GB bandwidth, unlimited projects"
      railway = "$5/month credit, 512MB RAM, 1 vCPU"
      supabase = "500MB database, 1GB storage, 2GB bandwidth"
    }
  }
}

# Deployment Information
output "deployment_status" {
  description = "Status of the hybrid deployment"
  value = {
    frontend_ready = "Check: curl -I https://${vercel_project.taskflow_frontend.domain}"
    backend_ready = "Check: curl -I https://${railway_service.taskflow_backend.domain}/health"
    database_ready = "Check: Connect to ${supabase_project.taskflow_db.database_host}"
    redis_ready = "Check: Connect to ${railway_service.taskflow_redis.redis_url}"
  }
}

# Next Steps
output "next_steps" {
  description = "Next steps after deployment"
  value = [
    "1. Wait 5-10 minutes for services to deploy",
    "2. Check frontend: https://${vercel_project.taskflow_frontend.domain}",
    "3. Check backend: https://${railway_service.taskflow_backend.domain}/health",
    "4. Check database connection",
    "5. Test application functionality",
    "6. Monitor usage in service dashboards"
  ]
}

# Environment Variables
output "environment_variables" {
  description = "Environment variables for local development"
  value = {
    frontend = {
      VITE_API_URL = "https://${railway_service.taskflow_backend.domain}"
      NODE_ENV = "production"
    }
    backend = {
      NODE_ENV = "production"
      PORT = "3000"
      DATABASE_URL = supabase_project.taskflow_db.database_url
      JWT_SECRET = var.jwt_secret
      REDIS_URL = railway_service.taskflow_redis.redis_url
      CORS_ORIGIN = "https://${vercel_project.taskflow_frontend.domain}"
    }
  }
  sensitive = true
}

# Service Information
output "service_info" {
  description = "Information about deployed services"
  value = {
    vercel = {
      project_id = vercel_project.taskflow_frontend.id
      domain = vercel_project.taskflow_frontend.domain
      dashboard = "https://vercel.com/dashboard"
    }
    railway = {
      backend_service_id = railway_service.taskflow_backend.id
      redis_service_id = railway_service.taskflow_redis.id
      dashboard = "https://railway.app/dashboard"
    }
    supabase = {
      project_id = supabase_project.taskflow_db.id
      dashboard = "https://supabase.com/dashboard"
    }
  }
}

# Health Check
output "health_check_commands" {
  description = "Commands to check service health"
  value = {
    frontend = "curl -I https://${vercel_project.taskflow_frontend.domain}"
    backend = "curl -I https://${railway_service.taskflow_backend.domain}/health"
    api = "curl -I https://${railway_service.taskflow_backend.domain}/api/health"
    metrics = "curl -I https://${railway_service.taskflow_backend.domain}/metrics"
  }
}

# Troubleshooting
output "troubleshooting_info" {
  description = "Information for troubleshooting"
  value = {
    logs = {
      vercel = "Check Vercel dashboard for build logs"
      railway = "Check Railway dashboard for service logs"
      supabase = "Check Supabase dashboard for database logs"
    }
    monitoring = {
      vercel = "https://vercel.com/dashboard"
      railway = "https://railway.app/dashboard"
      supabase = "https://supabase.com/dashboard"
    }
    support = {
      vercel = "https://vercel.com/help"
      railway = "https://railway.app/help"
      supabase = "https://supabase.com/help"
    }
  }
}

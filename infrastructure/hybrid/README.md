# TaskFlow - Hybrid Cloud Setup

Complete hybrid cloud deployment for TaskFlow using multiple free services. **Maximum cost efficiency** with **$0.00 monthly cost**.

## 🆓 Cost: $0.00 Monthly

This setup uses only free tier services:
- **Frontend**: Vercel (unlimited free projects)
- **Backend**: Railway ($5/month free credit)
- **Database**: Supabase (500MB PostgreSQL free)
- **Redis**: Railway (included in free credit)

## 📋 Prerequisites

### 1. Service Accounts
- **Vercel**: Sign up at [vercel.com](https://vercel.com)
- **Railway**: Sign up at [railway.app](https://railway.app)
- **Supabase**: Sign up at [supabase.com](https://supabase.com)

### 2. API Tokens
```bash
# Vercel token
export VERCEL_TOKEN="your-vercel-token"

# Railway token
export RAILWAY_TOKEN="your-railway-token"

# Supabase token
export SUPABASE_ACCESS_TOKEN="your-supabase-token"
```

### 3. Local Tools
```bash
# Install Terraform
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
sudo apt-get update && sudo apt-get install terraform

# Install Vercel CLI
npm install -g vercel

# Install Railway CLI
npm install -g @railway/cli
```

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone <your-repo-url>
cd TaskFlow/infrastructure/hybrid
```

### 2. Configure Variables
```bash
# Copy the example file
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
nano terraform.tfvars
```

**Required variables:**
```hcl
github_repo = "https://github.com/your-username/TaskFlow"
supabase_org_id = "your-supabase-org-id"
```

### 3. Set Up Authentication
```bash
# Set environment variables
export VERCEL_TOKEN="your-vercel-token"
export RAILWAY_TOKEN="your-railway-token"
export SUPABASE_ACCESS_TOKEN="your-supabase-token"
```

### 4. Deploy Infrastructure
```bash
# Initialize Terraform
terraform init

# Review the plan
terraform plan

# Apply the configuration
terraform apply
```

### 5. Access Your Application
```bash
# Get application URLs
terraform output

# Access frontend
curl https://<frontend-domain>

# Access backend
curl https://<backend-domain>/health
```

## 🏗️ Infrastructure Components

### Frontend (Vercel)
- **Framework**: Vite + React
- **Build**: Automated from GitHub
- **Domain**: Custom domain support
- **CDN**: Global edge network
- **Cost**: Free (unlimited projects)

### Backend (Railway)
- **Runtime**: Node.js
- **Build**: Automated from GitHub
- **Environment**: Production-ready
- **Scaling**: Automatic
- **Cost**: $5/month free credit

### Database (Supabase)
- **Type**: PostgreSQL
- **Size**: 500MB free
- **Features**: Auth, Storage, Realtime
- **API**: Auto-generated REST API
- **Cost**: Free (500MB)

### Redis (Railway)
- **Type**: Redis 7
- **Memory**: 512MB
- **Features**: Caching, Sessions
- **Cost**: Included in free credit

## 🔧 Configuration Details

### Vercel Configuration
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Framework**: Vite
- **Environment**: Production

### Railway Configuration
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Port**: 3000
- **Resources**: 1 vCPU, 1GB RAM

### Supabase Configuration
- **Database**: PostgreSQL 15
- **Auth**: Built-in authentication
- **Storage**: File storage
- **Realtime**: Real-time subscriptions

## 📊 Cost Breakdown

| Service | Free Tier | Usage | Cost |
|---------|-----------|-------|------|
| Vercel | 100GB bandwidth | < 100GB | $0.00 |
| Railway | $5 credit | < $5 | $0.00 |
| Supabase | 500MB database | < 500MB | $0.00 |
| **Total** | | | **$0.00** |

## 🚨 Important Notes

### Free Tier Limits
- **Vercel**: 100GB bandwidth, unlimited projects
- **Railway**: $5/month credit, 512MB RAM, 1 vCPU
- **Supabase**: 500MB database, 1GB storage, 2GB bandwidth

### Staying in Free Tier
- Monitor usage in service dashboards
- Set up billing alerts
- Optimize resource usage
- Use caching effectively

### Security Considerations
- Use strong passwords for services
- Enable 2FA on all accounts
- Monitor access logs
- Regular security updates

## 🔄 Next Steps

### 1. Deploy Application
```bash
# Push code to GitHub
git push origin main

# Services will auto-deploy
# Check deployment status in dashboards
```

### 2. Configure Domain
```bash
# Add custom domain in Vercel
# Update DNS records
# SSL certificates auto-generated
```

### 3. Set Up Monitoring
```bash
# Check service dashboards
# Set up alerts
# Monitor usage
```

## 🛠️ Troubleshooting

### Common Issues

**1. "Authentication failed"**
```bash
# Check API tokens
echo $VERCEL_TOKEN
echo $RAILWAY_TOKEN
echo $SUPABASE_ACCESS_TOKEN
```

**2. "Build failed"**
```bash
# Check build logs in service dashboards
# Verify package.json scripts
# Check environment variables
```

**3. "Service not accessible"**
```bash
# Check service status
# Verify domain configuration
# Check firewall rules
```

**4. "Database connection failed"**
```bash
# Check database credentials
# Verify network access
# Check Supabase dashboard
```

### Debug Commands
```bash
# Check Vercel deployment
vercel ls

# Check Railway services
railway status

# Check Supabase project
supabase status
```

## 🧹 Cleanup

### Destroy Infrastructure
```bash
# Destroy all resources
terraform destroy

# Confirm destruction
terraform destroy -auto-approve
```

### Manual Cleanup
```bash
# Delete Vercel project
vercel remove <project-name>

# Delete Railway services
railway delete <service-name>

# Delete Supabase project
# Use Supabase dashboard
```

## 📚 Additional Resources

### Documentation
- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app/)
- [Supabase Documentation](https://supabase.com/docs)

### Support
- [Vercel Support](https://vercel.com/help)
- [Railway Support](https://railway.app/help)
- [Supabase Support](https://supabase.com/help)

## 🎯 Learning Objectives

This hybrid setup teaches:

1. **Multi-Cloud Architecture** with different services
2. **Service Integration** between platforms
3. **Cost Optimization** within free tiers
4. **API Management** across services
5. **Database as a Service** with Supabase
6. **Serverless Deployment** with Vercel
7. **Container Orchestration** with Railway

## 📝 License

MIT License - See [LICENSE](../../../LICENSE) file for details.

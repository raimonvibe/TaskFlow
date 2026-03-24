# TaskFlow - Hybrid Kubernetes Deployment

This deployment strategy uses managed services for frontend and database, while running only the backend on Kubernetes.

## Architecture

```
┌─────────────────────────────────────────────────┐
│          Vercel (Frontend - Static)             │
│        https://taskflow.vercel.app              │
└────────────┬────────────────────────────────────┘
             │ API Calls
             ▼
┌─────────────────────────────────────────────────┐
│   Kubernetes Cluster (Backend Only)             │
│   ┌─────────────────────────────────┐           │
│   │  Backend Deployment (2-5 pods)  │           │
│   │         + LoadBalancer          │           │
│   │   https://api.yourdomain.com    │           │
│   └──────────┬──────────────────────┘           │
└──────────────┼──────────────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
┌──────▼──────┐  ┌─────▼────────┐
│  Supabase   │  │   Upstash    │
│ PostgreSQL  │  │    Redis     │
│  (Managed)  │  │  (Managed)   │
└─────────────┘  └──────────────┘
```

## Why Hybrid?

### Advantages
- **Cost-effective**: Use free tiers of managed services
- **Simplified management**: No database/frontend maintenance
- **Automatic scaling**: Vercel scales frontend automatically
- **Global CDN**: Vercel provides worldwide edge distribution
- **Managed backups**: Database backups handled by provider
- **Easy SSL**: Automatic HTTPS on all services

### Free Tier Services

1. **Frontend**: Vercel
   - Unlimited bandwidth
   - Automatic deployments from Git
   - Global CDN
   - Free SSL

2. **Database**: Choose one
   - Supabase (500MB PostgreSQL)
   - Railway ($5 credit/month)
   - PlanetScale (5GB MySQL)
   - Neon (3GB PostgreSQL)

3. **Cache** (Optional): Choose one
   - Upstash (10K requests/day)
   - Railway Redis
   - Render Redis

4. **Backend**: Your Kubernetes cluster
   - Oracle Cloud Free Tier
   - DigitalOcean ($5/month)
   - Local cluster (development)

## Prerequisites

- Kubernetes cluster (Minikube, K3s, GKE, EKS, etc.)
- kubectl configured
- Domain name for backend API
- Accounts on:
  - Vercel (for frontend)
  - Supabase/Railway/PlanetScale (for database)
  - Optional: Upstash (for Redis)

## Setup Instructions

### Step 1: Setup Managed Database

#### Option A: Supabase (Recommended for beginners)

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Run database migrations:
   ```sql
   -- Copy contents from app/database/schema.sql
   -- Execute in Supabase SQL Editor
   ```
4. Get connection details from Settings > Database

#### Option B: Railway

1. Go to [railway.app](https://railway.app)
2. Create new PostgreSQL database
3. Get connection URL from Variables tab

#### Option C: PlanetScale (MySQL)

1. Go to [planetscale.com](https://planetscale.com)
2. Create new database
3. Adapt schema for MySQL syntax
4. Get connection details

### Step 2: Setup Redis (Optional)

#### Upstash

1. Go to [upstash.com](https://upstash.com)
2. Create Redis database
3. Copy connection URL

### Step 3: Deploy Backend to Kubernetes

```bash
# Create namespace
kubectl apply -f namespace.yaml

# Create secrets (edit secrets.yaml.template first!)
cp secrets.yaml.template secrets.yaml
# Edit secrets.yaml with your actual credentials
kubectl apply -f secrets.yaml

# Deploy backend
kubectl apply -f backend-deployment.yaml
kubectl apply -f backend-service.yaml
kubectl apply -f hpa.yaml

# Wait for backend to be ready
kubectl wait --for=condition=ready pod -l app=backend -n taskflow-backend --timeout=300s

# Get LoadBalancer IP/hostname
kubectl get svc backend-service -n taskflow-backend
```

### Step 4: Setup Domain and SSL

#### Option A: Using Ingress + cert-manager

```bash
# Install cert-manager (if not already installed)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF

# Update ingress.yaml with your domain
# Edit ingress.yaml
kubectl apply -f ingress.yaml
```

#### Option B: Using LoadBalancer directly

1. Point your domain's A record to LoadBalancer IP
2. Use Cloudflare for free SSL

### Step 5: Deploy Frontend to Vercel

```bash
# In your local TaskFlow directory
cd app/frontend

# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod

# Set environment variable for API URL
vercel env add VITE_API_URL production
# Enter: https://api.yourdomain.com

# Redeploy to apply env var
vercel --prod
```

#### Or use Git integration:

1. Push code to GitHub
2. Import project on Vercel dashboard
3. Set environment variable:
   - `VITE_API_URL` = `https://api.yourdomain.com`
4. Deploy

### Step 6: Update Backend CORS

```bash
# Update backend deployment with Vercel URL
kubectl set env deployment/backend -n taskflow-backend \
  CORS_ORIGIN=https://your-project.vercel.app

# Or edit backend-deployment.yaml and reapply
```

## Verification

```bash
# Check backend health
curl https://api.yourdomain.com/health

# Check pods
kubectl get pods -n taskflow-backend

# Check HPA
kubectl get hpa -n taskflow-backend

# View logs
kubectl logs -l app=backend -n taskflow-backend --tail=50

# Access frontend
# Visit https://your-project.vercel.app
```

## Monitoring

```bash
# Resource usage
kubectl top pods -n taskflow-backend

# Logs
kubectl logs -f -l app=backend -n taskflow-backend

# Events
kubectl get events -n taskflow-backend --sort-by='.lastTimestamp'

# HPA status
kubectl describe hpa backend-hpa -n taskflow-backend
```

## Cost Breakdown (Monthly)

### Free Option
- Frontend (Vercel): $0
- Database (Supabase 500MB): $0
- Redis (Upstash 10K req/day): $0
- Backend (Oracle Cloud): $0
- **Total: $0/month** ✨

### Low-Cost Option
- Frontend (Vercel): $0
- Database (Railway): $5
- Redis (Railway): Included
- Backend (DigitalOcean): $5
- **Total: $10/month**

### Scalable Option
- Frontend (Vercel Pro): $20
- Database (Railway Pro): $20
- Redis (Upstash): $10
- Backend (K8s cluster): $20-50
- **Total: $70-100/month**

## Scaling

### Backend Scaling

```bash
# Manual scale
kubectl scale deployment backend -n taskflow-backend --replicas=3

# HPA automatically scales between 2-5 replicas based on:
# - CPU usage > 70%
# - Memory usage > 80%
```

### Frontend Scaling

Vercel automatically handles scaling globally.

### Database Scaling

- Supabase: Upgrade to Pro ($25/month) for 8GB
- Railway: Pay-as-you-go after free credit
- PlanetScale: Scaler plan ($39/month) for 10GB

## Troubleshooting

### Backend can't connect to database

```bash
# Test connection from pod
BACKEND_POD=$(kubectl get pod -l app=backend -n taskflow-backend -o jsonpath='{.items[0].metadata.name}')
kubectl exec -it $BACKEND_POD -n taskflow-backend -- sh

# Inside pod
nc -zv your-db-host.supabase.co 5432
```

### CORS errors in frontend

1. Check backend CORS_ORIGIN environment variable
2. Verify Vercel domain is correct
3. Check ingress annotations for CORS

### SSL certificate issues

```bash
# Check certificate status
kubectl get certificate -n taskflow-backend

# Describe certificate for details
kubectl describe certificate backend-tls -n taskflow-backend

# Check cert-manager logs
kubectl logs -n cert-manager -l app=cert-manager
```

## Updating

### Backend

```bash
# Update image
kubectl set image deployment/backend backend=your-registry/taskflow-backend:v2.0.0 -n taskflow-backend

# Check rollout
kubectl rollout status deployment/backend -n taskflow-backend
```

### Frontend

```bash
# Using CLI
cd app/frontend
vercel --prod

# Or using Git integration
git push origin main  # Vercel auto-deploys
```

## Backup Strategy

### Database Backups

- Supabase: Automatic daily backups (point-in-time recovery on Pro)
- Railway: Automatic backups
- PlanetScale: Automatic with 30-day retention

### Manual Backup

```bash
# From your database provider, export to SQL
# Store in S3, GitHub, or local
```

## Migration to Full Self-Hosted

When you outgrow free tiers, migrate to:
1. Use oracle-k3s or local-minikube manifests
2. Self-host PostgreSQL in Kubernetes
3. Host frontend on same cluster or keep on Vercel

## Advantages vs Full K8s

| Aspect | Hybrid | Full K8s |
|--------|--------|----------|
| Cost (small scale) | $0-10/month | $20-50/month |
| Setup complexity | Low | Medium |
| Maintenance | Low | High |
| Database backups | Automatic | Manual setup |
| Frontend CDN | Free (Vercel) | Requires setup |
| SSL certificates | Automatic | cert-manager setup |
| Scaling frontend | Automatic | Manual config |

## When to Use Full K8s Instead

- Need complete control over infrastructure
- Have compliance requirements
- Want to avoid vendor lock-in
- Already have K8s expertise
- Need custom database configurations
- Want to minimize external dependencies

## Support

- Vercel Docs: [vercel.com/docs](https://vercel.com/docs)
- Supabase Docs: [supabase.com/docs](https://supabase.com/docs)
- Railway Docs: [docs.railway.app](https://docs.railway.app)
- Kubernetes Docs: [kubernetes.io/docs](https://kubernetes.io/docs)

# TaskFlow - Quick Start Guide

Get TaskFlow up and running in minutes!

## 🚀 Fastest Way to Start

### Option 1: Docker Compose (Recommended for Beginners)

**Prerequisites**: Docker and Docker Compose installed

```bash
# Clone the repository
git clone <your-repo-url>
cd TaskFlow

# Start everything
docker-compose up -d

# Wait ~30 seconds for services to be ready
docker-compose logs -f backend | grep "Server started"

# Seed demo data (optional)
docker-compose exec backend npm run seed
```
## Common troubleshooting`

```bash
docker-compose down

docker network rm taskflow_taskflow-network || true

docker network prune -f

docker-compose up -d
```

**Access the application**:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Grafana: http://localhost:3001 (admin/admin)
- Prometheus: http://localhost:9090
- Adminer (DB UI): http://localhost:8080

**Demo Credentials** (after seeding):
- Email: demo@taskflow.com
- Password: demo123

**Stop everything**:
```bash
docker-compose down
```

**Complete cleanup** (removes data):
```bash
docker-compose down -v
```

---

## 📋 What's Included

When you run `docker-compose up`, you get:

✅ **React Frontend** - Modern task management UI
✅ **Node.js Backend** - RESTful API with authentication
✅ **PostgreSQL Database** - Persistent data storage
✅ **Redis Cache** - Session management
✅ **Prometheus** - Metrics collection
✅ **Grafana** - Visualization dashboards
✅ **Adminer** - Database management UI

---

## 🎯 Next Steps

### 1. Explore the Application

**Create an Account**:
1. Go to http://localhost:5173
2. Click "Sign up"
3. Create your account
4. Start creating tasks!

**Or Use Demo Data**:
```bash
docker-compose exec backend npm run seed
# Login with: demo@taskflow.com / demo123
```

### 2. View Monitoring Dashboards

**Grafana** (http://localhost:3001):
1. Login with admin/admin
2. Go to Dashboards
3. Explore:
   - Application Metrics
   - Infrastructure Metrics
   - Business Metrics

**Prometheus** (http://localhost:9090):
1. Click "Graph"
2. Try queries:
   ```promql
   # Request rate
   rate(http_requests_total[5m])

   # Active connections
   active_connections

   # Tasks by status
   tasks_by_status
   ```

### 3. Check API Health

```bash
# Health check
curl http://localhost:3000/health

# Metrics endpoint
curl http://localhost:3000/metrics

# Create a task (with auth token)
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "My first task", "priority": "high"}'
```

### 4. View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres

# Last 100 lines
docker-compose logs --tail=100 backend
```

### 5. Database Management

**Option A: Using Adminer** (http://localhost:8080):
- System: PostgreSQL
- Server: postgres
- Username: taskflow_user
- Password: taskflow_password
- Database: taskflow

**Option B: Using psql**:
```bash
docker-compose exec postgres psql -U taskflow_user -d taskflow

# Run SQL
SELECT * FROM tasks;
SELECT * FROM users;
```

---

## 🛠️ Common Tasks

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Rebuild After Code Changes

```bash
# Rebuild and restart
docker-compose up --build -d

# Rebuild specific service
docker-compose up --build -d backend
```

### View Resource Usage

```bash
# Container stats
docker-compose stats

# Disk usage
docker-compose exec backend df -h
```

### Clean Database and Start Fresh

```bash
# Stop and remove volumes
docker-compose down -v

# Start fresh
docker-compose up -d

# Seed again
docker-compose exec backend npm run seed
```

---

## 🐛 Troubleshooting

### Services Won't Start

```bash
# Check what's running
docker-compose ps

# Check logs for errors
docker-compose logs

# Check specific service
docker-compose logs backend
```

### Port Already in Use

```bash
# Find what's using the port
lsof -i :5173  # Frontend
lsof -i :3000  # Backend
lsof -i :5432  # PostgreSQL

# Kill the process or change ports in docker-compose.yml
```

### Database Connection Errors

```bash
# Check if postgres is running
docker-compose ps postgres

# Check postgres logs
docker-compose logs postgres

# Restart postgres
docker-compose restart postgres
```

### Frontend Can't Connect to Backend

```bash
# Check backend is running
curl http://localhost:3000/health

# Check CORS settings in backend .env
# Should include: CORS_ORIGIN=http://localhost:5173

# Restart backend
docker-compose restart backend
```

### Out of Disk Space

```bash
# Remove unused Docker data
docker system prune -a

# Check disk usage
docker system df
```

---

## 📚 Learn More

### Development

- [Frontend README](../app/frontend/README.md) - React app details
- [Backend README](../app/backend/README.md) - API documentation
- [Database README](../app/database/README.md) - Schema and migrations

### DevOps

- [Docker Guide](TOOL-GUIDES/docker-guide.md) - Docker best practices
- [Kubernetes Guide](TOOL-GUIDES/kubernetes-guide.md) - K8s deployment
- [Monitoring Guide](../monitoring/prometheus/README.md) - Prometheus & Grafana

### Deployment

- [Minikube Deployment](../kubernetes/local-minikube/README.md) - Local K8s
- [Free Deployment Options](FREE-DEPLOYMENT-OPTIONS.md) - Cloud options

---

## 🎓 Learning Path

New to DevOps? Follow this path:

1. **Week 1-2**: Run locally with Docker Compose
2. **Week 3**: Deploy to Minikube
3. **Week 4-5**: Set up CI/CD with GitHub Actions
4. **Week 6**: Deploy to Oracle Cloud (free tier)
5. **Week 7+**: Advanced topics (monitoring, scaling, automation)

See [LEARNING-PATH.md](LEARNING-PATH.md) for detailed guidance.

---

## 💡 Tips

1. **Start Simple** - Use Docker Compose first
2. **Read the Logs** - They tell you what's wrong
3. **Use Health Checks** - `/health` endpoints are your friend
4. **Monitor Everything** - Check Grafana regularly
5. **Make Changes Gradually** - One thing at a time
6. **Ask Questions** - Create an issue if stuck

---

## 🆘 Getting Help

- **Documentation**: Check the `/docs` directory
- **Issues**: Create a GitHub issue
- **Logs**: Always include logs when asking for help
- **System Info**: Mention your OS and Docker version

---

## ✅ Success Checklist

After running `docker-compose up -d`, verify:

- [ ] Frontend loads at http://localhost:5173
- [ ] Backend health check returns "healthy"
- [ ] Can create an account and login
- [ ] Can create and view tasks
- [ ] Grafana shows metrics
- [ ] Prometheus shows targets as "UP"
- [ ] Adminer connects to database

If all checked, you're ready to go! 🎉

---

**Next**: Try [deploying to Kubernetes](../kubernetes/local-minikube/README.md) or explore the [full documentation](README.md).

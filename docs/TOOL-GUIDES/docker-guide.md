# Docker Guide for TaskFlow

Complete guide to using Docker with the TaskFlow project.

## Installation

```bash
# Install Docker (Ubuntu/Debian)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker run hello-world
```

## Essential Commands

### Images

```bash
# List images
docker images

# Build image
docker build -t taskflow-backend:latest app/backend
docker build -t taskflow-frontend:latest app/frontend

# Pull image
docker pull postgres:15-alpine

# Remove image
docker rmi taskflow-backend:latest

# Remove all unused images
docker image prune -a
```

### Containers

```bash
# List running containers
docker ps

# List all containers
docker ps -a

# Start container
docker start backend

# Stop container
docker stop backend

# Restart container
docker restart backend

# Remove container
docker rm backend

# View logs
docker logs backend
docker logs -f backend  # Follow logs

# Execute command in container
docker exec -it backend sh
docker exec backend npm run migrate
```

### Docker Compose

```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs
docker-compose logs -f backend

# Rebuild and start
docker-compose up --build

# Scale services
docker-compose up --scale backend=3

# Execute command
docker-compose exec backend npm run seed
```

## TaskFlow-Specific Usage

### Development Workflow

```bash
# 1. Start all services
docker-compose up -d

# 2. Check status
docker-compose ps

# 3. View logs
docker-compose logs -f

# 4. Access database
docker-compose exec postgres psql -U taskflow_user -d taskflow

# 5. Run backend commands
docker-compose exec backend npm run seed
docker-compose exec backend npm test

# 6. Stop everything
docker-compose down
```

### Building Images

```bash
# Backend
cd app/backend
docker build -t your-registry/taskflow-backend:v1.0.0 .

# Frontend
cd app/frontend
docker build -t your-registry/taskflow-frontend:v1.0.0 .

# Push to registry
docker push your-registry/taskflow-backend:v1.0.0
docker push your-registry/taskflow-frontend:v1.0.0
```

### Debugging

```bash
# Enter container shell
docker-compose exec backend sh

# Check container resource usage
docker stats

# Inspect container
docker inspect backend

# View container processes
docker top backend

# Copy files from container
docker cp backend:/app/logs ./logs
```

## Best Practices

1. **Use .dockerignore**: Exclude unnecessary files
2. **Multi-stage builds**: Reduce image size
3. **Layer caching**: Order commands for optimal caching
4. **Health checks**: Always include health checks
5. **Resource limits**: Set memory and CPU limits
6. **Security**: Run as non-root user
7. **Logging**: Use structured logging
8. **Secrets**: Use Docker secrets or environment variables

## Troubleshooting

### Container won't start
```bash
docker logs backend
docker-compose logs backend
```

### Port already in use
```bash
# Find process using port
sudo lsof -i :3000
# Kill process
sudo kill -9 <PID>
```

### Permission denied
```bash
# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### Disk space issues
```bash
# Clean up
docker system prune -a --volumes
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Best Practices](https://docs.docker.com/develop/dev-best-practices/)

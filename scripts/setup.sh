#!/bin/bash

# TaskFlow Setup Script
# Automated setup for local development

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

check_command() {
    if command -v $1 &> /dev/null; then
        print_success "$1 is installed"
        return 0
    else
        print_error "$1 is not installed"
        return 1
    fi
}

# Main script
print_header "TaskFlow Setup Script"

echo ""
print_info "This script will check prerequisites and set up TaskFlow for local development"
echo ""

# Check prerequisites
print_header "Checking Prerequisites"

PREREQUISITES_MET=true

# Check Docker
if check_command docker; then
    DOCKER_VERSION=$(docker --version)
    print_info "$DOCKER_VERSION"
else
    print_warning "Please install Docker: https://docs.docker.com/get-docker/"
    PREREQUISITES_MET=false
fi

# Check Docker Compose
if check_command docker-compose; then
    COMPOSE_VERSION=$(docker-compose --version)
    print_info "$COMPOSE_VERSION"
else
    print_warning "Please install Docker Compose: https://docs.docker.com/compose/install/"
    PREREQUISITES_MET=false
fi

# Check Node.js (optional, for local development)
if check_command node; then
    NODE_VERSION=$(node --version)
    print_info "$NODE_VERSION"
else
    print_warning "Node.js not found (optional for local development)"
fi

# Check npm (optional)
if check_command npm; then
    NPM_VERSION=$(npm --version)
    print_info "npm v$NPM_VERSION"
fi

# Check Git
if check_command git; then
    GIT_VERSION=$(git --version)
    print_info "$GIT_VERSION"
else
    print_warning "Git is recommended for version control"
fi

echo ""

if [ "$PREREQUISITES_MET" = false ]; then
    print_error "Some prerequisites are missing. Please install them and run this script again."
    exit 1
fi

print_success "All required prerequisites are installed!"

# Create .env files if they don't exist
print_header "Setting Up Environment Files"

if [ ! -f ".env" ]; then
    print_info "Creating .env file from .env.example..."
    cp .env.example .env
    print_success "Created .env file"
    print_warning "Please edit .env and update with your values"
else
    print_info ".env file already exists"
fi

if [ ! -f "app/frontend/.env" ]; then
    print_info "Creating frontend .env file..."
    cp app/frontend/.env.example app/frontend/.env
    print_success "Created app/frontend/.env file"
else
    print_info "Frontend .env file already exists"
fi

if [ ! -f "app/backend/.env" ]; then
    print_info "Creating backend .env file..."
    cp app/backend/.env.example app/backend/.env
    print_success "Created app/backend/.env file"
else
    print_info "Backend .env file already exists"
fi

# Pull Docker images
print_header "Pulling Docker Images"

print_info "Pulling required Docker images (this may take a few minutes)..."

docker-compose pull

print_success "Docker images pulled successfully"

# Build application images
print_header "Building Application"

print_info "Building Docker images..."

docker-compose build

print_success "Docker images built successfully"

# Start services
print_header "Starting Services"

print_info "Starting all services with Docker Compose..."

docker-compose up -d

print_success "Services started successfully"

# Wait for services to be ready
print_header "Waiting for Services to be Ready"

print_info "Waiting for backend to be healthy..."

MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f http://localhost:3000/health &> /dev/null; then
        print_success "Backend is healthy!"
        break
    fi

    RETRY_COUNT=$((RETRY_COUNT+1))
    echo -n "."
    sleep 2
done

echo ""

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    print_error "Backend failed to start within expected time"
    print_info "Check logs with: docker-compose logs backend"
    exit 1
fi

# Optional: Seed database
print_header "Database Setup"

read -p "Do you want to seed the database with demo data? (y/n) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Seeding database..."
    docker-compose exec -T backend npm run seed
    print_success "Database seeded successfully"
    echo ""
    print_info "Demo credentials:"
    echo "  Email: demo@taskflow.com"
    echo "  Password: demo123"
fi

# Display access information
print_header "Setup Complete!"

echo ""
print_success "TaskFlow is now running!"
echo ""
print_info "Access the application:"
echo "  Frontend:    http://localhost:5173"
echo "  Backend API: http://localhost:3000"
echo "  Grafana:     http://localhost:3001 (admin/admin)"
echo "  Prometheus:  http://localhost:9090"
echo "  Adminer:     http://localhost:8080"
echo ""

print_info "Useful commands:"
echo "  View logs:        docker-compose logs -f"
echo "  Stop services:    docker-compose stop"
echo "  Restart services: docker-compose restart"
echo "  Clean up:         docker-compose down -v"
echo ""

print_info "Next steps:"
echo "  1. Open http://localhost:5173 in your browser"
echo "  2. Create an account or use demo credentials"
echo "  3. Explore the application"
echo "  4. Check monitoring dashboards in Grafana"
echo ""

print_success "Happy learning! 🚀"

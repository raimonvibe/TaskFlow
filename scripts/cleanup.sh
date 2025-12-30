#!/bin/bash

# TaskFlow Cleanup Script
# Remove all Docker containers, volumes, and optionally images

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_header "TaskFlow Cleanup Script"

echo ""
print_warning "This script will clean up TaskFlow Docker resources"
echo ""

# Show what will be removed
echo "The following will be removed:"
echo "  - All TaskFlow containers"
echo "  - All TaskFlow volumes (INCLUDING DATABASE DATA)"
echo "  - All TaskFlow networks"
echo ""

read -p "Are you sure you want to continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cleanup cancelled"
    exit 0
fi

# Stop and remove containers
print_header "Stopping Services"

docker-compose down

print_success "Services stopped"

# Remove volumes
print_header "Removing Volumes"

echo ""
print_warning "This will DELETE ALL DATA including the database!"
read -p "Remove volumes? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose down -v
    print_success "Volumes removed"
else
    print_warning "Volumes kept (data preserved)"
fi

# Optional: Remove images
print_header "Docker Images"

echo ""
read -p "Remove TaskFlow Docker images? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Remove custom images
    docker rmi taskflow-frontend:latest 2>/dev/null || true
    docker rmi taskflow-backend:latest 2>/dev/null || true

    # Remove pulled images
    docker-compose down --rmi all

    print_success "Images removed"
else
    print_warning "Images kept"
fi

# Optional: Docker system prune
print_header "Docker System Cleanup"

echo ""
read -p "Run docker system prune (remove unused data)? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker system prune -f
    print_success "Docker system cleaned"
fi

print_header "Cleanup Complete"

echo ""
print_success "TaskFlow has been cleaned up"
echo ""
print_warning "To start fresh, run: ./scripts/setup.sh"
echo ""

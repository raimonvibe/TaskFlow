#!/bin/bash

# TaskFlow URLs Script
# Prints every local interface for the running docker-compose stack, plus
# live status - a one-stop "where do I look" instead of remembering ports.
# Safe to re-run any time (not just right after setup.sh), and reflects
# whatever ports you've actually configured in .env, not just the defaults.

set -e

# Self-locate the repo root, same as setup.sh - these paths (.env,
# docker-compose.yml) only make sense relative to there.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$REPO_ROOT"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Same override vars docker-compose.yml itself reads from .env - mirrored
# here so this always matches what's actually running, not the defaults.
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

FRONTEND_PORT="${FRONTEND_PORT:-5173}"
BACKEND_PORT="${BACKEND_PORT:-3000}"
GRAFANA_PORT="${GRAFANA_PORT:-3001}"
PROMETHEUS_PORT="${PROMETHEUS_PORT:-9090}"
ADMINER_PORT="${ADMINER_PORT:-8080}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
REDIS_PORT="${REDIS_PORT:-6379}"

echo -e "${BLUE}TaskFlow local interfaces${NC}"
echo ""
printf "  %-13s %s\n" "Frontend"    "http://localhost:${FRONTEND_PORT}"
printf "  %-13s %s\n" "Backend API" "http://localhost:${BACKEND_PORT}"
printf "  %-13s %s\n" "Grafana"     "http://localhost:${GRAFANA_PORT}  (admin/admin)"
printf "  %-13s %s\n" "Prometheus"  "http://localhost:${PROMETHEUS_PORT}"
printf "  %-13s %s\n" "Adminer"     "http://localhost:${ADMINER_PORT}  (DB UI)"
printf "  %-13s %s\n" "Postgres"    "localhost:${POSTGRES_PORT}  (not a web page - use Adminer or psql)"
printf "  %-13s %s\n" "Redis"       "localhost:${REDIS_PORT}  (not a web page - use redis-cli)"
echo ""
echo -e "${GREEN}Live status:${NC}"
docker-compose ps

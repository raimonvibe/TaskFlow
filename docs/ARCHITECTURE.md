# TaskFlow Architecture

Comprehensive architecture documentation for the TaskFlow DevOps learning project.

## 🏗️ System Overview

TaskFlow is a full-stack task management application designed to demonstrate modern DevOps practices using free and open-source tools.

```
┌─────────────────────────────────────────────────────────────┐
│                         User Browser                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
│  - React 18 + Vite                                          │
│  - Tailwind CSS                                             │
│  - JWT Authentication                                        │
│  - Recharts for visualizations                             │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (Node.js/Express)                  │
│  - RESTful API                                              │
│  - JWT Authentication                                        │
│  - Request validation                                        │
│  - Prometheus metrics                                        │
│  - Health checks                                            │
└────────────┬───────────────────────┬────────────────────────┘
             │                       │
             ▼                       ▼
┌────────────────────┐    ┌──────────────────────┐
│  PostgreSQL        │    │   Redis (Optional)    │
│  - User data       │    │   - Session cache     │
│  - Task data       │    │   - Rate limiting     │
│  - Migrations      │    └──────────────────────┘
└────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Monitoring & Observability                │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐    │
│  │ Prometheus  │  │   Grafana    │  │  Winston Logs  │    │
│  │  (Metrics)  │  │ (Dashboards) │  │  (File/Console)│    │
│  └─────────────┘  └──────────────┘  └────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## 📦 Component Architecture

### Frontend Layer

**Technology Stack**:
- React 18 (UI framework)
- Vite (Build tool)
- Tailwind CSS (Styling)
- React Router (Routing)
- Axios (HTTP client)
- Recharts (Data visualization)

**Key Features**:
- Single Page Application (SPA)
- JWT-based authentication
- Responsive design
- Real-time data updates
- Client-side routing
- Optimized bundle splitting

**Directory Structure**:
```
frontend/src/
├── api/              # API client layers
│   ├── axios.js      # Configured axios instance
│   ├── auth.js       # Auth API calls
│   └── tasks.js      # Task API calls
├── components/       # Reusable components
│   ├── Layout.jsx
│   ├── TaskCard.jsx
│   └── ...
├── contexts/         # React contexts
│   └── AuthContext.jsx
├── pages/            # Page components
│   ├── Login.jsx
│   ├── Dashboard.jsx
│   └── Tasks.jsx
├── config.js         # App configuration
└── App.jsx           # Root component
```

**Data Flow**:
1. User interacts with UI
2. Component calls API client
3. Axios interceptor adds JWT token
4. Request sent to backend
5. Response updates component state
6. UI re-renders with new data

### Backend Layer

**Technology Stack**:
- Node.js 22+
- Express.js (Web framework)
- PostgreSQL (Database)
- JWT (Authentication)
- Winston (Logging)
- prom-client (Metrics)

**Architecture Pattern**: Layered Architecture

```
Controllers (Route handlers)
     ↓
Models (Data access)
     ↓
Database (PostgreSQL)
```

**Directory Structure**:
```
backend/src/
├── config/           # Configuration
│   ├── index.js      # App config
│   └── database.js   # DB connection
├── controllers/      # Business logic
│   ├── authController.js
│   └── taskController.js
├── middleware/       # Express middleware
│   ├── auth.js
│   ├── errorHandler.js
│   └── requestLogger.js
├── models/           # Data models
│   ├── User.js
│   └── Task.js
├── routes/           # API routes
│   ├── authRoutes.js
│   └── taskRoutes.js
├── utils/            # Utilities
│   ├── logger.js
│   └── metrics.js
├── app.js            # Express app
└── server.js         # Server entry
```

**Request Lifecycle**:
1. HTTP request arrives
2. Request logger middleware
3. Security middleware (helmet, CORS)
4. Rate limiter
5. Body parser
6. Route handler
7. Authentication middleware (if protected)
8. Validation middleware
9. Controller logic
10. Model data access
11. Response sent
12. Metrics recorded

### Database Layer

**Technology**: PostgreSQL 15

**Schema Design**:

```sql
┌─────────────────┐
│     users       │
├─────────────────┤
│ id (PK)         │
│ name            │
│ email (unique)  │
│ password (hash) │
│ created_at      │
│ updated_at      │
└────────┬────────┘
         │ 1
         │
         │ N
┌────────┴────────┐
│     tasks       │
├─────────────────┤
│ id (PK)         │
│ user_id (FK)    │
│ title           │
│ description     │
│ status          │
│ priority        │
│ due_date        │
│ created_at      │
│ updated_at      │
└─────────────────┘
```

**Indexes**:
- `idx_users_email` - Fast login lookups
- `idx_tasks_user_id` - User's tasks
- `idx_tasks_status` - Filter by status
- `idx_tasks_priority` - Filter by priority
- `idx_tasks_due_date` - Sort by due date

**Connection Pooling**:
- Max connections: 20
- Idle timeout: 30s
- Connection timeout: 2s

## 🔐 Security Architecture

### Authentication Flow

```
1. User registers/logs in
   ↓
2. Backend validates credentials
   ↓
3. Backend generates JWT token
   ↓
4. Frontend stores token (localStorage)
   ↓
5. Frontend includes token in headers
   ↓
6. Backend verifies token on each request
   ↓
7. Backend allows/denies access
```

**JWT Payload**:
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Security Measures

**Frontend**:
- XSS protection (React escapes by default)
- CSRF tokens (for non-JWT requests)
- Secure token storage
- HTTPS only in production

**Backend**:
- Helmet (security headers)
- CORS (restricted origins)
- Rate limiting (100 req/15min)
- Input validation (express-validator)
- SQL injection prevention (parameterized queries)
- Password hashing (bcrypt, cost factor 10)
- JWT signature verification

**Database**:
- Encrypted connections (SSL/TLS)
- Least privilege access
- No direct external access
- Regular backups

## 📊 Data Flow

### Creating a Task

```
┌──────┐   1. POST /api/tasks      ┌─────────┐
│ User │ ───────────────────────> │ Frontend│
└──────┘                           └────┬────┘
                                        │ 2. Validate input
                                        │    Add JWT token
                                        ▼
┌──────────┐   3. HTTP POST        ┌────────┐
│ Backend  │ <─────────────────────│ Axios  │
└────┬─────┘                       └────────┘
     │ 4. Verify JWT
     │ 5. Validate input
     │ 6. Check permissions
     ▼
┌─────────┐   7. INSERT query      ┌──────────┐
│ Model   │ ───────────────────> │PostgreSQL │
└────┬────┘                       └──────────┘
     │ 8. Return new task
     ▼
┌──────────┐   9. JSON response    ┌──────────┐
│Controller│ ───────────────────> │ Frontend │
└──────────┘                       └────┬─────┘
                                        │ 10. Update UI
                                        ▼
                                   ┌─────────┐
                                   │  User   │
                                   └─────────┘
```

## 🚀 Deployment Architectures

### Local Development (Docker Compose)

```
┌─────────────────────────────────────────────┐
│            Docker Host                       │
│  ┌────────────┐  ┌────────────┐            │
│  │  Frontend  │  │  Backend   │            │
│  │   :5173    │  │   :3000    │            │
│  └─────┬──────┘  └──────┬─────┘            │
│        │                │                   │
│  ┌─────┴────────────────┴─────┐            │
│  │      taskflow-network       │            │
│  └─────┬────────────┬──────────┘            │
│        │            │                       │
│  ┌─────┴──────┐  ┌──┴─────────┐            │
│  │ PostgreSQL │  │   Redis    │            │
│  │   :5432    │  │   :6379    │            │
│  └────────────┘  └────────────┘            │
│                                             │
│  ┌────────────┐  ┌────────────┐            │
│  │ Prometheus │  │  Grafana   │            │
│  │   :9090    │  │   :3001    │            │
│  └────────────┘  └────────────┘            │
└─────────────────────────────────────────────┘
```

### Kubernetes (Minikube)

```
┌─────────────────── Namespace: taskflow ────────────────────┐
│                                                             │
│  ┌─────────────────── Ingress ─────────────────────┐      │
│  │  taskflow.local → Frontend (/) & Backend (/api) │      │
│  └──────────────────────┬───────────────────────────┘      │
│                         │                                   │
│         ┌───────────────┴────────────────┐                 │
│         │                                │                 │
│  ┌──────▼─────────┐            ┌────────▼────────┐        │
│  │  Frontend Svc  │            │  Backend Svc    │        │
│  │  LoadBalancer  │            │   ClusterIP     │        │
│  └──────┬─────────┘            └────────┬────────┘        │
│         │                               │                 │
│  ┌──────▼─────────┐            ┌────────▼────────┐        │
│  │Frontend Deploy │            │ Backend Deploy  │        │
│  │  (2 replicas)  │            │  (2 replicas)   │        │
│  └────────────────┘            └────────┬────────┘        │
│                                         │                 │
│                                 ┌───────▼────────┐        │
│                                 │  Backend HPA   │        │
│                                 │  (CPU-based)   │        │
│                                 └────────────────┘        │
│                                                             │
│  ┌────────────────┐            ┌────────────────┐        │
│  │ Postgres Svc   │            │  ConfigMap &   │        │
│  │   ClusterIP    │            │    Secrets     │        │
│  └──────┬─────────┘            └────────────────┘        │
│         │                                                 │
│  ┌──────▼─────────┐                                       │
│  │Postgres Deploy │                                       │
│  │  (1 replica)   │                                       │
│  └──────┬─────────┘                                       │
│         │                                                 │
│  ┌──────▼─────────┐                                       │
│  │  Postgres PVC  │                                       │
│  │     (5Gi)      │                                       │
│  └────────────────┘                                       │
└─────────────────────────────────────────────────────────┘
```

### Production (Oracle Cloud)

```
┌──────────────── Oracle Cloud VCN ─────────────────┐
│                                                    │
│  ┌─────────────── Load Balancer ──────────────┐  │
│  │         (Free Tier)                         │  │
│  └────────────────────┬────────────────────────┘  │
│                       │                            │
│         ┌─────────────┴──────────────┐            │
│         │                            │            │
│  ┌──────▼──────┐             ┌──────▼──────┐     │
│  │   Worker 1  │             │   Worker 2  │     │
│  │  (ARM VM)   │             │  (ARM VM)   │     │
│  │             │             │             │     │
│  │  - Frontend │             │  - Frontend │     │
│  │  - Backend  │             │  - Backend  │     │
│  └─────────────┘             └─────────────┘     │
│         │                            │            │
│         └─────────────┬──────────────┘            │
│                       │                            │
│                ┌──────▼──────┐                    │
│                │   Master    │                    │
│                │  (ARM VM)   │                    │
│                │             │                    │
│                │  - K3s      │                    │
│                │  - Postgres │                    │
│                │  - Prometheus                    │
│                │  - Grafana  │                    │
│                └─────────────┘                    │
│                                                    │
│  ┌─────────────────────────────────────────────┐ │
│  │       Block Storage (200GB - Free)          │ │
│  └─────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘
```

## 📈 Scaling Strategy

### Horizontal Scaling

**Frontend**:
- Stateless - can add unlimited replicas
- Load balanced via Kubernetes Service
- Auto-scaling based on CPU

**Backend**:
- Stateless (with external session store)
- HPA configuration: 2-5 replicas
- Scale triggers:
  - CPU > 70%
  - Memory > 80%

**Database**:
- Vertical scaling (upgrade instance)
- Read replicas for read-heavy workloads
- Connection pooling prevents exhaustion

### Caching Strategy

**Redis** (optional):
- Session cache
- Rate limit counters
- Frequently accessed data
- TTL-based expiration

**Application-level**:
- In-memory caching for static data
- ETags for HTTP caching
- CDN for static assets

## 🔍 Monitoring Architecture

### Metrics Collection

```
┌──────────┐
│ Backend  │ ──── /metrics ───> ┌────────────┐
└──────────┘                    │ Prometheus │
                                └──────┬─────┘
┌──────────┐                           │
│Node Exp. │ ──── :9100 ──────────────┤
└──────────┘                           │
                                       │
┌──────────┐                           │
│Postgres  │ ──── :9187 ──────────────┤
│Exporter  │                           │
└──────────┘                           │
                                       ▼
                                ┌──────────┐
                                │ Grafana  │
                                └──────────┘
```

**Metrics Types**:
- **Counters**: Total requests, auth attempts
- **Gauges**: Active connections, tasks by status
- **Histograms**: Response times, query durations

**Alert Rules**:
- Service down > 1 min
- Error rate > 5%
- Response time P95 > 1s
- CPU > 80% for 5 min
- Memory > 90% for 5 min

## 🔄 CI/CD Pipeline

```
┌──────────┐
│Developer │
└────┬─────┘
     │ 1. Push code
     ▼
┌─────────────┐
│   GitHub    │
└──────┬──────┘
       │ 2. Webhook
       ▼
┌────────────────┐
│GitHub Actions  │
├────────────────┤
│ ✓ Lint         │
│ ✓ Test         │
│ ✓ Security Scan│
│ ✓ Build        │
│ ✓ Push Image   │
└──────┬─────────┘
       │ 3. Deploy
       ▼
┌────────────────┐
│  Kubernetes    │
│  - Pull image  │
│  - Rolling     │
│    update      │
└────────────────┘
```

## 🎯 Design Decisions

### Why PostgreSQL?
- **Relational data**: Users and tasks have clear relationships
- **ACID compliance**: Data consistency is critical
- **Mature ecosystem**: Wide support, good tooling
- **Free tier available**: Supabase, Oracle Cloud

### Why React?
- **Component-based**: Reusable UI components
- **Large ecosystem**: Abundant libraries and resources
- **Developer experience**: Fast refresh, good tooling
- **Industry standard**: Most in-demand skill

### Why Node.js?
- **JavaScript everywhere**: Same language as frontend
- **Fast I/O**: Event-driven, non-blocking
- **NPM ecosystem**: Huge package repository
- **Easy to learn**: Gentle learning curve

### Why Docker?
- **Consistency**: Same environment everywhere
- **Isolation**: No dependency conflicts
- **Portability**: Run anywhere Docker runs
- **DevOps standard**: Industry-adopted tool

### Why Kubernetes?
- **Orchestration**: Automated deployment, scaling
- **Self-healing**: Automatic restarts and health checks
- **Declarative**: Desired state configuration
- **Industry standard**: De facto container orchestration

## 📝 Future Enhancements

### Potential Improvements

1. **Microservices**: Split into separate services
2. **GraphQL**: More flexible API queries
3. **WebSockets**: Real-time updates
4. **File Storage**: Task attachments
5. **Search**: Elasticsearch integration
6. **Notifications**: Email/push notifications
7. **Multi-tenancy**: Organization support
8. **SSO**: OAuth/SAML integration
9. **Mobile App**: React Native version
10. **API Gateway**: Kong or similar

### Scalability Roadmap

**Stage 1** (Current): Monolithic, single database
**Stage 2**: Add read replicas, caching
**Stage 3**: Microservices, message queue
**Stage 4**: Multi-region, CDN
**Stage 5**: Serverless functions

## 📚 References

- [12-Factor App](https://12factor.net/) - App design principles
- [REST API Design](https://restfulapi.net/) - API best practices
- [Kubernetes Patterns](https://k8spatterns.io/) - K8s design patterns
- [PostgreSQL Best Practices](https://wiki.postgresql.org/wiki/Don't_Do_This) - Database tips

## License

MIT

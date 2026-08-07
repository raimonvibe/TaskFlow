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
│              Backend (TypeScript / Node.js / Express)        │
│  - RESTful API, clean architecture in four layers           │
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
│  - Revoked tokens  │    └──────────────────────┘
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
- TypeScript (strict), compiled to `dist/` for production
- Node.js 22+
- Express.js (Web framework)
- PostgreSQL via `pg` and raw SQL (no ORM)
- JWT (Authentication)
- Winston (Logging)
- prom-client (Metrics)

**Architecture Pattern**: Clean (onion) architecture — four layers, with
dependencies pointing **inward only**. The inner layers declare interfaces;
the outer layers implement them. See
[BACKEND_REWRITE_PLAN.md](BACKEND_REWRITE_PLAN.md) for how the codebase got
here from the Controllers→Models→Database layering it started with, and the
reasoning behind each pattern.

```
        presentation/          Express: controllers, routes, middleware, DTOs
               ↓
        application/           Use cases (services), ports, event subscribers
               ↓
          domain/              Entities, value objects, errors, events,
                               repository interfaces — imports nothing

        infrastructure/        Implements the interfaces the inner layers
                               declare: Postgres, bcrypt, JWT, Winston,
                               prom-client. Nothing depends on it except
                               the composition root.
```

The practical consequence: `TaskService` knows there is a `TaskRepository`
that can store a `Task`, but not that PostgreSQL exists. Swapping the
database, the hasher, or the token format means writing one new class in
`infrastructure/` and changing one line in the composition root.

**Directory Structure**:
```
backend/src/
├── domain/                    # Innermost. No imports from other layers.
│   ├── entities/              # User, Task
│   ├── value-objects/         # Email, TaskStatus, TaskPriority
│   ├── errors/                # AppError hierarchy (each carries its status code)
│   ├── events/                # DomainEvent, AuthEvents, TaskEvents
│   └── repositories/          # Interfaces only — no SQL
├── application/               # Use cases; depends only on domain/
│   ├── services/              # Auth, Task, Token, Health
│   ├── ports/                 # Interfaces infrastructure must satisfy
│   │                          #   (Logger, Clock, EventBus, PasswordHasher,
│   │                          #    TokenProvider, metrics, DatabaseHealth)
│   └── subscribers/           # Metrics + audit log, wired to domain events
├── infrastructure/            # Concrete implementations
│   ├── persistence/postgres/  # Repositories, connection pool
│   ├── security/              # BcryptPasswordHasher, JwtTokenProvider
│   ├── metrics/               # The only file that imports prom-client
│   ├── config/Config.ts       # Validated, fail-fast configuration
│   └── logging/, events/, clock/
├── presentation/http/         # Express boundary
│   ├── app.ts                 # Middleware stack + route mounting
│   └── controllers/, routes/, middleware/, dto/, validators/
├── composition/
│   ├── container.ts           # The only file that does `new`
│   └── scriptContext.ts       # Smaller root for the standalone scripts
├── database/                  # initSchema.ts, seed.ts (own entrypoints)
└── main.ts                    # Process entry (npm start → dist/main.js)
```

**Dependency Injection**: `composition/container.ts` is the single place
concrete implementations are chosen and constructed. Nothing else in the
codebase does `new` on a dependency, and there are no module-level
singletons — importing a module never opens a database pool. That is what
lets the integration suite build a complete second application in the same
process, and what lets unit tests hand services in-memory fakes instead of
reaching for a mocking framework.

**Request Lifecycle**:
1. HTTP request arrives
2. Security headers (helmet), CORS
3. Rate limiter (generic, `/api/` only)
4. Body parsers, compression
5. Request logger — logs both ends, records timing and in-flight count
6. Route match; authentication middleware on protected routes
7. Validation middleware (`express-validator`), throwing `ValidationError` on failure
8. Controller: parse the request, call one service method, map the result to JSON
9. Service: enforce the use case's rules, call repositories through their interfaces
10. Repository: run parameterized SQL, translate driver errors into domain errors
11. Service publishes a domain event; subscribers record metrics and audit lines
12. Response sent; error handler maps any `AppError` to its status code

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

Each hop crosses one layer boundary, and each boundary is an interface the
inner side owns:

```
┌──────┐   1. Submit form          ┌──────────┐
│ User │ ────────────────────────> │ Frontend │
└──────┘                           └────┬─────┘
                                        │ 2. Axios interceptor adds the JWT
                                        ▼
                    ══════════ HTTP: POST /api/tasks ══════════
                                        │
┌───────────────────────────────────────▼─────────────────────┐
│ presentation/                                                │
│   authenticate      → verifies the token, sets req.user      │
│   taskValidators    → rejects bad input as ValidationError   │
│   TaskController    → reads the body, calls one service call │
└───────────────────────────────────────┬─────────────────────┘
                                        │ 3. createTask(userId, input)
┌───────────────────────────────────────▼─────────────────────┐
│ application/  TaskService                                    │
│   Turns raw strings into TaskStatus / TaskPriority value     │
│   objects (invalid values cannot get past this point), then  │
│   calls the repository *interface* — it has never heard of   │
│   PostgreSQL.                                                │
└───────┬───────────────────────────────────────────┬─────────┘
        │ 4. tasks.create(...)                      │ 6. publish
┌───────▼──────────────────────┐            ┌───────▼─────────────────┐
│ infrastructure/              │            │ TaskCreatedEvent        │
│   PostgresTaskRepository     │            │   → MetricsSubscriber   │
│   Parameterized INSERT;      │            │   → AuditLogSubscriber  │
│   driver errors become       │            │                         │
│   domain errors.             │            │ Side effects attach     │
└───────┬──────────────────────┘            │ themselves here rather  │
        │ 5. Task entity                    │ than the service        │
        │                                   │ calling them.           │
        ▼                                   └─────────────────────────┘
   ┌──────────┐
   │PostgreSQL│
   └──────────┘

        7. TaskController maps the Task entity through the taskResponse
           DTO (snake_case, ISO dates) and returns 201.
```

If the repository throws — a `ValidationError` for a too-long title, say —
the controller does not catch it. The error carries its own status code, and
the error-handling middleware turns it into a response. Controllers contain
no error-mapping logic and no `try`/`catch` per branch.

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

### Why TypeScript on the backend?
- **The interfaces are the architecture**: layers that depend on interfaces
  instead of concrete classes only hold together if something checks that
  the implementations actually match. `tsc --noEmit` gates CI alongside lint.
- **Value objects can be enforced**: `TaskStatus` is a closed union, so an
  invalid status is a compile error rather than a 500 from Postgres rejecting
  an enum cast.
- **No runtime cost**: types are erased; the shipped image contains only
  compiled JavaScript, no TypeScript and no build tooling.

### Why raw SQL over an ORM?
- **The Repository pattern already provides the seam** an ORM is usually
  reached for — swapping implementations, faking in tests — without adding a
  query language to learn on top of the one that already exists.
- **Visible queries**: performance work means reading the SQL that runs, not
  inferring it from a chain of method calls.
- **Fewer moving parts** for two tables with one relationship between them.

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

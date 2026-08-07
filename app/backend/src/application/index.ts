// Application layer (Phase 1 placeholder — see docs/BACKEND_REWRITE_PLAN.md).
//
// Use-case orchestration: services (AuthService, TaskService, TokenService)
// and domain-event subscribers (MetricsSubscriber, AuditLogSubscriber).
// Depends only on domain/ interfaces (repositories, ports) — never on a
// concrete infrastructure/ implementation directly, and never on Express.
//
// Phase 2 populated ports/ only (IClock, IEventBus, ILogger) - the
// interfaces the future services will need from infrastructure. services/
// and subscribers/ arrive in Phase 3 (Auth vertical slice) and Phase 4
// (Task vertical slice). Layer marker, not a barrel - import from ports/
// directly.
export {}

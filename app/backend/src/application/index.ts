// Application layer (Phase 1 placeholder — see docs/BACKEND_REWRITE_PLAN.md).
//
// Use-case orchestration: services (AuthService, TaskService, TokenService)
// and domain-event subscribers (MetricsSubscriber, AuditLogSubscriber).
// Depends only on domain/ interfaces (repositories, ports) — never on a
// concrete infrastructure/ implementation directly, and never on Express.
//
// Phase 2 populated ports/ (IClock, IEventBus, ILogger); Phase 3 and Phase
// 4 added services/ and subscribers/ for the auth and task slices. Layer
// marker, not a barrel - import from ports/ or services/ directly rather
// than pulling in the whole layer to use one class.
export {}

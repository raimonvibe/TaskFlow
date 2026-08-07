// Domain layer (Phase 1 placeholder — see docs/BACKEND_REWRITE_PLAN.md).
//
// This is the innermost layer: entities, value objects, the AppError
// hierarchy, domain events, and repository *interfaces*. It must never
// import from application/, infrastructure/, or presentation/ — no Express,
// no `pg`, no `jsonwebtoken`. That constraint is what makes everything in
// here testable with plain objects, no mocking framework required.
//
// Phase 2 populated the shared foundations: errors/ (the AppError
// hierarchy), value-objects/Email, and events/DomainEvent. Import them from
// their own folders (e.g. `../domain/errors/index.js`) rather than through
// this file - it stays a layer marker, not a barrel, so nothing accidentally
// pulls in the whole layer to use one error class.
//
// Phase 3/4 add entities/ and repositories/ (interfaces only) alongside them.
export {}

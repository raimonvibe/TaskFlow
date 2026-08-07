// Domain layer marker — see docs/ARCHITECTURE.md for the layering.
//
// The innermost layer: entities, value objects, the AppError hierarchy,
// domain events, and repository *interfaces*. It must never import from
// application/, infrastructure/, or presentation/ — no Express, no `pg`, no
// `jsonwebtoken`. That constraint is what makes everything in here testable
// with plain objects, no mocking framework required.
//
// Not a barrel: import from the subfolders directly
// (`../domain/errors/index.js`) so nothing pulls in the whole layer to use
// one error class.
export {}

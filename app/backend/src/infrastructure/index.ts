// Infrastructure layer (Phase 1 placeholder — see docs/BACKEND_REWRITE_PLAN.md).
//
// Concrete implementations of the interfaces defined in domain/ and
// application/ports/: Postgres repositories, bcrypt password hashing, the
// jsonwebtoken-backed token provider, Winston logging, prom-client metrics,
// and the validated Config singleton. This is the only layer allowed to
// import third-party infrastructure libraries directly.
//
// Phase 2 populated config/Config, logging/WinstonLogger, clock/SystemClock,
// events/InMemoryEventBus, and persistence/postgres/PostgresConnection. None
// of them are wired into the running app yet - src/server.js still uses the
// pre-rewrite modules they will eventually replace, so the two live side by
// side until Phase 3 cuts the auth slice over.
//
// Phase 3/4 add the per-resource Postgres repositories, BcryptPasswordHasher,
// and JwtTokenProvider. Layer marker, not a barrel - import from the
// subfolders directly.
export {}

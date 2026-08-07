// Infrastructure layer marker — see docs/ARCHITECTURE.md for the layering.
//
// Concrete implementations of the interfaces declared in domain/ and
// application/ports/: Postgres repositories and the connection pool, bcrypt
// password hashing, the jsonwebtoken-backed token provider, Winston
// logging, the prom-client metrics registry, the system clock, the
// in-process event bus, and the validated Config singleton.
//
// This is the only layer allowed to import third-party infrastructure
// libraries directly, and nothing depends on it except composition/ —
// which is what makes any one of these swappable by writing a new class and
// changing a line in the container.
//
// Not a barrel: import from the subfolders directly.
export {}

// Presentation layer (Phase 1 placeholder — see docs/BACKEND_REWRITE_PLAN.md).
//
// The Express/HTTP boundary: app.ts, server.ts, controllers, routes,
// middleware, request DTOs, and express-validator validators. Controllers
// stay thin — parse the request, call one application-layer service method,
// map the result or thrown AppError to an HTTP response. No business logic
// lives here.
//
// Populated in Phase 3 (Auth vertical slice) and Phase 4 (Task vertical
// slice); this is also where the app currently served by src/server.js
// eventually moves to, once a phase's slice is verified equivalent.
export {}

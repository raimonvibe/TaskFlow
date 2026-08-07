// Presentation layer (Phase 1 placeholder — see docs/BACKEND_REWRITE_PLAN.md).
//
// The Express/HTTP boundary: app.ts, server.ts, controllers, routes,
// middleware, request DTOs, and express-validator validators. Controllers
// stay thin — parse the request, call one application-layer service method,
// map the result or thrown AppError to an HTTP response. No business logic
// lives here.
//
// Populated in Phase 3 (auth vertical slice) and Phase 4 (task vertical
// slice), which together took over everything under /api/. http/app.ts is
// now the application's only Express entry point, replacing src/app.js.
export {}

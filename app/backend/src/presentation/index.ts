// Presentation layer marker — see docs/ARCHITECTURE.md for the layering.
//
// The Express/HTTP boundary: http/app.ts, controllers, routes, middleware,
// response DTOs, and express-validator validators. Controllers stay thin —
// parse the request, call one application-layer service method, map the
// result to a response. Errors are not caught here: they are AppErrors
// carrying their own status code, and the error middleware handles them
// uniformly.
//
// http/app.ts is the application's only Express entry point; main.ts builds
// a container and hands it over.
//
// Not a barrel: import from the subfolders directly.
export {}

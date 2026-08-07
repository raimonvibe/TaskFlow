// Composition root (Phase 1 placeholder — see docs/BACKEND_REWRITE_PLAN.md).
//
// The one file allowed to `new` up concrete infrastructure/ implementations
// and hand them to application/ services and presentation/ controllers as
// constructor arguments. Deliberately hand-rolled rather than a generic DI
// framework — at this app's size, a plain function that wires everything
// together is easier to read and easier to learn from than a container
// with its own magic.
//
// Populated once there's something real to wire — starting Phase 3.
export {}

// Application layer marker — see docs/ARCHITECTURE.md for the layering.
//
// Use-case orchestration: services (Auth, Task, Token, Health), the ports
// that say what those services need from the outside world, and the
// domain-event subscribers that handle side effects. Depends only on
// domain/ and on its own port interfaces — never on a concrete
// infrastructure/ implementation, and never on Express.
//
// Not a barrel: import from ports/ or services/ directly rather than
// pulling in the whole layer to use one class.
export {}

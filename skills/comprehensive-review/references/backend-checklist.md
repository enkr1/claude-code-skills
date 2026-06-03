# Backend Code Review Checklist

## Security (Critical)

- [ ] **No SQL injection** — use parameterized queries
- [ ] **No command injection** — sanitize shell inputs
- [ ] **Input validation** — validate all user input at boundary
- [ ] **Auth on all endpoints** — verify token/session
- [ ] **Authorization checks** — user can only access own data
- [ ] **No secrets in code** — use environment variables
- [ ] **No PII in logs** — mask sensitive data
- [ ] **Rate limiting** on public endpoints
- [ ] **CORS properly configured** — not `*` in production

## API Design (Major)

- [ ] **Consistent error format** — `{ error: { code, message, details, requestId } }`
- [ ] **Proper HTTP status codes** — 400 for bad input, 401 for auth, 404 for not found
- [ ] **Idempotency keys** for POST/PUT that create resources
- [ ] **Pagination** for list endpoints — cursor-based preferred
- [ ] **Request validation** — fail fast with clear messages
- [ ] **Versioning strategy** — if breaking changes

## Database (Major)

- [ ] **No N+1 queries** — use joins or batch loading
- [ ] **Indexes on query fields** — especially foreign keys
- [ ] **Transactions** for multi-step operations
- [ ] **Connection pooling** — don't create connections per request
- [ ] **Query timeouts** — prevent long-running queries
- [ ] **Soft deletes** if data recovery needed

## Error Handling (Major)

- [ ] **All paths have error handling** — no unhandled exceptions
- [ ] **Specific error codes** — not generic "error occurred"
- [ ] **Logging with context** — requestId, userId, endpoint
- [ ] **Don't expose stack traces** to client
- [ ] **Graceful degradation** — fallbacks for external services

## Performance (Major)

- [ ] **Async operations** — don't block on I/O
- [ ] **Caching** — for expensive/frequent queries
- [ ] **Batch operations** — instead of loops with single queries
- [ ] **Response compression** — gzip for large responses
- [ ] **Lazy loading** — don't fetch what you don't need

## Testing (Major)

- [ ] **Unit tests** for business logic
- [ ] **Integration tests** for API endpoints
- [ ] **Mock external services** — don't hit real APIs in tests
- [ ] **Edge cases** — empty, null, malformed input
- [ ] **Error paths** — test failure scenarios
- [ ] **Coverage** — critical paths must be tested

## Code Quality (Minor)

- [ ] **Type hints** — all functions typed (Python)
- [ ] **Docstrings** — for public functions
- [ ] **No print statements** — use proper logging
- [ ] **No commented-out code** — delete it
- [ ] **Constants** — no magic strings/numbers
- [ ] **Single responsibility** — functions do one thing

## Azure Functions Specific

- [ ] **Proper bindings** — input/output configured
- [ ] **Timeout handling** — respect function timeout limits
- [ ] **Cold start consideration** — minimize initialization
- [ ] **Stateless** — no reliance on local state between invocations

## MongoDB Specific

- [ ] **Proper indexes** — on frequently queried fields
- [ ] **Projection** — only fetch needed fields
- [ ] **Aggregation pipelines** — for complex queries (not multiple round trips)
- [ ] **ObjectId validation** — before querying
- [ ] **Schema validation** — enforce at database level if critical

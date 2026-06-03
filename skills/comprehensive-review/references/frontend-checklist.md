# Frontend Code Review Checklist

## Security (Critical)

- [ ] **No `dangerouslySetInnerHTML`** without sanitization
- [ ] **No user input in URLs** without encoding
- [ ] **No secrets in client code** (API keys, tokens)
- [ ] **No PII in logs** or console statements
- [ ] **Auth checks** on protected routes
- [ ] **CSRF protection** for mutations

## TypeScript (Major)

- [ ] **No `any` types** — use `unknown` + type guards
- [ ] **No `@ts-ignore`** without justification comment
- [ ] **Strict null checks** — handle undefined/null
- [ ] **Proper generics** — no implicit any in callbacks
- [ ] **Return types declared** for exported functions
- [ ] **Interface over type** for object shapes

## React Patterns (Major)

- [ ] **No unnecessary re-renders** — check deps arrays
- [ ] **useMemo/useCallback** for expensive operations
- [ ] **No state in render** — derive from existing state
- [ ] **Proper cleanup** in useEffect (subscriptions, timers)
- [ ] **Keys on lists** — stable, unique (not index)
- [ ] **Error boundaries** for async components
- [ ] **Suspense boundaries** for lazy components

## i18n (Major)

- [ ] **No hardcoded strings** — use `useTranslations()`
- [ ] **Keys in all locales** — en.json, zh-TW.json, zh-CN.json
- [ ] **Interpolation for dynamic values** — `t('key', { name })`
- [ ] **Date formatting** — use `useDateFormatter()`

## Accessibility (Major)

- [ ] **Semantic HTML** — button for actions, link for navigation
- [ ] **ARIA labels** on icon-only buttons
- [ ] **Keyboard navigation** — all interactive elements focusable
- [ ] **Focus management** — focus trap in modals
- [ ] **Color contrast** — meets WCAG AA
- [ ] **Touch targets** — 44px minimum on mobile

## CSS & Styling (Major)

- [ ] **CSS variables** — no hardcoded colors (use a design token, not a raw `#f4511e`)
- [ ] **Semantic classes** — `bg-success`, not `bg-green-500`
- [ ] **Glass classes** — `card-glass-primary`, not plain `bg-card`
- [ ] **Proper radius** — `rounded-xl`/`rounded-2xl` for cards
- [ ] **Global styles in globals.css** — no inline for patterns
- [ ] **Mobile-first** — responsive breakpoints

## Performance (Major)

- [ ] **Lazy loading** for heavy components
- [ ] **Image optimization** — next/image, proper sizes
- [ ] **Bundle size** — no giant imports (lodash vs lodash-es)
- [ ] **Memoization** for expensive computations
- [ ] **Virtualization** for long lists (>100 items)

## Error Handling (Major)

- [ ] **Try-catch** for async operations
- [ ] **Error states** in UI (not just console.log)
- [ ] **Loading states** — LoadingText component
- [ ] **Empty states** — handle no data gracefully
- [ ] **Retry mechanisms** for transient failures

## API Integration (Major)

- [ ] **Use `API_ENDPOINTS`** — no hardcoded URLs
- [ ] **Handle 401** — clear auth, redirect to login
- [ ] **Request IDs** — include for tracing
- [ ] **Proper error extraction** from response envelope

## Testing (Major)

- [ ] **Unit tests** for utils and hooks
- [ ] **Integration tests** for user flows
- [ ] **Edge cases** covered (empty, error, loading)
- [ ] **Mocks** for external dependencies
- [ ] **No snapshot tests** without justification

## Component Structure (Minor)

- [ ] **Single responsibility** — one component, one job
- [ ] **Props interface** — clearly documented
- [ ] **Default exports** only for pages
- [ ] **Named exports** for components and hooks
- [ ] **File naming** — PascalCase for components

## Code Quality (Minor)

- [ ] **No console.log** in production code
- [ ] **No commented-out code** — delete it
- [ ] **No magic numbers** — use constants
- [ ] **Descriptive names** — no `data`, `item`, `temp`
- [ ] **Early returns** — reduce nesting

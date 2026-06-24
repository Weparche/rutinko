---
name: domain-modeling
description: Build and maintain Rutinko's domain language, glossary and architectural decisions.
---

Maintain Rutinko's domain model while designing or reviewing the app.

Rules:

- `CONTEXT.md` is a glossary only, not a specification.
- Keep definitions short and product-domain-specific.
- Challenge vague or overloaded terms immediately.
- If code contradicts docs, surface the contradiction.
- Create ADRs sparingly in `docs/adr/` only when the decision is hard to reverse, surprising without context, and the result of a real trade-off.
- Rutinko currently uses a single root context.

---
name: grill-with-docs
description: Stress-test a product or technical design while maintaining Rutinko docs, glossary and ADRs.
disable-model-invocation: true
---

Run a grilling session using the local `grilling` and `domain-modeling` project skills.

Rules for Rutinko:

- Ask one question at a time.
- Provide a recommended answer with each question.
- If the answer can be discovered from code or docs, inspect those instead of asking.
- When project language is resolved, update `CONTEXT.md` immediately.
- When a hard-to-reverse, surprising, trade-off-based decision is resolved, add an ADR in `docs/adr/`.
- Keep the app lane clear: Croatian, mobile-first, simple daily autopilot, no bloated productivity system.

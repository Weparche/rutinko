# Local-first PWA MVP

Rutinko is built as a local-first React + Vite PWA using browser storage, browser notifications and Cloudflare Pages because the MVP must stay extremely simple: no login, no backend, no subscriptions and no calendar complexity. The trade-off is that reminders are best-effort in browser/PWA environments; if Rutinko later needs fully reliable background push while closed, that becomes a separate native app or backend push decision.

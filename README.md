# Rutinko

Rutinko je React + Vite PWA aplikacija za dnevne rutine, osnovne obaveze i mini treninge.

## Poanta

Aplikacija služi kao dnevni autopilot za stvari koje ne želiš držati u glavi:

- oprati zube
- pojesti doručak
- popiti tablete
- napraviti 20 trbušnjaka ujutro
- napraviti 20 trbušnjaka navečer
- prošetati psa
- otuširati se
- prijaviti porez
- odvesti auto na servis
- platiti račun
- nazvati nekoga dragog

## Funkcije

- React komponente i Vite build
- mobile-first premium UI
- današnji zadaci grupirani u Jutro, Dan, Večer i Jednokratno
- gotove rutine / predlošci
- dodavanje i uređivanje vlastitih zadataka
- premium kategorizirani icon picker
- lucide-react ikone i lokalne Lottie animacije za ključne trenutke
- ponavljanje: jednom, svaki dan, radnim danom, tjedno, mjesečno, godišnje
- gumbi: Završeno, Odgodi, Preskoči
- lokalno spremanje u browseru
- PWA manifest i service worker
- browser notifikacije
- podsjetnik se ponavlja svakih 5 min ako zadatak nije riješen
- odgoda je zadano 30 min
- period tišine, npr. 22:30–07:00
- dnevni i tjedni progress za mini trening

## Cloudflare Pages

Postavke za deploy:

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`

## Lokalno pokretanje

```bash
npm install
npm run dev
```

## Impeccable design tooling

Rutinko ima dodan Impeccable kao design/dev alat.

Korisne naredbe:

```bash
npm run design:audit
npm run design:audit:json
npm run design:init
npm run design:update
```

Kontekst za Impeccable nalazi se u:

- `PRODUCT.md` – product i UX kontekst
- `DESIGN.md` – brand i UI/UX smjer
- `.impeccable/config.json` – detector konfiguracija

Ako koristiš Codex CLI, Claude Code, Cursor ili drugi podržani AI coding alat, možeš dodatno pokrenuti:

```bash
npx impeccable install
```

Nakon toga u AI coding alatu koristi:

```text
/impeccable audit
/impeccable critique
/impeccable polish
/impeccable typeset
/impeccable layout
```

## Grill with docs skills

Projekt ima lokalno dodane project skills za stroži prolaz kroz proizvodni model i odluke:

- `.claude/skills/grill-with-docs/SKILL.md`
- `.claude/skills/grilling/SKILL.md`
- `.claude/skills/domain-modeling/SKILL.md`

Kontekst domene nalazi se u `CONTEXT.md`, a arhitekturne odluke u `docs/adr/`.

## Glavne datoteke

- `index.html` – Vite ulazna stranica
- `package.json` – npm skripte i React/Vite dependencyji
- `src/main.jsx` – glavna React aplikacija
- `src/data.js` – rutine i opcije
- `src/IconPicker.jsx` – kategorizirani premium icon picker
- `src/AnimatedMoment.jsx` – Lottie animacijski wrapper
- `src/utils.js` – datumi, ponavljanja i helper funkcije
- `src/styles.css` – premium mobile UI
- `src/impeccable-upgrades.css` – dodatni polish stilovi
- `src/premium-icons.css` – stilovi za premium icon picker
- `src/lottie-layer.css` – stilovi za Lottie trenutke
- `public/manifest.webmanifest` – PWA konfiguracija
- `public/sw.js` – service worker
- `public/icons/` – PWA ikone
- `public/brand/rutinko-logo.webp` – Rutinko WebP logo

## Napomena za notifikacije

Ovo je browser/PWA aplikacija. Notifikacije najbolje rade kada je aplikacija otvorena ili instalirana kao PWA. Za potpuno pouzdane podsjetnike dok je aplikacija skroz zatvorena, sljedeći korak je native mobilna aplikacija ili backend push sustav.

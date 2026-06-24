# Rutinko

Rutinko je jednostavna PWA aplikacija za dnevne rutine, osnovne obaveze i mini treninge.

## Poanta

Aplikacija služi kao dnevni autopilot za stvari koje ne želiš držati u glavi:

- oprati zube
- pojesti doručak
- popiti tablete
- napraviti 20 trbušnjaka ujutro
- napraviti 20 trbušnjaka navečer
- otuširati se
- prijaviti porez
- odvesti auto na servis
- platiti račun

## MVP funkcije

- mobile-first UI
- današnji zadaci grupirani u Jutro, Dan, Večer i Jednokratno
- gotove rutine / predlošci
- dodavanje vlastitih zadataka
- ponavljanje: jednom, svaki dan, radnim danom, tjedno, mjesečno
- gumbi: Završeno, Odgodi, Podsjeti za 5 min
- lokalno spremanje u browseru
- PWA manifest i service worker
- browser notifikacije
- podsjetnik se ponavlja svakih 5 min ako zadatak nije riješen
- odgoda je zadano 30 min
- period tišine, npr. 22:30–07:00
- dnevni i tjedni progress za mini trening

## Važna napomena za notifikacije

Ovo je browser/PWA MVP. Notifikacije najbolje rade kada je aplikacija otvorena ili instalirana kao PWA. Za potpuno pouzdane podsjetnike dok je aplikacija zatvorena, sljedeći korak je native mobilna aplikacija ili backend push sustav.

## Pokretanje

Repo je statički i može se otvoriti direktno kroz `index.html` ili deployati na Cloudflare Pages / GitHub Pages.

Za Cloudflare Pages može se koristiti:

- Build command: prazno
- Output directory: `/`

## Glavne datoteke

- `index.html` – ulazna stranica
- `app-v2.js` – glavna aplikacijska logika
- `style.css` – UI/UX stilovi
- `manifest.webmanifest` – PWA konfiguracija
- `sw.js` – service worker i offline cache

# Rutinko Design Direction

Rutinko should look and feel like a premium mobile habit and fitness app, while staying extremely simple.

## Brand essence

- Calm but motivating.
- Daily autopilot.
- Serious consumer mobile product.
- Friendly, not childish.
- Minimal, memorable, practical.

## Visual references

Use the feel of popular habit and fitness apps:

- bold daily score hero
- clear progress ring
- dark premium dashboard cards
- strong high-contrast CTA buttons
- compact task cards
- clean bottom navigation
- polished icon picker
- light Lottie moments only where they add delight

Do not copy any specific app. Use the category conventions, not another product's brand.

## Color system

Primary dark:
- Navy: #07182f
- Ink: #07111f

Primary action:
- Blue: #1268ff
- Cyan: #00c2ff

Energy accent:
- Lime: #b7ff38

Positive:
- Mint: #19d28f

Warning / overdue:
- Orange: #ff7a1a

Danger:
- Red: #ff4d5f

Background:
- Soft blue-white: #f3f6fb

## Typography

Use modern, crisp, mobile-first typography.

Avoid generic SaaS blandness. Typography should have:

- strong hierarchy
- large dashboard numbers
- tight headings
- readable task titles
- small but legible metadata
- no tiny tap labels below 11px unless decorative

## Layout principles

- Single-column mobile-first layout.
- Maximum app width around 520px.
- Strong spacing rhythm.
- No nested card overload.
- Use one powerful hero section instead of many equal cards.
- Bottom nav should feel like a native mobile tab bar.
- CTA dock should be obvious and thumb-friendly.

## Today screen

Header:
- Rutinko logo
- app name
- short subtitle: Daily autopilot
- notification action
- install action only when PWA install is available and app is not installed

Hero:
- dark navy fitness-style card
- label: Daily flow / Današnji score
- progress ring
- main message such as “4 stvari do mirne glave”
- stats: Riješeno, Trening, Tjedan

CTA dock:
- primary: Dodaj rutinu
- secondary: Izradi novi dan

Task sections:
- Jutro
- Dan
- Večer
- Jednokratno
- Gotovo

Task card:
- icon
- task title
- time
- status
- actions: Done, Snooze, Preskoči
- edit and delete affordances

## Add task screen

- preview hero with selected icon and task title
- horizontal routine preset carousel
- premium categorized icon picker
- fields for title, time, repeat, category
- large primary save CTA

## Routines screen

- hero with logo
- list of routine cards
- add button for each routine

## Settings screen

- reminders enabled toggle
- reminder interval
- snooze length
- quiet hours
- reset app

## Anti-references

Avoid:

- generic purple-blue SaaS gradients
- too much gray
- tiny buttons
- calendar complexity
- gamified clutter
- multiple levels of nested cards
- childish sticker-like UI
- long explanatory text on primary screens
- low contrast text on colored backgrounds
- overusing emojis as the only visual system
- mounting UI enhancements outside the main React tree

## Motion

Use motion sparingly:

- pressed states
- subtle card scale on tap
- smooth progress feel
- small Lottie moments for score, dog walk, done state and new day confirmation

No bounce or elastic easing.

## Accessibility

- large tap targets
- high contrast
- readable text
- clear labels
- no color-only state communication

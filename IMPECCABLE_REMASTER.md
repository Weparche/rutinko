# Impeccable Remaster Pass

This pass applies the Rutinko `PRODUCT.md` and `DESIGN.md` context as a practical Impeccable-style remaster.

## What changed

### Product shape

The Today screen is structured around one clear decision path:

1. Daily score hero
2. Next focus task
3. Primary action dock
4. Task sections

This avoids a flat todo-list feel and makes the product feel closer to a premium habit / fitness app.

### UX hierarchy

The app prioritizes:

- current daily score
- next task to complete
- Done / Snooze / Preskoči actions
- task groups after the main focus

### Visual system

The UI uses:

- dark navy daily score hero
- lime primary action
- blue/cyan supporting action
- white elevated cards
- strong typography hierarchy
- cleaner app footer navigation
- larger tap targets
- premium categorized icon picker
- local Lottie moments for score, dog walk, done state and new day confirmation

### Typography

The app uses Manrope for a more premium mobile-product feel instead of a generic system/Inter-like default.

### Logo usage

The WebP Rutinko logo is used as a brand asset:

- header brand lockup
- routine hero
- PWA manifest icon
- notification icon

### Components improved

- Header
- Today score hero
- Focus card
- Action dock
- Task cards
- Add task builder
- Icon picker
- Routine cards
- Settings form
- New day confirmation
- Edit task modal
- Footer navigation

## Impeccable commands to run locally

```bash
npm install
npm run design:audit
npm run build
```

For supported AI coding tools:

```bash
npx impeccable install
```

Then use:

```text
/impeccable audit
/impeccable critique
/impeccable polish
/impeccable typeset
/impeccable layout
```

## Intentional constraints kept

- No backend
- No login
- No calendar complexity
- No subscriptions
- No heavy gamification
- Croatian UI preserved
- Core loop preserved: Done / Snooze / Preskoči

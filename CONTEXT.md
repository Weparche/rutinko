# Rutinko

Rutinko is a Croatian mobile-first daily autopilot for routines, simple obligations, reminders and mini exercise habits.

## Language

**Rutinko**:
The app itself: a simple daily autopilot that helps the user remember and resolve important routine items.
_Avoid_: todo app, calendar, productivity suite

**PWA-first MVP**:
The MVP platform boundary where Rutinko ships first as a React + Vite progressive web app instead of a native mobile app.
_Avoid_: native app, app store release, closed-app push dependency

**Free MVP**:
The MVP business boundary where Rutinko is free to use without subscriptions, paywalls, premium tiers or monetized feature gates.
_Avoid_: paid plan, premium feature, subscription, in-app purchase, ads

**Croatian-only MVP**:
The MVP language boundary where all product copy, routine labels and UI states are written only in Croatian.
_Avoid_: i18n system, language switcher, translation files

**Light Theme MVP**:
The single bright, clean and premium visual direction for the MVP without a manual dark mode toggle.
_Avoid_: dark mode setting, theme switcher, multi-theme maintenance

**Instant Start**:
The first-use experience where the user lands directly on Today with quick routine suggestions instead of a long onboarding flow.
_Avoid_: tutorial, multi-step onboarding, setup wizard

**Empty Today Start**:
The first-use state where Today is empty until the user explicitly adds routines from suggestions or creates their own.
_Avoid_: preloaded routine set, automatic routine creation, fake progress

**Light Delight**:
Small positive UI feedback such as completion animations and friendly daily progress, without turning Rutinko into a game.
_Avoid_: badges, levels, rewards, gamification economy

**Routine Template**:
A built-in catalog item that can be copied into My Routines but is not itself editable by the user.
_Avoid_: user routine, editable preset, factory routine

**Routine**:
A reusable task template owned by the user that can appear on the Today screen according to its repeat rule.
_Avoid_: habit, checklist item, calendar event

**Duplicate Routine**:
Two or more user routines with the same title or template origin, allowed when the user wants the same activity at different times or frequencies.
_Avoid_: duplicate warning, blocked copy, deduplication

**Fixed Category**:
A built-in, non-editable category used for light grouping and mini exercise scoring.
_Avoid_: custom category, category manager, tag system

**Task**:
A concrete routine instance shown to the user as something they can resolve on a given day.
_Avoid_: event, reminder, notification

**Today**:
The main product surface showing the current day's active tasks, progress and next focus.
_Avoid_: dashboard, calendar, timeline

**No Calendar MVP**:
The MVP boundary where Rutinko has no calendar view, date picker or date-based overview; it stays focused on what matters today.
_Avoid_: calendar, date overview, date picker, month view, agenda

**Next Focus**:
The single unresolved task Rutinko surfaces next, based on time, snooze state and today's status rather than manual priority levels.
_Avoid_: urgent flag, priority, Eisenhower matrix

**Resolved**:
The state of a task after it is either finished or skipped for the current day.
_Avoid_: archived, completed-only

**Done**:
The action that marks a task as completed for the current day.
_Avoid_: checked, closed

**Snooze**:
The action that delays the next reminder for a task until a later time.
_Avoid_: postpone, delay

**Skip**:
The always-available, neutral action that resolves a task for today without marking it as completed or punishing the user.
_Avoid_: delete, cancel, ignore, strict mode, forced completion, penalty, shame score

**Paused Routine**:
A saved routine that is turned off until the user turns it on again.
_Avoid_: skipped task, removed routine

**One-time Routine**:
A routine that appears on Today only on its creation day, then remains available in My Routines for reference or editing.
_Avoid_: auto-deleted task, permanent routine

**New Day**:
A user-triggered reset of today's statuses, skipped tasks, snoozes and notification history while keeping routines intact. It does not let the user pick or change the current date.
_Avoid_: calendar day switcher, manual date mode, reset app, clear all, delete routines

**Daily Score**:
The lightweight progress summary for the current Today screen. It can distinguish done from skipped, but must not punish skipped tasks with negative points or shame UI.
_Avoid_: streak, habit analytics, history, penalty score, red warning

**Weekly Mini Exercise Score**:
The only MVP lookback metric, limited to the current week and mini exercise routines.
_Avoid_: full history, habit tracker, performance analytics

**Local-only MVP**:
The MVP product boundary where routines and statuses stay on one user's device without accounts, cross-device sync, cloud sync, export, backup or backend storage.
_Avoid_: login, login preparation, OAuth placeholder, user account, cross-device sync, cloud sync, backend sync, data export, backup flow, backup system

**Reminder**:
A persistent but non-aggressive browser/PWA notification loop for unresolved tasks.
_Avoid_: loud alarm, forced vibration, native alarm mode, panic reminder

**Quiet Hours**:
The time window during which Rutinko should not send reminders.
_Avoid_: do not disturb mode

**Mini Exercise**:
A normal routine in the Tjelovježba category for lightweight physical activity such as sit-ups, stretching or walking.
_Avoid_: exercise module, workout plan, sets, reps, training program

**Premium Icon Picker**:
The categorized icon selector used when creating or editing a routine.
_Avoid_: emoji grid

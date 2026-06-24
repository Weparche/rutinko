# Rutinko

Rutinko is a Croatian mobile-first daily autopilot for routines, simple obligations, reminders and mini exercise habits.

## Language

**Rutinko**:
The app itself: a simple daily autopilot that helps the user remember and resolve important routine items.
_Avoid_: todo app, calendar, productivity suite

**Routine**:
A reusable task template that can appear on the Today screen according to its repeat rule.
_Avoid_: habit, checklist item, calendar event

**Task**:
A concrete routine instance shown to the user as something they can resolve on a given day.
_Avoid_: event, reminder, notification

**Today**:
The main product surface showing the current day's active tasks, progress and next focus.
_Avoid_: dashboard, calendar, timeline

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
The action that resolves a task for today without marking it as completed.
_Avoid_: delete, cancel, ignore

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
The lightweight progress summary for the current Today screen.
_Avoid_: streak, habit analytics, history

**Weekly Mini Exercise Score**:
The only MVP lookback metric, limited to the current week and mini exercise routines.
_Avoid_: full history, habit tracker, performance analytics

**Local-only MVP**:
The MVP product boundary where routines and statuses stay on the user's device without accounts, cloud sync or backend storage.
_Avoid_: login, user account, cloud sync, backup system

**Reminder**:
The in-app reminder loop that keeps nudging unresolved tasks when browser notification permission exists and reminders are enabled.
_Avoid_: alarm, push system

**Quiet Hours**:
The time window during which Rutinko should not send reminders.
_Avoid_: do not disturb mode

**Mini Exercise**:
A lightweight physical activity routine such as sit-ups, stretching or walking.
_Avoid_: workout plan, training program

**Premium Icon Picker**:
The categorized icon selector used when creating or editing a routine.
_Avoid_: emoji grid

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

**New Day**:
A user-triggered reset of today's statuses, skipped tasks, snoozes and notification history while keeping routines intact.
_Avoid_: reset app, clear all, delete routines

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

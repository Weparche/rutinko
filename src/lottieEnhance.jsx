import React from 'react';
import { createRoot } from 'react-dom/client';
import AnimatedMoment from './AnimatedMoment.jsx';
import './lottie-layer.css';

const roots = new WeakMap();

function mount(target, name, className, loop = true) {
  if (!target || target.querySelector(':scope > .animatedMomentHost')) return;
  const host = document.createElement('div');
  host.className = 'animatedMomentHost';
  target.appendChild(host);
  const root = createRoot(host);
  roots.set(host, root);
  root.render(<AnimatedMoment name={name} className={className} loop={loop} />);
}

function hasDogText(card) {
  const text = card?.textContent?.toLowerCase() || '';
  return text.includes('psa') || text.includes('pas');
}

function enhance() {
  mount(document.querySelector('.scoreHero'), 'dailyScore', 'heroAnimation');

  document.querySelectorAll('.focusCard').forEach((card) => {
    if (hasDogText(card)) mount(card, 'dogWalk', 'focusDogAnimation');
  });

  document.querySelectorAll('.taskCard').forEach((card) => {
    if (hasDogText(card)) mount(card, 'dogWalk', 'taskDogAnimation');
  });

  document.querySelectorAll('.allDoneCard').forEach((card) => {
    mount(card, 'doneCheck', 'doneAnimation', false);
  });

  document.querySelectorAll('.confirmModal').forEach((modal) => {
    mount(modal, 'newDay', 'newDayAnimation');
  });
}

function start() {
  enhance();
  const observer = new MutationObserver(() => enhance());
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}

import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import IconPicker from './IconPicker.jsx';
import './premium-icons.css';

const mounted = new WeakMap();

function getCurrentValue(picker) {
  const selected = picker.querySelector('button.selected');
  return selected?.textContent?.trim() || picker.querySelector('button')?.textContent?.trim() || '⭐';
}

function PremiumPickerBridge({ picker }) {
  const buttons = useMemo(() => Array.from(picker.querySelectorAll('button')), [picker]);
  const [value, setValue] = useState(getCurrentValue(picker));

  function choose(nextValue) {
    setValue(nextValue);
    const target = buttons.find((button) => button.textContent.trim() === nextValue);
    if (target) target.click();
  }

  return <IconPicker value={value} onChange={choose} />;
}

function enhancePicker(picker) {
  if (!picker || mounted.has(picker)) return;
  const host = document.createElement('div');
  host.className = 'premiumIconPickerHost';
  picker.insertAdjacentElement('beforebegin', host);

  try {
    const root = createRoot(host);
    mounted.set(picker, root);
    root.render(<PremiumPickerBridge picker={picker} />);
    picker.classList.add('enhancedHidden');
  } catch (error) {
    host.remove();
    picker.classList.remove('enhancedHidden');
    console.warn('Rutinko premium icon picker fallback active.', error);
  }
}

function enhance() {
  document.querySelectorAll('.iconPicker').forEach(enhancePicker);
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

renderAddTask = function enhancedRenderAddTask() {
  const preset = RUTINKO_ALL_ROUTINES[rutinkoSelectedPresetIndex] || RUTINKO_ALL_ROUTINES[3];
  rutinkoSelectedIcon = rutinkoSelectedIcon || preset.icon;

  return `
    <section class="add-hero-card">
      <div class="add-preview-icon">${escapeHtml(rutinkoSelectedIcon)}</div>
      <div>
        <span>Novi zadatak</span>
        <strong id="preview-title">${escapeHtml(preset.title)}</strong>
        <p>Odaberi rutinu, ikonu i vrijeme.</p>
      </div>
    </section>

    <section class="quick-presets">
      <div class="section-title inline"><h2>Brzo iz rutina</h2><span>${RUTINKO_ALL_ROUTINES.length}</span></div>
      <div class="preset-scroll">
        ${RUTINKO_ALL_ROUTINES.map((template, index) => `
          <button class="preset-chip ${index === rutinkoSelectedPresetIndex ? 'active' : ''}" data-action="prefill" data-index="${index}">
            <b>${escapeHtml(template.icon)}</b><span>${escapeHtml(template.title)}</span>
          </button>
        `).join('')}
      </div>
    </section>

    <section class="form-stack premium-form">
      <label class="form-row"><span class="row-icon">✎</span><span><small>Naziv zadatka</small><input id="task-title" value="${escapeAttr(preset.title)}" /></span></label>
      <label class="form-row hidden-input-row"><span class="row-icon">${escapeHtml(rutinkoSelectedIcon)}</span><span><small>Ikona</small><input id="task-icon" value="${escapeAttr(rutinkoSelectedIcon)}" maxlength="4" readonly /></span></label>
      <div class="icon-picker-card"><div class="icon-picker-head"><strong>Odaberi ikonu</strong><small>Rutine + srce + dodatne ikone</small></div><div class="icon-grid">${RUTINKO_ICONS.map((icon) => `<button class="icon-choice ${icon === rutinkoSelectedIcon ? 'active' : ''}" data-action="select-icon" data-icon="${escapeAttr(icon)}">${escapeHtml(icon)}</button>`).join('')}</div></div>
      <label class="form-row"><span class="row-icon">◷</span><span><small>Vrijeme</small><input id="task-time" type="time" value="${preset.time}" /></span></label>
      <label class="form-row"><span class="row-icon">↻</span><span><small>Ponavljanje</small>${renderSelect('task-repeat', [['once','Jednom'],['daily','Svaki dan'],['weekdays','Radnim danom'],['weekly','Tjedno'],['monthly','Mjesečno'],['yearly','Svake godine']], preset.repeat)}</span></label>
      <label class="form-row"><span class="row-icon">◇</span><span><small>Kategorija</small>${renderSelect('task-category', [['higijena','Higijena'],['prehrana','Prehrana'],['zdravlje','Zdravlje'],['tjelovježba','Tjelovježba'],['obaveza','Obaveza']], preset.category)}</span></label>
      <button class="primary-cta" data-action="save-task">Spremi zadatak</button>
    </section>
  `;
};

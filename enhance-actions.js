const oldAction=handleAction;handleAction=async function(a,e){if(a==='prefill')return pickPreset(Number(e.dataset.index));if(a==='select-icon')return pickIcon(e.dataset.icon);if(a==='template-plus')return addFullRoutine(Number(e.dataset.index));return oldAction(a,e)};
const oldBind=bindEvents;bindEvents=function(){oldBind();const i=document.getElementById('task-title');if(i)i.addEventListener('input',()=>{const p=document.getElementById('preview-title');if(p)p.textContent=i.value||'Novi zadatak'})};
function pickPreset(i){const t=RUTINKO_ALL_ROUTINES[i];if(!t)return;rutinkoSelectedPresetIndex=i;rutinkoSelectedIcon=t.icon;render()}
function pickIcon(i){rutinkoSelectedIcon=i||'✓';const el=document.getElementById('task-icon');if(el)el.value=rutinkoSelectedIcon;render()}
function addFullRoutine(i){const t=RUTINKO_ALL_ROUTINES[i];if(!t)return;state.tasks.push(createTask(t));saveState();activeTab='today';showToast('Rutina dodana.');render()}
render();

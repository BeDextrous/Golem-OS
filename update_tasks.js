function renderTasks(content) {
  const filtered = hideDoneTasks ? STATE.Tasks.filter(t => t.Status !== 'Done') : STATE.Tasks;
  content.innerHTML = `<div class="flex justify-end mb-4"><button onclick="toggleTaskFilter()" class="text-[10px] uppercase font-black opacity-40">${hideDoneTasks ? 'Show Done' : 'Hide Done'}</button></div>`;
  const areas = {};
  filtered.forEach(t => {
    const areaName = t.Area || 'Uncategorized';
    if (!areas[areaName]) areas[areaName] = [];
    areas[areaName].push(t);
  });
  for (let area in areas) {
    const safeAreaId = `group-${area.replace(/\s+/g, '-')}`;
    content.innerHTML += `<div class="area-header">${area}</div><div id="${safeAreaId}" class="task-group-container"></div>`;
    setTimeout(() => {
      const groupDiv = document.getElementById(safeAreaId);
      areas[area].forEach(t => {
        const taskName = t.Task || t["Task Name"] || "Untitled Task";
        groupDiv.innerHTML += `
          <div data-id="${t._rowIndex}" class="card p-5 mb-2 flex justify-between items-center cursor-move ${t.Status === 'Done' ? 'opacity-40' : ''}">
            <div><p class="font-bold text-sm">${taskName}</p><p class="text-[9px] text-emerald-700 italic">${t.Objective || ''}</p></div>
            <span class="pill">${t.Status}</span>
          </div>`;
      });
      new Sortable(groupDiv, { animation: 150, ghostClass: 'opacity-20' });
    }, 0);
  }
}

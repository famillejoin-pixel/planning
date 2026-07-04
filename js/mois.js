// ============ Logique de la page mois ============

let currentMonthKey = 'janvier';

function initMoisPage() {
    const params = new URLSearchParams(window.location.search);
    currentMonthKey = params.get('mois') || 'janvier';
    
    console.log('=== INITIALISATION MOIS ===');
    console.log('Mois:', currentMonthKey);
    
    // Charger la configuration
    loadConfig();
    console.log('Staff chargé:', getStaffNames());
    console.log('Activités chargées:', getActivitesList());
    
    // Charger les données
    loadPlanningData(getCurrentYear());
    
    // Rendre le mois
    renderMonth(currentMonthKey);
    updateNav();
}

function updateNav() {
    document.querySelectorAll('.nav-tabs a').forEach(a => {
        const href = a.getAttribute('href');
        if (href && href.includes(`mois=${currentMonthKey}`)) {
            a.classList.add('active');
        } else {
            a.classList.remove('active');
        }
    });
}

function renderMonth(monthKey) {
    const monthIdx = MONTHS.indexOf(monthKey);
    if (monthIdx === -1) return;
    
    const monthLabel = MONTH_LABELS[monthIdx];
    const year = getCurrentYear();
    const staff = getStaffNames();
    
    console.log('=== RENDU MOIS ===');
    console.log('Mois:', monthLabel, year);
    console.log('Staff:', staff);
    
    document.getElementById('moisTitle').textContent = `📅 ${monthLabel} ${year}`;
    document.getElementById('moisStaffBadge').textContent = `Staff: ${staff.join(', ')}`;
    
    // Récupérer les données
    let data = getMonthData(monthKey);
    
    // Si les données sont vides, les générer
    if (!data || data.length === 0) {
        console.log('Génération des données pour', monthKey);
        data = generateMonthData(monthIdx, year);
        setMonthData(monthKey, data);
    }
    
    // Vérifier que les données sont pour la bonne année
    if (data.length > 0) {
        const firstDate = new Date(data[0].date + 'T00:00:00');
        if (firstDate.getFullYear() !== year) {
            console.log('Année incorrecte, régénération');
            data = generateMonthData(monthIdx, year);
            setMonthData(monthKey, data);
        }
    }
    
    // Vérifier que tous les moniteurs sont présents
    data.forEach(row => {
        if (!row.staff) row.staff = {};
        staff.forEach(name => {
            if (!row.staff[name]) {
                row.staff[name] = { activite: 'ACCUEIL', P: 0, R: 0, Diff: 0 };
            }
            if (row.staff[name].activite === undefined) row.staff[name].activite = 'ACCUEIL';
            if (row.staff[name].P === undefined) row.staff[name].P = 0;
            if (row.staff[name].R === undefined) row.staff[name].R = 0;
            row.staff[name].Diff = (row.staff[name].P || 0) - (row.staff[name].R || 0);
        });
    });
    
    console.log('Données prêtes, nombre de lignes:', data.length);
    console.log('Première ligne staff:', Object.keys(data[0]?.staff || {}));
    
    buildTable(data, staff);
    buildWeeklySummary(data, staff);
}

function buildTable(data, staff) {
    console.log('Construction du tableau avec staff:', staff);
    
    let hourOptions = '';
    for (let h = 0; h <= 12; h += 0.5) {
        hourOptions += `<option value="${h}">${h.toFixed(1)}</option>`;
    }
    
    // Vérifier que staff n'est pas vide
    if (!staff || staff.length === 0) {
        console.error('Staff est vide !');
        document.getElementById('moisTableWrap').innerHTML = '<p style="color:red;padding:20px;">Erreur: Aucun moniteur configuré. Veuillez vérifier les paramètres.</p>';
        return;
    }
    
    let html = `<table>
        <thead><tr><th>Date</th><th>Jour</th><th>Sem.</th>`;
    staff.forEach(name => {
        html += `<th>${name}<br><span style="font-weight:400;font-size:0.55rem;">Act. / P / R / D</span></th>`;
    });
    html += `<th style="min-width:28px;">🗑️</th></tr></thead><tbody>`;
    
    data.forEach((row, rowIndex) => {
        const dateObj = new Date(row.date + 'T00:00:00');
        const dateStr = dateObj.toLocaleDateString('fr-FR');
        const isDimanche = row.jour === 'dimanche';
        const rowClass = isDimanche ? 'dimanche-row' : '';
        html += `<tr data-rowindex="${rowIndex}" class="${rowClass}">
            <td>${dateStr}</td>
            <td>${row.jour || ''}</td>
            <td>${row.semaine || ''}</td>`;
        staff.forEach(name => {
            const s = row.staff[name] || { activite: 'ACCUEIL', P: 0, R: 0, Diff: 0 };
            const diffVal = (s.P || 0) - (s.R || 0);
            let diffClass = 'diff-zero';
            if (diffVal > 0) diffClass = 'diff-positive';
            else if (diffVal < 0) diffClass = 'diff-negative';
            
            let rColor = '';
            if (s.R > s.P) rColor = '#f8d7da';
            else if (s.R < s.P) rColor = '#d4edda';
            else rColor = '#fff3cd';
            
            const acts = getActivitesList();
            html += `<td>
                <div class="staff-activity-cell">
                    <select class="activite-select" data-row="${rowIndex}" data-staff="${name}" style="width:100%;max-width:75px;">
                        ${acts.map(a => `<option value="${a}" ${s.activite === a ? 'selected' : ''}>${a}</option>`).join('')}
                    </select>
                    <div class="hours-row">
                        <select class="hour-select p-select" data-row="${rowIndex}" data-staff="${name}" data-type="P">
                            ${hourOptions}
                        </select>
                        <span style="font-weight:300;color:#999;">/</span>
                        <select class="hour-select r-select" data-row="${rowIndex}" data-staff="${name}" data-type="R" style="background:${rColor};">
                            ${hourOptions}
                        </select>
                        <span class="diff-cell ${diffClass}">${diffVal.toFixed(1)}</span>
                    </div>
                </div>
            </td>`;
        });
        html += `<td><button class="delete-row-btn" style="background:none;border:none;color:#b91c1c;cursor:pointer;font-size:0.9rem;" data-row="${rowIndex}">✕</button></td>`;
        html += `</tr>`;
    });
    
    // Total mois
    html += `<tr class="month-header"><td colspan="3">Total mois</td>`;
    const totals = {};
    staff.forEach(name => { totals[name] = { P: 0, R: 0, Diff: 0 }; });
    data.forEach(row => {
        staff.forEach(name => {
            const s = row.staff[name] || { P: 0, R: 0 };
            totals[name].P += (s.P || 0);
            totals[name].R += (s.R || 0);
            totals[name].Diff += ((s.P || 0) - (s.R || 0));
        });
    });
    staff.forEach(name => {
        const t = totals[name];
        html += `<td>${t.P.toFixed(1)} / ${t.R.toFixed(1)} / ${t.Diff.toFixed(1)}</td>`;
    });
    html += `<td></td></tr></tbody></table>`;
    
    document.getElementById('moisTableWrap').innerHTML = html;
    
    // Initialiser les valeurs des sélecteurs AVANT d'attacher les événements
    data.forEach((row, rowIndex) => {
        staff.forEach(name => {
            const s = row.staff[name] || { activite: 'ACCUEIL', P: 0, R: 0 };
            const pSelect = document.querySelector(`.p-select[data-row="${rowIndex}"][data-staff="${name}"]`);
            const rSelect = document.querySelector(`.r-select[data-row="${rowIndex}"][data-staff="${name}"]`);
            const activiteSelect = document.querySelector(`.activite-select[data-row="${rowIndex}"][data-staff="${name}"]`);
            
            if (pSelect) pSelect.value = s.P || 0;
            if (rSelect) {
                rSelect.value = s.R || 0;
                if (s.R > s.P) rSelect.style.background = '#f8d7da';
                else if (s.R < s.P) rSelect.style.background = '#d4edda';
                else rSelect.style.background = '#fff3cd';
            }
            if (activiteSelect) activiteSelect.value = s.activite || 'ACCUEIL';
        });
    });
    
    // Attacher les événements avec event delegation
    attachEvents();
}

function buildWeeklySummary(data, staff) {
    const weeks = [...new Set(data.map(r => r.semaine))].sort((a,b) => a-b);
    let summary = '<table><thead><tr><th>Moniteur</th>';
    weeks.forEach(w => summary += `<th>Semaine ${w}<br><small>P / R / Écart</small></th>`);
    summary += '<th>Total du mois<br><small>P / R / Écart</small></th></tr></thead><tbody>';
    staff.forEach(name => {
        let tp=0, tr=0;
        summary += `<tr><td><strong>${name}</strong></td>`;
        weeks.forEach(w => {
            let p=0, r=0;
            data.filter(row => row.semaine === w).forEach(row => {
                const x = row.staff?.[name];
                p += x?.P || 0;
                r += x?.R || 0;
            });
            tp += p; tr += r;
            const d = p - r;
            const cls = d > 0 ? 'diff-positive' : d < 0 ? 'diff-negative' : 'diff-zero';
            summary += `<td>${p.toFixed(1)} / ${r.toFixed(1)} / <span class="${cls}">${d.toFixed(1)}</span></td>`;
        });
        const d = tp - tr;
        const cls = d > 0 ? 'diff-positive' : d < 0 ? 'diff-negative' : 'diff-zero';
        summary += `<td><strong>${tp.toFixed(1)} / ${tr.toFixed(1)} / <span class="${cls}">${d.toFixed(1)}</span></strong></td></tr>`;
    });
    summary += '</tbody></table>';
    document.getElementById('weeklySummaryWrap').innerHTML = summary;
}

function attachEvents() {
    const container = document.getElementById('moisTableWrap');
    
    // Utiliser event delegation pour les sélecteurs d'heures
    container.addEventListener('change', function(e) {
        if (e.target.classList.contains('hour-select')) {
            const rowIdx = parseInt(e.target.dataset.row);
            const staffName = e.target.dataset.staff;
            const type = e.target.dataset.type;
            const val = parseFloat(e.target.value);
            if (isNaN(val)) return;
            
            let data = getMonthData(currentMonthKey);
            if (!data[rowIdx] || !data[rowIdx].staff || !data[rowIdx].staff[staffName]) return;
            
            data[rowIdx].staff[staffName][type] = val;
            const p = data[rowIdx].staff[staffName].P || 0;
            const r = data[rowIdx].staff[staffName].R || 0;
            data[rowIdx].staff[staffName].Diff = p - r;
            
            setMonthData(currentMonthKey, data);
            updateRowDisplay(rowIdx, staffName);
            updateTotals();
        }
    });
    
    // Event delegation pour les sélecteurs d'activités
    container.addEventListener('change', function(e) {
        if (e.target.classList.contains('activite-select')) {
            const rowIdx = parseInt(e.target.dataset.row);
            const staffName = e.target.dataset.staff;
            let data = getMonthData(currentMonthKey);
            if (!data[rowIdx] || !data[rowIdx].staff || !data[rowIdx].staff[staffName]) return;
            
            data[rowIdx].staff[staffName].activite = e.target.value;
            setMonthData(currentMonthKey, data);
        }
    });
    
    // Event delegation pour les boutons de suppression
    container.addEventListener('click', function(e) {
        if (e.target.classList.contains('delete-row-btn')) {
            const rowIdx = parseInt(e.target.dataset.row);
            let data = getMonthData(currentMonthKey);
            if (confirm(`Supprimer la ligne du ${data[rowIdx]?.date || ''} ?`)) {
                data.splice(rowIdx, 1);
                setMonthData(currentMonthKey, data);
                renderMonth(currentMonthKey);
            }
        }
    });
}

function updateRowDisplay(rowIdx, staffName) {
    const data = getMonthData(currentMonthKey);
    if (!data[rowIdx] || !data[rowIdx].staff || !data[rowIdx].staff[staffName]) return;
    const s = data[rowIdx].staff[staffName];
    const diffVal = (s.P || 0) - (s.R || 0);
    
    // Mettre à jour le sélecteur R (fond coloré)
    const rSelect = document.querySelector(`.r-select[data-row="${rowIdx}"][data-staff="${staffName}"]`);
    if (rSelect) {
        rSelect.value = s.R || 0;
        if (s.R > s.P) rSelect.style.background = '#f8d7da';
        else if (s.R < s.P) rSelect.style.background = '#d4edda';
        else rSelect.style.background = '#fff3cd';
    }
    
    // Mettre à jour le sélecteur P
    const pSelect = document.querySelector(`.p-select[data-row="${rowIdx}"][data-staff="${staffName}"]`);
    if (pSelect) pSelect.value = s.P || 0;
    
    // Mettre à jour la différence
    const row = document.querySelector(`tr[data-rowindex="${rowIdx}"]`);
    if (row) {
        // Trouver le diff-cell pour ce staff dans cette ligne
        const staffCell = row.querySelector(`td:nth-child(${MONTHS.indexOf(currentMonthKey) + 4})`);
        if (staffCell) {
            const diffSpan = staffCell.querySelector('.diff-cell');
            if (diffSpan) {
                diffSpan.textContent = diffVal.toFixed(1);
                diffSpan.className = 'diff-cell';
                if (diffVal > 0) diffSpan.classList.add('diff-positive');
                else if (diffVal < 0) diffSpan.classList.add('diff-negative');
                else diffSpan.classList.add('diff-zero');
            }
        }
    }
}

function updateTotals() {
    renderMonth(currentMonthKey);
}

// Boutons
document.getElementById('saveMonthBtn')?.addEventListener('click', function() {
    savePlanningData();
    alert('Mois sauvegardé !');
});

document.getElementById('resetMonthBtn')?.addEventListener('click', function() {
    if (confirm(`Réinitialiser le mois ${MONTH_LABELS[MONTHS.indexOf(currentMonthKey)]} ?`)) {
        const idx = MONTHS.indexOf(currentMonthKey);
        const data = generateMonthData(idx, getCurrentYear());
        setMonthData(currentMonthKey, data);
        renderMonth(currentMonthKey);
        alert('Mois réinitialisé !');
    }
});

document.getElementById('addStaffActivityBtn')?.addEventListener('click', function() {
    const newAct = prompt('Nouvelle activité à ajouter :');
    if (newAct && newAct.trim() !== '') {
        const act = newAct.trim().toUpperCase();
        const acts = getActivitesList();
        if (!acts.includes(act)) {
            acts.push(act);
            const cfg = loadConfig() || {};
            cfg.activites = acts.join('\n');
            saveConfig(cfg);
            renderMonth(currentMonthKey);
        } else {
            alert('Cette activité existe déjà.');
        }
    }
});

// Initialisation
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMoisPage);
} else {
    initMoisPage();
}

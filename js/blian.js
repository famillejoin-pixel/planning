// ============ Logique de la page bilan ============

function initBilanPage() {
    console.log('=== INITIALISATION BILAN ===');
    loadConfig();
    console.log('Staff chargé:', getStaffNames());
    loadPlanningData(getCurrentYear());
    renderBilan();
    updateNav();
}

function updateNav() {
    document.querySelectorAll('.nav-tabs a').forEach(a => {
        if (a.getAttribute('href') && a.getAttribute('href').includes('bilan')) {
            a.classList.add('active');
        } else {
            a.classList.remove('active');
        }
    });
}

function renderBilan() {
    console.log('=== RENDU BILAN ===');
    const staff = getStaffNames();
    console.log('Staff pour le bilan:', staff);
    
    // Forcer le rechargement des données
    const data = getPlanningData();
    console.log('Données disponibles:', Object.keys(data).filter(k => k !== '_year'));
    
    // Vérifier que chaque mois contient les bons moniteurs
    MONTHS.forEach(monthKey => {
        const monthData = data[monthKey] || [];
        if (monthData.length > 0) {
            const firstRow = monthData[0];
            if (firstRow.staff) {
                const existingStaff = Object.keys(firstRow.staff);
                if (existingStaff.length !== staff.length || !staff.every(s => existingStaff.includes(s))) {
                    console.log('Mise à jour des moniteurs pour', monthKey);
                    monthData.forEach(row => {
                        if (!row.staff) row.staff = {};
                        staff.forEach(name => {
                            if (!row.staff[name]) {
                                row.staff[name] = { activite: 'ACCUEIL', P: 0, R: 0, Diff: 0 };
                            }
                        });
                    });
                    setMonthData(monthKey, monthData);
                }
            }
        }
    });
    
    // Recharger les données après mise à jour
    const updatedData = getPlanningData();
    
    const staffTotals = {};
    const activityTotals = {};
    const monthPR = {};
    
    staff.forEach(name => { staffTotals[name] = { P: 0, R: 0 }; });
    getActivitesList().forEach(act => { activityTotals[act] = 0; });
    
    MONTHS.forEach((m, idx) => {
        const monthData = updatedData[m] || [];
        monthPR[m] = { P: 0, R: 0 };
        
        monthData.forEach(row => {
            if (row.staff) {
                Object.entries(row.staff).forEach(([name, s]) => {
                    if (staff.includes(name)) {
                        staffTotals[name].P += (s.P || 0);
                        staffTotals[name].R += (s.R || 0);
                        monthPR[m].P += (s.P || 0);
                        monthPR[m].R += (s.R || 0);
                        const act = s.activite || 'AUTRE';
                        if (activityTotals[act] !== undefined) activityTotals[act] += (s.P || 0);
                    }
                });
            }
        });
    });
    
    // Stats
    let totalVoile = 0, totalHors = 0, totalRepos = 0;
    const voileActs = ['EDV', 'EDS', 'REGATE', 'CP', 'LOCATION'];
    const reposActs = ['REPOS', 'CONGES'];
    MONTHS.forEach(m => {
        const monthData = updatedData[m] || [];
        monthData.forEach(row => {
            if (row.staff) {
                Object.values(row.staff).forEach(s => {
                    const act = (s.activite || '').toUpperCase();
                    if (reposActs.some(r => act.includes(r))) totalRepos += (s.P || 0);
                    else if (voileActs.some(v => act.includes(v))) totalVoile += (s.P || 0);
                    else if (act !== '') totalHors += (s.P || 0);
                });
            }
        });
    });
    document.getElementById('totalVoile').textContent = totalVoile.toFixed(1) + ' h';
    document.getElementById('totalHorsVoile').textContent = totalHors.toFixed(1) + ' h';
    document.getElementById('totalReposConges').textContent = totalRepos.toFixed(1) + ' h';
    
    let totalP = 0, totalR = 0;
    staff.forEach(name => {
        totalP += staffTotals[name].P;
        totalR += staffTotals[name].R;
    });
    document.getElementById('totalP').textContent = totalP.toFixed(1) + ' h';
    document.getElementById('totalR').textContent = totalR.toFixed(1) + ' h';
    
    // Tableau récapitulatif
    let html = `<table><thead><tr><th>Mois</th>`;
    staff.forEach(name => html += `<th>${name}</th>`);
    html += `</tr></thead><tbody>`;
    MONTHS.forEach((m, idx) => {
        const monthData = updatedData[m] || [];
        html += `<tr><td>${MONTH_LABELS[idx]}</td>`;
        staff.forEach(name => {
            let sum = 0;
            monthData.forEach(row => {
                if (row.staff && row.staff[name]) {
                    sum += (row.staff[name].P || 0);
                }
            });
            html += `<td>${sum.toFixed(1)}</td>`;
        });
        html += `</tr>`;
    });
    html += `<tr class="total-row"><td>TOTAL</td>`;
    staff.forEach(name => {
        html += `<td>${staffTotals[name].P.toFixed(1)}</td>`;
    });
    html += `</tr></tbody></table>`;
    document.getElementById('bilanTableWrap').innerHTML = html;
    
    renderCharts(activityTotals, staffTotals, monthPR);
}

function renderCharts(activityTotals, staffTotals, monthPR) {
    // Détruire les graphiques existants
    if (window._charts) {
        Object.values(window._charts).forEach(c => {
            try { c.destroy(); } catch(e) {}
        });
    }
    window._charts = {};
    
    const acts = Object.keys(activityTotals).filter(a => activityTotals[a] > 0);
    const actValues = acts.map(a => activityTotals[a]);
    const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#22c55e', '#eab308', '#f97316', '#ef4444', '#ec4899', '#14b8a6', '#6366f1', '#84cc16', '#f43f5e', '#0ea5e9', '#d946ef'];
    
    // 1. Répartition des activités
    const ctx1 = document.getElementById('activitesChart');
    if (ctx1) {
        try {
            window._charts.activites = new Chart(ctx1, {
                type: 'bar',
                data: {
                    labels: acts,
                    datasets: [{ label: 'Heures prévues', data: actValues, backgroundColor: colors.slice(0, acts.length), borderRadius: 4 }]
                },
                options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
            });
        } catch(e) { console.error('Erreur graphique activités:', e); }
    }
    
    // 2. P/R par moniteur
    const staff = getStaffNames();
    const ctx2 = document.getElementById('staffPRChart');
    if (ctx2) {
        try {
            window._charts.staffPR = new Chart(ctx2, {
                type: 'bar',
                data: {
                    labels: staff,
                    datasets: [
                        { label: 'Prévu (P)', data: staff.map(n => staffTotals[n].P), backgroundColor: '#3b82f6', borderRadius: 4 },
                        { label: 'Réalisé (R)', data: staff.map(n => staffTotals[n].R), backgroundColor: '#f97316', borderRadius: 4 }
                    ]
                },
                options: { responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }
            });
        } catch(e) { console.error('Erreur graphique staff:', e); }
    }
    
    // 3. Évolution mensuelle
    const ctx3 = document.getElementById('monthlyChart');
    if (ctx3) {
        try {
            window._charts.monthly = new Chart(ctx3, {
                type: 'bar',
                data: {
                    labels: MONTH_LABELS,
                    datasets: [
                        { label: 'Prévu (P)', data: MONTHS.map(m => monthPR[m]?.P || 0), backgroundColor: '#3b82f6', borderRadius: 4 },
                        { label: 'Réalisé (R)', data: MONTHS.map(m => monthPR[m]?.R || 0), backgroundColor: '#f97316', borderRadius: 4 }
                    ]
                },
                options: { responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }
            });
        } catch(e) { console.error('Erreur graphique mensuel:', e); }
    }
}

// Initialisation
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBilanPage);
} else {
    initBilanPage();
}
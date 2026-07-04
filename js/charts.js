// ============ GESTION DES GRAPHIQUES (Chart.js) ============

// Fonction pour initialiser les graphiques du bilan
function initBilanCharts() {
    const { activityTotals, staffTotals, monthPR } = App.calculateYearTotals();
    renderBilanCharts(activityTotals, staffTotals, monthPR);
}

// Fonction pour rendre les graphiques
function renderBilanCharts(activityTotals, staffTotals, monthPR) {
    // Détruire les graphiques existants
    if (window._charts) {
        Object.values(window._charts).forEach(c => {
            try { c.destroy(); } catch(e) {}
        });
    }
    window._charts = {};
    
    const colors = [
        '#3b82f6', '#8b5cf6', '#06b6d4', '#22c55e', '#eab308', 
        '#f97316', '#ef4444', '#ec4899', '#14b8a6', '#6366f1', 
        '#84cc16', '#f43f5e', '#0ea5e9', '#d946ef'
    ];
    
    // 1. Répartition des activités
    const ctx1 = document.getElementById('activitesChart');
    if (ctx1) {
        const acts = Object.keys(activityTotals).filter(a => activityTotals[a] > 0);
        const actValues = acts.map(a => activityTotals[a]);
        
        try {
            window._charts.activites = new Chart(ctx1, {
                type: 'bar',
                data: {
                    labels: acts,
                    datasets: [{
                        label: 'Heures prévues (P)',
                        data: actValues,
                        backgroundColor: colors.slice(0, acts.length),
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true } }
                }
            });
        } catch(e) { console.error('Erreur graphique activités:', e); }
    }
    
    // 2. P/R par moniteur
    const ctx2 = document.getElementById('staffPRChart');
    if (ctx2) {
        try {
            window._charts.staffPR = new Chart(ctx2, {
                type: 'bar',
                data: {
                    labels: App.config.staff,
                    datasets: [
                        {
                            label: 'Prévu (P)',
                            data: App.config.staff.map(n => staffTotals[n]?.P || 0),
                            backgroundColor: '#3b82f6',
                            borderRadius: 4
                        },
                        {
                            label: 'Réalisé (R)',
                            data: App.config.staff.map(n => staffTotals[n]?.R || 0),
                            backgroundColor: '#f97316',
                            borderRadius: 4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { position: 'top' } },
                    scales: { y: { beginAtZero: true } }
                }
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
                        {
                            label: 'Prévu (P)',
                            data: MONTHS.map(m => monthPR[m]?.P || 0),
                            backgroundColor: '#3b82f6',
                            borderRadius: 4
                        },
                        {
                            label: 'Réalisé (R)',
                            data: MONTHS.map(m => monthPR[m]?.R || 0),
                            backgroundColor: '#f97316',
                            borderRadius: 4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { position: 'top' } },
                    scales: { y: { beginAtZero: true } }
                }
            });
        } catch(e) { console.error('Erreur graphique mensuel:', e); }
    }
}

// Initialiser si la page est bilan.html
if (window.location.pathname.includes('bilan.html')) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBilanCharts);
    } else {
        initBilanCharts();
    }
}

// ============ APPLICATION SIMPLE DE PLANNING ============
// Version ultra-simple inspirée d'un tableau Excel

// --- CONSTANTES ---
const STORAGE_KEY = 'planning_simple_data';
const CONFIG_KEY = 'planning_simple_config';

const MONTHS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
const MONTH_LABELS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

// --- CONFIGURATION PAR DÉFAUT ---
const DEFAULT_CONFIG = {
    year: 2026,
    club: 'ASPTT Voile',
    staff: ['Romain', 'Thibau', 'James', 'Swann', 'Soen', 'Cenzo', 'Marine', 'Léa', 'Erwan', 'Marin', 'Marie', 'Nils', 'Florian', 'Iris', 'Mael'],
    activities: ['ACCUEIL', 'EDV', 'EDS', 'ATELIER', 'GROUPE', 'CP', 'LOCATION', 'REPOS', 'REUNION', 'SCOLAIRE', 'AUTRE', 'RTQ', 'RTQ+EDS', 'EDV+CP', 'ATELIER+CP', 'GROUPE+CP', 'ACCUEIL+CP', 'EDV+GP', 'EDS+AT', 'ATELIER+GP', 'GROUPE+AT', 'CONGES', 'SCOLAIRE+CP']
};

// --- FONCTIONS DE BASE ---

// Charger la configuration
function loadConfig() {
    try {
        const saved = localStorage.getItem(CONFIG_KEY);
        if (saved) {
            return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
        }
    } catch (e) {
        console.error('Erreur chargement config:', e);
    }
    return { ...DEFAULT_CONFIG };
}

// Sauvegarder la configuration
function saveConfig(config) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

// Générer les données pour un mois
function generateMonthData(monthIdx, year, staff, activities) {
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
    const data = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, monthIdx, day);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = date.toLocaleDateString('fr-FR', { weekday: 'long' });
        const weekNum = getISOWeekNumber(dateStr);
        
        const row = {
            date: dateStr,
            day: dayName,
            week: weekNum,
            staff: {}
        };
        
        // Initialiser chaque moniteur
        staff.forEach(name => {
            row.staff[name] = {
                activity: 'ACCUEIL',
                P: 0,
                R: 0
            };
        });
        
        data.push(row);
    }
    return data;
}

// Calculer le numéro de semaine ISO
function getISOWeekNumber(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const dateCopy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayNum = dateCopy.getDay() || 7;
    dateCopy.setDate(dateCopy.getDate() - dayNum + 4);
    const yearStart = new Date(dateCopy.getFullYear(), 0, 1);
    return Math.ceil((((dateCopy - yearStart) / 86400000) + 1) / 7);
}

// Charger les données
function loadData(config) {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const data = JSON.parse(saved);
            // Vérifier que l'année correspond
            if (data.year !== config.year) {
                return generateYearData(config);
            }
            // Vérifier que tous les mois existent
            MONTHS.forEach(m => {
                if (!data.months[m]) {
                    const monthIdx = MONTHS.indexOf(m);
                    data.months[m] = generateMonthData(monthIdx, config.year, config.staff, config.activities);
                }
            });
            // Vérifier que tous les moniteurs sont présents
            MONTHS.forEach(m => {
                data.months[m].forEach(row => {
                    config.staff.forEach(name => {
                        if (!row.staff[name]) {
                            row.staff[name] = { activity: 'ACCUEIL', P: 0, R: 0 };
                        }
                    });
                });
            });
            return data;
        }
    } catch (e) {
        console.error('Erreur chargement données:', e);
    }
    return generateYearData(config);
}

// Générer les données pour une année
function generateYearData(config) {
    const data = { year: config.year, months: {} };
    MONTHS.forEach((month, idx) => {
        data.months[month] = generateMonthData(idx, config.year, config.staff, config.activities);
    });
    return data;
}

// Sauvegarder les données (avec débounce)
let saveTimeout = null;
function saveData(data) {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        console.log('✅ Données sauvegardées');
    }, 300);
}

// Mettre à jour une cellule
function updateCell(data, monthKey, rowIndex, staffName, field, value) {
    if (!data.months[monthKey] || !data.months[monthKey][rowIndex] || 
        !data.months[monthKey][rowIndex].staff || 
        !data.months[monthKey][rowIndex].staff[staffName]) {
        return false;
    }
    data.months[monthKey][rowIndex].staff[staffName][field] = value;
    saveData(data);
    return true;
}

// Calculer la différence pour une cellule
function getDiff(cell) {
    return (cell.P || 0) - (cell.R || 0);
}

// Calculer les totaux pour un mois
function calculateMonthTotals(data, monthKey, staff) {
    const monthData = data.months[monthKey] || [];
    const totals = { P: 0, R: 0, Diff: 0 };
    const staffTotals = {};
    
    staff.forEach(name => {
        staffTotals[name] = { P: 0, R: 0, Diff: 0 };
    });
    
    monthData.forEach(row => {
        staff.forEach(name => {
            const cell = row.staff[name];
            if (cell) {
                const p = cell.P || 0;
                const r = cell.R || 0;
                staffTotals[name].P += p;
                staffTotals[name].R += r;
                staffTotals[name].Diff += (p - r);
                totals.P += p;
                totals.R += r;
            }
        });
    });
    
    totals.Diff = totals.P - totals.R;
    return { totals, staffTotals };
}

// Calculer les totaux pour l'année
function calculateYearTotals(data, staff, activities) {
    const yearTotals = { P: 0, R: 0, Diff: 0 };
    const staffTotals = {};
    const activityTotals = {};
    const monthPR = {};
    
    staff.forEach(name => {
        staffTotals[name] = { P: 0, R: 0, Diff: 0 };
    });
    activities.forEach(act => {
        activityTotals[act] = 0;
    });
    MONTHS.forEach(m => {
        monthPR[m] = { P: 0, R: 0 };
    });
    
    MONTHS.forEach(monthKey => {
        const monthData = data.months[monthKey] || [];
        monthData.forEach(row => {
            staff.forEach(name => {
                const cell = row.staff[name];
                if (cell) {
                    const p = cell.P || 0;
                    const r = cell.R || 0;
                    staffTotals[name].P += p;
                    staffTotals[name].R += r;
                    staffTotals[name].Diff += (p - r);
                    monthPR[monthKey].P += p;
                    monthPR[monthKey].R += r;
                    yearTotals.P += p;
                    yearTotals.R += r;
                    
                    // Activités
                    const activity = cell.activity || 'AUTRE';
                    if (activityTotals[activity] !== undefined) {
                        activityTotals[activity] += p;
                    }
                }
            });
        });
    });
    
    yearTotals.Diff = yearTotals.P - yearTotals.R;
    return { yearTotals, staffTotals, activityTotals, monthPR };
}

// --- EXPORT POUR LES PAGES ---
window.PlanningApp = {
    loadConfig,
    saveConfig,
    loadData,
    saveData,
    generateMonthData,
    generateYearData,
    updateCell,
    getDiff,
    calculateMonthTotals,
    calculateYearTotals,
    getISOWeekNumber,
    MONTHS,
    MONTH_LABELS,
    DEFAULT_CONFIG
};

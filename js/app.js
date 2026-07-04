// ============ APPLICATION CORE ============
// Ce fichier centralise toute la logique de l'application

// --- CONSTANTES GLOBALES ---
const APP_STORAGE_KEY = 'planning_app_data';
const APP_CONFIG_KEY = 'planning_app_config';

const MONTHS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
const MONTH_LABELS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

// --- CONFIGURATION PAR DÉFAUT ---
const DEFAULT_CONFIG = {
    year: 2026,
    club: 'ASPTT Voile',
    staff: ['Romain', 'Thibau', 'James', 'Swann', 'Soen', 'Cenzo', 'Marine', 'Léa', 'Erwan', 'Marin', 'Marie', 'Nils', 'Florian', 'Iris', 'Mael'],
    activities: [
        'ACCUEIL', 'EDV', 'EDS', 'ATELIER', 'GROUPE', 'CP', 'LOCATION', 'REPOS', 'REUNION', 
        'SCOLAIRE', 'AUTRE', 'RTQ', 'RTQ+EDS', 'EDV+CP', 'ATELIER+CP', 'GROUPE+CP', 
        'ACCUEIL+CP', 'EDV+GP', 'EDS+AT', 'ATELIER+GP', 'GROUPE+AT', 'CONGES', 'SCOLAIRE+CP'
    ]
};

// --- ÉTAT DE L'APPLICATION ---
let App = {
    config: { ...DEFAULT_CONFIG },
    data: {},
    currentMonth: 'janvier',
    
    // Initialisation complète
    init() {
        this.loadConfig();
        this.loadData();
        this.setupEventListeners();
        console.log('✅ Application initialisée');
    },
    
    // Charger la configuration
    loadConfig() {
        try {
            const saved = localStorage.getItem(APP_CONFIG_KEY);
            if (saved) {
                const config = JSON.parse(saved);
                this.config = { ...DEFAULT_CONFIG, ...config };
            }
        } catch (e) {
            console.error('Erreur chargement config:', e);
            this.config = { ...DEFAULT_CONFIG };
        }
        console.log('Config chargée:', this.config);
    },
    
    // Sauvegarder la configuration
    saveConfig() {
        localStorage.setItem(APP_CONFIG_KEY, JSON.stringify(this.config));
        console.log('Config sauvegardée');
    },
    
    // Charger les données
    loadData() {
        try {
            const saved = localStorage.getItem(APP_STORAGE_KEY);
            if (saved) {
                this.data = JSON.parse(saved);
                // Vérifier que l'année correspond
                if (this.data.year !== this.config.year) {
                    this.data = this.generateYearData();
                }
            } else {
                this.data = this.generateYearData();
            }
        } catch (e) {
            console.error('Erreur chargement données:', e);
            this.data = this.generateYearData();
        }
        this.saveData();
        console.log('Données chargées pour', this.config.year);
    },
    
    // Sauvegarder les données (avec débounce)
    saveData(debounce = true) {
        if (debounce) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = setTimeout(() => {
                localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(this.data));
                console.log('✅ Données sauvegardées');
            }, 300);
        } else {
            localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(this.data));
            console.log('✅ Données sauvegardées (immédiat)');
        }
    },
    
    // Générer les données pour une année
    generateYearData() {
        const data = { year: this.config.year, months: {} };
        MONTHS.forEach((month, idx) => {
            data.months[month] = this.generateMonthData(idx);
        });
        return data;
    },
    
    // Générer les données pour un mois
    generateMonthData(monthIdx) {
        const year = this.config.year;
        const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
        const data = [];
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, monthIdx, day);
            const dateStr = date.toISOString().split('T')[0];
            const dayName = date.toLocaleDateString('fr-FR', { weekday: 'long' });
            const weekNum = this.getISOWeekNumber(dateStr);
            
            const row = {
                date: dateStr,
                day: dayName,
                week: weekNum,
                staff: {}
            };
            
            // Initialiser les données pour chaque moniteur
            this.config.staff.forEach(name => {
                row.staff[name] = {
                    activity: 'ACCUEIL',
                    P: 0,
                    R: 0,
                    get Diff() { return (this.P || 0) - (this.R || 0); }
                };
            });
            
            data.push(row);
        }
        return data;
    },
    
    // Calculer le numéro de semaine ISO
    getISOWeekNumber(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        const dateCopy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayNum = dateCopy.getDay() || 7;
        dateCopy.setDate(dateCopy.getDate() - dayNum + 4);
        const yearStart = new Date(dateCopy.getFullYear(), 0, 1);
        return Math.ceil((((dateCopy - yearStart) / 86400000) + 1) / 7);
    },
    
    // Obtenir les données d'un mois
    getMonthData(monthKey) {
        if (!this.data.months) this.loadData();
        
        // Vérifier que le mois existe
        if (!this.data.months[monthKey]) {
            const monthIdx = MONTHS.indexOf(monthKey);
            if (monthIdx !== -1) {
                this.data.months[monthKey] = this.generateMonthData(monthIdx);
                this.saveData();
            }
        }
        
        // Vérifier que tous les moniteurs sont présents
        const monthData = this.data.months[monthKey] || [];
        if (monthData.length > 0) {
            monthData.forEach(row => {
                if (!row.staff) row.staff = {};
                this.config.staff.forEach(name => {
                    if (!row.staff[name]) {
                        row.staff[name] = {
                            activity: 'ACCUEIL',
                            P: 0,
                            R: 0,
                            get Diff() { return (this.P || 0) - (this.R || 0); }
                        };
                    }
                });
            });
        }
        
        return monthData;
    },
    
    // Mettre à jour une cellule
    updateCell(monthKey, rowIndex, staffName, field, value) {
        const monthData = this.getMonthData(monthKey);
        if (!monthData[rowIndex] || !monthData[rowIndex].staff || !monthData[rowIndex].staff[staffName]) {
            console.error('Cellule introuvable:', monthKey, rowIndex, staffName);
            return false;
        }
        
        monthData[rowIndex].staff[staffName][field] = value;
        this.saveData();
        console.log(`✅ Cellule mise à jour: ${monthKey}[${rowIndex}].${staffName}.${field} = ${value}`);
        return true;
    },
    
    // Supprimer une ligne
    deleteRow(monthKey, rowIndex) {
        const monthData = this.getMonthData(monthKey);
        if (!monthData[rowIndex]) return false;
        
        monthData.splice(rowIndex, 1);
        this.saveData();
        console.log(`✅ Ligne supprimée: ${monthKey}[${rowIndex}]`);
        return true;
    },
    
    // Réinitialiser un mois
    resetMonth(monthKey) {
        const monthIdx = MONTHS.indexOf(monthKey);
        if (monthIdx === -1) return false;
        
        this.data.months[monthKey] = this.generateMonthData(monthIdx);
        this.saveData(false); // Sauvegarde immédiate
        console.log(`✅ Mois réinitialisé: ${monthKey}`);
        return true;
    },
    
    // Réinitialiser toutes les données
    resetAllData() {
        if (confirm('Effacer TOUTES les données ? Cette action est irréversible.')) {
            this.data = this.generateYearData();
            this.saveData(false);
            console.log('✅ Toutes les données réinitialisées');
            return true;
        }
        return false;
    },
    
    // Calculer les totaux pour un mois
    calculateMonthTotals(monthKey) {
        const monthData = this.getMonthData(monthKey);
        const totals = { P: 0, R: 0, Diff: 0 };
        const staffTotals = {};
        
        this.config.staff.forEach(name => {
            staffTotals[name] = { P: 0, R: 0, Diff: 0 };
        });
        
        monthData.forEach(row => {
            this.config.staff.forEach(name => {
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
    },
    
    // Calculer les totaux pour l'année
    calculateYearTotals() {
        const yearTotals = { P: 0, R: 0, Diff: 0 };
        const staffTotals = {};
        const activityTotals = {};
        const monthPR = {};
        
        // Initialiser
        this.config.staff.forEach(name => {
            staffTotals[name] = { P: 0, R: 0, Diff: 0 };
        });
        this.config.activities.forEach(act => {
            activityTotals[act] = 0;
        });
        MONTHS.forEach(m => {
            monthPR[m] = { P: 0, R: 0 };
        });
        
        // Calculer
        MONTHS.forEach(monthKey => {
            const monthData = this.getMonthData(monthKey);
            monthData.forEach(row => {
                this.config.staff.forEach(name => {
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
    },
    
    // Setup des écouteurs d'événements (appelé une seule fois)
    setupEventListeners() {
        // Éviter les doublons
        if (this.eventListenersSetup) return;
        this.eventListenersSetup = true;
        
        // Écouter les changements sur les sélecteurs (délégation d'événements)
        document.addEventListener('change', (e) => {
            // Sélecteurs d'heures (P et R)
            if (e.target.classList.contains('hour-input')) {
                const rowIndex = parseInt(e.target.dataset.row);
                const staffName = e.target.dataset.staff;
                const field = e.target.dataset.field; // 'P' ou 'R'
                const value = parseFloat(e.target.value) || 0;
                
                const monthKey = this.currentMonth;
                this.updateCell(monthKey, rowIndex, staffName, field, value);
                
                // Mettre à jour l'affichage
                if (typeof window.renderMonth === 'function') {
                    window.renderMonth(monthKey);
                }
                if (typeof window.renderBilan === 'function') {
                    window.renderBilan();
                }
            }
            
            // Sélecteurs d'activités
            if (e.target.classList.contains('activity-select')) {
                const rowIndex = parseInt(e.target.dataset.row);
                const staffName = e.target.dataset.staff;
                const activity = e.target.value;
                
                const monthKey = this.currentMonth;
                this.updateCell(monthKey, rowIndex, staffName, 'activity', activity);
            }
        });
        
        // Écouter les clics sur les boutons de suppression
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-row-btn')) {
                const rowIndex = parseInt(e.target.dataset.row);
                const monthKey = this.currentMonth;
                if (confirm(`Supprimer la ligne du ${App.getMonthData(monthKey)[rowIndex]?.date || ''} ?`)) {
                    this.deleteRow(monthKey, rowIndex);
                    if (typeof window.renderMonth === 'function') {
                        window.renderMonth(monthKey);
                    }
                }
            }
        });
    }
};

// Initialiser l'application au chargement
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
} else {
    App.init();
}

// Exporter pour les autres modules
window.App = App;

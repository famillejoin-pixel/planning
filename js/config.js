// ============ Gestion centralisée des paramètres ============

const CONFIG_KEY = 'planning2026_config';
const DATA_KEY = 'planning2026_data';

const MONTHS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
const MONTH_LABELS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

// Valeurs par défaut
let _staffNames = ['Romain', 'Thibau', 'James', 'Swann', 'Soen', 'Cenzo', 'Marine', 'Léa', 'Erwan', 'Marin', 'Marie', 'Nils', 'Florian', 'Iris', 'Mael'];
let _activitesList = ['ACCUEIL', 'EDV', 'EDS', 'ATELIER', 'GROUPE', 'CP', 'LOCATION', 'REPOS', 'REUNION', 'SCOLAIRE', 'AUTRE', 'RTQ', 'RTQ+EDS', 'EDV+CP', 'ATELIER+CP', 'GROUPE+CP', 'ACCUEIL+CP', 'EDV+GP', 'EDS+AT', 'ATELIER+GP', 'GROUPE+AT', 'CONGES', 'SCOLAIRE+CP'];
let _currentYear = 2026;
let _configLoaded = false;

function loadConfig() {
    try {
        const saved = localStorage.getItem(CONFIG_KEY);
        if (saved) {
            const cfg = JSON.parse(saved);
            if (cfg.annee) _currentYear = parseInt(cfg.annee) || 2026;
            if (cfg.staff) {
                const names = cfg.staff.split(',').map(s => s.trim()).filter(s => s);
                if (names.length) _staffNames = names;
            }
            if (cfg.activites) {
                const acts = cfg.activites.split('\n').map(s => s.trim()).filter(s => s);
                if (acts.length) _activitesList = acts;
            }
            _configLoaded = true;
            return cfg;
        }
    } catch(e) {
        console.error('Erreur chargement config:', e);
    }
    _configLoaded = true;
    return null;
}

function saveConfig(cfg) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
    // Recharger immédiatement les valeurs
    loadConfig();
}

function getStaffNames() { 
    if (!_configLoaded) loadConfig();
    return _staffNames; 
}

function getActivitesList() { 
    if (!_configLoaded) loadConfig();
    return _activitesList; 
}

function getCurrentYear() { 
    if (!_configLoaded) loadConfig();
    return _currentYear; 
}

function refreshConfig() {
    _configLoaded = false;
    loadConfig();
}

// Forcer le chargement initial
loadConfig();
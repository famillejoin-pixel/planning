// ============ CONFIGURATION CENTRALISÉE ============
// Ce fichier est gardé pour compatibilité, mais la configuration est maintenant dans app.js

// Exporter les constantes pour compatibilité
const MONTHS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
const MONTH_LABELS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

// Fonctions de compatibilité (appellent maintenant App)
function getStaffNames() {
    return App.config.staff || [];
}

function getActivitesList() {
    return App.config.activities || [];
}

function getCurrentYear() {
    return App.config.year || 2026;
}

function loadConfig() {
    App.loadConfig();
}

function saveConfig(cfg) {
    App.config = { ...App.config, ...cfg };
    App.saveConfig();
}

// Exporter pour les autres scripts
window.MONTHS = MONTHS;
window.MONTH_LABELS = MONTH_LABELS;

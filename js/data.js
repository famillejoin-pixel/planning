// ============ Gestion des données de planning ============

let _planningData = {};
let _dataLoaded = false;

function loadPlanningData(year) {
    const currentYear = year || getCurrentYear();
    try {
        const saved = localStorage.getItem(DATA_KEY);
        if (saved) {
            _planningData = JSON.parse(saved);
            // Vérifier si les données correspondent à l'année
            if (_planningData._year !== currentYear) {
                console.log('Année différente, régénération des données');
                _planningData = {};
                MONTHS.forEach((m, idx) => { 
                    _planningData[m] = generateMonthData(idx, currentYear); 
                });
                _planningData._year = currentYear;
            }
            // S'assurer que tous les mois existent
            MONTHS.forEach(m => { 
                if (!_planningData[m]) {
                    const idx = MONTHS.indexOf(m);
                    _planningData[m] = generateMonthData(idx, currentYear);
                }
            });
        } else {
            console.log('Aucune donnée trouvée, génération initiale');
            _planningData = {};
            MONTHS.forEach((m, idx) => { 
                _planningData[m] = generateMonthData(idx, currentYear); 
            });
            _planningData._year = currentYear;
        }
    } catch (e) {
        console.error('Erreur chargement données:', e);
        _planningData = {};
        MONTHS.forEach((m, idx) => { 
            _planningData[m] = generateMonthData(idx, currentYear); 
        });
        _planningData._year = currentYear;
    }
    _dataLoaded = true;
    savePlanningData();
    return _planningData;
}

function savePlanningData() {
    _planningData._year = getCurrentYear();
    localStorage.setItem(DATA_KEY, JSON.stringify(_planningData));
    console.log('Données sauvegardées - Mois:', Object.keys(_planningData).filter(k => k !== '_year').length);
    console.log('Staff dans les données:', Object.keys(_planningData['janvier']?.[0]?.staff || {}));
}

function getPlanningData() { 
    if (!_dataLoaded) loadPlanningData(getCurrentYear());
    // Recharger depuis localStorage pour être sûr
    const saved = localStorage.getItem(DATA_KEY);
    if (saved) {
        try {
            _planningData = JSON.parse(saved);
        } catch(e) {}
    }
    return _planningData; 
}

function getMonthData(monthKey) { 
    // Forcer le rechargement des données
    const allData = getPlanningData();
    const data = allData[monthKey] || [];
    // Vérifier que les données contiennent les bons moniteurs
    const staff = getStaffNames();
    if (data.length > 0) {
        const firstRow = data[0];
        if (firstRow.staff) {
            const existingStaff = Object.keys(firstRow.staff);
            // Si les moniteurs ont changé, mettre à jour
            if (existingStaff.length !== staff.length || !staff.every(s => existingStaff.includes(s))) {
                console.log('Mise à jour des moniteurs pour', monthKey);
                data.forEach(row => {
                    if (!row.staff) row.staff = {};
                    staff.forEach(name => {
                        if (!row.staff[name]) {
                            row.staff[name] = { activite: 'ACCUEIL', P: 0, R: 0, Diff: 0 };
                        }
                    });
                });
                setMonthData(monthKey, data);
            }
        }
    }
    return data; 
}

function setMonthData(monthKey, data) { 
    const allData = getPlanningData();
    allData[monthKey] = data;
    allData._year = getCurrentYear();
    localStorage.setItem(DATA_KEY, JSON.stringify(allData));
    _planningData = allData;
    console.log(`Données du mois ${monthKey} sauvegardées (${data.length} lignes)`);
    console.log(`Staff pour ${monthKey}:`, Object.keys(data[0]?.staff || {}));
}

function generateMonthData(monthIdx, year) {
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
    const data = [];
    const staff = getStaffNames();
    console.log('Génération des données avec staff:', staff);
    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, monthIdx, d);
        const dateStr = date.toISOString().split('T')[0];
        const jour = date.toLocaleDateString('fr-FR', { weekday: 'long' });
        const semaine = getISOWeekNumber(dateStr);
        const staffData = {};
        staff.forEach(name => {
            staffData[name] = { activite: 'ACCUEIL', P: 0, R: 0, Diff: 0 };
        });
        data.push({
            date: dateStr,
            jour: jour,
            semaine: semaine,
            staff: staffData
        });
    }
    return data;
}

function getISOWeekNumber(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const dateCopy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayNum = dateCopy.getDay() || 7;
    dateCopy.setDate(dateCopy.getDate() - dayNum + 4);
    const yearStart = new Date(dateCopy.getFullYear(), 0, 1);
    return Math.ceil((((dateCopy - yearStart) / 86400000) + 1) / 7);
}

function refreshData() {
    _dataLoaded = false;
    return loadPlanningData(getCurrentYear());
}

// Forcer le chargement initial
loadPlanningData(getCurrentYear());
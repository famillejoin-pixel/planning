// ============ Gestion des données de planning ============

let _planningData = {};
let _dataLoaded = false;
let _dataCache = null;
let _cacheTimestamp = 0;
const CACHE_TTL = 5000; // 5 secondes
let _saveTimeout = null;

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
    _dataCache = _planningData;
    _cacheTimestamp = Date.now();
    savePlanningData();
    return _planningData;
}

function savePlanningData() {
    _planningData._year = getCurrentYear();
    
    // Compresser les données pour économiser de l'espace
    const compressedData = {
        _year: _planningData._year,
        ...Object.fromEntries(
            Object.entries(_planningData).map(([month, data]) => {
                if (month === '_year') return [month, data];
                return [
                    month,
                    data.map(row => ({
                        date: row.date,
                        jour: row.jour,
                        semaine: row.semaine,
                        staff: Object.fromEntries(
                            Object.entries(row.staff || {}).map(([name, s]) => [
                                name,
                                { a: s.activite || 'ACCUEIL', P: s.P || 0, R: s.R || 0 }
                            ])
                        )
                    }))
                ];
            })
        )
    };
    
    localStorage.setItem(DATA_KEY, JSON.stringify(compressedData));
    console.log('Données sauvegardées - Mois:', Object.keys(_planningData).filter(k => k !== '_year').length);
    console.log('Staff dans les données:', Object.keys(_planningData['janvier']?.[0]?.staff || {}));
}

function getPlanningData(forceReload = false) {
    const now = Date.now();
    if (!_dataLoaded || forceReload || (now - _cacheTimestamp) > CACHE_TTL) {
        _dataLoaded = false;
        loadPlanningData(getCurrentYear());
        _cacheTimestamp = now;
    }
    // Recharger depuis localStorage pour être sûr
    const saved = localStorage.getItem(DATA_KEY);
    if (saved) {
        try {
            const decompressedData = JSON.parse(saved);
            // Décompresser les données
            _planningData = {
                _year: decompressedData._year,
                ...Object.fromEntries(
                    Object.entries(decompressedData).map(([month, data]) => {
                        if (month === '_year') return [month, data];
                        return [
                            month,
                            data.map(row => ({
                                date: row.date,
                                jour: row.jour,
                                semaine: row.semaine,
                                staff: Object.fromEntries(
                                    Object.entries(row.staff || {}).map(([name, s]) => [
                                        name,
                                        { activite: s.a || 'ACCUEIL', P: s.P || 0, R: s.R || 0, Diff: (s.P || 0) - (s.R || 0) }
                                    ])
                                )
                            }))
                        ];
                    })
                )
            };
            _dataCache = _planningData;
        } catch(e) {
            console.error('Erreur parsing données:', e);
        }
    }
    return _planningData; 
}

function getMonthData(monthKey) { 
    // Forcer le rechargement des données
    const allData = getPlanningData();
    let data = allData[monthKey] || [];
    
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
    _planningData = allData;
    _dataCache = allData;
    _cacheTimestamp = Date.now();

    // Débounce la sauvegarde
    clearTimeout(_saveTimeout);
    _saveTimeout = setTimeout(() => {
        localStorage.setItem(DATA_KEY, JSON.stringify({
            _year: allData._year,
            ...Object.fromEntries(
                Object.entries(allData).map(([month, d]) => {
                    if (month === '_year') return [month, d];
                    return [
                        month,
                        d.map(row => ({
                            date: row.date,
                            jour: row.jour,
                            semaine: row.semaine,
                            staff: Object.fromEntries(
                                Object.entries(row.staff || {}).map(([name, s]) => [
                                    name,
                                    { a: s.activite || 'ACCUEIL', P: s.P || 0, R: s.R || 0 }
                                ])
                            )
                        }))
                    ];
                })
            )
        }));
        console.log(`Données du mois ${monthKey} sauvegardées (${data.length} lignes)`);
    }, 300); // Attendre 300ms après la dernière modification
}

function generateMonthData(monthIdx, year) {
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
    const data = [];
    const staff = getStaffNames() || _staffNames; // Fallback aux valeurs par défaut
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
    _dataCache = null;
    return loadPlanningData(getCurrentYear());
}

// Forcer le chargement initial
loadPlanningData(getCurrentYear());

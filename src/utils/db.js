// LocalStorage Database and Seeding Utility

const KEYS = {
  PROFILES_LIST: 'AURA_DIET_PROFILES_LIST_V3',
  CURRENT_PROFILE_ID: 'AURA_DIET_CURRENT_PROFILE_ID_V3',
  PROFILE: (id) => `AURA_DIET_PROFILE_${id}_V3`,
  LOGS: (id) => `AURA_DIET_LOGS_${id}_V3`,
  GROCERIES: (id) => `AURA_DIET_GROCERIES_${id}_V3`,
  DIET_PLAN: (id) => `AURA_DIET_DIET_PLAN_${id}_V3`
};

// Formats date as YYYY-MM-DD in local time
export const formatDate = (date) => {
  const d = new Date(date);
  const month = '' + (d.getMonth() + 1);
  const day = '' + d.getDate();
  const year = d.getFullYear();

  return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
};

// Generates an array of last N date strings
export const getLastNDates = (n) => {
  const dates = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(formatDate(d));
  }
  return dates;
};

export const getCurrentProfileId = () => {
  return localStorage.getItem(KEYS.CURRENT_PROFILE_ID);
};

export const setCurrentProfileId = (id) => {
  if (id) {
    localStorage.setItem(KEYS.CURRENT_PROFILE_ID, id);
  } else {
    localStorage.removeItem(KEYS.CURRENT_PROFILE_ID);
  }
};

export const getProfilesList = () => {
  let list = JSON.parse(localStorage.getItem(KEYS.PROFILES_LIST));
  if (!list || list.length === 0) {
    list = [
      { id: 'jithu', name: 'Jithu', avatarColor: 'hsl(160, 84%, 39%)' }
    ];
    localStorage.setItem(KEYS.PROFILES_LIST, JSON.stringify(list));
  }
  return list;
};

export const createProfile = (name) => {
  const list = getProfilesList();
  const newId = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
  const newProfile = {
    id: newId,
    name,
    avatarColor: `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`
  };
  list.push(newProfile);
  localStorage.setItem(KEYS.PROFILES_LIST, JSON.stringify(list));
  return newProfile;
};

// Helper: Seed Initial Data
const seedDatabase = (id) => {
  // 1. Initial Profile
  const list = JSON.parse(localStorage.getItem(KEYS.PROFILES_LIST)) || [];
  const found = list.find(p => p.id === id);
  const name = found ? found.name : (id.charAt(0).toUpperCase() + id.slice(1));

  const defaultProfile = {
    name,
    apiKey: '', // Left blank so user inputs their own
    height: 178, // cm
    weight: 82.5, // kg
    targetWeight: 75.0, // kg
    monthlyTargetWeightChange: -2.0, // kg per month (- is lose, + is gain)
    activityLevel: 'moderately_active',
    workoutHours: 5, // hours per week
    targets: {
      calories: 2000,
      protein: 150, // grams
      carbs: 180, // grams
      fat: 60, // grams
      fiber: 30 // grams
    },
    setupCompleted: id === 'jithu' // Jithu starts setup-complete so clicking immediately enters home
  };
  localStorage.setItem(KEYS.PROFILE(id), JSON.stringify(defaultProfile));

  // 2. Initial Logs (empty)
  localStorage.setItem(KEYS.LOGS(id), JSON.stringify({}));

  // 3. Initial Grocery Checklist (empty)
  localStorage.setItem(KEYS.GROCERIES(id), JSON.stringify([]));

  // 4. Initial Diet Plan (empty)
  localStorage.setItem(KEYS.DIET_PLAN(id), JSON.stringify(null));
};

// Check if first-run initialization is needed
export const initDB = () => {
  const id = getCurrentProfileId();
  if (id && !localStorage.getItem(KEYS.PROFILE(id))) {
    seedDatabase(id);
  }
};

// --- PROFILE CRUD ---
export const getProfile = () => {
  const id = getCurrentProfileId();
  if (!id) return null;
  initDB();
  return JSON.parse(localStorage.getItem(KEYS.PROFILE(id)));
};

export const saveProfile = (profile) => {
  const id = getCurrentProfileId();
  if (!id) return;
  localStorage.setItem(KEYS.PROFILE(id), JSON.stringify(profile));
};

// --- LOGS CRUD ---
export const getLogs = () => {
  const id = getCurrentProfileId();
  if (!id) return {};
  initDB();
  return JSON.parse(localStorage.getItem(KEYS.LOGS(id))) || {};
};

export const saveLogs = (logs) => {
  const id = getCurrentProfileId();
  if (!id) return;
  localStorage.setItem(KEYS.LOGS(id), JSON.stringify(logs));
};

// Helper: Get single day log
export const getDayLog = (dateStr) => {
  const logs = getLogs();
  if (!logs[dateStr]) {
    logs[dateStr] = {
      meals: [],
      water: 0,
      weight: getLatestWeight(),
      workout: { hours: 0, caloriesBurned: 0, source: 'Manual' },
      mealSchedule: { breakfast: 'pending', lunch: 'pending', snacks: 'pending', dinner: 'pending' }
    };
    saveLogs(logs);
  } else if (!logs[dateStr].mealSchedule) {
    logs[dateStr].mealSchedule = { breakfast: 'pending', lunch: 'pending', snacks: 'pending', dinner: 'pending' };
    saveLogs(logs);
  }
  return logs[dateStr];
};

// Helper: Save single day log
export const saveDayLog = (dateStr, dayData) => {
  const logs = getLogs();
  logs[dateStr] = dayData;
  saveLogs(logs);
};

// Helper: Get latest weight
export const getLatestWeight = () => {
  const logs = getLogs();
  const sortedDates = Object.keys(logs).sort().reverse();
  for (let date of sortedDates) {
    if (logs[date]?.weight) {
      return logs[date].weight;
    }
  }
  const profile = getProfile();
  return profile ? profile.weight : 75;
};

// --- GROCERY LIST CRUD ---
export const getGroceries = () => {
  const id = getCurrentProfileId();
  if (!id) return [];
  initDB();
  return JSON.parse(localStorage.getItem(KEYS.GROCERIES(id))) || [];
};

export const saveGroceries = (list) => {
  const id = getCurrentProfileId();
  if (!id) return;
  localStorage.setItem(KEYS.GROCERIES(id), JSON.stringify(list));
};

// --- DIET PLAN CRUD ---
export const getDietPlan = () => {
  const id = getCurrentProfileId();
  if (!id) return null;
  initDB();
  return JSON.parse(localStorage.getItem(KEYS.DIET_PLAN(id)));
};

export const saveDietPlan = (plan) => {
  const id = getCurrentProfileId();
  if (!id) return;
  localStorage.setItem(KEYS.DIET_PLAN(id), JSON.stringify(plan));
};

// --- GENERAL RESET ---
export const resetDB = () => {
  const id = getCurrentProfileId();
  if (!id) return;
  localStorage.removeItem(KEYS.PROFILE(id));
  localStorage.removeItem(KEYS.LOGS(id));
  localStorage.removeItem(KEYS.GROCERIES(id));
  localStorage.removeItem(KEYS.DIET_PLAN(id));
  seedDatabase(id);
};

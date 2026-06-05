// LocalStorage Database and Seeding Utility

const KEYS = {
  PROFILE: 'AURA_DIET_PROFILE',
  LOGS: 'AURA_DIET_LOGS',
  GROCERIES: 'AURA_DIET_GROCERIES',
  DIET_PLAN: 'AURA_DIET_DIET_PLAN'
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

// Helper: Seed Initial Data
const seedDatabase = () => {
  // 1. Initial Profile
  const defaultProfile = {
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
    setupCompleted: false
  };
  localStorage.setItem(KEYS.PROFILE, JSON.stringify(defaultProfile));

  // 2. Initial Logs (empty)
  localStorage.setItem(KEYS.LOGS, JSON.stringify({}));

  // 3. Initial Grocery Checklist (empty)
  localStorage.setItem(KEYS.GROCERIES, JSON.stringify([]));

  // 4. Initial Diet Plan (empty)
  localStorage.setItem(KEYS.DIET_PLAN, JSON.stringify(null));
};

// Check if first-run initialization is needed
export const initDB = () => {
  if (!localStorage.getItem(KEYS.PROFILE)) {
    seedDatabase();
  }
};

// --- PROFILE CRUD ---
export const getProfile = () => {
  initDB();
  return JSON.parse(localStorage.getItem(KEYS.PROFILE));
};

export const saveProfile = (profile) => {
  localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
};

// --- LOGS CRUD ---
export const getLogs = () => {
  initDB();
  return JSON.parse(localStorage.getItem(KEYS.LOGS)) || {};
};

export const saveLogs = (logs) => {
  localStorage.setItem(KEYS.LOGS, JSON.stringify(logs));
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
  initDB();
  return JSON.parse(localStorage.getItem(KEYS.GROCERIES)) || [];
};

export const saveGroceries = (list) => {
  localStorage.setItem(KEYS.GROCERIES, JSON.stringify(list));
};

// --- DIET PLAN CRUD ---
export const getDietPlan = () => {
  initDB();
  return JSON.parse(localStorage.getItem(KEYS.DIET_PLAN));
};

export const saveDietPlan = (plan) => {
  localStorage.setItem(KEYS.DIET_PLAN, JSON.stringify(plan));
};

// --- GENERAL RESET ---
export const resetDB = () => {
  localStorage.removeItem(KEYS.PROFILE);
  localStorage.removeItem(KEYS.LOGS);
  localStorage.removeItem(KEYS.GROCERIES);
  localStorage.removeItem(KEYS.DIET_PLAN);
  seedDatabase();
};

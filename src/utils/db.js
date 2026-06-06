// Remote Redis Database Utility via API Proxy

// Vercel KV / Upstash Redis Command Runner over HTTP
const runKVCommand = async (command) => {
  try {
    const isGet = command[0] === 'GET';
    const method = isGet ? 'GET' : 'POST';
    const url = isGet 
      ? `/api/db?key=${encodeURIComponent(command[1])}`
      : '/api/db';
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    if (!isGet) {
      options.body = JSON.stringify({
        cmd: command[0],
        key: command[1],
        value: command[2]
      });
    }

    const res = await fetch(url, options);
    if (!res.ok) {
      console.warn(`Serverless DB API Error: HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    return data.result;
  } catch (err) {
    console.warn("Database API is currently unreachable. Falling back to local storage.", err);
    return null;
  }
};

const isKVConfigured = true; // Enabled by default to use the /api/db proxy

export const KEYS = {
  PROFILES_LIST: 'AURA_DIET_PROFILES_LIST_V3',
  CURRENT_PROFILE_ID: 'AURA_DIET_CURRENT_PROFILE_ID_V3',
  PROFILE: (id) => `AURA_DIET_PROFILE_${id}_V3`,
  LOGS: (id) => `AURA_DIET_LOGS_${id}_V3`,
  GROCERIES: (id) => `AURA_DIET_GROCERIES_${id}_V3`,
  DIET_PLAN: (id) => `AURA_DIET_DIET_PLAN_${id}_V3`
};

// Caches for synchronous access by UI components
let cachedProfilesList = null;
let cachedProfile = null;
let cachedLogs = null;
let cachedGroceries = null;
let cachedDietPlan = null;
let lastLoadedProfileId = null;

// Invalidate cache if switching profiles
const checkProfileSwitch = (id) => {
  if (id !== lastLoadedProfileId) {
    cachedProfile = null;
    cachedLogs = null;
    cachedGroceries = null;
    cachedDietPlan = null;
    lastLoadedProfileId = id;
  }
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

export const getProfilesList = async () => {
  if (cachedProfilesList) return cachedProfilesList;

  if (isKVConfigured) {
    const res = await runKVCommand(['GET', 'auradiet:profiles']);
    if (res) {
      cachedProfilesList = JSON.parse(res);
      return cachedProfilesList;
    }
  }

  // Fallback to localStorage
  let list = JSON.parse(localStorage.getItem(KEYS.PROFILES_LIST));
  if (!list || list.length === 0) {
    list = [
      { id: 'jithu', name: 'Jithu', avatarColor: 'hsl(160, 84%, 39%)' }
    ];
    localStorage.setItem(KEYS.PROFILES_LIST, JSON.stringify(list));
  }
  cachedProfilesList = list;
  return list;
};

export const createProfile = async (name) => {
  const newId = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
  const newProfile = {
    id: newId,
    name,
    avatarColor: `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`
  };

  const list = await getProfilesList();
  list.push(newProfile);
  cachedProfilesList = list;

  if (isKVConfigured) {
    await runKVCommand(['SET', 'auradiet:profiles', JSON.stringify(list)]);
    
    // Seed database for new profile
    const defaultProfile = {
      name,
      apiKey: '',
      height: 178,
      weight: 82.5,
      targetWeight: 75.0,
      monthlyTargetWeightChange: -2.0,
      activityLevel: 'moderately_active',
      workoutHours: 5,
      targets: {
        calories: 2000,
        protein: 150,
        carbs: 180,
        fat: 60,
        fiber: 30
      },
      setupCompleted: false,
      lastUpdated: Date.now()
    };
    await runKVCommand(['SET', `auradiet:profile:${newId}`, JSON.stringify(defaultProfile)]);
    await runKVCommand(['SET', `auradiet:logs:${newId}`, JSON.stringify({})]);
    await runKVCommand(['SET', `auradiet:groceries:${newId}`, JSON.stringify([])]);
    await runKVCommand(['SET', `auradiet:dietPlan:${newId}`, JSON.stringify(null)]);
  } else {
    // LocalStorage fallback
    localStorage.setItem(KEYS.PROFILES_LIST, JSON.stringify(list));
    
    const defaultProfile = {
      name,
      apiKey: '',
      height: 178,
      weight: 82.5,
      targetWeight: 75.0,
      monthlyTargetWeightChange: -2.0,
      activityLevel: 'moderately_active',
      workoutHours: 5,
      targets: {
        calories: 2000,
        protein: 150,
        carbs: 180,
        fat: 60,
        fiber: 30
      },
      setupCompleted: false,
      lastUpdated: Date.now()
    };
    localStorage.setItem(KEYS.PROFILE(newId), JSON.stringify(defaultProfile));
    localStorage.setItem(KEYS.LOGS(newId), JSON.stringify({}));
    localStorage.setItem(KEYS.GROCERIES(newId), JSON.stringify([]));
    localStorage.setItem(KEYS.DIET_PLAN(newId), JSON.stringify(null));
  }

  return newProfile;
};

export const deleteProfile = async (id) => {
  let list = await getProfilesList();
  list = list.filter(p => p.id !== id);
  cachedProfilesList = list;

  if (isKVConfigured) {
    await runKVCommand(['SET', 'auradiet:profiles', JSON.stringify(list)]);
    await runKVCommand(['DEL', `auradiet:profile:${id}`]);
    await runKVCommand(['DEL', `auradiet:logs:${id}`]);
    await runKVCommand(['DEL', `auradiet:groceries:${id}`]);
    await runKVCommand(['DEL', `auradiet:dietPlan:${id}`]);
  } else {
    localStorage.setItem(KEYS.PROFILES_LIST, JSON.stringify(list));
    localStorage.removeItem(KEYS.PROFILE(id));
    localStorage.removeItem(KEYS.LOGS(id));
    localStorage.removeItem(KEYS.GROCERIES(id));
    localStorage.removeItem(KEYS.DIET_PLAN(id));
  }

  if (localStorage.getItem(KEYS.CURRENT_PROFILE_ID) === id) {
    localStorage.removeItem(KEYS.CURRENT_PROFILE_ID);
  }
};

// Helper: Seed Initial Data
const seedDatabase = async (id) => {
  const list = await getProfilesList();
  const found = list.find(p => p.id === id);
  const name = found ? found.name : (id.charAt(0).toUpperCase() + id.slice(1));

  const defaultProfile = {
    name,
    apiKey: '',
    height: 178,
    weight: 82.5,
    targetWeight: 75.0,
    monthlyTargetWeightChange: -2.0,
    activityLevel: 'moderately_active',
    workoutHours: 5,
    targets: {
      calories: 2000,
      protein: 150,
      carbs: 180,
      fat: 60,
      fiber: 30
    },
    setupCompleted: id === 'jithu',
    lastUpdated: Date.now()
  };

  if (isKVConfigured) {
    await runKVCommand(['SET', `auradiet:profile:${id}`, JSON.stringify(defaultProfile)]);
    await runKVCommand(['SET', `auradiet:logs:${id}`, JSON.stringify({})]);
    await runKVCommand(['SET', `auradiet:groceries:${id}`, JSON.stringify([])]);
    await runKVCommand(['SET', `auradiet:dietPlan:${id}`, JSON.stringify(null)]);
  } else {
    localStorage.setItem(KEYS.PROFILE(id), JSON.stringify(defaultProfile));
    localStorage.setItem(KEYS.LOGS(id), JSON.stringify({}));
    localStorage.setItem(KEYS.GROCERIES(id), JSON.stringify([]));
    localStorage.setItem(KEYS.DIET_PLAN(id), JSON.stringify(null));
  }

  cachedProfile = defaultProfile;
  cachedLogs = {};
  cachedGroceries = [];
  cachedDietPlan = null;
};

// --- PROFILE CRUD ---
export const getProfile = async () => {
  const id = getCurrentProfileId();
  if (!id) return null;
  checkProfileSwitch(id);

  if (cachedProfile) return cachedProfile;

  if (isKVConfigured) {
    const res = await runKVCommand(['GET', `auradiet:profile:${id}`]);
    if (res) {
      cachedProfile = JSON.parse(res);
      return cachedProfile;
    }
  } else {
    const local = localStorage.getItem(KEYS.PROFILE(id));
    if (local) {
      cachedProfile = JSON.parse(local);
      return cachedProfile;
    }
  }

  // Not found, seed default
  await seedDatabase(id);
  return cachedProfile;
};

export const saveProfile = async (profile) => {
  const id = getCurrentProfileId();
  if (!id) return;
  checkProfileSwitch(id);
  cachedProfile = profile;

  if (isKVConfigured) {
    await runKVCommand(['SET', `auradiet:profile:${id}`, JSON.stringify(profile)]);
  } else {
    localStorage.setItem(KEYS.PROFILE(id), JSON.stringify(profile));
  }
};

// --- LOGS CRUD ---
export const getLogs = async () => {
  const id = getCurrentProfileId();
  if (!id) return {};
  checkProfileSwitch(id);

  if (cachedLogs) return cachedLogs;

  if (isKVConfigured) {
    const res = await runKVCommand(['GET', `auradiet:logs:${id}`]);
    if (res) {
      cachedLogs = JSON.parse(res) || {};
      return cachedLogs;
    }
  } else {
    const local = localStorage.getItem(KEYS.LOGS(id));
    if (local) {
      cachedLogs = JSON.parse(local) || {};
      return cachedLogs;
    }
  }

  // Seed default if not found
  await seedDatabase(id);
  return cachedLogs || {};
};

export const saveLogs = async (logs) => {
  const id = getCurrentProfileId();
  if (!id) return;
  checkProfileSwitch(id);
  cachedLogs = logs;

  if (isKVConfigured) {
    await runKVCommand(['SET', `auradiet:logs:${id}`, JSON.stringify(logs)]);
  } else {
    localStorage.setItem(KEYS.LOGS(id), JSON.stringify(logs));
  }
};

// Helper: Get single day log (Synchronous reading from cache)
export const getDayLog = (dateStr) => {
  const logs = cachedLogs || {};
  if (!logs[dateStr]) {
    logs[dateStr] = {
      meals: [],
      water: 0,
      weight: getLatestWeight(),
      workout: { hours: 0, caloriesBurned: 0, source: 'Manual' },
      mealSchedule: { breakfast: 'pending', lunch: 'pending', snacks: 'pending', dinner: 'pending' }
    };
    // Cache it, save to DB asynchronously
    cachedLogs = logs;
    saveLogs(logs);
  } else if (!logs[dateStr].mealSchedule) {
    logs[dateStr].mealSchedule = { breakfast: 'pending', lunch: 'pending', snacks: 'pending', dinner: 'pending' };
    cachedLogs = logs;
    saveLogs(logs);
  }
  return logs[dateStr];
};

// Helper: Save single day log (Updates cache and triggers async DB save)
export const saveDayLog = (dateStr, dayData) => {
  const logs = cachedLogs || {};
  logs[dateStr] = dayData;
  cachedLogs = logs;
  saveLogs(logs);
};

// Helper: Get latest weight (Synchronous reading from cache)
export const getLatestWeight = () => {
  const logs = cachedLogs || {};
  const sortedDates = Object.keys(logs).sort().reverse();
  for (let date of sortedDates) {
    if (logs[date]?.weight) {
      return logs[date].weight;
    }
  }
  const profile = cachedProfile;
  return profile ? profile.weight : 75;
};

// --- GROCERY LIST CRUD ---
export const getGroceries = async () => {
  const id = getCurrentProfileId();
  if (!id) return [];
  checkProfileSwitch(id);

  if (cachedGroceries) return cachedGroceries;

  if (isKVConfigured) {
    const res = await runKVCommand(['GET', `auradiet:groceries:${id}`]);
    if (res) {
      cachedGroceries = JSON.parse(res) || [];
      return cachedGroceries;
    }
  } else {
    const local = localStorage.getItem(KEYS.GROCERIES(id));
    if (local) {
      cachedGroceries = JSON.parse(local) || [];
      return cachedGroceries;
    }
  }

  await seedDatabase(id);
  return cachedGroceries || [];
};

export const saveGroceries = async (list) => {
  const id = getCurrentProfileId();
  if (!id) return;
  checkProfileSwitch(id);
  cachedGroceries = list;

  if (isKVConfigured) {
    await runKVCommand(['SET', `auradiet:groceries:${id}`, JSON.stringify(list)]);
  } else {
    localStorage.setItem(KEYS.GROCERIES(id), JSON.stringify(list));
  }
};

// --- DIET PLAN CRUD ---
export const getDietPlan = async () => {
  const id = getCurrentProfileId();
  if (!id) return null;
  checkProfileSwitch(id);

  if (cachedDietPlan) return cachedDietPlan;

  if (isKVConfigured) {
    const res = await runKVCommand(['GET', `auradiet:dietPlan:${id}`]);
    if (res) {
      cachedDietPlan = JSON.parse(res);
      return cachedDietPlan;
    }
  } else {
    const local = localStorage.getItem(KEYS.DIET_PLAN(id));
    if (local) {
      cachedDietPlan = JSON.parse(local);
      return cachedDietPlan;
    }
  }

  await seedDatabase(id);
  return cachedDietPlan;
};

export const saveDietPlan = async (plan) => {
  const id = getCurrentProfileId();
  if (!id) return;
  checkProfileSwitch(id);
  cachedDietPlan = plan;

  if (isKVConfigured) {
    await runKVCommand(['SET', `auradiet:dietPlan:${id}`, JSON.stringify(plan)]);
  } else {
    localStorage.setItem(KEYS.DIET_PLAN(id), JSON.stringify(plan));
  }
};

// --- GENERAL RESET ---
export const resetDB = async () => {
  const id = getCurrentProfileId();
  if (!id) return;
  
  cachedProfile = null;
  cachedLogs = null;
  cachedGroceries = null;
  cachedDietPlan = null;

  if (isKVConfigured) {
    await runKVCommand(['DEL', `auradiet:profile:${id}`]);
    await runKVCommand(['DEL', `auradiet:logs:${id}`]);
    await runKVCommand(['DEL', `auradiet:groceries:${id}`]);
    await runKVCommand(['DEL', `auradiet:dietPlan:${id}`]);
  } else {
    localStorage.removeItem(KEYS.PROFILE(id));
    localStorage.removeItem(KEYS.LOGS(id));
    localStorage.removeItem(KEYS.GROCERIES(id));
    localStorage.removeItem(KEYS.DIET_PLAN(id));
  }
  await seedDatabase(id);
};


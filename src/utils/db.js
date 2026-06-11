import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if Supabase keys are configured and are not the placeholder strings
const isSupabaseConfigured = 
  supabaseUrl && 
  supabaseKey && 
  !supabaseUrl.includes("your-project-id") && 
  !supabaseKey.includes("your-public-anon-key");

let supabase = null;
let isUsingDatabase = false;

if (isSupabaseConfigured) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    isUsingDatabase = true;
  } catch (err) {
    console.error("Failed to initialize Supabase client:", err);
  }
}

export const checkDbConnected = () => {
  return isUsingDatabase;
};

// Key-Value Style command handler using Supabase PostgreSQL table 'kv_store'
const runKVCommand = async (command) => {
  if (!isUsingDatabase || !supabase) {
    return null;
  }

  try {
    const [cmd, key, value] = command;

    if (cmd === 'GET') {
      const { data, error } = await supabase
        .from('kv_store')
        .select('value')
        .eq('key', key)
        .maybeSingle();

      if (error) {
        console.warn("Supabase query error (possibly missing kv_store table):", error.message);
        return null;
      }
      if (!data) return null;
      return typeof data.value === 'string' ? data.value : JSON.stringify(data.value);
    } 
    
    if (cmd === 'SET') {
      let parsedVal = value;
      try {
        const parsed = JSON.parse(value);
        if (parsed !== null && parsed !== undefined) {
          parsedVal = parsed;
        }
      } catch (e) {
        // keep string
      }

      const { error } = await supabase
        .from('kv_store')
        .upsert({ key, value: parsedVal });

      if (error) {
        console.warn("Supabase upsert error:", error.message);
        return null;
      }
      return 'OK';
    } 
    
    if (cmd === 'DEL') {
      const { error } = await supabase
        .from('kv_store')
        .delete()
        .eq('key', key);

      if (error) {
        console.warn("Supabase delete error:", error.message);
        return null;
      }
      return 1;
    }

    return null;
  } catch (err) {
    console.warn("Supabase connection interrupted. Falling back to local storage.", err);
    return null;
  }
};

const isKVConfigured = isUsingDatabase; // True only if Supabase keys are provided


export const KEYS = {
  PROFILES_LIST: 'AURA_DIET_PROFILES_LIST_V4',
  CURRENT_PROFILE_ID: 'AURA_DIET_CURRENT_PROFILE_ID_V4',
  PROFILE: (id) => `AURA_DIET_PROFILE_${id}_V4`,
  LOGS: (id) => `AURA_DIET_LOGS_${id}_V4`,
  GROCERIES: (id) => `AURA_DIET_GROCERIES_${id}_V4`,
  DIET_PLAN: (id) => `AURA_DIET_DIET_PLAN_${id}_V4`,
  WEEKLY_REPORTS: (id) => `AURA_DIET_WEEKLY_REPORTS_${id}_V4`,
  ACHIEVEMENTS: (id) => `AURA_DIET_ACHIEVEMENTS_${id}_V4`,
  CHAT_HISTORY: (id) => `AURA_DIET_CHAT_HISTORY_${id}_V4`
};

// Caches for synchronous access by UI components
let cachedProfilesList = null;
let cachedProfile = null;
let cachedLogs = null;
let cachedGroceries = null;
let cachedDietPlan = null;
let cachedWeeklyReports = null;
let cachedAchievements = null;
let cachedChatHistory = null;
let lastLoadedProfileId = null;

// Invalidate cache if switching profiles
const checkProfileSwitch = (id) => {
  if (id !== lastLoadedProfileId) {
    cachedProfile = null;
    cachedLogs = null;
    cachedGroceries = null;
    cachedDietPlan = null;
    cachedWeeklyReports = null;
    cachedAchievements = null;
    cachedChatHistory = null;
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
  if (!list) {
    list = [];
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
      age: 25,
      gender: 'Male',
      height: 178,
      weight: 82.5,
      targetWeight: 75.0,
      monthlyTargetWeightChange: -2.0,
      activityLevel: 'moderately_active',
      workoutHours: 5,
      workoutDays: 4,
      gymExperience: 'Intermediate',
      dietaryPreference: 'Non-Vegetarian',
      targetCompletionDate: '',
      estimatedAchievementDate: '',
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
    await runKVCommand(['SET', `auradiet:weeklyReports:${newId}`, JSON.stringify([])]);
    await runKVCommand(['SET', `auradiet:achievements:${newId}`, JSON.stringify([])]);
  } else {
    // LocalStorage fallback
    localStorage.setItem(KEYS.PROFILES_LIST, JSON.stringify(list));
    
    const defaultProfile = {
      name,
      apiKey: '',
      age: 25,
      gender: 'Male',
      height: 178,
      weight: 82.5,
      targetWeight: 75.0,
      monthlyTargetWeightChange: -2.0,
      activityLevel: 'moderately_active',
      workoutHours: 5,
      workoutDays: 4,
      gymExperience: 'Intermediate',
      dietaryPreference: 'Non-Vegetarian',
      targetCompletionDate: '',
      estimatedAchievementDate: '',
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
    localStorage.setItem(KEYS.WEEKLY_REPORTS(newId), JSON.stringify([]));
    localStorage.setItem(KEYS.ACHIEVEMENTS(newId), JSON.stringify([]));
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
    await runKVCommand(['DEL', `auradiet:chatHistory:${id}`]);
  } else {
    localStorage.setItem(KEYS.PROFILES_LIST, JSON.stringify(list));
    localStorage.removeItem(KEYS.PROFILE(id));
    localStorage.removeItem(KEYS.LOGS(id));
    localStorage.removeItem(KEYS.GROCERIES(id));
    localStorage.removeItem(KEYS.DIET_PLAN(id));
    localStorage.removeItem(KEYS.CHAT_HISTORY(id));
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
    age: 25,
    gender: 'Male',
    height: 178,
    weight: 82.5,
    targetWeight: 75.0,
    monthlyTargetWeightChange: -2.0,
    activityLevel: 'moderately_active',
    workoutHours: 5,
    workoutDays: 4,
    gymExperience: 'Intermediate',
    dietaryPreference: 'Non-Vegetarian',
    targetCompletionDate: '',
    estimatedAchievementDate: '',
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

  if (isKVConfigured) {
    await runKVCommand(['SET', `auradiet:profile:${id}`, JSON.stringify(defaultProfile)]);
    await runKVCommand(['SET', `auradiet:logs:${id}`, JSON.stringify({})]);
    await runKVCommand(['SET', `auradiet:groceries:${id}`, JSON.stringify([])]);
    await runKVCommand(['SET', `auradiet:dietPlan:${id}`, JSON.stringify(null)]);
    await runKVCommand(['SET', `auradiet:weeklyReports:${id}`, JSON.stringify([])]);
    await runKVCommand(['SET', `auradiet:achievements:${id}`, JSON.stringify([])]);
  } else {
    localStorage.setItem(KEYS.PROFILE(id), JSON.stringify(defaultProfile));
    localStorage.setItem(KEYS.LOGS(id), JSON.stringify({}));
    localStorage.setItem(KEYS.GROCERIES(id), JSON.stringify([]));
    localStorage.setItem(KEYS.DIET_PLAN(id), JSON.stringify(null));
    localStorage.setItem(KEYS.WEEKLY_REPORTS(id), JSON.stringify([]));
    localStorage.setItem(KEYS.ACHIEVEMENTS(id), JSON.stringify([]));
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
    logs[dateStr] = {};
  }
  
  const day = logs[dateStr];
  if (!day.meals) day.meals = [];
  if (day.water === undefined) day.water = 0;
  if (day.steps === undefined) day.steps = 0;
  if (day.activeCalories === undefined) day.activeCalories = 0;
  if (!day.sleep) day.sleep = { hours: 0, start: '', end: '' };
  if (!day.workout) day.workout = { completed: false, entries: [] };
  if (!day.habits) day.habits = { gym: false, water: false, protein: false, steps: false, sleep: false, vitamins: false };
  if (day.weight === undefined) day.weight = getLatestWeight();
  if (!day.measurements) day.measurements = { waist: 0, chest: 0, arms: 0, thighs: 0, bodyFat: 0, bmi: 0 };
  if (!day.mealSchedule) day.mealSchedule = { breakfast: 'pending', lunch: 'pending', snacks: 'pending', dinner: 'pending' };
  
  logs[dateStr] = day;
  cachedLogs = logs;
  return day;
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

// --- WEEKLY REPORTS CRUD ---
export const getWeeklyReports = async () => {
  const id = getCurrentProfileId();
  if (!id) return [];
  checkProfileSwitch(id);

  if (cachedWeeklyReports) return cachedWeeklyReports;

  if (isKVConfigured) {
    const res = await runKVCommand(['GET', `auradiet:weeklyReports:${id}`]);
    if (res) {
      cachedWeeklyReports = JSON.parse(res) || [];
      return cachedWeeklyReports;
    }
  } else {
    const local = localStorage.getItem(KEYS.WEEKLY_REPORTS(id));
    if (local) {
      cachedWeeklyReports = JSON.parse(local) || [];
      return cachedWeeklyReports;
    }
  }
  return [];
};

export const saveWeeklyReports = async (reports) => {
  const id = getCurrentProfileId();
  if (!id) return;
  checkProfileSwitch(id);
  cachedWeeklyReports = reports;

  if (isKVConfigured) {
    await runKVCommand(['SET', `auradiet:weeklyReports:${id}`, JSON.stringify(reports)]);
  } else {
    localStorage.setItem(KEYS.WEEKLY_REPORTS(id), JSON.stringify(reports));
  }
};

// --- ACHIEVEMENTS CRUD ---
export const getAchievements = async () => {
  const id = getCurrentProfileId();
  if (!id) return [];
  checkProfileSwitch(id);

  if (cachedAchievements) return cachedAchievements;

  if (isKVConfigured) {
    const res = await runKVCommand(['GET', `auradiet:achievements:${id}`]);
    if (res) {
      cachedAchievements = JSON.parse(res) || [];
      return cachedAchievements;
    }
  } else {
    const local = localStorage.getItem(KEYS.ACHIEVEMENTS(id));
    if (local) {
      cachedAchievements = JSON.parse(local) || [];
      return cachedAchievements;
    }
  }
  return [];
};

export const saveAchievements = async (achievements) => {
  const id = getCurrentProfileId();
  if (!id) return;
  checkProfileSwitch(id);
  cachedAchievements = achievements;

  if (isKVConfigured) {
    await runKVCommand(['SET', `auradiet:achievements:${id}`, JSON.stringify(achievements)]);
  } else {
    localStorage.setItem(KEYS.ACHIEVEMENTS(id), JSON.stringify(achievements));
  }
};

// --- CHAT HISTORY CRUD ---
export const getChatHistory = async () => {
  const id = getCurrentProfileId();
  if (!id) return [];
  checkProfileSwitch(id);

  if (cachedChatHistory) return cachedChatHistory;

  if (isKVConfigured) {
    const res = await runKVCommand(['GET', `auradiet:chatHistory:${id}`]);
    if (res) {
      cachedChatHistory = JSON.parse(res) || [];
      return cachedChatHistory;
    }
  } else {
    const local = localStorage.getItem(KEYS.CHAT_HISTORY(id));
    if (local) {
      cachedChatHistory = JSON.parse(local) || [];
      return cachedChatHistory;
    }
  }
  return [];
};

export const saveChatHistory = async (history) => {
  const id = getCurrentProfileId();
  if (!id) return;
  checkProfileSwitch(id);
  cachedChatHistory = history;

  if (isKVConfigured) {
    await runKVCommand(['SET', `auradiet:chatHistory:${id}`, JSON.stringify(history)]);
  } else {
    localStorage.setItem(KEYS.CHAT_HISTORY(id), JSON.stringify(history));
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
  cachedWeeklyReports = null;
  cachedAchievements = null;
  cachedChatHistory = null;

  if (isKVConfigured) {
    await runKVCommand(['DEL', `auradiet:profile:${id}`]);
    await runKVCommand(['DEL', `auradiet:logs:${id}`]);
    await runKVCommand(['DEL', `auradiet:groceries:${id}`]);
    await runKVCommand(['DEL', `auradiet:dietPlan:${id}`]);
    await runKVCommand(['DEL', `auradiet:weeklyReports:${id}`]);
    await runKVCommand(['DEL', `auradiet:achievements:${id}`]);
    await runKVCommand(['DEL', `auradiet:chatHistory:${id}`]);
  } else {
    localStorage.removeItem(KEYS.PROFILE(id));
    localStorage.removeItem(KEYS.LOGS(id));
    localStorage.removeItem(KEYS.GROCERIES(id));
    localStorage.removeItem(KEYS.DIET_PLAN(id));
    localStorage.removeItem(KEYS.WEEKLY_REPORTS(id));
    localStorage.removeItem(KEYS.ACHIEVEMENTS(id));
    localStorage.removeItem(KEYS.CHAT_HISTORY(id));
  }
  await seedDatabase(id);
};


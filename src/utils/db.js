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
  const dates = getLastNDates(5); // Last 5 days including today
  
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
    }
  };
  localStorage.setItem(KEYS.PROFILE, JSON.stringify(defaultProfile));

  // 2. Initial Logs (last 5 days) - with prices in Indian Rupees (INR)
  const weights = [82.5, 82.3, 82.1, 82.0, 81.8];
  const waterLogs = [2000, 2500, 1800, 3000, 2200];
  const workoutHours = [1.2, 0.8, 1.5, 0, 1.0];
  const workoutCals = [450, 320, 600, 0, 380];

  const mealsDataset = [
    [
      { name: 'Oatmeal with Almonds & Banana', calories: 420, protein: 12, carbs: 65, fat: 12, fiber: 9, cost: 150, ingredients: ['Oats', 'Almonds', 'Banana', 'Milk'] },
      { name: 'Grilled Chicken Salad with Olive Oil', calories: 550, protein: 42, carbs: 12, fat: 34, fiber: 4, cost: 350, ingredients: ['Chicken Breast', 'Mixed Greens', 'Olive Oil', 'Cherry Tomatoes'] },
      { name: 'Whey Protein Shake & Apple', calories: 250, protein: 26, carbs: 28, fat: 3, fiber: 5, cost: 120, ingredients: ['Whey Protein', 'Water', 'Apple'] },
      { name: 'Baked Salmon with Sweet Potato & Broccoli', calories: 680, protein: 44, carbs: 45, fat: 31, fiber: 8, cost: 600, ingredients: ['Salmon Fillet', 'Sweet Potato', 'Broccoli', 'Olive Oil'] }
    ],
    [
      { name: 'Scrambled Eggs & Avocado Toast', calories: 480, protein: 18, carbs: 32, fat: 28, fiber: 8, cost: 200, ingredients: ['Eggs', 'Whole Wheat Bread', 'Avocado'] },
      { name: 'Turkey Wrap with Spinach & Hummus', calories: 460, protein: 35, carbs: 40, fat: 15, fiber: 6, cost: 280, ingredients: ['Turkey Breast', 'Tortilla Wrap', 'Hummus', 'Spinach'] },
      { name: 'Mixed Berries & Greek Yogurt', calories: 220, protein: 17, carbs: 22, fat: 4, fiber: 4, cost: 180, ingredients: ['Greek Yogurt', 'Blueberries', 'Raspberries'] },
      { name: 'Beef Stir Fry with Brown Rice', calories: 720, protein: 48, carbs: 68, fat: 22, fiber: 7, cost: 480, ingredients: ['Lean Beef', 'Brown Rice', 'Bell Peppers', 'Broccoli', 'Soy Sauce'] }
    ],
    [
      { name: 'Protein Smoothie Bowl', calories: 380, protein: 28, carbs: 48, fat: 8, fiber: 7, cost: 240, ingredients: ['Protein Powder', 'Frozen Berries', 'Spinach', 'Almond Milk'] },
      { name: 'Tuna Salad on Whole Wheat', calories: 420, protein: 38, carbs: 34, fat: 11, fiber: 5, cost: 180, ingredients: ['Canned Tuna', 'Greek Yogurt', 'Whole Wheat Bread', 'Celery'] },
      { name: 'Handful of Mixed Nuts', calories: 200, protein: 6, carbs: 8, fat: 18, fiber: 3, cost: 80, ingredients: ['Walnuts', 'Almonds', 'Cashews'] },
      { name: 'Baked Cod with Quinoa & Asparagus', calories: 540, protein: 40, carbs: 42, fat: 12, fiber: 6, cost: 500, ingredients: ['Cod Fillet', 'Quinoa', 'Asparagus', 'Lemon'] }
    ],
    [
      { name: 'Chia Seed Pudding with Berries', calories: 310, protein: 9, carbs: 32, fat: 16, fiber: 12, cost: 140, ingredients: ['Chia Seeds', 'Coconut Milk', 'Strawberries'] },
      { name: 'Quinoa & Black Bean Burrito Bowl', calories: 580, protein: 22, carbs: 85, fat: 15, fiber: 16, cost: 240, ingredients: ['Black Beans', 'Quinoa', 'Corn', 'Avocado', 'Salsa'] },
      { name: 'Cottage Cheese & Pineapple', calories: 180, protein: 14, carbs: 18, fat: 3, fiber: 1, cost: 120, ingredients: ['Cottage Cheese', 'Pineapple Chunks'] },
      { name: 'Tofu stir fry with Noodles', calories: 610, protein: 25, carbs: 78, fat: 18, fiber: 6, cost: 320, ingredients: ['Tofu', 'Ramen Noodles', 'Broccoli', 'Carrots', 'Sesame Oil'] }
    ],
    [
      // Today (seeded with breakfast + lunch)
      { name: 'Greek Yogurt with Granola & Honey', calories: 340, protein: 20, carbs: 44, fat: 6, fiber: 3, cost: 160, ingredients: ['Greek Yogurt', 'Granola', 'Honey'] },
      { name: 'Grilled Chicken breast with Jasmine Rice & Zucchini', calories: 590, protein: 45, carbs: 55, fat: 14, fiber: 4, cost: 380, ingredients: ['Chicken Breast', 'Jasmine Rice', 'Zucchini', 'Olive Oil'] }
    ]
  ];

  const logs = {};
  dates.forEach((date, index) => {
    logs[date] = {
      meals: mealsDataset[index] || [],
      water: waterLogs[index] || 0,
      weight: weights[index] || 82.5,
      workout: {
        hours: workoutHours[index] || 0,
        caloriesBurned: workoutCals[index] || 0,
        source: workoutHours[index] > 0 ? 'NoiseFit' : 'Manual'
      },
      mealSchedule: index === 4 
        ? { breakfast: 'logged', lunch: 'logged', snacks: 'pending', dinner: 'pending' }
        : { breakfast: 'logged', lunch: 'logged', snacks: 'logged', dinner: 'logged' }
    };
  });
  localStorage.setItem(KEYS.LOGS, JSON.stringify(logs));

  // 3. Initial Grocery Checklist - with prices in INR
  const defaultGroceries = [
    { id: '1', name: 'Chicken Breast (1kg)', price: 450, checked: false },
    { id: '2', name: 'Greek Yogurt (1kg)', price: 250, checked: true },
    { id: '3', name: 'Salmon Fillets (500g)', price: 800, checked: false },
    { id: '4', name: 'Avocados (4pk)', price: 350, checked: false },
    { id: '5', name: 'Whole Wheat Bread', price: 50, checked: true },
    { id: '6', name: 'Eggs (Dozen)', price: 85, checked: false },
    { id: '7', name: 'Broccoli (Crown)', price: 120, checked: false },
    { id: '8', name: 'Sweet Potatoes (1.5kg)', price: 90, checked: true }
  ];
  localStorage.setItem(KEYS.GROCERIES, JSON.stringify(defaultGroceries));

  // 4. Initial Diet Plan
  const defaultDietPlan = {
    planText: `## Your AuraDiet Weight Loss Plan

Based on your profile (Height: 178cm, Current Weight: 82.5kg, Target: 75.0kg, Moderately Active, 5 hrs weekly workouts):
Your estimated TDEE is **2550 kcal**. A daily target of **2000 kcal** creates a steady calorie deficit for healthy weight loss (~0.5 kg per week).

### Daily Target Targets:
- **Calories**: 2000 kcal
- **Protein**: 150g (Optimizes muscle retention & satiety)
- **Carbs**: 180g (Fuels workouts & brain activity)
- **Fat**: 60g (Supports hormone production & fat-soluble vitamins)
- **Fiber**: 30g+ (Promotes gut health & fullness)

### Ideal Meal Pattern Suggestions:
1. **Breakfast (8:00 AM)**: Oats, Greek yogurt, or eggs (High protein, medium carbs)
2. **Lunch (1:00 PM)**: Lean meat (chicken/tuna/tofu) + whole grains + fibrous greens
3. **Mid-Day Snack (4:30 PM)**: Fruit + protein source (shake or cottage cheese)
4. **Dinner (8:00 PM)**: Fish or lean beef + sweet potatoes + leafy green veggies

*Note: Ensure you log workouts or sync with NoiseFit to adjust active calories.*`,
    generatedAt: formatDate(new Date())
  };
  localStorage.setItem(KEYS.DIET_PLAN, JSON.stringify(defaultDietPlan));
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

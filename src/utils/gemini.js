// Gemini Flash Client-Side Integration Utility with Retry Logic

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const callGeminiAPI = async (prompt, apiKey, formatJson = false) => {
  if (!apiKey) {
    throw new Error('API_KEY_MISSING');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: prompt
          }
        ]
      }
    ],
    generationConfig: {}
  };

  if (formatJson) {
    requestBody.generationConfig.responseMimeType = 'application/json';
  }

  const retries = 3;
  let delay = 3000; // Start with 3 seconds delay for rate limits

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.status === 429) {
        if (i < retries - 1) {
          console.warn(`Gemini rate limit exceeded. Retrying in ${delay / 1000}s... (Attempt ${i + 1}/${retries})`);
          await wait(delay);
          delay *= 2.5; // Exponential backoff increase
          continue;
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let message = errorData.error?.message || `HTTP ${response.status}`;
        if (response.status === 429) {
          message = "You have exceeded your Gemini free tier rate limit. Please wait a moment before trying again, or configure a paid plan key in settings to bypass limits.";
        }
        throw new Error(`Gemini API Error: ${message}`);
      }

      const data = await response.json();
      const outputText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!outputText) {
        throw new Error('No content returned from Gemini.');
      }

      return outputText;

    } catch (err) {
      if (i === retries - 1) {
        throw err;
      }
      // Retry on network/fetch errors too
      console.warn(`Gemini request failed. Retrying... (Attempt ${i + 1}/${retries})`, err);
      await wait(delay);
      delay *= 2.5;
    }
  }
};

// --- MOCK FALLBACKS (If API Key is missing or request fails) ---

const parseMealFallback = (description) => {
  const lowercase = description.toLowerCase();
  let name = 'Custom Indian Meal';
  let calories = 350;
  let protein = 15;
  let carbs = 30;
  let fat = 10;
  let fiber = 3;
  let cost = 120; // INR
  let ingredients = ['Assorted Indian Ingredients'];
  let itemsBreakdown = [{ item: 'Custom Portion', calories: 350 }];
  let confidence = 'Estimated using average Indian home-style serving sizes.';

  if (lowercase.includes('chapati') && lowercase.includes('chicken')) {
    name = 'Chapatis with Chicken Curry';
    calories = 520;
    protein = 32;
    carbs = 42;
    fat = 18;
    fiber = 6;
    cost = 180;
    ingredients = ['Chapatis (2)', 'Chicken Curry (1 bowl)'];
    itemsBreakdown = [
      { item: 'Chapatis (2)', calories: 220 },
      { item: 'Chicken Curry (1 bowl)', calories: 300 }
    ];
  } else if (lowercase.includes('biryani')) {
    name = 'Chicken Biryani';
    calories = 650;
    protein = 28;
    carbs = 72;
    fat = 22;
    fiber = 4;
    cost = 250;
    ingredients = ['Basmati Rice', 'Chicken Pieces', 'Spices', 'Raita'];
    itemsBreakdown = [
      { item: 'Chicken Biryani (1 plate)', calories: 600 },
      { item: 'Raita (1 cup)', calories: 50 }
    ];
  } else if (lowercase.includes('dal rice') || (lowercase.includes('dal') && lowercase.includes('rice'))) {
    name = 'Dal Rice with Pickle';
    calories = 420;
    protein = 12;
    carbs = 68;
    fat = 10;
    fiber = 5;
    cost = 70;
    ingredients = ['Steamed Rice (1 bowl)', 'Toor Dal (1 bowl)', 'Mango Pickle'];
    itemsBreakdown = [
      { item: 'Rice (1 plate)', calories: 240 },
      { item: 'Dal (1 bowl)', calories: 150 },
      { item: 'Pickle (1 tsp)', calories: 30 }
    ];
  } else if (lowercase.includes('sambar') && (lowercase.includes('tomato') || lowercase.includes('pappu')) && lowercase.includes('chicken')) {
    name = 'South Indian Rice, Sambar, Tomato Curry & Pan Fried Chicken';
    calories = 680;
    protein = 42;
    carbs = 88;
    fat = 18;
    fiber = 8;
    cost = 150;
    ingredients = ['Steamed Rice (1 bowl)', 'Sambar (1 bowl)', 'South Indian Tomato Curry (1 bowl)', 'Pan Fried Chicken (100g)'];
    itemsBreakdown = [
      { item: 'Steamed Rice (1 bowl)', calories: 240 },
      { item: 'Sambar (1 bowl)', calories: 120 },
      { item: 'South Indian Tomato Curry (1 bowl)', calories: 150 },
      { item: 'Pan Fried Chicken (100g)', calories: 170 }
    ];
    confidence = 'Calculated using South Indian home preparation standards (tadka tempering, light oil) and precise chicken metrics.';
  } else if (lowercase.includes('tomato curry') || lowercase.includes('tomato pappu')) {
    name = 'Rice with South Indian Tomato Curry';
    calories = 440;
    protein = 9;
    carbs = 82;
    fat = 8;
    fiber = 5;
    cost = 60;
    ingredients = ['Steamed Rice (1 bowl)', 'South Indian Tomato Curry (1 bowl)'];
    itemsBreakdown = [
      { item: 'Steamed Rice (1 bowl)', calories: 240 },
      { item: 'South Indian Tomato Curry (1 bowl)', calories: 200 }
    ];
    confidence = 'Estimated using average South Indian portion-by-portion serving sizes.';
  } else if (lowercase.includes('idli') || lowercase.includes('sambar')) {
    name = 'Idlis and Sambar';
    calories = 340;
    protein = 10;
    carbs = 58;
    fat = 4;
    fiber = 6;
    cost = 60;
    ingredients = ['Idlis (4)', 'Sambar (1 bowl)', 'Coconut Chutney'];
    itemsBreakdown = [
      { item: 'Idlis (4 pcs)', calories: 200 },
      { item: 'Sambar & Chutney', calories: 140 }
    ];
  } else if (lowercase.includes('paneer') || lowercase.includes('butter masala')) {
    name = 'Paneer Butter Masala with Rotis';
    calories = 580;
    protein = 22;
    carbs = 54;
    fat = 28;
    fiber = 7;
    cost = 190;
    ingredients = ['Paneer Butter Masala', 'Rotis (3)'];
    itemsBreakdown = [
      { item: 'Paneer Butter Masala (1 bowl)', calories: 250 },
      { item: 'Rotis (3 pcs)', calories: 330 }
    ];
  } else if (lowercase.includes('egg curry')) {
    name = 'Egg Curry and Rice';
    calories = 490;
    protein = 20;
    carbs = 58;
    fat = 18;
    fiber = 4;
    cost = 110;
    ingredients = ['Egg Curry (2 eggs)', 'Steamed Rice'];
    itemsBreakdown = [
      { item: 'Egg Curry (1 bowl)', calories: 250 },
      { item: 'Steamed Rice (1 plate)', calories: 240 }
    ];
  } else if (lowercase.includes('dosa') || lowercase.includes('chutney')) {
    name = 'Dosas with Chutney';
    calories = 390;
    protein = 8;
    carbs = 55;
    fat = 14;
    fiber = 4;
    cost = 80;
    ingredients = ['Dosas (2)', 'Coconut Chutney'];
    itemsBreakdown = [
      { item: 'Dosas (2 pcs)', calories: 310 },
      { item: 'Coconut Chutney (1 cup)', calories: 80 }
    ];
  } else if (lowercase.includes('fish curry')) {
    name = 'Fish Curry and Rice';
    calories = 480;
    protein = 30;
    carbs = 54;
    fat = 12;
    fiber = 3;
    cost = 200;
    ingredients = ['Fish Curry', 'Steamed Rice'];
    itemsBreakdown = [
      { item: 'Fish Curry (1 bowl)', calories: 240 },
      { item: 'Steamed Rice (1 plate)', calories: 240 }
    ];
  } else if (lowercase.includes('egg')) {
    name = 'Eggs and Toast';
    calories = 380;
    protein = 18;
    carbs = 24;
    fat = 18;
    fiber = 2;
    cost = 120;
    ingredients = ['Eggs (2)', 'Toast (1 slice)', 'Butter'];
    itemsBreakdown = [
      { item: 'Eggs (2 pcs)', calories: 140 },
      { item: 'Toast with Butter', calories: 240 }
    ];
  } else if (lowercase.includes('chicken')) {
    name = 'Grilled Chicken Salad';
    calories = 490;
    protein = 40;
    carbs = 10;
    fat = 28;
    fiber = 4;
    cost = 320;
    ingredients = ['Chicken Breast (150g)', 'Mixed Greens', 'Olive Oil'];
    itemsBreakdown = [
      { item: 'Grilled Chicken (150g)', calories: 250 },
      { item: 'Salad with Dressing', calories: 240 }
    ];
  }

  // Parse details out of text if numbers exist
  const calMatch = description.match(/(\d+)\s*(?:kcal|calories?)/);
  if (calMatch) calories = parseInt(calMatch[1], 10);

  return {
    name,
    calories,
    protein,
    carbs,
    fat,
    fiber,
    cost,
    ingredients,
    itemsBreakdown,
    confidence,
    isFallback: true
  };
};

const getDietPlanFallback = (profile, lifestyle) => {
  const weight = profile.weight;
  const target = profile.targetWeight;
  const hours = profile.workoutHours;
  const tdee = Math.round((weight * 22 * 1.2) + (hours * 60)); // basic BMR + activity
  const targetCals = tdee - 500; // standard deficit

  return `## AuraDiet Weight Loss Plan (Offline Mode)

*Please enter your Gemini API Key in Settings to receive a fully customized AI-generated meal and lifestyle plan.*

### Your Profile Summary
- **Current Weight**: ${weight} kg
- **Target Weight**: ${target} kg
- **Weekly Workouts**: ${hours} hours
- **Estimated Energy Out**: ~${tdee} kcal
- **Suggested Daily Calories for Weight Loss**: **${targetCals} kcal**

### General Recommendations for Healthy Cutting:
1. **Prioritize Protein**: Aim for at least 1.8g to 2.2g of protein per kg of bodyweight (${Math.round(weight * 2)}g) to prevent muscle loss.
2. **Increase Fiber**: High-fiber foods (beans, oats, broccoli, chia seeds) keep you full in a deficit.
3. **Drink Water**: Consume 3-4 liters of water daily. It boosts metabolism and suppresses false hunger.
4. **Active Recovery**: With ${hours} workout hours weekly, keep workouts consistent, focusing on resistance training + light cardio.
`;
};

// --- CORE UTILITY FUNCTIONS ---

/**
 * 1. Parses a written meal description into nutritional details & cost (INR)
 */
export const parseMealDescription = async (description, apiKey) => {
  if (!apiKey) {
    throw new Error('Gemini API key is required. Please add your API key in Settings.');
  }

  const prompt = `You are a professional dietitian and cost estimator. Parse this meal description: "${description}".
Recognize regional variations of Indian dishes. You must estimate the nutrition based on typical South Indian home preparation styles (e.g., using typical tempering/tadka with mustard seeds, curry leaves, and minimal oil/ghee). For example, if a user mentions "rice with sambar and tomato curry and 100gm of pan fried chicken", parse and identify each component as South Indian home-prepared food, calculate the nutrition based on their typical ingredients (rice, lentils, tomato, spices, oil, chicken), list their individual calorie contributions, and output the total.
Estimate the macronutrients (protein, carbs, fat, fiber in grams), total calories (kcal), a clean meal name, the list of key ingredients, and the estimated ingredient cost in Indian Rupees (INR) (as a float).
Also, analyze each distinct dish/item in the description and break down its calories individually. If quantities are not specified, intelligently assume average serving sizes (e.g. 1 bowl, 2 pieces, 1 plate) and state this in the confidence field.
Format your response as a JSON object with this exact schema:
{
  "name": "Clean name of the meal",
  "calories": 450,
  "protein": 30,
  "carbs": 40,
  "fat": 12,
  "fiber": 6,
  "ingredients": ["Ingredient 1", "Ingredient 2"],
  "cost": 250,
  "itemsBreakdown": [
    { "item": "Dish Name and serving details (e.g. Chapatis (2))", "calories": 220 },
    { "item": "Dish Name and serving details (e.g. Chicken Curry (1 bowl))", "calories": 230 }
  ],
  "confidence": "Estimated using average Indian home-style serving sizes."
}
Ensure all numeric values are integers. Output only valid JSON.`;

  const responseText = await callGeminiAPI(prompt, apiKey, true);
  return JSON.parse(responseText);
};

/**
 * 2. Generates a personalized weight-loss diet plan based on profile & food preferences
 */
export const generateDietPlan = async (profile, lifestyleNotes, apiKey) => {
  if (!apiKey) {
    return {
      planText: getDietPlanFallback(profile, lifestyleNotes),
      generatedAt: new Date().toLocaleDateString()
    };
  }

  const prompt = `You are a world-class sports nutritionist and weight loss coach. Create a personalized Weight Loss Diet & Lifestyle Plan for a client with the following profile:
- Height: ${profile.height} cm
- Current Weight: ${profile.weight} kg
- Target Weight: ${profile.targetWeight} kg
- Active workout hours per week: ${profile.workoutHours} hours
- Typical foods they eat / lifestyle: "${lifestyleNotes || 'Balanced diet'}"

Calculate their TDEE (Total Daily Energy Expenditure) and set a target deficit.
Provide your response in beautifully formatted markdown. Include:
1. A summary of their nutritional status (BMI estimate, TDEE, recommended daily calorie target for steady weight loss).
2. Recommended macronutrient split (Protein, Carbs, Fat, Fiber) with short rationales for each.
3. A structured daily meal guideline (Breakfast, Lunch, Snack, Dinner) optimized around their typical lifestyle foods.
4. Specific active weight loss lifestyle advice, detailing how to utilize their ${profile.workoutHours} weekly workout hours.
5. Estimated weekly grocery checklist with items needed for the meals, listing approximate grocery costs in Indian Rupees (INR).`;

  try {
    const planText = await callGeminiAPI(prompt, apiKey, false);
    return {
      planText,
      generatedAt: new Date().toLocaleDateString()
    };
  } catch (error) {
    console.error('Gemini diet plan generation failed.', error);
    return {
      planText: getDietPlanFallback(profile, lifestyleNotes) + `\n\n*(Error calling API: ${error.message})*`,
      generatedAt: new Date().toLocaleDateString()
    };
  }
};

/**
 * 3. Compiles a weekly grocery list with estimated costs (INR) based on a diet plan text
 */
export const compileGroceryList = async (dietPlanText, apiKey) => {
  if (!apiKey) {
    return [
      { id: 'f1', name: 'Chicken Breast', weight: '1.5kg', price: 650, checked: false },
      { id: 'f2', name: 'Fresh Fish / Paneer', weight: '500g', price: 350, checked: false },
      { id: 'f3', name: 'Rolled Oats', weight: '1kg', price: 180, checked: false },
      { id: 'f4', name: 'Organic Avocados', weight: '5 pcs', price: 400, checked: false },
      { id: 'f5', name: 'Greek Yogurt', weight: '1.5kg', price: 320, checked: false },
      { id: 'f6', name: 'Mixed Frozen Berries', weight: '500g', price: 280, checked: false },
      { id: 'f7', name: 'Broccoli & Asparagus Bunch', weight: '1 bunch', price: 180, checked: false }
    ];
  }

  const prompt = `Based on the following diet plan:
"${dietPlanText}"
Extract the necessary ingredients and compile a weekly grocery shopping list with estimated Indian Rupee (INR) costs.
Format the output as a JSON array of objects with the exact schema:
[
  {
    "name": "Item name (e.g. Chicken Breast, Eggs, Oats)",
    "weight": "Weight or quantity (e.g. 1.5kg, Dozen, 500g)",
    "price": 85
  }
]
Output only valid JSON. Estimate realistic Indian grocery market costs.`;

  try {
    const responseText = await callGeminiAPI(prompt, apiKey, true);
    const parsed = JSON.parse(responseText);
    return parsed.map((item, idx) => ({
      id: `ai-${idx}-${Date.now()}`,
      name: item.name,
      weight: item.weight || '',
      price: item.price || 150,
      checked: false
    }));
  } catch (error) {
    console.error('Gemini grocery list failed. Using default grocery list.', error);
    return compileGroceryList('', ''); // Fallback
  }
};

/**
 * 4. Reviews the daily log and provides real-time coaching feedback
 */
export const analyzeDailyLog = async (meals, workoutHours, targets, apiKey) => {
  if (!apiKey) {
    return `**Coaching Tip (Offline Mode):** Enter your Gemini API key in Settings to receive real-time AI nutrition reviews. Ensure you hit your protein target of ${targets.protein}g and log at least 2.5L of water!`;
  }

  const mealSummary = meals.map(m => `${m.name} (${m.calories} kcal, P: ${m.protein}g, C: ${m.carbs}g, F: ${m.fat}g, Fiber: ${m.fiber}g)`).join(', ');
  
  const prompt = `You are a real-time weight-loss nutrition coach. Review the user's daily stats:
- Daily Meal Log: [${mealSummary || 'No meals logged yet'}]
- Workout Hours Completed Today: ${workoutHours} hrs
- Daily targets: Calories: ${targets.calories} kcal, Protein: ${targets.protein}g, Carbs: ${targets.carbs}g, Fat: ${targets.fat}g, Fiber: ${targets.fiber}g

Provide a brief, encouraging 3-4 sentence analysis.
Point out:
1. If they are on track for their calories.
2. What they need to eat more of (e.g., proteins, fiber, carbs) to optimize weight loss.
3. A quick food recommendation (e.g., "Add 150g of cottage cheese to your next snack to boost protein").`;

  try {
    return await callGeminiAPI(prompt, apiKey, false);
  } catch (error) {
    console.error('Gemini daily analysis failed.', error);
    return `Daily analysis failed to load. (Error: ${error.message})`;
  }
};

/**
 * 5. Handles chatbot conversation with the AI coach
 */
export const chatWithCoach = async (message, history, logs, profile, apiKey) => {
  if (!apiKey) {
    return "Offline Mode: Enter your Gemini API key in Settings to unlock the interactive AI Personal Trainer & Nutritionist Coach chat.";
  }

  // Summarize recent logs (past 7 days)
  const sortedDates = Object.keys(logs).sort().reverse();
  const recentLogsSummary = sortedDates.slice(0, 7).map(date => {
    const day = logs[date];
    const mealsStr = day.meals?.map(m => `${m.name} (${m.calories} kcal, P:${m.protein}g, Cost: ₹${m.cost})`).join(', ') || 'No meals';
    const workoutStr = day.workout?.entries?.map(e => `${e.name} (${e.sets?.length} sets, Max weight: ${Math.max(...e.sets?.map(s => s.weight) || [0])}kg)`).join(', ') || 'No exercise logged';
    return `- ${date}: Weight: ${day.weight || 'N/A'} kg, Steps: ${day.steps || 0}, Sleep: ${day.sleep?.hours || 0} hrs, Water: ${day.water || 0}ml, Meals: [${mealsStr}], Workouts: [${workoutStr}]`;
  }).join('\n');

  const historyStr = history.slice(-8).map(h => `${h.sender === 'user' ? 'User' : 'Coach'}: ${h.text}`).join('\n');

  const prompt = `You are "AuraFit Coach", an elite personal trainer, expert nutritionist, expense tracker, and motivational accountability partner. You communicate in a supportive, practical, and direct tone.
You always tailor your advice to Indian lifestyles and budgets. Recommend affordable high-protein alternatives like eggs, paneer, soya chunks, moong dal, curd, groundnuts, or chicken breast, instead of expensive whey protein powders when budget is concerned.

Here is the user profile:
- Name: ${profile.name}
- Age: ${profile.age}
- Gender: ${profile.gender}
- Height: ${profile.height} cm, Weight: ${profile.weight} kg, Target Weight: ${profile.targetWeight} kg
- Gym Experience: ${profile.gymExperience}
- Workout Days/Week: ${profile.workoutDays}
- Dietary Preference: ${profile.dietaryPreference}
- Targets: Calories: ${profile.targets?.calories} kcal, Protein: ${profile.targets?.protein}g, Carbs: ${profile.targets?.carbs}g, Fat: ${profile.targets?.fat}g
- Food Budget: ₹8,000/month (Average target ₹260/day)

Recent Logs (Past 7 Days):
${recentLogsSummary || 'No recent logs found.'}

Conversation History:
${historyStr}

New User Message: "${message}"

Write a concise, helpful, and highly actionable response. Refer specifically to their logged weight, meals, budget status, steps, sleep, or workouts if relevant. Keep it under 150 words.`;

  try {
    return await callGeminiAPI(prompt, apiKey, false);
  } catch (error) {
    console.error('Gemini coach chat failed.', error);
    return `Coach response failed. (Error: ${error.message})`;
  }
};

/**
 * 6. Analyzes workout progression, progressive overload, and neglected muscle groups
 */
export const analyzeWorkoutProgression = async (logs, profile, apiKey) => {
  if (!apiKey) {
    return "Workout progression analysis requires a Gemini API Key. Please configure it in Settings.";
  }

  // Compile all exercises logged in logs
  const exerciseHistory = [];
  const muscleVol = {};
  
  Object.keys(logs).forEach(date => {
    const day = logs[date];
    if (day.workout?.entries?.length > 0) {
      day.workout.entries.forEach(entry => {
        const name = entry.name;
        const muscle = entry.muscleGroup || 'Other';
        const setsCount = entry.sets?.length || 0;
        
        let totalWeight = 0;
        let maxWeight = 0;
        let totalReps = 0;
        entry.sets?.forEach(s => {
          const w = parseFloat(s.weight) || 0;
          const r = parseInt(s.reps) || 0;
          totalWeight += w * r;
          totalReps += r;
          if (w > maxWeight) maxWeight = w;
        });

        exerciseHistory.push({
          date,
          name,
          muscle,
          volume: totalWeight,
          maxWeight,
          reps: totalReps,
          sets: setsCount
        });

        muscleVol[muscle] = (muscleVol[muscle] || 0) + totalWeight;
      });
    }
  });

  if (exerciseHistory.length === 0) {
    return "You haven't logged any exercises yet! Start logging your workouts in the Workout Logger tab so AuraFit AI can analyze your progressive overload and volume stats.";
  }

  const prompt = `You are a certified Strength and Conditioning Specialist. Analyze the user's exercise history logs:
Exercise Logs:
${JSON.stringify(exerciseHistory.slice(-25))}

Muscle Group Volumes (Total weight lifted):
${JSON.stringify(muscleVol)}

User Gym Experience: ${profile.gymExperience}
User Workout Days/Week: ${profile.workoutDays}

Provide a short, direct analysis in Markdown (max 200 words):
1. **Progressive Overload Tracking**: Highlight any specific exercises showing weight or volume increases over time (e.g. "Excellent progress on Bench Press: 55kg to 60kg").
2. **Neglected Muscle Groups**: Identify if key muscle groups (chest, back, legs, shoulders, arms, core) are missing or have very low volume compared to others.
3. **Fatigue & Recovery (Deload)**: Check if workout consistency is extremely high without rest, suggest deloads or specific weight increases for the next sessions.`;

  try {
    return await callGeminiAPI(prompt, apiKey, false);
  } catch (error) {
    console.error('Gemini workout analysis failed.', error);
    return `Failed to analyze workouts. (Error: ${error.message})`;
  }
};

/**
 * 7. Generates a Weekly Sunday Report
 */
export const generateWeeklySundayReport = async (logs, profile, apiKey) => {
  if (!apiKey) {
    return null;
  }

  // Get last 7 days of logs
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    // Format YYYY-MM-DD
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${day}`);
  }

  let workoutDaysLoggedCount = 0;
  let proteinHitsCount = 0;
  let totalCalories = 0;
  let totalSleep = 0;
  let totalMoneySpent = 0;
  let loggedDaysCount = 0;
  let weightStart = null;
  let weightEnd = null;

  dates.forEach((dateStr) => {
    const day = logs[dateStr];
    if (day) {
      loggedDaysCount++;
      if (day.workout?.entries?.length > 0) workoutDaysLoggedCount++;
      
      const dayCalories = day.meals?.reduce((sum, m) => sum + (m.calories || 0), 0) || 0;
      const dayProtein = day.meals?.reduce((sum, m) => sum + (m.protein || 0), 0) || 0;
      const dayCost = day.meals?.reduce((sum, m) => sum + (m.cost || 0), 0) || 0;

      totalCalories += dayCalories;
      totalMoneySpent += dayCost;
      totalSleep += day.sleep?.hours || 0;

      if (dayProtein >= (profile.targets?.protein || 120)) {
        proteinHitsCount++;
      }

      if (day.weight) {
        if (weightStart === null) weightStart = day.weight;
        weightEnd = day.weight;
      }
    }
  });

  if (loggedDaysCount === 0) loggedDaysCount = 1;
  const avgCals = Math.round(totalCalories / loggedDaysCount);
  const avgSleep = (totalSleep / loggedDaysCount).toFixed(1);
  const workoutConsistency = Math.round((workoutDaysLoggedCount / (profile.workoutDays || 4)) * 100);
  const proteinConsistency = Math.round((proteinHitsCount / 7) * 100);
  const weightChange = weightStart !== null && weightEnd !== null ? parseFloat((weightEnd - weightStart).toFixed(1)) : 0;

  const fitnessScore = Math.min(100, Math.max(30, Math.round(
    (workoutConsistency * 0.35) + 
    (proteinConsistency * 0.35) + 
    (Math.max(0, 100 - Math.abs(avgCals - (profile.targets?.calories || 2000)) / 10) * 0.2) +
    (Math.min(100, (parseFloat(avgSleep) / 7.5) * 100) * 0.1)
  )));

  const prompt = `You are AuraFit Coach. Generate a comprehensive Weekly Sunday Report for the client based on these stats for the past week:
- Workout Consistency: ${workoutConsistency}% (Workout goal: ${profile.workoutDays} days/week, logged workouts: ${workoutDaysLoggedCount})
- Protein Target Hit Consistency: ${proteinConsistency}% (Goal: ${profile.targets?.protein}g daily)
- Average Daily Calories Consumed: ${avgCals} kcal (Target: ${profile.targets?.calories} kcal)
- Average Daily Sleep: ${avgSleep} hours (Target: 7-8 hours)
- Total Food Expenses: ₹${totalMoneySpent} (Monthly budget target: ₹8,000 or ₹260/day)
- Weight Change: ${weightChange > 0 ? '+' : ''}${weightChange} kg (Start weight logged: ${weightStart || profile.weight}kg, End weight logged: ${weightEnd || profile.weight}kg)
- Diet Type: ${profile.dietaryPreference}
- Calculated Weekly Fitness Score: ${fitnessScore}/100
- Goal Weight: ${profile.targetWeight}kg, Current Weight: ${weightEnd || profile.weight}kg.

Format the output as a clean JSON object with this exact schema:
{
  "fitnessScore": ${fitnessScore},
  "workoutCompletion": ${workoutConsistency},
  "proteinGoalHit": ${proteinConsistency},
  "avgCalories": ${avgCals},
  "avgSleep": ${avgSleep},
  "moneySpent": ${totalMoneySpent},
  "weightChange": ${weightChange},
  "biggestImprovement": "E.g., Excellent workout consistency, hitting 4 out of 4 days.",
  "areaToImprove": "E.g., Increase sleep by at least 45 minutes daily to improve muscle recovery.",
  "daysRemaining": "E.g., 82 days remaining to target weight",
  "prediction": "E.g., Lean muscle gains on track; fat loss steady at 0.5kg/week.",
  "summary": "3-4 sentences summarizing progress, achievements, muscle gain/fat loss predictions, and a constructive area of improvement. Mention specific affordable recommendations in Indian Rupees (INR)."
}
Output only valid JSON.`;

  try {
    const responseText = await callGeminiAPI(prompt, apiKey, true);
    return JSON.parse(responseText);
  } catch (error) {
    console.error('Gemini weekly report failed.', error);
    return {
      fitnessScore,
      workoutCompletion: workoutConsistency,
      proteinGoalHit: proteinConsistency,
      avgCalories: avgCals,
      avgSleep: parseFloat(avgSleep),
      moneySpent: totalMoneySpent,
      weightChange,
      biggestImprovement: workoutConsistency >= 80 ? "Excellent workout consistency this week!" : "Logged some activity, let's keep building consistency.",
      areaToImprove: parseFloat(avgSleep) < 7.0 ? "Try to get to bed 30-45 mins earlier to hit 7.5+ sleep hours." : "Ensure daily water target is met.",
      daysRemaining: profile.estimatedAchievementDate ? `Mapped target date: ${profile.estimatedAchievementDate}` : "Calculate goal date in settings.",
      prediction: weightChange < 0 ? "Steady fat loss detected; lean mass on track." : "Maintenance calorie balance; muscle remodeling active.",
      summary: `You logged ${workoutDaysLoggedCount} workouts and spent ₹${totalMoneySpent} on food this week. Target calorie average was ${avgCals} kcal. Ensure you set your Gemini API key in Settings to receive full weekly insights.`
    };
  }
};


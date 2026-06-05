// Gemini 1.5 Flash Client-Side Integration Utility

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

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error?.message || `HTTP ${response.status}`;
    throw new Error(`Gemini API Error: ${message}`);
  }

  const data = await response.json();
  const outputText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!outputText) {
    throw new Error('No content returned from Gemini.');
  }

  return outputText;
};

// --- MOCK FALLBACKS (If API Key is missing or request fails) ---

const parseMealFallback = (description) => {
  const lowercase = description.toLowerCase();
  let name = 'Custom Meal';
  let calories = 350;
  let protein = 15;
  let carbs = 30;
  let fat = 10;
  let fiber = 3;
  let cost = 250; // INR
  let ingredients = ['Assorted Ingredients'];

  if (lowercase.includes('egg') || lowercase.includes('scramble')) {
    name = 'Scrambled Eggs with Toast';
    calories = 380;
    protein = 18;
    carbs = 24;
    fat = 18;
    fiber = 2;
    cost = 120;
    ingredients = ['Eggs (2)', 'Whole Wheat Bread (1 slice)', 'Butter'];
  } else if (lowercase.includes('chicken') || lowercase.includes('salad')) {
    name = 'Grilled Chicken Salad';
    calories = 490;
    protein = 40;
    carbs = 10;
    fat = 28;
    fiber = 4;
    cost = 320;
    ingredients = ['Chicken Breast (150g)', 'Mixed Lettuce', 'Olive Oil', 'Cucumber'];
  } else if (lowercase.includes('salmon') || lowercase.includes('fish')) {
    name = 'Baked Salmon & Quinoa';
    calories = 620;
    protein = 38;
    carbs = 40;
    fat = 24;
    fiber = 6;
    cost = 550;
    ingredients = ['Salmon Fillet (150g)', 'Quinoa (100g cooked)', 'Asparagus'];
  } else if (lowercase.includes('shake') || lowercase.includes('protein')) {
    name = 'Whey Protein Shake';
    calories = 200;
    protein = 26;
    carbs = 8;
    fat = 2;
    fiber = 1;
    cost = 140;
    ingredients = ['Whey Protein Scoop (1)', 'Skimmed Milk (200ml)'];
  } else if (lowercase.includes('yogurt') || lowercase.includes('greek')) {
    name = 'Greek Yogurt & Honey';
    calories = 260;
    protein = 18;
    carbs = 28;
    fat = 5;
    fiber = 2;
    cost = 160;
    ingredients = ['Greek Yogurt (200g)', 'Granola (20g)', 'Honey (1 tsp)'];
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
    return parseMealFallback(description);
  }

  const prompt = `You are a professional dietitian and cost estimator. Parse this meal description: "${description}".
Estimate the macronutrients (protein, carbs, fat, fiber in grams), total calories (kcal), a clean meal name, the list of key ingredients, and the estimated ingredient cost in Indian Rupees (INR) (as a float).
Format your response as a JSON object with this exact schema:
{
  "name": "Clean name of the meal",
  "calories": 450,
  "protein": 30,
  "carbs": 40,
  "fat": 12,
  "fiber": 6,
  "ingredients": ["Ingredient 1", "Ingredient 2"],
  "cost": 250
}
Ensure all numeric values are integers. Output only valid JSON.`;

  try {
    const responseText = await callGeminiAPI(prompt, apiKey, true);
    return JSON.parse(responseText);
  } catch (error) {
    console.warn('Gemini meal parse failed. Using offline fallback.', error);
    return parseMealFallback(description);
  }
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

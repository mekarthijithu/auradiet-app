import React, { useState } from 'react';
import { 
  TrendingDown, 
  BrainCircuit, 
  RotateCcw, 
  Activity, 
  ShoppingCart, 
  Calendar,
  Check
} from 'lucide-react';
import { generateDietPlan, compileGroceryList } from '../utils/gemini';

// Simple Markdown to HTML parser for rendering Gemini markdown strings safely
const renderMarkdown = (markdownText) => {
  if (!markdownText) return null;
  const lines = markdownText.split('\n');
  return lines.map((line, index) => {
    let text = line.trim();
    if (text.startsWith('###')) {
      return <h4 key={index} style={{ fontSize: '1.15rem', color: 'hsl(var(--cyan))', marginTop: '1.25rem', marginBottom: '0.5rem' }}>{text.replace('###', '').trim()}</h4>;
    }
    if (text.startsWith('##')) {
      return <h3 key={index} style={{ fontSize: '1.35rem', color: 'hsl(var(--emerald))', marginTop: '1.5rem', marginBottom: '0.75rem', borderBottom: '1px solid hsl(var(--border-light))', paddingBottom: '0.25rem' }}>{text.replace('##', '').trim()}</h3>;
    }
    if (text.startsWith('#')) {
      return <h2 key={index} style={{ fontSize: '1.6rem', color: '#fff', marginTop: '1.5rem', marginBottom: '1rem' }}>{text.replace('#', '').trim()}</h2>;
    }
    if (text.startsWith('-') || text.startsWith('*')) {
      // Bold rendering
      const cleaned = text.substring(1).trim();
      return (
        <li key={index} style={{ marginLeft: '1.5rem', marginBottom: '0.35rem', color: 'hsl(var(--text-secondary))', listStyleType: 'disc' }}>
          {renderBoldText(cleaned)}
        </li>
      );
    }
    if (text === '') return <div key={index} style={{ height: '0.75rem' }} />;
    return <p key={index} style={{ marginBottom: '0.75rem', lineHeight: '1.6', color: 'hsl(var(--text-secondary))' }}>{renderBoldText(text)}</p>;
  });
};

const renderBoldText = (text) => {
  const parts = text.split('**');
  return parts.map((part, i) => i % 2 === 1 ? <strong key={i} style={{ color: '#fff', fontWeight: 600 }}>{part}</strong> : part);
};

export default function AiWeightLoss({ profile, dietPlan, logs, onProfileUpdate, onDietPlanUpdate, onGroceriesUpdate, onTriggerSetup }) {
  const [lifestyleFoods, setLifestyleFoods] = useState(profile.lifestyleNotes || '');
  const [generating, setGenerating] = useState(false);
  const [grocerySuccess, setGrocerySuccess] = useState(false);

  // Compute BMI
  const heightInMeters = profile.height / 100;
  const bmi = (profile.weight / (heightInMeters * heightInMeters)).toFixed(1);
  
  let bmiCategory = 'Normal Weight';
  let bmiColor = 'hsl(var(--emerald))';
  if (bmi < 18.5) {
    bmiCategory = 'Underweight';
    bmiColor = 'hsl(var(--cyan))';
  } else if (bmi >= 25 && bmi < 29.9) {
    bmiCategory = 'Overweight';
    bmiColor = 'hsl(var(--amber))';
  } else if (bmi >= 30) {
    bmiCategory = 'Obese';
    bmiColor = 'hsl(var(--rose))';
  }

  // Calculate standard TDEE estimate (offline baseline)
  const bmr = (10 * profile.weight) + (6.25 * profile.height) - (5 * 28) + 5;
  let multiplier = 1.2;
  if (profile.activityLevel === 'lightly_active') multiplier = 1.375;
  if (profile.activityLevel === 'moderately_active') multiplier = 1.55;
  if (profile.activityLevel === 'very_active') multiplier = 1.725;
  const tdee = Math.round((bmr * multiplier) + ((profile.workoutHours * 400) / 7));

  // Generate Diet Plan
  const handleGeneratePlan = async () => {
    setGenerating(true);
    setGrocerySuccess(false);
    try {
      const plan = await generateDietPlan(profile, lifestyleFoods, profile.apiKey);
      onDietPlanUpdate(plan);
      
      // Save lifestyle foods notes back to profile
      const updatedProfile = { ...profile, lifestyleNotes: lifestyleFoods };
      onProfileUpdate(updatedProfile);
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  // Compile Grocery List from generated plan
  const handleImportGroceries = async () => {
    if (!dietPlan?.planText) return;
    setGenerating(true);
    try {
      const items = await compileGroceryList(dietPlan.planText, profile.apiKey);
      onGroceriesUpdate(items);
      setGrocerySuccess(true);
      setTimeout(() => setGrocerySuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <header className="page-header">
        <div>
          <h1 className="page-title">AI Weight Loss Planner</h1>
          <p className="page-subtitle">Personalized dietary schedules mapped to your metabolic baseline</p>
        </div>
      </header>

      {/* Top Profile Summary widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Status stats card */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>Body Mass Index</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', margin: '0.5rem 0' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>{bmi}</span>
              <span style={{ color: bmiColor, fontSize: '0.85rem', fontWeight: 600 }}>{bmiCategory}</span>
            </div>
          </div>
          <button onClick={onTriggerSetup} className="btn btn-secondary" style={{ padding: '0.4rem', fontSize: '0.8rem' }}>
            <RotateCcw size={12} /> Recalculate Profile
          </button>
        </div>

        {/* Workout metrics card */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>Energy Expenditure</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', margin: '0.5rem 0' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'hsl(var(--rose))' }}>{tdee}</span>
              <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>kcal TDEE</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
              Based on {profile.workoutHours} hrs/wk exercise & activity level.
            </p>
          </div>
        </div>

        {/* Current target thresholds */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>Calorie Limit Target</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', margin: '0.5rem 0' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'hsl(var(--emerald))' }}>{profile.targets.calories}</span>
              <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>kcal / day</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
              Creates a healthy daily deficit of ~500 kcal.
            </p>
          </div>
        </div>

      </div>

      {/* Main planner split */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
        
        {/* Lifestyle food targets inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} color="hsl(var(--emerald))" /> Custom Diet Rules
            </h3>
            
            <div className="form-group">
              <label className="form-label">Lifestyle Foods & Exclusions</label>
              <textarea 
                rows="6"
                className="form-input"
                style={{ resize: 'none' }}
                placeholder="List ingredients you already buy or eat regularly (e.g. rice, chicken, avocados, broccoli) or request vegan, vegetarian, gluten-free, or specific calorie schedules..."
                value={lifestyleFoods}
                onChange={(e) => setLifestyleFoods(e.target.value)}
              />
            </div>

            <button 
              onClick={handleGeneratePlan} 
              disabled={generating} 
              className="btn btn-primary btn-full"
              style={{ marginBottom: '1rem' }}
            >
              <BrainCircuit size={16} /> {generating ? 'Tailoring Diet...' : 'Generate AI Diet Plan'}
            </button>

            {dietPlan && (
              <button 
                onClick={handleImportGroceries} 
                disabled={generating} 
                className="btn btn-secondary btn-full"
                style={{ borderColor: grocerySuccess ? 'hsl(var(--emerald))' : 'hsl(var(--border-light))' }}
              >
                {grocerySuccess ? (
                  <span style={{ color: 'hsl(var(--emerald))', display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'center' }}>
                    <Check size={14} /> Imported to Shopping List!
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'center' }}>
                    <ShoppingCart size={14} /> Extract Grocery List
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Display Panel */}
        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
          <div className="card-title-row" style={{ borderBottom: '1px solid hsl(var(--border-light))', paddingBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.35rem' }}>Your Custom Weight Loss Plan</h3>
              {dietPlan && (
                <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                  <Calendar size={12} /> Generated on {dietPlan.generatedAt}
                </span>
              )}
            </div>
            <span className="badge badge-emerald">AI Tailored</span>
          </div>

          <div style={{ flexGrow: 1, padding: '1rem 0', overflowY: 'auto', maxHeight: '550px' }}>
            {dietPlan ? (
              <div style={{ textAlign: 'left' }}>
                {renderMarkdown(dietPlan.planText)}
              </div>
            ) : (
              <div style={{ display: 'flex', height: '100%', minHeight: '300px', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--text-secondary))', textAlign: 'center', gap: '1rem' }}>
                <TrendingDown size={48} color="hsl(var(--text-muted))" />
                <div>
                  <h4 style={{ color: '#fff', fontSize: '1.1rem' }}>No Plan Generated Yet</h4>
                  <p style={{ fontSize: '0.85rem', width: '280px', margin: '0.25rem auto 0' }}>
                    Adjust custom foods on the left and click Generate to run the AI Weight Loss Coach.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

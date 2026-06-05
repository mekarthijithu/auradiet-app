import React, { useState } from 'react';
import { Settings as SettingsIcon, Key, Sliders, AlertTriangle, Check, BookOpen, ExternalLink } from 'lucide-react';

export default function Settings({ profile, onProfileUpdate, onResetAll }) {
  const [apiKey, setApiKey] = useState(profile.apiKey || '');
  const [monthlyChange, setMonthlyChange] = useState(profile.monthlyTargetWeightChange || -2.0);
  const [cal, setCal] = useState(profile.targets.calories || 2000);
  const [prot, setProt] = useState(profile.targets.protein || 150);
  const [carb, setCarb] = useState(profile.targets.carbs || 180);
  const [fat, setFat] = useState(profile.targets.fat || 60);
  const [fib, setFib] = useState(profile.targets.fiber || 30);
  const [showSaved, setShowSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();

    // Re-calculate calorie/macro targets based on target weight changes, height, and weight
    const weight = profile.weight || 80;
    const height = profile.height || 175;
    const bmr = (10 * weight) + (6.25 * height) - (5 * 28) + 5;
    
    let activityMultiplier = 1.2;
    if (profile.activityLevel === 'lightly_active') activityMultiplier = 1.375;
    if (profile.activityLevel === 'moderately_active') activityMultiplier = 1.55;
    if (profile.activityLevel === 'very_active') activityMultiplier = 1.725;
    
    const tdee = Math.round(bmr * activityMultiplier + (((profile.workoutHours || 4) * 400) / 7));

    const dailyCalorieOffset = (parseFloat(monthlyChange) * 7700) / 30.4;
    const calorieTarget = Math.max(1200, Math.round(tdee + dailyCalorieOffset));

    const proteinTarget = Math.round(weight * 2.0);
    const fatTarget = Math.round((calorieTarget * 0.25) / 9);
    const carbCalories = calorieTarget - (proteinTarget * 4) - (fatTarget * 9);
    const carbTarget = Math.round(Math.max(50, carbCalories / 4));
    const fiberTarget = Math.round(Math.max(25, (calorieTarget / 1000) * 14));

    const updated = {
      ...profile,
      apiKey: apiKey.trim(),
      monthlyTargetWeightChange: parseFloat(monthlyChange),
      targets: {
        calories: calorieTarget,
        protein: proteinTarget,
        carbs: carbTarget,
        fat: fatTarget,
        fiber: fiberTarget
      }
    };

    onProfileUpdate(updated);

    // Sync input box states
    setCal(calorieTarget);
    setProt(proteinTarget);
    setCarb(carbTarget);
    setFat(fatTarget);
    setFib(fiberTarget);

    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 3000);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <header className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure API integrations, customize daily limits, and manage local data</p>
        </div>
      </header>

      {/* Guide to Get Gemini Key */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '1.5rem', borderLeft: '4px solid hsl(var(--cyan))' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BookOpen size={18} color="hsl(var(--cyan))" /> How to Get a Free Gemini API Key
        </h3>
        
        <ol style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: 'hsl(var(--text-secondary))', lineHeight: '1.5' }}>
          <li>
            Go to the official <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" style={{ color: 'hsl(var(--cyan))', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '0.1rem' }}>Google AI Studio <ExternalLink size={12} /></a>.
          </li>
          <li>
            Sign in using any standard personal **Google Account** (Gmail).
          </li>
          <li>
            Click on the prominent blue button: **"Get API key"** (or **"Create API Key"**).
          </li>
          <li>
            Click **"Create API key in new project"** and consent to terms.
          </li>
          <li>
            **Copy** the generated key (starts with <code>AIzaSy...</code>).
          </li>
          <li>
            Return here, paste the copied key into the **Gemini API Key** field below, and click **Save Settings**!
          </li>
        </ol>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* API Settings */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Key size={18} color="hsl(var(--cyan))" /> AI Model Configuration
          </h3>
          
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Gemini API Key</label>
            <input 
              type="password"
              className="form-input"
              placeholder="Paste AIzaSy... here"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
        </div>

        {/* Nutritional Targets Settings */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sliders size={18} color="hsl(var(--emerald))" /> Target Customization
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Monthly Weight Goal Target (kg)</label>
              <input 
                type="number" 
                step="0.1"
                className="form-input" 
                value={monthlyChange} 
                onChange={(e) => setMonthlyChange(e.target.value)}
                required 
              />
              <span style={{ display: 'block', fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginTop: '0.5rem' }}>
                Negative values to lose weight (e.g. -2.0 kg/mo). Positive values to gain weight (e.g. 1.5 kg/mo).
              </span>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Auto-Computed Daily Calories Limit (kcal)</label>
              <input 
                type="number" 
                className="form-input" 
                value={cal} 
                disabled
                style={{ opacity: 0.6, cursor: 'not-allowed' }}
              />
              <span style={{ display: 'block', fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginTop: '0.5rem' }}>
                Automatically calculated based on your BMR, TDEE, active workouts, and monthly weight target.
              </span>
            </div>
          </div>

          <div style={{ borderTop: '1px solid hsl(var(--border-light))', paddingTop: '1.5rem' }}>
            <h4 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#fff' }}>Computed Macronutrient Budgets:</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Protein (g)</label>
                <input type="number" className="form-input" value={prot} disabled style={{ opacity: 0.6 }} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Carbs (g)</label>
                <input type="number" className="form-input" value={carb} disabled style={{ opacity: 0.6 }} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Fats (g)</label>
                <input type="number" className="form-input" value={fat} disabled style={{ opacity: 0.6 }} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Fiber (g)</label>
                <input type="number" className="form-input" value={fib} disabled style={{ opacity: 0.6 }} />
              </div>
            </div>
          </div>
        </div>

        {/* Save button & success indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button type="submit" className="btn btn-primary" style={{ padding: '0.8rem 2.5rem' }}>
            Save Settings
          </button>
          
          {showSaved && (
            <span style={{ color: 'hsl(var(--emerald))', fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Check size={16} /> Configuration saved!
            </span>
          )}
        </div>

      </form>

      {/* Database Reset Danger Zone */}
      <div className="glass-panel" style={{ padding: '2rem', border: '1px solid hsl(var(--rose) / 25%)', marginTop: '3rem' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'hsl(var(--rose))' }}>
          <AlertTriangle size={18} /> Danger Zone
        </h3>
        <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
          This will wipe your current settings, custom profiles, meal histories, and active check-ins, restoring the original seeded mock data. This action is irreversible.
        </p>

        <button 
          onClick={() => {
            if (window.confirm('Are you sure you want to reset all data back to factory seeds?')) {
              onResetAll();
            }
          }}
          className="btn btn-danger"
        >
          Reset Application Data
        </button>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Key, Sliders, AlertTriangle, Check, BookOpen, ExternalLink, User, Cloud, Copy, RefreshCw } from 'lucide-react';

export default function Settings({ profile, onProfileUpdate, onResetAll, onLogout, dbConnected }) {
  const [apiKey, setApiKey] = useState(profile.apiKey || '');
  const [monthlyChange, setMonthlyChange] = useState(profile.monthlyTargetWeightChange || -2.0);
  const [height, setHeight] = useState(profile.height || 178);
  const [weight, setWeight] = useState(profile.weight || 82.5);
  const [targetWeight, setTargetWeight] = useState(profile.targetWeight || 75.0);
  const [activityLevel, setActivityLevel] = useState(profile.activityLevel || 'moderately_active');
  const [workoutHours, setWorkoutHours] = useState(profile.workoutHours || 5);

  const [cal, setCal] = useState(profile.targets?.calories || 2000);
  const [prot, setProt] = useState(profile.targets?.protein || 150);
  const [carb, setCarb] = useState(profile.targets?.carbs || 180);
  const [fat, setFat] = useState(profile.targets?.fat || 60);
  const [fib, setFib] = useState(profile.targets?.fiber || 30);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    setApiKey(profile.apiKey || '');
    setMonthlyChange(profile.monthlyTargetWeightChange || -2.0);
    setHeight(profile.height || 178);
    setWeight(profile.weight || 82.5);
    setTargetWeight(profile.targetWeight || 75.0);
    setActivityLevel(profile.activityLevel || 'moderately_active');
    setWorkoutHours(profile.workoutHours || 5);
    setCal(profile.targets?.calories || 2000);
    setProt(profile.targets?.protein || 150);
    setCarb(profile.targets?.carbs || 180);
    setFat(profile.targets?.fat || 60);
    setFib(profile.targets?.fiber || 30);
  }, [profile]);

  const handleSave = (e) => {
    e.preventDefault();

    // Re-calculate calorie/macro targets based on entered details
    const w = parseFloat(weight) || 80;
    const h = parseFloat(height) || 175;
    const bmr = (10 * w) + (6.25 * h) - (5 * 28) + 5;
    
    let activityMultiplier = 1.2;
    if (activityLevel === 'lightly_active') activityMultiplier = 1.375;
    if (activityLevel === 'moderately_active') activityMultiplier = 1.55;
    if (activityLevel === 'very_active') activityMultiplier = 1.725;
    
    const tdee = Math.round(bmr * activityMultiplier + ((parseFloat(workoutHours) * 400) / 7));

    const dailyCalorieOffset = (parseFloat(monthlyChange) * 7700) / 30.4;
    const calorieTarget = Math.max(1200, Math.round(tdee + dailyCalorieOffset));

    const proteinTarget = Math.round(w * 2.0);
    const fatTarget = Math.round((calorieTarget * 0.25) / 9);
    const carbCalories = calorieTarget - (proteinTarget * 4) - (fatTarget * 9);
    const carbTarget = Math.round(Math.max(50, carbCalories / 4));
    const fiberTarget = Math.round(Math.max(25, (calorieTarget / 1000) * 14));

    const updated = {
      ...profile,
      apiKey: apiKey.trim(),
      height: h,
      weight: w,
      targetWeight: parseFloat(targetWeight) || 75,
      activityLevel,
      workoutHours: parseFloat(workoutHours) || 4,
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

        {/* Personal Details Settings */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={18} color="hsl(var(--cyan))" /> Personal Details
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Height (cm)</label>
              <input 
                type="number" 
                className="form-input" 
                value={height} 
                onChange={(e) => setHeight(e.target.value)}
                min="100" 
                max="250"
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Current Weight (kg)</label>
              <input 
                type="number" 
                className="form-input" 
                value={weight} 
                onChange={(e) => setWeight(e.target.value)}
                min="30" 
                max="250"
                step="0.1"
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Target Weight (kg)</label>
              <input 
                type="number" 
                className="form-input" 
                value={targetWeight} 
                onChange={(e) => setTargetWeight(e.target.value)}
                min="30" 
                max="250"
                step="0.1"
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Daily Activity Level</label>
              <select 
                className="form-select"
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value)}
              >
                <option value="sedentary">Sedentary (Desk Job, little exercise)</option>
                <option value="lightly_active">Lightly Active (Light standing/walking, 1-2 workouts/wk)</option>
                <option value="moderately_active">Moderately Active (Moderate movement, 3-5 workouts/wk)</option>
                <option value="very_active">Very Active (Hard physical labor or daily heavy workouts)</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Weekly Workout Hours</label>
              <input 
                type="number" 
                className="form-input" 
                value={workoutHours} 
                onChange={(e) => setWorkoutHours(e.target.value)}
                min="0" 
                max="40"
                step="0.5"
                required
              />
            </div>
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

      {/* Database Connection Settings */}
      <div className="glass-panel" style={{ padding: '2rem', marginTop: '1.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Cloud size={18} color="hsl(var(--cyan))" /> Database Integration Status
        </h3>
        <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: '1.5' }}>
          Automatically sync your diet progress, logged meals, targets, and grocery items across all browsers using your remote database.
        </p>

        {dbConnected ? (
          <div style={{
            padding: '1rem',
            background: 'hsl(var(--emerald) / 5%)',
            border: '1px solid hsl(var(--emerald) / 20%)',
            borderRadius: '8px',
            color: 'hsl(var(--emerald))',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'hsl(var(--emerald))', boxShadow: '0 0 8px hsl(var(--emerald))' }} />
            <span><strong>Database Connected:</strong> Your daily data is stored in the database. When you open the application in another browser, all updates are fully reflected instantly.</span>
          </div>
        ) : (
          <div style={{
            padding: '1rem',
            background: 'hsl(var(--amber) / 5%)',
            border: '1px solid hsl(var(--amber) / 20%)',
            borderRadius: '8px',
            color: 'hsl(var(--amber))',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'hsl(var(--amber))', boxShadow: '0 0 8px hsl(var(--amber))' }} />
            <span><strong>Running in Local Storage Mode:</strong> The local database API proxy `/api/db` is unreachable, or `REDIS_URL` is missing. Sync is inactive.</span>
          </div>
        )}
      </div>

      {/* Profile Management Section */}
      <div className="glass-panel" style={{ padding: '2rem', marginTop: '2.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Profile Session
        </h3>
        <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
          You are currently logged in as <strong style={{ color: '#fff' }}>{profile.name || 'Jithu'}</strong>.
        </p>

        <button 
          onClick={onLogout}
          className="btn btn-secondary"
        >
          Logout & Switch Profile
        </button>
      </div>

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

import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Key, Sliders, AlertTriangle, Check, BookOpen, ExternalLink, User, Cloud, Activity } from 'lucide-react';
import { formatDate } from '../utils/db';

export default function Settings({ profile, onProfileUpdate, onResetAll, onLogout, dbConnected }) {
  const [apiKey, setApiKey] = useState(profile.apiKey || '');
  const [googleClientId, setGoogleClientId] = useState(profile.googleClientId || '');
  const [name, setName] = useState(profile.name || '');
  const [age, setAge] = useState(profile.age || 25);
  const [gender, setGender] = useState(profile.gender || 'Male');
  const [height, setHeight] = useState(profile.height || 178);
  const [weight, setWeight] = useState(profile.weight || 82.5);
  const [targetWeight, setTargetWeight] = useState(profile.targetWeight || 75.0);
  const [targetCompletionDate, setTargetCompletionDate] = useState(profile.targetCompletionDate || '');
  const [activityLevel, setActivityLevel] = useState(profile.activityLevel || 'moderately_active');
  const [gymExperience, setGymExperience] = useState(profile.gymExperience || 'Intermediate');
  const [workoutDays, setWorkoutDays] = useState(profile.workoutDays || 4);
  const [dietaryPreference, setDietaryPreference] = useState(profile.dietaryPreference || 'Non-Vegetarian');

  const [cal, setCal] = useState(profile.targets?.calories || 2000);
  const [prot, setProt] = useState(profile.targets?.protein || 150);
  const [carb, setCarb] = useState(profile.targets?.carbs || 180);
  const [fat, setFat] = useState(profile.targets?.fat || 60);
  const [fib, setFib] = useState(profile.targets?.fiber || 30);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    setApiKey(profile.apiKey || '');
    setGoogleClientId(profile.googleClientId || '');
    setName(profile.name || '');
    setAge(profile.age || 25);
    setGender(profile.gender || 'Male');
    setHeight(profile.height || 178);
    setWeight(profile.weight || 82.5);
    setTargetWeight(profile.targetWeight || 75.0);
    setTargetCompletionDate(profile.targetCompletionDate || '');
    setActivityLevel(profile.activityLevel || 'moderately_active');
    setGymExperience(profile.gymExperience || 'Intermediate');
    setWorkoutDays(profile.workoutDays || 4);
    setDietaryPreference(profile.dietaryPreference || 'Non-Vegetarian');

    setCal(profile.targets?.calories || 2000);
    setProt(profile.targets?.protein || 150);
    setCarb(profile.targets?.carbs || 180);
    setFat(profile.targets?.fat || 60);
    setFib(profile.targets?.fiber || 30);
  }, [profile]);

  const handleSave = (e) => {
    e.preventDefault();

    const w = parseFloat(weight) || 80;
    const h = parseFloat(height) || 175;
    const a = parseInt(age) || 25;

    // Mifflin-St Jeor BMR
    let bmr = 0;
    if (gender === 'Male') {
      bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
    } else {
      bmr = (10 * w) + (6.25 * h) - (5 * a) - 161;
    }

    // Activity Multiplier
    let activityMultiplier = 1.2;
    if (activityLevel === 'lightly_active') activityMultiplier = 1.375;
    if (activityLevel === 'moderately_active') activityMultiplier = 1.55;
    if (activityLevel === 'very_active') activityMultiplier = 1.725;

    const tdee = Math.round(bmr * activityMultiplier);

    // Calculate days remaining to target date
    let daysRemaining = 90; // Default
    if (targetCompletionDate) {
      const today = new Date();
      const target = new Date(targetCompletionDate);
      const timeDiff = target.getTime() - today.getTime();
      if (timeDiff > 0) {
        daysRemaining = Math.max(7, Math.ceil(timeDiff / (1000 * 3600 * 24)));
      }
    }

    const weightDiff = targetWeight - w;
    let calorieTarget = tdee;
    let estimatedAchievementDate = targetCompletionDate;

    if (weightDiff < 0) {
      const totalDeficitNeeded = Math.abs(weightDiff) * 7700;
      const dailyDeficitNeeded = totalDeficitNeeded / daysRemaining;

      if (dailyDeficitNeeded > 1000) {
        calorieTarget = Math.round(tdee - 500);
        const achievementDays = Math.round(totalDeficitNeeded / 500);
        const estDate = new Date();
        estDate.setDate(estDate.getDate() + achievementDays);
        estimatedAchievementDate = formatDate(estDate);
      } else if (dailyDeficitNeeded < 300) {
        calorieTarget = Math.round(tdee - 350);
        const achievementDays = Math.round(totalDeficitNeeded / 350);
        const estDate = new Date();
        estDate.setDate(estDate.getDate() + achievementDays);
        estimatedAchievementDate = formatDate(estDate);
      } else {
        calorieTarget = Math.round(tdee - dailyDeficitNeeded);
        estimatedAchievementDate = targetCompletionDate;
      }
      calorieTarget = Math.max(1200, calorieTarget);
    } else if (weightDiff > 0) {
      const totalSurplusNeeded = weightDiff * 7700;
      const dailySurplusNeeded = totalSurplusNeeded / daysRemaining;

      if (dailySurplusNeeded > 500) {
        calorieTarget = Math.round(tdee + 350);
        const achievementDays = Math.round(totalSurplusNeeded / 350);
        const estDate = new Date();
        estDate.setDate(estDate.getDate() + achievementDays);
        estimatedAchievementDate = formatDate(estDate);
      } else if (dailySurplusNeeded < 200) {
        calorieTarget = Math.round(tdee + 250);
        const achievementDays = Math.round(totalSurplusNeeded / 250);
        const estDate = new Date();
        estDate.setDate(estDate.getDate() + achievementDays);
        estimatedAchievementDate = formatDate(estDate);
      } else {
        calorieTarget = Math.round(tdee + dailySurplusNeeded);
        estimatedAchievementDate = targetCompletionDate;
      }
    }

    // Protein split based on experience
    let proteinPerKg = 2.0;
    if (gymExperience === 'Beginner') proteinPerKg = 1.6;
    if (gymExperience === 'Advanced') proteinPerKg = 2.2;
    const proteinTarget = Math.round(w * proteinPerKg);

    const fatTarget = Math.round((calorieTarget * 0.25) / 9);
    const carbCalories = calorieTarget - (proteinTarget * 4) - (fatTarget * 9);
    const carbTarget = Math.round(Math.max(50, carbCalories / 4));
    const fiberTarget = Math.round(Math.max(25, (calorieTarget / 1000) * 14));

    if (!estimatedAchievementDate) {
      const achievementDays = Math.max(30, Math.round((Math.abs(weightDiff) || 5) * 7700 / 500));
      const estDate = new Date();
      estDate.setDate(estDate.getDate() + achievementDays);
      estimatedAchievementDate = formatDate(estDate);
    }

    const updated = {
      ...profile,
      apiKey: apiKey.trim(),
      googleClientId: googleClientId.trim(),
      name: name.trim(),
      age: a,
      gender,
      height: h,
      weight: w,
      targetWeight: parseFloat(targetWeight) || 75,
      targetCompletionDate,
      estimatedAchievementDate,
      activityLevel,
      gymExperience,
      workoutDays: parseInt(workoutDays),
      dietaryPreference,
      targets: {
        calories: calorieTarget,
        protein: proteinTarget,
        carbs: carbTarget,
        fat: fatTarget,
        fiber: fiberTarget
      }
    };

    onProfileUpdate(updated);

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
          <p className="page-subtitle">Configure AI model integrations, edit personal metrics, and view database synchronizations</p>
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
          <li>Sign in using a Google Account.</li>
          <li>Click on **"Get API key"** and create a key in a new project.</li>
          <li>Copy the generated key (starts with <code>AIzaSy...</code>) and paste it below.</li>
        </ol>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* API Settings */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Key size={18} color="hsl(var(--cyan))" /> AI Companion Integration
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

        {/* Smartwatch Settings */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} color="hsl(var(--cyan))" /> Google Fit / Smartwatch Sync
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginBottom: '1.25rem', lineHeight: '1.5' }}>
            Sync fitness data (steps, active calories, sleep, weight, workouts) directly from your Noise/Google Fit connected watch.
          </p>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Google OAuth Client ID</label>
            <input 
              type="text"
              className="form-input"
              placeholder="12345678-abcde.apps.googleusercontent.com"
              value={googleClientId}
              onChange={(e) => setGoogleClientId(e.target.value)}
            />
          </div>
          
          <div style={{ background: 'hsl(var(--bg-card) / 40%)', border: '1px solid hsl(var(--border-light))', borderRadius: '8px', padding: '1rem', fontSize: '0.85rem' }}>
            <h4 style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'hsl(var(--cyan))' }}>
              <BookOpen size={14} /> Setup Instructions:
            </h4>
            <ol style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem', color: 'hsl(var(--text-secondary))', lineHeight: '1.4' }}>
              <li>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" style={{ color: 'hsl(var(--cyan))', textDecoration: 'underline' }}>Google Cloud Console <ExternalLink size={10} /></a> and select/create a project.</li>
              <li>Configure the **OAuth consent screen** (User Type: External) with your email and basic app name details. Add the scopes: <code>.../auth/fitness.activity.read</code> and <code>.../auth/fitness.body.read</code>.</li>
              <li>Go to **Credentials** &rarr; **Create Credentials** &rarr; **OAuth client ID**.</li>
              <li>Choose **Web application** and add authorized JavaScript origins:
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.25rem 0.5rem', borderRadius: '4px', marginTop: '0.25rem', fontFamily: 'monospace', fontSize: '0.75rem', color: 'hsl(var(--cyan))' }}>
                  http://localhost:5173<br/>
                  https://auradiet-app.vercel.app
                </div>
              </li>
              <li>Copy the generated **Client ID** and paste it above!</li>
            </ol>
          </div>
        </div>

        {/* Profile Details */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={18} color="hsl(var(--cyan))" /> Personal Profile Metrics
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Full Name</label>
              <input type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Age (years)</label>
              <input type="number" className="form-input" value={age} onChange={(e) => setAge(parseInt(e.target.value) || 25)} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Gender</label>
              <select className="form-select" value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Height (cm)</label>
              <input type="number" className="form-input" value={height} onChange={(e) => setHeight(parseFloat(e.target.value) || 178)} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Current Weight (kg)</label>
              <input type="number" className="form-input" step="0.1" value={weight} onChange={(e) => setWeight(parseFloat(e.target.value) || 82.5)} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Goal Weight (kg)</label>
              <input type="number" className="form-input" step="0.1" value={targetWeight} onChange={(e) => setTargetWeight(parseFloat(e.target.value) || 75.0)} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Target Completion Date</label>
              <input type="date" className="form-input" value={targetCompletionDate} onChange={(e) => setTargetCompletionDate(e.target.value)} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Estimated Achievement Date</label>
              <input type="text" className="form-input" value={profile.estimatedAchievementDate || 'Calculating...'} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
            <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
              <label className="form-label">Activity Level</label>
              <select className="form-select" value={activityLevel} onChange={(e) => setActivityLevel(e.target.value)}>
                <option value="sedentary">Sedentary (Desk job, no activity)</option>
                <option value="lightly_active">Lightly Active (1-2 sessions/wk)</option>
                <option value="moderately_active">Moderately Active (3-5 sessions/wk)</option>
                <option value="very_active">Very Active (heavy physical work)</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Experience</label>
              <select className="form-select" value={gymExperience} onChange={(e) => setGymExperience(e.target.value)}>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Days / Wk</label>
              <input type="number" className="form-input" value={workoutDays} onChange={(e) => setWorkoutDays(parseInt(e.target.value) || 4)} min="1" max="7" />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '1.25rem', marginBottom: 0 }}>
            <label className="form-label">Dietary Preference</label>
            <select className="form-select" value={dietaryPreference} onChange={(e) => setDietaryPreference(e.target.value)}>
              <option value="Vegetarian">Vegetarian</option>
              <option value="Eggetarian">Eggetarian</option>
              <option value="Non-Vegetarian">Non-Vegetarian</option>
              <option value="Vegan">Vegan</option>
            </select>
          </div>
        </div>

        {/* Targets */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sliders size={18} color="hsl(var(--emerald))" /> Computed Target Budgets
          </h3>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Computed Daily Calories Limit (kcal)</label>
            <input type="number" className="form-input" value={cal} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
          </div>

          <div style={{ borderTop: '1px solid hsl(var(--border-light))', paddingTop: '1.5rem' }}>
            <h4 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#fff' }}>Computed Macronutrient Targets:</h4>
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

      {/* DB Integration Status */}
      <div className="glass-panel" style={{ padding: '2rem', marginTop: '1.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Cloud size={18} color="hsl(var(--cyan))" /> Database Sync Status
        </h3>
        {dbConnected ? (
          <div style={{ padding: '1rem', background: 'hsl(var(--emerald) / 5%)', border: '1px solid hsl(var(--emerald) / 20%)', borderRadius: '8px', color: 'hsl(var(--emerald))', fontSize: '0.9rem' }}>
            Database Connected: Sync active across Vercel deployments.
          </div>
        ) : (
          <div style={{ padding: '1rem', background: 'hsl(var(--amber) / 5%)', border: '1px solid hsl(var(--amber) / 20%)', borderRadius: '8px', color: 'hsl(var(--amber))', fontSize: '0.9rem' }}>
            Offline Mode: Using local browser storage.
          </div>
        )}
      </div>

      {/* Logout */}
      <div className="glass-panel" style={{ padding: '2rem', marginTop: '1.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Profile Session</h3>
        <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.85rem', marginBottom: '1rem' }}>
          Logged in as {profile.name} ({gender}, {age}yo).
        </p>
        <button onClick={onLogout} className="btn btn-secondary">Logout & Switch Profile</button>
      </div>

      {/* Danger Zone */}
      <div className="glass-panel" style={{ padding: '2rem', border: '1px solid hsl(var(--rose) / 25%)', marginTop: '2.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'hsl(var(--rose))' }}>Danger Zone</h3>
        <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          Resetting will wipe all workout logs, diet histories, achievements, and settings from the database.
        </p>
        <button onClick={() => { if (window.confirm('Reset all details?')) onResetAll(); }} className="btn btn-danger">Reset Application Data</button>
      </div>
    </div>
  );
}

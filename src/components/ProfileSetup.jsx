import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Award, Heart } from 'lucide-react';

export default function ProfileSetup({ profile, onComplete, onSkip }) {
  const [step, setStep] = useState(1);
  const [height, setHeight] = useState(profile.height || 175);
  const [weight, setWeight] = useState(profile.weight || 80);
  const [targetWeight, setTargetWeight] = useState(profile.targetWeight || 72);
  const [monthlyTargetWeightChange, setMonthlyTargetWeightChange] = useState(profile.monthlyTargetWeightChange || -2.0);
  const [activityLevel, setActivityLevel] = useState(profile.activityLevel || 'moderately_active');
  const [workoutHours, setWorkoutHours] = useState(profile.workoutHours || 4);
  const [lifestyleNotes, setLifestyleNotes] = useState('');

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleCalculate();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleCalculate = () => {
    // BMR Calculation (Mifflin-St Jeor) - assuming average gender factors for simplicity
    const bmr = (10 * weight) + (6.25 * height) - (5 * 28) + 5; // standard average male/active baseline
    
    // Activity Multipliers
    let activityMultiplier = 1.2;
    if (activityLevel === 'lightly_active') activityMultiplier = 1.375;
    if (activityLevel === 'moderately_active') activityMultiplier = 1.55;
    if (activityLevel === 'very_active') activityMultiplier = 1.725;

    // TDEE + workout adjustments
    const baseTdee = bmr * activityMultiplier;
    // Add workout active calories (approx 400 kcal per hour of workout spread out daily)
    const workoutBurnDaily = (workoutHours * 400) / 7;
    const tdee = Math.round(baseTdee + workoutBurnDaily);

    // Calculate Targets based on monthly target weight change
    // 1 kg body weight ≈ 7700 kcal. Daily offset = (monthlyChange * 7700) / 30.4
    const dailyCalorieOffset = (monthlyTargetWeightChange * 7700) / 30.4;
    const calorieTarget = Math.max(1200, Math.round(tdee + dailyCalorieOffset)); // Floor of 1200 kcal for safety

    // Macronutrient Splits
    // Protein: 2.0g per kg of bodyweight
    const proteinTarget = Math.round(weight * 2.0);
    // Fat: 25% of calories
    const fatTarget = Math.round((calorieTarget * 0.25) / 9);
    // Carbs: Remaining calories
    const carbCalories = calorieTarget - (proteinTarget * 4) - (fatTarget * 9);
    const carbTarget = Math.round(Math.max(50, carbCalories / 4));
    // Fiber: 14g per 1000 calories, min 25g
    const fiberTarget = Math.round(Math.max(25, (calorieTarget / 1000) * 14));

    const finalProfile = {
      ...profile,
      height: parseFloat(height),
      weight: parseFloat(weight),
      targetWeight: parseFloat(targetWeight),
      monthlyTargetWeightChange: parseFloat(monthlyTargetWeightChange),
      activityLevel,
      workoutHours: parseFloat(workoutHours),
      lifestyleNotes,
      targets: {
        calories: calorieTarget,
        protein: proteinTarget,
        carbs: carbTarget,
        fat: fatTarget,
        fiber: fiberTarget
      },
      setupCompleted: true
    };

    onComplete(finalProfile);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-panel setup-wizard">
        
        {/* Step Indicator */}
        <div className="wizard-step-indicator">
          <div className={`step-dot ${step === 1 ? 'active' : ''}`}></div>
          <div className={`step-dot ${step === 2 ? 'active' : ''}`}></div>
          <div className={`step-dot ${step === 3 ? 'active' : ''}`}></div>
        </div>

        {step === 1 && (
          <div>
            <Heart size={40} color="hsl(var(--emerald))" style={{ margin: '0 auto 1rem', filter: 'drop-shadow(0 0 10px hsl(var(--emerald) / 0.5))' }} />
            <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Welcome to AuraDiet</h2>
            <p style={{ color: 'hsl(var(--text-secondary))', marginBottom: '2rem', fontSize: '0.95rem' }}>
              Let's create your weight loss profile. Tell us about your body dimensions.
            </p>

            <div className="form-group">
              <label className="form-label">Height (cm)</label>
              <input 
                type="number" 
                className="form-input" 
                value={height} 
                onChange={(e) => setHeight(e.target.value)}
                min="100" 
                max="250"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Current Weight (kg)</label>
              <input 
                type="number" 
                className="form-input" 
                value={weight} 
                onChange={(e) => setWeight(e.target.value)}
                min="30" 
                max="250"
                step="0.1"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Target Weight (kg)</label>
              <input 
                type="number" 
                className="form-input" 
                value={targetWeight} 
                onChange={(e) => setTargetWeight(e.target.value)}
                min="30" 
                max="250"
                step="0.1"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Monthly Target Change (kg)</label>
              <input 
                type="number" 
                className="form-input" 
                value={monthlyTargetWeightChange} 
                onChange={(e) => setMonthlyTargetWeightChange(e.target.value)}
                min="-10" 
                max="10"
                step="0.1"
              />
              <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginTop: '0.25rem', display: 'block' }}>
                Use negative values for weight loss (e.g., -2.0) and positive for weight gain (e.g., 1.5).
              </span>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <Award size={40} color="hsl(var(--cyan))" style={{ margin: '0 auto 1rem', filter: 'drop-shadow(0 0 10px hsl(var(--cyan) / 0.5))' }} />
            <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Lifestyle & Activity</h2>
            <p style={{ color: 'hsl(var(--text-secondary))', marginBottom: '2rem', fontSize: '0.95rem' }}>
              How active is your daily lifestyle, and how often do you workout?
            </p>

            <div className="form-group">
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

            <div className="form-group">
              <label className="form-label">Weekly Workout Hours</label>
              <input 
                type="number" 
                className="form-input" 
                value={workoutHours} 
                onChange={(e) => setWorkoutHours(e.target.value)}
                min="0" 
                max="40"
                step="0.5"
              />
              <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginTop: '0.25rem', display: 'block' }}>
                Used to sync & compare with your NoiseFit active data!
              </span>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Food & Coaching Preferences</h2>
            <p style={{ color: 'hsl(var(--text-secondary))', marginBottom: '2rem', fontSize: '0.95rem' }}>
              Do you follow a specific diet or have target lifestyle foods?
            </p>

            <div className="form-group">
              <label className="form-label">Dietary Preferences / Favorite Foods</label>
              <textarea 
                className="form-input" 
                rows="4" 
                style={{ resize: 'none' }}
                placeholder="e.g. Vegetarian, keto, allergic to nuts. I love eating chicken breast, egg white, broccoli, oats, white rice..."
                value={lifestyleNotes} 
                onChange={(e) => setLifestyleNotes(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginTop: '2rem' }}>
          {step > 1 ? (
            <button className="btn btn-secondary" onClick={handleBack}>
              <ChevronLeft size={16} /> Back
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={onSkip}>
              Skip for now
            </button>
          )}

          <button className="btn btn-primary" onClick={handleNext} style={{ flexGrow: 1 }}>
            {step === 3 ? 'Calculate Targets' : 'Continue'} <ChevronRight size={16} />
          </button>
        </div>

      </div>
    </div>
  );
}

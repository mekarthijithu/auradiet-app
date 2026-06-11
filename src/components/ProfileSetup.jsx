import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Award, Heart, User, Scale, Utensils, Calendar } from 'lucide-react';
import { formatDate } from '../utils/db';

export default function ProfileSetup({ profile, onComplete, onSkip }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(profile.name || '');
  const [age, setAge] = useState(profile.age || 25);
  const [gender, setGender] = useState(profile.gender || 'Male');
  const [height, setHeight] = useState(profile.height || 175);
  const [weight, setWeight] = useState(profile.weight || 80);
  const [targetWeight, setTargetWeight] = useState(profile.targetWeight || 72);
  const [targetCompletionDate, setTargetCompletionDate] = useState(profile.targetCompletionDate || '');
  const [activityLevel, setActivityLevel] = useState(profile.activityLevel || 'moderately_active');
  const [gymExperience, setGymExperience] = useState(profile.gymExperience || 'Intermediate');
  const [workoutDays, setWorkoutDays] = useState(profile.workoutDays || 4);
  const [dietaryPreference, setDietaryPreference] = useState(profile.dietaryPreference || 'Non-Vegetarian');

  const handleNext = () => {
    if (step < 4) {
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
    let daysRemaining = 90; // Default fallback
    if (targetCompletionDate) {
      const today = new Date();
      const target = new Date(targetCompletionDate);
      const timeDiff = target.getTime() - today.getTime();
      if (timeDiff > 0) {
        daysRemaining = Math.max(7, Math.ceil(timeDiff / (1000 * 3600 * 24)));
      }
    }

    // Weight deficit/surplus math
    const weightDiff = targetWeight - w; // negative = lose weight, positive = gain weight
    let calorieTarget = tdee;
    let estimatedAchievementDate = targetCompletionDate;

    if (weightDiff < 0) {
      // Weight loss: 1kg ≈ 7700 kcal
      const totalDeficitNeeded = Math.abs(weightDiff) * 7700;
      const dailyDeficitNeeded = totalDeficitNeeded / daysRemaining;

      // Cap daily deficit between 300 kcal and 1000 kcal for safety
      if (dailyDeficitNeeded > 1000) {
        // Too aggressive deficit, reset to standard safe deficit
        calorieTarget = Math.round(tdee - 500);
        const achievementDays = Math.round(totalDeficitNeeded / 500);
        const estDate = new Date();
        estDate.setDate(estDate.getDate() + achievementDays);
        estimatedAchievementDate = formatDate(estDate);
      } else if (dailyDeficitNeeded < 300) {
        // Too small deficit, set to 350
        calorieTarget = Math.round(tdee - 350);
        const achievementDays = Math.round(totalDeficitNeeded / 350);
        const estDate = new Date();
        estDate.setDate(estDate.getDate() + achievementDays);
        estimatedAchievementDate = formatDate(estDate);
      } else {
        calorieTarget = Math.round(tdee - dailyDeficitNeeded);
        estimatedAchievementDate = targetCompletionDate;
      }
      calorieTarget = Math.max(1200, calorieTarget); // hard floor
    } else if (weightDiff > 0) {
      // Weight gain: 1kg ≈ 7700 kcal
      const totalSurplusNeeded = weightDiff * 7700;
      const dailySurplusNeeded = totalSurplusNeeded / daysRemaining;

      // Cap daily surplus between 250 kcal and 500 kcal
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

    // Fat: 25% of calories
    const fatTarget = Math.round((calorieTarget * 0.25) / 9);

    // Carbs: remaining calories
    const carbCalories = calorieTarget - (proteinTarget * 4) - (fatTarget * 9);
    const carbTarget = Math.round(Math.max(50, carbCalories / 4));

    // Fiber
    const fiberTarget = Math.round(Math.max(25, (calorieTarget / 1000) * 14));

    if (!estimatedAchievementDate) {
      const achievementDays = Math.max(30, Math.round((Math.abs(weightDiff) || 5) * 7700 / 500));
      const estDate = new Date();
      estDate.setDate(estDate.getDate() + achievementDays);
      estimatedAchievementDate = formatDate(estDate);
    }

    const finalProfile = {
      ...profile,
      name,
      age: a,
      gender,
      height: h,
      weight: w,
      targetWeight: parseFloat(targetWeight),
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
      },
      setupCompleted: true
    };

    onComplete(finalProfile);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="glass-panel setup-wizard" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
        
        {/* Step Indicator */}
        <div className="wizard-step-indicator" style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {[1, 2, 3, 4].map(s => (
            <div 
              key={s} 
              className={`step-dot ${step === s ? 'active' : ''}`}
              style={{
                width: step === s ? '24px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: step === s ? 'hsl(var(--emerald))' : 'hsl(var(--border-light))',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>

        {step === 1 && (
          <div>
            <User size={40} color="hsl(var(--emerald))" style={{ margin: '0 auto 1rem', filter: 'drop-shadow(0 0 10px hsl(var(--emerald) / 0.5))' }} />
            <h2 style={{ fontSize: '1.6rem', textAlign: 'center', marginBottom: '0.5rem' }}>Let's Get Started!</h2>
            <p style={{ color: 'hsl(var(--text-secondary))', textAlign: 'center', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Welcome to AuraFit. Please tell us a little bit about yourself.
            </p>

            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Jithu"
                value={name} 
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Age (years)</label>
              <input 
                type="number" 
                className="form-input" 
                value={age} 
                onChange={(e) => setAge(e.target.value)}
                min="10" 
                max="100"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Gender</label>
              <select 
                className="form-select"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <Scale size={40} color="hsl(var(--cyan))" style={{ margin: '0 auto 1rem', filter: 'drop-shadow(0 0 10px hsl(var(--cyan) / 0.5))' }} />
            <h2 style={{ fontSize: '1.6rem', textAlign: 'center', marginBottom: '0.5rem' }}>Body Dimensions</h2>
            <p style={{ color: 'hsl(var(--text-secondary))', textAlign: 'center', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Input your height, weights, and set your target timeline.
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

            <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
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
              <div>
                <label className="form-label">Goal Weight (kg)</label>
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
            </div>

            <div className="form-group">
              <label className="form-label">Target Completion Date</label>
              <input 
                type="date" 
                className="form-input" 
                value={targetCompletionDate} 
                onChange={(e) => setTargetCompletionDate(e.target.value)}
                min={formatDate(new Date())}
                required
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <Award size={40} color="hsl(var(--amber))" style={{ margin: '0 auto 1rem', filter: 'drop-shadow(0 0 10px hsl(var(--amber) / 0.5))' }} />
            <h2 style={{ fontSize: '1.6rem', textAlign: 'center', marginBottom: '0.5rem' }}>Gym & Training Habits</h2>
            <p style={{ color: 'hsl(var(--text-secondary))', textAlign: 'center', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Help us establish your workout targets.
            </p>

            <div className="form-group">
              <label className="form-label">Daily Activity Level</label>
              <select 
                className="form-select"
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value)}
              >
                <option value="sedentary">Sedentary (Desk Job, little exercise)</option>
                <option value="lightly_active">Lightly Active (1-2 workouts/wk)</option>
                <option value="moderately_active">Moderately Active (3-5 workouts/wk)</option>
                <option value="very_active">Very Active (daily heavy workouts)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Gym Experience</label>
              <select 
                className="form-select"
                value={gymExperience}
                onChange={(e) => setGymExperience(e.target.value)}
              >
                <option value="Beginner">Beginner (under 1 year)</option>
                <option value="Intermediate">Intermediate (1-3 years)</option>
                <option value="Advanced">Advanced (3+ years)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Workout Days per Week</label>
              <input 
                type="number" 
                className="form-input" 
                value={workoutDays} 
                onChange={(e) => setWorkoutDays(e.target.value)}
                min="1" 
                max="7"
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <Utensils size={40} color="hsl(var(--rose))" style={{ margin: '0 auto 1rem', filter: 'drop-shadow(0 0 10px hsl(var(--rose) / 0.5))' }} />
            <h2 style={{ fontSize: '1.6rem', textAlign: 'center', marginBottom: '0.5rem' }}>Dietary Preferences</h2>
            <p style={{ color: 'hsl(var(--text-secondary))', textAlign: 'center', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Your food choices help tailor the AI coach nutrition advice.
            </p>

            <div className="form-group">
              <label className="form-label">Diet Preference</label>
              <select 
                className="form-select"
                value={dietaryPreference}
                onChange={(e) => setDietaryPreference(e.target.value)}
              >
                <option value="Vegetarian">Vegetarian</option>
                <option value="Eggetarian">Eggetarian</option>
                <option value="Non-Vegetarian">Non-Vegetarian</option>
                <option value="Vegan">Vegan</option>
              </select>
            </div>

            <div style={{ background: 'hsl(var(--bg-dark))', padding: '1rem', borderRadius: '8px', border: '1px solid hsl(var(--border-light))', marginTop: '1.5rem' }}>
              <h4 style={{ fontSize: '0.85rem', color: '#fff', marginBottom: '0.25rem' }}>Calculations Note:</h4>
              <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', lineHeight: '1.4' }}>
                We'll compute your maintenance calories (TDEE), daily protein (using {gymExperience === 'Beginner' ? '1.6g' : gymExperience === 'Intermediate' ? '2.0g' : '2.2g'}/kg), carbs, fats (25%), and verify target completion date safety.
              </p>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginTop: '2rem' }}>
          {step > 1 ? (
            <button className="btn btn-secondary" onClick={handleBack} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <ChevronLeft size={16} /> Back
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={onSkip}>
              Skip
            </button>
          )}

          <button className="btn btn-primary" onClick={handleNext} style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
            {step === 4 ? 'Calculate Targets' : 'Continue'} <ChevronRight size={16} />
          </button>
        </div>

      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Droplet, 
  Scale, 
  Flame, 
  Sparkles, 
  AlertTriangle, 
  Info, 
  IndianRupee, 
  Footprints, 
  Moon, 
  CheckCircle2, 
  TrendingDown,
  Activity,
  Watch
} from 'lucide-react';
import { getDayLog, saveDayLog, getLatestWeight, formatDate } from '../utils/db';
import { getGoogleFitAccessToken, fetchGoogleFitMetrics } from '../utils/googleFit';

export default function Dashboard({ profile, logs, onLogsUpdate, currentDate, setCurrentDate }) {
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  
  // Sleep inputs state
  const [sleepStart, setSleepStart] = useState('');
  const [sleepEnd, setSleepEnd] = useState('');

  const [syncStatus, setSyncStatus] = useState('idle');
  const [syncMessage, setSyncMessage] = useState('');

  const dayData = getDayLog(currentDate);

  const handleSyncSmartwatch = async () => {
    if (!profile.googleClientId) {
      setSyncStatus('error');
      setSyncMessage('Google Client ID is missing. Configure it in Settings.');
      setTimeout(() => { setSyncStatus('idle'); setSyncMessage(''); }, 5000);
      return;
    }

    setSyncStatus('syncing');
    setSyncMessage('Authorizing Google Fit...');

    try {
      const token = await getGoogleFitAccessToken(profile.googleClientId);
      setSyncMessage('Fetching metrics...');
      const fitData = await fetchGoogleFitMetrics(token, currentDate);
      setSyncMessage('Merging logs...');

      const updatedDayData = { ...dayData };

      if (fitData.steps > 0) {
        updatedDayData.steps = Math.max(dayData.steps || 0, fitData.steps);
      }

      if (fitData.activeCalories > 0) {
        updatedDayData.activeCalories = Math.max(dayData.activeCalories || 0, fitData.activeCalories);
      }

      if (fitData.weight) {
        updatedDayData.weight = fitData.weight;
      }

      if (fitData.sleepHours > 0) {
        updatedDayData.sleep = {
          ...updatedDayData.sleep,
          hours: Math.max(dayData.sleep?.hours || 0, fitData.sleepHours)
        };
      }

      if (fitData.workouts && fitData.workouts.length > 0) {
        if (!updatedDayData.workout) {
          updatedDayData.workout = { completed: false, entries: [] };
        }
        if (!updatedDayData.workout.entries) {
          updatedDayData.workout.entries = [];
        }

        const existingEntries = updatedDayData.workout.entries || [];
        const nextEntries = [...existingEntries];

        for (const newW of fitData.workouts) {
          const isDuplicate = existingEntries.some(
            ex => ex.startTimeMillis === newW.startTimeMillis || 
                 (ex.name.toLowerCase() === newW.name.toLowerCase() && Math.abs((ex.startTimeMillis || 0) - newW.startTimeMillis) < 30 * 60 * 1000)
          );

          if (!isDuplicate) {
            nextEntries.push({
              name: newW.name,
              duration: newW.durationMin,
              calories: newW.caloriesBurned || Math.round(newW.durationMin * 6),
              intensity: 'Moderate',
              startTimeMillis: newW.startTimeMillis
            });
          }
        }

        updatedDayData.workout.entries = nextEntries;
        if (nextEntries.length > 0) {
          updatedDayData.workout.completed = true;
        }
      }

      saveDayLog(currentDate, updatedDayData);
      onLogsUpdate({ ...logs, [currentDate]: updatedDayData });

      setSyncStatus('success');
      setSyncMessage('Watch data synced!');
      setTimeout(() => { setSyncStatus('idle'); setSyncMessage(''); }, 4000);
    } catch (err) {
      console.error(err);
      setSyncStatus('error');
      setSyncMessage(err.message || 'Sync failed.');
      setTimeout(() => { setSyncStatus('idle'); setSyncMessage(''); }, 5000);
    }
  };

  // Calorie & Macro calculations
  const totalCals = dayData.meals?.reduce((sum, m) => sum + (m.calories || 0), 0) || 0;
  const totalProtein = dayData.meals?.reduce((sum, m) => sum + (m.protein || 0), 0) || 0;
  const totalCarbs = dayData.meals?.reduce((sum, m) => sum + (m.carbs || 0), 0) || 0;
  const totalFat = dayData.meals?.reduce((sum, m) => sum + (m.fat || 0), 0) || 0;
  const totalFiber = dayData.meals?.reduce((sum, m) => sum + (m.fiber || 0), 0) || 0;
  const totalCost = dayData.meals?.reduce((sum, m) => sum + (m.cost || 0), 0) || 0;

  const targets = profile.targets || { calories: 2000, protein: 150, carbs: 180, fat: 60, fiber: 30 };

  const calPercent = Math.min(100, (totalCals / targets.calories) * 100);
  const strokeDashoffset = 440 - (440 * calPercent) / 100;

  // Calorie burn calculations
  const stepsCalories = Math.round((dayData.steps || 0) * 0.04);
  const workoutCalories = dayData.workout?.entries?.reduce((sum, entry) => {
    if (entry.calories) return sum + entry.calories;
    const setsCount = entry.sets?.length || 0;
    return sum + (setsCount * 8); // estimate 8 kcal per set
  }, 0) || 0;
  const estimatedBurn = stepsCalories + workoutCalories;
  const totalBurn = dayData.activeCalories ? Math.max(dayData.activeCalories, estimatedBurn) : estimatedBurn;

  const burnGoal = 500;
  const burnPercent = Math.min(100, (totalBurn / burnGoal) * 100);
  const burnStrokeDashoffset = 440 - (440 * burnPercent) / 100;

  // Determine fitness score
  const getFitnessScore = () => {
    let score = 50; // baseline
    if (dayData.workout?.completed) score += 15;
    if (totalProtein >= targets.protein) score += 15;
    if (dayData.steps >= 10000) score += 10;
    if ((dayData.sleep?.hours || 0) >= 7) score += 10;
    
    // Deduct for exceeding calories
    if (totalCals > targets.calories) {
      const over = totalCals - targets.calories;
      score -= Math.min(20, Math.round(over / 25));
    } else if (totalCals > 0 && totalCals < targets.calories * 0.8) {
      score -= 5; // slight under-eating penalty
    }

    return Math.max(30, Math.min(100, score));
  };

  const fitnessScore = getFitnessScore();

  // Dynamic Indian Coach Nutrition Advice
  const getDailyNutritionAdvice = () => {
    const remProt = targets.protein - totalProtein;
    if (remProt > 50) {
      return `⚠️ Protein Target Alert: You are ${remProt}g short of your protein goal. Try adding 150g soya chunks (₹30) or 200g Paneer (₹80) to hit your protein budget affordably.`;
    }
    if (totalCals > targets.calories) {
      return "⚠️ Calorie Target Exceeded: Avoid further heavy meals. Sip on lukewarm water or green tea to aid recovery.";
    }
    return "💡 Energy Budget Balanced: Your nutrient ratio is excellent! Keep hydrating and achieve your steps target.";
  };

  const adjustDate = (days) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + days);
    setCurrentDate(formatDate(d));
  };

  const updateWater = (amount) => {
    const updated = { ...dayData, water: Math.max(0, dayData.water + amount) };
    saveDayLog(currentDate, updated);
    onLogsUpdate({ ...logs, [currentDate]: updated });
  };

  const setWaterValue = (ml) => {
    const updated = { ...dayData, water: ml };
    saveDayLog(currentDate, updated);
    onLogsUpdate({ ...logs, [currentDate]: updated });
  };

  const handleSaveWeight = (e) => {
    e.preventDefault();
    const w = parseFloat(weightInput);
    if (!isNaN(w) && w > 30 && w < 250) {
      const updated = { ...dayData, weight: w };
      saveDayLog(currentDate, updated);
      onLogsUpdate({ ...logs, [currentDate]: updated });
      setShowWeightModal(false);
      setWeightInput('');
    }
  };

  const handleToggleWorkout = () => {
    const updated = {
      ...dayData,
      workout: {
        ...dayData.workout,
        completed: !dayData.workout?.completed
      }
    };
    saveDayLog(currentDate, updated);
    onLogsUpdate({ ...logs, [currentDate]: updated });
  };

  const handleStepsUpdate = (steps) => {
    const updated = { ...dayData, steps: parseInt(steps) || 0 };
    saveDayLog(currentDate, updated);
    onLogsUpdate({ ...logs, [currentDate]: updated });
  };

  const handleSaveSleep = (e) => {
    e.preventDefault();
    if (!sleepStart || !sleepEnd) return;

    const [sH, sM] = sleepStart.split(':').map(Number);
    const [eH, eM] = sleepEnd.split(':').map(Number);

    let start = new Date();
    start.setHours(sH, sM, 0, 0);

    let end = new Date();
    end.setHours(eH, eM, 0, 0);
    if (end < start) {
      end.setDate(end.getDate() + 1); // went to sleep before midnight, woke up next day
    }

    const diffMs = end - start;
    const hours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(1));

    const updated = {
      ...dayData,
      sleep: {
        hours,
        start: sleepStart,
        end: sleepEnd
      }
    };
    saveDayLog(currentDate, updated);
    onLogsUpdate({ ...logs, [currentDate]: updated });
    setSleepStart('');
    setSleepEnd('');
  };

  // Habit completion trigger helper
  const handleToggleHabit = (habitKey) => {
    const habits = dayData.habits || { gym: false, water: false, protein: false, steps: false, sleep: false, vitamins: false };
    const updated = {
      ...dayData,
      habits: {
        ...habits,
        [habitKey]: !habits[habitKey]
      }
    };
    saveDayLog(currentDate, updated);
    onLogsUpdate({ ...logs, [currentDate]: updated });
  };

  const getSleepRecoveryNote = (hours) => {
    if (hours === 0) return "No sleep hours logged yet.";
    if (hours < 6) return "⚠️ Short Sleep: Restricting sleep to under 6 hours limits muscle synthesis, compromises recovery, and alters metabolic hormones.";
    if (hours < 8) return "💪 Good Sleep: 6-8 hours of sleep allows standard central nervous system recovery and cellular tissue rebuilding.";
    return "🔥 Elite Sleep: 8+ hours facilitates maximal Growth Hormone secretion, driving muscle hypertrophy and metabolic fat loss.";
  };

  const getNotifications = () => {
    const notifications = [];
    const currentHour = new Date().getHours();
    
    // Gym Reminder
    if (!dayData.workout?.completed && (!dayData.workout?.entries || dayData.workout.entries.length === 0)) {
      notifications.push({
        id: 'gym',
        type: 'workout',
        text: '🏋️ Workout Reminder: Time for Gym! Don\'t forget to complete and log your training session today.',
        color: 'hsl(var(--violet))'
      });
    }

    // Water Reminder
    if (dayData.water < 3000) {
      notifications.push({
        id: 'water',
        type: 'water',
        text: `💧 Hydration Alert: Drink Water! You have logged only ${(dayData.water / 1000).toFixed(1)}L of your 4.0L target.`,
        color: 'hsl(var(--cyan))'
      });
    }

    // Meal Logger Reminders
    const mealCount = dayData.meals?.length || 0;
    if (currentHour >= 10 && mealCount === 0) {
      notifications.push({
        id: 'meal_breakfast',
        type: 'meal',
        text: '🍛 Log Your Meal: You haven\'t logged breakfast today. Keep your calorie tracking consistent!',
        color: 'hsl(var(--amber))'
      });
    } else if (currentHour >= 15 && mealCount <= 1) {
      notifications.push({
        id: 'meal_lunch',
        type: 'meal',
        text: '🍛 Log Your Meal: You haven\'t logged lunch today. Keep your fuel level on track!',
        color: 'hsl(var(--amber))'
      });
    } else if (currentHour >= 21 && mealCount <= 2) {
      notifications.push({
        id: 'meal_dinner',
        type: 'meal',
        text: '🍛 Log Your Meal: Don\'t forget to log your dinner before bed!',
        color: 'hsl(var(--amber))'
      });
    }

    // Sleep Reminder
    const sleepHours = dayData.sleep?.hours || 0;
    if (sleepHours === 0) {
      notifications.push({
        id: 'sleep',
        type: 'sleep',
        text: '😴 Sleep Reminder: Don\'t forget to log your sleep duration from last night to analyze muscle recovery.',
        color: 'hsl(var(--violet))'
      });
    } else if (sleepHours < 7) {
      notifications.push({
        id: 'sleep_low',
        type: 'sleep_quality',
        text: `⚠️ Recovery Warning: Logged sleep is low (${sleepHours} hrs). Standard CNS recovery requires 7-8 hours.`,
        color: 'hsl(var(--rose))'
      });
    }

    // Buy Eggs (stock running low) / Protein Alert
    const totalProt = dayData.meals?.reduce((sum, m) => sum + (m.protein || 0), 0) || 0;
    const isVegetarianOrVegan = profile.dietaryPreference === 'Vegetarian' || profile.dietaryPreference === 'Vegan';
    if (totalProt < targets.protein * 0.6) {
      if (isVegetarianOrVegan) {
        notifications.push({
          id: 'buy_paneer',
          type: 'shopping',
          text: '🛒 Buy Paneer/Soya: Stock running low? Add soya chunks or paneer to hit your protein goal.',
          color: 'hsl(var(--emerald))'
        });
      } else {
        notifications.push({
          id: 'buy_eggs',
          type: 'shopping',
          text: '🍳 Buy Eggs: Stock running low? Pick up eggs or chicken breast to hit your protein goal.',
          color: 'hsl(var(--emerald))'
        });
      }
    }

    return notifications;
  };

  const notifications = getNotifications();

  return (
    <div>
      <header className="page-header">
        <div>
          <h1 className="page-title">Fitness Dashboard</h1>
          <p className="page-subtitle">Personal trainer, nutrition logs, and tracking metrics</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {syncStatus !== 'idle' ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.8rem',
              background: syncStatus === 'error' ? 'hsl(var(--rose) / 10%)' : (syncStatus === 'success' ? 'hsl(var(--emerald) / 10%)' : 'hsl(var(--bg-card))'),
              border: `1px solid ${syncStatus === 'error' ? 'hsl(var(--rose) / 30%)' : (syncStatus === 'success' ? 'hsl(var(--emerald) / 30%)' : 'hsl(var(--border-light))')}`,
              color: syncStatus === 'error' ? 'hsl(var(--rose))' : (syncStatus === 'success' ? 'hsl(var(--emerald))' : 'hsl(var(--cyan))'),
              padding: '0.4rem 1rem',
              borderRadius: '20px'
            }}>
              {syncStatus === 'syncing' && (
                <div style={{ 
                  width: '12px', 
                  height: '12px', 
                  border: '2px solid hsl(var(--cyan))', 
                  borderTopColor: 'transparent', 
                  borderRadius: '50%', 
                  animation: 'spin 1s linear infinite' 
                }} />
              )}
              <span>{syncMessage}</span>
            </div>
          ) : (
            <button 
              onClick={handleSyncSmartwatch}
              className="btn"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                padding: '0.5rem 1rem', 
                borderRadius: '24px', 
                fontSize: '0.8rem',
                background: 'hsl(var(--bg-card))',
                border: '1px solid hsl(var(--border-light))',
                color: '#fff',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <Watch size={14} color="hsl(var(--cyan))" />
              <span>Sync Watch</span>
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'hsl(var(--bg-card))', padding: '0.5rem 1rem', borderRadius: '24px', border: '1px solid hsl(var(--border-light))' }}>
            <ChevronLeft size={18} style={{ cursor: 'pointer', color: 'hsl(var(--text-secondary))' }} onClick={() => adjustDate(-1)} />
            <span style={{ fontWeight: 600, fontFamily: 'var(--font-heading)', fontSize: '0.95rem' }}>
              {currentDate === formatDate(new Date()) ? 'Today' : currentDate}
            </span>
            <ChevronRight size={18} style={{ cursor: 'pointer', color: 'hsl(var(--text-secondary))' }} onClick={() => adjustDate(1)} />
          </div>
        </div>
      </header>

      {/* Smart Notifications Panel */}
      {notifications.length > 0 && (
        <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', borderLeft: '4px solid hsl(var(--emerald))', background: 'hsl(var(--bg-card) / 40%)' }}>
          <h4 style={{ fontSize: '0.9rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
            <Sparkles size={14} color="hsl(var(--emerald))" /> Smart Notifications & Reminders
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {notifications.map((notif) => (
              <div 
                key={notif.id} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  fontSize: '0.8rem', 
                  color: 'hsl(var(--text-secondary))',
                  padding: '0.4rem 0.6rem',
                  background: 'hsl(var(--bg-dark) / 50%)',
                  borderRadius: '8px',
                  border: '1px solid hsl(var(--border-light))',
                  borderLeft: `3px solid ${notif.color}`
                }}
              >
                <span>{notif.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overview targets row */}
      <div className="dashboard-top-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.8rem' }}>Current Weight</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>{dayData.weight || getLatestWeight()} kg</span>
          <button onClick={() => setShowWeightModal(true)} style={{ background: 'none', border: 'none', color: 'hsl(var(--emerald))', cursor: 'pointer', fontSize: '0.75rem', padding: 0, textDecoration: 'underline', alignSelf: 'flex-start' }}>
            Check In Weight
          </button>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.8rem' }}>Target Goal Weight</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'hsl(var(--cyan))' }}>{profile.targetWeight || 75.0} kg</span>
          <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>
            {profile.estimatedAchievementDate ? `Est. Target: ${profile.estimatedAchievementDate}` : 'No deadline configured'}
          </span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.8rem' }}>Fitness Score</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: fitnessScore > 80 ? 'hsl(var(--emerald))' : 'hsl(var(--amber))' }}>
            {fitnessScore}/100
          </span>
          <div style={{ height: '4px', background: 'hsl(var(--bg-dark))', borderRadius: '2px', overflow: 'hidden', marginTop: '0.25rem' }}>
            <div style={{ width: `${fitnessScore}%`, height: '100%', background: fitnessScore > 80 ? 'hsl(var(--emerald))' : 'hsl(var(--amber))' }} />
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Flame size={14} color="hsl(var(--violet))" /> Calorie Burn
          </span>
          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'hsl(var(--violet))' }}>{totalBurn} kcal</span>
          <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>
            Walk: {stepsCalories} kcal | Gym: {workoutCalories} kcal
          </span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.8rem' }}>Food Cost Today</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'hsl(var(--rose))' }}>₹{totalCost}</span>
          <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>Average budget limit: ₹260</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="dashboard-grid">
        
        {/* Calorie Card */}
        <div className="glass-panel calorie-card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ color: 'hsl(var(--text-secondary))', fontWeight: 500, fontSize: '0.9rem' }}>Energy Intake</span>
            <h2 style={{ fontSize: '1.6rem', fontFamily: 'var(--font-heading)' }}>Daily Calories</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.75rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>
                Daily Target: <strong style={{ color: '#fff' }}>{targets.calories} kcal</strong>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>
                Logged Intake: <strong style={{ color: 'hsl(var(--emerald))' }}>{totalCals} kcal</strong>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>
                Remaining: <strong style={{ color: 'hsl(var(--cyan))' }}>{Math.max(0, targets.calories - totalCals)} kcal</strong>
              </div>
            </div>
            {totalCals > targets.calories && (
              <span className="badge badge-rose" style={{ marginTop: '0.5rem', display: 'inline-block', alignSelf: 'flex-start' }}>
                Over target by {totalCals - targets.calories} kcal
              </span>
            )}
          </div>

          <div className="calorie-circle-container">
            <svg width="160" height="160" viewBox="0 0 160 160">
              <circle className="circle-bg" cx="80" cy="80" r="70" />
              <circle 
                className="circle-progress" 
                cx="80" 
                cy="80" 
                r="70" 
                strokeDasharray="440" 
                strokeDashoffset={strokeDashoffset} 
              />
            </svg>
            <div className="circle-text">
              <span className="circle-number">{Math.round(calPercent)}%</span>
              <div className="circle-label">Filled</div>
            </div>
          </div>
        </div>

        {/* Energy Burn Card */}
        <div className="glass-panel calorie-card" style={{ borderLeft: '3px solid hsl(var(--violet))' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ color: 'hsl(var(--text-secondary))', fontWeight: 500, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Flame size={16} color="hsl(var(--violet))" /> Energy Burn
            </span>
            <h2 style={{ fontSize: '1.6rem', fontFamily: 'var(--font-heading)' }}>Daily Active Burn</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.75rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>
                Daily Burn Target: <strong style={{ color: '#fff' }}>{burnGoal} kcal</strong>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>
                Total Active Burn: <strong style={{ color: 'hsl(var(--violet))' }}>{totalBurn} kcal</strong>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', paddingLeft: '0.75rem', borderLeft: '2px solid hsl(var(--border-light))', margin: '0.15rem 0', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                <div>🚶 Walking: <strong>{stepsCalories} kcal</strong></div>
                <div>🏋️ Workouts: <strong>{workoutCalories} kcal</strong></div>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>
                Remaining to Target: <strong style={{ color: 'hsl(var(--cyan))' }}>{Math.max(0, burnGoal - totalBurn)} kcal</strong>
              </div>
            </div>
            {totalBurn >= burnGoal && (
              <span className="badge badge-success" style={{ marginTop: '0.5rem', display: 'inline-block', alignSelf: 'flex-start', background: 'hsl(var(--emerald) / 10%)', color: 'hsl(var(--emerald))' }}>
                Target Achieved! 🎉
              </span>
            )}
          </div>

          <div className="calorie-circle-container">
            <svg width="160" height="160" viewBox="0 0 160 160">
              <circle className="circle-bg" cx="80" cy="80" r="70" />
              <circle 
                className="circle-progress" 
                cx="80" 
                cy="80" 
                r="70" 
                strokeDasharray="440" 
                strokeDashoffset={burnStrokeDashoffset} 
                style={{ stroke: 'hsl(var(--violet))' }}
              />
            </svg>
            <div className="circle-text">
              <span className="circle-number" style={{ color: 'hsl(var(--violet))' }}>{Math.round(burnPercent)}%</span>
              <div className="circle-label">Burned</div>
            </div>
          </div>
        </div>

        {/* Micro elements (Macronutrients) */}
        <div className="macros-grid">
          <div className="glass-panel macro-card" style={{ borderLeft: '3px solid hsl(var(--emerald))' }}>
            <div className="macro-info">
              <span className="macro-name">Protein</span>
              <span className="macro-val">{totalProtein}g / {targets.protein}g</span>
            </div>
            <div className="macro-bar-outer">
              <div className="macro-bar-inner" style={{ width: `${Math.min(100, (totalProtein / targets.protein) * 100)}%`, background: 'hsl(var(--emerald))' }} />
            </div>
          </div>

          <div className="glass-panel macro-card" style={{ borderLeft: '3px solid hsl(var(--cyan))' }}>
            <div className="macro-info">
              <span className="macro-name">Carbs</span>
              <span className="macro-val">{totalCarbs}g / {targets.carbs}g</span>
            </div>
            <div className="macro-bar-outer">
              <div className="macro-bar-inner" style={{ width: `${Math.min(100, (totalCarbs / targets.carbs) * 100)}%`, background: 'hsl(var(--cyan))' }} />
            </div>
          </div>

          <div className="glass-panel macro-card" style={{ borderLeft: '3px solid hsl(var(--amber))' }}>
            <div className="macro-info">
              <span className="macro-name">Fats</span>
              <span className="macro-val">{totalFat}g / {targets.fat}g</span>
            </div>
            <div className="macro-bar-outer">
              <div className="macro-bar-inner" style={{ width: `${Math.min(100, (totalFat / targets.fat) * 100)}%`, background: 'hsl(var(--amber))' }} />
            </div>
          </div>

          <div className="glass-panel macro-card" style={{ borderLeft: '3px solid hsl(var(--rose))' }}>
            <div className="macro-info">
              <span className="macro-name">Fiber</span>
              <span className="macro-val">{totalFiber}g / {targets.fiber}g</span>
            </div>
            <div className="macro-bar-outer">
              <div className="macro-bar-inner" style={{ width: `${Math.min(100, (totalFiber / targets.fiber) * 100)}%`, background: 'hsl(var(--rose))' }} />
            </div>
          </div>
        </div>

        {/* Steps & Steps Slider */}
        <div className="glass-panel" style={{ gridColumn: 'span 4', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Footprints size={18} color="hsl(var(--emerald))" /> Steps Tracker
            </h3>
            <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.8rem' }}>Target: 10,000 steps daily</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', margin: '1rem 0' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'hsl(var(--emerald))' }}>
              {dayData.steps || 0}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>/ 10,000 steps</span>
            <input 
              type="range" 
              min="0" 
              max="20000" 
              step="500"
              value={dayData.steps || 0} 
              onChange={(e) => handleStepsUpdate(e.target.value)}
              style={{ width: '100%', accentColor: 'hsl(var(--emerald))', cursor: 'pointer' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={() => handleStepsUpdate((dayData.steps || 0) + 1000)} style={{ flexGrow: 1, padding: '0.4rem', fontSize: '0.8rem' }}>
              +1,000 Steps
            </button>
            <button className="btn btn-secondary" onClick={() => handleStepsUpdate((dayData.steps || 0) + 5000)} style={{ flexGrow: 1, padding: '0.4rem', fontSize: '0.8rem' }}>
              +5,000 Steps
            </button>
          </div>
        </div>

        {/* Hydration Widget */}
        <div className="glass-panel water-card" style={{ gridColumn: 'span 4' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Droplet size={18} color="hsl(var(--cyan))" /> Hydration Tracker
            </h3>
            <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.85rem' }}>Target: 4.0L (4000ml)</p>
          </div>

          <div className="water-progress">
            <span style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'hsl(var(--cyan))' }}>
              {(dayData.water / 1000).toFixed(1)}L
            </span>
            <span style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem' }}>/ 4.0L logged</span>
          </div>

          <div className="water-bubble-grid">
            {[500, 1000, 1500, 2000, 2500, 3000, 3500, 4000].map((ml) => (
              <div 
                key={ml}
                className={`water-cup ${dayData.water >= ml ? 'filled' : ''}`}
                onClick={() => setWaterValue(dayData.water >= ml ? ml - 500 : ml)}
                style={{ fontSize: '1.2rem', cursor: 'pointer' }}
              >
                💧
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button className="btn btn-secondary" onClick={() => updateWater(250)} style={{ flexGrow: 1, padding: '0.4rem', fontSize: '0.8rem' }}>
              +250ml
            </button>
            <button className="btn btn-secondary" onClick={() => updateWater(500)} style={{ flexGrow: 1, padding: '0.4rem', fontSize: '0.8rem' }}>
              +500ml
            </button>
            <button className="btn btn-danger" onClick={() => setWaterValue(0)} style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}>
              Reset
            </button>
          </div>
        </div>

        {/* Sleep Tracker */}
        <div className="glass-panel" style={{ gridColumn: 'span 4', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Moon size={18} color="hsl(var(--violet))" /> Sleep Tracker
            </h3>
            <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.8rem' }}>Track sleep intervals & recovery quality</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', margin: '0.5rem 0' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'hsl(var(--violet))' }}>
              {dayData.sleep?.hours || 0} hrs
            </span>
            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', textAlign: 'center', lineHeight: '1.3' }}>
              {getSleepRecoveryNote(dayData.sleep?.hours || 0)}
            </span>
          </div>

          <form onSubmit={handleSaveSleep} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <span style={{ fontSize: '0.65rem', color: 'hsl(var(--text-secondary))' }}>Sleep Time</span>
                <input type="time" className="form-input" style={{ padding: '0.3rem', fontSize: '0.75rem' }} value={sleepStart} onChange={(e) => setSleepStart(e.target.value)} required />
              </div>
              <div>
                <span style={{ fontSize: '0.65rem', color: 'hsl(var(--text-secondary))' }}>Wake Time</span>
                <input type="time" className="form-input" style={{ padding: '0.3rem', fontSize: '0.75rem' }} value={sleepEnd} onChange={(e) => setSleepEnd(e.target.value)} required />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ padding: '0.3rem', fontSize: '0.75rem' }}>
              Log Sleep Duration
            </button>
          </form>
        </div>

        {/* Workout Complete checklist toggle */}
        <div className="glass-panel" style={{ gridColumn: 'span 6', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.75rem' }}>Today's Fitness Checklist</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            
            <div 
              onClick={handleToggleWorkout} 
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'hsl(var(--bg-dark))', borderRadius: '8px', border: '1px solid hsl(var(--border-light))', cursor: 'pointer' }}
            >
              <CheckCircle2 size={20} color={dayData.workout?.completed ? 'hsl(var(--emerald))' : 'hsl(var(--text-muted))'} fill={dayData.workout?.completed ? 'hsl(var(--emerald) / 10%)' : 'none'} />
              <div>
                <strong style={{ color: '#fff', fontSize: '0.9rem' }}>Workout Session Completed</strong>
                <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))' }}>Toggle based on your gym routine for today</p>
              </div>
            </div>

            <div 
              onClick={() => handleToggleHabit('vitamins')} 
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'hsl(var(--bg-dark))', borderRadius: '8px', border: '1px solid hsl(var(--border-light))', cursor: 'pointer' }}
            >
              <CheckCircle2 size={20} color={dayData.habits?.vitamins ? 'hsl(var(--emerald))' : 'hsl(var(--text-muted))'} fill={dayData.habits?.vitamins ? 'hsl(var(--emerald) / 10%)' : 'none'} />
              <div>
                <strong style={{ color: '#fff', fontSize: '0.9rem' }}>Vitamins & Supplements Intake</strong>
                <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))' }}>Track daily omega-3 or multivitamin consistency</p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.25rem', color: 'hsl(var(--text-secondary))' }}>
              <span>Steps Met: {dayData.steps >= 10000 ? '✅' : '❌'}</span>
              <span>Water Goal: {dayData.water >= 4000 ? '✅' : '❌'}</span>
              <span>Protein Goal: {totalProtein >= targets.protein ? '✅' : '❌'}</span>
            </div>

          </div>
        </div>

        {/* AI Coaching Tips and dynamic Indian food budget suggestions */}
        <div className="glass-panel" style={{ gridColumn: 'span 12', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', color: 'hsl(var(--emerald))', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
              <Sparkles size={16} /> Indian Budget AI Advisor
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', lineHeight: '1.4', marginBottom: '1rem' }}>
              {getDailyNutritionAdvice()}
            </p>
          </div>

          <div style={{ background: 'hsl(var(--bg-dark))', padding: '0.75rem', borderRadius: '8px', border: '1px solid hsl(var(--border-light))' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--cyan))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Affordable Indian Alternatives:</span>
            <p style={{ fontSize: '0.72rem', color: 'hsl(var(--text-secondary))', marginTop: '0.25rem', lineHeight: '1.4' }}>
              Instead of high cost whey protein powder, prioritize local staples: <strong>Soya Chunks</strong> (50g protein/100g, ₹45/pack), <strong>Paneer</strong> (₹80/200g), or <strong>Egg Whites</strong> (6 eggs, ₹40).
            </p>
          </div>
        </div>

      </div>

      {/* Weight Log Modal */}
      {showWeightModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ maxWidth: '350px' }}>
            <button className="modal-close" onClick={() => setShowWeightModal(false)}>&times;</button>
            <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
              <Scale size={18} color="hsl(var(--emerald))" /> Log Today's Weight
            </h2>
            <form onSubmit={handleSaveWeight}>
              <div className="form-group">
                <label className="form-label">Weight (kg)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  className="form-input" 
                  placeholder={getLatestWeight().toString()}
                  value={weightInput} 
                  onChange={(e) => setWeightInput(e.target.value)}
                  required 
                  autoFocus
                />
              </div>
              <button type="submit" className="btn btn-primary btn-full">Save Check-In</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

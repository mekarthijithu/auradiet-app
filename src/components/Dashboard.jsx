import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Droplet, 
  Scale, 
  RefreshCw, 
  TrendingDown, 
  CheckCircle2, 
  Sparkles,
  Flame,
  Plus,
  AlertTriangle,
  Info,
  IndianRupee
} from 'lucide-react';
import { getDayLog, saveDayLog, getLatestWeight, formatDate } from '../utils/db';

export default function Dashboard({ profile, logs, onLogsUpdate, currentDate, setCurrentDate }) {
  const [syncingNoise, setSyncingNoise] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [showWeightModal, setShowWeightModal] = useState(false);

  const dayData = getDayLog(currentDate);

  // Calorie & Macro calculations
  const totalCals = dayData.meals.reduce((sum, m) => sum + m.calories, 0);
  const totalProtein = dayData.meals.reduce((sum, m) => sum + m.protein, 0);
  const totalCarbs = dayData.meals.reduce((sum, m) => sum + m.carbs, 0);
  const totalFat = dayData.meals.reduce((sum, m) => sum + m.fat, 0);
  const totalFiber = dayData.meals.reduce((sum, m) => sum + m.fiber, 0);

  const targets = profile.targets;

  // Calorie ring offset
  const calPercent = Math.min(100, (totalCals / targets.calories) * 100);
  const strokeDashoffset = 440 - (440 * calPercent) / 100;

  // Calculate dynamic meals suggestions
  const getDynamicMealSuggestions = () => {
    const remCals = targets.calories - totalCals;
    const remProt = targets.protein - totalProtein;
    const remCarbs = targets.carbs - totalCarbs;
    const remFat = targets.fat - totalFat;
    const remFiber = targets.fiber - totalFiber;

    // Check if logged list is empty
    const isEmpty = dayData.meals.length === 0;

    let breakfast = "Oats with milk & dry fruits or Egg scramble (₹120)";
    let lunch = "Grilled Chicken Breast or Paneer with brown rice & Dal (₹250)";
    let snacks = "Whey Protein shake or Boiled chana with sprouts (₹80)";
    let dinner = "Baked Fish or Tofu stir fry with broccoli & chapati (₹220)";

    if (!isEmpty) {
      // Protein deficit checks
      if (remProt > 80) {
        lunch = "💡 Chicken (200g) or Paneer (150g) + brown rice [Need +40g Protein] (₹320)";
        dinner = "💡 Baked Fish or Soya chunk curry + greens [High protein target] (₹280)";
      } else if (remProt > 40) {
        snacks = "💡 Protein Shake or boiled egg whites + apple [Deficient in Protein] (₹140)";
      }

      // Fiber deficit checks
      if (remFiber > 15) {
        dinner = "💡 Dal khichdi + double broccoli & cucumber salad [Need +12g Fiber] (₹180)";
        snacks = "💡 Fruit platter (Papaya/Apple) or chia seed pudding [High Fiber needed] (₹100)";
      }

      // Carb limit checks
      if (remCarbs < 30) {
        lunch = "💡 Low-carb keto salad (Chicken/Tofu + avocado + olive oil) (₹220)";
        dinner = "💡 Sauteed veggies in butter + grilled chicken breast (₹280)";
      }

      // Calorie threshold checks
      if (remCals < 400 && remCals > 100) {
        dinner = "⚠️ Calorie Limit Warning: Egg whites or vegetable clear soup only (₹80)";
      } else if (remCals <= 100) {
        dinner = "⚠️ Calorie Target Exceeded: Avoid dinner or consume only sugar-free green tea.";
      }
    }

    // Nutrient check warnings
    const warnings = [];
    let isMalnourished = false;

    if (!isEmpty) {
      if (totalProtein < targets.protein * 0.35) {
        warnings.push("🥩 Low Protein Warning: You are falling behind on protein today. Add curd, eggs, chicken, or lentils to your next slot.");
        isMalnourished = true;
      }
      if (totalFiber < targets.fiber * 0.35) {
        warnings.push("🥦 Low Fiber Warning: Insufficient daily fiber. Log salads, oats, chia seeds, or whole wheat bread.");
        isMalnourished = true;
      }
      if (totalCals < targets.calories * 0.4 && dayData.mealSchedule.lunch === 'logged') {
        warnings.push("⚠️ Low Energy Alert: Daily calories are abnormally low. Ensure you eat basic meals to maintain resting metabolism.");
        isMalnourished = true;
      }
    }

    return {
      breakfast,
      lunch,
      snacks,
      dinner,
      isMalnourished,
      warnings
    };
  };

  const suggestions = getDynamicMealSuggestions();

  // Compile skipped meal notifications
  const getNotifications = () => {
    const list = [];
    const schedule = dayData.mealSchedule || { breakfast: 'pending', lunch: 'pending', snacks: 'pending', dinner: 'pending' };
    
    if (schedule.breakfast === 'skipped') {
      list.push({
        id: 'skip-b',
        text: '⚠️ Breakfast Skipped! AI Coach recommendation: Distribute remaining targets across lunch/dinner. Add +15g of protein (e.g. eggs, paneer) to lunch.'
      });
    }
    if (schedule.lunch === 'skipped') {
      list.push({
        id: 'skip-l',
        text: '⚠️ Lunch Skipped! AI Coach recommendation: Increase snack size. Add whole grains and whey protein to maintain mental focus & energy.'
      });
    }
    if (schedule.snacks === 'skipped') {
      list.push({
        id: 'skip-s',
        text: '💡 Snack Skipped. AI Coach recommendation: Ensure your dinner has sufficient fiber (green salads, cucumber) for healthy satiety.'
      });
    }
    if (schedule.dinner === 'skipped') {
      list.push({
        id: 'skip-d',
        text: '⚠️ Dinner Skipped! Critical Deficit warning: Ensure tomorrow breakfast is high-protein (40g+) and contains healthy fats.'
      });
    }

    return list;
  };

  const activeNotifications = getNotifications();

  // Navigation handlers
  const adjustDate = (days) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + days);
    setCurrentDate(formatDate(d));
  };

  // Water tracking handlers
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

  // Weight handlers
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

  // Meal schedule toggler
  const handleToggleSchedule = (mealSlot, status) => {
    const currentSchedule = dayData.mealSchedule || { breakfast: 'pending', lunch: 'pending', snacks: 'pending', dinner: 'pending' };
    const nextStatus = currentSchedule[mealSlot] === status ? 'pending' : status;
    const updated = {
      ...dayData,
      mealSchedule: {
        ...currentSchedule,
        [mealSlot]: nextStatus
      }
    };
    saveDayLog(currentDate, updated);
    onLogsUpdate({ ...logs, [currentDate]: updated });
  };

  // NoiseFit Simulator Sync
  const handleNoiseSync = () => {
    if (syncingNoise) return;
    setSyncingNoise(true);
    setTimeout(() => {
      const profileWorkoutWeekly = profile.workoutHours || 4;
      const expectedDailyWorkout = profileWorkoutWeekly / 5;
      const isWorkoutDay = Math.random() > 0.3;
      
      const hr = isWorkoutDay ? parseFloat((expectedDailyWorkout + (Math.random() * 0.5 - 0.25)).toFixed(1)) : 0;
      const cal = hr > 0 ? Math.round(hr * 400 + (Math.random() * 80 - 40)) : 0;

      const updated = {
        ...dayData,
        workout: {
          hours: hr,
          caloriesBurned: cal,
          source: hr > 0 ? 'NoiseFit' : 'Manual'
        }
      };

      saveDayLog(currentDate, updated);
      onLogsUpdate({ ...logs, [currentDate]: updated });
      setSyncingNoise(false);
    }, 1500);
  };

  // Weight Trend Custom SVG Line Chart
  const getWeightTrendPoints = () => {
    const sortedDates = Object.keys(logs).sort();
    const last5Days = sortedDates.slice(-5);
    const weightEntries = last5Days.map(d => ({
      date: d,
      weight: logs[d]?.weight || profile.weight
    }));

    if (weightEntries.length === 0) return { path: '', area: '', points: [] };

    // Standard chart canvas grid is 800 x 180 (expanded for full-width)
    const wMax = Math.max(...weightEntries.map(e => e.weight), profile.weight) + 0.5;
    const wMin = Math.min(...weightEntries.map(e => e.weight), profile.targetWeight) - 0.5;
    const wRange = wMax - wMin || 1;

    const points = weightEntries.map((e, idx) => {
      const x = (idx / (weightEntries.length - 1)) * 740 + 30; // margins
      const y = 150 - ((e.weight - wMin) / wRange) * 120;
      return { x, y, val: e.weight, dateLabel: e.date.substring(5) };
    });

    let path = '';
    let area = '';

    if (points.length > 0) {
      path = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        const cpX1 = points[i-1].x + (points[i].x - points[i-1].x) / 2;
        const cpY1 = points[i-1].y;
        const cpX2 = points[i-1].x + (points[i].x - points[i-1].x) / 2;
        const cpY2 = points[i].y;
        path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${points[i].x} ${points[i].y}`;
      }

      area = `${path} L ${points[points.length-1].x} 160 L ${points[0].x} 160 Z`;
    }

    return { path, area, points };
  };

  const { path, area, points } = getWeightTrendPoints();

  return (
    <div>
      {/* Date Header Picker */}
      <header className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Personal nutrition goals and live tracking</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'hsl(var(--bg-card))', padding: '0.5rem 1rem', borderRadius: '24px', border: '1px solid hsl(var(--border-light))' }}>
          <ChevronLeft 
            size={18} 
            style={{ cursor: 'pointer', color: 'hsl(var(--text-secondary))' }} 
            onClick={() => adjustDate(-1)} 
          />
          <span style={{ fontWeight: 600, fontFamily: 'var(--font-heading)', fontSize: '0.95rem' }}>
            {currentDate === formatDate(new Date()) ? 'Today' : currentDate}
          </span>
          <ChevronRight 
            size={18} 
            style={{ cursor: 'pointer', color: 'hsl(var(--text-secondary))' }} 
            onClick={() => adjustDate(1)} 
          />
        </div>
      </header>

      {/* Skipped Meal Notifications */}
      {activeNotifications.length > 0 && (
        <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem', borderLeft: '4px solid hsl(var(--rose))', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'hsl(var(--rose) / 5%)' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'hsl(var(--rose))', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <AlertTriangle size={14} /> AuraDiet Skipped Meal Alerts
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {activeNotifications.map(notif => (
              <div key={notif.id} style={{ fontSize: '0.9rem', color: 'hsl(var(--text-secondary))', lineHeight: '1.4' }}>
                {notif.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Malnutrition / Deficiency Alerts (NEW) */}
      {suggestions.isMalnourished && (
        <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem', borderLeft: '4px solid hsl(var(--amber))', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'hsl(var(--amber) / 5%)' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'hsl(var(--amber))', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <AlertTriangle size={14} /> Nutrition Deficiency Advisory
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {suggestions.warnings.map((w, idx) => (
              <div key={idx} style={{ fontSize: '0.9rem', color: 'hsl(var(--text-secondary))', lineHeight: '1.4' }}>
                {w}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="dashboard-grid">
        
        {/* Calorie Card */}
        <div className="glass-panel calorie-card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ color: 'hsl(var(--text-secondary))', fontWeight: 500, fontSize: '0.9rem' }}>Energy Tracker</span>
            <h2 style={{ fontSize: '1.6rem', fontFamily: 'var(--font-heading)' }}>Daily Calories</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.75rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>
                Target: <strong style={{ color: '#fff' }}>{targets.calories} kcal</strong>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>
                Consumed: <strong style={{ color: 'hsl(var(--emerald))' }}>{totalCals} kcal</strong>
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

        {/* Micro rings (Macros) */}
        <div className="macros-grid">
          
          {/* Protein */}
          <div className="glass-panel macro-card" style={{ borderLeft: '3px solid hsl(var(--emerald))' }}>
            <div className="macro-info">
              <span className="macro-name">Protein</span>
              <span className="macro-val">{totalProtein}g / {targets.protein}g</span>
            </div>
            <div className="macro-bar-outer">
              <div 
                className="macro-bar-inner" 
                style={{ width: `${Math.min(100, (totalProtein / targets.protein) * 100)}%`, background: 'hsl(var(--emerald))' }}
              />
            </div>
          </div>

          {/* Carbs */}
          <div className="glass-panel macro-card" style={{ borderLeft: '3px solid hsl(var(--cyan))' }}>
            <div className="macro-info">
              <span className="macro-name">Carbs</span>
              <span className="macro-val">{totalCarbs}g / {targets.carbs}g</span>
            </div>
            <div className="macro-bar-outer">
              <div 
                className="macro-bar-inner" 
                style={{ width: `${Math.min(100, (totalCarbs / targets.carbs) * 100)}%`, background: 'hsl(var(--cyan))' }}
              />
            </div>
          </div>

          {/* Fats */}
          <div className="glass-panel macro-card" style={{ borderLeft: '3px solid hsl(var(--amber))' }}>
            <div className="macro-info">
              <span className="macro-name">Fats</span>
              <span className="macro-val">{totalFat}g / {targets.fat}g</span>
            </div>
            <div className="macro-bar-outer">
              <div 
                className="macro-bar-inner" 
                style={{ width: `${Math.min(100, (totalFat / targets.fat) * 100)}%`, background: 'hsl(var(--amber))' }}
              />
            </div>
          </div>

          {/* Fiber */}
          <div className="glass-panel macro-card" style={{ borderLeft: '3px solid hsl(var(--rose))' }}>
            <div className="macro-info">
              <span className="macro-name">Fiber</span>
              <span className="macro-val">{totalFiber}g / {targets.fiber}g</span>
            </div>
            <div className="macro-bar-outer">
              <div 
                className="macro-bar-inner" 
                style={{ width: `${Math.min(100, (totalFiber / targets.fiber) * 100)}%`, background: 'hsl(var(--rose))' }}
              />
            </div>
          </div>

        </div>

        {/* Custom SVG Trend Chart (Full Width) */}
        <div className="glass-panel chart-card" style={{ gridColumn: 'span 12' }}>
          <div className="chart-header">
            <div>
              <h3 style={{ fontSize: '1.2rem' }}>Weight Progress Curve</h3>
              <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.85rem' }}>Visualizing progress over your last 5 logs. Targets calculated using monthly rate of {profile.monthlyTargetWeightChange} kg</p>
            </div>
            <button 
              className="btn btn-secondary" 
              onClick={() => setShowWeightModal(true)}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
            >
              <Scale size={14} /> Log Weight
            </button>
          </div>

          <div className="chart-container" style={{ height: '230px' }}>
            {points.length > 1 ? (
              <svg viewBox="0 0 800 180" width="100%" height="100%">
                <defs>
                  <linearGradient id="weightAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--emerald))" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="hsl(var(--emerald))" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                <line x1="30" y1="30" x2="770" y2="30" stroke="hsl(var(--border-light))" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="30" y1="90" x2="770" y2="90" stroke="hsl(var(--border-light))" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="30" y1="150" x2="770" y2="150" stroke="hsl(var(--border-light))" strokeWidth="1" strokeDasharray="3 3" />

                <path d={area} fill="url(#weightAreaGrad)" />
                <path d={path} fill="none" stroke="hsl(var(--emerald))" strokeWidth="2.5" strokeLinecap="round" />

                {points.map((pt, idx) => (
                  <g key={idx}>
                    <circle 
                      cx={pt.x} 
                      cy={pt.y} 
                      r="4.5" 
                      fill="hsl(var(--bg-dark))" 
                      stroke="hsl(var(--emerald))" 
                      strokeWidth="2.5" 
                    />
                    <text 
                      x={pt.x} 
                      y={pt.y - 12} 
                      fill="#fff" 
                      fontSize="9" 
                      fontWeight="bold" 
                      textAnchor="middle"
                    >
                      {pt.val.toFixed(1)}kg
                    </text>
                    <text 
                      x={pt.x} 
                      y="170" 
                      fill="hsl(var(--text-secondary))" 
                      fontSize="9" 
                      textAnchor="middle"
                    >
                      {pt.dateLabel}
                    </text>
                  </g>
                ))}
              </svg>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--text-secondary))', fontSize: '0.9rem' }}>
                Log your weight across multiple days to render trend chart!
              </div>
            )}
          </div>
        </div>

        {/* NoiseFit Tracker */}
        <div className="glass-panel noisefit-card" style={{ gridColumn: 'span 4' }}>
          <div className="card-title-row">
            <div>
              <span className="noisefit-badge">
                <Sparkles size={12} /> Active Integration
              </span>
              <h3 style={{ fontSize: '1.25rem', marginTop: '0.5rem' }}>NoiseFit Sync</h3>
            </div>
            <button 
              className="btn btn-secondary" 
              onClick={handleNoiseSync}
              disabled={syncingNoise}
              style={{ padding: '0.4rem 0.6rem' }}
            >
              <RefreshCw size={14} className={syncingNoise ? 'spinner' : ''} />
            </button>
          </div>

          <div style={{ margin: '1rem 0' }}>
            <div className="noisefit-metric-row">
              <span style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem' }}>Connection Status</span>
              <span style={{ color: 'hsl(var(--violet))', fontWeight: 600, fontSize: '0.9rem' }}>Connected</span>
            </div>
            <div className="noisefit-metric-row">
              <span style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem' }}>Workout Hours</span>
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                {dayData.workout?.hours || 0} hrs
              </span>
            </div>
            <div className="noisefit-metric-row">
              <span style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem' }}>Active Burn</span>
              <span style={{ color: 'hsl(var(--rose))', fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Flame size={14} fill="hsl(var(--rose))" /> {dayData.workout?.caloriesBurned || 0} kcal
              </span>
            </div>
          </div>

          <p style={{ fontStyle: 'italic', fontSize: '0.75rem', color: 'hsl(var(--text-muted))', textAlign: 'center' }}>
            NoiseFit sync pulls daily fitness metrics to optimize caloric deficit.
          </p>
        </div>

        {/* Daily Meal Schedule Checklist (with DYNAMIC AI suggestions) */}
        <div className="glass-panel" style={{ gridColumn: 'span 4', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              🥑 Day Meal Plan
            </h3>
            <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.8rem' }}>AI-generated targets based on logged history</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', margin: '0.75rem 0' }}>
            {['breakfast', 'lunch', 'snacks', 'dinner'].map((slot) => {
              const currentSchedule = dayData.mealSchedule || { breakfast: 'pending', lunch: 'pending', snacks: 'pending', dinner: 'pending' };
              const status = currentSchedule[slot] || 'pending';
              
              let statusText = 'Pending';
              let statusColor = 'hsl(var(--text-muted))';
              if (status === 'logged') {
                statusText = 'Completed';
                statusColor = 'hsl(var(--emerald))';
              } else if (status === 'skipped') {
                statusText = 'Skipped';
                statusColor = 'hsl(var(--rose))';
              }

              // Load active dynamically computed basic meal recommendations
              const suggestionText = suggestions[slot] || '';

              return (
                <div key={slot} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', padding: '0.6rem 0.75rem', background: 'hsl(var(--bg-dark))', borderRadius: '8px', border: '1px solid hsl(var(--border-light))' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ textTransform: 'capitalize', fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>{slot}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', color: statusColor, fontWeight: 600 }}>{statusText}</span>
                      
                      <button 
                        onClick={() => handleToggleSchedule(slot, 'logged')}
                        className="btn btn-secondary"
                        style={{ 
                          padding: '0.15rem 0.35rem', 
                          fontSize: '0.7rem',
                          background: status === 'logged' ? 'hsl(var(--emerald) / 10%)' : '',
                          borderColor: status === 'logged' ? 'hsl(var(--emerald) / 30%)' : '',
                          color: status === 'logged' ? 'hsl(var(--emerald))' : ''
                        }}
                      >
                        Eat
                      </button>
                      
                      <button 
                        onClick={() => handleToggleSchedule(slot, 'skipped')}
                        className="btn btn-secondary"
                        style={{ 
                          padding: '0.15rem 0.35rem', 
                          fontSize: '0.7rem',
                          background: status === 'skipped' ? 'hsl(var(--rose) / 10%)' : '',
                          borderColor: status === 'skipped' ? 'hsl(var(--rose) / 30%)' : '',
                          color: status === 'skipped' ? 'hsl(var(--rose))' : ''
                        }}
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontStyle: 'italic', lineHeight: '1.3' }}>
                    {suggestionText}
                  </div>
                </div>
              );
            })}
          </div>

          <p style={{ fontStyle: 'italic', fontSize: '0.72rem', color: 'hsl(var(--text-muted))', textAlign: 'center' }}>
            Suggestions adjust live as you log protein or skip slots.
          </p>
        </div>

        {/* Water Hydration Card */}
        <div className="glass-panel water-card" style={{ gridColumn: 'span 4' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Droplet size={18} color="hsl(var(--cyan))" /> Hydration
            </h3>
            <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.85rem' }}>Target: 3.0L (3000ml)</p>
          </div>

          <div className="water-progress">
            <span style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'hsl(var(--cyan))' }}>
              {(dayData.water / 1000).toFixed(1)}L
            </span>
            <span style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem' }}>/ 3.0L logged</span>
          </div>

          <div className="water-bubble-grid">
            {[250, 500, 750, 1000, 1250, 1500, 1750, 2000, 2250, 2500, 2750, 3000].map((ml) => (
              <div 
                key={ml}
                className={`water-cup ${dayData.water >= ml ? 'filled' : ''}`}
                onClick={() => setWaterValue(dayData.water >= ml ? ml - 250 : ml)}
              >
                💧
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button className="btn btn-secondary" onClick={() => updateWater(250)} style={{ flexGrow: 1, padding: '0.5rem', fontSize: '0.8rem' }}>
              +250ml
            </button>
            <button className="btn btn-secondary" onClick={() => updateWater(500)} style={{ flexGrow: 1, padding: '0.5rem', fontSize: '0.8rem' }}>
              +500ml
            </button>
            <button className="btn btn-danger" onClick={() => setWaterValue(0)} style={{ padding: '0.5rem 0.8rem', fontSize: '0.8rem' }}>
              Clear
            </button>
          </div>
        </div>

      </div>

      {/* Weight Log Modal */}
      {showWeightModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <button className="modal-close" onClick={() => setShowWeightModal(false)}>&times;</button>
            <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Scale size={20} color="hsl(var(--emerald))" /> Log Daily Weight
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

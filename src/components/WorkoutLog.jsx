import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Play, 
  Pause, 
  RotateCcw, 
  Award, 
  TrendingUp, 
  Flame, 
  BrainCircuit,
  Info,
  Calendar,
  Zap,
  Timer,
  ChevronLeft,
  ChevronRight,
  Watch
} from 'lucide-react';
import { getDayLog, saveDayLog, formatDate } from '../utils/db';
import { analyzeWorkoutProgression } from '../utils/gemini';
import { getGoogleFitAccessToken, fetchGoogleFitMetrics } from '../utils/googleFit';

export default function WorkoutLog({ profile, logs, onLogsUpdate, currentDate, setCurrentDate }) {
  const dayData = getDayLog(currentDate);

  const [syncStatus, setSyncStatus] = useState('idle');
  const [syncMessage, setSyncMessage] = useState('');

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
      setSyncMessage('Fetching workouts...');
      const fitData = await fetchGoogleFitMetrics(token, currentDate);
      setSyncMessage('Merging workouts...');

      const updatedDayData = { ...dayData };

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

      saveDayLog(currentDate, updatedDayData);
      onLogsUpdate({ ...logs, [currentDate]: updatedDayData });

      setSyncStatus('success');
      setSyncMessage('Workouts synced!');
      setTimeout(() => { setSyncStatus('idle'); setSyncMessage(''); }, 4000);
    } catch (err) {
      console.error(err);
      setSyncStatus('error');
      setSyncMessage(err.message || 'Sync failed.');
      setTimeout(() => { setSyncStatus('idle'); setSyncMessage(''); }, 5000);
    }
  };

  // Form states
  const [exerciseName, setExerciseName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('Chest');
  const [restTime, setRestTime] = useState(90); // default 90s
  const [notes, setNotes] = useState('');
  const [sets, setSets] = useState([{ reps: 10, weight: 40 }]);

  // Rest Timer states
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [timerPreset, setTimerPreset] = useState(90);
  const timerInterval = useRef(null);

  // AI progression advice state
  const [aiReport, setAiReport] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  // Clean timer on unmount
  useEffect(() => {
    return () => clearInterval(timerInterval.current);
  }, []);

  const adjustDate = (days) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + days);
    setCurrentDate(formatDate(d));
  };

  // Timer actions
  const startTimer = (seconds) => {
    clearInterval(timerInterval.current);
    setTimerSeconds(seconds);
    setTimerActive(true);
    
    timerInterval.current = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerInterval.current);
          setTimerActive(false);
          // Play a brief visual beep / browser notification alert if possible
          if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const toggleTimer = () => {
    if (timerActive) {
      clearInterval(timerInterval.current);
      setTimerActive(false);
    } else {
      if (timerSeconds === 0) {
        startTimer(timerPreset);
      } else {
        startTimer(timerSeconds);
      }
    }
  };

  const resetTimer = () => {
    clearInterval(timerInterval.current);
    setTimerActive(false);
    setTimerSeconds(0);
  };

  // Set management
  const addSetRow = () => {
    const lastSet = sets[sets.length - 1] || { reps: 10, weight: 40 };
    setSets([...sets, { reps: lastSet.reps, weight: lastSet.weight }]);
  };

  const removeSetRow = (idx) => {
    if (sets.length === 1) return;
    setSets(sets.filter((_, i) => i !== idx));
  };

  const handleSetChange = (idx, field, val) => {
    const nextSets = [...sets];
    nextSets[idx][field] = parseFloat(val) || 0;
    setSets(nextSets);
  };

  // Save Workout entry to day's log
  const handleSaveWorkout = (e) => {
    e.preventDefault();
    if (!exerciseName.trim()) return;

    const newEntry = {
      name: exerciseName.trim(),
      muscleGroup,
      sets: sets.map(s => ({ reps: parseInt(s.reps), weight: parseFloat(s.weight) })),
      restTime: parseInt(restTime),
      notes: notes.trim()
    };

    const currentEntries = dayData.workout?.entries || [];
    const updated = {
      ...dayData,
      workout: {
        completed: true, // auto check off when they log an exercise
        entries: [...currentEntries, newEntry]
      }
    };

    saveDayLog(currentDate, updated);
    onLogsUpdate({ ...logs, [currentDate]: updated });

    // Reset Form
    setExerciseName('');
    setNotes('');
    setSets([{ reps: 10, weight: 40 }]);
    
    // Auto start rest timer
    setTimerPreset(parseInt(restTime));
    startTimer(parseInt(restTime));
  };

  const handleDeleteExercise = (idx) => {
    const nextEntries = [...(dayData.workout?.entries || [])];
    nextEntries.splice(idx, 1);
    const updated = {
      ...dayData,
      workout: {
        ...dayData.workout,
        entries: nextEntries,
        completed: nextEntries.length > 0 ? dayData.workout?.completed : false
      }
    };
    saveDayLog(currentDate, updated);
    onLogsUpdate({ ...logs, [currentDate]: updated });
  };

  // Calculate Personal Records (PRs) across all history
  const getPersonalRecords = () => {
    const prs = {};
    Object.keys(logs).forEach(date => {
      const day = logs[date];
      if (day.workout?.entries?.length > 0) {
        day.workout.entries.forEach(ex => {
          const name = ex.name.toLowerCase().trim();
          ex.sets?.forEach(s => {
            const w = s.weight || 0;
            if (!prs[name] || w > prs[name].weight) {
              prs[name] = { name: ex.name, weight: w, reps: s.reps, date };
            }
          });
        });
      }
    });
    return Object.values(prs);
  };

  const prList = getPersonalRecords();

  // Weekly workout volume summary
  const getWeeklyVolume = () => {
    let volume = 0;
    const sortedDates = Object.keys(logs).sort().reverse();
    // take past 7 entries
    const past7Days = sortedDates.slice(0, 7);
    past7Days.forEach(d => {
      const day = logs[d];
      day.workout?.entries?.forEach(ex => {
        ex.sets?.forEach(s => {
          volume += (s.weight || 0) * (s.reps || 0);
        });
      });
    });
    return volume;
  };

  const weeklyVolume = getWeeklyVolume();

  const handleGetAiTrainerReport = async () => {
    setLoadingAi(true);
    try {
      const feedback = await analyzeWorkoutProgression(logs, profile, profile.apiKey);
      setAiReport(feedback);
    } catch (err) {
      console.error(err);
      setAiReport('Could not generate coach analysis. Please verify your settings API key.');
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div>
      <header className="page-header">
        <div>
          <h1 className="page-title">Personal Trainer</h1>
          <p className="page-subtitle">Log exercises, track progressive overload, and set timers</p>
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

      {/* Main split grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '1.5rem' }}>
        
        {/* Left Column: Form and Exercise History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Exercises Completed Today */}
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Exercises Logged Today</h3>
            {dayData.workout?.entries && dayData.workout.entries.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {dayData.workout.entries.map((ex, idx) => {
                  const maxWeight = Math.max(...ex.sets?.map(s => s.weight) || [0]);
                  const totalReps = ex.sets?.reduce((sum, s) => sum + s.reps, 0) || 0;
                  return (
                    <div key={idx} style={{ padding: '0.75rem 1rem', background: 'hsl(var(--bg-dark))', borderRadius: '12px', border: '1px solid hsl(var(--border-light))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <strong style={{ color: '#fff', fontSize: '0.95rem' }}>{ex.name}</strong>
                          <span style={{ fontSize: '0.72rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'hsl(var(--emerald) / 10%)', color: 'hsl(var(--emerald))' }}>
                            {ex.muscleGroup}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', marginTop: '0.25rem' }}>
                          <span>Sets: {ex.sets?.length}</span>
                          <span>Max: {maxWeight} kg</span>
                          <span>Total Reps: {totalReps}</span>
                          {ex.notes && <span style={{ fontStyle: 'italic' }}>Note: {ex.notes}</span>}
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteExercise(idx)}
                        style={{ background: 'none', border: 'none', color: 'hsl(var(--rose))', cursor: 'pointer' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: 'hsl(var(--text-secondary))', fontStyle: 'italic', fontSize: '0.9rem' }}>
                No exercises logged yet today. Use the builder below to add sets.
              </p>
            )}
          </div>

          {/* Log Exercise Form */}
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>Log New Exercise</h3>
            <form onSubmit={handleSaveWorkout}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Exercise Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Bench Press" 
                    value={exerciseName}
                    onChange={(e) => setExerciseName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Muscle Group</label>
                  <select 
                    className="form-select"
                    value={muscleGroup}
                    onChange={(e) => setMuscleGroup(e.target.value)}
                  >
                    <option value="Chest">Chest</option>
                    <option value="Back">Back</option>
                    <option value="Legs">Legs</option>
                    <option value="Shoulders">Shoulders</option>
                    <option value="Arms">Arms</option>
                    <option value="Core">Core</option>
                    <option value="Cardio">Cardio</option>
                  </select>
                </div>
              </div>

              {/* Set Builder */}
              <div style={{ marginBottom: '1.25rem' }}>
                <span className="form-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Set Details</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {sets.map((set, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', width: '40px', fontWeight: 700 }}>Set {idx + 1}</span>
                      <div style={{ display: 'flex', gap: '0.5rem', flexGrow: 1 }}>
                        <input 
                          type="number" 
                          placeholder="Reps" 
                          className="form-input" 
                          style={{ padding: '0.4rem', textAlign: 'center' }} 
                          value={set.reps}
                          onChange={(e) => handleSetChange(idx, 'reps', e.target.value)}
                          required
                        />
                        <input 
                          type="number" 
                          placeholder="Weight (kg)" 
                          className="form-input" 
                          style={{ padding: '0.4rem', textAlign: 'center' }} 
                          value={set.weight}
                          onChange={(e) => handleSetChange(idx, 'weight', e.target.value)}
                          required
                        />
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeSetRow(idx)}
                        disabled={sets.length === 1}
                        style={{ background: 'none', border: 'none', color: 'hsl(var(--text-muted))', cursor: 'pointer', padding: '0.25rem' }}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={addSetRow}
                  style={{ marginTop: '0.75rem', padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}
                >
                  <Plus size={12} /> Add Set
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Rest (seconds)</label>
                  <input type="number" className="form-input" value={restTime} onChange={(e) => setRestTime(parseInt(e.target.value) || 0)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Workout Notes</label>
                  <input type="text" className="form-input" placeholder="e.g. Focus on control, RPE 8" value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>

              <button type="submit" className="btn btn-primary">
                <Plus size={16} /> Log & Trigger Rest Timer
              </button>
            </form>
          </div>

        </div>

        {/* Right Column: Rest Timer & PR Trophy Shelf */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Rest Timer Circular Widget */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '1rem', alignSelf: 'flex-start' }}>
              <Timer size={18} color="hsl(var(--cyan))" />
              <strong style={{ fontSize: '1rem' }}>Rest Countdown</strong>
            </div>

            <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--bg-dark))" strokeWidth="8" />
                <circle 
                  cx="60" 
                  cy="60" 
                  r="50" 
                  fill="none" 
                  stroke="hsl(var(--cyan))" 
                  strokeWidth="8" 
                  strokeDasharray="314"
                  strokeDashoffset={timerSeconds > 0 ? (314 * (1 - timerSeconds / timerPreset)) : 314}
                  style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 1s linear' }}
                />
              </svg>
              <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'hsl(var(--cyan))', fontFamily: 'monospace' }}>
                  {timerSeconds}s
                </span>
                <span style={{ fontSize: '0.65rem', color: 'hsl(var(--text-secondary))' }}>Resting</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
              <button className="btn btn-secondary" onClick={toggleTimer} style={{ flexGrow: 1, padding: '0.4rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                {timerActive ? <Pause size={12} /> : <Play size={12} />} {timerActive ? 'Pause' : 'Start'}
              </button>
              <button className="btn btn-secondary" onClick={resetTimer} style={{ padding: '0.4rem', fontSize: '0.8rem' }}>
                <RotateCcw size={12} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.25rem', marginTop: '1rem', width: '100%' }}>
              {[45, 60, 90, 120].map(s => (
                <button 
                  key={s} 
                  className="btn btn-secondary" 
                  onClick={() => { setTimerPreset(s); startTimer(s); }} 
                  style={{ flexGrow: 1, padding: '0.25rem', fontSize: '0.7rem' }}
                >
                  {s}s
                </button>
              ))}
            </div>
          </div>

          {/* AI Trainer Coach Progression */}
          <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid hsl(var(--emerald) / 20%)' }}>
            <h4 style={{ fontSize: '1.1rem', color: 'hsl(var(--emerald))', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem' }}>
              <BrainCircuit size={16} /> AI Progressive Overload Advice
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', lineHeight: '1.4', marginBottom: '1rem' }}>
              AuraFit Trainer reviews past set weights, reps, and muscle volumes to advise weight increments and deload parameters.
            </p>

            <button 
              className="btn btn-primary btn-full"
              onClick={handleGetAiTrainerReport}
              disabled={loadingAi}
              style={{ fontSize: '0.8rem', padding: '0.4rem 1rem', marginBottom: '1rem' }}
            >
              {loadingAi ? 'Analyzing Workout History...' : 'Get AI Workout Progression Tips'}
            </button>

            {aiReport ? (
              <div style={{ padding: '0.75rem', background: 'hsl(var(--bg-dark))', borderRadius: '8px', border: '1px solid hsl(var(--border-light))', fontSize: '0.75rem', lineHeight: '1.4', color: 'hsl(var(--text-secondary))', maxHeight: '180px', overflowY: 'auto' }}>
                {aiReport}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start', background: 'hsl(var(--bg-dark))', padding: '0.75rem', borderRadius: '8px', border: '1px solid hsl(var(--border-light))' }}>
                <Info size={14} color="hsl(var(--text-muted))" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-secondary))' }}>
                  Weekly Volume (Past 7 Days): <strong>{weeklyVolume.toLocaleString()} kg</strong>. Click to analyze overload.
                </span>
              </div>
            )}
          </div>

          {/* Personal Records (PRs) shelf */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.75rem' }}>
              <Award size={16} color="hsl(var(--amber))" /> Personal Records (PRs)
            </h4>
            {prList.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                {prList.map((pr, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.6rem', background: 'hsl(var(--bg-dark))', borderRadius: '6px', fontSize: '0.75rem' }}>
                    <span style={{ fontWeight: 600, color: '#fff' }}>{pr.name}</span>
                    <span style={{ color: 'hsl(var(--amber))', fontWeight: 800 }}>{pr.weight} kg <span style={{ color: 'hsl(var(--text-muted))', fontWeight: 400 }}>x {pr.reps} r</span></span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'hsl(var(--text-secondary))', fontStyle: 'italic', fontSize: '0.75rem' }}>
                No records established yet. Push hard in your next set!
              </p>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}

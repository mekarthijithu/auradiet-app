import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Moon, 
  Award, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles,
  Info,
  Clock
} from 'lucide-react';
import { getDayLog, saveDayLog, formatDate } from '../utils/db';

export default function HabitsSleep({ profile, logs, onLogsUpdate, currentDate, setCurrentDate }) {
  const dayData = getDayLog(currentDate);

  // Sleep inputs state
  const [sleepStart, setSleepStart] = useState('');
  const [sleepEnd, setSleepEnd] = useState('');

  const adjustDate = (days) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + days);
    setCurrentDate(formatDate(d));
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
      end.setDate(end.getDate() + 1);
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

  // Toggle checklist habit
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

  // Traverses historical logs to calculate streaks for each habit key
  const calculateStreak = (habitKey) => {
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = formatDate(d);
      const day = logs[dateStr];
      if (!day) break;

      let isSuccess = false;
      const totalProt = day.meals?.reduce((sum, m) => sum + (m.protein || 0), 0) || 0;

      if (habitKey === 'gym') {
        isSuccess = day.workout?.completed || day.workout?.entries?.length > 0;
      } else if (habitKey === 'water') {
        isSuccess = day.water >= 4000;
      } else if (habitKey === 'protein') {
        isSuccess = totalProt >= (profile.targets?.protein || 150);
      } else if (habitKey === 'steps') {
        isSuccess = day.steps >= 10000;
      } else if (habitKey === 'sleep') {
        isSuccess = (day.sleep?.hours || 0) >= 7.0;
      } else if (habitKey === 'vitamins') {
        isSuccess = day.habits?.vitamins;
      }

      if (isSuccess) {
        streak++;
      } else {
        // Break the streak if not checking today (or if it's past days that were failures)
        // If it's today and they haven't completed it yet, don't break the streak immediately if they completed yesterday
        if (i === 0) {
          continue; // skip today's failure to allow user to complete it later in the day
        }
        break;
      }
    }
    return streak;
  };

  const streaks = {
    gym: calculateStreak('gym'),
    water: calculateStreak('water'),
    protein: calculateStreak('protein'),
    steps: calculateStreak('steps'),
    sleep: calculateStreak('sleep'),
    vitamins: calculateStreak('vitamins')
  };

  // Detailed sleep physiology instructions
  const getSleepPhysiologyText = () => {
    const hours = dayData.sleep?.hours || 0;
    let mainNote = "Sleep is the cornerstone of hypertrophic progress and cognitive durability.";

    if (hours > 0) {
      mainNote = `You logged ${hours} hours of sleep. ${hours < 6 ? 'This restriction compromises muscle recovery by elevating cortisol levels (which breaks down muscle tissue) and reducing protein synthesis rates.' : 'This provides adequate recovery for your nervous system and skeletal muscles.'}`;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', lineHeight: '1.5', color: 'hsl(var(--text-secondary))' }}>
        <p>
          {mainNote}
        </p>
        <p>
          During **Deep Sleep (N3 Stage)**, the body releases over 70% of its daily pulse of **Human Growth Hormone (HGH)**. This hormone is essential for cell reproduction, muscle tissue rebuilding, and bone development.
        </p>
        <p>
          During **REM Sleep**, your brain relaxes your skeletal muscles (paralysis) to focus on neurotransmitter restoration. Missing out on REM sleep triggers fatigue, muscle stiffness, and compromises strength outputs in your next workout.
        </p>
      </div>
    );
  };

  return (
    <div>
      <header className="page-header">
        <div>
          <h1 className="page-title">Habits & Sleep</h1>
          <p className="page-subtitle">Log physical rest cycles and check daily fitness goals</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'hsl(var(--bg-card))', padding: '0.5rem 1rem', borderRadius: '24px', border: '1px solid hsl(var(--border-light))' }}>
          <ChevronLeft size={18} style={{ cursor: 'pointer', color: 'hsl(var(--text-secondary))' }} onClick={() => adjustDate(-1)} />
          <span style={{ fontWeight: 600, fontFamily: 'var(--font-heading)', fontSize: '0.95rem' }}>
            {currentDate === formatDate(new Date()) ? 'Today' : currentDate}
          </span>
          <ChevronRight size={18} style={{ cursor: 'pointer', color: 'hsl(var(--text-secondary))' }} onClick={() => adjustDate(1)} />
        </div>
      </header>

      {/* Main split grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '1.5rem' }}>
        
        {/* Left Column: Habits checklist and streaks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Habits checklist */}
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>Daily Habits Tracker</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Gym */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'hsl(var(--bg-dark))', borderRadius: '10px', border: '1px solid hsl(var(--border-light))' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <CheckCircle2 
                    size={20} 
                    color={dayData.workout?.completed || dayData.workout?.entries?.length > 0 ? 'hsl(var(--emerald))' : 'hsl(var(--text-muted))'} 
                    style={{ cursor: 'not-allowed' }} // Completed via workout logging
                  />
                  <div>
                    <strong style={{ color: '#fff', fontSize: '0.9rem' }}>Workout Habit</strong>
                    <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-secondary))' }}>Logged via Workout tab</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', background: 'hsl(var(--emerald) / 10%)', padding: '0.2rem 0.5rem', borderRadius: '6px', color: 'hsl(var(--emerald))', fontWeight: 700 }}>
                  🔥 {streaks.gym} Day Streak
                </div>
              </div>

              {/* Water */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'hsl(var(--bg-dark))', borderRadius: '10px', border: '1px solid hsl(var(--border-light))' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <CheckCircle2 
                    size={20} 
                    color={dayData.water >= 4000 ? 'hsl(var(--emerald))' : 'hsl(var(--text-muted))'} 
                  />
                  <div>
                    <strong style={{ color: '#fff', fontSize: '0.9rem' }}>Water Intake (4.0L)</strong>
                    <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-secondary))' }}>Logged via Dashboard</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', background: 'hsl(var(--cyan) / 10%)', padding: '0.2rem 0.5rem', borderRadius: '6px', color: 'hsl(var(--cyan))', fontWeight: 700 }}>
                  🔥 {streaks.water} Day Streak
                </div>
              </div>

              {/* Protein */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'hsl(var(--bg-dark))', borderRadius: '10px', border: '1px solid hsl(var(--border-light))' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <CheckCircle2 
                    size={20} 
                    color={(dayData.meals?.reduce((sum, m) => sum + (m.protein || 0), 0) || 0) >= (profile.targets?.protein || 150) ? 'hsl(var(--emerald))' : 'hsl(var(--text-muted))'} 
                  />
                  <div>
                    <strong style={{ color: '#fff', fontSize: '0.9rem' }}>Protein Target Hit</strong>
                    <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-secondary))' }}>Logged via Meals tab</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', background: 'hsl(var(--amber) / 10%)', padding: '0.2rem 0.5rem', borderRadius: '6px', color: 'hsl(var(--amber))', fontWeight: 700 }}>
                  🔥 {streaks.protein} Day Streak
                </div>
              </div>

              {/* Steps */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'hsl(var(--bg-dark))', borderRadius: '10px', border: '1px solid hsl(var(--border-light))' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <CheckCircle2 
                    size={20} 
                    color={dayData.steps >= 10000 ? 'hsl(var(--emerald))' : 'hsl(var(--text-muted))'} 
                  />
                  <div>
                    <strong style={{ color: '#fff', fontSize: '0.9rem' }}>10k Daily Steps</strong>
                    <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-secondary))' }}>Logged via Dashboard slider</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', background: 'hsl(var(--emerald) / 10%)', padding: '0.2rem 0.5rem', borderRadius: '6px', color: 'hsl(var(--emerald))', fontWeight: 700 }}>
                  🔥 {streaks.steps} Day Streak
                </div>
              </div>

              {/* Sleep */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'hsl(var(--bg-dark))', borderRadius: '10px', border: '1px solid hsl(var(--border-light))' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <CheckCircle2 
                    size={20} 
                    color={(dayData.sleep?.hours || 0) >= 7.0 ? 'hsl(var(--emerald))' : 'hsl(var(--text-muted))'} 
                  />
                  <div>
                    <strong style={{ color: '#fff', fontSize: '0.9rem' }}>7+ Hours Sleep</strong>
                    <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-secondary))' }}>Logged via Sleep form</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', background: 'hsl(var(--violet) / 10%)', padding: '0.2rem 0.5rem', borderRadius: '6px', color: 'hsl(var(--violet))', fontWeight: 700 }}>
                  🔥 {streaks.sleep} Day Streak
                </div>
              </div>

              {/* Vitamins */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'hsl(var(--bg-dark))', borderRadius: '10px', border: '1px solid hsl(var(--border-light))' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => handleToggleHabit('vitamins')}>
                  <CheckCircle2 
                    size={20} 
                    color={dayData.habits?.vitamins ? 'hsl(var(--emerald))' : 'hsl(var(--text-muted))'} 
                  />
                  <div>
                    <strong style={{ color: '#fff', fontSize: '0.9rem' }}>Vitamins & Supplements</strong>
                    <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-secondary))' }}>Tap to toggle intake checklist</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', background: 'hsl(var(--rose) / 10%)', padding: '0.2rem 0.5rem', borderRadius: '6px', color: 'hsl(var(--rose))', fontWeight: 700 }}>
                  🔥 {streaks.vitamins} Day Streak
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Right Column: Sleep logs and Physiology */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Sleep logger */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Clock size={18} color="hsl(var(--violet))" /> Log Daily Sleep
            </h3>

            <div style={{ margin: '1rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'hsl(var(--bg-dark))', padding: '0.75rem', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>Logged Time Today:</span>
              <strong style={{ fontSize: '1.1rem', color: 'hsl(var(--violet))' }}>{dayData.sleep?.hours || 0} hrs</strong>
            </div>

            <form onSubmit={handleSaveSleep} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-secondary))', display: 'block', marginBottom: '0.25rem' }}>Sleep Start Time</span>
                  <input type="time" className="form-input" value={sleepStart} onChange={(e) => setSleepStart(e.target.value)} required />
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-secondary))', display: 'block', marginBottom: '0.25rem' }}>Wake Up Time</span>
                  <input type="time" className="form-input" value={sleepEnd} onChange={(e) => setSleepEnd(e.target.value)} required />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-full">
                Log Sleep Interval
              </button>
            </form>
          </div>

          {/* AI Sleep physiology advice */}
          <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid hsl(var(--violet) / 20%)' }}>
            <h4 style={{ fontSize: '1.1rem', color: 'hsl(var(--violet))', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.75rem' }}>
              <Sparkles size={16} /> Sleep Physiology Advisor
            </h4>
            {getSleepPhysiologyText()}
          </div>

        </div>

      </div>
    </div>
  );
}

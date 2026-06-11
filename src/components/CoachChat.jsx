import React, { useState, useEffect, useRef } from 'react';
import { 
  BrainCircuit, 
  Send, 
  Award, 
  Calendar, 
  CheckCircle,
  AlertTriangle,
  Info,
  Sparkles,
  Trophy
} from 'lucide-react';
import { getWeeklyReports, saveWeeklyReports, formatDate, getChatHistory, saveChatHistory } from '../utils/db';
import { chatWithCoach, generateWeeklySundayReport } from '../utils/gemini';

export default function CoachChat({ profile, logs, onLogsUpdate }) {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);

  // Weekly Reports
  const [reports, setReports] = useState([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [activeReport, setActiveReport] = useState(null);

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load chat history & weekly reports on mount
  useEffect(() => {
    const loadData = async () => {
      const history = await getChatHistory();
      if (history && history.length > 0) {
        setMessages(history);
      } else {
        setMessages([
          { sender: 'coach', text: `Namaste ${profile.name}! I am your AuraFit Coach. Ask me anything about your diet, workouts, budget, or sleep progress. I have full access to your logs.` }
        ]);
      }

      const rep = await getWeeklyReports();
      setReports(rep);
    };
    loadData();
  }, [profile.name]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!userInput.trim() || loadingChat) return;

    const userMsg = userInput.trim();
    const newMessages = [...messages, { sender: 'user', text: userMsg }];
    setMessages(newMessages);
    setUserInput('');
    setLoadingChat(true);

    try {
      const response = await chatWithCoach(
        userMsg,
        newMessages,
        logs,
        profile,
        profile.apiKey
      );
      const finalMessages = [...newMessages, { sender: 'coach', text: response }];
      setMessages(finalMessages);
      await saveChatHistory(finalMessages);
    } catch (err) {
      console.error(err);
      const finalMessages = [...newMessages, { sender: 'coach', text: 'Sorry, I encountered an issue checking your files. Ensure your Gemini API Key is configured in settings.' }];
      setMessages(finalMessages);
      await saveChatHistory(finalMessages);
    } finally {
      setLoadingChat(false);
    }
  };

  const handleGenerateReport = async () => {
    setLoadingReport(true);
    try {
      const newRep = await generateWeeklySundayReport(logs, profile, profile.apiKey);
      if (newRep) {
        newRep.dateGenerated = new Date().toLocaleDateString();
        const nextReports = [newRep, ...reports];
        setReports(nextReports);
        await saveWeeklyReports(nextReports);
        setActiveReport(newRep);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingReport(false);
    }
  };

  // Traverses logs to determine unlocked achievements dynamically
  const evaluateAchievements = () => {
    const achievements = [
      { id: 'first_workout', title: 'First Workout', description: 'Log your first exercise session', unlocked: false, icon: '🏋️' },
      { id: '7_day_streak', title: '7-Day Habit Streak', description: 'Complete a habit for 7 consecutive days', unlocked: false, icon: '🔥' },
      { id: '30_day_streak', title: '30-Day Habit Streak', description: 'Complete a habit for 30 consecutive days', unlocked: false, icon: '👑' },
      { id: '5kg_lost', title: 'First 5kg Progress', description: 'Lose 5kg from your initial check-in weight', unlocked: false, icon: '📉' },
      { id: 'protein_15', title: 'Protein Consistent', description: 'Hit protein targets for 15 days', unlocked: false, icon: '🥩' },
      { id: 'bench_100', title: 'Bench Press 100kg', description: 'Lift 100kg or more on Bench Press', unlocked: false, icon: '🏆' },
      { id: 'budget_save', title: 'Saved ₹1000 on Meals', description: 'Log a home-cooked meal with soya chunks', unlocked: false, icon: '💰' }
    ];

    let hasWorkout = false;
    let maxBenchWeight = 0;
    let soyaMealsLogged = 0;

    Object.keys(logs).forEach(date => {
      const day = logs[date];
      if (day.workout?.entries?.length > 0) hasWorkout = true;
      
      day.workout?.entries?.forEach(ex => {
        if (ex.name?.toLowerCase().includes('bench press')) {
          ex.sets?.forEach(s => {
            if (s.weight > maxBenchWeight) maxBenchWeight = s.weight;
          });
        }
      });

      day.meals?.forEach(m => {
        if (m.name?.toLowerCase().includes('soya chunks') || m.ingredients?.some(i => i.toLowerCase().includes('soya'))) {
          soyaMealsLogged++;
        }
      });
    });

    // Check streaks
    const calculateMaxStreak = () => {
      let maxStr = 0;
      const keys = ['gym', 'water', 'protein', 'steps', 'sleep', 'vitamins'];
      keys.forEach(k => {
        let currentStreak = 0;
        const sortedDates = Object.keys(logs).sort().reverse();
        for (let date of sortedDates) {
          const day = logs[date];
          let success = false;
          if (k === 'gym') success = day.workout?.completed || day.workout?.entries?.length > 0;
          else if (k === 'water') success = day.water >= 4000;
          else if (k === 'protein') success = (day.meals?.reduce((sum, m) => sum + (m.protein || 0), 0) || 0) >= (profile.targets?.protein || 150);
          else if (k === 'steps') success = day.steps >= 10000;
          else if (k === 'sleep') success = (day.sleep?.hours || 0) >= 7.0;
          else if (k === 'vitamins') success = day.habits?.vitamins;

          if (success) {
            currentStreak++;
          } else {
            break;
          }
        }
        if (currentStreak > maxStr) maxStr = currentStreak;
      });
      return maxStr;
    };

    const maxStreak = calculateMaxStreak();
    const weightLoss = (profile.weight || 82.5) - (logs[formatDate(new Date())]?.weight || profile.weight);

    // Populate unlocks
    achievements[0].unlocked = hasWorkout;
    achievements[1].unlocked = maxStreak >= 7;
    achievements[2].unlocked = maxStreak >= 30;
    achievements[3].unlocked = weightLoss >= 5.0;
    achievements[4].unlocked = maxStreak >= 15; // approximate protein hit streak
    achievements[5].unlocked = maxBenchWeight >= 100;
    achievements[6].unlocked = soyaMealsLogged > 0;

    return achievements;
  };

  const achievementsList = evaluateAchievements();

  return (
    <div>
      <header className="page-header">
        <div>
          <h1 className="page-title">AI Personal Coach</h1>
          <p className="page-subtitle">Chat with AuraFit Coach, view achievements, and compile weekly fitness scores</p>
        </div>
      </header>

      {/* Main split grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '1.5rem' }}>
        
        {/* Left Column: Chatbox */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '520px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid hsl(var(--border-light))', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
            <BrainCircuit size={20} color="hsl(var(--emerald))" />
            <div>
              <strong style={{ color: '#fff' }}>AuraFit Personal Trainer & Nutritionist</strong>
              <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-secondary))' }}>Powered by Gemini 1.5 Flash</div>
            </div>
          </div>

          {/* Messages list */}
          <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.5rem', marginBottom: '1rem' }}>
            {messages.map((m, idx) => (
              <div 
                key={idx} 
                style={{ 
                  alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  padding: '0.75rem 1rem',
                  borderRadius: m.sender === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                  background: m.sender === 'user' ? 'hsl(var(--emerald))' : 'hsl(var(--bg-dark))',
                  border: m.sender === 'user' ? 'none' : '1px solid hsl(var(--border-light))',
                  color: m.sender === 'user' ? '#000' : '#fff',
                  fontSize: '0.85rem',
                  lineHeight: '1.5',
                  fontWeight: m.sender === 'user' ? 600 : 400
                }}
              >
                {m.text}
              </div>
            ))}
            {loadingChat && (
              <div style={{ alignSelf: 'flex-start', background: 'hsl(var(--bg-dark))', border: '1px solid hsl(var(--border-light))', padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
                Coach is analyzing your metrics...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input form */}
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              className="form-input" 
              style={{ flexGrow: 1 }} 
              placeholder="e.g. I only have eggs and white rice at home. What can I cook?" 
              value={userInput} 
              onChange={(e) => setUserInput(e.target.value)} 
              required
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem' }} disabled={loadingChat}>
              <Send size={16} />
            </button>
          </form>
        </div>

        {/* Right Column: Weekly reports and Achievements */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Sunday Report Widget */}
          <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid hsl(var(--cyan) / 20%)' }}>
            <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem' }}>
              <Calendar size={18} color="hsl(var(--cyan))" /> Weekly Sunday Report
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', lineHeight: '1.4', marginBottom: '1rem' }}>
              Generate custom weekly metrics summaries (workouts hit, protein hits, sleep targets, food costs, fat loss predictions).
            </p>

            <button 
              className="btn btn-primary btn-full"
              onClick={handleGenerateReport}
              disabled={loadingReport}
              style={{ fontSize: '0.85rem' }}
            >
              {loadingReport ? 'Compiling weekly data...' : 'Generate Weekly Sunday Report'}
            </button>

            {/* active report summary */}
            {activeReport && (
              <div className="glass-panel" style={{ marginTop: '1.25rem', padding: '1.25rem', border: '1px solid hsl(var(--cyan) / 30%)', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid hsl(var(--border-light))', paddingBottom: '0.5rem' }}>
                  <div>
                    <strong style={{ color: '#fff', fontSize: '0.9rem' }}>Sunday Report</strong>
                    <div style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))' }}>Generated: {activeReport.dateGenerated}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: 'hsl(var(--cyan))', fontWeight: 800, fontSize: '1.1rem' }}>{activeReport.fitnessScore}</span>
                    <span style={{ color: 'hsl(var(--text-muted))', fontSize: '0.65rem', display: 'block' }}>Fitness Score</span>
                  </div>
                </div>

                {/* Progress bars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '0.1rem' }}>
                      <span>Workout Consistency</span>
                      <span style={{ fontWeight: 600, color: 'hsl(var(--violet))' }}>{activeReport.workoutCompletion}%</span>
                    </div>
                    <div style={{ height: '4px', background: 'hsl(var(--bg-dark))', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${activeReport.workoutCompletion}%`, height: '100%', background: 'hsl(var(--violet))' }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '0.1rem' }}>
                      <span>Protein Goal Hit</span>
                      <span style={{ fontWeight: 600, color: 'hsl(var(--emerald))' }}>{activeReport.proteinGoalHit}%</span>
                    </div>
                    <div style={{ height: '4px', background: 'hsl(var(--bg-dark))', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${activeReport.proteinGoalHit}%`, height: '100%', background: 'hsl(var(--emerald))' }} />
                    </div>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: 'hsl(var(--bg-dark) / 50%)', padding: '0.5rem', borderRadius: '6px', border: '1px solid hsl(var(--border-light))' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                    <span style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))' }}>Avg Calories</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>{activeReport.avgCalories} kcal</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                    <span style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))' }}>Avg Sleep</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'hsl(var(--violet))' }}>{activeReport.avgSleep} hrs</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                    <span style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))' }}>Food Expenses</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'hsl(var(--rose))' }}>₹{activeReport.moneySpent}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                    <span style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))' }}>Weight Change</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: activeReport.weightChange > 0 ? 'hsl(var(--rose))' : 'hsl(var(--emerald))' }}>
                      {activeReport.weightChange > 0 ? '+' : ''}{activeReport.weightChange} kg
                    </span>
                  </div>
                </div>

                {/* AI specific report outputs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', borderTop: '1px solid hsl(var(--border-light))', paddingTop: '0.5rem' }}>
                  {activeReport.biggestImprovement && (
                    <div style={{ fontSize: '0.72rem' }}>
                      <span style={{ color: 'hsl(var(--emerald))', fontWeight: 700 }}>🚀 Biggest Improvement: </span>
                      <span style={{ color: 'hsl(var(--text-secondary))' }}>{activeReport.biggestImprovement}</span>
                    </div>
                  )}
                  {activeReport.areaToImprove && (
                    <div style={{ fontSize: '0.72rem' }}>
                      <span style={{ color: 'hsl(var(--amber))', fontWeight: 700 }}>⚠️ Area to Improve: </span>
                      <span style={{ color: 'hsl(var(--text-secondary))' }}>{activeReport.areaToImprove}</span>
                    </div>
                  )}
                  {activeReport.daysRemaining && (
                    <div style={{ fontSize: '0.72rem' }}>
                      <span style={{ color: 'hsl(var(--cyan))', fontWeight: 700 }}>📅 Est. Completion: </span>
                      <span style={{ color: 'hsl(var(--text-secondary))' }}>{activeReport.daysRemaining}</span>
                    </div>
                  )}
                  {activeReport.prediction && (
                    <div style={{ fontSize: '0.72rem' }}>
                      <span style={{ color: 'hsl(var(--violet))', fontWeight: 700 }}>🔮 Progression Prediction: </span>
                      <span style={{ color: 'hsl(var(--text-secondary))' }}>{activeReport.prediction}</span>
                    </div>
                  )}
                </div>

                <div style={{ fontStyle: 'italic', color: 'hsl(var(--text-muted))', fontSize: '0.72rem', borderTop: '1px solid hsl(var(--border-light))', paddingTop: '0.5rem', lineHeight: '1.4' }}>
                  {activeReport.summary}
                </div>

                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', marginTop: '0.25rem', alignSelf: 'flex-end' }}
                  onClick={() => setActiveReport(null)}
                >
                  Close Report
                </button>
              </div>
            )}
            
            {/* Archived reports dropdown list */}
            {reports.length > 0 && !activeReport && (
              <div style={{ marginTop: '1rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '0.25rem' }}>Report Archives:</span>
                <select 
                  className="form-select" 
                  style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                  onChange={(e) => {
                    const found = reports.find(r => r.dateGenerated === e.target.value);
                    if (found) setActiveReport(found);
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>Select past report...</option>
                  {reports.map((r, i) => (
                    <option key={i} value={r.dateGenerated}>Report ({r.dateGenerated}) - Score: {r.fitnessScore}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Trophy shelf achievements */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
              <Trophy size={18} color="hsl(var(--amber))" /> Achievements trophy shelf
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
              {achievementsList.map(ach => (
                <div 
                  key={ach.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.75rem', 
                    padding: '0.5rem', 
                    background: ach.unlocked ? 'hsl(var(--emerald) / 5%)' : 'hsl(var(--bg-dark))', 
                    borderRadius: '8px', 
                    border: `1px solid ${ach.unlocked ? 'hsl(var(--emerald) / 30%)' : 'hsl(var(--border-light))'}`,
                    opacity: ach.unlocked ? 1 : 0.5
                  }}
                >
                  <span style={{ fontSize: '1.25rem' }}>{ach.icon}</span>
                  <div>
                    <strong style={{ fontSize: '0.8rem', color: ach.unlocked ? '#fff' : 'hsl(var(--text-secondary))' }}>
                      {ach.title} {ach.unlocked && '🏆'}
                    </strong>
                    <div style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))' }}>{ach.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

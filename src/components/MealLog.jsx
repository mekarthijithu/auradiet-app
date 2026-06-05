import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  AlertCircle, 
  IndianRupee, 
  ChevronLeft, 
  ChevronRight, 
  Info,
  BrainCircuit
} from 'lucide-react';
import { getDayLog, saveDayLog, formatDate } from '../utils/db';
import { parseMealDescription, analyzeDailyLog } from '../utils/gemini';

export default function MealLog({ profile, logs, onLogsUpdate, currentDate, setCurrentDate }) {
  const [activeForm, setActiveForm] = useState('ai'); // 'ai' or 'manual'
  const [aiInput, setAiInput] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiPreview, setAiPreview] = useState(null);

  // Manual form fields
  const [manualName, setManualName] = useState('');
  const [manualCal, setManualCal] = useState('');
  const [manualProt, setManualProt] = useState('');
  const [manualCarb, setManualCarb] = useState('');
  const [manualFat, setManualFat] = useState('');
  const [manualFib, setManualFib] = useState('');
  const [manualCost, setManualCost] = useState('');

  // Daily AI analysis feedback
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  const dayData = getDayLog(currentDate);

  // Reset previews when date changes
  useEffect(() => {
    setAiPreview(null);
    setAiAnalysis('');
  }, [currentDate]);

  // Adjust Date Navigation
  const adjustDate = (days) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + days);
    setCurrentDate(formatDate(d));
  };

  // 1. Submit AI Food Description
  const handleAiSubmit = async (e) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    setLoadingAi(true);
    setAiPreview(null);
    try {
      const parsed = await parseMealDescription(aiInput, profile.apiKey);
      setAiPreview(parsed);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAi(false);
    }
  };

  // 2. Save AI Parsed Meal to Log (includes manual override edit)
  const handleSaveAiMeal = () => {
    if (!aiPreview) return;

    const newMeal = {
      name: aiPreview.name,
      calories: parseInt(aiPreview.calories || 0, 10),
      protein: parseInt(aiPreview.protein || 0, 10),
      carbs: parseInt(aiPreview.carbs || 0, 10),
      fat: parseInt(aiPreview.fat || 0, 10),
      fiber: parseInt(aiPreview.fiber || 0, 10),
      cost: parseFloat(aiPreview.cost || 0.0),
      ingredients: aiPreview.ingredients || []
    };

    const updated = {
      ...dayData,
      meals: [...dayData.meals, newMeal]
    };

    saveDayLog(currentDate, updated);
    onLogsUpdate({ ...logs, [currentDate]: updated });
    setAiPreview(null);
    setAiInput('');
  };

  // 3. Save Manual Meal
  const handleSaveManualMeal = (e) => {
    e.preventDefault();
    if (!manualName.trim()) return;

    const newMeal = {
      name: manualName,
      calories: parseInt(manualCal || 0, 10),
      protein: parseInt(manualProt || 0, 10),
      carbs: parseInt(manualCarb || 0, 10),
      fat: parseInt(manualFat || 0, 10),
      fiber: parseInt(manualFib || 0, 10),
      cost: parseFloat(manualCost || 0.0),
      ingredients: ['Custom Input']
    };

    const updated = {
      ...dayData,
      meals: [...dayData.meals, newMeal]
    };

    saveDayLog(currentDate, updated);
    onLogsUpdate({ ...logs, [currentDate]: updated });

    // Reset fields
    setManualName('');
    setManualCal('');
    setManualProt('');
    setManualCarb('');
    setManualFat('');
    setManualFib('');
    setManualCost('');
  };

  // 4. Delete Meal
  const handleDeleteMeal = (idx) => {
    const updatedMeals = [...dayData.meals];
    updatedMeals.splice(idx, 1);
    const updated = { ...dayData, meals: updatedMeals };
    saveDayLog(currentDate, updated);
    onLogsUpdate({ ...logs, [currentDate]: updated });
  };

  // 5. Daily AI Analysis Coaching Feedback
  const handleGetDailyFeedback = async () => {
    setLoadingAnalysis(true);
    try {
      const feedback = await analyzeDailyLog(
        dayData.meals,
        dayData.workout?.hours || 0,
        profile.targets,
        profile.apiKey
      );
      setAiAnalysis(feedback);
    } catch (err) {
      console.error(err);
      setAiAnalysis('Failed to load analysis. Check your settings.');
    } finally {
      setLoadingAnalysis(false);
    }
  };

  return (
    <div>
      <header className="page-header">
        <div>
          <h1 className="page-title">Meal Logger</h1>
          <p className="page-subtitle">Add foods manually or describe them to the AI Assistant</p>
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
        
        {/* Left Column: Logging forms and daily lists */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Logs panel */}
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Meals Eaten Today</h3>
            {dayData.meals.length > 0 ? (
              <div className="meal-list">
                {dayData.meals.map((meal, idx) => (
                  <div key={idx} className="meal-item">
                    <div className="meal-details">
                      <span className="meal-title">{meal.name}</span>
                      <div className="meal-meta">
                        <span>🔥 {meal.calories} kcal</span>
                        <span>🥩 P: {meal.protein}g</span>
                        <span>🌾 C: {meal.carbs}g</span>
                        <span>🥑 F: {meal.fat}g</span>
                        {meal.fiber > 0 && <span>🌾 Fib: {meal.fiber}g</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span className="meal-cost-badge">
                        ₹{meal.cost.toFixed(0)}
                      </span>
                      <button 
                        onClick={() => handleDeleteMeal(idx)}
                        style={{ background: 'none', border: 'none', color: 'hsl(var(--rose))', cursor: 'pointer' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'hsl(var(--text-secondary))', fontStyle: 'italic', fontSize: '0.9rem' }}>
                No meals logged yet today. Use the forms below to add your meals.
              </p>
            )}
          </div>

          {/* Logging Form Card */}
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <div className="tabs-container" style={{ marginBottom: '1.25rem' }}>
              <button 
                className={`tab-btn ${activeForm === 'ai' ? 'active' : ''}`}
                onClick={() => { setActiveForm('ai'); setAiPreview(null); }}
              >
                Log with AI
              </button>
              <button 
                className={`tab-btn ${activeForm === 'manual' ? 'active' : ''}`}
                onClick={() => setActiveForm('manual')}
              >
                Manual Input
              </button>
            </div>

            {activeForm === 'ai' && (
              <div>
                <form onSubmit={handleAiSubmit}>
                  <div className="form-group">
                    <label className="form-label">Describe your meal</label>
                    <textarea
                      rows="3"
                      className="form-input"
                      style={{ resize: 'none' }}
                      placeholder="e.g. 2 fried eggs, 1 toast with butter, and 100g of blueberries..."
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                    />
                  </div>
                  {!profile.apiKey && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'hsl(var(--amber) / 10%)', border: '1px solid hsl(var(--amber) / 20%)', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem' }}>
                      <AlertCircle size={16} color="hsl(var(--amber))" />
                      <span style={{ fontSize: '0.8rem', color: 'hsl(var(--amber))' }}>
                        No API Key found. Using offline fallback parser.
                      </span>
                    </div>
                  )}
                  <button type="submit" className="btn btn-primary" disabled={loadingAi}>
                    <Sparkles size={16} /> {loadingAi ? 'AI is parsing...' : 'Parse Description'}
                  </button>
                </form>

                {/* AI PREVIEW CARD */}
                {aiPreview && (
                  <div className="glass-panel" style={{ marginTop: '1.5rem', padding: '1.25rem', border: '1px solid hsl(var(--emerald) / 30%)' }}>
                    <div className="card-title-row">
                      <h4 style={{ fontSize: '1.1rem', color: 'hsl(var(--emerald))' }}>AI Parsed Output</h4>
                      {aiPreview.isFallback && <span className="badge badge-rose">Offline Est.</span>}
                    </div>

                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                      <label className="form-label">Meal Name</label>
                      <input 
                        className="form-input" 
                        value={aiPreview.name}
                        onChange={(e) => setAiPreview({ ...aiPreview, name: e.target.value })}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))' }}>Calories</span>
                        <input className="form-input" style={{ padding: '0.5rem' }} value={aiPreview.calories} onChange={(e) => setAiPreview({ ...aiPreview, calories: parseInt(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))' }}>Protein</span>
                        <input className="form-input" style={{ padding: '0.5rem' }} value={aiPreview.protein} onChange={(e) => setAiPreview({ ...aiPreview, protein: parseInt(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))' }}>Carbs</span>
                        <input className="form-input" style={{ padding: '0.5rem' }} value={aiPreview.carbs} onChange={(e) => setAiPreview({ ...aiPreview, carbs: parseInt(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))' }}>Fat</span>
                        <input className="form-input" style={{ padding: '0.5rem' }} value={aiPreview.fat} onChange={(e) => setAiPreview({ ...aiPreview, fat: parseInt(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))' }}>Fiber</span>
                        <input className="form-input" style={{ padding: '0.5rem' }} value={aiPreview.fiber} onChange={(e) => setAiPreview({ ...aiPreview, fiber: parseInt(e.target.value) || 0 })} />
                      </div>
                    </div>

                    {/* Meal Cost with Manual Override */}
                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <IndianRupee size={14} /> Ingredient Cost (₹) <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>(AI-estimated; edit to override)</span>
                      </label>
                      <input 
                        type="number"
                        step="1"
                        className="form-input"
                        value={aiPreview.cost}
                        onChange={(e) => setAiPreview({ ...aiPreview, cost: parseFloat(e.target.value) || 0 })}
                      />
                    </div>

                    <button onClick={handleSaveAiMeal} className="btn btn-primary btn-full">
                      Add to Log & Save
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeForm === 'manual' && (
              <form onSubmit={handleSaveManualMeal}>
                <div className="form-group">
                  <label className="form-label">Meal Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Grilled Chicken Breast"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Calories (kcal)</label>
                    <input type="number" className="form-input" value={manualCal} onChange={(e) => setManualCal(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Protein (g)</label>
                    <input type="number" className="form-input" value={manualProt} onChange={(e) => setManualProt(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Carbs (g)</label>
                    <input type="number" className="form-input" value={manualCarb} onChange={(e) => setManualCarb(e.target.value)} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Fat (g)</label>
                    <input type="number" className="form-input" value={manualFat} onChange={(e) => setManualFat(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Fiber (g)</label>
                    <input type="number" className="form-input" value={manualFib} onChange={(e) => setManualFib(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Estimated Cost (₹)</label>
                    <input type="number" step="1" className="form-input" value={manualCost} onChange={(e) => setManualCost(e.target.value)} />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary">
                  <Plus size={16} /> Log Meal
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: AI Nutrition Coach Feedbacks */}
        <div>
          <div className="glass-panel" style={{ padding: '1.75rem', border: '1px solid hsl(var(--emerald) / 20%)', position: 'sticky', top: '20px' }}>
            <div className="card-title-row">
              <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BrainCircuit size={20} color="hsl(var(--emerald))" /> AI Nutrition Coach
              </h3>
            </div>
            
            <p style={{ fontSize: '0.9rem', color: 'hsl(var(--text-secondary))', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Your coach reviews logged ingredients, macro totals, and active calories for today to suggest what foods to eat next.
            </p>

            <button 
              className="btn btn-primary btn-full"
              onClick={handleGetDailyFeedback}
              disabled={loadingAnalysis}
              style={{ marginBottom: '1.5rem' }}
            >
              {loadingAnalysis ? 'Reviewing logs...' : 'Get Live AI Coach Review'}
            </button>

            {aiAnalysis ? (
              <div className="ai-output-box">
                {aiAnalysis}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', background: 'hsl(var(--bg-dark))', padding: '1rem', borderRadius: '8px', border: '1px solid hsl(var(--border-light))' }}>
                <Info size={16} color="hsl(var(--text-muted))" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>
                  Click the button above to analyze today's meals against targets.
                </span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

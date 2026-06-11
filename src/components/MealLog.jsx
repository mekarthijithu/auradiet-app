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
  BrainCircuit,
  ShoppingBag,
  Scale
} from 'lucide-react';
import { getDayLog, saveDayLog, formatDate } from '../utils/db';
import { parseMealDescription, analyzeDailyLog } from '../utils/gemini';

export default function MealLog({ profile, logs, onLogsUpdate, currentDate, setCurrentDate }) {
  const [activeForm, setActiveForm] = useState('ai'); // 'ai' or 'manual'
  const [aiInput, setAiInput] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiPreview, setAiPreview] = useState(null);
  const [aiError, setAiError] = useState('');

  // Manual form fields
  const [manualName, setManualName] = useState('');
  const [manualCal, setManualCal] = useState('');
  const [manualProt, setManualProt] = useState('');
  const [manualCarb, setManualCarb] = useState('');
  const [manualFat, setManualFat] = useState('');
  const [manualFib, setManualFib] = useState('');
  const [manualCost, setManualCost] = useState('');
  const [manualQty, setManualQty] = useState('1 serving');
  const [manualSource, setManualSource] = useState('Homemade');

  // AI custom edits in preview card
  const [aiQty, setAiQty] = useState('1 serving');
  const [aiSource, setAiSource] = useState('Homemade');

  // Daily AI analysis feedback
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  const dayData = getDayLog(currentDate);

  // Reset previews when date changes
  useEffect(() => {
    setAiPreview(null);
    setAiAnalysis('');
    setAiError('');
  }, [currentDate]);

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
    setAiError('');
    try {
      const parsed = await parseMealDescription(aiInput, profile.apiKey);
      setAiPreview(parsed);
      setAiQty(parsed.quantity || '1 serving');
      setAiSource(parsed.source || 'Homemade');
    } catch (err) {
      console.error(err);
      setAiError(err.message || 'Failed to estimate meal nutrition. Please verify your internet connection and settings API key.');
    } finally {
      setLoadingAi(false);
    }
  };

  // 2. Save AI Parsed Meal to Log
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
      quantity: aiQty,
      source: aiSource,
      ingredients: aiPreview.ingredients || [],
      itemsBreakdown: aiPreview.itemsBreakdown || [],
      confidence: aiPreview.confidence || ''
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
      quantity: manualQty,
      source: manualSource,
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
    setManualQty('1 serving');
    setManualSource('Homemade');
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
        dayData.workout?.hours || (dayData.workout?.completed ? 1 : 0),
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

  const totalCost = dayData.meals?.reduce((sum, m) => sum + (m.cost || 0), 0) || 0;

  return (
    <div>
      <header className="page-header">
        <div>
          <h1 className="page-title">Indian Food AI Logger</h1>
          <p className="page-subtitle">Log meals with automated calorie estimations and expense tracking in Rupees (₹)</p>
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
          
          {/* Meals List */}
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem' }}>Meals Eaten Today</h3>
              <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>
                Total Cost: <strong style={{ color: 'hsl(var(--rose))' }}>₹{totalCost.toFixed(0)}</strong> / ₹260
              </span>
            </div>

            {dayData.meals && dayData.meals.length > 0 ? (
              <div className="meal-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {dayData.meals.map((meal, idx) => (
                  <div key={idx} className="meal-item" style={{ padding: '0.75rem', background: 'hsl(var(--bg-dark))', borderRadius: '12px', border: '1px solid hsl(var(--border-light))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="meal-details">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="meal-title" style={{ fontWeight: 700, color: '#fff' }}>{meal.name}</span>
                        <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>({meal.quantity || '1 serving'})</span>
                        {meal.source && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'hsl(var(--violet) / 10%)', color: 'hsl(var(--violet))' }}>
                            <ShoppingBag size={10} /> {meal.source}
                          </span>
                        )}
                      </div>
                      <div className="meal-meta" style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', marginTop: '0.25rem' }}>
                        <span>🔥 {meal.calories} kcal</span>
                        <span>🥩 P: {meal.protein}g</span>
                        <span>🌾 C: {meal.carbs}g</span>
                        <span>🥑 F: {meal.fat}g</span>
                        {meal.fiber > 0 && <span>🌾 Fib: {meal.fiber}g</span>}
                      </div>
                      {meal.itemsBreakdown && meal.itemsBreakdown.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem 0.8rem', marginTop: '0.4rem', borderLeft: '2px solid hsl(var(--emerald) / 30%)', paddingLeft: '0.5rem' }}>
                          {meal.itemsBreakdown.map((item, idy) => (
                            <span key={idy} style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))' }}>
                              • {item.item || item.name}: ~{item.calories} kcal
                            </span>
                          ))}
                        </div>
                      )}
                      {meal.confidence && (
                        <div style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))', fontStyle: 'italic', marginTop: '0.2rem' }}>
                          💡 {meal.confidence}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span className="meal-cost-badge" style={{ fontWeight: 700, color: 'hsl(var(--rose))', fontSize: '0.9rem' }}>
                        ₹{meal.cost ? meal.cost.toFixed(0) : '0'}
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
              <p style={{ color: 'hsl(var(--text-secondary))', fontStyle: 'italic', fontSize: '0.95rem' }}>
                No meals logged yet today. Type a description in the AI box below!
              </p>
            )}
          </div>

          {/* Logging Form Card */}
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <div className="tabs-container" style={{ marginBottom: '1.25rem', display: 'flex', gap: '0.5rem', borderBottom: '1px solid hsl(var(--border-light))', paddingBottom: '0.5rem' }}>
              <button 
                className={`tab-btn ${activeForm === 'ai' ? 'active' : ''}`}
                onClick={() => { setActiveForm('ai'); setAiPreview(null); }}
                style={{ background: 'none', border: 'none', borderBottom: activeForm === 'ai' ? '2px solid hsl(var(--emerald))' : '', color: activeForm === 'ai' ? '#fff' : 'hsl(var(--text-secondary))', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 600 }}
              >
                Log with Indian Food AI
              </button>
              <button 
                className={`tab-btn ${activeForm === 'manual' ? 'active' : ''}`}
                onClick={() => setActiveForm('manual')}
                style={{ background: 'none', border: 'none', borderBottom: activeForm === 'manual' ? '2px solid hsl(var(--emerald))' : '', color: activeForm === 'manual' ? '#fff' : 'hsl(var(--text-secondary))', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 600 }}
              >
                Manual Input
              </button>
            </div>

            {activeForm === 'ai' && (
              <div>
                <form onSubmit={handleAiSubmit}>
                  <div className="form-group">
                    <label className="form-label">Describe your Indian meal naturally</label>
                    <textarea
                      rows="3"
                      className="form-input"
                      style={{ resize: 'none' }}
                      placeholder="e.g. 2 chapatis with paneer butter masala and a plate of biryani..."
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                    />
                  </div>
                  {!profile.apiKey && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'hsl(var(--rose) / 10%)', border: '1px solid hsl(var(--rose) / 20%)', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem' }}>
                      <AlertCircle size={16} color="hsl(var(--rose))" />
                      <span style={{ fontSize: '0.8rem', color: 'hsl(var(--rose))' }}>
                        Gemini API key is required for AI meal logging. Please configure it in Settings.
                      </span>
                    </div>
                  )}
                  {aiError && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'hsl(var(--rose) / 10%)', border: '1px solid hsl(var(--rose) / 20%)', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem' }}>
                      <AlertCircle size={16} color="hsl(var(--rose))" />
                      <span style={{ fontSize: '0.8rem', color: 'hsl(var(--rose))' }}>
                        {aiError}
                      </span>
                    </div>
                  )}
                  <button type="submit" className="btn btn-primary" disabled={loadingAi}>
                    <Sparkles size={16} /> {loadingAi ? 'AI is estimating...' : 'Estimate Nutrition & Cost'}
                  </button>
                </form>

                {/* AI PREVIEW CARD */}
                {aiPreview && (
                  <div className="glass-panel" style={{ marginTop: '1.5rem', padding: '1.25rem', border: '1px solid hsl(var(--emerald) / 30%)' }}>
                    <div className="card-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h4 style={{ fontSize: '1.1rem', color: 'hsl(var(--emerald))' }}>AI Estimated Output</h4>
                      <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Confidence: High</span>
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
                        <input className="form-input" style={{ padding: '0.5rem', textAlign: 'center' }} value={aiPreview.calories} onChange={(e) => setAiPreview({ ...aiPreview, calories: parseInt(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))' }}>Protein</span>
                        <input className="form-input" style={{ padding: '0.5rem', textAlign: 'center' }} value={aiPreview.protein} onChange={(e) => setAiPreview({ ...aiPreview, protein: parseInt(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))' }}>Carbs</span>
                        <input className="form-input" style={{ padding: '0.5rem', textAlign: 'center' }} value={aiPreview.carbs} onChange={(e) => setAiPreview({ ...aiPreview, carbs: parseInt(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))' }}>Fat</span>
                        <input className="form-input" style={{ padding: '0.5rem', textAlign: 'center' }} value={aiPreview.fat} onChange={(e) => setAiPreview({ ...aiPreview, fat: parseInt(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))' }}>Fiber</span>
                        <input className="form-input" style={{ padding: '0.5rem', textAlign: 'center' }} value={aiPreview.fiber} onChange={(e) => setAiPreview({ ...aiPreview, fiber: parseInt(e.target.value) || 0 })} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                      <div>
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Scale size={12} /> Qty
                        </label>
                        <input className="form-input" value={aiQty} onChange={(e) => setAiQty(e.target.value)} placeholder="e.g. 2 pieces" />
                      </div>
                      <div>
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <IndianRupee size={12} /> Cost (₹)
                        </label>
                        <input type="number" className="form-input" value={aiPreview.cost} onChange={(e) => setAiPreview({ ...aiPreview, cost: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <ShoppingBag size={12} /> Source
                        </label>
                        <input className="form-input" value={aiSource} onChange={(e) => setAiSource(e.target.value)} placeholder="e.g. Swiggy/Homemade" />
                      </div>
                    </div>

                    {aiPreview.itemsBreakdown && aiPreview.itemsBreakdown.length > 0 && (
                      <div style={{ marginBottom: '1.25rem', background: 'hsl(var(--bg-dark))', padding: '0.75rem', borderRadius: '8px', border: '1px solid hsl(var(--border-light))' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--emerald))', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>Portion Estimates Breakdown:</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {aiPreview.itemsBreakdown.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))' }}>
                              <span>• {item.item || item.name}</span>
                              <span style={{ fontWeight: 600 }}>~{item.calories} kcal</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {aiPreview.confidence && (
                      <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', fontStyle: 'italic', marginBottom: '1.25rem' }}>
                        💡 {aiPreview.confidence}
                      </div>
                    )}

                    <button onClick={handleSaveAiMeal} className="btn btn-primary btn-full">
                      Add to Log & Sync to DB
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
                    placeholder="e.g. Paneer Butter Masala"
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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Fat (g)</label>
                    <input type="number" className="form-input" value={manualFat} onChange={(e) => setManualFat(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Fiber (g)</label>
                    <input type="number" className="form-input" value={manualFib} onChange={(e) => setManualFib(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Cost (₹)</label>
                    <input type="number" className="form-input" value={manualCost} onChange={(e) => setManualCost(e.target.value)} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Quantity</label>
                    <input type="text" className="form-input" value={manualQty} onChange={(e) => setManualQty(e.target.value)} placeholder="e.g. 1 plate" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Store/Source</label>
                    <input type="text" className="form-input" value={manualSource} onChange={(e) => setManualSource(e.target.value)} placeholder="e.g. Homemade/Restaurant" />
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
            <div className="card-title-row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BrainCircuit size={20} color="hsl(var(--emerald))" /> AI Nutrition Coach
              </h3>
            </div>
            
            <p style={{ fontSize: '0.9rem', color: 'hsl(var(--text-secondary))', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Your coach analyzes today's meals, cost summaries, and hydration logs to recommend the best local food suggestions.
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
              <div className="ai-output-box" style={{ background: 'hsl(var(--bg-dark))', padding: '1rem', borderRadius: '12px', border: '1px solid hsl(var(--border-light))', fontSize: '0.85rem', lineHeight: '1.5', color: 'hsl(var(--text-secondary))' }}>
                {aiAnalysis}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', background: 'hsl(var(--bg-dark))', padding: '1rem', borderRadius: '8px', border: '1px solid hsl(var(--border-light))' }}>
                <Info size={16} color="hsl(var(--text-muted))" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>
                  Click review to evaluate calories and affordable protein foods.
                </span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

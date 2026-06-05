import React, { useState } from 'react';
import { 
  ShoppingCart, 
  IndianRupee, 
  Plus, 
  Trash2, 
  Activity, 
  PiggyBank, 
  Calculator,
  Check
} from 'lucide-react';

export default function BudgetGrocery({ profile, logs, groceries, onGroceriesUpdate }) {
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');

  // 1. Calculate Spending Metrics from Logged Meals
  const calculateSpending = () => {
    const dates = Object.keys(logs);
    let totalAllTimeCost = 0;
    let totalMealsCount = 0;
    
    // Weekly calculation variables
    const today = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(today.getDate() - 7);
    let weeklyCost = 0;

    dates.forEach(d => {
      const dayData = logs[d];
      const logDate = new Date(d);
      
      const dayCost = dayData.meals?.reduce((sum, m) => sum + (m.cost || 0), 0) || 0;
      totalAllTimeCost += dayCost;
      totalMealsCount += dayData.meals?.length || 0;

      if (logDate >= oneWeekAgo && logDate <= today) {
        weeklyCost += dayCost;
      }
    });

    const averageDailyCost = dates.length > 0 ? (totalAllTimeCost / dates.length) : 0;
    // Monthly Projection
    const monthlyProjection = averageDailyCost * 30.4;

    return {
      weeklyCost,
      monthlyProjection,
      averageDailyCost
    };
  };

  const { weeklyCost, monthlyProjection, averageDailyCost } = calculateSpending();

  // 2. Grocery Checklist calculations
  const totalGroceryCost = groceries.reduce((sum, item) => sum + (item.price || 0), 0);
  const remainingGroceryCost = groceries.filter(i => !i.checked).reduce((sum, item) => sum + (item.price || 0), 0);
  const completedGroceryCost = groceries.filter(i => i.checked).reduce((sum, item) => sum + (item.price || 0), 0);

  // Toggle item checked state
  const handleToggleItem = (id) => {
    const updated = groceries.map(item => 
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    onGroceriesUpdate(updated);
  };

  // Delete item from list
  const handleDeleteItem = (id) => {
    const updated = groceries.filter(item => item.id !== id);
    onGroceriesUpdate(updated);
  };

  // Add custom item
  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const price = parseFloat(newItemPrice) || 0;
    const newItem = {
      id: `custom-${Date.now()}`,
      name: newItemName,
      price,
      checked: false
    };

    onGroceriesUpdate([...groceries, newItem]);
    setNewItemName('');
    setNewItemPrice('');
  };

  // Clear completed
  const handleClearCompleted = () => {
    const updated = groceries.filter(item => !item.checked);
    onGroceriesUpdate(updated);
  };

  // Clear all
  const handleClearAll = () => {
    onGroceriesUpdate([]);
  };

  return (
    <div>
      <header className="page-header">
        <div>
          <h1 className="page-title">Grocery & Diet Budget</h1>
          <p className="page-subtitle">Manage shopping checklist items and track weekly/monthly expenditures</p>
        </div>
      </header>

      {/* Spending Widget Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Weekly cost */}
        <div className="glass-panel cost-summary-card" style={{ borderBottom: '3px solid hsl(var(--cyan))' }}>
          <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Activity size={14} color="hsl(var(--cyan))" /> Weekly Meal Spending
          </span>
          <div className="cost-big-number">₹{weeklyCost.toFixed(0)}</div>
          <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
            Aggregated over the last 7 days of logs
          </span>
        </div>

        {/* Monthly Projection */}
        <div className="glass-panel cost-summary-card" style={{ borderBottom: '3px solid hsl(var(--emerald))' }}>
          <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <PiggyBank size={14} color="hsl(var(--emerald))" /> Projected Monthly Budget
          </span>
          <div className="cost-big-number">₹{monthlyProjection.toFixed(0)}</div>
          <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
            Based on an average daily cost of ₹{averageDailyCost.toFixed(0)}
          </span>
        </div>

        {/* Grocery cost */}
        <div className="glass-panel cost-summary-card" style={{ borderBottom: '3px solid hsl(var(--violet))' }}>
          <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Calculator size={14} color="hsl(var(--violet))" /> Checklist Total Value
          </span>
          <div className="cost-big-number">₹{totalGroceryCost.toFixed(0)}</div>
          <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
            Unchecked remaining: ₹{remainingGroceryCost.toFixed(0)}
          </span>
        </div>

      </div>

      {/* Main split: Checklist and addition form */}
      <div className="grocery-grid">
        
        {/* Checklist */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div className="card-title-row">
            <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShoppingCart size={18} color="hsl(var(--emerald))" /> Grocery Checklist
            </h3>
            <span className="badge badge-cyan">{groceries.length} Items</span>
          </div>

          <div className="checklist-container">
            {groceries.length > 0 ? (
              groceries.map(item => (
                <div 
                  key={item.id}
                  className={`checklist-item ${item.checked ? 'checked' : ''}`}
                >
                  <div className="checkbox-wrapper" onClick={() => handleToggleItem(item.id)}>
                    <div className="custom-checkbox">
                      {item.checked && <Check size={12} strokeWidth={3} />}
                    </div>
                    <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{item.name}</span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'hsl(var(--text-secondary))' }}>
                      ₹{item.price.toFixed(0)}
                    </span>
                    <button 
                      onClick={() => handleDeleteItem(item.id)}
                      style={{ background: 'none', border: 'none', color: 'hsl(var(--rose))', cursor: 'pointer', padding: '0.25rem' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: 'hsl(var(--text-secondary))', fontStyle: 'italic', fontSize: '0.9rem', padding: '2rem 0', textAlign: 'center' }}>
                Your grocery checklist is empty. Add items or generate one from the AI Weight Loss Plan.
              </p>
            )}
          </div>

          {groceries.length > 0 && (
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid hsl(var(--border-light))', paddingTop: '1rem' }}>
              <button onClick={handleClearCompleted} className="btn btn-secondary" style={{ flexGrow: 1, padding: '0.5rem', fontSize: '0.85rem' }}>
                Clear Purchased
              </button>
              <button onClick={handleClearAll} className="btn btn-danger" style={{ flexGrow: 1, padding: '0.5rem', fontSize: '0.85rem' }}>
                Clear All
              </button>
            </div>
          )}
        </div>

        {/* Add custom item form */}
        <div className="glass-panel" style={{ padding: '1.75rem', height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>Add Grocery Item</h3>
          <form onSubmit={handleAddItem}>
            <div className="form-group">
              <label className="form-label">Item Name</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Rolled Oats (1kg)"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Estimated Price (₹)</label>
              <input 
                type="number" 
                step="1"
                className="form-input" 
                placeholder="e.g. 250"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full">
              <Plus size={16} /> Add Item
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}

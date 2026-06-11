import React, { useState } from 'react';
import { 
  Scale, 
  ChevronLeft, 
  ChevronRight, 
  TrendingDown, 
  TrendingUp,
  Plus,
  Info,
  Sliders,
  DollarSign
} from 'lucide-react';
import { getDayLog, saveDayLog, getLatestWeight, formatDate } from '../utils/db';

export default function ProgressTracking({ profile, logs, onLogsUpdate, currentDate, setCurrentDate }) {
  const dayData = getDayLog(currentDate);

  // Form states
  const [waist, setWaist] = useState(dayData.measurements?.waist || '');
  const [chest, setChest] = useState(dayData.measurements?.chest || '');
  const [arms, setArms] = useState(dayData.measurements?.arms || '');
  const [thighs, setThighs] = useState(dayData.measurements?.thighs || '');
  const [bodyFat, setBodyFat] = useState(dayData.measurements?.bodyFat || '');
  const [weight, setWeight] = useState(dayData.weight || '');

  // Active graph tab
  const [graphTab, setGraphTab] = useState('weight'); // 'weight', 'calWeight', 'protein', 'workout', 'expenses'

  const adjustDate = (days) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + days);
    setCurrentDate(formatDate(d));
  };

  const handleSaveMeasurements = (e) => {
    e.preventDefault();

    const w = parseFloat(weight) || getLatestWeight();
    const hMeters = (profile.height || 178) / 100;
    const computedBmi = parseFloat((w / (hMeters * hMeters)).toFixed(1));

    const updated = {
      ...dayData,
      weight: w,
      measurements: {
        waist: parseFloat(waist) || 0,
        chest: parseFloat(chest) || 0,
        arms: parseFloat(arms) || 0,
        thighs: parseFloat(thighs) || 0,
        bodyFat: parseFloat(bodyFat) || 0,
        bmi: computedBmi
      }
    };

    saveDayLog(currentDate, updated);
    onLogsUpdate({ ...logs, [currentDate]: updated });
  };

  // Compile sorted records
  const sortedDates = Object.keys(logs).sort();
  const last10Days = sortedDates.slice(-10);

  // 1. Weight vs Time Graph coordinates
  const renderWeightGraph = () => {
    const data = last10Days.map(d => ({
      label: d.substring(8), // show day portion
      val: logs[d].weight || profile.weight
    }));

    if (data.length < 2) return <div className="no-data">Need at least 2 days of logs to render chart.</div>;

    const weights = data.map(d => d.val);
    const maxW = Math.max(...weights) + 1;
    const minW = Math.min(...weights) - 1;
    const range = maxW - minW || 1;

    const points = data.map((d, idx) => {
      const x = (idx / (data.length - 1)) * 640 + 40;
      const y = 140 - ((d.val - minW) / range) * 100;
      return { x, y, val: d.val, label: d.label };
    });

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    const area = `${path} L ${points[points.length-1].x} 150 L ${points[0].x} 150 Z`;

    return (
      <svg viewBox="0 0 720 180" width="100%" height="100%">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--emerald))" stopOpacity="0.2" />
            <stop offset="100%" stopColor="hsl(var(--emerald))" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* grids */}
        <line x1="30" y1="40" x2="690" y2="40" stroke="hsl(var(--border-light))" strokeWidth="0.5" strokeDasharray="3 3" />
        <line x1="30" y1="90" x2="690" y2="90" stroke="hsl(var(--border-light))" strokeWidth="0.5" strokeDasharray="3 3" />
        <line x1="30" y1="140" x2="690" y2="140" stroke="hsl(var(--border-light))" strokeWidth="0.5" strokeDasharray="3 3" />

        <path d={area} fill="url(#areaGrad)" />
        <path d={path} fill="none" stroke="hsl(var(--emerald))" strokeWidth="2.5" />
        {points.map((pt, i) => (
          <g key={i}>
            <circle cx={pt.x} cy={pt.y} r="4" fill="hsl(var(--bg-dark))" stroke="hsl(var(--emerald))" strokeWidth="2" />
            <text x={pt.x} y={pt.y - 10} fill="#fff" fontSize="9" textAnchor="middle">{pt.val}kg</text>
            <text x={pt.x} y="160" fill="hsl(var(--text-secondary))" fontSize="9" textAnchor="middle">{pt.label}</text>
          </g>
        ))}
      </svg>
    );
  };

  // 2. Calories vs Weight Dual Graph
  const renderCalWeightGraph = () => {
    const data = last10Days.map(d => {
      const dayCals = logs[d].meals?.reduce((sum, m) => sum + (m.calories || 0), 0) || 0;
      return {
        label: d.substring(8),
        cal: dayCals,
        weight: logs[d].weight || profile.weight
      };
    });

    if (data.length < 2) return <div className="no-data">Need at least 2 days of logs to render chart.</div>;

    const weights = data.map(d => d.weight);
    const cals = data.map(d => d.cal);
    const maxW = Math.max(...weights) + 0.5;
    const minW = Math.min(...weights) - 0.5;
    const wRange = maxW - minW || 1;

    const maxC = Math.max(...cals, profile.targets?.calories || 2000) + 200;
    const minC = 0;
    const cRange = maxC - minC;

    const wPoints = data.map((d, idx) => {
      const x = (idx / (data.length - 1)) * 640 + 40;
      const y = 140 - ((d.weight - minW) / wRange) * 100;
      return { x, y, val: d.weight };
    });

    const cPoints = data.map((d, idx) => {
      const x = (idx / (data.length - 1)) * 640 + 40;
      const y = 140 - ((d.cal - minC) / cRange) * 100;
      return { x, y, val: d.cal, label: d.label };
    });

    let wPath = `M ${wPoints[0].x} ${wPoints[0].y}`;
    let cPath = `M ${cPoints[0].x} ${cPoints[0].y}`;
    for (let i = 1; i < wPoints.length; i++) {
      wPath += ` L ${wPoints[i].x} ${wPoints[i].y}`;
      cPath += ` L ${cPoints[i].x} ${cPoints[i].y}`;
    }

    return (
      <svg viewBox="0 0 720 180" width="100%" height="100%">
        {/* grid */}
        <line x1="30" y1="40" x2="690" y2="40" stroke="hsl(var(--border-light))" strokeWidth="0.5" strokeDasharray="3 3" />
        <line x1="30" y1="140" x2="690" y2="140" stroke="hsl(var(--border-light))" strokeWidth="0.5" strokeDasharray="3 3" />

        <path d={cPath} fill="none" stroke="hsl(var(--cyan))" strokeWidth="2" strokeDasharray="4 2" />
        <path d={wPath} fill="none" stroke="hsl(var(--emerald))" strokeWidth="2.5" />

        {cPoints.map((pt, i) => (
          <g key={i}>
            <circle cx={pt.x} cy={pt.y} r="3" fill="hsl(var(--cyan))" />
            <text x={pt.x} y={pt.y - 8} fill="hsl(var(--cyan))" fontSize="8" textAnchor="middle">{pt.val}</text>
            <text x={pt.x} y="160" fill="hsl(var(--text-secondary))" fontSize="9" textAnchor="middle">{pt.label}</text>
          </g>
        ))}
        {wPoints.map((pt, i) => (
          <circle key={i} cx={pt.x} cy={pt.y} r="3" fill="hsl(var(--emerald))" />
        ))}
      </svg>
    );
  };

  // 3. Protein Consistency Bars
  const renderProteinGraph = () => {
    const data = last10Days.map(d => {
      const dayP = logs[d].meals?.reduce((sum, m) => sum + (m.protein || 0), 0) || 0;
      return {
        label: d.substring(8),
        protein: dayP
      };
    });

    if (data.length === 0) return <div className="no-data">Log protein foods to render chart.</div>;

    const targetP = profile.targets?.protein || 150;
    const maxP = Math.max(...data.map(d => d.protein), targetP) + 10;
    const canvasH = 120;

    const targetY = 140 - (targetP / maxP) * canvasH;

    return (
      <svg viewBox="0 0 720 180" width="100%" height="100%">
        {/* target line */}
        <line x1="30" y1={targetY} x2="690" y2={targetY} stroke="hsl(var(--amber))" strokeWidth="1.5" strokeDasharray="4 4" />
        <text x="40" y={targetY - 5} fill="hsl(var(--amber))" fontSize="8" fontWeight="bold">Target {targetP}g</text>

        {data.map((d, idx) => {
          const x = (idx / data.length) * 640 + 50;
          const barH = (d.protein / maxP) * canvasH;
          const y = 140 - barH;
          const w = 24;
          return (
            <g key={idx}>
              <rect x={x} y={y} width={w} height={barH} fill={d.protein >= targetP ? 'hsl(var(--emerald))' : 'hsl(var(--rose))'} rx="4" />
              <text x={x + w/2} y={y - 8} fill="#fff" fontSize="8" fontWeight="bold" textAnchor="middle">{d.protein}g</text>
              <text x={x + w/2} y="160" fill="hsl(var(--text-secondary))" fontSize="9" textAnchor="middle">{d.label}</text>
            </g>
          );
        })}
      </svg>
    );
  };

  // 4. Workout Attendance (Grid checklist)
  const renderWorkoutGraph = () => {
    // Collect last 15 days of workout states
    const dates = [];
    for (let i = 14; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(formatDate(d));
    }

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', padding: '1rem 0' }}>
        {dates.map((dateStr) => {
          const day = logs[dateStr];
          const completed = day?.workout?.completed || day?.workout?.entries?.length > 0;
          return (
            <div key={dateStr} style={{ padding: '0.75rem', background: completed ? 'hsl(var(--emerald) / 8%)' : 'hsl(var(--bg-dark))', borderRadius: '10px', border: `1px solid ${completed ? 'hsl(var(--emerald) / 30%)' : 'hsl(var(--border-light))'}`, textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-secondary))', textTransform: 'uppercase' }}>{dateStr.substring(5)}</div>
              <div style={{ fontSize: '1.25rem', marginTop: '0.25rem' }}>{completed ? '💪' : '❌'}</div>
              <div style={{ fontSize: '0.65rem', color: completed ? 'hsl(var(--emerald))' : 'hsl(var(--text-muted))', fontWeight: 600, marginTop: '0.25rem' }}>
                {completed ? 'Workout' : 'Rest'}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // 5. Expense Trends Line Chart
  const renderExpensesGraph = () => {
    const data = last10Days.map(d => {
      const dayCost = logs[d].meals?.reduce((sum, m) => sum + (m.cost || 0), 0) || 0;
      return {
        label: d.substring(8),
        cost: dayCost
      };
    });

    if (data.length < 2) return <div className="no-data">Need at least 2 days of logs to render chart.</div>;

    const costs = data.map(d => d.cost);
    const maxC = Math.max(...costs, 260) + 50;
    const minC = 0;
    const range = maxC - minC;

    const points = data.map((d, idx) => {
      const x = (idx / (data.length - 1)) * 640 + 40;
      const y = 140 - ((d.cost - minC) / range) * 100;
      return { x, y, val: d.cost, label: d.label };
    });

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    const area = `${path} L ${points[points.length-1].x} 150 L ${points[0].x} 150 Z`;

    const limitY = 140 - (260 / maxC) * 100;

    return (
      <svg viewBox="0 0 720 180" width="100%" height="100%">
        <defs>
          <linearGradient id="areaGradCost" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--rose))" stopOpacity="0.2" />
            <stop offset="100%" stopColor="hsl(var(--rose))" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* average limit line (₹260) */}
        <line x1="30" y1={limitY} x2="690" y2={limitY} stroke="hsl(var(--rose))" strokeWidth="1" strokeDasharray="3 3" />
        <text x="40" y={limitY - 5} fill="hsl(var(--rose))" fontSize="8">Budget Limit: ₹260</text>

        <path d={area} fill="url(#areaGradCost)" />
        <path d={path} fill="none" stroke="hsl(var(--rose))" strokeWidth="2.5" />
        {points.map((pt, i) => (
          <g key={i}>
            <circle cx={pt.x} cy={pt.y} r="4" fill="hsl(var(--bg-dark))" stroke="hsl(var(--rose))" strokeWidth="2" />
            <text x={pt.x} y={pt.y - 10} fill="#fff" fontSize="9" textAnchor="middle">₹{pt.val}</text>
            <text x={pt.x} y="160" fill="hsl(var(--text-secondary))" fontSize="9" textAnchor="middle">{pt.label}</text>
          </g>
        ))}
      </svg>
    );
  };

  return (
    <div>
      <header className="page-header">
        <div>
          <h1 className="page-title">Progress Tracking</h1>
          <p className="page-subtitle">Log body measurements and analyze physiological progress trends</p>
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
      <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: '1.5rem' }}>
        
        {/* Left Column: Measurements logger */}
        <div className="glass-panel" style={{ padding: '1.75rem', height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Scale size={20} color="hsl(var(--emerald))" /> Body Metrics Check-In
          </h3>

          <form onSubmit={handleSaveMeasurements} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Weight (kg)</label>
              <input type="number" step="0.1" className="form-input" value={weight} onChange={(e) => setWeight(e.target.value)} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Waist Circum. (cm)</label>
                <input type="number" className="form-input" value={waist} onChange={(e) => setWaist(e.target.value)} placeholder="Waist" />
              </div>
              <div className="form-group">
                <label className="form-label">Chest Circum. (cm)</label>
                <input type="number" className="form-input" value={chest} onChange={(e) => setChest(e.target.value)} placeholder="Chest" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Arms Circum. (cm)</label>
                <input type="number" className="form-input" value={arms} onChange={(e) => setArms(e.target.value)} placeholder="Arms" />
              </div>
              <div className="form-group">
                <label className="form-label">Thighs Circum. (cm)</label>
                <input type="number" className="form-input" value={thighs} onChange={(e) => setThighs(e.target.value)} placeholder="Thighs" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Estimated Body Fat %</label>
              <input type="number" step="0.1" className="form-input" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} placeholder="Body Fat" />
            </div>

            <div style={{ background: 'hsl(var(--bg-dark))', padding: '0.75rem', borderRadius: '8px', border: '1px solid hsl(var(--border-light))', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))' }}>
              <span>BMI: <strong>{dayData.measurements?.bmi || 'N/A'}</strong> (calculated on save)</span>
            </div>

            <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
              <Plus size={16} /> Save Body Log
            </button>
          </form>
        </div>

        {/* Right Column: Graphs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Graph Tabs */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '0.4rem', borderBottom: '1px solid hsl(var(--border-light))', paddingBottom: '0.75rem', marginBottom: '1rem', overflowX: 'auto', flexWrap: 'wrap' }}>
              <button className={`tab-btn ${graphTab === 'weight' ? 'active' : ''}`} onClick={() => setGraphTab('weight')} style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', background: 'none', border: 'none', color: graphTab === 'weight' ? '#fff' : 'hsl(var(--text-secondary))', cursor: 'pointer', fontWeight: 600, borderBottom: graphTab === 'weight' ? '2px solid hsl(var(--emerald))' : '' }}>
                Weight Curve
              </button>
              <button className={`tab-btn ${graphTab === 'calWeight' ? 'active' : ''}`} onClick={() => setGraphTab('calWeight')} style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', background: 'none', border: 'none', color: graphTab === 'calWeight' ? '#fff' : 'hsl(var(--text-secondary))', cursor: 'pointer', fontWeight: 600, borderBottom: graphTab === 'calWeight' ? '2px solid hsl(var(--emerald))' : '' }}>
                Calories vs Weight
              </button>
              <button className={`tab-btn ${graphTab === 'protein' ? 'active' : ''}`} onClick={() => setGraphTab('protein')} style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', background: 'none', border: 'none', color: graphTab === 'protein' ? '#fff' : 'hsl(var(--text-secondary))', cursor: 'pointer', fontWeight: 600, borderBottom: graphTab === 'protein' ? '2px solid hsl(var(--emerald))' : '' }}>
                Protein Consistency
              </button>
              <button className={`tab-btn ${graphTab === 'workout' ? 'active' : ''}`} onClick={() => setGraphTab('workout')} style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', background: 'none', border: 'none', color: graphTab === 'workout' ? '#fff' : 'hsl(var(--text-secondary))', cursor: 'pointer', fontWeight: 600, borderBottom: graphTab === 'workout' ? '2px solid hsl(var(--emerald))' : '' }}>
                Workout Logs
              </button>
              <button className={`tab-btn ${graphTab === 'expenses' ? 'active' : ''}`} onClick={() => setGraphTab('expenses')} style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', background: 'none', border: 'none', color: graphTab === 'expenses' ? '#fff' : 'hsl(var(--text-secondary))', cursor: 'pointer', fontWeight: 600, borderBottom: graphTab === 'expenses' ? '2px solid hsl(var(--emerald))' : '' }}>
                Expense Trends
              </button>
            </div>

            {/* Active Graph Render */}
            <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {graphTab === 'weight' && renderWeightGraph()}
              {graphTab === 'calWeight' && renderCalWeightGraph()}
              {graphTab === 'protein' && renderProteinGraph()}
              {graphTab === 'workout' && renderWorkoutGraph()}
              {graphTab === 'expenses' && renderExpensesGraph()}
            </div>
          </div>

          {/* Body stats checklist summaries */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Latest Measurement Values</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', textAlign: 'center', marginTop: '0.5rem' }}>
              <div style={{ padding: '0.5rem', background: 'hsl(var(--bg-dark))', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.65rem', color: 'hsl(var(--text-secondary))' }}>Waist</div>
                <strong style={{ fontSize: '0.85rem' }}>{dayData.measurements?.waist || '—'} cm</strong>
              </div>
              <div style={{ padding: '0.5rem', background: 'hsl(var(--bg-dark))', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.65rem', color: 'hsl(var(--text-secondary))' }}>Chest</div>
                <strong style={{ fontSize: '0.85rem' }}>{dayData.measurements?.chest || '—'} cm</strong>
              </div>
              <div style={{ padding: '0.5rem', background: 'hsl(var(--bg-dark))', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.65rem', color: 'hsl(var(--text-secondary))' }}>Arms</div>
                <strong style={{ fontSize: '0.85rem' }}>{dayData.measurements?.arms || '—'} cm</strong>
              </div>
              <div style={{ padding: '0.5rem', background: 'hsl(var(--bg-dark))', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.65rem', color: 'hsl(var(--text-secondary))' }}>Thighs</div>
                <strong style={{ fontSize: '0.85rem' }}>{dayData.measurements?.thighs || '—'} cm</strong>
              </div>
              <div style={{ padding: '0.5rem', background: 'hsl(var(--bg-dark))', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.65rem', color: 'hsl(var(--text-secondary))' }}>Fat %</div>
                <strong style={{ fontSize: '0.85rem' }}>{dayData.measurements?.bodyFat || '—'}%</strong>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

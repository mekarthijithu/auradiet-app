import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Utensils, 
  TrendingDown, 
  ShoppingCart, 
  Settings as SettingsIcon, 
  Heart 
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import MealLog from './components/MealLog';
import AiWeightLoss from './components/AiWeightLoss';
import BudgetGrocery from './components/BudgetGrocery';
import Settings from './components/Settings';
import ProfileSetup from './components/ProfileSetup';
import Login from './components/Login';
import { getProfile, getLogs, getGroceries, getDietPlan, saveProfile, saveLogs, saveGroceries, saveDietPlan, formatDate, getCurrentProfileId, setCurrentProfileId } from './utils/db';

export default function App() {
  const [currentProfileId, setCurrentProfileIdState] = useState(() => getCurrentProfileId());
  const [profile, setProfile] = useState(null);
  const [logs, setLogs] = useState(null);
  const [groceries, setGroceries] = useState([]);
  const [dietPlan, setDietPlan] = useState(null);
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentDate, setCurrentDate] = useState(formatDate(new Date()));
  const [showSetup, setShowSetup] = useState(false);

  // Initialize data on mount and when active profile switches
  useEffect(() => {
    if (!currentProfileId) return;

    const loadedProfile = getProfile();
    const loadedLogs = getLogs();
    const loadedGroceries = getGroceries();
    const loadedDietPlan = getDietPlan();

    setProfile(loadedProfile);
    setLogs(loadedLogs);
    setGroceries(loadedGroceries);
    setDietPlan(loadedDietPlan);

    // If profile setup hasn't been completed, show setup wizard
    if (loadedProfile && !loadedProfile.setupCompleted) {
      setShowSetup(true);
    } else {
      setShowSetup(false);
    }
  }, [currentProfileId]);

  const handleSelectProfile = (id) => {
    setCurrentProfileId(id);
    setCurrentProfileIdState(id);
  };

  const handleLogout = () => {
    setCurrentProfileId(null);
    setCurrentProfileIdState(null);
    setProfile(null);
    setLogs(null);
    setGroceries([]);
    setDietPlan(null);
  };

  const handleProfileUpdate = (updatedProfile) => {
    const nextProfile = { ...updatedProfile, setupCompleted: true };
    setProfile(nextProfile);
    saveProfile(nextProfile);
    setShowSetup(false);
  };

  const handleLogsUpdate = (updatedLogs) => {
    setLogs(updatedLogs);
    saveLogs(updatedLogs);
  };

  const handleGroceriesUpdate = (updatedGroceries) => {
    setGroceries(updatedGroceries);
    saveGroceries(updatedGroceries);
  };

  const handleDietPlanUpdate = (updatedPlan) => {
    setDietPlan(updatedPlan);
    saveDietPlan(updatedPlan);
  };

  const handleResetAll = () => {
    // Clear and reload
    localStorage.clear();
    const loadedProfile = getProfile();
    const loadedLogs = getLogs();
    const loadedGroceries = getGroceries();
    const loadedDietPlan = getDietPlan();

    setProfile(loadedProfile);
    setLogs(loadedLogs);
    setGroceries(loadedGroceries);
    setDietPlan(loadedDietPlan);
    
    // Reset tabs
    setActiveTab('dashboard');
    setCurrentDate(formatDate(new Date()));
    setShowSetup(false);
  };

  if (!currentProfileId) {
    return <Login onSelectProfile={handleSelectProfile} />;
  }

  if (!profile || !logs) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (showSetup) {
    return (
      <ProfileSetup 
        profile={profile} 
        onComplete={handleProfileUpdate} 
        onSkip={() => setShowSetup(false)} 
      />
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand-section">
          <Heart size={28} color="hsl(var(--emerald))" style={{ filter: 'drop-shadow(0 0 8px hsl(var(--emerald) / 0.5))' }} />
          <span className="brand-logo">AuraDiet</span>
        </div>

        <nav className="nav-links">
          <div 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <Activity size={20} />
            <span>Dashboard</span>
          </div>
          <div 
            className={`nav-item ${activeTab === 'meallog' ? 'active' : ''}`}
            onClick={() => setActiveTab('meallog')}
          >
            <Utensils size={20} />
            <span>Meal Logger</span>
          </div>
          <div 
            className={`nav-item ${activeTab === 'aiweightloss' ? 'active' : ''}`}
            onClick={() => setActiveTab('aiweightloss')}
          >
            <TrendingDown size={20} />
            <span>AI Weight Loss</span>
          </div>
          <div 
            className={`nav-item ${activeTab === 'grocerybudget' ? 'active' : ''}`}
            onClick={() => setActiveTab('grocerybudget')}
          >
            <ShoppingCart size={20} />
            <span>Grocery & Budget</span>
          </div>
          <div 
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <SettingsIcon size={20} />
            <span>Settings</span>
          </div>
        </nav>
      </aside>

      {/* Main View Area */}
      <main className="main-content">
        {activeTab === 'dashboard' && (
          <Dashboard 
            profile={profile} 
            logs={logs} 
            onLogsUpdate={handleLogsUpdate}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
          />
        )}

        {activeTab === 'meallog' && (
          <MealLog 
            profile={profile}
            logs={logs}
            onLogsUpdate={handleLogsUpdate}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
          />
        )}

        {activeTab === 'aiweightloss' && (
          <AiWeightLoss 
            profile={profile}
            dietPlan={dietPlan}
            logs={logs}
            onProfileUpdate={handleProfileUpdate}
            onDietPlanUpdate={handleDietPlanUpdate}
            onGroceriesUpdate={handleGroceriesUpdate}
            onTriggerSetup={() => setShowSetup(true)}
          />
        )}

        {activeTab === 'grocerybudget' && (
          <BudgetGrocery 
            profile={profile}
            logs={logs}
            groceries={groceries}
            onGroceriesUpdate={handleGroceriesUpdate}
          />
        )}

        {activeTab === 'settings' && (
          <Settings 
            profile={profile}
            onProfileUpdate={handleProfileUpdate}
            onResetAll={handleResetAll}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Mobile Footer Navigation Bar */}
      <nav className="mobile-bottom-nav">
        <div 
          className={`mobile-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <Activity size={20} />
          <span>Dashboard</span>
        </div>
        <div 
          className={`mobile-nav-item ${activeTab === 'meallog' ? 'active' : ''}`}
          onClick={() => setActiveTab('meallog')}
        >
          <Utensils size={20} />
          <span>Log</span>
        </div>
        <div 
          className={`mobile-nav-item ${activeTab === 'aiweightloss' ? 'active' : ''}`}
          onClick={() => setActiveTab('aiweightloss')}
        >
          <TrendingDown size={20} />
          <span>AI Plan</span>
        </div>
        <div 
          className={`mobile-nav-item ${activeTab === 'grocerybudget' ? 'active' : ''}`}
          onClick={() => setActiveTab('grocerybudget')}
        >
          <ShoppingCart size={20} />
          <span>Budget</span>
        </div>
        <div 
          className={`mobile-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <SettingsIcon size={20} />
          <span>Settings</span>
        </div>
      </nav>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Utensils, 
  TrendingDown, 
  ShoppingCart, 
  Settings as SettingsIcon, 
  Heart,
  LogOut
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import MealLog from './components/MealLog';
import AiWeightLoss from './components/AiWeightLoss';
import BudgetGrocery from './components/BudgetGrocery';
import Settings from './components/Settings';
import ProfileSetup from './components/ProfileSetup';
import Login from './components/Login';
import { 
  getProfile, 
  getLogs, 
  getGroceries, 
  getDietPlan, 
  saveProfile, 
  saveLogs, 
  saveGroceries, 
  saveDietPlan, 
  formatDate, 
  getCurrentProfileId, 
  setCurrentProfileId,
  resetDB
} from './utils/db';

export default function App() {
  const [currentProfileId, setCurrentProfileIdState] = useState(() => getCurrentProfileId());
  const [profile, setProfile] = useState(null);
  const [logs, setLogs] = useState(null);
  const [groceries, setGroceries] = useState([]);
  const [dietPlan, setDietPlan] = useState(null);
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentDate, setCurrentDate] = useState(formatDate(new Date()));
  const [showSetup, setShowSetup] = useState(false);
  const [loading, setLoading] = useState(false);

  // Initialize data on mount and when active profile switches
  useEffect(() => {
    if (!currentProfileId) return;

    let isMounted = true;
    setLoading(true);
    
    const loadData = async () => {
      try {
        const loadedProfile = await getProfile();
        const loadedLogs = await getLogs();
        const loadedGroceries = await getGroceries();
        const loadedDietPlan = await getDietPlan();

        if (isMounted) {
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
        }
      } catch (err) {
        console.error("Error loading profile data:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
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

  const handleProfileUpdate = async (updatedProfile) => {
    const nextProfile = { ...updatedProfile, setupCompleted: true, lastUpdated: Date.now() };
    setProfile(nextProfile);
    setShowSetup(false);
    await saveProfile(nextProfile);
  };

  const handleLogsUpdate = async (updatedLogs) => {
    setLogs(updatedLogs);
    await saveLogs(updatedLogs);
    if (profile) {
      const nextProfile = { ...profile, lastUpdated: Date.now() };
      setProfile(nextProfile);
      await saveProfile(nextProfile);
    }
  };

  const handleGroceriesUpdate = async (updatedGroceries) => {
    setGroceries(updatedGroceries);
    await saveGroceries(updatedGroceries);
    if (profile) {
      const nextProfile = { ...profile, lastUpdated: Date.now() };
      setProfile(nextProfile);
      await saveProfile(nextProfile);
    }
  };

  const handleDietPlanUpdate = async (updatedPlan) => {
    setDietPlan(updatedPlan);
    await saveDietPlan(updatedPlan);
    if (profile) {
      const nextProfile = { ...profile, lastUpdated: Date.now() };
      setProfile(nextProfile);
      await saveProfile(nextProfile);
    }
  };

  const handleResetAll = async () => {
    setLoading(true);
    try {
      await resetDB();
      const loadedProfile = await getProfile();
      const loadedLogs = await getLogs();
      const loadedGroceries = await getGroceries();
      const loadedDietPlan = await getDietPlan();

      setProfile(loadedProfile);
      setLogs(loadedLogs);
      setGroceries(loadedGroceries);
      setDietPlan(loadedDietPlan);
      
      // Reset tabs
      setActiveTab('dashboard');
      setCurrentDate(formatDate(new Date()));
      setShowSetup(false);
    } catch (err) {
      console.error("Failed to reset DB:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!currentProfileId) {
    return <Login onSelectProfile={handleSelectProfile} />;
  }

  if (loading || !profile || !logs) {
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
        onSkip={() => handleProfileUpdate(profile)} 
      />
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand-section" style={{ marginBottom: '1rem' }}>
          <Heart size={28} color="hsl(var(--emerald))" style={{ filter: 'drop-shadow(0 0 8px hsl(var(--emerald) / 0.5))' }} />
          <span className="brand-logo">AuraDiet</span>
        </div>

        {/* Sync Status Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.4rem 0.75rem',
          borderRadius: '12px',
          background: 'hsl(var(--bg-card) / 50%)',
          border: '1px solid hsl(var(--border-light))',
          fontSize: '0.75rem',
          marginBottom: '2rem',
          color: 'hsl(var(--text-secondary))',
          alignSelf: 'flex-start'
        }}>
          {import.meta.env.VITE_KV_REST_API_URL && import.meta.env.VITE_KV_REST_API_TOKEN ? (
            <>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'hsl(var(--emerald))', boxShadow: '0 0 6px hsl(var(--emerald))' }} />
              <span>Vercel KV Connected</span>
            </>
          ) : (
            <>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'hsl(var(--amber))', boxShadow: '0 0 6px hsl(var(--amber))' }} />
              <span>Local Storage Mode</span>
            </>
          )}
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
          </div>
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid hsl(var(--border-light))' }}>
          <div 
            className="nav-item" 
            onClick={handleLogout}
            style={{ color: 'hsl(var(--rose))' }}
          >
            <LogOut size={20} />
            <span>Sign Out</span>
          </div>
        </div>
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

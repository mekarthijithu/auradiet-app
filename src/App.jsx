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
  KEYS,
  fetchCloudData,
  uploadCloudData,
  createCloudProfile
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
  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced' | 'syncing' | 'error'

  // Trigger a full upload of current state to the cloud
  const triggerCloudUpload = async (updatedProfile, updatedLogs, updatedGroceries, updatedDietPlan) => {
    const p = updatedProfile || profile;
    if (!p || !p.syncCode) return;

    setSyncStatus('syncing');
    try {
      const payload = {
        profile: p,
        logs: updatedLogs || logs,
        groceries: updatedGroceries || groceries,
        dietPlan: updatedDietPlan !== undefined ? updatedDietPlan : dietPlan,
        lastUpdated: Date.now()
      };
      
      // Update local profile with the new timestamp
      p.lastUpdated = payload.lastUpdated;
      saveProfile(p);

      await uploadCloudData(p.syncCode, payload);
      setSyncStatus('synced');
    } catch (err) {
      console.error("Cloud upload failed:", err);
      setSyncStatus('error');
    }
  };

  // Perform pull/push sync with conflict resolution
  const triggerCloudSync = async (selectedProfileId, isSilent = false) => {
    const activeId = selectedProfileId || currentProfileId;
    if (!activeId) return;

    const localProfile = JSON.parse(localStorage.getItem(KEYS.PROFILE(activeId)));
    if (!localProfile) return;

    // 1. Generate a sync code on the cloud if none exists
    if (!localProfile.syncCode) {
      if (!isSilent) setSyncStatus('syncing');
      try {
        const payload = {
          profile: { ...localProfile, syncCode: null },
          logs: JSON.parse(localStorage.getItem(KEYS.LOGS(activeId))) || {},
          groceries: JSON.parse(localStorage.getItem(KEYS.GROCERIES(activeId))) || [],
          dietPlan: JSON.parse(localStorage.getItem(KEYS.DIET_PLAN(activeId))) || null,
          lastUpdated: Date.now()
        };

        const syncCode = await createCloudProfile(payload);
        
        // Update local profile with the syncCode and timestamp
        localProfile.syncCode = syncCode;
        localProfile.lastUpdated = payload.lastUpdated;
        localStorage.setItem(KEYS.PROFILE(activeId), JSON.stringify(localProfile));

        // Update profile in the profile list
        let list = JSON.parse(localStorage.getItem(KEYS.PROFILES_LIST)) || [];
        list = list.map(p => p.id === activeId ? { ...p, syncCode } : p);
        localStorage.setItem(KEYS.PROFILES_LIST, JSON.stringify(list));

        // Upload updated profile containing syncCode
        payload.profile.syncCode = syncCode;
        await uploadCloudData(syncCode, payload);

        setProfile(localProfile);
        setSyncStatus('synced');
      } catch (err) {
        console.error("Failed to initialize sync code:", err);
        setSyncStatus('error');
      }
      return;
    }

    // 2. Profile has a sync code, fetch remote data
    if (!isSilent) setSyncStatus('syncing');
    try {
      const remoteData = await fetchCloudData(localProfile.syncCode);
      if (remoteData && remoteData.lastUpdated) {
        const localLastUpdated = localProfile.lastUpdated || 0;
        
        if (remoteData.lastUpdated > localLastUpdated) {
          // Remote is newer, download and apply changes
          localStorage.setItem(KEYS.PROFILE(activeId), JSON.stringify(remoteData.profile));
          localStorage.setItem(KEYS.LOGS(activeId), JSON.stringify(remoteData.logs));
          localStorage.setItem(KEYS.GROCERIES(activeId), JSON.stringify(remoteData.groceries));
          localStorage.setItem(KEYS.DIET_PLAN(activeId), JSON.stringify(remoteData.dietPlan));

          setProfile(remoteData.profile);
          setLogs(remoteData.logs);
          setGroceries(remoteData.groceries);
          setDietPlan(remoteData.dietPlan);
          setSyncStatus('synced');
        } else if (localLastUpdated > remoteData.lastUpdated) {
          // Local is newer, upload to remote
          const payload = {
            profile: localProfile,
            logs: JSON.parse(localStorage.getItem(KEYS.LOGS(activeId))) || {},
            groceries: JSON.parse(localStorage.getItem(KEYS.GROCERIES(activeId))) || [],
            dietPlan: JSON.parse(localStorage.getItem(KEYS.DIET_PLAN(activeId))) || null,
            lastUpdated: localLastUpdated
          };
          await uploadCloudData(localProfile.syncCode, payload);
          setSyncStatus('synced');
        } else {
          // State is already identical/synced
          setSyncStatus('synced');
        }
      } else {
        // Cloud data was empty or deleted, upload current local state
        const payload = {
          profile: localProfile,
          logs: JSON.parse(localStorage.getItem(KEYS.LOGS(activeId))) || {},
          groceries: JSON.parse(localStorage.getItem(KEYS.GROCERIES(activeId))) || [],
          dietPlan: JSON.parse(localStorage.getItem(KEYS.DIET_PLAN(activeId))) || null,
          lastUpdated: localProfile.lastUpdated || Date.now()
        };
        await uploadCloudData(localProfile.syncCode, payload);
        setSyncStatus('synced');
      }
    } catch (err) {
      console.error("Failed to sync with cloud:", err);
      setSyncStatus('error');
    }
  };

  const handleLinkProfile = async (syncCode) => {
    try {
      const remoteData = await fetchCloudData(syncCode);
      if (!remoteData || !remoteData.profile) {
        throw new Error("Invalid sync code or profile data missing");
      }
      
      const remoteProfile = remoteData.profile;
      const targetId = remoteProfile.id;
      
      // Update local storage for this profile
      localStorage.setItem(KEYS.PROFILE(targetId), JSON.stringify(remoteProfile));
      localStorage.setItem(KEYS.LOGS(targetId), JSON.stringify(remoteData.logs || {}));
      localStorage.setItem(KEYS.GROCERIES(targetId), JSON.stringify(remoteData.groceries || []));
      localStorage.setItem(KEYS.DIET_PLAN(targetId), JSON.stringify(remoteData.dietPlan || null));
      
      // Add to profile list if not already present
      let list = JSON.parse(localStorage.getItem(KEYS.PROFILES_LIST)) || [];
      if (!list.find(p => p.id === targetId)) {
        list.push({
          id: targetId,
          name: remoteProfile.name,
          avatarColor: remoteProfile.avatarColor || `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`,
          syncCode: syncCode
        });
        localStorage.setItem(KEYS.PROFILES_LIST, JSON.stringify(list));
      }
      
      // Select the profile
      handleSelectProfile(targetId);
      return { success: true };
    } catch (err) {
      console.error("Link profile failed:", err);
      return { success: false, error: err.message };
    }
  };

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

    // Trigger cloud sync in background
    triggerCloudSync(currentProfileId);
  }, [currentProfileId]);

  // Automatic silent polling in background for real-time syncing
  useEffect(() => {
    if (!currentProfileId || !profile || !profile.syncCode) return;

    const interval = setInterval(() => {
      triggerCloudSync(currentProfileId, true);
    }, 10000);

    return () => clearInterval(interval);
  }, [currentProfileId, profile?.syncCode]);

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
    const nextProfile = { ...updatedProfile, setupCompleted: true, lastUpdated: Date.now() };
    setProfile(nextProfile);
    saveProfile(nextProfile);
    setShowSetup(false);
    triggerCloudUpload(nextProfile, logs, groceries, dietPlan);
  };

  const handleLogsUpdate = (updatedLogs) => {
    setLogs(updatedLogs);
    saveLogs(updatedLogs);
    if (profile) {
      const nextProfile = { ...profile, lastUpdated: Date.now() };
      setProfile(nextProfile);
      saveProfile(nextProfile);
      triggerCloudUpload(nextProfile, updatedLogs, groceries, dietPlan);
    }
  };

  const handleGroceriesUpdate = (updatedGroceries) => {
    setGroceries(updatedGroceries);
    saveGroceries(updatedGroceries);
    if (profile) {
      const nextProfile = { ...profile, lastUpdated: Date.now() };
      setProfile(nextProfile);
      saveProfile(nextProfile);
      triggerCloudUpload(nextProfile, logs, updatedGroceries, dietPlan);
    }
  };

  const handleDietPlanUpdate = (updatedPlan) => {
    setDietPlan(updatedPlan);
    saveDietPlan(updatedPlan);
    if (profile) {
      const nextProfile = { ...profile, lastUpdated: Date.now() };
      setProfile(nextProfile);
      saveProfile(nextProfile);
      triggerCloudUpload(nextProfile, logs, groceries, updatedPlan);
    }
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
    return <Login onSelectProfile={handleSelectProfile} onLinkProfile={handleLinkProfile} />;
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
        {profile && profile.syncCode && (
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
            {syncStatus === 'synced' && (
              <>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'hsl(var(--emerald))', boxShadow: '0 0 6px hsl(var(--emerald))' }} />
                <span>Cloud Synced</span>
              </>
            )}
            {syncStatus === 'syncing' && (
              <>
                <span style={{ 
                  width: '8px', 
                  height: '8px', 
                  border: '1.5px solid hsl(var(--cyan) / 30%)', 
                  borderTopColor: 'hsl(var(--cyan))', 
                  borderRadius: '50%', 
                  animation: 'spin 1s linear infinite', 
                  display: 'inline-block' 
                }} />
                <span>Syncing...</span>
              </>
            )}
            {syncStatus === 'error' && (
              <>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'hsl(var(--rose))', boxShadow: '0 0 6px hsl(var(--rose))' }} />
                <span>Sync Offline</span>
              </>
            )}
          </div>
        )}

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
            onManualSync={() => triggerCloudSync()}
            syncStatus={syncStatus}
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

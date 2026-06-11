import React, { useState, useEffect } from 'react';
import { Heart, Plus, Trash2 } from 'lucide-react';
import { getProfilesList, createProfile, deleteProfile } from '../utils/db';

export default function Login({ onSelectProfile }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchProfiles = async () => {
      setLoading(true);
      try {
        const list = await getProfilesList();
        if (isMounted) {
          setProfiles(list);
        }
      } catch (err) {
        console.error("Failed to load profiles:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    fetchProfiles();
    return () => { isMounted = false; };
  }, []);

  const handleAddProfile = async (e) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    setLoading(true);
    try {
      const newProfile = await createProfile(newProfileName.trim());
      const updatedList = await getProfilesList();
      setProfiles(updatedList);
      setNewProfileName('');
      setShowAddForm(false);
      onSelectProfile(newProfile.id);
    } catch (err) {
      console.error("Failed to add profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProfile = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this profile and all its data?')) {
      setLoading(true);
      try {
        await deleteProfile(id);
        const updatedList = await getProfilesList();
        setProfiles(updatedList);
      } catch (err) {
        console.error("Failed to delete profile:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="login-container">
      <div className="glass-panel login-card">
        <div className="login-header">
          <div className="brand-icon-wrapper">
            <Heart size={36} color="hsl(var(--emerald))" className="pulse-slow" />
          </div>
          <h1 className="login-title">AuraDiet Coach</h1>
          <p className="login-subtitle">Choose a profile to access your personalized AI diet assistant</p>
        </div>

        {loading && profiles.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', margin: '2rem 0' }}>
            <div className="spinner"></div>
          </div>
        ) : (
          <div className="profiles-grid">
            {profiles.map((p) => {
              return (
                <div 
                  key={p.id} 
                  className="profile-login-card"
                  onClick={() => onSelectProfile(p.id)}
                  style={{ position: 'relative' }}
                >
                  <button
                    onClick={(e) => handleDeleteProfile(e, p.id)}
                    style={{
                      position: 'absolute',
                      top: '0.5rem',
                      right: '0.5rem',
                      background: 'hsl(var(--bg-dark) / 80%)',
                      border: '1px solid hsl(var(--border-light))',
                      color: 'hsl(var(--rose))',
                      cursor: 'pointer',
                      padding: '0.35rem',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 10,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                    }}
                    title="Delete Profile"
                  >
                    <Trash2 size={12} />
                  </button>
                  <div 
                    className="profile-avatar"
                    style={{ background: p.avatarColor || 'hsl(var(--emerald))', overflow: 'hidden' }}
                  >
                    <img 
                      src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(p.name)}`} 
                      alt={p.name} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <span className="profile-name">{p.name}</span>
                  <span className="profile-role">Active Member</span>
                </div>
              );
            })}

            {/* Card: Add Member */}
            {!showAddForm && (
              <div 
                className="profile-login-card add-profile-card"
                onClick={() => setShowAddForm(true)}
              >
                <div className="profile-avatar add-avatar">
                  <Plus size={24} />
                </div>
                <span className="profile-name" style={{ color: 'hsl(var(--text-secondary))' }}>Add Member</span>
                <span className="profile-role">New Profile</span>
              </div>
            )}

            {/* Form: Add Member Form */}
            {showAddForm && (
              <div className="profile-login-card add-profile-form-card">
                <form onSubmit={handleAddProfile} style={{ width: '100%' }}>
                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Enter name"
                      value={newProfileName}
                      onChange={(e) => setNewProfileName(e.target.value)}
                      autoFocus
                      required
                      style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="submit" className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', flexGrow: 1 }}>
                      Create
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={() => setShowAddForm(false)}
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Heart, Plus } from 'lucide-react';
import { getProfilesList, createProfile } from '../utils/db';

export default function Login({ onSelectProfile }) {
  const [profiles, setProfiles] = useState(() => getProfilesList());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');

  const handleAddProfile = (e) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    const newProfile = createProfile(newProfileName.trim());
    setProfiles(getProfilesList());
    setNewProfileName('');
    setShowAddForm(false);
    onSelectProfile(newProfile.id);
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

        <div className="profiles-grid">
          {profiles.map((p) => {
            const initials = p.name ? p.name.substring(0, 2).toUpperCase() : '?';
            return (
              <div 
                key={p.id} 
                className="profile-login-card"
                onClick={() => onSelectProfile(p.id)}
              >
                <div 
                  className="profile-avatar"
                  style={{ background: p.avatarColor || 'hsl(var(--emerald))' }}
                >
                  {initials}
                </div>
                <span className="profile-name">{p.name}</span>
                <span className="profile-role">Active Member</span>
              </div>
            );
          })}

          {!showAddForm ? (
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
          ) : (
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
      </div>
    </div>
  );
}

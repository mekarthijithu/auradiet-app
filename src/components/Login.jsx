import React, { useState } from 'react';
import { Heart, Plus, Trash2, CloudDownload } from 'lucide-react';
import { getProfilesList, createProfile, deleteProfile } from '../utils/db';

export default function Login({ onSelectProfile, onLinkProfile }) {
  const [profiles, setProfiles] = useState(() => getProfilesList());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [syncCodeInput, setSyncCodeInput] = useState('');
  const [linkError, setLinkError] = useState('');
  const [linking, setLinking] = useState(false);

  const handleLinkProfileSubmit = async (e) => {
    e.preventDefault();
    if (!syncCodeInput.trim()) return;
    setLinking(true);
    setLinkError('');
    
    const result = await onLinkProfile(syncCodeInput.trim());
    setLinking(false);
    if (result.success) {
      setSyncCodeInput('');
      setShowLinkForm(false);
    } else {
      setLinkError(result.error || "Profile not found or connection failed.");
    }
  };

  const handleAddProfile = (e) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    const newProfile = createProfile(newProfileName.trim());
    setProfiles(getProfilesList());
    setNewProfileName('');
    setShowAddForm(false);
    onSelectProfile(newProfile.id);
  };

  const handleDeleteProfile = (e, id) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this profile and all its data?')) {
      deleteProfile(id);
      setProfiles(getProfilesList());
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

        <div className="profiles-grid">
          {profiles.map((p) => {
            return (
              <div 
                key={p.id} 
                className="profile-login-card"
                onClick={() => onSelectProfile(p.id)}
                style={{ position: 'relative' }}
              >
                {p.id !== 'jithu' && (
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
                )}
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

          {/* Card 1: Add Member */}
          {!showAddForm && !showLinkForm && (
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

          {/* Form 1: Add Member Form */}
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

          {/* Card 2: Link Profile */}
          {!showLinkForm && !showAddForm && (
            <div 
              className="profile-login-card add-profile-card"
              onClick={() => {
                setShowLinkForm(true);
                setLinkError('');
              }}
              style={{ borderColor: 'hsl(var(--cyan) / 30%)' }}
            >
              <div className="profile-avatar add-avatar" style={{ color: 'hsl(var(--cyan))', borderColor: 'hsl(var(--cyan) / 30%)' }}>
                <CloudDownload size={24} />
              </div>
              <span className="profile-name" style={{ color: 'hsl(var(--text-secondary))' }}>Link Profile</span>
              <span className="profile-role">Sync Existing</span>
            </div>
          )}

          {/* Form 2: Link Profile Form */}
          {showLinkForm && (
            <div className="profile-login-card add-profile-form-card" style={{ gridColumn: 'span 1', width: '100%', minWidth: '220px' }}>
              <form onSubmit={handleLinkProfileSubmit} style={{ width: '100%' }}>
                <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Paste 32-char sync code"
                    value={syncCodeInput}
                    onChange={(e) => setSyncCodeInput(e.target.value)}
                    autoFocus
                    required
                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', fontFamily: 'monospace' }}
                  />
                </div>
                {linkError && (
                  <div style={{ color: 'hsl(var(--rose))', fontSize: '0.75rem', marginBottom: '0.5rem', textAlign: 'left', lineHeight: '1.3' }}>
                    {linkError}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    disabled={linking}
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                  >
                    {linking ? (
                      <>
                        <span className="spinner" style={{ width: '10px', height: '10px', borderWidth: '1.5px' }} />
                        Linking...
                      </>
                    ) : 'Link & Sync'}
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => {
                      setShowLinkForm(false);
                      setSyncCodeInput('');
                      setLinkError('');
                    }}
                    disabled={linking}
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

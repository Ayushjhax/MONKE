'use client';
import React, { useState } from 'react';

export function JoinGroupModal({ open, onClose, onSubmit, tierType }: { open: boolean; onClose: () => void; onSubmit: (pledgeUnits?: number) => void; tierType: 'by_count' | 'by_volume' }) {
  const [pledge, setPledge] = useState('1');
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', padding: 16, borderRadius: 8, width: 320 }}>
        <h3>Join Group</h3>
        {tierType === 'by_volume' ? (
          <div>
            <label>Pledge units</label>
            <input type="number" step="0.01" value={pledge} onChange={e => setPledge(e.target.value)} style={{ width: '100%' }} />
          </div>
        ) : (
          <div>Joining with 1 unit</div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={() => onSubmit(tierType === 'by_volume' ? Number(pledge || '1') : undefined)}>Join</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}



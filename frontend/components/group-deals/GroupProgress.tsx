'use client';
import React, { useMemo } from 'react';

export function GroupProgress({ progress, nextThreshold }: { progress: { participants_count: number; total_pledged: number; current_tier_rank: number; current_discount_percent: number; time_left_seconds: number }; nextThreshold?: number }) {
  const pct = useMemo(() => {
    if (!nextThreshold) return 100;
    const basis = Math.max(1, nextThreshold);
    return Math.min(100, Math.round((progress.participants_count / basis) * 100));
  }, [progress, nextThreshold]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>{progress.current_discount_percent}%</div>
        <div>{progress.time_left_seconds}s left</div>
      </div>
      <div style={{ height: 10, background: '#eee', borderRadius: 6, overflow: 'hidden', marginTop: 8 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: '#4caf50' }} />
      </div>
    </div>
  );
}



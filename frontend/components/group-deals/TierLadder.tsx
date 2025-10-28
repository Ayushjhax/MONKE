'use client';
import React from 'react';

export function TierLadder({ tiers, currentRank }: { tiers: any[]; currentRank: number }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {tiers.sort((a: any, b: any) => a.rank - b.rank).map((t: any) => (
        <div key={t.id} style={{ padding: 8, borderRadius: 6, border: '1px solid #eee', background: t.rank <= currentRank ? '#e6ffed' : '#fafafa' }}>
          <div>Rank {t.rank}</div>
          <div>{t.discount_percent}%</div>
          <div>≥ {t.threshold}</div>
        </div>
      ))}
    </div>
  );
}



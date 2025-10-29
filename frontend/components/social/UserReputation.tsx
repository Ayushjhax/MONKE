'use client';

import { useEffect, useState } from 'react';
import { UserSocialProfile, REPUTATION_LEVELS } from '@/lib/social-types';
import { getReputationProgress } from '@/lib/social-helpers';

interface UserReputationProps {
  userWallet: string;
  compact?: boolean;
}

export default function UserReputation({ userWallet, compact = false }: UserReputationProps) {
  const [profile, setProfile] = useState<UserSocialProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, [userWallet]);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`/api/social/profile?userWallet=${userWallet}`);
      const data = await response.json();
      if (response.ok) {
        setProfile(data.profile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="animate-pulse bg-gray-200 h-8 w-32 rounded"></div>;
  }

  if (!profile) {
    return null;
  }

  const progress = getReputationProgress(profile.reputation_points);
  const levelColor = REPUTATION_LEVELS[progress.currentLevel].color;

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2">
        <span
          className="px-2 py-1 rounded-full text-xs font-semibold text-white"
          style={{ backgroundColor: levelColor }}
        >
          {progress.currentLevel}
        </span>
        <span className="text-sm text-gray-600">
          {profile.reputation_points} pts
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Level */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold" style={{ color: levelColor }}>
            {progress.currentLevel}
          </h3>
          <p className="text-sm text-gray-600">
            {profile.reputation_points} reputation points
          </p>
        </div>
        
        {/* Badges */}
        {profile.badges && profile.badges.length > 0 && (
          <div className="flex gap-1">
            {profile.badges.slice(0, 3).map((badge) => (
              <span
                key={badge.id}
                className="text-2xl"
                title={`${badge.name}: ${badge.description}`}
              >
                {badge.icon}
              </span>
            ))}
            {profile.badges.length > 3 && (
              <span className="text-sm text-gray-500">
                +{profile.badges.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {progress.nextLevel && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              Progress to {progress.nextLevel}
            </span>
            <span className="font-medium text-gray-900">
              {progress.pointsToNext} points to go
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{
                width: `${progress.progressPercent}%`,
                backgroundColor: levelColor
              }}
            />
          </div>
        </div>
      )}

      {/* All Badges */}
      {profile.badges && profile.badges.length > 0 && (
        <div className="pt-4 border-t">
          <h4 className="text-sm font-semibold mb-3 text-gray-900">Badges Earned</h4>
          <div className="grid grid-cols-2 gap-3">
            {profile.badges.map((badge) => (
              <div
                key={badge.id}
                className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
              >
                <span className="text-2xl">{badge.icon}</span>
                <div>
                  <div className="text-sm font-medium text-gray-900">{badge.name}</div>
                  <div className="text-xs text-gray-600">{badge.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


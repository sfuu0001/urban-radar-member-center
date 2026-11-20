import React, { useState } from 'react';
import { ProfilePageView } from './components/ProfilePageView';
import { UserProfileEditView } from './components/user/UserProfileEditView';
import { ToastProvider } from './components/ui/ToastContext';
import { INITIAL_USER_PROFILE } from './data/mockUser';
import { syncUserProfileToCloud } from './utils/cloudbase';
import { safeGetStorage, safeSetStorage } from './utils/safeStorage';
import type { UserProfile } from './types';

const PROFILE_KEY = 'obsidian_user_profile';

/**
 * 演示宿主：同时挂载「我的」（ProfilePageView）与「资料设置」（UserProfileEditView）。
 * 顶部切换条只属于本演示壳，两个界面组件本身零改动。
 */
export default function App() {
  const [view, setView] = useState<'profile' | 'edit'>('profile');
  const [userProfile, setUserProfile] = useState<UserProfile>(() =>
    safeGetStorage<UserProfile>(PROFILE_KEY, INITIAL_USER_PROFILE)
  );

  const handleProfileUpdated = (updated: UserProfile) => {
    setUserProfile(updated);
    safeSetStorage(PROFILE_KEY, updated);
    void syncUserProfileToCloud(updated);
  };

  return (
    <div className="min-h-screen w-full bg-[#e8e6e1] flex flex-col items-center">
      {/* 演示壳的切换条（非界面本体） */}
      <div className="w-full max-w-[430px] flex items-center justify-center gap-2 py-3 bg-white border-b border-black/[0.06] sticky top-0 z-50">
        {(
          [
            ['profile', '我的 · 会员特权与黑卡中心'],
            ['edit', '资料设置 · 会员资料与参数控制台']
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
              view === key
                ? 'bg-neutral-900 text-white shadow-sm'
                : 'bg-black/[0.04] text-neutral-600 hover:bg-black/[0.07]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 手机视口容器：两个界面均按 430 宽度移动端设计 */}
      <div className="w-full max-w-[430px] min-h-screen bg-white shadow-[0_0_60px_rgba(0,0,0,0.08)] relative">
        {view === 'profile' ? (
          <ProfilePageView
            userProfile={userProfile}
            onProfileUpdated={handleProfileUpdated}
            onGoToMenu={() => setView('profile')}
            onOpenAddress={() => setView('edit')}
          />
        ) : (
          <UserProfileEditView
            userProfile={userProfile}
            onProfileUpdated={handleProfileUpdated}
            onBack={() => setView('profile')}
          />
        )}
      </div>
    </div>
  );
}

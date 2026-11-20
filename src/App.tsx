import React, { useState } from 'react';
import { ProfilePageView } from './components/ProfilePageView';
import { UserProfileEditView } from './components/user/UserProfileEditView';
import { ViewSwitcherDropdown } from './components/ui/ViewSwitcherDropdown';
import { useToast } from './components/ui/ToastContext';
import { INITIAL_USER_PROFILE } from './data/mockUser';
import { syncUserProfileToCloud } from './utils/cloudbase';
import { safeGetStorage, safeSetStorage } from './utils/safeStorage';
import type { UserProfile } from './types';

const PROFILE_KEY = 'obsidian_user_profile';

const VIEW_OPTIONS = [
  {
    value: 'profile',
    label: '我的 · 会员特权与黑卡中心',
    description: '黑卡权益、同桌身份码、卡券包与安全中心'
  },
  {
    value: 'edit',
    label: '资料设置 · 会员资料与参数控制台',
    description: '基本资料、就餐偏好、常用地址、安全凭据与对账'
  }
] as const;

type EditTab = 'profile' | 'addresses' | 'preferences' | 'wallet' | 'security' | 'finance';

/**
 * 演示宿主：同时挂载「我的」（ProfilePageView）与「资料设置」（UserProfileEditView）。
 * 顶部下拉切换器与内页跳转联动保持同步。
 */
export default function App() {
  const toast = useToast();
  const [view, setView] = useState<'profile' | 'edit'>('profile');
  const [editInitialTab, setEditInitialTab] = useState<EditTab>('profile');
  const [userProfile, setUserProfile] = useState<UserProfile>(() =>
    safeGetStorage<UserProfile>(PROFILE_KEY, INITIAL_USER_PROFILE)
  );

  const handleProfileUpdated = (updated: UserProfile) => {
    setUserProfile(updated);
    safeSetStorage(PROFILE_KEY, updated);
    void syncUserProfileToCloud(updated);
  };

  const handleOpenEditTab = (tab: EditTab = 'profile') => {
    setEditInitialTab(tab);
    setView('edit');
  };

  return (
    <div className="min-h-screen w-full bg-[#e8e6e1] flex flex-col items-center">
      {/* 演示壳的下拉切换组件（非界面本体） */}
      <div className="w-full max-w-[430px] px-3.5 py-2 bg-white border-b border-black/[0.06] sticky top-0 z-50">
        <ViewSwitcherDropdown
          value={view}
          options={VIEW_OPTIONS}
          onChange={(nextView) => {
            if (nextView === 'edit') setEditInitialTab('profile');
            setView(nextView);
          }}
        />
      </div>

      {/* 手机视口容器：两个界面均按 430 宽度移动端设计 */}
      <div className="w-full max-w-[430px] min-h-screen bg-[#f5f5f3] shadow-[0_0_60px_rgba(0,0,0,0.08)] relative">
        {view === 'profile' ? (
          <ProfilePageView
            userProfile={userProfile}
            onProfileUpdated={handleProfileUpdated}
            onGoToMenu={() => toast.info('当前已处于演示主视图', '可使用顶部下拉器切换「资料设置」')}
            onOpenAddress={() => handleOpenEditTab('addresses')}
            onOpenEditTab={handleOpenEditTab}
          />
        ) : (
          <UserProfileEditView
            userProfile={userProfile}
            onProfileUpdated={handleProfileUpdated}
            onBack={() => setView('profile')}
            initialTab={editInitialTab}
            headerStickyClass="sticky top-[53px] z-30"
          />
        )}
      </div>
    </div>
  );
}

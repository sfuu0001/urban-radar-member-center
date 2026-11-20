import React, { useState } from 'react';
import { ProfilePageView } from './components/ProfilePageView';
import { UserProfileEditView } from './components/user/UserProfileEditView';
import { CouponsCenterView } from './components/CouponsCenterView';
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
  },
  {
    value: 'coupons',
    label: '礼券中心 · 我的优惠券包',
    description: '黑卡礼券资产、口令兑换与官方领券中心'
  }
] as const;

type EditTab = 'profile' | 'addresses' | 'preferences' | 'wallet' | 'security' | 'finance';

/**
 * 演示宿主：挂载「我的」（ProfilePageView）、「资料设置」（UserProfileEditView）与「我的优惠券包」（CouponsCenterView）。
 * 顶部下拉切换器与内页跳转联动保持同步。
 */
export default function App() {
  const toast = useToast();
  const [view, setView] = useState<'profile' | 'edit' | 'coupons'>('profile');
  const [editInitialTab, setEditInitialTab] = useState<EditTab>('profile');
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const cached = safeGetStorage<UserProfile>(PROFILE_KEY, INITIAL_USER_PROFILE);
    if (cached?.avatar === '/img/bf32727d20d1.webp') {
      const migrated = { ...cached, avatar: INITIAL_USER_PROFILE.avatar };
      safeSetStorage(PROFILE_KEY, migrated);
      return migrated;
    }
    return cached;
  });

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
    <div className="min-h-screen w-full bg-[#eae7e1] flex flex-col items-center sm:py-3">
      <div className="w-full max-w-[430px] min-h-screen sm:min-h-[calc(100vh-24px)] bg-[#f5f4f0] sm:rounded-[28px] sm:border sm:border-black/[0.08] sm:shadow-[0_24px_64px_-24px_rgba(20,20,19,0.22)] relative overflow-x-clip">
        {/* 演示壳视图切换栏（非吸顶，释放首屏与吸顶预算） */}
        <div className="w-full px-3.5 py-2 bg-[#f9f8f5] border-b border-black/[0.06] relative z-40">
          <ViewSwitcherDropdown
            value={view}
            options={VIEW_OPTIONS}
            onChange={(nextView) => {
              if (nextView === 'edit') setEditInitialTab('profile');
              setView(nextView);
            }}
          />
        </div>

        {/* 手机视口主内容区 */}
        <div>
          {view === 'profile' ? (
            <ProfilePageView
              userProfile={userProfile}
              onProfileUpdated={handleProfileUpdated}
              onGoToMenu={() => toast.info('当前已处于演示主视图', '可使用顶部下拉器切换「资料设置」或「礼券中心」')}
              onOpenAddress={() => handleOpenEditTab('addresses')}
              onOpenEditTab={handleOpenEditTab}
              onOpenCoupons={() => setView('coupons')}
              headerStickyClass="sticky top-0 z-30"
            />
          ) : view === 'edit' ? (
            <UserProfileEditView
              userProfile={userProfile}
              onProfileUpdated={handleProfileUpdated}
              onBack={() => setView('profile')}
              initialTab={editInitialTab}
              headerStickyClass="sticky top-0 z-30"
            />
          ) : (
            <CouponsCenterView
              onBack={() => setView('profile')}
              onGoToMenu={() => {
                setView('profile');
                toast.info('优惠券已选定', '下单结算时将自动为您抵扣最优金额');
              }}
              isVIPActive={userProfile.isVIPActive ?? true}
              headerStickyClass="sticky top-0 z-30"
            />
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useRef, useMemo } from 'react';
import {
  Zap,
  Truck,
  Headset,
  Gift,
  User,
  CreditCard,
  Shield,
  ChevronRight,
  LogOut,
  Sparkles,
  CheckCircle2,
  Lock,
  X,
  Ticket,
  Cloud,
  KeyRound,
  UserCheck,
  QrCode,
  RotateCw
} from 'lucide-react';
import { UserCouponsModal } from './UserCouponsModal';
import { UserProfileEditView } from './user/UserProfileEditView';
import { UserAuthModal } from './user/UserAuthModal';
import { INITIAL_USER_PROFILE } from '../data/mockUser';
import { UserProfile, Order } from '../types';
import { safeGetStorage, safeSetStorage } from '../utils/safeStorage';
import { getUserCouponRecords } from '../utils/couponEngine';
import { useDevSimulation } from '../context/DevSimulationContext';
import { useToast } from './ui/ToastContext';
import { ACTIVE_BUILD_VERSION, manualForceCloudPurgeAndReload } from '../utils/versionPurgeGateway';
import { purgeUserSessionAndLogout } from '../utils/cloudUserSync';
import { OrganicCardReveal } from '../utils/useCardScrollReveal';
import { DeviceIdentityCard } from './DeviceIdentityCard';
import { TCB_CLOUD_ENABLED, syncUserProfileToCloud } from '../utils/cloudbase';
import { UnifiedPageHeader } from './ui/UnifiedPageHeader';

interface ProfilePageViewProps {
  onOpenRadar?: () => void;
  onOpenVIP?: () => void;
  onOpenAddress?: () => void;
  onOpenEditTab?: (tab: 'profile' | 'addresses' | 'preferences' | 'wallet' | 'security' | 'finance') => void;
  onGoToMenu?: () => void;
  onOpenCoupons?: () => void;
  onOpenCloudSync?: () => void;
  currentAddress?: string;
  isVIPActive?: boolean;
  userProfile?: UserProfile;
  onProfileUpdated?: (updated: UserProfile) => void;
  orders?: Order[];
  onOrdersUpdated?: (orders: Order[]) => void;
}

export const ProfilePageView: React.FC<ProfilePageViewProps> = ({
  onOpenRadar,
  onOpenVIP,
  onOpenAddress,
  onOpenEditTab,
  onGoToMenu,
  onOpenCoupons,
  onOpenCloudSync,
  currentAddress = '静安大悦城北座 1F 中庭',
  isVIPActive = true,
  userProfile = INITIAL_USER_PROFILE,
  onProfileUpdated,
  orders = [],
  onOrdersUpdated
}) => {
  const toast = useToast();
  const [activeModal, setActiveModal] = useState<'payment' | 'security' | null>(null);
  const [isCouponsOpen, setIsCouponsOpen] = useState(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [profileEditTab, setProfileEditTab] = useState<'profile' | 'addresses' | 'preferences' | 'wallet'>('profile');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'sms' | 'password' | 'register' | 'auto' | 'presets' | 'login'>('sms');
  const [isSignedOut, setIsSignedOut] = useState(false);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [avatarImgError, setAvatarImgError] = useState(false);

  React.useEffect(() => {
    setAvatarImgError(false);
  }, [userProfile.avatar]);

  const navigateToEditTab = (tab: 'profile' | 'addresses' | 'preferences' | 'wallet' | 'security' | 'finance') => {
    if (onOpenEditTab) {
      onOpenEditTab(tab);
      return;
    }
    if (tab === 'addresses' || tab === 'preferences' || tab === 'wallet' || tab === 'profile') {
      setProfileEditTab(tab);
    } else {
      setProfileEditTab('profile');
    }
    setIsProfileEditOpen(true);
  };

  // Notification toggle state
  const [isNotificationOn, setIsNotificationOn] = useState<boolean>(() =>
    safeGetStorage<boolean>('obsidian_member_notification_on', true)
  );
  const [isHeaderRefreshing, setIsHeaderRefreshing] = useState(false);

  const toggleMemberNotification = () => {
    setIsNotificationOn((prev) => {
      const next = !prev;
      safeSetStorage('obsidian_member_notification_on', next);
      showToast(next ? '会员通知已开启：订单与黑卡特权动态将实时提醒' : '会员通知已关闭：将不再接收实时推送');
      return next;
    });
  };

  const handleHeaderRefresh = async () => {
    if (isHeaderRefreshing) return;
    setIsHeaderRefreshing(true);
    try {
      const res = await syncUserProfileToCloud(userProfile);
      if (onProfileUpdated && res?.profile) {
        onProfileUpdated(res.profile);
      }
      toast.success('会员状态已刷新', '会员档案、积分与卡券数据已同步');
    } catch {
      toast.info('本地档案已校验', '当前为本地演示模式，会员数据已刷新');
    } finally {
      setTimeout(() => setIsHeaderRefreshing(false), 350);
    }
  };

  const { isAdminDeveloper, openDevControlCenter, openDevAuthModal } = useDevSimulation();

  // Read active coupons count
  const availableCouponsCount = useMemo(() => {
    const list = getUserCouponRecords();
    return list.filter((c) => c.status === 'available').length;
  }, [isCouponsOpen]);

  // 3D Parallax Tilt & Holographic Glare Calculations
  const cardWrapperRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isActiveTilt, setIsActiveTilt] = useState(false);

  const updateTiltAndGlare = (clientX: number, clientY: number) => {
    if (!cardWrapperRef.current) return;
    const rect = cardWrapperRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const clampedX = Math.max(0, Math.min(x, rect.width));
    const clampedY = Math.max(0, Math.min(y, rect.height));

    const percentX = (clampedX / rect.width) * 2 - 1;
    const percentY = (clampedY / rect.height) * 2 - 1;

    const tiltX = -percentY * 8;
    const tiltY = percentX * 8;
    setTilt({ x: tiltX, y: tiltY });

    const glarePercentX = ((clampedX / rect.width) * 100).toFixed(1) + '%';
    const glarePercentY = ((clampedY / rect.height) * 100).toFixed(1) + '%';

    cardWrapperRef.current.style.setProperty('--glare-x', glarePercentX);
    cardWrapperRef.current.style.setProperty('--glare-y', glarePercentY);
  };

  const resetTiltAndGlare = () => {
    setTilt({ x: 0, y: 0 });
    setIsActiveTilt(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsActiveTilt(true);
    updateTiltAndGlare(e.clientX, e.clientY);
  };

  const handleMouseLeave = () => {
    resetTiltAndGlare();
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setIsActiveTilt(true);
    if (e.touches && e.touches[0]) {
      updateTiltAndGlare(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches && e.touches[0]) {
      updateTiltAndGlare(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchEnd = () => {
    setTimeout(resetTiltAndGlare, 300);
  };

  const toggleCardFlip = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setIsCardFlipped((prev) => !prev);
  };

  const showToast = (msg: string) => {
    toast.info(msg);
  };

  const handlePerkClick = (perkName: string) => {
    if (onOpenVIP) {
      onOpenVIP();
    } else {
      toast.success(`已激活黑卡特权: ${perkName}`);
    }
  };

  const handleSignOut = async () => {
    await purgeUserSessionAndLogout();
    setIsSignedOut(true);
    toast.info('已安全退出登录', '已清空本地用户文件与凭据残留，切换至纯净访客模式');
    if (onProfileUpdated) {
      onProfileUpdated({
        uid: 'guest',
        nickname: '访客食客',
        phone: '',
        membershipTier: 'standard',
        points: 0,
        balance: 0,
        couponsCount: 0,
        addresses: [],
        favoriteDishIds: []
      } as any);
    }
  };

  const handleOpenAuth = (mode: 'sms' | 'password' | 'register' | 'auto' | 'presets' | 'login' = 'sms') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  /* 【2026-11-20】访客态 UID 兜底：uid 为占位字符串 'guest' 时，
     原写法 slice(-4) 会截出 "uest"，页面上出现「UID: uest」这种断头文案。
     统一在源头判定，三处尾号展示全部走这里。 */
  const isGuestIdentity = isSignedOut || !userProfile.uid || String(userProfile.uid) === 'guest';
  const uidTail4 = isGuestIdentity ? '7F72' : String(userProfile.uid).slice(-4).toUpperCase();
  const uidTail6 = isGuestIdentity ? '7F72E5' : String(userProfile.uid).slice(-6).toUpperCase();

  // If user opened embedded profile/settings page
  if (isProfileEditOpen) {
    return (
      <div className="w-full min-h-screen bg-[#f4f4f2] text-[#1a1a17] flex flex-col font-sans select-none animate-in fade-in duration-normal">
        <UserProfileEditView
          userProfile={userProfile}
          onProfileUpdated={(updated) => {
            if (onProfileUpdated) onProfileUpdated(updated);
          }}
          onBack={() => setIsProfileEditOpen(false)}
          initialTab={profileEditTab}
        />
      </div>
    );
  }

  const isAvatarUrl = Boolean(
    userProfile.avatar &&
      !isSignedOut &&
      /^(https?:|\/|data:)/.test(userProfile.avatar) &&
      !avatarImgError
  );
  const avatarFallbackText =
    !isSignedOut && userProfile.avatar && !/^(https?:|\/|data:)/.test(userProfile.avatar)
      ? userProfile.avatar
      : isSignedOut
        ? '访'
        : (userProfile.nickname || 'U').trim().slice(0, 1).toUpperCase();

  return (
    <div className="w-full min-h-screen bg-[#f5f5f3] text-[#0f172a] pb-10 select-none font-sans">
      {/* BEGIN: Unified HeaderSection */}
      <UnifiedPageHeader
        title="会员中心"
        onBack={onGoToMenu}
        backLabel="返回点餐"
        statusTone={isGuestIdentity ? 'offline' : 'online'}
        statusTitle={
          isGuestIdentity
            ? '访客模式（未登录）'
            : TCB_CLOUD_ENABLED
              ? '云端会员服务在线'
              : '会员服务就绪'
        }
        primaryActive={!isGuestIdentity}
        onPrimaryClick={() => {
          if (onOpenRadar) {
            onOpenRadar();
          } else {
            navigateToEditTab('profile');
          }
        }}
        primaryTitle={onOpenRadar ? '餐车雷达追踪' : '资料设置与参数控制台'}
        isRefreshing={isHeaderRefreshing}
        onRefreshClick={handleHeaderRefresh}
        refreshTitle="刷新会员档案与权益"
        notificationOn={isNotificationOn}
        onNotificationClick={toggleMemberNotification}
      />
      {/* END: Unified HeaderSection */}

      {/* Main Container */}
      <div className="w-full max-w-5xl mx-auto min-h-screen px-3.5 sm:px-6 pt-3.5 pb-16 flex flex-col gap-3.5">

        {/* BEGIN: UserProfileBar */}
        <OrganicCardReveal className="w-full">
          <section className="bg-white rounded-2xl p-3.5 border border-black/[0.06] shadow-[0_2px_10px_-6px_rgba(15,23,42,0.08)] flex items-center justify-between gap-2.5" data-purpose="user-profile-summary">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Avatar with verified check badge */}
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 rounded-full overflow-hidden border border-black/[0.07] bg-neutral-100 flex items-center justify-center">
                {isAvatarUrl ? (
                  <img
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    src={userProfile.avatar}
                    alt={userProfile.nickname}
                    onError={() => setAvatarImgError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-bold text-neutral-700 leading-none">
                    {avatarFallbackText}
                  </span>
                )}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-white ring-2 ring-white">
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
                </svg>
              </span>
            </div>

            {/* User Meta Info */}
            <div className="flex flex-col leading-tight min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-sm font-extrabold text-[#0f172a] tracking-tight truncate">
                  {isSignedOut ? '访客食客 (未登录)' : userProfile.nickname || '黑曜石先锋食客 #7F72E5'}
                </span>
                <span className="text-[11px] whitespace-nowrap shrink-0 text-neutral-400 font-medium tabular-nums">
                  · UID {isGuestIdentity ? 'GUEST' : uidTail4}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-1 min-w-0">
                <span className="font-medium whitespace-nowrap tabular-nums">
                  {isSignedOut ? '未绑定手机号' : userProfile.phone || '138-0000-6357'}
                </span>
                <span className="text-neutral-300 shrink-0">·</span>
                {TCB_CLOUD_ENABLED ? (
                  <span className="inline-flex items-center gap-0.5 text-emerald-700 font-medium min-w-0">
                    <Cloud className="w-3 h-3 shrink-0" />
                    <span className="truncate">云端已同步</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-neutral-400 font-medium min-w-0">
                    <Cloud className="w-3 h-3 shrink-0" />
                    <span className="truncate">本地演示模式</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Balance and Switch */}
          <div className="flex items-center gap-2.5 pl-2.5 border-l border-black/[0.06] flex-shrink-0">
            <div className="text-right">
              <div className="text-base font-black text-[#0f172a] leading-none tabular-nums">
                ¥{isSignedOut ? '0.00' : userProfile.balance.toFixed(2)}
              </div>
              <div className="text-[10px] text-neutral-400 mt-1">账户余额</div>
            </div>
            <button
              type="button"
              onClick={() => handleOpenAuth('presets')}
              className="h-9 inline-flex items-center gap-1 px-2.5 bg-neutral-100 hover:bg-neutral-200/70 rounded-xl text-[#0f172a] text-xs font-bold tracking-tight transition active:scale-95 cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>换号</span>
            </button>
          </div>
        </section>
        </OrganicCardReveal>
        {/* END: UserProfileBar */}

        {/* BEGIN: ObsidianVipCard */}
        <div
          ref={cardWrapperRef}
          id="vip-card-wrapper"
          data-purpose="card-wrapper"
          onClick={() => toggleCardFlip()}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`card-perspective-container cursor-pointer select-none ${isActiveTilt ? 'is-active' : ''}`}
          style={{
            transform: `rotateX(${tilt.x}deg) rotateY(${isCardFlipped ? -tilt.y : tilt.y}deg)`,
            transition: isActiveTilt ? 'transform 0.1s ease-out' : 'transform 0.4s ease-out'
          }}
        >
          <article
            id="vip-card"
            data-purpose="obsidian-vip-card"
            className={`card-flipper relative w-full min-h-[200px] rounded-xl shadow-black-card ${
              isCardFlipped ? 'is-flipped' : ''
            }`}
          >
            {/* CARD FRONT */}
            <div
              className="card-front absolute inset-0 obsidian-mesh rounded-xl p-4 text-white border border-neutral-700/70 flex flex-col justify-between select-none"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden'
              }}
            >
              <div className="glare-overlay absolute inset-0 rounded-xl pointer-events-none" />

              {/* Top Row: Microchip, Status, Flip Trigger */}
              <div className="relative z-10 flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-5 rounded-sm chip-gold p-0.5 border border-amber-300 shadow flex flex-col justify-between flex-shrink-0">
                    <div className="w-full h-0.5 bg-black/25 rounded" />
                    <div className="w-full h-0.5 bg-black/25 rounded" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] tracking-widest text-amber-300/90 uppercase font-semibold leading-tight">
                      STATUS
                    </span>
                    <span className="text-[11px] font-bold text-white tracking-tight flex items-center gap-1.5 leading-tight">
                      {isSignedOut ? 'GUEST' : 'ACTIVE'}
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSignedOut ? 'bg-neutral-400' : 'bg-emerald-400'
                        }`}
                      />
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => toggleCardFlip(e)}
                  className="flip-trigger inline-flex items-center gap-1 text-[11px] font-medium text-neutral-200 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 px-2.5 py-1 rounded-lg transition active:scale-95 cursor-pointer"
                >
                  <RotateCw className="w-3 h-3 text-amber-300" />
                  <span className="leading-none">点击翻面</span>
                </button>
              </div>

              {/* Center Row: VIP Title & Holographic Barcode */}
              <div className="relative z-10 my-1 flex flex-col items-center justify-center">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-extrabold tracking-wider text-white uppercase font-sans">
                    VIP ELITE
                  </h2>
                  <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                </div>

                <div className="mt-1.5 w-full max-w-[260px] bg-neutral-950/90 border border-neutral-700/80 rounded px-2.5 py-1.5 flex flex-col items-center justify-center">
                  <div className="h-5 w-full flex items-center justify-center gap-[3px] overflow-hidden opacity-90">
                    <div className="w-[2px] h-full bg-white" />
                    <div className="w-[3px] h-full bg-white" />
                    <div className="w-[1px] h-full bg-white" />
                    <div className="w-[4px] h-full bg-white" />
                    <div className="w-[1px] h-full bg-white" />
                    <div className="w-[2px] h-full bg-white" />
                    <div className="w-[4px] h-full bg-white" />
                    <div className="w-[1px] h-full bg-white" />
                    <div className="w-[3px] h-full bg-white" />
                    <div className="w-[1px] h-full bg-white" />
                    <div className="w-[4px] h-full bg-white" />
                    <div className="w-[2px] h-full bg-white" />
                    <div className="w-[3px] h-full bg-white" />
                    <div className="w-[1px] h-full bg-white" />
                    <div className="w-[4px] h-full bg-white" />
                    <div className="w-[2px] h-full bg-white" />
                    <div className="w-[3px] h-full bg-white" />
                    <div className="w-[1px] h-full bg-white" />
                    <div className="w-[4px] h-full bg-white" />
                    <div className="w-[2px] h-full bg-white" />
                  </div>
                  <span className="mt-1 text-[10px] tracking-widest text-neutral-300 font-bold leading-none tabular-nums">
                    VIP · {uidTail4} · E500 · 8892
                  </span>
                </div>
              </div>

              {/* Bottom Row: Points to Next Tier & Emerald Bar */}
              <div className="relative z-10 pt-1">
                <div className="flex justify-between items-end text-[10px] tracking-tight text-neutral-400 mb-1">
                  <span className="uppercase font-semibold">POINTS TO NEXT TIER</span>
                  <span className="text-neutral-300 font-medium tabular-nums">
                    <strong className="text-white font-bold">{isSignedOut ? 0 : userProfile.points || 1000}</strong> / 5,000
                  </span>
                </div>
                <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden p-[1px]">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-emerald-300 h-full rounded-full transition duration-700"
                    style={{
                      width: isSignedOut ? '0%' : `${Math.min(100, ((userProfile.points || 1000) / 5000) * 100)}%`
                    }}
                  />
                </div>
              </div>
            </div>

            {/* CARD BACK */}
            <div
              className="card-back absolute inset-0 obsidian-mesh rounded-xl p-4 text-white border border-neutral-700/70 flex flex-col justify-between select-none"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden'
              }}
            >
              <div className="glare-overlay absolute inset-0 rounded-xl pointer-events-none" />

              <div className="relative z-10 flex items-center justify-between border-b border-neutral-700/60 pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] tracking-wider text-neutral-400 uppercase font-bold">
                    BLACK OBSIDIAN PRIVILEGE
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                    L3 ACTIVE
                  </span>
                </div>

                <button
                  type="button"
                  onClick={(e) => toggleCardFlip(e)}
                  className="flip-trigger inline-flex items-center gap-1 text-[11px] font-medium text-neutral-300 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 px-2 py-1 rounded-md transition active:scale-95 cursor-pointer"
                >
                  <RotateCw className="w-3 h-3 text-amber-300" />
                  <span className="leading-none">翻回正面</span>
                </button>
              </div>

              <div className="relative z-10 flex items-center justify-between gap-3 my-1">
                <div className="flex flex-col gap-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-neutral-400">食客身份</span>
                    <span className="text-xs font-bold text-amber-400">
                      #{uidTail6}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-300 flex flex-col gap-0.5">
                    <span className="font-medium text-white">尊享黑卡权益保障</span>
                    <span className="text-[10px] text-emerald-400">全单9折 · 极速出餐免排队</span>
                  </div>
                </div>

                <div className="w-16 h-16 bg-white rounded-lg p-1.5 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <QrCode className="w-full h-full text-neutral-900" />
                </div>
              </div>

              <div className="pt-2 relative z-10 border-t border-neutral-800/80 flex items-center justify-between text-[10px] text-neutral-400">
                <div>
                  VALID THRU <span className="text-amber-300 font-bold tabular-nums">2026/12/31</span>
                </div>
                <div className="text-emerald-400 font-semibold">URBAN RADAR VIP</div>
              </div>
            </div>
          </article>
        </div>
        {/* END: ObsidianVipCard */}

        {/* BEGIN: DeviceIdentity（阶段四：本机设备码 + 人工对齐入口） */}
        <OrganicCardReveal className="w-full">
          <DeviceIdentityCard />
        </OrganicCardReveal>
        {/* END: DeviceIdentity */}

        {/* CloudAuth（账号（可选）卡片）已按需求整块移除：
            登录/注册仍可通过顶部「换号」、Account & Security 里的「注册 / 登录」进入 UserAuthModal。 */}

        {/* BEGIN: AccountAndSecurity */}
        <OrganicCardReveal className="w-full">
        <section data-purpose="account-and-security" className="space-y-3">
          {/* Exclusive Perks Card */}
          <div className="bg-white rounded-2xl border border-black/[0.06] shadow-[0_2px_10px_-6px_rgba(15,23,42,0.06)] p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-[13px] font-extrabold text-[#0f172a]">黑卡尊享权益</h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">点击图标可即时激活对应礼遇</p>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700">4 项生效中</span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => {
                  if (onOpenRadar) {
                    onOpenRadar();
                  } else {
                    handlePerkClick('Priority Radar');
                  }
                }}
                className="bg-neutral-50 hover:bg-neutral-100 rounded-xl p-2.5 border border-black/[0.05] text-center flex flex-col items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                  <Zap className="w-4 h-4 fill-amber-500 text-amber-500" />
                </div>
                <span className="text-[11px] font-bold text-[#0f172a] leading-tight">优先雷达</span>
              </button>

              <button
                type="button"
                onClick={() => handlePerkClick('Free Delivery')}
                className="bg-neutral-50 hover:bg-neutral-100 rounded-xl p-2.5 border border-black/[0.05] text-center flex flex-col items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Truck className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-[#0f172a] leading-tight">免配送费</span>
              </button>

              <button
                type="button"
                onClick={() => handlePerkClick('VIP Support')}
                className="bg-neutral-50 hover:bg-neutral-100 rounded-xl p-2.5 border border-black/[0.05] text-center flex flex-col items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
              >
                <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-[#0284c7]">
                  <Headset className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-[#0f172a] leading-tight">专属客服</span>
              </button>

              <button
                type="button"
                onClick={() => handlePerkClick('Monthly Gift')}
                className="bg-neutral-50 hover:bg-neutral-100 rounded-xl p-2.5 border border-black/[0.05] text-center flex flex-col items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                  <Gift className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-[#0f172a] leading-tight">月度礼遇</span>
              </button>
            </div>
          </div>

          {/* Account & Security List Card */}
          <div className="bg-white rounded-2xl border border-black/[0.06] shadow-[0_2px_10px_-6px_rgba(15,23,42,0.06)] px-4 divide-y divide-black/[0.05]">
            <div className="py-3.5 flex items-center justify-between">
              <h3 className="text-[13px] font-extrabold text-[#0f172a]">账户与安全管理</h3>
              <span className="text-[11px] text-neutral-400">权益 · 账号 · 偏好</span>
            </div>

            {/* Coupons Banner Row */}
            <button
              type="button"
              onClick={() => {
                if (onOpenCoupons) {
                  onOpenCoupons();
                } else {
                  setIsCouponsOpen(true);
                }
              }}
              className="w-full py-3.5 hover:bg-neutral-50/70 transition flex items-center justify-between cursor-pointer text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                  <Ticket className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#0f172a]">我的优惠券包</span>
                    <span className="text-[11px] font-semibold text-amber-700 tabular-nums">
                      · {availableCouponsCount} 张可用
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5 truncate">
                    查看全品类通用券、时段专享券与兑换记录
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-neutral-500 font-semibold flex-shrink-0 ml-2">
                <span>管理</span>
                <ChevronRight className="w-4 h-4 text-neutral-400" />
              </div>
            </button>

            {/* Auth Center Row */}
            <div className="py-3.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-[#0f172a] block">账号注册、登录与身份切换</span>
                  <p className="text-[11px] text-neutral-400 mt-0.5 truncate">
                    支持短信验证码、密码登录与多身份极速切换
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleOpenAuth('sms')}
                className="flex-shrink-0 h-9 px-3 inline-flex items-center gap-0.5 text-xs font-bold text-white bg-[#0f172a] hover:bg-neutral-800 rounded-xl active:scale-95 transition cursor-pointer"
              >
                <span>注册 / 登录</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Personal Info & Addresses Row */}
            <button
              type="button"
              onClick={() => navigateToEditTab('addresses')}
              className="w-full py-3.5 hover:bg-neutral-50/70 transition flex items-center justify-between cursor-pointer text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-700 flex-shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-[#0f172a] block">个人资料与常用地址</span>
                  <p className="text-[11px] text-neutral-400 mt-0.5 truncate">
                    管理头像、昵称、常用地址簿与就餐偏好
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-neutral-500 font-semibold flex-shrink-0 ml-2 tabular-nums">
                <span>{userProfile.addresses?.length || 1} 个地址</span>
                <ChevronRight className="w-4 h-4 text-neutral-400" />
              </div>
            </button>

            {/* Payment Methods Row */}
            <button
              type="button"
              onClick={() => setActiveModal('payment')}
              className="w-full py-3.5 hover:bg-neutral-50/70 transition flex items-center justify-between cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-700 flex-shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-[#0f172a]">支付方式管理</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </button>

            {/* Privacy & Security Row */}
            <button
              type="button"
              onClick={() => setActiveModal('security')}
              className="w-full py-3.5 hover:bg-neutral-50/70 transition flex items-center justify-between cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-700 flex-shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-[#0f172a]">隐私与安全中心</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </button>

            {/* Developer Auth & Center Row */}
            <button
              type="button"
              onClick={() => {
                if (isAdminDeveloper) {
                  openDevControlCenter();
                } else {
                  openDevAuthModal();
                }
              }}
              className="w-full py-3.5 hover:bg-neutral-50/70 transition flex items-center justify-between cursor-pointer text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-600 flex-shrink-0">
                  {isAdminDeveloper ? <Sparkles className="w-4 h-4 text-amber-500" /> : <Lock className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-[#0f172a] block">
                    {isAdminDeveloper ? '开发者模拟与调试中枢' : '开发者账号登录认证'}
                  </span>
                  <p className="text-[11px] text-neutral-400 mt-0.5 truncate">
                    {isAdminDeveloper
                      ? '悬浮调试入口与控制中枢已激活'
                      : '登录后可开启界面调试与模拟控制台'}
                  </p>
                </div>
              </div>
              <div className="flex-shrink-0 ml-2 inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 bg-neutral-100 px-2.5 py-1.5 rounded-lg">
                <span>{isAdminDeveloper ? '配置中枢' : '登录'}</span>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
              </div>
            </button>

            {/* Version & Cloud Sync Governance Row */}
            <div className="py-3.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
                  <Cloud className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#0f172a] truncate">
                      {TCB_CLOUD_ENABLED ? '云端实时拉取与版本自愈' : '本地数据与版本自愈'}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-700 tabular-nums shrink-0">
                      {ACTIVE_BUILD_VERSION}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5 truncate">
                    {TCB_CLOUD_ENABLED
                      ? '直连云端，换版自动清理残留并实时同步'
                      : '本地演示模式，支持清理旧版缓存并刷新'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  toast.info(
                    TCB_CLOUD_ENABLED
                      ? '正在清理残留并从云端全量拉取...'
                      : '正在清理本地残留缓存并刷新...'
                  );
                  manualForceCloudPurgeAndReload();
                }}
                className="flex-shrink-0 h-9 px-3 inline-flex items-center gap-1 text-xs font-bold text-[#0f172a] bg-neutral-100 hover:bg-neutral-200/70 rounded-xl transition active:scale-95 cursor-pointer"
                title={TCB_CLOUD_ENABLED ? '清空本地所有旧版本缓存并从云端拉取最新数据' : '清空本地所有旧版本缓存并刷新页面'}
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>本地强刷</span>
              </button>
            </div>
          </div>
        </section>
        </OrganicCardReveal>
        {/* END: AccountAndSecurity */}

        {/* BEGIN: FooterActionButtons */}
        <footer className="mt-1 flex items-center justify-center gap-3" data-purpose="footer-account-switch">
          <button
            type="button"
            aria-label="切换用户"
            title="切换 / 注册新号"
            onClick={() => handleOpenAuth('presets')}
            className="h-11 px-4 bg-white border border-black/[0.07] rounded-xl text-[#0f172a] text-xs font-bold shadow-[0_2px_10px_-6px_rgba(15,23,42,0.08)] hover:bg-neutral-50 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>切换账号</span>
          </button>

          <button
            type="button"
            aria-label="安全退出"
            title="安全退出登录"
            onClick={handleSignOut}
            className="h-11 px-4 bg-white border border-rose-200 rounded-xl text-rose-600 text-xs font-bold shadow-[0_2px_10px_-6px_rgba(15,23,42,0.08)] hover:bg-rose-50/70 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-rose-500" />
            <span>退出登录</span>
          </button>
        </footer>
        {/* END: FooterActionButtons */}
      </div>

      {/* Payment Methods Modal */}
      {activeModal === 'payment' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 border border-black/[0.08] shadow-2xl relative animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#0f172a]" />
                <h4 className="font-bold text-sm text-[#0f172a]">支付方式管理</h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="关闭弹窗"
                className="w-8 h-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center text-neutral-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-4 space-y-2.5 text-xs">
              <div className="p-3 rounded-xl border border-neutral-900 bg-neutral-50 flex items-center justify-between">
                <div>
                  <span className="font-bold text-[#0f172a] block">微信支付 (WeChat Pay)</span>
                  <span className="text-[11px] text-neutral-500">默认快捷免密支付</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  已绑定
                </span>
              </div>
              <div className="p-3 rounded-xl border border-neutral-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-[#0f172a] block">支付宝 (Alipay)</span>
                  <span className="text-[11px] text-neutral-500">花呗/余额宝安全支付</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  已绑定
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="w-full h-11 bg-[#0f172a] text-white text-xs font-bold rounded-xl hover:bg-neutral-800 transition active:scale-[0.99] cursor-pointer"
            >
              确定
            </button>
          </div>
        </div>
      )}

      {/* Privacy & Security Modal */}
      {activeModal === 'security' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 border border-black/[0.08] shadow-2xl relative animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#0f172a]" />
                <h4 className="font-bold text-sm text-[#0f172a]">隐私与安全中心</h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="关闭弹窗"
                className="w-8 h-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center text-neutral-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-4 space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                <span className="font-bold text-[#0f172a] block">数据端到端加密保护</span>
                <span className="text-[11px] text-neutral-500 mt-0.5 block">
                  您的订单位置信息及支付凭证均受 TLS 1.3 协议加密保护。
                </span>
              </div>
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                <span className="font-bold text-[#0f172a] block">匿名点单隐私模式</span>
                <span className="text-[11px] text-neutral-500 mt-0.5 block">
                  餐车骑手仅获取脱敏虚拟电话与地址末段编号。
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="w-full h-11 bg-[#0f172a] text-white text-xs font-bold rounded-xl hover:bg-neutral-800 transition active:scale-[0.99] cursor-pointer"
            >
              完成
            </button>
          </div>
        </div>
      )}

      {/* Unified User Auth Modal */}
      <UserAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        onLoginSuccess={(user) => {
          setIsSignedOut(false);
          if (onProfileUpdated) {
            onProfileUpdated(user);
          }
          showToast(`登录成功，欢迎 ${user.nickname}！`);
        }}
      />

      {/* User Coupons Management Center Modal */}
      <UserCouponsModal
        isOpen={isCouponsOpen}
        onClose={() => setIsCouponsOpen(false)}
        onGoToMenu={onGoToMenu}
        isVIPActive={isVIPActive}
      />
    </div>
  );
};

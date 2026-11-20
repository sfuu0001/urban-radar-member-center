import React, { useState, useRef, useMemo, useEffect } from 'react';
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
  Lock,
  X,
  Ticket,
  Cloud,
  KeyRound,
  UserCheck,
  QrCode,
  RotateCw,
  Smartphone,
  ChevronDown,
  Fingerprint,
  Send,
  Eye,
  EyeOff,
  Check,
  Crown,
  Wallet,
  LogIn
} from 'lucide-react';
import { CouponsCenterView } from './CouponsCenterView';
import { UserProfileEditView } from './user/UserProfileEditView';
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
import { getLocalDeviceCode } from '../utils/identityBinding';
import { TCB_CLOUD_ENABLED, syncUserProfileToCloud } from '../utils/cloudbase';
import { UnifiedPageHeader } from './ui/UnifiedPageHeader';
import { sendSmsCode, verifySmsCode } from '../utils/smsService';
import { collectDeviceHardwareDetails, DeviceHardwareDetails } from '../utils/deviceFingerprint';
import { performAutoLogin } from '../utils/autoAuthEngine';
import { wbDb } from '../utils/wbCloud';

type AccountWindowType = 'auth' | 'device' | 'payment' | 'security' | 'dev' | null;
type PerkId = 'radar' | 'delivery' | 'support' | 'gift';
type TierCode = 'L1' | 'L2' | 'L3' | 'L4';

interface VipPerkStates {
  radar: boolean;
  delivery: boolean;
  support: boolean;
  giftClaimed: boolean;
}

interface MembershipTierConfig {
  code: TierCode;
  shortName: string;
  fullName: string;
  minPoints: number;
  maxPoints: number | null;
  discountNum: string;
  discountLabel: string;
  discountSummary: string;
  deliveryShort: string;
  deliveryBenefit: string;
  pointsMultiplier: string;
  pointsRate: string;
  badgeHeaderClass: string;
  perks: string[];
}

const MEMBERSHIP_TIERS: MembershipTierConfig[] = [
  {
    code: 'L1',
    shortName: '探索',
    fullName: 'L1 探索食客',
    minPoints: 0,
    maxPoints: 999,
    discountNum: '9.8',
    discountLabel: '9.8折',
    discountSummary: '全场正价餐品享 9.8 折优惠',
    deliveryShort: '满 ¥49 免',
    deliveryBenefit: '订单满 ¥49 免基础配送费',
    pointsMultiplier: '1.0×',
    pointsRate: '¥1 = 1 成长积分',
    badgeHeaderClass:
      'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border-slate-300/80',
    perks: ['正价餐品 9.8 折起', '首单赠无门槛饮品券', '生日当周双倍成长积分']
  },
  {
    code: 'L2',
    shortName: '领航',
    fullName: 'L2 城市领航',
    minPoints: 1000,
    maxPoints: 2999,
    discountNum: '9.5',
    discountLabel: '9.5折',
    discountSummary: '全单 9.5 折 · 可与部分满减券同享',
    deliveryShort: '满 ¥39 免',
    deliveryBenefit: '订单满 ¥39 免基础配送费，每周赠 1 张免邮券',
    pointsMultiplier: '1.1×',
    pointsRate: '¥1 = 1.1 成长积分',
    badgeHeaderClass:
      'bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border-emerald-300/80',
    perks: ['全单 9.5 折专享折扣', '餐车到站优先微信/短信提醒', '每周赠 1 张专送免运费券']
  },
  {
    code: 'L3',
    shortName: '黑金',
    fullName: 'L3 黑金尊享',
    minPoints: 3000,
    maxPoints: 4999,
    discountNum: '9',
    discountLabel: '9折',
    discountSummary: '黑卡全单 9 折 · 支持叠加品牌活动立减',
    deliveryShort: '满 ¥30 免',
    deliveryBenefit: '订单满 ¥30 全城专送免配送费',
    pointsMultiplier: '1.25×',
    pointsRate: '¥1 = 1.25 成长积分',
    badgeHeaderClass:
      'bg-[#141413] hover:bg-neutral-800 text-amber-300 border-amber-400/45 shadow-[0_2px_8px_-3px_rgba(20,20,19,0.4)]',
    perks: ['全单 9 折无限次自动抵扣', '优先雷达出餐排位 (+30%)', '满 ¥30 免配送费 · 1v1 专属客服']
  },
  {
    code: 'L4',
    shortName: '传奇',
    fullName: 'L4 传奇主理',
    minPoints: 5000,
    maxPoints: null,
    discountNum: '8.5',
    discountLabel: '8.5折',
    discountSummary: '黑曜石顶格全单 8.5 折 · 节假日同享无上限',
    deliveryShort: '全免运费',
    deliveryBenefit: '无门槛全时段 0 元专送免运费',
    pointsMultiplier: '1.5×',
    pointsRate: '¥1 = 1.5 成长积分',
    badgeHeaderClass:
      'bg-gradient-to-r from-[#141413] via-[#262522] to-[#141413] hover:opacity-95 text-amber-200 border-emerald-400/60 shadow-[0_2px_10px_-3px_rgba(16,185,129,0.3)]',
    perks: ['顶格全单 8.5 折权益', '全城无门槛 0 元免配送费', '限定和牛/特调新品优先试吃权']
  }
];

const TierTreeStepIcon: React.FC<{
  level: 1 | 2 | 3 | 4;
  isCurrent: boolean;
  isSelected: boolean;
  isUnlocked: boolean;
}> = ({ level, isCurrent, isSelected, isUnlocked }) => {
  const activeStroke = isCurrent
    ? '#059669'
    : isSelected
      ? level >= 3
        ? '#d97706'
        : '#141413'
      : isUnlocked
        ? '#10b981'
        : '#737373';

  const apexFill = isCurrent
    ? '#10b981'
    : level >= 3 && isSelected
      ? '#f59e0b'
      : activeStroke;

  const nodes = [
    { step: 1, x: 5.5, topY: 13.5, cy: 11.8, r: 1.65 },
    { step: 2, x: 11.2, topY: 10.8, cy: 9.1, r: 1.75 },
    { step: 3, x: 16.8, topY: 8.0, cy: 6.3, r: 1.85 },
    { step: 4, x: 22.5, topY: 5.3, cy: 3.6, r: 1.95 }
  ];

  return (
    <svg
      viewBox="0 0 28 20"
      fill="none"
      className="w-7 h-5 shrink-0"
      aria-hidden="true"
    >
      {/* 阶梯树状根基横干 */}
      <path
        d="M3 17.8H25"
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {/* 树状阶梯主干跃升连线 */}
      <path
        d="M5.5 14.5L11.2 11.8L16.8 9L22.5 6.3"
        stroke="currentColor"
        strokeOpacity="0.16"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="1.8 1.8"
      />
      {/* 已点亮阶梯的树枝斜向脉络 */}
      {level > 1 && (
        <path
          d={`M5.5 14.5 ${nodes
            .slice(1, level)
            .map((n) => `L${n.x} ${n.topY + 1}`)
            .join(' ')}`}
          stroke={activeStroke}
          strokeOpacity="0.45"
          strokeWidth="1.35"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {nodes.map((node) => {
        const lit = node.step <= level;
        const isTopOfTier = node.step === level;
        const color = isTopOfTier ? apexFill : activeStroke;
        return (
          <g key={node.step} opacity={lit ? 1 : 0.22}>
            <path
              d={`M${node.x} 17.8V${node.topY}`}
              stroke={lit ? color : 'currentColor'}
              strokeWidth={isTopOfTier ? '1.8' : '1.5'}
              strokeLinecap="round"
            />
            <circle
              cx={node.x}
              cy={node.cy}
              r={node.r}
              fill={lit ? color : 'currentColor'}
            />
            {isTopOfTier && (
              <circle
                cx={node.x}
                cy={node.cy}
                r={node.r + 1.3}
                stroke={color}
                strokeOpacity="0.28"
                strokeWidth="1"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
};

function deriveTierFromPoints(points: number): UserProfile['membershipTier'] {
  if (points >= 3000) return 'vip_black_elite';
  if (points >= 1000) return 'vip_silver';
  return 'standard';
}

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
  headerStickyClass?: string;
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
  onOrdersUpdated,
  headerStickyClass
}) => {
  const toast = useToast();
  const [activeAccountWindow, setActiveAccountWindow] = useState<AccountWindowType>(null);
  const [isCouponsViewOpen, setIsCouponsViewOpen] = useState(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [profileEditTab, setProfileEditTab] = useState<'profile' | 'addresses' | 'preferences' | 'wallet' | 'security' | 'finance'>('profile');
  const [isSignedOut, setIsSignedOut] = useState(false);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [isVipCardExpanded, setIsVipCardExpanded] = useState(false);
  const [deviceCodeLabel, setDeviceCodeLabel] = useState(() => getLocalDeviceCode());
  const [avatarImgError, setAvatarImgError] = useState(false);
  const accountSectionRef = useRef<HTMLElement>(null);

  // Payment & Security Embedded Window States
  const [defaultPayment, setDefaultPayment] = useState<'wechat' | 'alipay'>(() =>
    safeGetStorage<'wechat' | 'alipay'>('obsidian_default_payment', 'wechat')
  );
  const [anonymousOrderMode, setAnonymousOrderMode] = useState<boolean>(() =>
    safeGetStorage<boolean>('obsidian_anonymous_order_mode', true)
  );

  // VIP Perks Interactive State
  const [perkStates, setPerkStates] = useState<VipPerkStates>(() =>
    safeGetStorage<VipPerkStates>('obsidian_vip_perks_state', {
      radar: true,
      delivery: true,
      support: true,
      giftClaimed: false
    })
  );
  const [selectedPerk, setSelectedPerk] = useState<PerkId | null>(null);
  const [lastSupportPing, setLastSupportPing] = useState<string | null>(null);
  const [isTierWindowOpen, setIsTierWindowOpen] = useState(false);
  const [inspectedTierCode, setInspectedTierCode] = useState<TierCode>('L3');

  // Embedded Auth Window States
  const [authTab, setAuthTab] = useState<'sms' | 'password' | 'auto'>('sms');
  const [smsPhone, setSmsPhone] = useState('13888889201');
  const [smsCode, setSmsCode] = useState('');
  const [smsNickname, setSmsNickname] = useState('');
  const [smsCountdown, setSmsCountdown] = useState(0);
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  const [pwdPhone, setPwdPhone] = useState('13888889201');
  const [pwdValue, setPwdValue] = useState('12345678');
  const [showPwd, setShowPwd] = useState(false);
  const [hardwareDetails, setHardwareDetails] = useState<DeviceHardwareDetails | null>(null);

  // Security Password Update States
  const [isPwdUpdateOpen, setIsPwdUpdateOpen] = useState(false);
  const [newAccountPwd, setNewAccountPwd] = useState('');
  const [confirmAccountPwd, setConfirmAccountPwd] = useState('');

  // Embedded Dev Auth Window States
  const [devAccountInput, setDevAccountInput] = useState('admin');
  const [devPassInput, setDevPassInput] = useState('admin888');

  useEffect(() => {
    setAvatarImgError(false);
  }, [userProfile.avatar]);

  useEffect(() => {
    if (smsCountdown <= 0) return;
    const t = setTimeout(() => setSmsCountdown((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [smsCountdown]);

  useEffect(() => {
    if (activeAccountWindow !== 'auth' || hardwareDetails) return;
    let cancelled = false;
    void collectDeviceHardwareDetails()
      .then((details) => {
        if (!cancelled) setHardwareDetails(details);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activeAccountWindow, hardwareDetails]);

  useEffect(() => {
    if (!activeAccountWindow && !selectedPerk && !isTierWindowOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeAccountWindow) setActiveAccountWindow(null);
        if (selectedPerk) setSelectedPerk(null);
        if (isTierWindowOpen) setIsTierWindowOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeAccountWindow, selectedPerk, isTierWindowOpen]);

  const navigateToEditTab = (tab: 'profile' | 'addresses' | 'preferences' | 'wallet' | 'security' | 'finance') => {
    if (onOpenEditTab) {
      onOpenEditTab(tab);
      return;
    }
    setProfileEditTab(tab);
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

  const {
    isAdminDeveloper,
    adminUser,
    previewAsConsumer,
    networkDelayMs,
    simulateOffline,
    simulatePaymentOutcome,
    loginAdmin,
    logoutAdmin,
    togglePreviewAsConsumer,
    setNetworkDelayMs,
    setSimulateOffline,
    setSimulatePaymentOutcome,
    clearAllSimulations
  } = useDevSimulation();

  // Read active coupons count
  const availableCouponsCount = useMemo(() => {
    const list = getUserCouponRecords();
    return list.filter((c) => c.status === 'available').length;
  }, [isCouponsViewOpen, userProfile.uid]);

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

  const updatePerkStates = (updater: (prev: VipPerkStates) => VipPerkStates) => {
    setPerkStates((prev) => {
      const next = updater(prev);
      safeSetStorage('obsidian_vip_perks_state', next);
      return next;
    });
  };

  const handlePerkClick = (perkId: PerkId, perkName: string) => {
    if (isGuestIdentity) {
      toast.warning('当前为访客模式', `登录后即可解锁「${perkName}」黑卡权益`);
      handleOpenAuth('sms');
      return;
    }
    if (perkId === 'radar' && onOpenRadar) {
      onOpenRadar();
      return;
    }
    if (onOpenVIP && selectedPerk === perkId) {
      onOpenVIP();
      return;
    }
    setSelectedPerk((prev) => (prev === perkId ? null : perkId));
  };

  const handleSignOut = async () => {
    await purgeUserSessionAndLogout();
    setIsSignedOut(true);
    setActiveAccountWindow(null);
    setIsTierWindowOpen(false);
    toast.info('已安全退出登录', '已清空本地用户文件与凭据残留，切换至纯净访客模式');
    if (onProfileUpdated) {
      onProfileUpdated({
        ...INITIAL_USER_PROFILE,
        uid: 'guest',
        nickname: '访客食客',
        phone: '',
        avatar: '访',
        bio: '访客体验模式 · 登录后同步个人档案',
        membershipTier: 'standard',
        isVIPActive: false,
        points: 0,
        balance: 0,
        addresses: [],
        walletHistory: [],
        authProvider: 'anonymous',
        cloudSyncedAt: new Date().toISOString()
      });
    }
  };

  const handleOpenAuth = (mode: 'sms' | 'password' | 'register' | 'auto' | 'presets' | 'login' = 'sms') => {
    if (mode === 'password' || mode === 'login' || mode === 'register') {
      setAuthTab('password');
    } else if (mode === 'auto') {
      setAuthTab('auto');
    } else {
      setAuthTab('sms');
    }
    setActiveAccountWindow('auth');
    setTimeout(() => {
      accountSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);
  };

  const handleSendEmbeddedSms = async () => {
    const clean = smsPhone.replace(/\D/g, '');
    if (clean.length !== 11) {
      toast.error('手机号格式不正确', '请输入 11 位手机号码');
      return;
    }
    setIsSendingSms(true);
    const res = await sendSmsCode(clean, 'login');
    setIsSendingSms(false);
    if (!res.ok) {
      toast.error('发送失败', res.message || '请稍后重试');
      return;
    }
    setSmsCountdown(res.retryAfter && res.retryAfter > 0 ? res.retryAfter : 60);
    if (res.devCode) {
      setSmsCode(res.devCode);
      toast.info(`【演示通道】验证码 ${res.devCode}`, '已自动填入演示验证码');
    } else {
      toast.success('验证码已发送', `请查收 ${clean.slice(0, 3)}****${clean.slice(-4)} 的短信`);
    }
  };

  const handleEmbeddedSmsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = smsPhone.replace(/\D/g, '');
    if (clean.length !== 11) {
      toast.error('手机号格式不正确', '请输入 11 位手机号码');
      return;
    }
    if (!/^\d{6}$/.test(smsCode.trim())) {
      toast.error('验证码格式不正确', '请输入 6 位数字验证码');
      return;
    }
    setIsAuthBusy(true);
    const verified = await verifySmsCode(clean, smsCode.trim(), 'login');
    if (!verified.ok) {
      setIsAuthBusy(false);
      toast.error('验证码校验失败', verified.message || '请重新获取验证码');
      return;
    }
    try {
      let cloudRow: any = null;
      try {
        const { data } = await wbDb
          .from('profiles')
          .select('uid,nickname,phone')
          .eq('phone', clean)
          .limit(1);
        cloudRow = Array.isArray(data) ? data[0] : null;
      } catch {
        /* 演示本地兜底 */
      }
      const defaultCleanPhone = INITIAL_USER_PROFILE.phone.replace(/\D/g, '');
      const isDefaultMember = clean === defaultCleanPhone;
      const customNick = smsNickname.trim();
      const nextUser: UserProfile = cloudRow?.uid
        ? {
            ...userProfile,
            uid: String(cloudRow.uid),
            nickname: customNick || cloudRow.nickname || userProfile.nickname,
            phone: clean,
            membershipTier: deriveTierFromPoints(userProfile.points ?? 0),
            cloudSyncedAt: new Date().toISOString()
          }
        : isDefaultMember
          ? {
              ...INITIAL_USER_PROFILE,
              nickname: customNick || INITIAL_USER_PROFILE.nickname,
              phone: INITIAL_USER_PROFILE.phone,
              cloudSyncedAt: new Date().toISOString()
            }
          : {
              ...INITIAL_USER_PROFILE,
              uid: `tcb_u_${clean.slice(-4)}`,
              nickname: customNick || `先锋食客 (${clean.slice(-4)})`,
              phone: clean,
              avatar: '🧑‍💻',
              membershipTier: 'standard',
              isVIPActive: false,
              points: 120,
              balance: 0,
              addresses: [],
              walletHistory: [],
              cloudSyncedAt: new Date().toISOString()
            };
      safeSetStorage('obsidian_user_profile', nextUser);
      setIsSignedOut(false);
      setSmsNickname('');
      onProfileUpdated?.(nextUser);
      setActiveAccountWindow(null);
      toast.success('登录成功', `欢迎回来，${nextUser.nickname}`);
    } finally {
      setIsAuthBusy(false);
    }
  };

  const handleEmbeddedPwdLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = pwdPhone.replace(/\D/g, '');
    if (clean.length !== 11) {
      toast.error('手机号格式不正确', '请输入 11 位手机号码');
      return;
    }
    if (pwdValue.trim().length < 6) {
      toast.error('密码长度不足', '请输入至少 6 位登录密码');
      return;
    }
    const defaultCleanPhone = INITIAL_USER_PROFILE.phone.replace(/\D/g, '');
    const isDefaultMember = clean === defaultCleanPhone;
    const nextUser: UserProfile = isDefaultMember
      ? {
          ...INITIAL_USER_PROFILE,
          cloudSyncedAt: new Date().toISOString()
        }
      : {
          ...INITIAL_USER_PROFILE,
          uid: `tcb_u_${clean.slice(-4)}`,
          nickname: `会员食客 (${clean.slice(-4)})`,
          phone: clean,
          avatar: '🧑‍💻',
          membershipTier: 'standard',
          isVIPActive: false,
          points: 260,
          balance: 0,
          addresses: [],
          walletHistory: [],
          cloudSyncedAt: new Date().toISOString()
        };
    safeSetStorage('obsidian_user_profile', nextUser);
    setIsSignedOut(false);
    onProfileUpdated?.(nextUser);
    setActiveAccountWindow(null);
    toast.success('账密验证通过', `已切换至 ${nextUser.nickname}`);
  };

  const handleEmbeddedAutoLogin = async () => {
    setIsAuthBusy(true);
    try {
      const res = await performAutoLogin();
      const rawUser = res?.user as UserProfile | undefined;
      const nextUser: UserProfile = rawUser
        ? {
            ...rawUser,
            membershipTier: deriveTierFromPoints(rawUser.points ?? 0),
            cloudSyncedAt: new Date().toISOString()
          }
        : {
            ...INITIAL_USER_PROFILE,
            cloudSyncedAt: new Date().toISOString()
          };
      safeSetStorage('obsidian_user_profile', nextUser);
      setIsSignedOut(false);
      onProfileUpdated?.(nextUser);
      setActiveAccountWindow(null);
      toast.success('硬件指纹识别成功', `已自动识别会员身份：${nextUser.nickname}`);
    } finally {
      setIsAuthBusy(false);
    }
  };

  const handleQuickSwitchPreset = (preset: { uid: string; nickname: string; phone: string; avatar: string; balance: number; points: number }) => {
    const resolvedTier = deriveTierFromPoints(preset.points);
    const isDefaultPreset = preset.uid === INITIAL_USER_PROFILE.uid;
    const nextUser: UserProfile = {
      ...INITIAL_USER_PROFILE,
      uid: preset.uid,
      nickname: preset.nickname,
      phone: preset.phone,
      avatar: preset.avatar,
      balance: preset.balance,
      points: preset.points,
      membershipTier: resolvedTier,
      isVIPActive: preset.points >= 1000,
      walletHistory: isDefaultPreset
        ? INITIAL_USER_PROFILE.walletHistory
        : [
            {
              id: `w-preset-${preset.uid}`,
              type: 'recharge',
              title: '新会员首充体验金',
              amount: preset.balance,
              balanceAfter: preset.balance,
              timestamp: '2026-09-01 10:15'
            }
          ],
      cloudSyncedAt: new Date().toISOString()
    };
    safeSetStorage('obsidian_user_profile', nextUser);
    setIsSignedOut(false);
    onProfileUpdated?.(nextUser);
    setActiveAccountWindow(null);
    toast.success('身份已切换', `当前登录账号：${nextUser.nickname}`);
  };

  /* 【2026-11-20】访客态 UID 兜底：uid 为占位字符串 'guest' 时，
     原写法 slice(-4) 会截出 "uest"，页面上出现「UID: uest」这种断头文案。
     统一在源头判定，三处尾号展示全部走这里。 */
  const isGuestIdentity = isSignedOut || !userProfile.uid || String(userProfile.uid) === 'guest';
  const uidTail4 = isGuestIdentity ? '7F72' : String(userProfile.uid).slice(-4).toUpperCase();
  const uidTail6 = isGuestIdentity ? '7F72E5' : String(userProfile.uid).slice(-6).toUpperCase();

  const currentPoints = isGuestIdentity ? 0 : Math.max(0, userProfile.points ?? 0);

  const currentTier: MembershipTierConfig = useMemo(() => {
    if (isGuestIdentity) return MEMBERSHIP_TIERS[0];
    if (currentPoints >= 5000) return MEMBERSHIP_TIERS[3];
    if (currentPoints >= 3000 || userProfile.membershipTier === 'vip_black_elite') {
      return MEMBERSHIP_TIERS[2];
    }
    if (currentPoints >= 1000 || userProfile.membershipTier === 'vip_silver') {
      return MEMBERSHIP_TIERS[1];
    }
    return MEMBERSHIP_TIERS[0];
  }, [isGuestIdentity, currentPoints, userProfile.membershipTier]);

  const currentTierIndex = MEMBERSHIP_TIERS.findIndex((t) => t.code === currentTier.code);
  const nextTier =
    currentTierIndex >= 0 && currentTierIndex < MEMBERSHIP_TIERS.length - 1
      ? MEMBERSHIP_TIERS[currentTierIndex + 1]
      : null;
  const pointsToNextTier = nextTier ? Math.max(0, nextTier.minPoints - currentPoints) : 0;
  const tierProgressPercent = isGuestIdentity
    ? 0
    : nextTier
      ? Math.min(100, Math.max(6, (currentPoints / nextTier.minPoints) * 100))
      : 100;

  const handleToggleTierWindow = () => {
    setIsTierWindowOpen((prev) => {
      const next = !prev;
      if (next) {
        setInspectedTierCode(currentTier.code);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return next;
    });
  };

  // If user opened independent coupons window view
  if (isCouponsViewOpen) {
    return (
      <div className="w-full min-h-screen bg-[#ffffff] text-[#141413] flex flex-col font-sans select-none animate-in fade-in">
        <CouponsCenterView
          onBack={() => setIsCouponsViewOpen(false)}
          onGoToMenu={onGoToMenu}
          isVIPActive={isVIPActive}
        />
      </div>
    );
  }

  // If user opened embedded profile/settings page
  if (isProfileEditOpen) {
    return (
      <div className="w-full min-h-screen bg-[#ffffff] text-[#141413] flex flex-col font-sans select-none animate-in fade-in duration-normal">
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
    <div className="w-full min-h-screen bg-[#ffffff] text-[#141413] pb-10 select-none font-sans">
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
        stickyClassName={headerStickyClass || 'sticky top-0 z-30'}
        titleBadge={
          <button
            type="button"
            id="btn-header-tier-badge"
            data-purpose="header-tier-badge"
            onClick={handleToggleTierWindow}
            aria-expanded={isTierWindowOpen}
            title="点击查看会员阶梯与对应折扣权益"
            className={`h-8 px-2.5 rounded-xl border text-[11px] font-bold inline-flex items-center gap-1 transition active:scale-95 cursor-pointer whitespace-nowrap shrink-0 ${
              isGuestIdentity
                ? 'bg-[#f4f4f5] hover:bg-neutral-200/80 text-neutral-600 border-black/[0.08]'
                : currentTier.badgeHeaderClass
            } ${isTierWindowOpen ? 'ring-2 ring-emerald-500/45' : ''}`}
          >
            <Crown
              className={`w-3 h-3 shrink-0 ${
                isGuestIdentity
                  ? 'text-neutral-400'
                  : currentTier.code === 'L3' || currentTier.code === 'L4'
                    ? 'text-amber-400'
                    : 'text-emerald-600'
              }`}
            />
            <span>{isGuestIdentity ? 'L0 访客' : `${currentTier.code} ${currentTier.shortName}`}</span>
            <span
              className={`font-extrabold ${
                isGuestIdentity
                  ? 'text-neutral-400'
                  : currentTier.code === 'L3' || currentTier.code === 'L4'
                    ? 'text-emerald-300'
                    : 'text-emerald-700'
              }`}
            >
              {isGuestIdentity ? '未激活' : currentTier.discountLabel}
            </span>
            <ChevronDown
              className={`w-3 h-3 shrink-0 opacity-75 transition-transform ${
                isTierWindowOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        }
      />
      {/* END: Unified HeaderSection */}

      {/* Main Container */}
      <div className="w-full max-w-5xl mx-auto min-h-screen px-[10px] pt-[10px] pb-16 flex flex-col gap-3.5">

        {/* Embedded Membership Tier & Discount Perks Window */}
        {isTierWindowOpen && (() => {
          const inspectedTier =
            MEMBERSHIP_TIERS.find((t) => t.code === inspectedTierCode) || currentTier;
          const isInspectedCurrent = !isGuestIdentity && inspectedTier.code === currentTier.code;
          const isInspectedUnlocked = !isGuestIdentity && currentPoints >= inspectedTier.minPoints;
          const inspectedGap = isGuestIdentity
            ? inspectedTier.minPoints
            : Math.max(0, inspectedTier.minPoints - currentPoints);

          return (
            <section
              data-purpose="tier-embedded-window"
              className="w-full bg-white rounded-3xl border border-black/[0.08] shadow-[0_14px_38px_-16px_rgba(15,23,42,0.2)] overflow-hidden animate-in fade-in"
            >
              {/* Zone 1: Seamless Obsidian Hero Pass */}
              <div className="obsidian-mesh px-4 pt-3.5 pb-4 text-white relative">
                {/* Top Navigation Row */}
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2 min-w-0">
                    <Crown className="w-4 h-4 text-amber-300 shrink-0" />
                    <span className="text-xs font-extrabold tracking-tight text-white truncate">
                      会员阶梯与折扣权益
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsTierWindowOpen(false)}
                    aria-label="收起会员等级说明"
                    className="h-8 px-3 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-neutral-200 text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>收起</span>
                  </button>
                </div>

                {/* Hero Tier & Big Editorial Discount Readout */}
                <div className="pt-3.5 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-amber-300/95 tracking-wide">
                      {isGuestIdentity ? '访客体验模式' : '当前所在阶梯'}
                    </div>
                    <h2 className="text-lg font-black tracking-tight text-white mt-0.5 truncate">
                      {isGuestIdentity ? 'L0 访客食客' : currentTier.fullName}
                    </h2>
                    <p className="text-[11px] text-neutral-300 mt-1 tabular-nums">
                      {isGuestIdentity
                        ? '登录后自动累积成长积分'
                        : `已累积 ${currentPoints.toLocaleString()} 成长积分`}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="flex items-baseline justify-end gap-0.5 leading-none">
                      <span className="text-[32px] font-black tracking-tight text-emerald-300 tabular-nums">
                        {isGuestIdentity ? '原价' : currentTier.discountNum}
                      </span>
                      {!isGuestIdentity && (
                        <span className="text-sm font-extrabold text-emerald-300/90">折</span>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-300/90 mt-1">
                      {isGuestIdentity ? '未享阶梯折扣' : '全单自动抵扣'}
                    </div>
                  </div>
                </div>

                {/* Milestone Progress Track */}
                <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-[11px] tabular-nums">
                    <span className="text-neutral-300 truncate">
                      {isGuestIdentity
                        ? '登录即可激活 L1–L4 阶梯成长'
                        : nextTier
                          ? `再积 ${pointsToNextTier.toLocaleString()} 分升级至 ${nextTier.code} ${nextTier.shortName} (${nextTier.discountLabel})`
                          : '已解锁全阶梯最高折扣特权'}
                    </span>
                    <span className="font-bold text-white shrink-0 ml-2">
                      {nextTier
                        ? `${currentPoints.toLocaleString()} / ${nextTier.minPoints.toLocaleString()}`
                        : `${currentPoints.toLocaleString()} MAX`}
                    </span>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-300 to-amber-300 transition-all duration-500"
                      style={{ width: `${tierProgressPercent}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-4 text-[11px] text-neutral-400 tabular-nums pt-0.5">
                    {MEMBERSHIP_TIERS.map((tier, idx) => {
                      const reached = !isGuestIdentity && currentPoints >= tier.minPoints;
                      const alignClass =
                        idx === 0
                          ? 'text-left'
                          : idx === MEMBERSHIP_TIERS.length - 1
                            ? 'text-right'
                            : 'text-center';
                      return (
                        <span
                          key={tier.code}
                          className={`${alignClass} ${
                            reached ? 'text-emerald-300 font-bold' : 'text-neutral-400'
                          }`}
                        >
                          {tier.code} · {tier.minPoints}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Zone 2 & 3: Flat White Editorial Canvas (No Nested Card Soup) */}
              <div className="p-4 space-y-4 bg-white">
                {/* 4-Tier Segmented Selector with Tree-Branch Ladder */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#141413]">全阶梯权益对照</span>
                    <span className="text-[11px] text-neutral-400">点击切换查看各阶梯详情</span>
                  </div>

                  <div className="rounded-2xl bg-[#f4f4f5] p-1.5 pt-2.5 space-y-1.5">
                    {/* 树状阶梯主干连接轨 */}
                    <div className="relative grid grid-cols-4 items-center px-0.5">
                      {/* 水平主干底线 */}
                      <div
                        aria-hidden="true"
                        className="absolute left-[12.5%] right-[12.5%] top-1/2 -translate-y-1/2 h-[2px] rounded-full bg-black/[0.08]"
                      />
                      {/* 当前已解锁树干亮线 */}
                      {!isGuestIdentity && currentTierIndex > 0 && (
                        <div
                          aria-hidden="true"
                          className="absolute left-[12.5%] top-1/2 -translate-y-1/2 h-[2px] rounded-full bg-gradient-to-r from-emerald-500 to-amber-400 transition-all duration-300"
                          style={{
                            width: `${(currentTierIndex / (MEMBERSHIP_TIERS.length - 1)) * 75}%`
                          }}
                        />
                      )}
                      {MEMBERSHIP_TIERS.map((tier) => {
                        const isCurrent = !isGuestIdentity && tier.code === currentTier.code;
                        const isSelected = inspectedTier.code === tier.code;
                        const isUnlocked = !isGuestIdentity && currentPoints >= tier.minPoints;
                        return (
                          <div key={tier.code} className="relative z-10 flex flex-col items-center">
                            <span
                              className={`w-2.5 h-2.5 rounded-full border-2 transition ${
                                isCurrent
                                  ? 'bg-emerald-500 border-white ring-2 ring-emerald-500/30 scale-110'
                                  : isSelected
                                    ? 'bg-[#141413] border-white ring-2 ring-[#141413]/20'
                                    : isUnlocked
                                      ? 'bg-emerald-400 border-white'
                                      : 'bg-neutral-300 border-[#f4f4f5]'
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* 阶梯卡片选项卡 */}
                    <div className="grid grid-cols-4 gap-1">
                      {MEMBERSHIP_TIERS.map((tier, idx) => {
                        const isCurrent = !isGuestIdentity && tier.code === currentTier.code;
                        const isSelected = inspectedTier.code === tier.code;
                        const isUnlocked = !isGuestIdentity && currentPoints >= tier.minPoints;
                        const tierLevel = (idx + 1) as 1 | 2 | 3 | 4;

                        return (
                          <button
                            key={tier.code}
                            type="button"
                            onClick={() => setInspectedTierCode(tier.code)}
                            aria-pressed={isSelected}
                            className={`rounded-xl py-2 px-1 text-center flex flex-col items-center gap-0.5 transition cursor-pointer ${
                              isSelected
                                ? 'bg-white text-[#141413] shadow-[0_2px_8px_-2px_rgba(20,20,19,0.12)]'
                                : 'text-neutral-500 hover:text-[#141413]'
                            }`}
                          >
                            <TierTreeStepIcon
                              level={tierLevel}
                              isCurrent={isCurrent}
                              isSelected={isSelected}
                              isUnlocked={isUnlocked}
                            />
                            <span className="text-[11px] font-bold whitespace-nowrap mt-0.5">
                              {tier.code} {tier.shortName}
                            </span>
                            <span
                              className={`text-xs font-black tabular-nums ${
                                isSelected ? 'text-emerald-700' : 'text-neutral-700'
                              }`}
                            >
                              {tier.discountLabel}
                            </span>
                            <span
                              className={`text-[11px] font-semibold whitespace-nowrap ${
                                isCurrent
                                  ? 'text-emerald-600'
                                  : isSelected
                                    ? 'text-neutral-400'
                                    : 'text-neutral-400/80'
                              }`}
                            >
                              {isCurrent ? '当前阶梯' : `${tier.minPoints}+分`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Selected Tier Title & Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-[#141413] tracking-tight">
                        {inspectedTier.fullName}
                      </h3>
                      <span className="text-xs font-extrabold text-emerald-700 tabular-nums">
                        {inspectedTier.discountLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">
                      {inspectedTier.discountSummary}
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-bold shrink-0 whitespace-nowrap tabular-nums pt-0.5 ${
                      isInspectedCurrent
                        ? 'text-emerald-700'
                        : isInspectedUnlocked
                          ? 'text-neutral-500'
                          : 'text-amber-700'
                    }`}
                  >
                    {isInspectedCurrent
                      ? '当前所在阶梯'
                      : isInspectedUnlocked
                        ? '已解锁权益'
                        : `差 ${inspectedGap.toLocaleString()} 分解锁`}
                  </span>
                </div>

                {/* 3-Column Clean Metric Strip (Hairline Dividers, Zero Nested Boxes) */}
                <div className="grid grid-cols-3 divide-x divide-black/[0.07] py-3 border-y border-black/[0.06]">
                  <div className="pr-2.5">
                    <div className="text-[11px] text-neutral-400 font-medium">全单折扣</div>
                    <div className="text-sm font-black text-[#141413] mt-1 tabular-nums whitespace-nowrap">
                      {inspectedTier.discountLabel}
                    </div>
                  </div>
                  <div className="px-2.5">
                    <div className="text-[11px] text-neutral-400 font-medium">免配送门槛</div>
                    <div className="text-sm font-black text-[#141413] mt-1 tabular-nums whitespace-nowrap">
                      {inspectedTier.deliveryShort}
                    </div>
                  </div>
                  <div className="pl-2.5">
                    <div className="text-[11px] text-neutral-400 font-medium">积分返还</div>
                    <div className="text-sm font-black text-[#141413] mt-1 tabular-nums whitespace-nowrap">
                      {inspectedTier.pointsMultiplier}
                    </div>
                  </div>
                </div>

                {/* Curated Perks Checklist */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-neutral-400">
                    <span className="font-semibold text-neutral-600">阶梯专属礼遇</span>
                    <span className="tabular-nums">{inspectedTier.pointsRate}</span>
                  </div>
                  <div className="space-y-1.5">
                    {inspectedTier.perks.map((perkText) => (
                      <div
                        key={perkText}
                        className="flex items-center gap-2 text-xs text-neutral-700 font-medium"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" strokeWidth={2.6} />
                        <span>{perkText}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-neutral-400 pt-0.5">
                    配送说明：{inspectedTier.deliveryBenefit}
                  </p>
                </div>
              </div>

              {/* Zone 4: Quiet Footer Bar */}
              <div className="bg-[#fafafa] px-4 py-3 border-t border-black/[0.06] flex items-center justify-between gap-2">
                <span className="text-[11px] text-neutral-500 truncate">
                  {isGuestIdentity
                    ? '登录后即可激活等级折扣'
                    : `结算自动应用 ${currentTier.code} ${currentTier.discountLabel}`}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  {isGuestIdentity ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsTierWindowOpen(false);
                        handleOpenAuth('sms');
                      }}
                      className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition whitespace-nowrap"
                    >
                      立即登录激活
                    </button>
                  ) : (
                    onGoToMenu && (
                      <button
                        type="button"
                        onClick={onGoToMenu}
                        className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition whitespace-nowrap"
                      >
                        去点单享 {currentTier.discountLabel}
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    onClick={() => setIsTierWindowOpen(false)}
                    className="h-9 px-4 rounded-xl bg-[#141413] hover:bg-neutral-800 text-white text-xs font-bold cursor-pointer transition whitespace-nowrap"
                  >
                    完成
                  </button>
                </div>
              </div>
            </section>
          );
        })()}

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
                <span className="text-sm font-extrabold text-[#141413] tracking-tight truncate">
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
          <div className="flex items-center gap-2 pl-2.5 border-l border-black/[0.06] flex-shrink-0">
            <button
              type="button"
              onClick={() => navigateToEditTab('finance')}
              title="查看储值余额与账单明细"
              className="text-right px-1.5 py-1 -my-1 rounded-xl hover:bg-[#f5f5f5] transition cursor-pointer group"
            >
              <div className="text-base font-black text-[#141413] leading-none tabular-nums">
                ¥{isGuestIdentity ? '0.00' : userProfile.balance.toFixed(2)}
              </div>
              <div className="text-[11px] text-neutral-400 group-hover:text-emerald-700 mt-1 inline-flex items-center justify-end gap-0.5 transition-colors">
                <span>账户余额</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleOpenAuth('presets')}
              className="h-9 inline-flex items-center gap-1 px-3 bg-[#f4f4f5] hover:bg-neutral-200/80 rounded-xl text-[#141413] text-xs font-bold tracking-tight transition active:scale-95 cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>换号</span>
            </button>
          </div>
        </section>
        </OrganicCardReveal>
        {/* END: UserProfileBar */}

        {/* BEGIN: ObsidianVipCard（默认收拢为黑曜石精简条，点击展开完整 3D 黑卡） */}
        {!isVipCardExpanded ? (
          <button
            type="button"
            onClick={() => setIsVipCardExpanded(true)}
            data-purpose="obsidian-vip-collapsed-bar"
            className="w-full obsidian-mesh rounded-2xl px-4 py-3 text-white border border-neutral-800 shadow-[0_8px_22px_-12px_rgba(20,20,19,0.42)] flex items-center justify-between gap-2.5 active:scale-[0.99] transition cursor-pointer text-left min-h-[52px]"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-5 h-3.5 rounded-[3px] chip-gold p-[2px] border border-amber-300/80 flex flex-col justify-between shrink-0">
                <div className="w-full h-[1px] bg-black/25 rounded" />
                <div className="w-full h-[1px] bg-black/25 rounded" />
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-extrabold tracking-tight text-white shrink-0">
                  黑曜石会员卡
                </span>
                <span className="text-[11px] font-bold text-amber-300 shrink-0 tabular-nums">
                  · {isGuestIdentity ? 'L0 访客' : `${currentTier.code} ${currentTier.discountLabel}`}
                </span>
                <span className="text-[11px] text-neutral-300/90 tabular-nums truncate">
                  · {currentPoints.toLocaleString()} / {(nextTier?.minPoints ?? 5000).toLocaleString()} 分
                </span>
              </div>
            </div>
            <div className="h-8 inline-flex items-center gap-1.5 text-[11px] font-semibold text-neutral-100 bg-white/10 border border-white/15 px-2.5 rounded-lg shrink-0">
              <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>展开黑卡</span>
              <ChevronDown className="w-3 h-3 text-neutral-300" />
            </div>
          </button>
        ) : (
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
            className={`card-flipper relative w-full min-h-[204px] rounded-2xl shadow-black-card ${
              isCardFlipped ? 'is-flipped' : ''
            }`}
          >
            {/* CARD FRONT */}
            <div
              className="card-front absolute inset-0 obsidian-mesh rounded-2xl p-4 text-white border border-white/[0.1] flex flex-col justify-between select-none"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden'
              }}
            >
              <div className="glare-overlay absolute inset-0 rounded-2xl pointer-events-none" />

              {/* Top Row: Microchip, Tier Status, Flip & Collapse */}
              <div className="relative z-10 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-5 rounded-sm chip-gold p-0.5 border border-amber-300 shadow flex flex-col justify-between flex-shrink-0">
                    <div className="w-full h-0.5 bg-black/25 rounded" />
                    <div className="w-full h-0.5 bg-black/25 rounded" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold text-amber-300/95 leading-tight">
                      {isGuestIdentity ? '访客体验卡' : `${currentTier.fullName}`}
                    </span>
                    <span className="text-[11px] font-bold text-neutral-200 flex items-center gap-1.5 leading-tight mt-0.5">
                      <span>{isGuestIdentity ? '未激活' : `全单自动 ${currentTier.discountLabel}`}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => toggleCardFlip(e)}
                    className="flip-trigger h-8 inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-100 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 px-2.5 rounded-lg transition active:scale-95 cursor-pointer"
                  >
                    <RotateCw className="w-3 h-3 text-amber-300" />
                    <span className="leading-none">翻面扫码</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsVipCardExpanded(false);
                    }}
                    aria-label="收起黑卡"
                    className="h-8 inline-flex items-center text-[11px] font-semibold text-neutral-300 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 px-2.5 rounded-lg transition active:scale-95 cursor-pointer"
                  >
                    <span className="leading-none">收起</span>
                  </button>
                </div>
              </div>

              {/* Center Row: Editorial Title & Precision Pass Code */}
              <div className="relative z-10 my-1 flex flex-col items-center justify-center">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-extrabold tracking-tight text-white">
                    黑曜石黑金会籍
                  </h2>
                  <Crown className="w-4 h-4 text-amber-300 flex-shrink-0" />
                </div>

                <div className="mt-2 w-full max-w-[260px] bg-black/45 border border-white/10 rounded-xl px-3 py-2 flex items-center justify-between gap-2.5">
                  <svg viewBox="0 0 88 20" className="w-24 h-5 text-white/90 shrink-0" aria-hidden="true">
                    <rect x="0" y="1" width="3" height="18" fill="currentColor" />
                    <rect x="5" y="1" width="1.5" height="18" fill="currentColor" />
                    <rect x="9" y="1" width="4" height="18" fill="currentColor" />
                    <rect x="16" y="1" width="2" height="18" fill="currentColor" />
                    <rect x="21" y="1" width="1.5" height="18" fill="currentColor" />
                    <rect x="25" y="1" width="3.5" height="18" fill="currentColor" />
                    <rect x="31" y="1" width="2" height="18" fill="currentColor" />
                    <rect x="36" y="1" width="4" height="18" fill="currentColor" />
                    <rect x="43" y="1" width="1.5" height="18" fill="currentColor" />
                    <rect x="47" y="1" width="3" height="18" fill="currentColor" />
                    <rect x="53" y="1" width="2" height="18" fill="currentColor" />
                    <rect x="58" y="1" width="4" height="18" fill="currentColor" />
                    <rect x="65" y="1" width="1.5" height="18" fill="currentColor" />
                    <rect x="69" y="1" width="3" height="18" fill="currentColor" />
                    <rect x="75" y="1" width="2" height="18" fill="currentColor" />
                    <rect x="80" y="1" width="4" height="18" fill="currentColor" />
                    <rect x="86" y="1" width="2" height="18" fill="currentColor" />
                  </svg>
                  <span className="font-mono text-[11px] tracking-wider text-neutral-200 font-bold leading-none tabular-nums">
                    #{uidTail4} · 8892
                  </span>
                </div>
              </div>

              {/* Bottom Row: Growth Points Progress */}
              <div className="relative z-10 pt-1">
                <div className="flex justify-between items-end text-[11px] text-neutral-300 mb-1.5">
                  <span className="font-medium">
                    {nextTier ? `距 ${nextTier.code} ${nextTier.shortName}成长进度` : '已达最高传奇等级'}
                  </span>
                  <span className="text-neutral-200 font-semibold tabular-nums">
                    <strong className="text-white font-bold">{currentPoints.toLocaleString()}</strong> / {(nextTier?.minPoints ?? 5000).toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-400 to-amber-300 h-full rounded-full transition duration-700"
                    style={{
                      width: isGuestIdentity ? '0%' : `${tierProgressPercent}%`
                    }}
                  />
                </div>
              </div>
            </div>

            {/* CARD BACK */}
            <div
              className="card-back absolute inset-0 obsidian-mesh rounded-2xl p-4 text-white border border-white/[0.1] flex flex-col justify-between select-none"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden'
              }}
            >
              <div className="glare-overlay absolute inset-0 rounded-2xl pointer-events-none" />

              <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">
                    线下餐车核销码
                  </span>
                  <span className="text-[11px] font-semibold text-amber-300 tabular-nums">
                    · {isGuestIdentity ? '访客态' : `${currentTier.code} 生效中`}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => toggleCardFlip(e)}
                    className="flip-trigger h-8 inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-200 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 px-2.5 rounded-lg transition active:scale-95 cursor-pointer"
                  >
                    <RotateCw className="w-3 h-3 text-amber-300" />
                    <span className="leading-none">翻回正面</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsVipCardExpanded(false);
                    }}
                    aria-label="收起黑卡"
                    className="h-8 inline-flex items-center text-[11px] font-semibold text-neutral-300 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 px-2.5 rounded-lg transition active:scale-95 cursor-pointer"
                  >
                    <span className="leading-none">收起</span>
                  </button>
                </div>
              </div>

              <div className="relative z-10 flex items-center justify-between gap-3 my-1">
                <div className="flex flex-col gap-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-neutral-400">会员编号</span>
                    <span className="font-mono text-xs font-bold text-amber-300 tabular-nums">
                      #{uidTail6}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-200 flex flex-col gap-0.5">
                    <span className="font-bold text-white">到站出示自动核销权益</span>
                    <span className="text-[11px] text-emerald-300 font-medium">
                      {isGuestIdentity
                        ? '登录后解锁全单阶梯折扣'
                        : `全单 ${currentTier.discountLabel} · 极速出餐免排队`}
                    </span>
                  </div>
                </div>

                <div className="w-16 h-16 bg-white rounded-xl p-1.5 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <QrCode className="w-full h-full text-[#141413]" />
                </div>
              </div>

              <div className="pt-2 relative z-10 border-t border-white/10 flex items-center justify-between text-[11px] text-neutral-300">
                <div>
                  有效期至 <span className="text-amber-300 font-bold tabular-nums">2026/12/31</span>
                </div>
                <div className="text-emerald-300 font-semibold">全城通用</div>
              </div>
            </div>
          </article>
        </div>
        )}
        {/* END: ObsidianVipCard */}

        {/* 同桌设备身份已收拢至下方「账户与安全管理」折叠入口 */}

        {/* CloudAuth（账号（可选）卡片）已按需求整块移除：
            登录/注册仍可通过顶部「换号」、Account & Security 里的「注册 / 登录」进入 UserAuthModal。 */}

        {/* BEGIN: AccountAndSecurity */}
        <OrganicCardReveal className="w-full">
        <section data-purpose="account-and-security" className="space-y-3">
          {/* Exclusive Perks Card */}
          {(() => {
            const activeCount = isGuestIdentity
              ? 0
              : [
                  perkStates.radar,
                  perkStates.delivery,
                  perkStates.support,
                  perkStates.giftClaimed
                ].filter(Boolean).length;

            const perksConfig: {
              id: PerkId;
              label: string;
              icon: React.ComponentType<{ className?: string }>;
              isActive: boolean;
              statusLabel: string;
              iconBgActive: string;
              iconColorActive: string;
              detailTitle: string;
              detailDesc: string;
              benefitTag: string;
            }[] = [
              {
                id: 'radar',
                label: '优先雷达',
                icon: Zap,
                isActive: !isGuestIdentity && perkStates.radar,
                statusLabel: isGuestIdentity
                  ? '未解锁'
                  : perkStates.radar
                    ? '生效中'
                    : '已暂停',
                iconBgActive: 'bg-amber-50',
                iconColorActive: 'text-amber-600',
                detailTitle: '优先雷达调度队列',
                detailDesc: '靠近餐车 500m 自动触发优先出餐排位，高峰时段平均节省 6–8 分钟等待。',
                benefitTag: '优先级 +30%'
              },
              {
                id: 'delivery',
                label: '免配送费',
                icon: Truck,
                isActive: !isGuestIdentity && perkStates.delivery,
                statusLabel: isGuestIdentity
                  ? '未解锁'
                  : perkStates.delivery
                    ? '生效中'
                    : '已暂停',
                iconBgActive: 'bg-emerald-50',
                iconColorActive: 'text-emerald-600',
                detailTitle: '黑卡全城专送免运费',
                detailDesc: '黑曜石全车队配送单笔满 ¥30 自动免除 ¥5 基础专送费，不限每月使用次数。',
                benefitTag: '单笔省 ¥5'
              },
              {
                id: 'support',
                label: '专属客服',
                icon: Headset,
                isActive: !isGuestIdentity && perkStates.support,
                statusLabel: isGuestIdentity
                  ? '未解锁'
                  : perkStates.support
                    ? '在线中'
                    : '已暂停',
                iconBgActive: 'bg-sky-50',
                iconColorActive: 'text-[#0284c7]',
                detailTitle: 'VIP 1v1 极速人工通道',
                detailDesc: '订单加急协调、地址变更与开票对账由专属客服直连餐车长，平均响应 < 15 秒。',
                benefitTag: '15s 极速响应'
              },
              {
                id: 'gift',
                label: '月度礼遇',
                icon: Gift,
                isActive: !isGuestIdentity && perkStates.giftClaimed,
                statusLabel: isGuestIdentity
                  ? '未解锁'
                  : perkStates.giftClaimed
                    ? '已领取'
                    : '待领取',
                iconBgActive: 'bg-amber-50',
                iconColorActive: 'text-amber-600',
                detailTitle: '11 月黑卡尊享礼遇包',
                detailDesc: '本月可领取「100 会员成长积分 + ¥5 饮品加赠权益」，领取后即时生效。',
                benefitTag: perkStates.giftClaimed ? '本月已领' : '限时可领'
              }
            ];

            const activeDetail = perksConfig.find((p) => p.id === selectedPerk) || null;

            return (
              <div className="bg-white rounded-2xl border border-black/[0.06] shadow-[0_2px_10px_-6px_rgba(20,20,19,0.06)] p-4">
                <div className="flex items-center justify-between mb-3 gap-2">
                  <div>
                    <h3 className="text-[13px] font-extrabold text-[#141413]">黑卡尊享权益</h3>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      {isGuestIdentity ? '登录后解锁黑卡专属礼遇' : '点击图标查看详情或切换生效状态'}
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-semibold tabular-nums shrink-0 ${
                      isGuestIdentity
                        ? 'text-neutral-400'
                        : activeCount === 4
                          ? 'text-emerald-700'
                          : 'text-amber-700'
                    }`}
                  >
                    {isGuestIdentity ? '访客未激活' : `${activeCount} / 4 生效中`}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {perksConfig.map((perk) => {
                    const Icon = perk.icon;
                    const isSelected = selectedPerk === perk.id;
                    const isPendingGift = !isGuestIdentity && perk.id === 'gift' && !perkStates.giftClaimed;

                    const tileClasses = isGuestIdentity
                      ? 'bg-[#f5f5f5] border-transparent opacity-70 hover:opacity-100'
                      : isSelected
                        ? 'bg-[#141413] border-[#141413] text-white shadow-sm'
                        : 'bg-[#f5f5f5] border-transparent hover:bg-[#e5e5e5]';

                    const iconWrapClasses = isGuestIdentity
                      ? 'bg-black/[0.05] text-neutral-500'
                      : isSelected
                        ? 'bg-white/15 text-emerald-300'
                        : perk.isActive
                          ? `${perk.iconBgActive} ${perk.iconColorActive}`
                          : isPendingGift
                            ? 'bg-amber-100/90 text-amber-700'
                            : 'bg-black/[0.05] text-neutral-400';

                    const statusColor = isGuestIdentity
                      ? 'text-neutral-400'
                      : isSelected
                        ? 'text-emerald-300'
                        : perk.isActive
                          ? 'text-emerald-700'
                          : isPendingGift
                            ? 'text-amber-700'
                            : 'text-neutral-400';

                    return (
                      <button
                        key={perk.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => handlePerkClick(perk.id, perk.label)}
                        className={`relative rounded-xl px-1.5 py-2.5 border text-center flex flex-col items-center justify-center gap-1 transition cursor-pointer active:scale-95 min-h-[86px] ${tileClasses}`}
                      >
                        {isGuestIdentity && (
                          <span className="absolute top-1.5 right-1.5">
                            <Lock className="w-2.5 h-2.5 text-neutral-400" />
                          </span>
                        )}

                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${iconWrapClasses}`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span
                          className={`text-[12px] font-bold leading-tight whitespace-nowrap ${
                            isSelected ? 'text-white' : perk.isActive || isPendingGift ? 'text-[#141413]' : 'text-neutral-500'
                          }`}
                        >
                          {perk.label}
                        </span>
                        <span className={`text-[11px] font-semibold leading-none ${statusColor}`}>
                          {perk.statusLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Flattened Embedded Perk Control Drawer (Hairline-divided, zero nested borders) */}
                {activeDetail && !isGuestIdentity && (
                  <div
                    data-purpose="perk-embedded-panel"
                    className="mt-3.5 pt-3.5 border-t border-black/[0.06] space-y-2.5 animate-in fade-in"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-extrabold text-[#141413]">
                            {activeDetail.detailTitle}
                          </span>
                          <span className="text-[11px] font-semibold text-emerald-700">
                            · {activeDetail.benefitTag}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                          {activeDetail.detailDesc}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedPerk(null)}
                        aria-label="收起权益详情"
                        className="w-8 h-8 rounded-lg bg-[#f5f5f5] hover:bg-neutral-200/70 text-neutral-500 flex items-center justify-center shrink-0 cursor-pointer transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="pt-1 flex items-center justify-between gap-2">
                      {activeDetail.id === 'gift' ? (
                        <>
                          <span className="text-[11px] text-neutral-500">
                            {perkStates.giftClaimed
                              ? '本月礼遇已发放至当前会员账户'
                              : '点击即可领取本月 100 会员积分'}
                          </span>
                          <button
                            type="button"
                            disabled={perkStates.giftClaimed}
                            onClick={() => {
                              updatePerkStates((prev) => ({ ...prev, giftClaimed: true }));
                              const updatedPoints = (userProfile.points || 0) + 100;
                              onProfileUpdated?.({
                                ...userProfile,
                                points: updatedPoints,
                                cloudSyncedAt: new Date().toISOString()
                              });
                              toast.success('月度礼遇已领取', '已到账 +100 黑卡成长积分');
                            }}
                            className={`h-9 px-3.5 rounded-xl text-[11px] font-bold whitespace-nowrap shrink-0 transition ${
                              perkStates.giftClaimed
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                                : 'bg-[#141413] hover:bg-neutral-800 text-white cursor-pointer active:scale-95'
                            }`}
                          >
                            {perkStates.giftClaimed ? '本月已领取' : '立即领取礼遇'}
                          </button>
                        </>
                      ) : activeDetail.id === 'support' ? (
                        <>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <button
                              type="button"
                              onClick={() => {
                                const now = new Date().toLocaleTimeString('zh-CN', { hour12: false });
                                setLastSupportPing(`已呼叫 VIP 专属座席（${now}）`);
                                toast.success('VIP 专属客服已接入', '将在 15 秒内致电或推送服务工单');
                              }}
                              className="h-9 px-3.5 rounded-xl bg-[#141413] hover:bg-neutral-800 text-white text-[11px] font-bold cursor-pointer transition shrink-0"
                            >
                              {lastSupportPing ? '再次呼叫客服' : '呼叫专属客服'}
                            </button>
                            {lastSupportPing && (
                              <span className="text-[11px] text-emerald-700 font-medium truncate">
                                {lastSupportPing}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const next = !perkStates.support;
                              updatePerkStates((prev) => ({ ...prev, support: next }));
                              toast.info(next ? 'VIP 优先接线已启用' : 'VIP 优先接线已暂停');
                            }}
                            className={`h-9 px-3 rounded-xl text-[11px] font-bold shrink-0 cursor-pointer transition ${
                              perkStates.support
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-[#f4f4f5] text-neutral-600'
                            }`}
                          >
                            {perkStates.support ? '生效中 · 暂停' : '已暂停 · 开启'}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              navigateToEditTab(
                                activeDetail.id === 'delivery' ? 'addresses' : 'preferences'
                              )
                            }
                            className="h-9 px-3 rounded-xl bg-[#f5f5f5] border border-black/[0.08] hover:bg-[#e5e5e5] text-[#141413] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition"
                          >
                            <span>
                              {activeDetail.id === 'delivery' ? '管理配送地址' : '设置雷达偏好'}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (activeDetail.id === 'radar') {
                                const next = !perkStates.radar;
                                updatePerkStates((prev) => ({ ...prev, radar: next }));
                                toast.info(next ? '优先雷达调度已开启' : '优先雷达调度已暂停');
                              } else {
                                const next = !perkStates.delivery;
                                updatePerkStates((prev) => ({ ...prev, delivery: next }));
                                toast.info(next ? '免配送费权益已开启' : '免配送费权益已暂停');
                              }
                            }}
                            className={`h-9 px-3 rounded-xl text-[11px] font-bold shrink-0 cursor-pointer transition ${
                              (activeDetail.id === 'radar' ? perkStates.radar : perkStates.delivery)
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-[#141413] text-white'
                            }`}
                          >
                            {(activeDetail.id === 'radar' ? perkStates.radar : perkStates.delivery)
                              ? '生效中 · 暂停'
                              : '已暂停 · 启用'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Account & Security List Card / Embedded Window */}
          <div ref={accountSectionRef as any}>
            {activeAccountWindow === null ? (
              <div className="bg-white rounded-2xl border border-black/[0.06] shadow-[0_2px_10px_-6px_rgba(15,23,42,0.06)] px-4 divide-y divide-black/[0.05]">
                <div className="py-3.5 flex items-center justify-between">
                  <h3 className="text-[13px] font-extrabold text-[#141413]">账户与安全管理</h3>
                  <span className="text-[11px] text-neutral-400">点击打开内嵌窗口</span>
                </div>

                {/* Coupons Banner Row (Opens Independent Coupons Window) */}
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenCoupons) {
                      onOpenCoupons();
                    } else {
                      setIsCouponsViewOpen(true);
                    }
                  }}
                  className="w-full py-3.5 hover:bg-[#fafafa] transition flex items-center justify-between cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                      <Ticket className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#141413]">我的优惠券包</span>
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

                {/* Wallet & Finance Row */}
                <button
                  type="button"
                  onClick={() => navigateToEditTab('finance')}
                  className="w-full py-3.5 hover:bg-[#fafafa] transition flex items-center justify-between cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#141413]">储值余额与财务对账</span>
                        <span className="text-[11px] font-bold text-emerald-700 tabular-nums">
                          · ¥{isGuestIdentity ? '0.00' : userProfile.balance.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-0.5 truncate">
                        支持在线快捷储值满赠、返现与账单流水核对
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-neutral-500 font-semibold flex-shrink-0 ml-2">
                    <span>充值</span>
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
                      <span className="text-xs font-bold text-[#141413] block">账号注册、登录与身份切换</span>
                      <p className="text-[11px] text-neutral-400 mt-0.5 truncate">
                        支持短信验证码、密码登录与多身份极速切换
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenAuth('sms')}
                    className="flex-shrink-0 h-9 px-3 inline-flex items-center gap-0.5 text-xs font-bold text-white bg-[#141413] hover:bg-neutral-800 rounded-xl active:scale-95 transition cursor-pointer"
                  >
                    <span>注册 / 登录</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Device Identity Row (Opens Embedded Window) */}
                <button
                  type="button"
                  onClick={() => setActiveAccountWindow('device')}
                  className="w-full py-3.5 hover:bg-[#fafafa] transition flex items-center justify-between cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#f4f4f5] text-neutral-700 flex items-center justify-center flex-shrink-0">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-[#141413] block">同桌设备身份</span>
                      <p className="text-[11px] text-neutral-400 mt-0.5 truncate">
                        同台跨浏览器点餐对齐识别码
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-semibold flex-shrink-0 ml-2">
                    <span className="font-mono text-[11px] font-bold text-[#141413] bg-[#f4f4f5] px-2 py-0.5 rounded-md tabular-nums tracking-wider">
                      {deviceCodeLabel || 'DEMO01'}
                    </span>
                    <ChevronRight className="w-4 h-4 text-neutral-400" />
                  </div>
                </button>

                {/* Personal Info & Addresses Row */}
                <button
                  type="button"
                  onClick={() => navigateToEditTab('addresses')}
                  className="w-full py-3.5 hover:bg-[#fafafa] transition flex items-center justify-between cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#f4f4f5] flex items-center justify-center text-neutral-700 flex-shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-[#141413] block">个人资料与常用地址</span>
                      <p className="text-[11px] text-neutral-400 mt-0.5 truncate">
                        管理头像、昵称、常用地址簿与就餐偏好
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-neutral-500 font-semibold flex-shrink-0 ml-2 tabular-nums">
                    <span>{isGuestIdentity ? 0 : (userProfile.addresses?.length ?? 0)} 个地址</span>
                    <ChevronRight className="w-4 h-4 text-neutral-400" />
                  </div>
                </button>

                {/* Payment Methods Row */}
                <button
                  type="button"
                  onClick={() => setActiveAccountWindow('payment')}
                  className="w-full py-3.5 hover:bg-[#fafafa] transition flex items-center justify-between cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#f4f4f5] flex items-center justify-center text-neutral-700 flex-shrink-0">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-[#141413] block">支付方式管理</span>
                      <p className="text-[11px] text-neutral-400 mt-0.5 truncate">
                        当前默认：{defaultPayment === 'wechat' ? '微信免密支付' : '支付宝安全支付'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />
                </button>

                {/* Privacy & Security Row */}
                <button
                  type="button"
                  onClick={() => setActiveAccountWindow('security')}
                  className="w-full py-3.5 hover:bg-[#fafafa] transition flex items-center justify-between cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#f4f4f5] flex items-center justify-center text-neutral-700 flex-shrink-0">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-[#141413] block">隐私与安全中心</span>
                      <p className="text-[11px] text-neutral-400 mt-0.5 truncate">
                        {anonymousOrderMode ? 'TLS 1.3 加密 · 匿名点单隐私已开启' : 'TLS 1.3 端到端加密保护中'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />
                </button>

                {/* Developer Auth & Center Row */}
                <button
                  type="button"
                  onClick={() => setActiveAccountWindow('dev')}
                  className="w-full py-3.5 hover:bg-[#fafafa] transition flex items-center justify-between cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#f4f4f5] flex items-center justify-center text-neutral-600 flex-shrink-0">
                      {isAdminDeveloper ? <Sparkles className="w-4 h-4 text-amber-500" /> : <Lock className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-[#141413] block">
                        {isAdminDeveloper ? '开发者模拟与调试中枢' : '开发者账号登录认证'}
                      </span>
                      <p className="text-[11px] text-neutral-400 mt-0.5 truncate">
                        {isAdminDeveloper
                          ? '悬浮调试入口与控制中枢已激活'
                          : '登录后可开启界面调试与模拟控制台'}
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-2 inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 bg-[#f4f4f5] px-2.5 py-1.5 rounded-lg">
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
                        <span className="text-xs font-bold text-[#141413] truncate">
                          {TCB_CLOUD_ENABLED ? '云端实时拉取与版本自愈' : '本地数据与版本自愈'}
                        </span>
                        <span className="text-[11px] font-semibold text-emerald-700 tabular-nums shrink-0">
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
                    className="flex-shrink-0 h-9 px-3 inline-flex items-center gap-1 text-xs font-bold text-[#141413] bg-[#f4f4f5] hover:bg-neutral-200/80 rounded-xl transition active:scale-95 cursor-pointer"
                    title={TCB_CLOUD_ENABLED ? '清空本地所有旧版本缓存并从云端拉取最新数据' : '清空本地所有旧版本缓存并刷新页面'}
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>本地强刷</span>
                  </button>
                </div>
              </div>
            ) : (
              (() => {
                const windowMetaMap: Record<
                  Exclude<AccountWindowType, null>,
                  {
                    title: string;
                    subtitle: string;
                    icon: React.ComponentType<{ className?: string }>;
                    footerHint: string;
                  }
                > = {
                  auth: {
                    title: '账号注册、登录与身份切换',
                    subtitle: '支持短信免密、账密登录与设备指纹极速识别',
                    icon: KeyRound,
                    footerHint: '全链路 TLS 1.3 安全认证保护'
                  },
                  device: {
                    title: '同桌设备身份',
                    subtitle: '同台跨浏览器点餐对齐识别码',
                    icon: Smartphone,
                    footerHint: `本机识别码：${deviceCodeLabel || 'DEMO01'}`
                  },
                  payment: {
                    title: '支付方式管理',
                    subtitle: '管理默认快捷支付渠道与安全授权',
                    icon: CreditCard,
                    footerHint: `当前默认：${defaultPayment === 'wechat' ? '微信支付' : '支付宝'}`
                  },
                  security: {
                    title: '隐私与安全中心',
                    subtitle: '端到端加密通道与匿名隐私点单保护',
                    icon: Shield,
                    footerHint: anonymousOrderMode ? '匿名点单隐私保护已开启' : '标准实名保护'
                  },
                  dev: {
                    title: isAdminDeveloper ? '开发者模拟与调试中枢' : '开发者账号登录认证',
                    subtitle: isAdminDeveloper
                      ? '网络延迟、离线与支付模拟参数控制'
                      : '管理员与开发工程师身份核验',
                    icon: isAdminDeveloper ? Sparkles : Lock,
                    footerHint: isAdminDeveloper ? `已授权：${adminUser?.username || 'admin'}` : '未解锁开发者控制台'
                  }
                };

                const meta = windowMetaMap[activeAccountWindow];
                const WindowIcon = meta.icon;

                return (
                  <div
                    data-purpose="account-embedded-window"
                    className="w-full bg-white rounded-2xl border border-black/[0.08] shadow-[0_8px_28px_-12px_rgba(20,20,19,0.14)] overflow-hidden animate-in fade-in"
                  >
                    {/* Embedded Window Header */}
                    <div className="bg-[#fafafa] px-4 py-3 border-b border-black/[0.06] flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-8 h-8 rounded-xl bg-[#141413] text-emerald-400 flex items-center justify-center shrink-0">
                          <WindowIcon className="w-4 h-4" />
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-[13px] font-extrabold text-[#141413] truncate">
                            {meta.title}
                          </h3>
                          <p className="text-[11px] text-neutral-400 truncate">
                            {meta.subtitle}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveAccountWindow(null)}
                        aria-label="关闭内嵌窗口"
                        className="h-9 px-3 rounded-xl bg-white border border-black/[0.08] hover:bg-neutral-100 text-neutral-700 text-xs font-bold inline-flex items-center gap-1 transition cursor-pointer shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>返回</span>
                      </button>
                    </div>

                    {/* Embedded Window Body (Flattened single-surface canvas, zero nested border soup) */}
                    <div className="p-4 bg-white">

                      {activeAccountWindow === 'device' && (
                        <DeviceIdentityCard embedded onCodeChange={setDeviceCodeLabel} />
                      )}

                      {activeAccountWindow === 'payment' && (
                        <div className="space-y-2.5 text-xs">
                          <button
                            type="button"
                            onClick={() => {
                              setDefaultPayment('wechat');
                              safeSetStorage('obsidian_default_payment', 'wechat');
                              toast.success('默认支付已切换', '已设为微信支付 (WeChat Pay) 免密支付');
                            }}
                            className={`w-full p-3.5 rounded-xl border flex items-center justify-between gap-2 text-left transition cursor-pointer min-h-[56px] ${
                              defaultPayment === 'wechat'
                                ? 'border-[#141413] bg-[#f5f5f5]'
                                : 'border-black/[0.07] hover:bg-[#f5f5f5]/60'
                            }`}
                          >
                            <div className="min-w-0">
                              <span className="font-bold text-[#141413] block">微信支付 (WeChat Pay)</span>
                              <span className="text-[11px] text-neutral-500">默认快捷免密支付</span>
                            </div>
                            <span
                              className={`text-[11px] font-bold shrink-0 ${
                                defaultPayment === 'wechat'
                                  ? 'text-emerald-700'
                                  : 'text-neutral-400'
                              }`}
                            >
                              {defaultPayment === 'wechat' ? '当前默认' : '设为默认'}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setDefaultPayment('alipay');
                              safeSetStorage('obsidian_default_payment', 'alipay');
                              toast.success('默认支付已切换', '已设为支付宝 (Alipay) 安全支付');
                            }}
                            className={`w-full p-3.5 rounded-xl border flex items-center justify-between gap-2 text-left transition cursor-pointer min-h-[56px] ${
                              defaultPayment === 'alipay'
                                ? 'border-[#141413] bg-[#f5f5f5]'
                                : 'border-black/[0.07] hover:bg-[#f5f5f5]/60'
                            }`}
                          >
                            <div className="min-w-0">
                              <span className="font-bold text-[#141413] block">支付宝 (Alipay)</span>
                              <span className="text-[11px] text-neutral-500">花呗 / 余额宝安全支付</span>
                            </div>
                            <span
                              className={`text-[11px] font-bold shrink-0 ${
                                defaultPayment === 'alipay'
                                  ? 'text-emerald-700'
                                  : 'text-neutral-400'
                              }`}
                            >
                              {defaultPayment === 'alipay' ? '当前默认' : '设为默认'}
                            </span>
                          </button>
                        </div>
                      )}

                      {activeAccountWindow === 'security' && (
                        <div className="divide-y divide-black/[0.06] text-xs -my-1">
                          <div className="py-3 flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="font-bold text-[#141413] block">数据端到端加密保护</span>
                              <span className="text-[11px] text-neutral-500 mt-0.5 block">
                                您的订单位置信息及支付凭证均受 TLS 1.3 协议加密保护。
                              </span>
                            </div>
                            <span className="text-[11px] font-bold text-emerald-700 shrink-0">
                              运行中
                            </span>
                          </div>

                          <div className="py-3.5 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <span className="font-bold text-[#141413] block">匿名点单隐私模式</span>
                              <span className="text-[11px] text-neutral-500 mt-0.5 block">
                                餐车骑手仅获取脱敏虚拟电话与地址末段编号。
                              </span>
                            </div>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={anonymousOrderMode}
                              onClick={() => {
                                const next = !anonymousOrderMode;
                                setAnonymousOrderMode(next);
                                safeSetStorage('obsidian_anonymous_order_mode', next);
                                toast.info(
                                  next ? '已开启匿名点单隐私模式' : '已关闭匿名点单隐私模式',
                                  next ? '配送过程将自动对号码脱敏' : '将展示完整联系信息以便联系'
                                );
                              }}
                              className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer shrink-0 ${
                                anonymousOrderMode ? 'bg-emerald-600' : 'bg-neutral-300'
                              }`}
                            >
                              <span
                                className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                                  anonymousOrderMode ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>

                          <div className="py-3.5 space-y-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <span className="font-bold text-[#141413] block">登录密码安全设置</span>
                                <span className="text-[11px] text-neutral-500 mt-0.5 block">
                                  {isGuestIdentity ? '登录后可设置或修改账号密码' : '定期更新密码保障账户资金安全'}
                                </span>
                              </div>
                              <button
                                type="button"
                                disabled={isGuestIdentity}
                                onClick={() => setIsPwdUpdateOpen((prev) => !prev)}
                                className="h-9 px-3 rounded-xl bg-[#f5f5f5] hover:bg-neutral-200/70 disabled:opacity-45 text-xs font-bold text-[#141413] cursor-pointer shrink-0 transition"
                              >
                                {isPwdUpdateOpen ? '收起' : '修改密码'}
                              </button>
                            </div>

                            {isPwdUpdateOpen && !isGuestIdentity && (
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  if (newAccountPwd.trim().length < 6) {
                                    toast.error('密码长度不足', '请设置至少 6 位新密码');
                                    return;
                                  }
                                  if (newAccountPwd !== confirmAccountPwd) {
                                    toast.error('两次密码不一致', '请核对确认密码');
                                    return;
                                  }
                                  const nextProfile: UserProfile = {
                                    ...userProfile,
                                    password: newAccountPwd,
                                    cloudSyncedAt: new Date().toISOString()
                                  };
                                  onProfileUpdated?.(nextProfile);
                                  setNewAccountPwd('');
                                  setConfirmAccountPwd('');
                                  setIsPwdUpdateOpen(false);
                                  toast.success('登录密码已更新', '下次可使用新密码登录账号');
                                }}
                                className="pt-2 space-y-2 animate-in fade-in"
                              >
                                <input
                                  type="password"
                                  value={newAccountPwd}
                                  onChange={(e) => setNewAccountPwd(e.target.value)}
                                  placeholder="输入新密码（至少 6 位）"
                                  className="w-full h-10 bg-[#f5f5f5] border border-black/[0.08] rounded-xl px-3 text-xs outline-none focus:bg-white focus:border-emerald-600"
                                />
                                <input
                                  type="password"
                                  value={confirmAccountPwd}
                                  onChange={(e) => setConfirmAccountPwd(e.target.value)}
                                  placeholder="再次输入确认新密码"
                                  className="w-full h-10 bg-[#f5f5f5] border border-black/[0.08] rounded-xl px-3 text-xs outline-none focus:bg-white focus:border-emerald-600"
                                />
                                <button
                                  type="submit"
                                  className="w-full h-10 rounded-xl bg-[#141413] hover:bg-neutral-800 text-white text-xs font-bold cursor-pointer transition"
                                >
                                  确认更新密码
                                </button>
                              </form>
                            )}
                          </div>
                        </div>
                      )}

                      {activeAccountWindow === 'auth' && (
                        <div className="space-y-3 text-xs">
                          {/* Sub-tabs */}
                          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#f4f4f5]">
                            {[
                              { id: 'sms' as const, label: '短信免密' },
                              { id: 'password' as const, label: '账密登录' },
                              { id: 'auto' as const, label: '设备指纹' }
                            ].map((t) => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => setAuthTab(t.id)}
                                className={`h-9 rounded-lg text-xs cursor-pointer transition ${
                                  authTab === t.id
                                    ? 'bg-white text-[#141413] font-bold shadow-xs'
                                    : 'text-neutral-500 font-semibold hover:text-[#141413]'
                                }`}
                              >
                                {t.label}
                              </button>
                            ))}
                          </div>

                          {authTab === 'sms' && (
                            <form onSubmit={handleEmbeddedSmsLogin} className="space-y-2.5">
                              <div>
                                <label className="text-[11px] font-semibold text-neutral-500 block mb-1">
                                  手机号码
                                </label>
                                <input
                                  type="tel"
                                  maxLength={11}
                                  value={smsPhone}
                                  onChange={(e) => setSmsPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                                  placeholder="请输入 11 位手机号"
                                  className="w-full h-10 bg-[#f5f5f5] border border-black/[0.08] rounded-xl px-3 text-xs font-medium text-[#141413] outline-none focus:bg-white focus:border-emerald-600 tabular-nums"
                                />
                              </div>

                              <div>
                                <label className="text-[11px] font-semibold text-neutral-500 block mb-1">
                                  短信验证码
                                </label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    maxLength={6}
                                    value={smsCode}
                                    onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="6 位数字验证码"
                                    className="flex-1 h-10 bg-[#f5f5f5] border border-black/[0.08] rounded-xl px-3 text-xs font-medium text-[#141413] outline-none focus:bg-white focus:border-emerald-600 tracking-widest tabular-nums"
                                  />
                                  <button
                                    type="button"
                                    disabled={isSendingSms || smsCountdown > 0}
                                    onClick={handleSendEmbeddedSms}
                                    className="h-10 px-3 rounded-xl bg-[#f4f4f5] hover:bg-neutral-200/80 disabled:opacity-50 text-[#141413] text-xs font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer transition"
                                  >
                                    <Send className="w-3 h-3" />
                                    <span>{smsCountdown > 0 ? `${smsCountdown}s` : isSendingSms ? '发送中' : '获取验证码'}</span>
                                  </button>
                                </div>
                              </div>

                              <div>
                                <label className="text-[11px] font-semibold text-neutral-500 block mb-1">
                                  专属昵称（新用户选填）
                                </label>
                                <input
                                  type="text"
                                  maxLength={20}
                                  value={smsNickname}
                                  onChange={(e) => setSmsNickname(e.target.value)}
                                  placeholder="首次登录将自动注册并应用此昵称"
                                  className="w-full h-10 bg-[#f5f5f5] border border-black/[0.08] rounded-xl px-3 text-xs font-medium text-[#141413] outline-none focus:bg-white focus:border-emerald-600"
                                />
                              </div>

                              <button
                                type="submit"
                                disabled={isAuthBusy}
                                className="w-full h-10 bg-[#141413] hover:bg-neutral-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer transition"
                              >
                                {isAuthBusy ? '验证登录中...' : '短信验证并登录 / 自动注册'}
                              </button>
                            </form>
                          )}

                          {authTab === 'password' && (
                            <form onSubmit={handleEmbeddedPwdLogin} className="space-y-2.5">
                              <div>
                                <label className="text-[11px] font-semibold text-neutral-500 block mb-1">
                                  登录手机号
                                </label>
                                <input
                                  type="tel"
                                  maxLength={11}
                                  value={pwdPhone}
                                  onChange={(e) => setPwdPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                                  placeholder="请输入 11 位手机号"
                                  className="w-full h-10 bg-[#f5f5f5] border border-black/[0.08] rounded-xl px-3 text-xs font-medium text-[#141413] outline-none focus:bg-white focus:border-emerald-600 tabular-nums"
                                />
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-[11px] font-semibold text-neutral-500 block">
                                    账号密码
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (pwdPhone.replace(/\D/g, '').length === 11) {
                                        setSmsPhone(pwdPhone.replace(/\D/g, ''));
                                      }
                                      setAuthTab('sms');
                                      toast.info('已切换短信验证登录', '通过验证码验证后即可在安全中心重设密码');
                                    }}
                                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                                  >
                                    忘记密码？
                                  </button>
                                </div>
                                <div className="relative">
                                  <input
                                    type={showPwd ? 'text' : 'password'}
                                    value={pwdValue}
                                    onChange={(e) => setPwdValue(e.target.value)}
                                    placeholder="请输入登录密码"
                                    className="w-full h-10 bg-[#f5f5f5] border border-black/[0.08] rounded-xl pl-3 pr-9 text-xs font-medium text-[#141413] outline-none focus:bg-white focus:border-emerald-600"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowPwd((v) => !v)}
                                    aria-label={showPwd ? '隐藏密码' : '显示密码'}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-[#141413] cursor-pointer"
                                  >
                                    {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>

                              <button
                                type="submit"
                                className="w-full h-10 bg-[#141413] hover:bg-neutral-800 text-white rounded-xl text-xs font-bold cursor-pointer transition"
                              >
                                立即登录
                              </button>
                            </form>
                          )}

                          {authTab === 'auto' && (
                            <div className="space-y-2.5">
                              <div className="rounded-xl bg-[#141413] text-white p-3 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <Fingerprint className="w-4 h-4 text-emerald-400" />
                                    <span className="text-xs font-bold">硬件特征已就绪</span>
                                  </div>
                                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-white/10 text-emerald-300 font-semibold">
                                    高熵 99.8%
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[11px] bg-white/[0.06] rounded-lg p-2">
                                  <div className="min-w-0">
                                    <span className="text-neutral-400 block text-[11px]">硬件指纹码</span>
                                    <span className="font-mono text-emerald-300 truncate block">
                                      {hardwareDetails?.hardwareHash || 'HW-READY'}
                                    </span>
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-neutral-400 block text-[11px]">GPU 渲染器</span>
                                    <span className="font-mono text-neutral-200 truncate block">
                                      {hardwareDetails?.gpuRenderer || 'WebGL Device'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                disabled={isAuthBusy}
                                onClick={handleEmbeddedAutoLogin}
                                className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition"
                              >
                                <Fingerprint className="w-3.5 h-3.5" />
                                <span>{isAuthBusy ? '正在比对硬件特征...' : '一键免密识别并登录'}</span>
                              </button>
                            </div>
                          )}

                          {/* Quick Identity Switch */}
                          <div className="pt-2.5 border-t border-black/[0.06]">
                            <div className="text-[11px] font-semibold text-neutral-400 mb-2">
                              快捷身份切换（演示）
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleQuickSwitchPreset({
                                    uid: INITIAL_USER_PROFILE.uid,
                                    nickname: INITIAL_USER_PROFILE.nickname,
                                    phone: INITIAL_USER_PROFILE.phone,
                                    avatar: INITIAL_USER_PROFILE.avatar || '🧑‍💻',
                                    balance: INITIAL_USER_PROFILE.balance,
                                    points: INITIAL_USER_PROFILE.points
                                  })
                                }
                                className="p-2.5 rounded-xl border border-black/[0.07] bg-[#f5f5f5] hover:bg-[#e5e5e5] text-left cursor-pointer transition"
                              >
                                <span className="font-bold text-[#141413] block truncate">
                                  {INITIAL_USER_PROFILE.nickname}
                                </span>
                                <span className="text-[11px] text-neutral-500 tabular-nums">
                                  VIP · ¥{INITIAL_USER_PROFILE.balance.toFixed(2)}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleQuickSwitchPreset({
                                    uid: 'tcb_u_demo2',
                                    nickname: '林夕 · 黑曜石尝鲜',
                                    phone: '13912345678',
                                    avatar: '👩‍🍳',
                                    balance: 88.0,
                                    points: 620
                                  })
                                }
                                className="p-2.5 rounded-xl border border-black/[0.07] bg-[#f5f5f5] hover:bg-[#e5e5e5] text-left cursor-pointer transition"
                              >
                                <span className="font-bold text-[#141413] block truncate">
                                  林夕 · 黑曜石尝鲜
                                </span>
                                <span className="text-[11px] text-neutral-500 tabular-nums">
                                  139****5678 · ¥88.00
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeAccountWindow === 'dev' && (
                        <div className="space-y-3 text-xs">
                          {!isAdminDeveloper ? (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                const res = loginAdmin(devAccountInput, devPassInput);
                                if (res.success) {
                                  toast.success('开发者身份已解锁', res.message);
                                } else {
                                  toast.error('认证失败', res.message);
                                }
                              }}
                              className="space-y-2.5"
                            >
                              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                                演示调试账号：<span className="font-mono font-bold">admin</span> / 密码：
                                <span className="font-mono font-bold">admin888</span>
                              </div>
                              <div>
                                <label className="text-[11px] font-semibold text-neutral-500 block mb-1">
                                  管理员账号
                                </label>
                                <input
                                  type="text"
                                  value={devAccountInput}
                                  onChange={(e) => setDevAccountInput(e.target.value)}
                                  className="w-full h-10 bg-[#f5f5f5] border border-black/[0.08] rounded-xl px-3 text-xs font-medium text-[#141413] outline-none focus:bg-white focus:border-emerald-600"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] font-semibold text-neutral-500 block mb-1">
                                  授权密钥
                                </label>
                                <input
                                  type="password"
                                  value={devPassInput}
                                  onChange={(e) => setDevPassInput(e.target.value)}
                                  className="w-full h-10 bg-[#f5f5f5] border border-black/[0.08] rounded-xl px-3 text-xs font-medium text-[#141413] outline-none focus:bg-white focus:border-emerald-600"
                                />
                              </div>
                              <button
                                type="submit"
                                className="w-full h-10 bg-[#141413] hover:bg-neutral-800 text-white rounded-xl text-xs font-bold cursor-pointer transition"
                              >
                                验证并解锁调试中枢
                              </button>
                            </form>
                          ) : (
                            <div className="divide-y divide-black/[0.06] -my-1">
                              <div className="pb-3">
                                <div className="p-3 rounded-xl bg-[#141413] text-white flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <span className="text-xs font-bold block truncate">
                                      {adminUser?.name || '开发者模式已开启'}
                                    </span>
                                    <span className="text-[11px] text-emerald-300">
                                      账号：{adminUser?.username || 'admin'} · 登录于 {adminUser?.loginTime}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      logoutAdmin();
                                      toast.info('已退出开发者模式');
                                    }}
                                    className="h-8 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold cursor-pointer shrink-0"
                                  >
                                    退出授权
                                  </button>
                                </div>
                              </div>

                              <div className="py-3 flex items-center justify-between">
                                <div>
                                  <span className="font-bold text-[#141413] block">模拟离线断网</span>
                                  <span className="text-[11px] text-neutral-500">测试离线兜底提示状态</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setSimulateOffline(!simulateOffline)}
                                  className={`h-8 px-3 rounded-lg text-[11px] font-bold cursor-pointer ${
                                    simulateOffline
                                      ? 'bg-rose-600 text-white'
                                      : 'bg-[#f4f4f5] text-neutral-700'
                                  }`}
                                >
                                  {simulateOffline ? '已开启' : '已关闭'}
                                </button>
                              </div>

                              <div className="py-3 flex items-center justify-between">
                                <div>
                                  <span className="font-bold text-[#141413] block">消费者视角预览</span>
                                  <span className="text-[11px] text-neutral-500">临时隐藏模拟态</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={togglePreviewAsConsumer}
                                  className={`h-8 px-3 rounded-lg text-[11px] font-bold cursor-pointer ${
                                    previewAsConsumer
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-[#f4f4f5] text-neutral-700'
                                  }`}
                                >
                                  {previewAsConsumer ? '预览中' : '标准视图'}
                                </button>
                              </div>

                              <div className="py-3 space-y-2">
                                <span className="font-bold text-[#141413] block">模拟网络延迟（{networkDelayMs}ms）</span>
                                <div className="grid grid-cols-3 gap-1.5">
                                  {[0, 500, 1500].map((ms) => (
                                    <button
                                      key={ms}
                                      type="button"
                                      onClick={() => setNetworkDelayMs(ms)}
                                      className={`h-9 rounded-lg text-[11px] font-bold cursor-pointer ${
                                        networkDelayMs === ms
                                          ? 'bg-[#141413] text-white'
                                          : 'bg-[#f5f5f5] text-neutral-600 hover:bg-neutral-200/70'
                                      }`}
                                    >
                                      {ms === 0 ? '无延迟' : `${ms}ms`}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="py-3 space-y-2">
                                <span className="font-bold text-[#141413] block">支付结果模拟</span>
                                <div className="grid grid-cols-4 gap-1">
                                  {(
                                    [
                                      { key: 'normal', label: '正常' },
                                      { key: 'success', label: '必成' },
                                      { key: 'timeout', label: '超时' },
                                      { key: 'fail', label: '失败' }
                                    ] as const
                                  ).map((item) => (
                                    <button
                                      key={item.key}
                                      type="button"
                                      onClick={() => setSimulatePaymentOutcome(item.key)}
                                      className={`h-9 rounded-lg text-[11px] font-bold cursor-pointer ${
                                        simulatePaymentOutcome === item.key
                                          ? 'bg-[#141413] text-white'
                                          : 'bg-[#f5f5f5] text-neutral-600 hover:bg-neutral-200/70'
                                      }`}
                                    >
                                      {item.label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="pt-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    clearAllSimulations();
                                    toast.info('已重置所有模拟参数');
                                  }}
                                  className="w-full h-10 rounded-xl bg-[#f4f4f5] hover:bg-neutral-200/80 text-neutral-700 text-xs font-bold cursor-pointer transition"
                                >
                                  一键清除所有模拟参数
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Embedded Window Footer */}
                    <div className="bg-[#fafafa] px-4 py-3 border-t border-black/[0.06] flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-neutral-400 truncate">
                        {meta.footerHint}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveAccountWindow(null)}
                        className="h-9 px-4 rounded-xl bg-[#141413] hover:bg-neutral-800 text-white text-xs font-bold cursor-pointer transition shrink-0"
                      >
                        完成
                      </button>
                    </div>
                  </div>
                );
              })()
            )}
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
            className="h-11 px-4 bg-white border border-black/[0.07] rounded-xl text-[#141413] text-xs font-bold shadow-[0_2px_10px_-6px_rgba(20,20,19,0.08)] hover:bg-[#f5f5f5] flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>切换账号</span>
          </button>

          {isGuestIdentity ? (
            <button
              type="button"
              aria-label="立即登录"
              title="登录会员账号"
              onClick={() => handleOpenAuth('sms')}
              className="h-11 px-4 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-white text-xs font-bold shadow-[0_2px_10px_-6px_rgba(16,185,129,0.45)] flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>立即登录</span>
            </button>
          ) : (
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
          )}
        </footer>
        {/* END: FooterActionButtons */}
      </div>
    </div>
  );
};

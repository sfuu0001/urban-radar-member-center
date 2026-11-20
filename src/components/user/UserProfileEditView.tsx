import React, { useState, useMemo, useEffect, useRef } from 'react';
import { sendSmsCode, verifySmsCode } from '../../utils/smsService';
import {
  Check,
  Sliders,
  MapPin,
  Wallet,
  Edit2,
  Trash2,
  Plus,
  ShieldCheck,
  AlertCircle,
  Copy,
  CheckCircle2,
  Leaf,
  BellOff,
  CreditCard,
  User,
  Tag,
  Search,
  Navigation,
  Compass,
  Crosshair,
  X,
  RotateCcw,
  KeyRound,
  Smartphone,
  ArrowUpRight,
  ArrowDownLeft,
  Gift,
  ChevronRight,
  ChevronDown,
  Lock
} from 'lucide-react';
import { UserProfile, UserAddress, UserPreferences, UserWalletTransaction } from '../../types';
import { syncUserProfileToCloud } from '../../utils/cloudbase';
import { wbDb } from '../../utils/wbCloud';
import { useToast } from '../ui/ToastContext';
import { UnifiedPageHeader } from '../ui/UnifiedPageHeader';
import { safeGetStorage, safeSetStorage } from '../../utils/safeStorage';
import { saveAddresses, DeliveryAddressItem } from '../../utils/truckLocationEngine';
import { getDemoDeviceHash } from '../../utils/deviceFingerprint';

export interface UserProfileEditViewProps {
  userProfile: UserProfile;
  onProfileUpdated: (updated: UserProfile) => void;
  onBack?: () => void;
  initialTab?: 'profile' | 'addresses' | 'preferences' | 'wallet' | 'security' | 'finance';
  onOpenCloudMonitor?: () => void;
  onOpenCloudCode?: () => void;
  headerStickyClass?: string;
}

type TabType = 'tab-profile' | 'tab-preference' | 'tab-address' | 'tab-security' | 'tab-finance';

interface EditableSnapshot {
  nickname: string;
  avatar: string;
  bio: string;
  gender: 'secret' | 'male' | 'female';
  birthday: string;
  spiciness: 'none' | 'mild' | 'medium' | 'hot';
  ecoMode: boolean;
  silentCall: boolean;
  autoCoupons: boolean;
  dietaryNotes: string;
  addresses: UserAddress[];
}

const ADDRESS_TAG_BADGE_PRESETS = ['公司', '家', '学校', '写字楼', '住宅', '高校', '临时', '其他'] as const;

function getAddressBadgeClassName(tag: string): string {
  const normalized = tag.trim();
  if (!normalized) {
    return 'bg-[#f1efe9] text-neutral-500 border-black/[0.08] hover:bg-[#e6e3da]';
  }
  if (normalized === '家' || normalized === '住宅') {
    return 'bg-emerald-50 text-emerald-800 border-emerald-200/90 hover:bg-emerald-100/80';
  }
  if (normalized === '临时') {
    return 'bg-amber-50 text-amber-800 border-amber-200/90 hover:bg-amber-100/80';
  }
  if (normalized === '公司' || normalized === '写字楼' || normalized === '学校' || normalized === '高校') {
    return 'bg-[#f1efe9] text-[#141413] border-black/[0.08] hover:bg-[#e6e3da]';
  }
  return 'bg-amber-50 text-amber-800 border-amber-200/90 hover:bg-amber-100/80';
}

const PRESET_DISTRICT_ADDRESSES: {
  tag: string;
  address: string;
  detail: string;
  houseNumber: string;
  remarks: string;
  lat: number;
  lng: number;
}[] = [
  {
    tag: '公司',
    address: '静安大悦城南座办公楼',
    detail: '西藏北路166号南座801室',
    houseNumber: '801室',
    remarks: '放置前台或门口智能蜂巢柜',
    lat: 31.2435,
    lng: 121.469
  },
  {
    tag: '家',
    address: '静安国际中心公寓区',
    detail: '汉中路光复路口1号楼',
    houseNumber: '1202室',
    remarks: '到达后电话联系，请轻声叩门',
    lat: 31.241,
    lng: 121.462
  },
  {
    tag: '学校',
    address: '同济大学四平路校区',
    detail: '四平路1239号学苑综合楼',
    houseNumber: '学苑餐厅西门外送专席',
    remarks: '下课高峰期请放外卖自提保温柜',
    lat: 31.2828,
    lng: 121.5011
  },
  {
    tag: '公司',
    address: '张江高科微电子港',
    detail: '碧波路888号畅星大厦6号楼',
    houseNumber: '6号楼1楼大厅',
    remarks: '放公司前台专属餐盒保洁区',
    lat: 31.201,
    lng: 121.587
  },
  {
    tag: '其他',
    address: '汉中路地铁站枢纽',
    detail: '12号线/13号线6号出入口地面广场',
    houseNumber: '地面公共绿地南侧长椅',
    remarks: '临时驻点就餐，当面交接',
    lat: 31.2405,
    lng: 121.459
  }
];

function normalizeDateInput(raw?: string): string {
  if (!raw) return '1990-01-01';
  const cleaned = raw.trim().replace(/\//g, '-');
  const match = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return '1990-01-01';
  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function buildInitialSnapshot(profile: UserProfile): EditableSnapshot {
  const isGuest = !profile.uid || String(profile.uid).toLowerCase() === 'guest';
  return {
    nickname: profile.nickname || (isGuest ? '访客食客' : '张伟 (店长)'),
    avatar: profile.avatar || (isGuest ? '访' : '🧑‍💻'),
    bio: profile.bio || (isGuest ? '访客体验模式 · 登录后同步个人档案' : '黑曜石流动餐车站先锋食客'),
    gender: profile.gender || 'secret',
    birthday: normalizeDateInput(profile.birthday),
    spiciness: profile.preferences?.spiciness || 'mild',
    ecoMode:
      profile.preferences?.cutlery === 'eco' ||
      profile.preferences?.cutlery === 'not_needed' ||
      !profile.preferences?.cutlery,
    silentCall: profile.preferences ? !profile.preferences.radarTracking : false,
    autoCoupons: profile.preferences?.autoApplyCoupons !== false,
    dietaryNotes: profile.preferences?.dietaryNote || '无特殊过敏原',
    addresses: Array.isArray(profile.addresses) ? profile.addresses : []
  };
}

function serializeSnapshot(snap: EditableSnapshot): string {
  return JSON.stringify({
    nickname: snap.nickname.trim(),
    avatar: snap.avatar,
    bio: snap.bio.trim(),
    gender: snap.gender,
    birthday: snap.birthday.trim(),
    spiciness: snap.spiciness,
    ecoMode: snap.ecoMode,
    silentCall: snap.silentCall,
    autoCoupons: snap.autoCoupons,
    dietaryNotes: snap.dietaryNotes.trim(),
    addresses: snap.addresses
  });
}

/** 统一分区白卡容器，保证全页 5 个分区卡片质感完全一致 */
const SectionCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  divided?: boolean;
}> = ({ children, className = '', divided = false }) => (
  <section
    className={`bg-white rounded-2xl border border-black/[0.06] shadow-[0_2px_10px_-6px_rgba(20,20,19,0.06)] ${
      divided ? 'px-4 divide-y divide-black/[0.05]' : 'p-4'
    } ${className}`}
  >
    {children}
  </section>
);

/** 统一细线卡片头部 */
const SectionHeader: React.FC<{
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}> = ({ title, subtitle, right }) => (
  <div className="flex items-center justify-between gap-3">
    <div className="min-w-0">
      <h2 className="text-[13px] font-extrabold text-[#141413] tracking-tight leading-snug">
        {title}
      </h2>
      {subtitle && <p className="text-[11px] text-neutral-400 mt-0.5">{subtitle}</p>}
    </div>
    {right && <div className="shrink-0">{right}</div>}
  </div>
);

export const UserProfileEditView: React.FC<UserProfileEditViewProps> = ({
  userProfile,
  onProfileUpdated,
  onBack,
  initialTab = 'profile',
  onOpenCloudMonitor,
  headerStickyClass
}) => {
  const toast = useToast();

  const resolvedInitialTab: TabType = useMemo(() => {
    switch (initialTab) {
      case 'addresses':
        return 'tab-address';
      case 'preferences':
        return 'tab-preference';
      case 'security':
        return 'tab-security';
      case 'wallet':
      case 'finance':
        return 'tab-finance';
      case 'profile':
      default:
        return 'tab-profile';
    }
  }, [initialTab]);

  const [activeWindowTab, setActiveWindowTab] = useState<TabType | null>(() =>
    initialTab && initialTab !== 'profile' ? resolvedInitialTab : null
  );

  useEffect(() => {
    if (initialTab && initialTab !== 'profile') {
      setActiveWindowTab(resolvedInitialTab);
    }
  }, [initialTab, resolvedInitialTab]);

  // Baseline snapshot for dirty detection
  const [baseline, setBaseline] = useState<EditableSnapshot>(() =>
    buildInitialSnapshot(userProfile)
  );

  // Draft States
  const [nickname, setNickname] = useState(baseline.nickname);
  const [phone, setPhone] = useState(userProfile.phone || '');
  const [avatar, setAvatar] = useState(baseline.avatar);
  const [avatarImgError, setAvatarImgError] = useState(false);
  const [bio, setBio] = useState(baseline.bio);
  const [gender, setGender] = useState<'secret' | 'male' | 'female'>(baseline.gender);
  const [birthday, setBirthday] = useState(baseline.birthday);

  // Preferences Draft States
  const [spiciness, setSpiciness] = useState<'none' | 'mild' | 'medium' | 'hot'>(
    baseline.spiciness
  );
  const [ecoMode, setEcoMode] = useState<boolean>(baseline.ecoMode);
  const [silentCall, setSilentCall] = useState<boolean>(baseline.silentCall);
  const [autoCoupons, setAutoCoupons] = useState<boolean>(baseline.autoCoupons);
  const [dietaryNotes, setDietaryNotes] = useState<string>(baseline.dietaryNotes);

  // Addresses Draft State
  const [addresses, setAddresses] = useState<UserAddress[]>(baseline.addresses);

  // Re-sync if external account or synced profile snapshot changes (e.g., switch account, logout, or recharge)
  useEffect(() => {
    const nextSnap = buildInitialSnapshot(userProfile);
    setBaseline(nextSnap);
    setNickname(nextSnap.nickname);
    setPhone(userProfile.phone || '');
    setAvatar(nextSnap.avatar);
    setBio(nextSnap.bio);
    setGender(nextSnap.gender);
    setBirthday(nextSnap.birthday);
    setSpiciness(nextSnap.spiciness);
    setEcoMode(nextSnap.ecoMode);
    setSilentCall(nextSnap.silentCall);
    setAutoCoupons(nextSnap.autoCoupons);
    setDietaryNotes(nextSnap.dietaryNotes);
    setAddresses(nextSnap.addresses);
  }, [userProfile.uid, userProfile.phone, userProfile.cloudSyncedAt]);

  useEffect(() => {
    setAvatarImgError(false);
  }, [avatar]);

  const currentDraftSnapshot: EditableSnapshot = useMemo(
    () => ({
      nickname,
      avatar,
      bio,
      gender,
      birthday,
      spiciness,
      ecoMode,
      silentCall,
      autoCoupons,
      dietaryNotes,
      addresses
    }),
    [
      nickname,
      avatar,
      bio,
      gender,
      birthday,
      spiciness,
      ecoMode,
      silentCall,
      autoCoupons,
      dietaryNotes,
      addresses
    ]
  );

  const hasUnsavedChanges = useMemo(
    () => serializeSnapshot(currentDraftSnapshot) !== serializeSnapshot(baseline),
    [currentDraftSnapshot, baseline]
  );

  const isProfileTabDirty = useMemo(
    () =>
      nickname.trim() !== baseline.nickname.trim() ||
      avatar !== baseline.avatar ||
      bio.trim() !== baseline.bio.trim() ||
      gender !== baseline.gender ||
      birthday.trim() !== baseline.birthday.trim(),
    [nickname, avatar, bio, gender, birthday, baseline]
  );

  const isPreferenceTabDirty = useMemo(
    () =>
      spiciness !== baseline.spiciness ||
      ecoMode !== baseline.ecoMode ||
      silentCall !== baseline.silentCall ||
      autoCoupons !== baseline.autoCoupons ||
      dietaryNotes.trim() !== baseline.dietaryNotes.trim(),
    [spiciness, ecoMode, silentCall, autoCoupons, dietaryNotes, baseline]
  );

  const isAddressTabDirty = useMemo(
    () => JSON.stringify(addresses) !== JSON.stringify(baseline.addresses),
    [addresses, baseline.addresses]
  );

  // Phone binding state
  const [isBindOpen, setIsBindOpen] = useState(false);
  const [bindPhone, setBindPhone] = useState('');
  const [bindCode, setBindCode] = useState('');
  const [bindCountdown, setBindCountdown] = useState(0);
  const [isSendingBind, setIsSendingBind] = useState(false);
  const [isBinding, setIsBinding] = useState(false);
  const [unbindConfirming, setUnbindConfirming] = useState(false);
  const [isUnbinding, setIsUnbinding] = useState(false);
  const [oldPhoneVerified, setOldPhoneVerified] = useState(false);
  const [oldPhoneCode, setOldPhoneCode] = useState('');
  const [oldPhoneCountdown, setOldPhoneCountdown] = useState(0);
  const [isSendingOldCode, setIsSendingOldCode] = useState(false);
  const [isVerifyingOld, setIsVerifyingOld] = useState(false);

  // Address Search, Inline Tag Badge Editor & Delete Guard
  const [addressSearchQuery, setAddressSearchQuery] = useState('');
  const [editingTagAddrId, setEditingTagAddrId] = useState<string | null>(null);
  const [inlineTagDraft, setInlineTagDraft] = useState('');
  const [confirmDeleteAddrId, setConfirmDeleteAddrId] = useState<string | null>(null);

  // Inline Address Add/Edit State
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [addrName, setAddrName] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrTag, setAddrTag] = useState<string>('公司');
  const [addrLocation, setAddrLocation] = useState('');
  const [addrHouseNumber, setAddrHouseNumber] = useState('');
  const [addrDetail, setAddrDetail] = useState('');
  const [addrRemarks, setAddrRemarks] = useState('');
  const [addrLat, setAddrLat] = useState<number | undefined>(undefined);
  const [addrLng, setAddrLng] = useState<number | undefined>(undefined);

  // Progressive disclosure / consolidation states
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [isDietaryPresetsOpen, setIsDietaryPresetsOpen] = useState(false);
  const [isAddressSearchOpen, setIsAddressSearchOpen] = useState(false);
  const [isPresetMenuOpen, setIsPresetMenuOpen] = useState(false);
  const [isTechDetailsOpen, setIsTechDetailsOpen] = useState(false);
  const presetMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPresetMenuOpen) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (
        isPresetMenuOpen &&
        presetMenuRef.current &&
        !presetMenuRef.current.contains(e.target as Node)
      ) {
        setIsPresetMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPresetMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isPresetMenuOpen]);

  useEffect(() => {
    if (!activeWindowTab) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPresetMenuOpen) {
        setActiveWindowTab(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [activeWindowTab, isPresetMenuOpen]);

  // Security Token & Sync States
  const [hwToken, setHwToken] = useState(() => getDemoDeviceHash());
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(() =>
    new Date().toLocaleTimeString('zh-CN', { hour12: false })
  );
  const [isRadarLinkActive, setIsRadarLinkActive] = useState(true);
  const [isNotificationOn, setIsNotificationOn] = useState<boolean>(() =>
    safeGetStorage<boolean>('obsidian_member_notification_on', true)
  );
  const [financeFilter, setFinanceFilter] = useState<'all' | 'recharge' | 'expense' | 'reward'>(
    'all'
  );
  const [selectedRechargeAmount, setSelectedRechargeAmount] = useState<number>(100);
  const [isRecharging, setIsRecharging] = useState(false);

  const RECHARGE_TIERS = [
    { amount: 50, bonus: 0, label: '基础储值' },
    { amount: 100, bonus: 10, label: '赠 ¥10' },
    { amount: 200, bonus: 25, label: '赠 ¥25' },
    { amount: 500, bonus: 80, label: '赠 ¥80' }
  ] as const;

  const balance = userProfile.balance ?? 0;
  const points = userProfile.points ?? 0;

  const toggleMemberNotification = () => {
    setIsNotificationOn((prev) => {
      const next = !prev;
      safeSetStorage('obsidian_member_notification_on', next);
      toast.info(
        next ? '会员通知已开启：订单与黑卡特权动态将实时提醒' : '会员通知已关闭：将不再接收实时推送'
      );
      return next;
    });
  };

  const handlePrimaryLinkToggle = () => {
    if (onOpenCloudMonitor) {
      onOpenCloudMonitor();
      return;
    }
    setIsRadarLinkActive((prev) => {
      const next = !prev;
      toast.info(
        next ? '实时参数联动已开启' : '已切换为手动同步模式',
        next ? `云端与 POS 参数保持实时监听（${lastSyncTime}）` : '修改资料后可点击底部保存条手动下发'
      );
      return next;
    });
  };

  const syncToTruckEngine = (list: UserAddress[]) => {
    try {
      const converted: DeliveryAddressItem[] = list.map((a, idx) => ({
        id: a.id || `addr-${idx}`,
        title: a.address,
        detail: a.houseNumber ? `${a.detail} ${a.houseNumber}`.trim() : a.detail,
        houseNumber: a.houseNumber || '',
        receiverName: a.name,
        receiverPhone: a.phone,
        tag: a.tag,
        remarks: a.remarks || '',
        isDefault: !!a.isDefault,
        latitude: a.latitude || 31.2435,
        longitude: a.longitude || 121.469,
        createdAt: a.createdAt || new Date().toLocaleString()
      }));
      saveAddresses(converted);
    } catch (err) {
      console.error('Failed to sync addresses to truckLocationEngine', err);
    }
  };

  useEffect(() => {
    if (bindCountdown <= 0) return;
    const t = setTimeout(() => setBindCountdown((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [bindCountdown]);

  useEffect(() => {
    if (oldPhoneCountdown <= 0) return;
    const t = setTimeout(() => setOldPhoneCountdown((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [oldPhoneCountdown]);

  useEffect(() => {
    if (!confirmDeleteAddrId) return;
    const t = setTimeout(() => setConfirmDeleteAddrId(null), 3500);
    return () => clearTimeout(t);
  }, [confirmDeleteAddrId]);

  const handleDiscardChanges = () => {
    setNickname(baseline.nickname);
    setAvatar(baseline.avatar);
    setBio(baseline.bio);
    setGender(baseline.gender);
    setBirthday(baseline.birthday);
    setSpiciness(baseline.spiciness);
    setEcoMode(baseline.ecoMode);
    setSilentCall(baseline.silentCall);
    setAutoCoupons(baseline.autoCoupons);
    setDietaryNotes(baseline.dietaryNotes);
    setAddresses(baseline.addresses);
    setIsAddingAddress(false);
    setEditingAddress(null);
    setEditingTagAddrId(null);
    setInlineTagDraft('');
    setConfirmDeleteAddrId(null);
    toast.info('已还原修改', '所有字段已恢复至上次保存状态');
  };

  const handleSendBindCode = async () => {
    const clean = bindPhone.replace(/\D/g, '');
    if (clean.length !== 11) {
      toast.error('手机号格式不正确', '请输入 11 位手机号码');
      return;
    }
    if (phone && !oldPhoneVerified) {
      toast.warning('请先验证旧手机号', '通过旧号短信校验后才能获取新号验证码');
      return;
    }
    setIsSendingBind(true);
    const res = await sendSmsCode(clean, 'bind');
    setIsSendingBind(false);
    if (!res.ok) {
      toast.error('验证码发送失败', res.message || '请稍后重试');
      return;
    }
    setBindCountdown(res.cooldownSeconds && res.cooldownSeconds > 0 ? res.cooldownSeconds : 60);
    if (res.devCode) {
      setBindCode(res.devCode);
      toast.info(`【演示通道】验证码 ${res.devCode}`, '已自动填入演示验证码');
    } else {
      toast.success('验证码已发送', `请查收 ${clean.slice(0, 3)}****${clean.slice(-4)} 的短信`);
    }
  };

  const handleConfirmBind = async () => {
    const clean = bindPhone.replace(/\D/g, '');
    if (clean.length !== 11) {
      toast.error('手机号格式不正确', '请输入 11 位手机号码');
      return;
    }
    if (!/^\d{6}$/.test(bindCode.trim())) {
      toast.error('验证码格式不正确', '请输入 6 位数字验证码');
      return;
    }
    if (phone && !oldPhoneVerified) {
      toast.warning('请先验证旧手机号', '通过旧号短信校验后才能更换新号');
      return;
    }
    setIsBinding(true);
    const res = await verifySmsCode(clean, bindCode.trim(), 'bind', userProfile.uid);
    setIsBinding(false);
    if (!res.ok) {
      toast.error('绑定失败', res.message || '验证码校验未通过');
      return;
    }
    setPhone(clean);
    setIsBindOpen(false);
    setBindCode('');
    onProfileUpdated({ ...userProfile, phone: clean, cloudSyncedAt: new Date().toISOString() });
    toast.success('手机号已绑定', `账号已与 ${clean.slice(0, 3)}****${clean.slice(-4)} 绑定`);
  };

  const openBindPanel = () => {
    setBindPhone('');
    setBindCode('');
    setBindCountdown(0);
    setOldPhoneCode('');
    setOldPhoneCountdown(0);
    setOldPhoneVerified(!phone);
    setUnbindConfirming(false);
    setIsBindOpen(true);
  };

  const closeBindPanel = () => {
    setIsBindOpen(false);
    setBindPhone('');
    setBindCode('');
    setBindCountdown(0);
    setOldPhoneCode('');
    setOldPhoneCountdown(0);
    setOldPhoneVerified(false);
    setUnbindConfirming(false);
  };

  const handleSendOldCode = async () => {
    const clean = (phone || '').replace(/\D/g, '');
    if (clean.length !== 11) {
      toast.error('当前档案手机号无效', '无法发送旧号验证码');
      return;
    }
    setIsSendingOldCode(true);
    const res = await sendSmsCode(clean, 'login');
    setIsSendingOldCode(false);
    if (!res.ok) {
      toast.error('验证码发送失败', res.message || '请稍后重试');
      return;
    }
    setOldPhoneCountdown(res.cooldownSeconds && res.cooldownSeconds > 0 ? res.cooldownSeconds : 60);
    if (res.devCode) {
      setOldPhoneCode(res.devCode);
      toast.info(`【演示通道】验证码 ${res.devCode}`, '已自动填入演示验证码');
    } else {
      toast.success('验证码已发送', `请查收旧号 ${clean.slice(0, 3)}****${clean.slice(-4)} 的短信`);
    }
  };

  const handleVerifyOldPhone = async () => {
    const clean = (phone || '').replace(/\D/g, '');
    if (!/^\d{6}$/.test(oldPhoneCode.trim())) {
      toast.error('验证码格式不正确', '请输入 6 位旧号验证码');
      return;
    }
    setIsVerifyingOld(true);
    const res = await verifySmsCode(clean, oldPhoneCode.trim(), 'login', userProfile.uid);
    setIsVerifyingOld(false);
    if (!res.ok) {
      toast.error('旧号验证未通过', res.message || '验证码错误或已过期');
      return;
    }
    setOldPhoneVerified(true);
    toast.success('旧号验证通过', '现在可以设置新手机号');
  };

  const handleUnbindPhone = async () => {
    if (!userProfile.uid) {
      toast.warning('当前为本地档案，暂不支持解绑');
      return;
    }
    if (!unbindConfirming) {
      setUnbindConfirming(true);
      return;
    }
    setIsUnbinding(true);
    try {
      const { error } = await wbDb
        .from('profiles')
        .update({ phone: null, updated_at: new Date().toISOString() })
        .eq('uid', userProfile.uid);
      if (error) throw error;
      setPhone('');
      closeBindPanel();
      onProfileUpdated({ ...userProfile, phone: '' });
      toast.success('已解绑手机号');
    } catch (err) {
      toast.error('解绑失败', (err as Error)?.message || '请稍后重试');
    } finally {
      setIsUnbinding(false);
    }
  };

  const handleSaveAndSync = async () => {
    setIsSyncing(true);

    const trimmedNickname = nickname.trim() || '张伟 (店长)';
    const trimmedBio = bio.trim();
    const updatedPref: UserPreferences = {
      spiciness,
      cutlery: ecoMode ? 'eco' : 'needed',
      autoApplyCoupons: autoCoupons,
      radarTracking: !silentCall,
      smsNotification: silentCall,
      dietaryNote: dietaryNotes.trim() || '无特殊过敏原'
    };

    const updatedProfile: UserProfile = {
      ...userProfile,
      nickname: trimmedNickname,
      phone: phone || userProfile.phone,
      avatar,
      bio: trimmedBio,
      gender,
      birthday,
      balance,
      points,
      addresses,
      preferences: updatedPref,
      cloudSyncedAt: new Date().toISOString()
    };

    const nextBaseline: EditableSnapshot = {
      nickname: trimmedNickname,
      avatar,
      bio: trimmedBio,
      gender,
      birthday,
      spiciness,
      ecoMode,
      silentCall,
      autoCoupons,
      dietaryNotes: updatedPref.dietaryNote || '无特殊过敏原',
      addresses
    };

    try {
      const res = await syncUserProfileToCloud(updatedProfile);
      onProfileUpdated(res.profile);
      syncToTruckEngine(addresses);
      setBaseline(nextBaseline);
      setLastSyncTime(new Date().toLocaleTimeString('zh-CN', { hour12: false }));
      toast.success('资料保存成功', '会员资料与参数设置已同步生效');
    } catch {
      onProfileUpdated(updatedProfile);
      syncToTruckEngine(addresses);
      setBaseline(nextBaseline);
      setLastSyncTime(new Date().toLocaleTimeString('zh-CN', { hour12: false }));
      toast.info('本地更新成功', '参数已保存并在本地缓存生效');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleReissueKey = () => {
    const newToken = 'fp_sec_' + Math.random().toString(36).substring(2, 8) + '#pos';
    setHwToken(newToken);
    toast.success('安全凭据重签成功', `硬件指纹密钥已更新为：${newToken}`);
  };

  const handleConfirmRecharge = async () => {
    if (isGuestUid) {
      toast.warning('当前为访客模式', '请先返回会员中心登录账号后再进行储值充值');
      return;
    }
    const tier = RECHARGE_TIERS.find((t) => t.amount === selectedRechargeAmount) || RECHARGE_TIERS[1];
    setIsRecharging(true);
    try {
      const nowLabel = new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).replace(/\//g, '-');
      const afterRecharge = Number((balance + tier.amount).toFixed(2));
      const afterTotal = Number((afterRecharge + tier.bonus).toFixed(2));
      const newEntries: UserWalletTransaction[] = [
        ...(tier.bonus > 0
          ? [
              {
                id: `w-bonus-${Date.now()}`,
                type: 'reward' as const,
                title: `储值满赠返现 (+¥${tier.bonus})`,
                amount: tier.bonus,
                balanceAfter: afterTotal,
                timestamp: nowLabel
              }
            ]
          : []),
        {
          id: `w-chg-${Date.now()}`,
          type: 'recharge' as const,
          title: '账户在线快捷储值',
          amount: tier.amount,
          balanceAfter: afterRecharge,
          timestamp: nowLabel
        }
      ];
      const nextProfile: UserProfile = {
        ...userProfile,
        balance: afterTotal,
        points: points + tier.amount,
        walletHistory: [...newEntries, ...(userProfile.walletHistory || [])],
        cloudSyncedAt: new Date().toISOString()
      };
      onProfileUpdated(nextProfile);
      await syncUserProfileToCloud(nextProfile).catch(() => {});
      setLastSyncTime(new Date().toLocaleTimeString('zh-CN', { hour12: false }));
      toast.success(
        '储值成功',
        tier.bonus > 0
          ? `已到账 ¥${tier.amount + tier.bonus}（含满赠 ¥${tier.bonus}），当前余额 ¥${afterTotal.toFixed(2)}`
          : `已到账 ¥${tier.amount}，当前余额 ¥${afterTotal.toFixed(2)}`
      );
    } finally {
      setIsRecharging(false);
    }
  };

  const handleSaveAddress = () => {
    if (!addrLocation.trim()) {
      toast.warning('请输入地址', '小区/写字楼或地址位置不能为空');
      return;
    }

    const finalTag = addrTag.trim() || '常用';

    if (editingAddress) {
      const updated = addresses.map((a) =>
        a.id === editingAddress.id
          ? {
              ...a,
              name: addrName.trim() || nickname,
              phone: addrPhone.trim() || phone,
              tag: finalTag,
              address: addrLocation.trim(),
              houseNumber: addrHouseNumber.trim(),
              detail: addrDetail.trim() || addrLocation.trim(),
              remarks: addrRemarks.trim(),
              latitude: addrLat || a.latitude || 31.2435,
              longitude: addrLng || a.longitude || 121.469
            }
          : a
      );
      setAddresses(updated);
      toast.info('地址已更新至草稿', '点击底部「保存更改」即可同步生效');
    } else {
      const newAddr: UserAddress = {
        id: `addr-${Date.now()}`,
        name: addrName.trim() || nickname,
        phone: addrPhone.trim() || phone,
        tag: finalTag,
        address: addrLocation.trim(),
        houseNumber: addrHouseNumber.trim(),
        detail: addrDetail.trim() || addrLocation.trim(),
        remarks: addrRemarks.trim(),
        isDefault: addresses.length === 0,
        latitude: addrLat || 31.2435,
        longitude: addrLng || 121.469,
        createdAt: new Date().toLocaleString()
      };
      setAddresses([newAddr, ...addresses]);
      toast.info('新地址已加入草稿', '点击底部「保存更改」即可同步生效');
    }

    setIsAddingAddress(false);
    setEditingAddress(null);
    setAddrName('');
    setAddrPhone('');
    setAddrLocation('');
    setAddrHouseNumber('');
    setAddrDetail('');
    setAddrRemarks('');
    setAddrLat(undefined);
    setAddrLng(undefined);
  };

  const handleDeleteAddress = (id: string) => {
    if (confirmDeleteAddrId !== id) {
      setConfirmDeleteAddrId(id);
      return;
    }
    const nextList = addresses.filter((a) => a.id !== id);
    if (nextList.length > 0 && !nextList.some((a) => a.isDefault)) {
      nextList[0] = { ...nextList[0], isDefault: true };
    }
    setAddresses(nextList);
    setConfirmDeleteAddrId(null);
    toast.info('地址已移除', '点击底部「保存更改」确认同步');
  };

  const handleSetDefaultAddress = (id: string) => {
    const nextList = addresses.map((a) => ({
      ...a,
      isDefault: a.id === id
    }));
    setAddresses(nextList);
    toast.info('默认地址已切换', '点击底部「保存更改」同步至默认点单设置');
  };

  const handleApplyAddressTagBadge = (id: string, rawTag: string) => {
    const cleaned = rawTag.trim();
    if (!cleaned) {
      toast.warning('请输入标签徽章', '徽章名称不能为空');
      return;
    }
    const nextTag = cleaned.slice(0, 8);
    setAddresses((prev) =>
      prev.map((a) => (a.id === id ? { ...a, tag: nextTag } : a))
    );
    setEditingTagAddrId(null);
    setInlineTagDraft('');
    toast.success('已设置地址标签徽章', `徽章已更新为「${nextTag}」，记得保存更改`);
  };

  const handleSimulateGpsAutofill = () => {
    const mockLat = 31.2435 + (Math.random() - 0.5) * 0.008;
    const mockLng = 121.469 + (Math.random() - 0.5) * 0.008;
    setAddrLat(Number(mockLat.toFixed(5)));
    setAddrLng(Number(mockLng.toFixed(5)));
    setAddrLocation('静安大悦城北座站台（示例）');
    setAddrDetail('静安区西藏北路166号北座');
    setAddrHouseNumber('1F 中庭交接站');
    toast.info('演示坐标已填入', `${mockLat.toFixed(4)}°N, ${mockLng.toFixed(4)}°E`);
  };

  const handleSimulateRadarCheck = (addr: UserAddress) => {
    const distMeters = Math.floor(450 + Math.random() * 600);
    const etaMinutes = Math.max(3, Math.ceil(distMeters / 180));
    toast.info(
      '雷达测距就绪',
      `【${addr.address}】距当前餐车约 ${distMeters} 米 · 预估送达 ${etaMinutes} 分钟`
    );
  };

  const handleCopyAddressInfo = (addr: UserAddress) => {
    const payload = `【收货人】${addr.name} (${addr.phone})\n【送达地址】${addr.address} ${addr.detail} ${addr.houseNumber || ''}\n【备注】${addr.remarks || '无'}`;
    void navigator.clipboard?.writeText(payload).catch(() => {});
    toast.success('地址信息已复制', '收件人姓名、电话与完整地址已复制');
  };

  const handleApplyPreset = (preset: (typeof PRESET_DISTRICT_ADDRESSES)[0]) => {
    setAddrName(nickname);
    setAddrPhone(phone);
    setAddrTag(preset.tag);
    setAddrLocation(preset.address);
    setAddrDetail(preset.detail);
    setAddrHouseNumber(preset.houseNumber);
    setAddrRemarks(preset.remarks);
    setAddrLat(preset.lat);
    setAddrLng(preset.lng);
    setIsAddingAddress(true);
    setEditingAddress(null);
    toast.info('已载入商圈预设', `${preset.address}，点击「保存地址」即可添加`);
  };

  const handleResetToInitial = () => {
    setSpiciness('mild');
    setEcoMode(true);
    setSilentCall(false);
    setAutoCoupons(true);
    setDietaryNotes('无特殊过敏原');
    toast.info('偏好已恢复默认', '可在底部点击「保存更改」确认应用');
  };

  const dietaryPresets = [
    '免香菜',
    '不要葱蒜',
    '少油少盐',
    '不要生洋葱',
    '花生过敏',
    '海鲜慎选',
    '分装打包',
    '需备温水'
  ];

  const handleToggleDietaryTag = (tag: string) => {
    if (dietaryNotes.includes(tag)) {
      const next = dietaryNotes
        .split(/[，,]/)
        .map((s) => s.trim())
        .filter((s) => s && s !== tag)
        .join('，');
      setDietaryNotes(next || '无特殊过敏原');
    } else if (dietaryNotes === '无特殊过敏原' || !dietaryNotes.trim()) {
      setDietaryNotes(tag);
    } else {
      setDietaryNotes(`${dietaryNotes}，${tag}`);
    }
  };

  const filteredAddresses = useMemo(() => {
    return addresses.filter((a) => {
      if (addressSearchQuery.trim()) {
        const query = addressSearchQuery.trim().toLowerCase();
        const fullStr = `${a.tag || ''} ${a.name} ${a.phone} ${a.address} ${a.detail} ${a.houseNumber || ''} ${a.remarks || ''}`.toLowerCase();
        return fullStr.includes(query);
      }
      return true;
    });
  }, [addresses, addressSearchQuery]);

  const avatarPresets = ['🧑‍💻', '👨‍💼', '🧔‍♂️', '👩‍🍳', '🧑‍🎨', '😎', '⚡', '☕'];

  const rawUid = String(userProfile.uid || '');
  const isGuestUid = !rawUid || rawUid.toLowerCase() === 'guest';
  const uidTail = isGuestUid ? 'GUEST' : rawUid.slice(-4).toUpperCase();
  const cloudUid = isGuestUid
    ? 'visitor#local'
    : phone
      ? `member_${phone}`
      : `member_${uidTail.toLowerCase()}`;

  const boundDeviceCount = userProfile.boundDevices?.length ?? 1;

  const walletTransactions: UserWalletTransaction[] = useMemo(() => {
    if (userProfile.walletHistory && userProfile.walletHistory.length > 0) {
      return userProfile.walletHistory;
    }
    return [];
  }, [userProfile.walletHistory]);

  const tabsList = [
    {
      id: 'tab-profile' as const,
      label: '基本资料',
      description: '头像、昵称、签名与绑定手机',
      icon: User,
      isDirty: isProfileTabDirty
    },
    {
      id: 'tab-preference' as const,
      label: '就餐偏好',
      description: '默认辣度、餐具优惠与忌口备注',
      icon: Sliders,
      isDirty: isPreferenceTabDirty
    },
    {
      id: 'tab-address' as const,
      label: '常用地址',
      description: `收货地址管理（${addresses.length} 处）`,
      icon: MapPin,
      isDirty: isAddressTabDirty
    },
    {
      id: 'tab-security' as const,
      label: '安全凭据',
      description: `绑定设备（${boundDeviceCount} 台）与凭证签发`,
      icon: ShieldCheck,
      isDirty: false
    },
    {
      id: 'tab-finance' as const,
      label: '财务对账',
      description: `储值流水与返现明细（${walletTransactions.length} 笔）`,
      icon: Wallet,
      isDirty: false
    }
  ];

  const dirtyTabLabels = tabsList.filter((t) => t.isDirty).map((t) => t.label);
  const currentWindowTabItem = activeWindowTab
    ? tabsList.find((t) => t.id === activeWindowTab) || null
    : null;

  const filteredTransactions = useMemo(() => {
    return walletTransactions.filter((tx) => {
      if (financeFilter === 'all') return true;
      if (financeFilter === 'recharge') return tx.type === 'recharge' || tx.type === 'refund';
      return tx.type === financeFilter;
    });
  }, [walletTransactions, financeFilter]);

  const isAvatarUrl = Boolean(avatar && /^(https?:|\/|data:)/.test(avatar) && !avatarImgError);
  const displayAvatarFallback =
    avatar && !/^(https?:|\/|data:)/.test(avatar)
      ? avatar
      : (nickname || 'U').trim().slice(0, 1).toUpperCase();

  return (
    <div
      className={`w-full min-h-screen bg-[#f5f4f0] text-[#141413] select-none font-sans ${
        hasUnsavedChanges ? 'pb-28' : 'pb-12'
      }`}
    >
      <UnifiedPageHeader
        title={currentWindowTabItem ? currentWindowTabItem.label : '资料设置'}
        onBack={currentWindowTabItem ? () => setActiveWindowTab(null) : onBack}
        backLabel={currentWindowTabItem ? '返回控制台' : '返回中心'}
        statusTone={isRadarLinkActive ? 'online' : 'offline'}
        statusTitle={
          isSyncing
            ? '正在同步配置…'
            : hasUnsavedChanges
              ? '存在未保存修改'
              : `参数在线 · ${lastSyncTime}`
        }
        primaryActive={isRadarLinkActive}
        onPrimaryClick={handlePrimaryLinkToggle}
        primaryTitle={onOpenCloudMonitor ? '云端实时监控' : '切换实时参数联动'}
        isRefreshing={isSyncing}
        onRefreshClick={handleSaveAndSync}
        refreshTitle={hasUnsavedChanges ? '保存并同步修改' : '同步最新配置'}
        refreshBadge={hasUnsavedChanges}
        notificationOn={isNotificationOn}
        onNotificationClick={toggleMemberNotification}
        stickyClassName={headerStickyClass || 'sticky top-0 z-30'}
      />

      <div className="w-full mx-auto px-3.5 pt-3.5 flex flex-col gap-3">
        {!currentWindowTabItem ? (
          <>
            {/* 顶部会员概览白卡（轻量化：去重同步时间，头像可点选直达更换，余额可点选直达对账） */}
            <SectionCard className="!p-3.5 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveWindowTab('tab-profile');
                    setIsAvatarPickerOpen(true);
                  }}
              title="更换数字头像"
              aria-label="更换数字头像"
              className="relative shrink-0 cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-full bg-neutral-100 border border-black/[0.07] group-hover:border-emerald-500/50 flex items-center justify-center overflow-hidden transition">
                {isAvatarUrl ? (
                  <img
                    src={avatar}
                    alt={nickname}
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarImgError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-bold text-neutral-700 leading-none">
                    {displayAvatarFallback}
                  </span>
                )}
              </div>
              <span
                aria-hidden="true"
                className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-white ring-2 ring-white"
              >
                <Check className="w-2.5 h-2.5" strokeWidth={3} />
              </span>
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-sm font-extrabold text-[#141413] tracking-tight truncate">
                  {nickname || '张伟 (店长)'}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold shrink-0 ${
                    isGuestUid
                      ? 'bg-[#f1efe9] text-neutral-500'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {isGuestUid ? '访客' : 'VIP'}
                </span>
                <span className="text-[11px] font-medium text-neutral-400 tabular-nums shrink-0">
                  {uidTail}
                </span>
              </div>
              <div className="text-[11px] text-neutral-500 mt-1 tabular-nums font-medium truncate">
                {phone || '未绑定手机号'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveWindowTab('tab-finance')}
            title="查看资产与对账明细"
            className="text-right shrink-0 pl-2.5 pr-1 py-1 -my-1 rounded-xl border-l border-black/[0.06] hover:bg-[#f7f6f2] transition cursor-pointer flex items-center gap-1 group"
          >
            <div>
              <div className="text-[15px] font-black text-[#141413] tabular-nums leading-none">
                ¥{balance.toFixed(2)}
              </div>
              <div className="text-[11px] font-medium text-neutral-400 mt-1 tabular-nums">
                {points} 积分
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-300 group-hover:text-neutral-500 transition" />
          </button>
        </SectionCard>

        {/* ==================== 5 分区内嵌窗口入口列表 ==================== */}
        <SectionCard divided>
          <div className="py-3 flex items-center justify-between">
            <h2 className="text-[13px] font-extrabold text-[#141413]">资料与参数控制台</h2>
            <span className="text-[11px] text-neutral-400">点击进入内嵌窗口</span>
          </div>
          {tabsList.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                id={`tab-nav-${t.id}`}
                data-tab={t.id}
                onClick={() => setActiveWindowTab(t.id)}
                className="w-full py-3.5 hover:bg-[#faf9f6] transition flex items-center justify-between gap-2.5 text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-xl bg-[#f1efe9] text-neutral-700 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#141413] truncate">
                        {t.label}
                      </span>
                      {t.isDirty && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[11px] font-bold leading-none shrink-0">
                          未保存
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-0.5 truncate">
                      {t.description}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />
              </button>
            );
          })}
        </SectionCard>
          </>
        ) : (
          (() => {
            const WindowIcon = currentWindowTabItem.icon;
            const renderWindowBody = () => {
              if (activeWindowTab === 'tab-profile') {
                return (
                  <div className="px-4 divide-y divide-black/[0.05]">
              {/* 数字头像（默认折叠为紧凑单行，点击按需展开 8 款网格） */}
              <div className="py-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#141413]">数字头像</div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      点选预设图标，保存后全端同步
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAvatarPickerOpen((prev) => !prev)}
                    aria-expanded={isAvatarPickerOpen}
                    className="h-9 px-3 rounded-xl bg-[#f1efe9] hover:bg-neutral-200/80 text-[#141413] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition shrink-0"
                  >
                    <span className="text-base leading-none">{displayAvatarFallback}</span>
                    <span>{isAvatarPickerOpen ? '收起' : '更换'}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-neutral-500 transition-transform ${
                        isAvatarPickerOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                </div>

                {isAvatarPickerOpen && (
                  <div
                    className="grid grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-black/[0.05] animate-in fade-in"
                    id="avatar-container"
                  >
                    {avatarPresets.map((icon, idx) => {
                      const isSelected = avatar === icon;
                      return (
                        <button
                          key={icon}
                          type="button"
                          data-avatar-id={idx + 1}
                          onClick={() => setAvatar(icon)}
                          aria-label={`选择头像 ${icon}`}
                          aria-pressed={isSelected}
                          className={`h-11 rounded-xl flex items-center justify-center text-xl transition cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-50 ring-2 ring-emerald-600 shadow-xs'
                              : 'bg-[#f7f6f2] hover:bg-[#efede6] border border-black/[0.05]'
                          }`}
                        >
                          {icon}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 公开昵称 */}
              <div className="py-3.5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div>
                    <label className="text-xs font-bold text-[#141413] block" htmlFor="nickname">
                      公开昵称
                    </label>
                    <span className="text-[11px] text-neutral-400">展示在订单叫号与雷达卡片</span>
                  </div>
                  <span className="text-[11px] text-neutral-400 tabular-nums shrink-0">
                    {nickname.length}/20
                  </span>
                </div>
                <input
                  id="nickname"
                  type="text"
                  value={nickname}
                  maxLength={20}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="输入您的称呼"
                  className="w-full h-10 px-3 rounded-xl bg-[#f7f6f2] border border-black/[0.07] focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 outline-none text-xs text-[#141413] transition tabular-nums placeholder:text-neutral-400"
                />
              </div>

              {/* 个性签名（并入同一档案卡） */}
              <div className="py-3.5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div>
                    <label className="text-xs font-bold text-[#141413] block" htmlFor="bio">
                      个性签名
                    </label>
                    <span className="text-[11px] text-neutral-400">展示在商家备餐视图</span>
                  </div>
                  <span
                    className={`text-[11px] tabular-nums shrink-0 ${
                      bio.length >= 55 ? 'text-amber-600 font-bold' : 'text-neutral-400'
                    }`}
                  >
                    {bio.length}/60
                  </span>
                </div>
                <textarea
                  id="bio"
                  rows={2}
                  value={bio}
                  maxLength={60}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="写点什么介绍你的口味偏好..."
                  className="w-full p-3 rounded-xl bg-[#f7f6f2] border border-black/[0.07] focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 outline-none text-xs leading-relaxed text-[#141413] transition resize-none placeholder:text-neutral-400"
                />
              </div>

              {/* 绑定手机号 */}
              <div className="py-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#141413]">绑定手机号</span>
                      {phone ? (
                        <span className="text-[11px] font-semibold text-emerald-700 inline-flex items-center gap-0.5">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          已验证
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-amber-600 inline-flex items-center gap-0.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          未绑定
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-neutral-400 block mt-0.5">
                      用于账号登录与取餐动态提醒
                    </span>
                  </div>

                  {!isBindOpen && (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-semibold text-neutral-700 tabular-nums">
                        {phone ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : '未绑定'}
                      </span>
                      <button
                        type="button"
                        onClick={openBindPanel}
                        className="h-9 px-3 rounded-xl bg-[#f1efe9] hover:bg-neutral-200/80 text-[#141413] text-xs font-bold transition cursor-pointer"
                      >
                        {phone ? '管理' : '去绑定'}
                      </button>
                    </div>
                  )}
                </div>

                {isBindOpen && (
                  <div className="mt-3 rounded-xl border border-black/[0.08] bg-[#f7f6f2] p-3 space-y-2.5 animate-in fade-in">
                    {phone && (
                      <div className="space-y-2 pb-2.5 border-b border-black/[0.06]">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#141413]">
                            验证旧号 {phone.slice(0, 3)}****{phone.slice(-4)}
                          </span>
                          {oldPhoneVerified && (
                            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              已通过
                            </span>
                          )}
                        </div>
                        {!oldPhoneVerified && (
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              inputMode="numeric"
                              maxLength={6}
                              value={oldPhoneCode}
                              onChange={(e) =>
                                setOldPhoneCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                              }
                              placeholder="6 位验证码"
                              className="w-28 h-9 px-2.5 rounded-lg border border-black/[0.1] bg-white text-xs tabular-nums tracking-widest outline-none focus:border-emerald-600"
                            />
                            <button
                              type="button"
                              disabled={oldPhoneCountdown > 0 || isSendingOldCode}
                              onClick={handleSendOldCode}
                              className="h-9 px-3 rounded-lg bg-white border border-black/[0.08] text-neutral-700 text-xs font-bold disabled:opacity-40 cursor-pointer"
                            >
                              {isSendingOldCode
                                ? '发送中'
                                : oldPhoneCountdown > 0
                                  ? `${oldPhoneCountdown}s`
                                  : '获取验证码'}
                            </button>
                            <button
                              type="button"
                              disabled={isVerifyingOld}
                              onClick={handleVerifyOldPhone}
                              className="h-9 px-3 rounded-lg bg-emerald-600 text-white text-xs font-bold disabled:opacity-40 cursor-pointer"
                            >
                              {isVerifyingOld ? '校验中' : '验证旧号'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <div
                      className={`space-y-2 ${
                        phone && !oldPhoneVerified ? 'opacity-40 pointer-events-none' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="tel"
                          inputMode="numeric"
                          maxLength={11}
                          value={bindPhone}
                          onChange={(e) =>
                            setBindPhone(e.target.value.replace(/\D/g, '').slice(0, 11))
                          }
                          placeholder="输入 11 位新手机号"
                          className="flex-1 h-9 px-3 rounded-lg border border-black/[0.1] bg-white text-xs tabular-nums outline-none focus:border-emerald-600"
                        />
                        <button
                          type="button"
                          disabled={bindCountdown > 0 || isSendingBind}
                          onClick={handleSendBindCode}
                          className="h-9 px-3 rounded-lg bg-white border border-black/[0.08] text-neutral-700 text-xs font-bold disabled:opacity-40 cursor-pointer shrink-0"
                        >
                          {isSendingBind
                            ? '发送中'
                            : bindCountdown > 0
                              ? `${bindCountdown}s`
                              : '获取验证码'}
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={bindCode}
                          onChange={(e) =>
                            setBindCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                          }
                          placeholder="6 位验证码 (演示: 123456)"
                          className="flex-1 h-9 px-3 rounded-lg border border-black/[0.1] bg-white text-xs tabular-nums tracking-wider outline-none focus:border-emerald-600"
                        />
                        <button
                          type="button"
                          disabled={isBinding}
                          onClick={handleConfirmBind}
                          className="h-9 px-3.5 rounded-lg bg-emerald-600 text-white text-xs font-bold disabled:opacity-40 cursor-pointer shrink-0"
                        >
                          {isBinding ? '绑定中' : '确认绑定'}
                        </button>
                        <button
                          type="button"
                          onClick={closeBindPanel}
                          className="h-9 px-2 text-xs text-neutral-500 hover:text-[#141413] cursor-pointer shrink-0"
                        >
                          取消
                        </button>
                      </div>
                    </div>

                    {phone && (
                      <div className="pt-2 border-t border-black/[0.06] flex items-center justify-between">
                        <span className="text-[11px] text-neutral-400">如需移除当前绑定</span>
                        <button
                          type="button"
                          disabled={!userProfile.uid || isUnbinding}
                          onClick={handleUnbindPhone}
                          className={`text-[11px] underline underline-offset-2 disabled:opacity-40 cursor-pointer ${
                            unbindConfirming
                              ? 'font-bold text-rose-600'
                              : 'text-neutral-500 hover:text-rose-600'
                          }`}
                        >
                          {isUnbinding ? '解绑中...' : unbindConfirming ? '再次点击确认解绑' : '解绑手机号'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 性别称谓 */}
              <div className="py-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-[#141413] block">性别称谓</span>
                  <span className="text-[11px] text-neutral-400">影响取餐叫号与称呼</span>
                </div>
                <div className="inline-flex rounded-xl bg-[#f1efe9] p-1 shrink-0">
                  {[
                    { val: 'secret', label: '保密' },
                    { val: 'male', label: '先生' },
                    { val: 'female', label: '女士' }
                  ].map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => setGender(item.val as 'secret' | 'male' | 'female')}
                      className={`h-8 px-3 rounded-lg text-xs font-bold cursor-pointer transition ${
                        gender === item.val
                          ? 'bg-white text-[#141413] shadow-xs'
                          : 'text-neutral-500 hover:text-[#141413]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 生日日期（通栏纵排对齐） */}
              <div className="py-3.5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label className="text-xs font-bold text-[#141413] block" htmlFor="birthday">
                    生日日期
                  </label>
                  <span className="text-[11px] text-neutral-400">生日当月享专属甜品礼遇</span>
                </div>
                <input
                  id="birthday"
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#f7f6f2] border border-black/[0.07] focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 outline-none text-xs text-[#141413] transition tabular-nums"
                />
              </div>
                  </div>
                );
              }

              if (activeWindowTab === 'tab-preference') {
                return (
                  <div className="px-4 divide-y divide-black/[0.05]" id="tab-panel-preference">
              <div className="py-3.5">
                <SectionHeader
                  title="默认辣度与下单偏好"
                  subtitle="点餐结算时自动带入口味、餐具与卡券策略"
                  right={
                    <button
                      type="button"
                      onClick={handleResetToInitial}
                      className="h-9 px-3 rounded-xl bg-[#f1efe9] hover:bg-neutral-200/80 text-[11px] font-bold text-neutral-700 inline-flex items-center gap-1 cursor-pointer transition"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>恢复默认</span>
                    </button>
                  }
                />
                <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-[#f1efe9] mt-3">
                  {[
                    { id: 'none', label: '免辣', dot: 'bg-neutral-400', activeText: 'text-[#141413]' },
                    { id: 'mild', label: '微辣', dot: 'bg-emerald-500', activeText: 'text-emerald-700' },
                    { id: 'medium', label: '中辣', dot: 'bg-amber-500', activeText: 'text-amber-700' },
                    { id: 'hot', label: '重辣', dot: 'bg-rose-500', activeText: 'text-rose-600' }
                  ].map((item) => {
                    const isSel = spiciness === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSpiciness(item.id as 'none' | 'mild' | 'medium' | 'hot')}
                        className={`h-9 rounded-lg text-xs font-bold cursor-pointer transition flex items-center justify-center gap-1.5 ${
                          isSel
                            ? `bg-white ${item.activeText} shadow-xs ring-1 ring-black/[0.05]`
                            : 'text-neutral-500 hover:text-[#141413]'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full transition-opacity ${item.dot} ${
                            isSel ? 'opacity-100' : 'opacity-45'
                          }`}
                        />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {[
                {
                  icon: Leaf,
                  title: '低碳就餐（免一次性餐具）',
                  sub: '每次环保点单额外获赠 +5 积分',
                  val: ecoMode,
                  set: () => setEcoMode(!ecoMode),
                  tone: 'bg-emerald-50 text-emerald-700'
                },
                {
                  icon: Tag,
                  title: '自动选用最优满减券',
                  sub: '结算时自动计算最大优惠组合',
                  val: autoCoupons,
                  set: () => setAutoCoupons(!autoCoupons),
                  tone: 'bg-sky-50 text-[#0284c7]'
                },
                {
                  icon: BellOff,
                  title: '免电话打扰',
                  sub: '送达时仅通过雷达推送或短信通知',
                  val: silentCall,
                  set: () => setSilentCall(!silentCall),
                  tone: 'bg-amber-50 text-amber-700'
                }
              ].map((row) => {
                const Icon = row.icon;
                return (
                  <div key={row.title} className="py-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${row.tone}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#141413] truncate">{row.title}</div>
                        <div className="text-[11px] text-neutral-400 mt-0.5 truncate">{row.sub}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={row.set}
                      aria-label={row.title}
                      aria-pressed={!!row.val}
                      className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${
                        row.val ? 'bg-emerald-600' : 'bg-neutral-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                          row.val ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
              <div className="py-3.5">
              <SectionHeader
                title="忌口与过敏备注"
                subtitle="自定义后厨备注或展开常用预设快选"
                right={
                  <div className="flex items-center gap-2">
                    {dietaryNotes !== '无特殊过敏原' && dietaryNotes.trim() !== '' && (
                      <button
                        type="button"
                        onClick={() => setDietaryNotes('无特殊过敏原')}
                        className="text-[11px] font-semibold text-neutral-500 hover:text-[#141413] underline underline-offset-2 cursor-pointer"
                      >
                        清空
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsDietaryPresetsOpen((prev) => !prev)}
                      aria-expanded={isDietaryPresetsOpen}
                      className="h-8 px-2.5 rounded-lg bg-[#f1efe9] hover:bg-neutral-200/80 text-[11px] font-bold text-[#141413] inline-flex items-center gap-1 cursor-pointer transition"
                    >
                      <span>常用忌口</span>
                      <ChevronDown
                        className={`w-3 h-3 text-neutral-500 transition-transform ${
                          isDietaryPresetsOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  </div>
                }
              />

              {isDietaryPresetsOpen && (
                <div className="flex flex-wrap gap-1.5 mt-3 animate-in fade-in">
                  {dietaryPresets.map((tag) => {
                    const isIncluded = dietaryNotes.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleToggleDietaryTag(tag)}
                        aria-pressed={isIncluded}
                        className={`h-8 px-2.5 rounded-lg text-xs font-semibold cursor-pointer transition inline-flex items-center gap-1 ${
                          isIncluded
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-600/50'
                            : 'bg-[#f7f6f2] text-neutral-600 border border-black/[0.06] hover:bg-[#efede6]'
                        }`}
                      >
                        {isIncluded && (
                          <Check className="w-3 h-3 text-emerald-600" strokeWidth={2.8} />
                        )}
                        <span>{tag}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <input
                id="dietary-notes"
                type="text"
                value={dietaryNotes}
                onChange={(e) => setDietaryNotes(e.target.value)}
                placeholder="输入其他过敏原或厨房备注..."
                className="mt-3 w-full h-10 px-3 rounded-xl bg-[#f7f6f2] border border-black/[0.07] focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 outline-none text-xs text-[#141413] transition placeholder:text-neutral-400"
              />
              </div>
                  </div>
                );
              }

              if (activeWindowTab === 'tab-address') {
                return (
                  <div className="divide-y divide-black/[0.06]" id="tab-panel-address">
                    <div className="p-4 space-y-2.5">
              <SectionHeader
                title={`常用地址 · ${addresses.length} 处`}
                subtitle="支持地址内自定义标签徽章与默认送达切换"
                right={
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsAddressSearchOpen((prev) => !prev)}
                      aria-expanded={isAddressSearchOpen}
                      aria-label="搜索地址"
                      title="关键词搜索地址"
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center cursor-pointer transition ${
                        isAddressSearchOpen || addressSearchQuery.trim()
                          ? 'bg-emerald-50 border-emerald-600/40 text-emerald-700'
                          : 'bg-[#f7f6f2] border-black/[0.06] text-neutral-600 hover:bg-[#efede6]'
                      }`}
                    >
                      <Search className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      id="btn-add-address"
                      onClick={() => {
                        setIsAddingAddress(true);
                        setEditingAddress(null);
                        setEditingTagAddrId(null);
                        setIsPresetMenuOpen(false);
                        setAddrName(nickname);
                        setAddrPhone(phone);
                        setAddrTag('公司');
                        setAddrLocation('');
                        setAddrHouseNumber('');
                        setAddrDetail('');
                        setAddrRemarks('');
                        setAddrLat(31.2435);
                        setAddrLng(121.469);
                      }}
                      className="h-9 px-3 rounded-xl bg-[#141413] hover:bg-neutral-800 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>新增</span>
                    </button>
                  </div>
                }
              />

              {(isAddressSearchOpen || addressSearchQuery.trim().length > 0) && (
                <div className="relative animate-in fade-in">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={addressSearchQuery}
                    onChange={(e) => setAddressSearchQuery(e.target.value)}
                    placeholder="搜索徽章、联系人、建筑或街道..."
                    className="w-full h-9 pl-8 pr-8 rounded-xl bg-[#f7f6f2] border border-black/[0.06] text-xs outline-none focus:bg-white focus:border-emerald-600 placeholder:text-neutral-400"
                  />
                  {addressSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setAddressSearchQuery('')}
                      aria-label="清空搜索"
                      className="w-6 h-6 rounded-full text-neutral-400 hover:text-neutral-700 flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
                    </div>

            {(isAddingAddress || editingAddress) && (
              <div className="p-4 bg-[#faf9f6] space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between pb-2.5 border-b border-black/[0.06]">
                  <span className="text-xs font-extrabold text-[#141413]">
                    {editingAddress ? '编辑送达地址' : '录入新地址'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {/* 收拢「GPS填充」与「商圈快填」至单一下拉菜单 */}
                    <div ref={presetMenuRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setIsPresetMenuOpen((prev) => !prev)}
                        aria-expanded={isPresetMenuOpen}
                        className="h-9 px-2.5 rounded-xl bg-[#f1efe9] hover:bg-neutral-200/80 text-[#141413] text-[11px] font-bold cursor-pointer inline-flex items-center gap-1"
                      >
                        <Compass className="w-3 h-3 text-emerald-600" />
                        <span>示例快填</span>
                        <ChevronDown
                          className={`w-3 h-3 text-neutral-500 transition-transform ${
                            isPresetMenuOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {isPresetMenuOpen && (
                        <div className="absolute right-0 top-[calc(100%+6px)] w-60 rounded-xl bg-white border border-black/[0.08] shadow-[0_14px_30px_-8px_rgba(20,20,19,0.2)] p-1.5 z-30 space-y-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              handleSimulateGpsAutofill();
                              setIsPresetMenuOpen(false);
                            }}
                            className="w-full px-2.5 py-2 rounded-lg hover:bg-emerald-50 text-left flex items-center gap-2 cursor-pointer transition"
                          >
                            <Crosshair className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <div className="min-w-0">
                              <div className="text-[11px] font-bold text-[#141413]">
                                GPS 演示定位填充
                              </div>
                              <div className="text-[11px] text-neutral-400">生成随机示例坐标</div>
                            </div>
                          </button>
                          <div className="my-1 border-t border-black/[0.06]" />
                          {PRESET_DISTRICT_ADDRESSES.map((preset, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                handleApplyPreset(preset);
                                setIsPresetMenuOpen(false);
                              }}
                              className="w-full px-2.5 py-1.5 rounded-lg hover:bg-[#f7f6f2] text-left flex items-center justify-between gap-2 cursor-pointer transition"
                            >
                              <div className="min-w-0">
                                <div className="text-[11px] font-semibold text-[#141413] truncate">
                                  {preset.address}
                                </div>
                                <div className="text-[11px] text-neutral-400 truncate">
                                  {preset.detail}
                                </div>
                              </div>
                              <span className="text-[11px] text-neutral-400 shrink-0">
                                {preset.tag}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingAddress(false);
                        setEditingAddress(null);
                        setIsPresetMenuOpen(false);
                      }}
                      aria-label="关闭地址编辑"
                      className="w-8 h-8 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 flex items-center justify-center cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { label: '联系人', val: addrName, set: setAddrName, ph: '收货人姓名', span: false },
                    { label: '手机号', val: addrPhone, set: setAddrPhone, ph: '联系电话', span: false },
                    { label: '建筑/商圈', val: addrLocation, set: setAddrLocation, ph: '例: 静安大悦城南座', span: true },
                    { label: '详细街道', val: addrDetail, set: setAddrDetail, ph: '例: 西藏北路166号', span: true },
                    { label: '门牌号', val: addrHouseNumber, set: setAddrHouseNumber, ph: '例: 南座8楼801室', span: false },
                    { label: '交接备注', val: addrRemarks, set: setAddrRemarks, ph: '例: 放前台外卖架', span: false }
                  ].map((f) => (
                    <div key={f.label} className={f.span ? 'col-span-2' : ''}>
                      <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                        {f.label}
                      </label>
                      <input
                        type="text"
                        value={f.val}
                        onChange={(e) => f.set(e.target.value)}
                        placeholder={f.ph}
                        className="w-full h-9 px-3 rounded-lg border border-black/[0.08] bg-neutral-50 focus:bg-white focus:border-emerald-600 text-xs outline-none"
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-2 pt-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-neutral-600 inline-flex items-center gap-1">
                      <Tag className="w-3 h-3 text-emerald-600" />
                      标签徽章
                    </span>
                    {addrLat && addrLng && (
                      <div className="text-[11px] text-neutral-400 flex items-center gap-1 tabular-nums">
                        <Navigation className="w-3 h-3 text-emerald-600" />
                        <span>
                          {addrLat.toFixed(3)}°N, {addrLng.toFixed(3)}°E
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {ADDRESS_TAG_BADGE_PRESETS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setAddrTag(tag)}
                        aria-pressed={addrTag === tag}
                        className={`h-8 px-2.5 rounded-lg text-[11px] cursor-pointer transition whitespace-nowrap shrink-0 border ${
                          addrTag === tag
                            ? 'bg-[#141413] text-white border-[#141413] font-bold shadow-xs'
                            : 'bg-white text-neutral-600 border-black/[0.08] font-semibold hover:bg-[#f1efe9]'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={addrTag}
                      maxLength={8}
                      onChange={(e) => setAddrTag(e.target.value)}
                      placeholder="或输入自定义徽章（最多8字，如：工作室）"
                      className="flex-1 h-9 px-3 rounded-lg border border-black/[0.08] bg-white focus:border-emerald-600 text-xs outline-none placeholder:text-neutral-400"
                    />
                    <span
                      className={`h-8 px-2.5 rounded-lg border text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap shrink-0 ${getAddressBadgeClassName(
                        addrTag
                      )}`}
                    >
                      <Tag className="w-3 h-3" />
                      <span>{addrTag.trim() || '常用'}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-black/[0.06]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingAddress(false);
                      setEditingAddress(null);
                      setIsPresetMenuOpen(false);
                    }}
                    className="h-9 px-4 rounded-xl bg-[#f1efe9] text-neutral-700 text-xs font-bold cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    id="btn-confirm-save-addr"
                    onClick={handleSaveAddress}
                    className="h-9 px-4 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                  >
                    确认写入草稿
                  </button>
                </div>
              </div>
            )}

            <div className="p-4 space-y-2.5" id="address-list-container">
              {filteredAddresses.map((addr) => {
                const isDef = !!addr.isDefault;
                const isConfirmingDelete = confirmDeleteAddrId === addr.id;
                const isEditingBadge = editingTagAddrId === addr.id;
                return (
                  <article
                    key={addr.id}
                    id={`address-card-${addr.id}`}
                    className={`rounded-2xl p-3.5 border transition ${
                      isDef
                        ? 'bg-emerald-50/30 border-emerald-600/40'
                        : 'bg-[#faf9f6] border-black/[0.06]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isDef ? 'bg-emerald-100/80 text-emerald-700' : 'bg-[#f1efe9] text-neutral-700'
                          }`}
                        >
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-extrabold text-[#141413] truncate">
                              {addr.address}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (isEditingBadge) {
                                  setEditingTagAddrId(null);
                                  setInlineTagDraft('');
                                } else {
                                  setEditingTagAddrId(addr.id);
                                  setInlineTagDraft(addr.tag || '');
                                }
                              }}
                              aria-expanded={isEditingBadge}
                              title="点击设置地址标签徽章"
                              className={`h-7 px-2.5 rounded-lg border text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition whitespace-nowrap shrink-0 ${getAddressBadgeClassName(
                                addr.tag
                              )} ${isEditingBadge ? 'ring-2 ring-emerald-500/40' : ''}`}
                            >
                              <Tag className="w-3 h-3 shrink-0" />
                              <span>{addr.tag || '设置徽章'}</span>
                            </button>
                            {isDef && (
                              <span className="text-[11px] font-bold text-emerald-700 inline-flex items-center gap-0.5 whitespace-nowrap shrink-0">
                                <Check className="w-3 h-3" strokeWidth={3} />
                                默认
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-500 mt-1 leading-snug">
                            {addr.detail}
                            {addr.houseNumber ? ` · ${addr.houseNumber}` : ''}
                          </p>
                          <p className="text-[11px] text-neutral-400 mt-1 tabular-nums">
                            {addr.name} · {addr.phone}
                          </p>
                          {addr.remarks && (
                            <p className="mt-1.5 px-2.5 py-1 rounded-lg bg-white border border-black/[0.05] text-[11px] text-neutral-500 leading-snug">
                              备注：{addr.remarks}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* 轻量辅助动作收纳至卡片右上角，避免底部按钮过密 */}
                      <div className="flex items-center gap-0.5 shrink-0 -mr-1 -mt-0.5">
                        <button
                          type="button"
                          onClick={() => handleSimulateRadarCheck(addr)}
                          title="雷达测距"
                          aria-label="雷达测距"
                          className="w-9 h-9 rounded-lg hover:bg-black/[0.05] text-neutral-500 flex items-center justify-center cursor-pointer transition"
                        >
                          <Crosshair className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyAddressInfo(addr)}
                          title="复制地址"
                          aria-label="复制地址"
                          className="w-9 h-9 rounded-lg hover:bg-black/[0.05] text-neutral-500 flex items-center justify-center cursor-pointer transition"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {isEditingBadge && (
                      <div className="mt-3 p-3 rounded-xl bg-white border border-black/[0.07] space-y-2.5 animate-in fade-in">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-extrabold text-[#141413] inline-flex items-center gap-1">
                            <Tag className="w-3 h-3 text-emerald-600" />
                            设置当前地址标签徽章
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTagAddrId(null);
                              setInlineTagDraft('');
                            }}
                            className="text-[11px] font-semibold text-neutral-400 hover:text-neutral-700 cursor-pointer whitespace-nowrap shrink-0"
                          >
                            收起
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {ADDRESS_TAG_BADGE_PRESETS.map((presetTag) => {
                            const isSelected = addr.tag === presetTag;
                            return (
                              <button
                                key={presetTag}
                                type="button"
                                onClick={() => handleApplyAddressTagBadge(addr.id, presetTag)}
                                className={`h-8 px-2.5 rounded-lg border text-[11px] cursor-pointer transition whitespace-nowrap shrink-0 ${
                                  isSelected
                                    ? 'bg-[#141413] text-white border-[#141413] font-bold'
                                    : 'bg-[#f7f6f2] text-neutral-700 border-black/[0.07] font-semibold hover:bg-[#efede6]'
                                }`}
                              >
                                {presetTag}
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={inlineTagDraft}
                            maxLength={8}
                            onChange={(e) => setInlineTagDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleApplyAddressTagBadge(addr.id, inlineTagDraft);
                              }
                            }}
                            placeholder="自定义徽章名称（最多8字）"
                            className="flex-1 min-w-0 h-9 px-2.5 rounded-lg bg-[#f7f6f2] border border-black/[0.08] focus:bg-white focus:border-emerald-600 text-xs outline-none placeholder:text-neutral-400"
                          />
                          <button
                            type="button"
                            onClick={() => handleApplyAddressTagBadge(addr.id, inlineTagDraft)}
                            className="h-9 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer transition whitespace-nowrap shrink-0"
                          >
                            应用
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-black/[0.05]">
                      {!isDef ? (
                        <button
                          type="button"
                          onClick={() => handleSetDefaultAddress(addr.id)}
                          className="h-9 px-3 rounded-xl bg-[#f1efe9] hover:bg-neutral-200/80 text-neutral-700 text-[11px] font-bold cursor-pointer transition whitespace-nowrap shrink-0"
                        >
                          设为默认
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-700 font-semibold whitespace-nowrap shrink-0">
                          当前优先送达
                        </span>
                      )}

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (isEditingBadge) {
                              setEditingTagAddrId(null);
                              setInlineTagDraft('');
                            } else {
                              setEditingTagAddrId(addr.id);
                              setInlineTagDraft(addr.tag || '');
                            }
                          }}
                          title="设置标签徽章"
                          className={`h-9 px-2.5 rounded-xl text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition whitespace-nowrap shrink-0 ${
                            isEditingBadge
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'hover:bg-black/[0.05] text-neutral-600'
                          }`}
                        >
                          <Tag className="w-3.5 h-3.5" />
                          <span>设徽章</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAddress(addr);
                            setIsAddingAddress(false);
                            setEditingTagAddrId(null);
                            setIsPresetMenuOpen(false);
                            setAddrName(addr.name);
                            setAddrPhone(addr.phone);
                            setAddrTag(addr.tag || '公司');
                            setAddrLocation(addr.address);
                            setAddrHouseNumber(addr.houseNumber || '');
                            setAddrDetail(addr.detail);
                            setAddrRemarks(addr.remarks || '');
                            setAddrLat(addr.latitude);
                            setAddrLng(addr.longitude);
                          }}
                          title="编辑地址"
                          aria-label="编辑地址"
                          className="h-9 px-2.5 rounded-xl hover:bg-black/[0.05] text-neutral-600 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition whitespace-nowrap shrink-0"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>编辑</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAddress(addr.id)}
                          title={isConfirmingDelete ? '再次点击确认删除' : '删除地址'}
                          aria-label={isConfirmingDelete ? '确认删除地址' : '删除地址'}
                          className={`h-9 rounded-xl flex items-center justify-center cursor-pointer transition whitespace-nowrap shrink-0 ${
                            isConfirmingDelete
                              ? 'px-2.5 bg-rose-50 text-rose-600 border border-rose-200 text-[11px] font-bold'
                              : 'w-9 hover:bg-rose-50 text-neutral-400 hover:text-rose-600'
                          }`}
                        >
                          {isConfirmingDelete ? '确认删除' : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}

              {filteredAddresses.length === 0 && (
                <div className="flex flex-col items-center py-10 text-center">
                  <MapPin className="w-7 h-7 text-neutral-300 mb-2" />
                  <span className="text-xs text-neutral-600 font-bold">
                    {addresses.length === 0 ? '暂无常用收货地址' : '未匹配到符合条件的地址'}
                  </span>
                  <span className="text-[11px] text-neutral-400 mt-1">
                    {addresses.length === 0
                      ? '添加常用写字楼、住宅或自提点，点单自动带入'
                      : '可更换搜索关键词，或清空后查看全部地址'}
                  </span>
                  {addresses.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingAddress(true);
                        setEditingAddress(null);
                        setAddrName(nickname);
                        setAddrPhone(phone);
                        setAddrTag('公司');
                        setAddrLocation('');
                        setAddrHouseNumber('');
                        setAddrDetail('');
                        setAddrRemarks('');
                        setAddrLat(31.2435);
                        setAddrLng(121.469);
                      }}
                      className="mt-3 h-9 px-4 rounded-xl bg-[#141413] hover:bg-neutral-800 text-xs text-white font-bold inline-flex items-center gap-1.5 cursor-pointer transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>立即新增地址</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setAddressSearchQuery('');
                      }}
                      className="mt-2.5 h-9 px-3.5 rounded-xl bg-[#f1efe9] text-xs text-emerald-700 font-bold cursor-pointer"
                    >
                      清空搜索条件
                    </button>
                  )}
                </div>
              )}
                    </div>
                  </div>
                );
              }

              if (activeWindowTab === 'tab-security') {
                return (
                  <div className="px-4 divide-y divide-black/[0.05]" id="tab-panel-security">
                    <div className="py-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                            <Lock className="w-4.5 h-4.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[13px] font-extrabold text-[#141413] leading-snug">
                              端到端设备签名已就绪
                            </div>
                            <div className="text-[11px] text-neutral-400 mt-0.5 truncate">
                              已守护 {boundDeviceCount} 台设备 · 多端档案加密校验中
                            </div>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-emerald-700 inline-flex items-center gap-1 shrink-0">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          正常
                        </span>
                      </div>
                    </div>

                    <div className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-neutral-400" />
                  <span className="text-xs font-bold text-[#141413]">受信任绑定设备</span>
                </div>
                <span className="text-xs font-semibold text-neutral-600 tabular-nums">
                  {boundDeviceCount} 台设备在线
                </span>
              </div>

              <div className="py-3.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#141413] flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-neutral-500" />
                    <span>重新签发凭证</span>
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    更换设备或重置本地状态后使用
                  </div>
                </div>
                <button
                  type="button"
                  id="reissue-key-btn"
                  onClick={handleReissueKey}
                  className="h-9 px-3.5 shrink-0 rounded-xl bg-[#f1efe9] hover:bg-neutral-200/80 text-xs font-bold text-[#141413] cursor-pointer transition"
                >
                  重新签发
                </button>
              </div>

              <div className="py-3.5">
                <button
                  type="button"
                  onClick={() => setIsTechDetailsOpen((prev) => !prev)}
                  aria-expanded={isTechDetailsOpen}
                  className="w-full flex items-center justify-between text-[11px] font-semibold text-neutral-500 hover:text-[#141413] cursor-pointer transition py-0.5"
                >
                  <span>查看技术凭据详情</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${
                      isTechDetailsOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isTechDetailsOpen && (
                  <div className="mt-2.5 pt-2.5 border-t border-black/[0.05] space-y-2.5 animate-in fade-in">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[11px] font-semibold text-neutral-500 shrink-0">
                        云端唯一标识
                      </span>
                      <span className="text-[11px] text-neutral-700 font-mono tabular-nums break-all text-right">
                        {cloudUid}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-neutral-500 shrink-0">
                        硬件签名令牌
                      </span>
                      <div className="flex items-center gap-1 min-w-0 justify-end">
                        <span className="text-[11px] text-neutral-700 font-mono tabular-nums break-all text-right">
                          {hwToken}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            void navigator.clipboard?.writeText(hwToken).catch(() => {});
                            toast.info('复制成功', '硬件签名令牌已复制到剪贴板');
                          }}
                          aria-label="复制硬件令牌"
                          className="w-8 h-8 rounded-lg text-neutral-400 hover:text-[#141413] hover:bg-[#f1efe9] flex items-center justify-center cursor-pointer shrink-0"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[11px] font-semibold text-neutral-500 shrink-0">
                        最近同步时间
                      </span>
                      <span className="text-[11px] text-neutral-600 tabular-nums">
                        {lastSyncTime}
                      </span>
                    </div>
                  </div>
                )}
              </div>
                  </div>
                );
              }

              return (
                <div className="divide-y divide-black/[0.06]" id="tab-panel-finance">
                  {/* 储值余额与在线充值 */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold text-neutral-400">可用储值余额</div>
                        <div className="text-2xl font-black text-[#141413] tracking-tight tabular-nums mt-0.5">
                          ¥{balance.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[11px] font-bold text-emerald-700">充 ¥1 = +1 成长积分</div>
                        <div className="text-[11px] text-neutral-400 mt-0.5 tabular-nums">
                          当前 {points.toLocaleString()} 分
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5">
                      {RECHARGE_TIERS.map((tier) => {
                        const isSelected = selectedRechargeAmount === tier.amount;
                        return (
                          <button
                            key={tier.amount}
                            type="button"
                            onClick={() => setSelectedRechargeAmount(tier.amount)}
                            aria-pressed={isSelected}
                            className={`rounded-xl py-2.5 px-1 text-center border transition cursor-pointer ${
                              isSelected
                                ? 'bg-[#141413] border-[#141413] text-white shadow-xs'
                                : 'bg-[#f7f6f2] border-black/[0.06] text-[#141413] hover:bg-[#efede6]'
                            }`}
                          >
                            <div className="text-xs font-extrabold tabular-nums">¥{tier.amount}</div>
                            <div
                              className={`text-[11px] font-semibold mt-0.5 ${
                                isSelected
                                  ? tier.bonus > 0
                                    ? 'text-emerald-300'
                                    : 'text-neutral-300'
                                  : tier.bonus > 0
                                    ? 'text-emerald-700'
                                    : 'text-neutral-400'
                              }`}
                            >
                              {tier.label}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      disabled={isRecharging}
                      onClick={handleConfirmRecharge}
                      className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-[0.99]"
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      <span>
                        {isRecharging
                          ? '正在充值入账...'
                          : (() => {
                              const picked = RECHARGE_TIERS.find((t) => t.amount === selectedRechargeAmount);
                              return picked && picked.bonus > 0
                                ? `立即储值 ¥${picked.amount}（实得 ¥${picked.amount + picked.bonus}）`
                                : `立即储值 ¥${selectedRechargeAmount}`;
                            })()}
                      </span>
                    </button>
                  </div>

                  <div className="p-4">
                    <SectionHeader
                      title="账单明细"
                      subtitle="关联订单、储值充值与会员返现记录"
                      right={
                        <span className="text-[11px] text-neutral-400 tabular-nums">
                          共 {filteredTransactions.length} 笔
                        </span>
                      }
                    />

              <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[#f1efe9] my-3">
                {[
                  { key: 'all', label: '全部' },
                  { key: 'recharge', label: '充值' },
                  { key: 'expense', label: '扣款' },
                  { key: 'reward', label: '返现' }
                ].map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() =>
                      setFinanceFilter(f.key as 'all' | 'recharge' | 'expense' | 'reward')
                    }
                    aria-pressed={financeFilter === f.key}
                    className={`h-9 rounded-lg text-xs cursor-pointer transition ${
                      financeFilter === f.key
                        ? 'bg-white text-[#141413] font-bold shadow-xs'
                        : 'text-neutral-500 font-semibold hover:text-[#141413]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {filteredTransactions.length > 0 ? (
                <div className="divide-y divide-black/[0.05]">
                  {filteredTransactions.map((item) => {
                    const isPositive = item.amount >= 0;
                    const formattedAmount = `${isPositive ? '+' : '-'}¥${Math.abs(
                      item.amount
                    ).toFixed(2)}`;
                    const Icon =
                      item.type === 'reward'
                        ? Gift
                        : isPositive
                          ? ArrowDownLeft
                          : ArrowUpRight;

                    return (
                      <div key={item.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              item.type === 'recharge' || item.type === 'refund'
                                ? 'bg-emerald-50 text-emerald-700'
                                : item.type === 'reward'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-[#f1efe9] text-neutral-700'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[#141413] truncate">
                              {item.title}
                            </div>
                            <div className="text-[11px] text-neutral-400 mt-0.5 tabular-nums truncate">
                              {item.timestamp}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div
                            className={`text-sm font-extrabold tabular-nums leading-tight ${
                              isPositive ? 'text-emerald-700' : 'text-[#141413]'
                            }`}
                          >
                            {formattedAmount}
                          </div>
                          <div className="text-[11px] text-neutral-400 tabular-nums mt-0.5">
                            结余 ¥{item.balanceAfter.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 flex flex-col items-center text-center">
                  <CreditCard className="w-6 h-6 text-neutral-300 mb-1.5" />
                  <span className="text-xs font-semibold text-neutral-500">当前筛选下暂无流水</span>
                </div>
              )}
                  </div>
                </div>
              );
            };

            return (
              <div
                data-purpose="embedded-window"
                className="w-full bg-white rounded-2xl border border-black/[0.08] shadow-[0_6px_24px_-10px_rgba(20,20,19,0.12)] overflow-hidden animate-in fade-in"
              >
                <div className="bg-[#faf9f6] px-4 py-3 border-b border-black/[0.06] flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-8 h-8 rounded-xl bg-[#141413] text-emerald-400 flex items-center justify-center shrink-0">
                      <WindowIcon className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-[13px] font-extrabold text-[#141413] truncate">
                          {currentWindowTabItem.label}
                        </h3>
                        {currentWindowTabItem.isDirty && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[11px] font-bold leading-none shrink-0">
                            未保存
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-400 truncate">
                        {currentWindowTabItem.description}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveWindowTab(null)}
                    aria-label="关闭内嵌窗口"
                    className="h-9 px-3 rounded-xl bg-white border border-black/[0.08] hover:bg-[#f1efe9] text-neutral-700 text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>返回</span>
                  </button>
                </div>

                <div className="bg-white">{renderWindowBody()}</div>

                <div className="bg-[#faf9f6] px-4 py-3 border-t border-black/[0.06] flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-neutral-400 truncate">
                    {hasUnsavedChanges ? '存在未保存修改' : `参数已同步 · ${lastSyncTime}`}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {hasUnsavedChanges && (
                      <>
                        <button
                          type="button"
                          onClick={handleDiscardChanges}
                          disabled={isSyncing}
                          className="h-9 px-3 rounded-xl bg-[#f1efe9] hover:bg-neutral-200/80 text-neutral-700 text-xs font-bold cursor-pointer transition disabled:opacity-50"
                        >
                          还原
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveAndSync}
                          disabled={isSyncing}
                          className="h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition active:scale-95 disabled:opacity-60"
                        >
                          {isSyncing ? '保存中...' : '保存更改'}
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveWindowTab(null)}
                      className="h-9 px-3.5 rounded-xl bg-[#141413] hover:bg-neutral-800 text-white text-xs font-bold cursor-pointer transition"
                    >
                      {hasUnsavedChanges ? '返回列表' : '完成'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()
        )}
      </div>

      {/* 脏状态驱动的底部悬浮保存条：仅在列表页且存在未保存修改时亮起 */}
      {!currentWindowTabItem && hasUnsavedChanges && (
        <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-[calc(100%-28px)] max-w-[402px] z-40 animate-in slide-in-from-bottom">
          <div className="h-[54px] px-3 rounded-2xl bg-[#141413] text-white shadow-[0_14px_34px_-10px_rgba(20,20,19,0.5)] ring-1 ring-white/10 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 pl-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              <span className="text-xs font-bold truncate">
                {dirtyTabLabels.length > 0
                  ? `${dirtyTabLabels.join(' · ')} 未保存`
                  : '有未保存修改'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleDiscardChanges}
                disabled={isSyncing}
                className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-neutral-200 text-xs font-semibold cursor-pointer transition disabled:opacity-50"
              >
                还原
              </button>
              <button
                type="button"
                onClick={handleSaveAndSync}
                disabled={isSyncing}
                className="h-9 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#141413] text-xs font-black cursor-pointer transition active:scale-95 disabled:opacity-60"
              >
                {isSyncing ? '保存中...' : '保存更改'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

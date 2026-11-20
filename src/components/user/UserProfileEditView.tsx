import React, { useState, useMemo, useEffect } from 'react';
import { sendSmsCode, verifySmsCode } from '../../utils/smsService';
import {
  ArrowLeft,
  RefreshCw,
  Check,
  Sliders,
  MapPin,
  Fingerprint,
  Wallet,
  Edit2,
  Trash2,
  Plus,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Radio,
  Award,
  Cloud,
  KeyRound,
  Smartphone,
  Copy,
  CheckCircle2,
  Leaf,
  BellOff,
  CreditCard,
  User,
  Calendar,
  Flame,
  Tag,
  Lock,
  Search,
  Navigation,
  Compass,
  Crosshair,
  X
} from 'lucide-react';
import { UserProfile, UserAddress, UserPreferences } from '../../types';
import { syncUserProfileToCloud } from '../../utils/cloudbase';
import { wbDb } from '../../utils/wbCloud';
import { useToast } from '../ui/ToastContext';
import { saveAddresses, DeliveryAddressItem } from '../../utils/truckLocationEngine';

export interface UserProfileEditViewProps {
  userProfile: UserProfile;
  onProfileUpdated: (updated: UserProfile) => void;
  onBack?: () => void;
  initialTab?: 'profile' | 'addresses' | 'preferences' | 'wallet' | 'security' | 'finance';
  onOpenCloudMonitor?: () => void;
  onOpenCloudCode?: () => void;
}

type TabType = 'tab-profile' | 'tab-preference' | 'tab-address' | 'tab-security' | 'tab-finance';

// High-frequency landmark presets in Shanghai
const PRESET_DISTRICT_ADDRESSES: {
  tag: '公司' | '家' | '学校' | '其他';
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

export const UserProfileEditView: React.FC<UserProfileEditViewProps> = ({
  userProfile,
  onProfileUpdated,
  onBack,
  initialTab = 'profile',
  onOpenCloudMonitor
}) => {
  const toast = useToast();

  // Map incoming initialTab to local TabType
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

  const [activeTab, setActiveTab] = useState<TabType>(resolvedInitialTab);

  /* 【2026-11-20】入口 tab 跟随：父级可通过 initialTab 指定落地分区（如「常用地址」卡片进入）。
     原先只在 useState 初始值里读一次，若父级在挂载后切换入口（不卸载重挂），tab 不会跟随。
     这里仅在 initialTab 变化时同步，不会干扰用户在页内手动切换。 */
  useEffect(() => {
    setActiveTab(resolvedInitialTab);
  }, [resolvedInitialTab]);

  // Form State
  const [nickname, setNickname] = useState(userProfile.nickname || '张伟 (店长)');
  const [phone, setPhone] = useState(userProfile.phone || '');
  // 手机号绑定流程（真实短信验证，2026-11-18）
  const [isBindOpen, setIsBindOpen] = useState(false);
  const [bindPhone, setBindPhone] = useState('');
  const [bindCode, setBindCode] = useState('');
  const [bindCountdown, setBindCountdown] = useState(0);
  const [isSendingBind, setIsSendingBind] = useState(false);
  const [isBinding, setIsBinding] = useState(false);
  // 解绑：二次确认 + 执行中标志；旧号验证：更换前必须先通过旧号短信校验
  const [unbindConfirming, setUnbindConfirming] = useState(false);
  const [isUnbinding, setIsUnbinding] = useState(false);
  const [oldPhoneVerified, setOldPhoneVerified] = useState(false);
  const [oldPhoneCode, setOldPhoneCode] = useState('');
  const [oldPhoneCountdown, setOldPhoneCountdown] = useState(0);
  const [isSendingOldCode, setIsSendingOldCode] = useState(false);
  const [isVerifyingOld, setIsVerifyingOld] = useState(false);
  const [avatar, setAvatar] = useState(userProfile.avatar || '🧑‍💻');
  const [bio, setBio] = useState(userProfile.bio || '店长 / 运营总管 · 设备硬件指纹绑定中');
  const [gender, setGender] = useState<'secret' | 'male' | 'female'>(userProfile.gender || 'secret');
  const [birthday, setBirthday] = useState(userProfile.birthday || '1990/01/01');

  // Preferences State
  const [spiciness, setSpiciness] = useState<'none' | 'mild' | 'medium' | 'hot'>(
    userProfile.preferences?.spiciness || 'mild'
  );
  const [ecoMode, setEcoMode] = useState<boolean>(
    userProfile.preferences?.cutlery === 'eco' || userProfile.preferences?.cutlery === 'not_needed'
  );
  const [silentCall, setSilentCall] = useState<boolean>(
    !userProfile.preferences?.radarTracking || false
  );
  const [autoCoupons, setAutoCoupons] = useState<boolean>(
    userProfile.preferences?.autoApplyCoupons !== false
  );
  const [dietaryNotes, setDietaryNotes] = useState<string>(
    userProfile.preferences?.dietaryNote || '无特殊过敏原'
  );

  // Addresses State
  const [addresses, setAddresses] = useState<UserAddress[]>(() => {
    if (userProfile.addresses && userProfile.addresses.length > 0) {
      return userProfile.addresses;
    }
    return [
      {
        id: 'addr-default-1',
        name: userProfile.nickname || '张伟',
        phone: userProfile.phone || '13800138000',
        tag: '公司',
        address: '静安大悦城南座办公楼',
        detail: '西藏北路166号南座801室',
        houseNumber: '801室',
        remarks: '放置前台或门口蜂巢柜',
        isDefault: true,
        latitude: 31.2435,
        longitude: 121.469,
        createdAt: '2024-01-15 09:20:11'
      },
      {
        id: 'addr-sub-2',
        name: userProfile.nickname || '张伟',
        phone: userProfile.phone || '13800138000',
        tag: '家',
        address: '静安国际中心公寓区',
        detail: '汉中路光复路口1号楼',
        houseNumber: '1202室',
        remarks: '到达后电话联系，请轻声叩门',
        isDefault: false,
        latitude: 31.241,
        longitude: 121.462,
        createdAt: '2024-02-18 14:15:30'
      }
    ];
  });

  // Address Search & Tag Filter
  const [addressSearchQuery, setAddressSearchQuery] = useState('');
  const [addressTagFilter, setAddressTagFilter] = useState<'all' | '公司' | '家' | '学校' | '其他'>('all');

  // Inline Address Add/Edit State
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [addrName, setAddrName] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrTag, setAddrTag] = useState<'公司' | '家' | '学校' | '其他'>('公司');
  const [addrLocation, setAddrLocation] = useState('');
  const [addrHouseNumber, setAddrHouseNumber] = useState('');
  const [addrDetail, setAddrDetail] = useState('');
  const [addrRemarks, setAddrRemarks] = useState('');
  const [addrLat, setAddrLat] = useState<number | undefined>(undefined);
  const [addrLng, setAddrLng] = useState<number | undefined>(undefined);

  // Security Token & Sync States
  const [hwToken, setHwToken] = useState('fp_sec_99a8x00138000#pos');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('刚刚已同步');
  const [balance] = useState(userProfile.balance ?? 158.5);
  const [points] = useState(userProfile.points ?? 1280);
  const [financeFilter, setFinanceFilter] = useState<'all' | 'recharge' | 'expense' | 'points'>('all');

  // Sync to truckLocationEngine whenever address changes
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

  // 绑定验证码倒计时
  React.useEffect(() => {
    if (bindCountdown <= 0) return;
    const t = setTimeout(() => setBindCountdown((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [bindCountdown]);

  // 旧号验证验证码倒计时
  React.useEffect(() => {
    if (oldPhoneCountdown <= 0) return;
    const t = setTimeout(() => setOldPhoneCountdown((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [oldPhoneCountdown]);

  // 手机号绑定：发码 + 校验（服务端 /api/sms，验证通过后写入 profiles.phone）
  const handleSendBindCode = async () => {
    const clean = bindPhone.replace(/\D/g, '');
    if (clean.length !== 11) {
      toast.error('手机号格式不正确', '请输入 11 位手机号码');
      return;
    }
    // 更换场景：旧号未验证前，连新号验证码都不发
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
    setBindCountdown(res.retryAfter && res.retryAfter > 60 ? res.retryAfter : 60);
    if (res.mock && res.devCode) {
      setBindCode(res.devCode);
      toast.info(`【演示通道】验证码 ${res.devCode}`, '服务器未配置阿里云短信；配置后即发真实短信');
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
    // 更换场景：必须先通过旧号验证，防止绕过界面直接绑新号
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
    // 冲突：服务端 ok:true 但 bound:false（唯一索引 409）——绝不能当成功
    if (res.bound === false) {
      toast.error('该手机号已被其他账号绑定', '请更换号码或先解绑原账号');
      return;
    }
    // 只有服务端明确确认写入（bound===true，mock 通道同样返回 true）才算成功；
    // 字段缺失一律按失败处理，杜绝「绑定失败但提示成功」
    if (res.bound !== true) {
      toast.error('绑定失败', '服务端未确认手机号写入档案，请重试');
      return;
    }
    setPhone(clean);
    setIsBindOpen(false);
    setBindCode('');
    onProfileUpdated({ ...userProfile, phone: clean, cloudSyncedAt: new Date().toISOString() });
    toast.success('手机号已绑定', `账号已与 ${clean.slice(0, 3)}****${clean.slice(-4)} 绑定（已写入云端档案）`);
  };

  // 打开绑定面板：重置全部流程状态（更换须先验证旧号，首次绑定免验证）
  const openBindPanel = () => {
    setBindPhone('');
    setBindCode('');
    setBindCountdown(0);
    setOldPhoneCode('');
    setOldPhoneCountdown(0);
    setOldPhoneVerified(!phone); // 未绑定时无需旧号验证
    setUnbindConfirming(false);
    setIsBindOpen(true);
  };

  // 关闭绑定面板：清空流程状态
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

  // 旧号验证：向当前绑定手机号发码（purpose=login，不写 profiles）
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
    setOldPhoneCountdown(res.retryAfter && res.retryAfter > 60 ? res.retryAfter : 60);
    if (res.mock && res.devCode) {
      setOldPhoneCode(res.devCode);
      toast.info(`【演示通道】验证码 ${res.devCode}`, '服务器未配置阿里云短信；配置后即发真实短信');
    } else {
      toast.success('验证码已发送', `请查收旧号 ${clean.slice(0, 3)}****${clean.slice(-4)} 的短信`);
    }
  };

  // 旧号验证：校验旧号验证码（purpose=login，避免把动作写进 profiles）
  const handleVerifyOldPhone = async () => {
    const clean = (phone || '').replace(/\D/g, '');
    if (clean.length !== 11) {
      toast.error('当前档案手机号无效', '无法验证旧号');
      return;
    }
    if (!/^\d{6}$/.test(oldPhoneCode.trim())) {
      toast.error('验证码格式不正确', '请输入 6 位数字验证码');
      return;
    }
    setIsVerifyingOld(true);
    const res = await verifySmsCode(clean, oldPhoneCode.trim(), 'login');
    setIsVerifyingOld(false);
    if (!res.ok) {
      toast.error('旧号验证失败', res.message || '验证码校验未通过');
      return;
    }
    setOldPhoneVerified(true);
    toast.success('旧号验证通过', '现在可以设置新手机号');
  };

  // 解绑手机号：二次确认后直接清空服务端 profiles.phone（解绑不需要验证码）
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

  // Cloud Sync Function
  const handleSaveAndSync = async () => {
    setIsSyncing(true);

    const updatedPref: UserPreferences = {
      spiciness,
      cutlery: ecoMode ? 'eco' : 'needed',
      autoApplyCoupons: autoCoupons,
      radarTracking: !silentCall,
      smsNotification: silentCall,
      dietaryNote: dietaryNotes
    };

    const updatedProfile: UserProfile = {
      ...userProfile,
      nickname: nickname.trim() || '张伟 (店长)',
      phone: phone || userProfile.phone,
      avatar,
      bio: bio.trim(),
      gender,
      birthday,
      balance,
      points,
      addresses,
      preferences: updatedPref,
      cloudSyncedAt: new Date().toISOString()
    };

    try {
      const res = await syncUserProfileToCloud(updatedProfile);
      onProfileUpdated(res.profile);
      syncToTruckEngine(addresses);
      setLastSyncTime(new Date().toLocaleTimeString());
      toast.success('配置同步完成', '会员资料与参数设置已成功下发并同步至 POS 终端与云端');
    } catch {
      setLastSyncTime(new Date().toLocaleTimeString());
      toast.info('本地更新成功', '参数已成功持久化更新并在离线缓存中生效');
      onProfileUpdated(updatedProfile);
      syncToTruckEngine(addresses);
    } finally {
      setIsSyncing(false);
    }
  };

  // Reissue Key Handler
  const handleReissueKey = () => {
    const newToken = 'fp_sec_' + Math.random().toString(36).substring(2, 8) + '#pos';
    setHwToken(newToken);
    toast.success('安全凭据重签成功', `硬件指纹密钥已更新为：${newToken}`);
  };

  // Save Address from Inline Form
  const handleSaveAddress = () => {
    if (!addrLocation.trim()) {
      toast.warning('请输入地址', '小区/写字楼或地址位置不能为空');
      return;
    }

    if (editingAddress) {
      const updated = addresses.map((a) =>
        a.id === editingAddress.id
          ? {
              ...a,
              name: addrName.trim() || nickname,
              phone: addrPhone.trim() || phone,
              tag: addrTag,
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
      syncToTruckEngine(updated);
      toast.success('地址更新成功', '常用收货地址已完成保存');
    } else {
      const newAddr: UserAddress = {
        id: `addr-${Date.now()}`,
        name: addrName.trim() || nickname,
        phone: addrPhone.trim() || phone,
        tag: addrTag,
        address: addrLocation.trim(),
        houseNumber: addrHouseNumber.trim(),
        detail: addrDetail.trim() || addrLocation.trim(),
        remarks: addrRemarks.trim(),
        isDefault: addresses.length === 0,
        latitude: addrLat || 31.2435,
        longitude: addrLng || 121.469,
        createdAt: new Date().toLocaleString()
      };
      const updated = [newAddr, ...addresses];
      setAddresses(updated);
      syncToTruckEngine(updated);
      toast.success('新增地址成功', '已成功添加至常用收货地址簿');
    }

    // Reset inline form
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

  // Delete Address
  const handleDeleteAddress = (id: string) => {
    const nextList = addresses.filter((a) => a.id !== id);
    if (nextList.length > 0 && !nextList.some((a) => a.isDefault)) {
      nextList[0].isDefault = true;
    }
    setAddresses(nextList);
    syncToTruckEngine(nextList);
    toast.info('地址已移除', '该收货地址已从常用列表中删除');
  };

  // Set Default Address
  const handleSetDefaultAddress = (id: string) => {
    const nextList = addresses.map((a) => ({
      ...a,
      isDefault: a.id === id
    }));
    setAddresses(nextList);
    syncToTruckEngine(nextList);
    toast.success('默认地址已切换', '下次点单将优先选中此送达地址');
  };

  // Simulate GPS Geolocation Auto-Detection（演示数据：随机生成示例坐标，非本机真实 GPS 定位）
  const handleSimulateGpsAutofill = () => {
    const mockLat = 31.2435 + (Math.random() - 0.5) * 0.008;
    const mockLng = 121.469 + (Math.random() - 0.5) * 0.008;
    setAddrLat(Number(mockLat.toFixed(5)));
    setAddrLng(Number(mockLng.toFixed(5)));
    setAddrLocation('示例地址 · 演示数据');
    setAddrDetail('静安区西藏北路166号北座');
    setAddrHouseNumber('3楼天台极速交接站');
    toast.info('演示模式', `演示模式：已填入示例坐标，非本机真实定位（示例：${mockLat.toFixed(4)}°N, ${mockLng.toFixed(4)}°E）`);
  };

  // Radar Distance Check Simulation
  const handleSimulateRadarCheck = (addr: UserAddress) => {
    const distMeters = Math.floor(450 + Math.random() * 600);
    const etaMinutes = Math.max(3, Math.ceil(distMeters / 180));
    toast.info(
      '雷达测距计算就绪',
      `距离当前餐车约 ${distMeters} 米 · 车载 GPS 直线预估送达 ${etaMinutes} 分钟`
    );
  };

  // Copy Address Payload
  const handleCopyAddressInfo = (addr: UserAddress) => {
    const payload = `【收货人】${addr.name} (${addr.phone})\n【送达地址】${addr.address} ${addr.detail} ${addr.houseNumber || ''}\n【备注】${addr.remarks || '无'}`;
    navigator.clipboard.writeText(payload);
    toast.success('地址信息已复制', '收件人姓名、电话与完整地址已复制至剪贴板');
  };

  // Load Preset Landmark
  const handleApplyPreset = (preset: typeof PRESET_DISTRICT_ADDRESSES[0]) => {
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
    toast.info('已导入商圈预设', `已自动载入 ${preset.address}，点击「保存」即可入库`);
  };

  // Reset to initial settings
  const handleResetToInitial = () => {
    if (window.confirm('是否确认将全部参数重置回初始设定？')) {
      setNickname('张伟 (店长)');
      setBirthday('1990/01/01');
      setBio('店长 / 运营总管 · 设备硬件指纹绑定中');
      setGender('secret');
      setSpiciness('mild');
      setEcoMode(true);
      setSilentCall(false);
      setAutoCoupons(true);
      setDietaryNotes('无特殊过敏原');
      toast.info('参数已重置', '全部表单已恢复至默认初始参数');
    }
  };

  // Quick Dietary Tag Pills
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
        .split('，')
        .map((s) => s.trim())
        .filter((s) => s && s !== tag)
        .join('，');
      setDietaryNotes(next || '无特殊过敏原');
    } else {
      if (dietaryNotes === '无特殊过敏原' || !dietaryNotes.trim()) {
        setDietaryNotes(tag);
      } else {
        setDietaryNotes(`${dietaryNotes}，${tag}`);
      }
    }
  };

  // Filtered Addresses for Compact Grid
  const filteredAddresses = useMemo(() => {
    return addresses.filter((a) => {
      // Tag filter
      if (addressTagFilter !== 'all' && a.tag !== addressTagFilter) {
        return false;
      }
      // Search query filter
      if (addressSearchQuery.trim()) {
        const query = addressSearchQuery.trim().toLowerCase();
        const fullStr = `${a.name} ${a.phone} ${a.address} ${a.detail} ${a.houseNumber || ''} ${a.remarks || ''}`.toLowerCase();
        return fullStr.includes(query);
      }
      return true;
    });
  }, [addresses, addressTagFilter, addressSearchQuery]);

  // Preset avatar emoji options
  const avatarPresets = ['🧑‍💻', '👨‍💼', '🧔‍♂️', '👩‍🍳', '🧑‍🎨', '😎', '⚡', '☕'];

  // Tab definitions
  const tabsList = [
    {
      id: 'tab-profile' as const,
      label: '基本资料',
      enLabel: 'PROFILE',
      icon: User,
      badge: '档案完善',
      badgeColor: 'bg-success-soft text-success border border-success/30'
    },
    {
      id: 'tab-preference' as const,
      label: '就餐偏好',
      enLabel: 'PREFERENCE',
      icon: Sliders,
      badge: '厨房联动',
      badgeColor: 'bg-warning-soft text-warning border border-warning/30'
    },
    {
      id: 'tab-address' as const,
      label: '常用地址',
      enLabel: 'ADDRESS',
      icon: MapPin,
      badge: `${addresses.length}处·网格`,
      badgeColor: 'bg-canvas-gray text-ink border border-hairline'
    },
    {
      id: 'tab-security' as const,
      label: '安全凭据',
      enLabel: 'SECURITY',
      icon: ShieldCheck,
      badge: '99.8%',
      badgeColor: 'bg-canvas-gray text-ink-secondary border border-hairline'
    },
    {
      id: 'tab-finance' as const,
      label: '财务对账',
      enLabel: 'FINANCE',
      icon: Wallet,
      badge: '实时流水',
      badgeColor: 'bg-canvas-gray text-ink-secondary border border-hairline'
    }
  ];

  // 分段控件滑块索引（与 tabsList 一一对应）
  const activeTabIndex = Math.max(0, tabsList.findIndex((t) => t.id === activeTab));

  /* 【2026-11-20】访客态 UID 兜底：uid 为 'guest' 时 slice(-4) 会截出 "uest"，
     页面上出现「UID: uest」断头文案（母版 ProfilePageView 已修，此处同步）。
     云端唯一标识同样不能在手机号为空时退化成 "merchant_"。 */
  const rawUid = String(userProfile.uid || '');
  const isGuestUid = !rawUid || rawUid.toLowerCase() === 'guest';
  const uidTail = isGuestUid ? 'GUEST' : rawUid.slice(-4).toUpperCase();
  const cloudUid = isGuestUid
    ? 'visitor#local'
    : phone
      ? `merchant_${phone}`
      : `member_${uidTail.toLowerCase()}`;

  // Simulated recent financial transactions
  const financialRecords = [
    {
      id: 'tx-101',
      title: '微信在线储值充值',
      sub: '充值成功 · 自动获得 50 赠送积分',
      time: '今日 14:20',
      amount: '+¥100.00',
      type: 'recharge',
      status: '已到账'
    },
    {
      id: 'tx-102',
      title: '黑曜石餐车外送订单支付',
      sub: '静安大悦城站台 · 外送单号 #8821',
      time: '昨日 18:45',
      amount: '-¥38.50',
      type: 'expense',
      status: '交易完成'
    },
    {
      id: 'tx-103',
      title: '每日低碳点单奖励积分',
      sub: '践行无一次性餐具环保就餐',
      time: '昨日 18:45',
      amount: '+15 积分',
      type: 'points',
      status: '已核发'
    },
    {
      id: 'tx-104',
      title: '黑金会员日专享立减金冲抵',
      sub: '系统自动满减券优惠核销',
      time: '09-10 12:30',
      amount: '-¥10.00',
      type: 'expense',
      status: '卡券冲抵'
    }
  ];

  const filteredFinancialRecords = financialRecords.filter((rec) => {
    if (financeFilter === 'all') return true;
    return rec.type === financeFilter;
  });


  return (
    <div className="w-full min-h-screen bg-[#f6f6f4] text-[#1a1a17] pb-28 select-none font-sans">
      <div className="w-full max-w-5xl mx-auto px-3.5 sm:px-6 pt-4 flex flex-col gap-4">

        {/* ===== Header（逐条仿制母版 page-header：flex-col gap-2.5 + 内层居中标题） ===== */}
        <header className="flex flex-col gap-2.5" data-purpose="page-header">
          <div className="flex items-center justify-between gap-2">
            {onBack && (
              <button onClick={onBack} type="button" id="back-to-member-center-btn"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/72 backdrop-blur-md ring-1 ring-black/[0.07] rounded-lg text-xs font-bold tracking-wide text-brand-dark shadow-[0_1px_2px_rgba(17,24,39,0.05),inset_0_1px_0_rgba(255,255,255,0.8)] hover:bg-white/90 active:scale-95 transition flex-shrink-0 cursor-pointer group">
                <ArrowLeft className="w-3.5 h-3.5 text-neutral-800 transition-transform group-hover:-translate-x-0.5" />
                <span className="text-xs font-bold">返回中心</span>
              </button>
            )}
            <div className="flex-1 min-w-0 flex items-center justify-center px-1">
              <span className="text-sm font-extrabold text-neutral-900 tracking-tight">会员资料与参数控制台</span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {onOpenCloudMonitor && (
                <button type="button" onClick={onOpenCloudMonitor} title="云监控"
                  className="w-7 h-7 rounded-full bg-white/72 backdrop-blur-md ring-1 ring-black/[0.07] flex items-center justify-center text-neutral-600 shadow-[0_1px_2px_rgba(17,24,39,0.05)] hover:bg-white/90 active:scale-95 transition flex-shrink-0 cursor-pointer">
                  <Radio className="w-3.5 h-3.5 text-brand-emerald animate-pulse" />
                </button>
              )}
              <button onClick={handleSaveAndSync} disabled={isSyncing} className="inline-flex items-center gap-1 px-2 py-1.5 bg-white/72 backdrop-blur-md ring-1 ring-black/[0.07] rounded-full text-xs font-bold text-neutral-700 shadow-[0_1px_2px_rgba(17,24,39,0.05),inset_0_1px_0_rgba(255,255,255,0.8)] active:scale-95 transition cursor-pointer hover:bg-white/90 disabled:opacity-70">
                <RefreshCw className={`w-3.5 h-3.5 text-brand-emerald ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? '同步中...' : '保存并下发'}</span>
              </button>
            </div>
          </div>
        </header>

        {/* ===== 会员概要（照搬母版 user-profile-summary：圆形头像 + 灰标签 + 余额） ===== */}
        <section className="bg-white/72 backdrop-blur-xl rounded-2xl p-3 ring-1 ring-black/[0.07] shadow-[0_12px_32px_-16px_rgba(17,24,39,0.3),inset_0_1px_0_rgba(255,255,255,0.85)] flex items-center justify-between" data-purpose="user-profile-summary">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="relative flex-shrink-0">
              <div className="w-11 h-11 rounded-full overflow-hidden border border-neutral-200 bg-neutral-100 flex items-center justify-center">
                {avatar && /^(https?:|\/|data:)/.test(avatar) ? (
                  <img loading="lazy" decoding="async" src={avatar} alt={nickname} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-neutral-400" />
                )}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-brand-emerald rounded-full flex items-center justify-center text-white ring-2 ring-white">
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" /></svg>
              </span>
            </div>
            <div className="flex flex-col leading-tight min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-neutral-900 tracking-tight truncate">{nickname || '张伟 (店长)'}</span>
                <span className="text-[10px] whitespace-nowrap shrink-0 bg-black/[0.05] text-neutral-500 font-medium px-1.5 py-0.2 rounded ring-1 ring-black/[0.05]">UID: {uidTail}</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-neutral-500 mt-1 min-w-0">
                <span className="font-medium whitespace-nowrap">{phone || '未绑定手机号'}</span>
                <span className="text-neutral-300 shrink-0">·</span>
                <span className="inline-flex items-center gap-0.5 text-brand-emerald font-medium min-w-0">
                  <Cloud className="w-3 h-3 shrink-0" />
                  <span className="truncate">云函数已打通</span>
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 pl-2 flex-shrink-0">
            <div className="text-right">
              <div className="text-sm font-extrabold text-neutral-900 leading-none">¥{balance.toFixed(2)}</div>
              <div className="text-[10px] text-neutral-400 mt-0.5">账户余额</div>
            </div>
          </div>
        </section>

        {/* ===== 分段控件 TAB（灰底轨道 + 白色滑动胶囊，仿母版性别分段） ===== */}
        <nav
          role="tablist"
          aria-label="资料分区"
          data-purpose="tab-navigator"
          className="relative grid grid-cols-5 bg-black/[0.045] rounded-full p-1 ring-1 ring-black/[0.05] shadow-[inset_0_1px_2px_rgba(17,24,39,0.045)]"
        >
          {/* 滑动白胶囊：位置随 activeTabIndex 平移，宽度恒为 1/5 */}
          <span
            aria-hidden="true"
            className="absolute top-1 bottom-1 rounded-full bg-white ring-1 ring-black/[0.05] shadow-[0_1px_2px_rgba(17,24,39,0.1),0_2px_8px_-2px_rgba(17,24,39,0.14)] transition-[left] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] pointer-events-none"
            style={{
              width: `calc((100% - 0.5rem) / ${tabsList.length})`,
              left: `calc(0.25rem + (100% - 0.5rem) / ${tabsList.length} * ${activeTabIndex})`
            }}
          />
          {tabsList.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`tab-panel-${t.id.replace('tab-', '')}`}
                data-tab={t.id}
                id={`tab-nav-${t.id}`}
                onClick={() => setActiveTab(t.id)}
                className={`relative z-10 h-9 px-0.5 rounded-full flex items-center justify-center gap-1 text-[11px] sm:text-xs whitespace-nowrap cursor-pointer transition-colors duration-200 ${
                  isActive
                    ? 'text-neutral-900 font-black'
                    : 'text-neutral-500 font-semibold hover:text-neutral-800'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 shrink-0 transition-colors ${isActive ? 'text-brand-emerald' : 'text-neutral-400'}`}
                  strokeWidth={isActive ? 2.4 : 2}
                />
                <span className="truncate">{t.label}</span>
              </button>
            );
          })}
        </nav>

        {/* ===== 内容卡片（母版白卡） ===== */}
        <section className="bg-white/72 backdrop-blur-xl rounded-2xl ring-1 ring-black/[0.07] shadow-[0_12px_32px_-16px_rgba(17,24,39,0.3),inset_0_1px_0_rgba(255,255,255,0.85)] p-3.5 sm:p-4">

          {/* TAB 1: 基本资料 */}
          {activeTab === 'tab-profile' && (
            <div className="animate-in fade-in duration-normal space-y-2.5" id="tab-panel-profile">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-emerald" />
                  <h3 className="text-base font-black tracking-tight text-neutral-900">基本资料</h3>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ring-1 ${nickname && phone ? 'text-emerald-700 bg-emerald-50/70 ring-emerald-600/20' : 'text-amber-700 bg-amber-50/70 ring-amber-600/20'}`}>
                  {nickname && phone ? '档案已完善' : '待补齐手机号'}
                </span>
              </div>

              <div className="grid gap-2.5 md:grid-cols-2 md:items-start">
              <div className="space-y-2.5">

              {/* 区块 1：数字头像 */}
              <div className="rounded-xl bg-black/[0.02] ring-1 ring-black/[0.04] p-3">
                <div className="flex items-baseline justify-between mb-2.5">
                  <span className="text-[11px] font-black text-neutral-500 tracking-wide">数字头像</span>
                  <span className="text-[10px] text-neutral-400">点选即生效</span>
                </div>
                <div className="flex flex-wrap gap-2" id="avatar-container">
                  {avatarPresets.map((icon, idx) => {
                    const isSelected = avatar === icon;
                    return (
                      <button key={icon} type="button" data-avatar-id={idx + 1} onClick={() => setAvatar(icon)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-lg transition cursor-pointer ${
                          isSelected
                            ? 'bg-white ring-2 ring-brand-emerald ring-offset-2 ring-offset-[#fafaf8] shadow-[0_2px_8px_-2px_rgba(5,150,105,0.35)]'
                            : 'bg-white/70 ring-1 ring-black/[0.06] hover:bg-white hover:ring-black/[0.14] hover:-translate-y-0.5'
                        }`}>
                        {icon}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 区块 2：个性签名 */}
              <div className="rounded-xl bg-black/[0.02] ring-1 ring-black/[0.04] p-3">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-[11px] font-black text-neutral-500 tracking-wide">个性签名</span>
                  <span className={`text-[10px] tabular-nums ${bio.length >= 55 ? 'text-amber-600 font-bold' : 'text-neutral-400'}`}>{bio.length}/60</span>
                </div>
                <textarea id="bio" rows={3} value={bio} maxLength={60} onChange={(e) => setBio(e.target.value)} placeholder="写点什么..."
                  className="w-full p-2.5 rounded-lg bg-white ring-1 ring-black/[0.06] focus:ring-2 focus:ring-emerald-600/35 focus:border-emerald-600 border border-transparent outline-none text-xs leading-relaxed text-neutral-900 transition resize-none placeholder:text-neutral-300" />
                <div className="text-[10px] text-neutral-400 mt-1.5">展示在雷达卡片与商家端</div>
              </div>
              </div>

              {/* 区块 3：身份档案 */}
              <div className="rounded-xl bg-black/[0.02] ring-1 ring-black/[0.04] px-3 pb-1">
                <div className="flex items-baseline justify-between pt-3">
                  <span className="text-[11px] font-black text-neutral-500 tracking-wide">身份档案</span>
                  <span className="text-[10px] text-neutral-400">仅自己与商家可见</span>
                </div>
              <div className="divide-y divide-black/[0.04]">
                {/* 昵称 */}
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <label className="text-xs font-bold text-neutral-900" htmlFor="nickname">公开昵称</label>
                    <div className="text-[10px] text-neutral-400 mt-0.5">展示在订单与雷达卡片</div>
                  </div>
                  <div className="relative w-full max-w-[200px] shrink-0">
                    <input id="nickname" type="text" value={nickname} maxLength={20} onChange={(e) => setNickname(e.target.value)} placeholder="输入您的称呼"
                      className="w-full h-9 px-3 pr-11 rounded-lg bg-white ring-1 ring-black/[0.06] focus:ring-2 focus:ring-emerald-600/35 focus:border-emerald-600 border border-transparent outline-none text-xs text-neutral-900 transition tabular-nums placeholder:text-neutral-300" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400 tabular-nums">{nickname.length}/20</span>
                  </div>
                </div>

                {/* 手机号 */}
                <div className="py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-neutral-900">绑定手机号</span>
                        {phone ? <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-0.5"><ShieldCheck className="w-3 h-3" />已验证</span>
                          : <span className="text-[10px] font-bold text-amber-600 flex items-center gap-0.5"><AlertCircle className="w-3 h-3" />未绑定</span>}
                      </div>
                      <div className="text-[10px] text-neutral-400 mt-0.5">用于登录与订单通知</div>
                    </div>
                    {!isBindOpen && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs text-neutral-600 tabular-nums">{phone ? (phone.slice(0, 3) + '****' + phone.slice(-4)) : '尚未绑定'}</span>
                        <button type="button" onClick={openBindPanel} className="h-7 px-2.5 rounded-lg bg-white ring-1 ring-black/[0.06] hover:bg-black/[0.03] hover:ring-black/[0.12] text-neutral-700 text-[11px] font-bold transition cursor-pointer">{phone ? '更换' : '去绑定'}</button>
                      </div>
                    )}
                  </div>
                  {phone && !isBindOpen && (
                    <button type="button" disabled={!userProfile.uid || isUnbinding} onClick={handleUnbindPhone} title={!userProfile.uid ? '当前为本地档案，暂不支持解绑' : undefined}
                      className={`mt-2 text-[10px] underline underline-offset-2 disabled:opacity-40 disabled:cursor-not-allowed ${unbindConfirming ? 'font-bold text-amber-600' : 'text-neutral-400 hover:text-amber-600'}`}>
                      {isUnbinding ? '解绑中...' : unbindConfirming ? '确认解绑' : '解绑手机号'}
                    </button>
                  )}
                  {isBindOpen && (
                    <div className="mt-3 rounded-xl border border-black/[0.08] bg-black/[0.02] p-3 space-y-2.5">
                      {phone && (
                        <div className="space-y-2 pb-2.5 border-b border-black/[0.05]">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-neutral-700">验证旧号 {phone.slice(0, 3)}****{phone.slice(-4)}</span>
                            {oldPhoneVerified && <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />已通过</span>}
                          </div>
                          {!oldPhoneVerified && (
                            <div className="flex flex-wrap items-center gap-2">
                              <input type="text" inputMode="numeric" maxLength={6} value={oldPhoneCode} onChange={(e) => setOldPhoneCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="旧号验证码"
                                className="w-32 h-8 px-2.5 rounded-lg border border-neutral-200 bg-white text-xs tabular-nums tracking-widest outline-none focus:border-emerald-600" />
                              <button type="button" disabled={oldPhoneCountdown > 0 || isSendingOldCode} onClick={handleSendOldCode} className="h-8 px-2.5 rounded-lg bg-black/[0.05] text-neutral-700 text-[11px] font-bold disabled:opacity-40 cursor-pointer">{isSendingOldCode ? '发送中' : oldPhoneCountdown > 0 ? oldPhoneCountdown + 's' : '获取旧号验证码'}</button>
                              <button type="button" disabled={isVerifyingOld} onClick={handleVerifyOldPhone} className="h-8 px-3 rounded-lg bg-emerald-600 text-white text-[11px] font-bold disabled:opacity-40 cursor-pointer">{isVerifyingOld ? '校验中' : '验证旧号'}</button>
                            </div>
                          )}
                        </div>
                      )}
                      <div className={`space-y-2 ${phone && !oldPhoneVerified ? 'opacity-40 pointer-events-none' : ''}`}>
                        <div className="flex flex-wrap items-center gap-2">
                          <input type="tel" inputMode="numeric" maxLength={11} value={bindPhone} onChange={(e) => setBindPhone(e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="11 位新手机号"
                            className="w-40 h-8 px-2.5 rounded-lg border border-neutral-200 bg-white text-xs tabular-nums outline-none focus:border-emerald-600" />
                          <button type="button" disabled={bindCountdown > 0 || isSendingBind} onClick={handleSendBindCode} className="h-8 px-2.5 rounded-lg bg-black/[0.05] text-neutral-700 text-[11px] font-bold disabled:opacity-40 cursor-pointer">{isSendingBind ? '发送中' : bindCountdown > 0 ? bindCountdown + 's' : '获取验证码'}</button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <input type="text" inputMode="numeric" maxLength={6} value={bindCode} onChange={(e) => setBindCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6 位验证码"
                            className="w-32 h-8 px-2.5 rounded-lg border border-neutral-200 bg-white text-xs tabular-nums tracking-widest outline-none focus:border-emerald-600" />
                          <button type="button" disabled={isBinding} onClick={handleConfirmBind} className="h-8 px-3 rounded-lg bg-emerald-600 text-white text-[11px] font-bold disabled:opacity-40 cursor-pointer">{isBinding ? '校验中' : '确认绑定'}</button>
                          <button type="button" onClick={closeBindPanel} className="ml-auto text-[11px] text-neutral-400 hover:text-neutral-700 cursor-pointer">取消</button>
                        </div>
                      </div>
                      <p className="text-[10px] text-neutral-400 border-t border-black/[0.05] pt-2">验证码 5 分钟有效 · 一个手机号仅可绑定一个账号</p>
                    </div>
                  )}
                </div>

                {/* 性别 */}
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-neutral-900">性别称谓</span>
                    <div className="text-[10px] text-neutral-400 mt-0.5">影响称呼与推荐</div>
                  </div>
                  <div className="inline-flex rounded-full bg-black/[0.03] ring-1 ring-black/[0.04] p-1 shrink-0">
                    {[{ val: 'secret', label: '保密' }, { val: 'male', label: '先生' }, { val: 'female', label: '女士' }].map((item) => (
                      <button key={item.val} type="button" onClick={() => setGender(item.val as any)}
                        className={`h-7 px-3 rounded-full text-[11px] font-bold cursor-pointer transition ${gender === item.val ? 'bg-white text-neutral-900 shadow-[0_1px_2px_rgba(17,24,39,0.1)] ring-1 ring-black/[0.06]' : 'text-neutral-500 hover:text-neutral-900'}`}>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 生日 */}
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <label className="text-xs font-bold text-neutral-900" htmlFor="birthday">生日</label>
                    <div className="text-[10px] text-neutral-400 mt-0.5">生日当月赠送甜品券</div>
                  </div>
                  <div className="relative w-full max-w-[200px] shrink-0">
                    <input id="birthday" type="text" value={birthday} onChange={(e) => setBirthday(e.target.value)} placeholder="YYYY/MM/DD"
                      className="w-full h-9 px-3 pr-8 rounded-lg bg-white ring-1 ring-black/[0.06] focus:ring-2 focus:ring-emerald-600/35 focus:border-emerald-600 border border-transparent outline-none text-xs text-neutral-900 transition tabular-nums placeholder:text-neutral-300" />
                    <Calendar className="w-3.5 h-3.5 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
                </div>
              </div>
              </div>
            </div>
          )}

          {/* TAB 2: 就餐偏好 */}
          {activeTab === 'tab-preference' && (
            <div className="animate-in fade-in duration-normal space-y-2.5" id="tab-panel-preference">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-emerald" />
                  <h3 className="text-base font-black tracking-tight text-neutral-900">就餐偏好</h3>
                </div>
                <button type="button" onClick={handleResetToInitial} className="h-7 px-2.5 rounded-lg bg-white ring-1 ring-black/[0.06] hover:bg-black/[0.03] hover:ring-black/[0.12] text-[11px] font-bold text-neutral-500 cursor-pointer transition">恢复默认</button>
              </div>

              {/* 区块 1：默认辣度 */}
              <div className="rounded-xl bg-black/[0.02] ring-1 ring-black/[0.04] p-3">
                <div className="flex items-baseline justify-between mb-2.5">
                  <span className="text-[11px] font-black text-neutral-500 tracking-wide">默认辣度</span>
                  <span className="text-[10px] text-neutral-400">下单自动带入</span>
                </div>
                <div className="inline-flex flex-wrap gap-1.5 p-1 rounded-full bg-black/[0.03] ring-1 ring-black/[0.04]">
                  {[{ id: 'none', label: '免辣' }, { id: 'mild', label: '微辣' }, { id: 'medium', label: '中辣' }, { id: 'hot', label: '重辣' }].map((item) => {
                    const isSel = spiciness === item.id;
                    return (
                      <button key={item.id} type="button" onClick={() => setSpiciness(item.id as any)}
                        className={`h-7 px-3.5 rounded-full text-[11px] font-bold cursor-pointer transition ${
                          isSel
                            ? 'bg-white text-emerald-700 ring-1 ring-black/[0.06] shadow-[0_1px_2px_rgba(17,24,39,0.1)]'
                            : 'text-neutral-500 hover:text-neutral-900'
                        }`}>
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 区块 2：下单开关 */}
              <div className="rounded-xl bg-black/[0.02] ring-1 ring-black/[0.04] px-3 pb-1">
                <div className="flex items-baseline justify-between pt-3">
                  <span className="text-[11px] font-black text-neutral-500 tracking-wide">下单偏好</span>
                  <span className="text-[10px] text-neutral-400 tabular-nums">已开启 {[ecoMode, autoCoupons, silentCall].filter(Boolean).length}/3</span>
                </div>
              <div className="divide-y divide-black/[0.04]">
                {[
                  { icon: Leaf, title: '低碳就餐（免一次性餐具）', sub: '每次点单 +5 积分', val: ecoMode, set: () => setEcoMode(!ecoMode), tone: 'bg-emerald-50 text-emerald-700' },
                  { icon: Tag, title: '自动选用最优满减券', sub: '省心立减', val: autoCoupons, set: () => setAutoCoupons(!autoCoupons), tone: 'bg-sky-50 text-sky-700' },
                  { icon: BellOff, title: '免电话打扰', sub: '仅短信或雷达提醒', val: silentCall, set: () => setSilentCall(!silentCall), tone: 'bg-amber-50 text-amber-700' }
                ].map((row) => {
                  const Icon = row.icon;
                  return (
                    <div key={row.title} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${row.tone}`}><Icon className="w-4 h-4" /></div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-neutral-900 truncate">{row.title}</div>
                          <div className="text-[10px] text-neutral-400 mt-0.5">{row.sub}</div>
                        </div>
                      </div>
                      <button type="button" onClick={row.set} aria-label={row.title} aria-pressed={!!row.val}
                        className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer shrink-0 ${row.val ? 'bg-emerald-600' : 'bg-neutral-300'}`}>
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-[0_1px_2px_rgba(17,24,39,0.25)] transition-transform ${row.val ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
              </div>

              {/* 区块 3：忌口标签 */}
              <div className="rounded-xl bg-black/[0.02] ring-1 ring-black/[0.04] p-3">
                <div className="flex items-baseline justify-between mb-2.5">
                  <span className="text-[11px] font-black text-neutral-500 tracking-wide">忌口标签</span>
                  <span className="text-[10px] text-neutral-400 tabular-nums">已选 {dietaryPresets.filter((t) => dietaryNotes.includes(t)).length} 项</span>
                </div>
                <div className="inline-flex flex-wrap gap-1 p-1 rounded-xl bg-black/[0.03] ring-1 ring-black/[0.04] mb-2.5 max-w-full">
                  {dietaryPresets.map((tag) => {
                    const isIncluded = dietaryNotes.includes(tag);
                    return (
                      <button key={tag} type="button" onClick={() => handleToggleDietaryTag(tag)} aria-pressed={isIncluded}
                        className={`h-7 px-2.5 rounded-lg text-[11px] font-semibold cursor-pointer transition ${
                          isIncluded
                            ? 'bg-white text-neutral-900 ring-1 ring-black/[0.06] shadow-[0_1px_2px_rgba(17,24,39,0.1)]'
                            : 'text-neutral-500 hover:bg-white/70 hover:text-neutral-900'
                        }`}>
                        {tag}
                      </button>
                    );
                  })}
                </div>
                <input id="dietary-notes" type="text" value={dietaryNotes} onChange={(e) => setDietaryNotes(e.target.value)} placeholder="其他过敏原或备注"
                  className="block w-full max-w-[320px] h-9 px-3 rounded-lg bg-white ring-1 ring-black/[0.06] focus:ring-2 focus:ring-emerald-600/35 focus:border-emerald-600 border border-transparent outline-none text-xs text-neutral-900 transition placeholder:text-neutral-300" />
              </div>
            </div>
          )}

          {/* TAB 3: 常用地址 */}
          {activeTab === 'tab-address' && (
            <div className="animate-in fade-in duration-normal" id="tab-panel-address">
              <div className="flex items-center justify-between pb-3 border-b border-black/[0.05]">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-emerald" />
                  <h3 className="text-base font-black tracking-tight text-neutral-900">常用地址 · {addresses.length} 处</h3>
                </div>
                <button type="button" id="btn-add-address" onClick={() => { setIsAddingAddress(true); setEditingAddress(null); setAddrName(nickname); setAddrPhone(phone); setAddrLocation(''); setAddrHouseNumber(''); setAddrDetail(''); setAddrRemarks(''); setAddrLat(31.2435); setAddrLng(121.469); }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/[0.05] hover:bg-black/[0.09] ring-1 ring-black/[0.07] text-neutral-700 text-xs font-bold transition cursor-pointer"><Plus className="w-3.5 h-3.5" />新增地址</button>
              </div>

              <div className="flex flex-wrap items-center gap-2 py-3">
                <div className="inline-flex flex-wrap gap-1 p-1 rounded-xl bg-black/[0.03] ring-1 ring-black/[0.04]">
                  {([
                    { key: 'all', label: '全部' }, { key: '公司', label: '写字楼' }, { key: '家', label: '住宅' }, { key: '学校', label: '高校' }, { key: '其他', label: '临时' }
                  ] as const).map((item) => (
                    <button key={item.key} type="button" onClick={() => setAddressTagFilter(item.key as any)} aria-pressed={addressTagFilter === item.key}
                      className={`h-7 px-2.5 rounded-lg text-[11px] cursor-pointer transition ${
                        addressTagFilter === item.key
                          ? 'bg-white text-neutral-900 font-bold ring-1 ring-black/[0.06] shadow-[0_1px_2px_rgba(17,24,39,0.1)]'
                          : 'text-neutral-500 font-semibold hover:bg-white/70 hover:text-neutral-900'
                      }`}>
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="relative ml-auto w-40">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input type="text" value={addressSearchQuery} onChange={(e) => setAddressSearchQuery(e.target.value)} placeholder="搜索地址..."
                    className="w-full h-8 pl-8 pr-3 rounded-lg bg-white ring-1 ring-black/[0.06] border border-transparent text-xs outline-none focus:ring-2 focus:ring-emerald-600/35 focus:border-emerald-600 placeholder:text-neutral-300" />
                </div>
              </div>

              {(isAddingAddress || editingAddress) && (
                <div className="mb-3 p-4 rounded-2xl ring-1 ring-black/[0.07] bg-black/[0.02] space-y-3 animate-in fade-in duration-fast">
                  <div className="flex items-center justify-between pb-2.5 border-b border-black/[0.05]">
                    <span className="text-xs font-bold text-neutral-900">{editingAddress ? '编辑送达地址' : '录入新地址'}</span>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={handleSimulateGpsAutofill} className="text-[11px] px-2.5 py-1 rounded-full bg-white ring-1 ring-black/[0.07] text-neutral-600 cursor-pointer flex items-center gap-1"><Crosshair className="w-3 h-3" />GPS 演示</button>
                      <button type="button" onClick={() => { setIsAddingAddress(false); setEditingAddress(null); }} className="text-neutral-400 hover:text-neutral-700 cursor-pointer p-1"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { label: '联系人', val: addrName, set: setAddrName, ph: '收货人姓名' },
                      { label: '手机号', val: addrPhone, set: setAddrPhone, ph: '联系电话' },
                      { label: '建筑/商圈', val: addrLocation, set: setAddrLocation, ph: '例: 静安大悦城南座' },
                      { label: '门牌号', val: addrHouseNumber, set: setAddrHouseNumber, ph: '例: 南座8楼801室' },
                      { label: '详细街道', val: addrDetail, set: setAddrDetail, ph: '例: 西藏北路166号' },
                      { label: '交接备注', val: addrRemarks, set: setAddrRemarks, ph: '例: 放前台外卖架' }
                    ].map((f) => (
                      <div key={f.label}>
                        <label className="block text-[11px] font-bold text-neutral-600 mb-1">{f.label}</label>
                        <input type="text" value={f.val} onChange={(e) => f.set(e.target.value)} placeholder={f.ph}
                          className="w-full h-8 px-3 rounded-lg border border-neutral-200 bg-white text-xs outline-none focus:border-emerald-600" />
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold text-neutral-600">类别</span>
                    <div className="inline-flex flex-wrap gap-1 p-1 rounded-xl bg-black/[0.03] ring-1 ring-black/[0.04]">
                      {(['公司', '家', '学校', '其他'] as const).map((tag) => (
                        <button key={tag} type="button" onClick={() => setAddrTag(tag)}
                          className={`h-7 px-3 rounded-lg text-[11px] cursor-pointer transition ${addrTag === tag ? 'bg-white text-neutral-900 font-bold ring-1 ring-black/[0.06] shadow-[0_1px_2px_rgba(17,24,39,0.1)]' : 'text-neutral-500 font-semibold hover:bg-white/70'}`}>{tag}</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-neutral-400 flex items-center gap-1"><Compass className="w-3 h-3" />快速导入</span>
                    {PRESET_DISTRICT_ADDRESSES.map((preset, idx) => (
                      <button key={idx} type="button" onClick={() => handleApplyPreset(preset)} title={preset.address}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-white ring-1 ring-black/[0.07] text-neutral-500 hover:text-emerald-700 cursor-pointer truncate max-w-[120px]">{preset.address}</button>
                    ))}
                  </div>
                  {addrLat && addrLng && <div className="text-[10px] text-neutral-500 flex items-center gap-1.5 tabular-nums"><Navigation className="w-3 h-3 text-emerald-600" />GPS {addrLat.toFixed(4)}°N, {addrLng.toFixed(4)}°E</div>}
                  <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-black/[0.05]">
                    <button type="button" onClick={() => { setIsAddingAddress(false); setEditingAddress(null); }} className="h-8 px-4 rounded-full bg-white ring-1 ring-black/[0.07] text-neutral-700 text-xs font-bold cursor-pointer">取消</button>
                    <button type="button" id="btn-confirm-save-addr" onClick={handleSaveAddress} className="h-8 px-4 rounded-full bg-emerald-600 text-white text-xs font-bold cursor-pointer">保存地址</button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="address-list-container">
                {filteredAddresses.map((addr, idx) => {
                  const isDef = !!addr.isDefault;
                  return (
                    <div key={addr.id} id={`address-card-${addr.id}`} className={`rounded-2xl p-3.5 transition flex flex-col gap-2 bg-white/72 backdrop-blur-xl shadow-[0_12px_32px_-16px_rgba(17,24,39,0.3),inset_0_1px_0_rgba(255,255,255,0.85)] ${isDef ? 'ring-1 ring-emerald-500/40 hover:bg-white/90' : 'ring-1 ring-black/[0.07] hover:bg-white/90'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`bg-black/[0.05] ring-1 ring-black/[0.05] px-1.5 py-0.2 rounded text-[11px] font-bold text-neutral-600 ${addr.tag === '家' ? '!bg-emerald-50 !text-emerald-700' : ''}`}>{addr.tag}</span>
                          {isDef && <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-0.5"><Check className="w-3 h-3 stroke-[3]" />默认</span>}
                        </div>
                        <span className="text-[10px] text-neutral-400 tabular-nums">{addr.latitude ? addr.latitude.toFixed(2) + '°N' : ''}</span>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-black/[0.05] flex items-center justify-center text-neutral-700 flex-shrink-0"><MapPin className="w-4 h-4" /></div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-neutral-900 truncate">{addr.address}</div>
                          <div className="text-[11px] text-neutral-500 mt-0.5">{addr.detail}{addr.houseNumber ? ' · ' + addr.houseNumber : ''}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-black/[0.05]">
                        <span className="text-[11px] text-neutral-500 truncate"><span className="font-bold text-neutral-900">{addr.name}</span> · <span className="tabular-nums">{addr.phone}</span></span>
                        <div className="flex items-center gap-1 shrink-0">
                          {!isDef && <button type="button" onClick={() => handleSetDefaultAddress(addr.id)} className="text-[11px] px-1.5 py-0.2 rounded bg-black/[0.05] ring-1 ring-black/[0.05] text-neutral-600 hover:text-emerald-700 cursor-pointer">默认</button>}
                          <button type="button" onClick={() => handleSimulateRadarCheck(addr)} className="w-7 h-7 rounded-full bg-white/72 backdrop-blur-md ring-1 ring-black/[0.07] flex items-center justify-center text-neutral-600 shadow-[0_1px_2px_rgba(17,24,39,0.05)] hover:bg-white/90 active:scale-95 transition cursor-pointer" title="雷达测距"><Crosshair className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => handleCopyAddressInfo(addr)} className="w-7 h-7 rounded-full bg-white/72 backdrop-blur-md ring-1 ring-black/[0.07] flex items-center justify-center text-neutral-600 shadow-[0_1px_2px_rgba(17,24,39,0.05)] hover:bg-white/90 active:scale-95 transition cursor-pointer" title="复制"><Copy className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => { setEditingAddress(addr); setIsAddingAddress(false); setAddrName(addr.name); setAddrPhone(addr.phone); setAddrTag(addr.tag); setAddrLocation(addr.address); setAddrHouseNumber(addr.houseNumber || ''); setAddrDetail(addr.detail); setAddrRemarks(addr.remarks || ''); setAddrLat(addr.latitude); setAddrLng(addr.longitude); }} className="w-7 h-7 rounded-full bg-white/72 backdrop-blur-md ring-1 ring-black/[0.07] flex items-center justify-center text-neutral-600 shadow-[0_1px_2px_rgba(17,24,39,0.05)] hover:bg-white/90 active:scale-95 transition cursor-pointer" title="编辑"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => { if (window.confirm(`确定移除常用地址【${addr.address}】？`)) handleDeleteAddress(addr.id); }} className="w-7 h-7 rounded-full bg-white/72 backdrop-blur-md ring-1 ring-black/[0.07] flex items-center justify-center text-neutral-400 hover:text-rose-600 shadow-[0_1px_2px_rgba(17,24,39,0.05)] hover:bg-white/90 active:scale-95 transition cursor-pointer" title="删除"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div onClick={() => { setIsAddingAddress(true); setEditingAddress(null); setAddrName(nickname); setAddrPhone(phone); setAddrLocation(''); setAddrHouseNumber(''); setAddrDetail(''); setAddrRemarks(''); setAddrLat(31.2435); setAddrLng(121.469); }}
                  className="border-2 border-dashed border-neutral-300 hover:border-emerald-500 rounded-2xl flex flex-col items-center justify-center p-5 min-h-[130px] cursor-pointer group">
                  <div className="w-8 h-8 rounded-lg bg-black/[0.05] flex items-center justify-center text-neutral-400 group-hover:bg-emerald-600 group-hover:text-white transition"><Plus className="w-4 h-4" /></div>
                  <span className="text-xs font-semibold text-neutral-600 mt-2">新增送达地址</span>
                </div>
              </div>

              {filteredAddresses.length === 0 && (
                <div id="address-empty-state" className="flex flex-col items-center py-10 text-center">
                  <MapPin className="w-7 h-7 text-neutral-300 mb-2" />
                  <span className="text-xs text-neutral-500 font-bold">未匹配到地址</span>
                  <button type="button" onClick={() => { setAddressSearchQuery(''); setAddressTagFilter('all'); }} className="mt-2 text-[11px] text-emerald-700 font-bold cursor-pointer">重置筛选</button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: 安全凭据 */}
          {activeTab === 'tab-security' && (
            <div className="animate-in fade-in duration-normal" id="tab-panel-security">
              <div className="flex items-center justify-between pb-3 border-b border-black/[0.05]">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-emerald" />
                  <h3 className="text-base font-black tracking-tight text-neutral-900">安全凭据</h3>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />防御生效中</span>
              </div>
              <div className="divide-y divide-black/[0.05]">
                <div className="flex items-center justify-between gap-4 py-3.5">
                  <span className="text-xs font-bold text-neutral-900">云端唯一 UID</span>
                  <span className="text-xs text-neutral-600 tabular-nums truncate max-w-[220px]">{cloudUid}</span>
                </div>
                <div className="flex items-center justify-between gap-4 py-3.5">
                  <span className="text-xs font-bold text-neutral-900">硬件签名令牌</span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs text-neutral-600 tabular-nums truncate max-w-[190px]">{hwToken}</span>
                    <button type="button" onClick={() => { navigator.clipboard.writeText(hwToken); toast.info('复制成功', '硬件 Token 已复制到剪贴板'); }} className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-black/[0.05] cursor-pointer" title="复制"><Copy className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 py-3.5">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-neutral-900">重新签发凭证</div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">更换设备或重装系统后使用</div>
                  </div>
                  <button type="button" id="reissue-key-btn" onClick={handleReissueKey} className="h-8 px-3.5 shrink-0 rounded-full bg-black/[0.05] hover:bg-black/[0.09] ring-1 ring-black/[0.07] text-[11px] font-bold text-neutral-800 cursor-pointer">重新签发</button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: 财务对账 */}
          {activeTab === 'tab-finance' && (
            <div className="animate-in fade-in duration-normal" id="tab-panel-finance">
              <div className="flex items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-emerald" />
                  <h3 className="text-base font-black tracking-tight text-neutral-900">财务对账</h3>
                </div>
                <span className="text-[10px] text-neutral-400">流水实时同步</span>
              </div>
              <div className="grid grid-cols-3 divide-x divide-black/[0.05] rounded-xl bg-black/[0.02] ring-1 ring-black/[0.04] py-2.5 max-w-[560px]">
                <div className="px-3"><div className="text-[10px] text-neutral-400">可用余额</div><div className="text-lg font-extrabold text-neutral-900 leading-tight tabular-nums mt-0.5">¥{balance.toFixed(2)}</div></div>
                <div className="px-3"><div className="text-[10px] text-neutral-400">尊享积分</div><div className="text-lg font-extrabold text-brand-emerald leading-tight tabular-nums mt-0.5">{points}</div></div>
                <div className="px-3"><div className="text-[10px] text-neutral-400">待清算</div><div className="text-lg font-extrabold text-neutral-400 leading-tight tabular-nums mt-0.5">¥0.00</div></div>
              </div>
              <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-black/[0.03] ring-1 ring-black/[0.04] my-3 w-fit max-w-full">
                {[{ key: 'all', label: '全部' }, { key: 'recharge', label: '充值' }, { key: 'expense', label: '扣款' }, { key: 'points', label: '积分' }].map((f) => (
                  <button key={f.key} type="button" onClick={() => setFinanceFilter(f.key as any)} aria-pressed={financeFilter === f.key}
                    className={`h-7 px-3 rounded-lg text-[11px] cursor-pointer transition ${
                      financeFilter === f.key
                        ? 'bg-white text-neutral-900 font-bold ring-1 ring-black/[0.06] shadow-[0_1px_2px_rgba(17,24,39,0.1)]'
                        : 'text-neutral-500 font-semibold hover:bg-white/70 hover:text-neutral-900'
                    }`}>{f.label}</button>
                ))}
              </div>
              <div className="divide-y divide-black/[0.05]">
                {filteredFinancialRecords.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.type === 'recharge' ? 'bg-emerald-50 text-emerald-700' : item.type === 'points' ? 'bg-violet-50 text-violet-700' : 'bg-black/[0.05] text-neutral-700'}`}><CreditCard className="w-4 h-4" /></div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-neutral-900 truncate">{item.title}</div>
                        <div className="text-[11px] text-neutral-400 mt-0.5">{item.sub} · {item.time}</div>
                      </div>
                    </div>
                    <span className={`text-sm font-bold tabular-nums shrink-0 ${item.amount.startsWith('+') ? 'text-emerald-700' : 'text-neutral-900'}`}>{item.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

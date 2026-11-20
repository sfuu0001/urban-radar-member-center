import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Smartphone,
  Lock,
  User,
  Fingerprint,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  RotateCw,
  RefreshCw,
  Gift,
  Check,
  Flame,
  KeyRound,
  Send,
  Clock,
  Database,
  MessageSquare,
  Cpu,
  Hash,
  UserRound
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { UserProfile } from '../../types/user';
import { INITIAL_USER_PROFILE } from '../../data/mockUser';
import { safeGetStorage, safeSetStorage } from '../../utils/safeStorage';
import {
  sendSmsCode,
  verifySmsCode,
  getAuthSettings,
  getVerifyState,
  markPhoneVerified,
  passwordRegister,
  passwordLogin,
  issueDeviceToken,
  validateDeviceToken,
  type SmsCaptcha
} from '../../utils/smsService';
import { wbDb } from '../../utils/wbCloud';
import { collectDeviceHardwareDetails, DeviceHardwareDetails } from '../../utils/deviceFingerprint';
import { performAutoLogin } from '../../utils/autoAuthEngine';
import { useToast } from '../ui/ToastContext';

export interface UserAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register' | 'sms' | 'password' | 'auto' | 'presets';
  onLoginSuccess: (user: UserProfile) => void;
}

/** 本机免登录设备令牌的 storage key（App 全局时效检查复用） */
export const DEVICE_TOKEN_KEY = 'obsidian_device_token';

const PRESET_AVATARS = [
  '/img/bf32727d20d1.webp',
  '/img/414ed165a273.webp',
  '/img/80c0a3a6d8d7.webp',
  '/img/bacfc6e1198d.webp',
  '/img/5d43216dd241.webp'
];

export const UserAuthModal: React.FC<UserAuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'sms',
  onLoginSuccess
}) => {
  const toast = useToast();

  // Tab: 'sms' (验证码登录/自动注册) | 'password' (密码登录/注册) | 'auto' (免密智能识别)
  // 注：「预设账号」入口已下线；外部若仍传 initialMode='presets'，运行时统一回落 sms
  const [tab, setTab] = useState<'sms' | 'password' | 'auto'>(() => {
    if (initialMode === 'register' || initialMode === 'login' || initialMode === 'password') return 'password';
    if (initialMode === 'auto') return 'auto';
    return 'sms';
  });

  // Password Sub-mode: 'login' | 'register'
  const [isRegisterMode, setIsRegisterMode] = useState(initialMode === 'register');

  useEffect(() => {
    if (isOpen) {
      if (initialMode === 'register') {
        setTab('password');
        setIsRegisterMode(true);
      } else if (initialMode === 'login' || initialMode === 'password') {
        setTab('password');
        setIsRegisterMode(false);
      } else if (initialMode === 'auto') {
        setTab('auto');
      } else {
        setTab('sms');
      }
    }
  }, [isOpen, initialMode]);

  // Form State - SMS
  const [smsPhone, setSmsPhone] = useState('138-8888-9201');
  const [smsCode, setSmsCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isSendingCode, setIsSendingCode] = useState(false);
  // 图形验证码（服务端 428 时下发，防止同 IP 刷短信）
  const [captcha, setCaptcha] = useState<SmsCaptcha | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  // 总部下发的手机号验证有效期（天）；取不到则不展示对应文案
  const [reverifyDays, setReverifyDays] = useState<number | null>(null);

  // Form State - Password Login/Register（双因子：手机号 + 短信码 + 密码）
  const [accountInput, setAccountInput] = useState('13888889201');
  const [pwdCode, setPwdCode] = useState('');
  const [pwdCountdown, setPwdCountdown] = useState(0);
  const [isSendingPwdCode, setIsSendingPwdCode] = useState(false);
  const [passwordInput, setPasswordInput] = useState('12345678');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('12345678');
  const [registerNickname, setRegisterNickname] = useState('黑曜石新星食客');
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0]);
  const [showPassword, setShowPassword] = useState(false);

  // General Loading & Error
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hardwareDetails, setHardwareDetails] = useState<DeviceHardwareDetails | null>(null);

  // 动效偏好降级（bx-motion-design 纪律：prefers-reduced-motion 时必须静态化）
  const reduceMotion = useReducedMotion();
  // 输入框聚焦态，仅驱动前置图标的微反馈，不参与业务逻辑
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // SMS Timer Effect
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown]);

  // 密码 tab 短信码倒计时（与短信 tab 独立，避免互相干扰）
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (pwdCountdown > 0) {
      timer = setTimeout(() => setPwdCountdown((c) => c - 1), 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [pwdCountdown]);

  // Load hardware details when modal opens
  useEffect(() => {
    if (isOpen) {
      collectDeviceHardwareDetails().then(setHardwareDetails).catch(() => {});
      setErrorMessage(null);
    }
  }, [isOpen]);

  // 挂载时拉取一次总部验证策略，仅用于短信 tab 的有效期文案
  useEffect(() => {
    void getAuthSettings().then((s) => {
      if (s && typeof s.phoneReverifyDays === 'number') setReverifyDays(s.phoneReverifyDays);
    });
  }, []);

  // 全屏门禁：Esc 关闭 + 锁定页面滚动（全屏层铺满视口，背后页面不应跟着滚）
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Send Verification Code Simulator
  const handleSendSmsCode = async () => {
    const clean = smsPhone.replace(/\D/g, '');
    if (clean.length !== 11) {
      setErrorMessage('请输入正确的 11 位手机号码');
      return;
    }
    setErrorMessage(null);
    setIsSendingCode(true);
    // 真实短信：服务端下发并限频；演示通道才会回传 devCode
    const res = await sendSmsCode(clean, 'login');
    setIsSendingCode(false);

    if (!res.ok) {
      if (res.captchaRequired && res.captcha) {
        setCaptcha(res.captcha);
        setCaptchaAnswer('');
        setErrorMessage(res.message || '操作过于频繁，请完成验证');
        return;
      }
      setErrorMessage(res.message || '验证码发送失败，请稍后重试');
      return;
    }

    setCountdown(res.retryAfter && res.retryAfter > 60 ? res.retryAfter : 60);
    if (res.mock && res.devCode) {
      // 仅演示通道（服务器 SMS_MOCK=1）才自动填码，并明确告知
      setSmsCode(res.devCode);
      toast.info('演示通道验证码', `当前为演示通道（未真实发送）：${res.devCode}`);
    } else {
      toast.success('验证码已发送', `请查收 ${clean.slice(0, 3)}****${clean.slice(-4)} 的短信`);
    }
  };

  /** 图形验证码作答后重发 */
  const handleCaptchaSend = async () => {
    if (!captcha || !captchaAnswer.trim()) return;
    const clean = smsPhone.replace(/\D/g, '');
    setIsSendingCode(true);
    const res = await sendSmsCode(clean, 'login', {
      captchaId: captcha.id,
      captchaAnswer: captchaAnswer.trim(),
      captchaSig: captcha.sig
    });
    setIsSendingCode(false);
    if (!res.ok) {
      setErrorMessage(res.message || '验证失败，请重试');
      if (res.captcha) { setCaptcha(res.captcha); setCaptchaAnswer(''); }
      return;
    }
    setCaptcha(null);
    setCountdown(res.retryAfter && res.retryAfter > 60 ? res.retryAfter : 60);
    if (res.mock && res.devCode) setSmsCode(res.devCode);
    toast.success('验证码已发送', '请查看手机短信');
  };

  /**
   * 登录成功后签发本机免登录令牌（三条登录链路统一走这里）。
   * 签发失败不阻断登录，仅 console.warn；令牌有效期由服务端按当前 phoneReverifyDays 决定。
   */
  const issueTokenAfterLogin = async (phone: string, uid?: string) => {
    try {
      const t = await issueDeviceToken({
        phone,
        ...(hardwareDetails?.hardwareHash ? { deviceHash: hardwareDetails.hardwareHash } : {}),
        ...(uid ? { uid } : {})
      });
      if (t.ok && t.token) {
        // 验证通过并成功签令：解除"待验证"标记
        try { localStorage.removeItem('obsidian_auth_needs_verify'); } catch { /* 忽略 */ }
        safeSetStorage(DEVICE_TOKEN_KEY, {
          token: t.token,
          issuedAt: new Date().toISOString(),
          ...(t.days !== undefined ? { days: t.days } : {}),
          ...(t.expiresAt ? { expiresAt: t.expiresAt } : {})
        });
      } else {
        console.warn('[设备令牌] 签发失败，本机免登录不可用：', t.message);
      }
    } catch (e) {
      console.warn('[设备令牌] 签发异常，本机免登录不可用：', e);
    }
  };

  // Submit SMS Login / Auto-Registration
  const handleSubmitSms = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = smsPhone.replace(/\D/g, '');
    if (cleanPhone.length !== 11) {
      setErrorMessage('请输入正确的 11 位手机号码');
      return;
    }
    if (!/^\d{6}$/.test(smsCode.trim())) {
      setErrorMessage('请输入 6 位短信验证码');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    // 1) 服务端验签：不通过就不允许登录（此前的漏洞就在这里）
    const verified = await verifySmsCode(cleanPhone, smsCode.trim(), 'login');
    if (!verified.ok) {
      setIsLoading(false);
      setErrorMessage(verified.message || '验证码校验失败');
      return;
    }

    try {
      // 2) 云端档案优先：同一手机号复用已有账号
      let cloudRow: any = null;
      try {
        const { data } = await wbDb
          .from('profiles')
          .select('uid,nickname,phone,payload,membership_tier,is_vip_active,points,balance')
          .eq('phone', cleanPhone)
          .limit(1);
        cloudRow = Array.isArray(data) ? data[0] : null;
      } catch {
        /* 云端不可达时走本地 */
      }

      const existing = safeGetStorage<UserProfile>('obsidian_user_profile', INITIAL_USER_PROFILE);
      let userToLogin: UserProfile;

      if (cloudRow?.uid) {
        userToLogin = {
          ...existing,
          uid: String(cloudRow.uid),
          nickname: cloudRow.nickname || existing.nickname,
          phone: cleanPhone,
          cloudSyncedAt: new Date().toISOString()
        };
        toast.success('登录成功', `欢迎回来，${userToLogin.nickname}！`);
      } else if (existing.phone && existing.phone.replace(/\D/g, '') === cleanPhone) {
        userToLogin = { ...existing, phone: cleanPhone };
        toast.success('登录成功', `欢迎回来，${userToLogin.nickname}！`);
      } else {
        // 3) 支持注册：验证码通过后建号，并写入云端 profiles（手机号有唯一约束）
        const shortUid = `tcb_u_${cleanPhone.slice(-4)}${Math.random().toString(36).slice(2, 5)}`;
        userToLogin = {
          ...INITIAL_USER_PROFILE,
          uid: shortUid,
          nickname: `新注册食客 (${cleanPhone.slice(-4)})`,
          phone: cleanPhone,
          avatar: PRESET_AVATARS[1],
          bio: '黑曜石移动餐车新注册食客',
          membershipTier: 'vip_black_elite',
          isVIPActive: true,
          points: 1200,
          balance: 88.0,
          preferences: {
            spiciness: 'mild',
            cutlery: 'eco',
            autoApplyCoupons: true,
            radarTracking: true,
            smsNotification: true
          },
          walletHistory: [
            {
              id: `w-reg-${Date.now()}`,
              type: 'reward',
              title: '手机验证码注册 · 迎新赠礼',
              amount: 88.0,
              balanceAfter: 88.0,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ],
          cloudSyncedAt: new Date().toISOString(),
          authProvider: 'cloudbase_auth',
          createdAt: new Date().toISOString()
        };

        const { error } = await wbDb.from('profiles').upsert(
          {
            uid: shortUid,
            nickname: userToLogin.nickname,
            phone: cleanPhone,
            membership_tier: 'vip_black_elite',
            is_vip_active: true,
            points: 1200,
            balance: 88,
            auth_provider: 'phone_sms',
            updated_at: new Date().toISOString()
          },
          { onConflict: 'uid' }
        );
        if (error) {
          // profiles.phone 有唯一索引：号码已被别的账号占用时不再"假成功"
          setIsLoading(false);
          setErrorMessage('该手机号已绑定其他账号，请联系客服或换号登录');
          return;
        }
        toast.success('注册并登录成功！', '已为新手机号创建账号，并赠送 ¥88 迎新金');
      }

      // 短信验证成功打点：刷新本机手机号最近验证时间，供设备快速登录的有效期闸门判断
      // hardwareHash 取不到时省略，fire-and-forget 失败静默，绝不影响登录主流程
      void markPhoneVerified(
        cleanPhone,
        userToLogin.uid,
        hardwareDetails?.hardwareHash || undefined
      );

      safeSetStorage('obsidian_user_profile', userToLogin);
      // 短信登录成功后签发设备令牌（失败不阻断登录）
      await issueTokenAfterLogin(cleanPhone, userToLogin.uid);
      onLoginSuccess(userToLogin);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  /** 密码 tab 获取短信验证码（双因子第一因子） */
  const handleSendPwdCode = async () => {
    const clean = accountInput.replace(/\D/g, '');
    if (clean.length !== 11) {
      setErrorMessage('请输入正确的 11 位手机号码');
      return;
    }
    setErrorMessage(null);
    setIsSendingPwdCode(true);
    // 与短信 tab 共用同一发送接口；触发限频（428）时按总部策略提示先走短信免密完成图形验证
    const res = await sendSmsCode(clean, 'login');
    setIsSendingPwdCode(false);

    if (!res.ok) {
      if (res.captchaRequired) {
        setErrorMessage('操作过于频繁，请先到「短信免密」完成图形验证后再试');
        return;
      }
      setErrorMessage(res.message || '验证码发送失败，请稍后重试');
      return;
    }

    setPwdCountdown(res.retryAfter && res.retryAfter > 60 ? res.retryAfter : 60);
    if (res.mock && res.devCode) {
      // 仅演示通道（SMS_MOCK=1）自动填码，并明确告知
      setPwdCode(res.devCode);
      toast.info('演示通道验证码', `当前为演示通道（未真实发送）：${res.devCode}`);
    } else {
      toast.success('验证码已发送', `请查收 ${clean.slice(0, 3)}****${clean.slice(-4)} 的短信`);
    }
  };

  // Submit Password Login or Registration（双因子：短信码 + 密码，全部走服务端校验）
  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanPhone = accountInput.replace(/\D/g, '');
    if (cleanPhone.length !== 11) {
      setErrorMessage('请输入 11 位手机号');
      return;
    }
    if (!/^\d{6}$/.test(pwdCode)) {
      setErrorMessage('请输入 6 位短信验证码');
      return;
    }
    if (!passwordInput) {
      setErrorMessage('请输入密码');
      return;
    }

    if (isRegisterMode) {
      if (!registerNickname.trim()) {
        setErrorMessage('请输入食客昵称');
        return;
      }
      if (passwordInput.length < 8) {
        setErrorMessage('密码长度不能少于 8 位');
        return;
      }
      if (passwordInput !== confirmPasswordInput) {
        setErrorMessage('两次输入的密码不一致');
        return;
      }
    }

    setIsLoading(true);
    const deviceHash = hardwareDetails?.hardwareHash || undefined;

    try {
      if (isRegisterMode) {
        // 注册态：调用双因子注册接口，短信码 + 密码均由服务端校验
        const result = await passwordRegister({
          phone: cleanPhone,
          password: passwordInput,
          code: pwdCode,
          deviceHash
        });
        if (!result.ok) {
          if (result.error === 'ALREADY_REGISTERED') {
            setErrorMessage('该手机号已设置密码，请切到登录');
          } else {
            setErrorMessage(result.message || '注册失败，请稍后重试');
          }
          return;
        }

        // 用服务端返回的 uid 组装档案，沿用现有注册字段与 ¥88 迎新礼逻辑
        const uid = result.uid || `tcb_u_${cleanPhone.slice(-4)}${Math.random().toString(36).slice(2, 5)}`;
        const registeredUser: UserProfile = {
          ...INITIAL_USER_PROFILE,
          uid,
          nickname: registerNickname.trim(),
          phone: cleanPhone,
          avatar: selectedAvatar,
          bio: '黑曜石移动餐车站常驻先锋食客。',
          gender: 'secret',
          birthday: '1998-08-08',
          membershipTier: 'vip_black_elite',
          isVIPActive: true,
          points: 1500,
          balance: 88.0,
          addresses: [
            {
              id: `addr-${Date.now()}`,
              name: registerNickname.trim(),
              phone: cleanPhone,
              tag: '公司',
              address: '静安大悦城北座 1F 中庭',
              detail: '站前自提点',
              isDefault: true,
              createdAt: new Date().toISOString()
            }
          ],
          preferences: {
            spiciness: 'mild',
            cutlery: 'eco',
            autoApplyCoupons: true,
            radarTracking: true,
            smsNotification: true
          },
          walletHistory: [
            {
              id: `w-reg-${Date.now()}`,
              type: 'reward',
              title: '账号注册成功 · 赠送迎新体验金',
              amount: 88.0,
              balanceAfter: 88.0,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ],
          cloudSyncedAt: new Date().toISOString(),
          authProvider: 'cloudbase_auth',
          createdAt: new Date().toISOString()
        };

        safeSetStorage('obsidian_user_profile', registeredUser);
        // 密码注册成功后签发设备令牌（失败不阻断注册/登录）
        await issueTokenAfterLogin(cleanPhone, registeredUser.uid);
        toast.success('账号注册成功', `欢迎加入黑曜石会员，UID: ${registeredUser.uid}`);
        onLoginSuccess(registeredUser);
        onClose();
      } else {
        // 登录态：调用双因子登录接口，失败按服务端 message 展示（含"还可试 N 次"/锁定提示）
        const result = await passwordLogin({
          phone: cleanPhone,
          password: passwordInput,
          code: pwdCode,
          deviceHash
        });
        if (!result.ok) {
          setErrorMessage(result.message || '登录失败，请稍后重试');
          return;
        }

        const uid = result.uid || '';
        // 云端档案优先：按手机号复用已有账号资料，取不到则用本地档案 + 返回 uid
        let cloudRow: any = null;
        try {
          const { data } = await wbDb
            .from('profiles')
            .select('uid,nickname,phone')
            .eq('phone', cleanPhone)
            .limit(1);
          cloudRow = Array.isArray(data) ? data[0] : null;
        } catch {
          /* 云端不可达时走本地档案 */
        }

        const existing = safeGetStorage<UserProfile>('obsidian_user_profile', INITIAL_USER_PROFILE);
        const userToLogin: UserProfile = {
          ...existing,
          uid: cloudRow?.uid ? String(cloudRow.uid) : uid || existing.uid,
          nickname: cloudRow?.nickname || existing.nickname,
          phone: cleanPhone,
          cloudSyncedAt: new Date().toISOString()
        };

        safeSetStorage('obsidian_user_profile', userToLogin);
        // 密码双因子登录成功后签发设备令牌（失败不阻断登录）
        await issueTokenAfterLogin(cleanPhone, userToLogin.uid);
        toast.success('密码登录成功', `欢迎回来，${userToLogin.nickname}`);
        onLoginSuccess(userToLogin);
        onClose();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Perform Hardware Auto-Login（保留设备指纹入口：仅当令牌无效/过期才要求短信验证）
  const handleAutoLoginClick = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const savedProfile = safeGetStorage<UserProfile>('obsidian_user_profile', INITIAL_USER_PROFILE);
      const phone = (savedProfile?.phone || '').replace(/\D/g, '');

      // 1) 本机未签发过设备令牌 → 尚未授权免登录，切短信 tab
      const stored = safeGetStorage<{ token?: string } | null>(DEVICE_TOKEN_KEY, null);
      if (!stored?.token) {
        setTab('sms');
        if (phone.length === 11) setSmsPhone(phone);
        setErrorMessage('本设备尚未授权免登录，请先验证手机号');
        return;
      }

      // 2) 有令牌 → 校验令牌；同时用 /auth/verify-state 兜底，二者取更严格的结果
      const res = await validateDeviceToken(stored.token, hardwareDetails?.hardwareHash || undefined);

      let needsReverify = false; // verify-state 不可达时保持原语义：保守放行
      let verifyMessage = '';
      let verifyDays = 0;
      if (phone.length === 11) {
        const st = await getVerifyState(phone);
        needsReverify = st.needsReverify;
        verifyMessage = st.message || '';
        verifyDays = st.days;
      }

      // 更严格：令牌明确无效、或 verify-state 判定需重验，都视为失效；
      // 令牌接口不可达（res.ok=false）时完全以 verify-state 为准；两者都不可达且无手机号则要求验证
      const tokenDefinitelyInvalid = res.ok && !res.valid;
      const tokenUnreachable = !res.ok;
      let invalid = false;
      let failMessage = '';
      if (needsReverify) {
        invalid = true;
        failMessage = verifyMessage || `距上次验证超过 ${verifyDays} 天，请重新验证手机号`;
      } else if (tokenDefinitelyInvalid) {
        invalid = true;
        failMessage = res.message || '';
      } else if (tokenUnreachable && phone.length !== 11) {
        invalid = true;
      }

      if (invalid) {
        // 免登录失效 → 清除本地令牌、切短信 tab、预填本地档案手机号
        safeSetStorage(DEVICE_TOKEN_KEY, null);
        setTab('sms');
        if (phone.length === 11) setSmsPhone(phone);
        setErrorMessage(failMessage || '免登录已失效，请重新验证手机号');
        return;
      }

      // 3) 令牌有效 → 继续原有指纹匹配免登录
      const result = await performAutoLogin();
      if (result.success && result.user) {
        safeSetStorage('obsidian_user_profile', result.user);
        onLoginSuccess(result.user);
        toast.success(
          '智能免密识别成功',
          `设备特征匹配度 ${(result.matchScore * 100).toFixed(0)}%，已登录: ${result.user.nickname}`
        );
        onClose();
      } else {
        setErrorMessage('设备特征匹配失败，请使用手机验证码登录');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || '自动登录异常');
    } finally {
      setIsLoading(false);
    }
  };

  /* ==========================================================================
     全屏门禁皮肤 V2（白色 + 毛玻璃 + 动效）
     - 底：bg-background 暖白 + 三层径向信号光（color-mix 引令牌，替代大 blur，省性能）
     - 左：品牌叙事（lg+）· 深色结构块 + 毛玻璃权益面板 + 底座状态条
     - 右：表单主面板 · 头部 / 页签（layoutId 滑块）/ 表单 / 安全条
     - 动效纪律（bx-motion-design）：微反馈 120–180ms、面板 180–280ms；
       只动 transform / opacity；全部经 useReducedMotion 降级为静态
     - 圆角一律 rounded-console*，边框一律 border-border-main
     ========================================================================== */
  const spring = reduceMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 420, damping: 34 };
  const panelFade = reduceMotion ? { duration: 0 } : { duration: 0.22, ease: 'easeOut' as const };
  const microFade = reduceMotion ? { duration: 0 } : { duration: 0.16, ease: 'easeOut' as const };
  const spinLoop = reduceMotion
    ? {}
    : { animate: { rotate: 360 }, transition: { repeat: Infinity, duration: 0.9, ease: 'linear' as const } };
  const pulseLoop = reduceMotion
    ? {}
    : { animate: { scale: [1, 1.5], opacity: [0.5, 0] }, transition: { repeat: Infinity, duration: 1.8, ease: 'easeOut' as const } };

  const inputCls =
    'w-full rounded-console border border-border-main bg-page-bg px-3 py-2.5 font-label-md text-text-prominent outline-none transition-colors placeholder:text-text-light-mono focus:border-text-prominent focus:bg-card-bg';
  const labelCls =
    'mb-1 block font-label-micro uppercase tracking-wider text-text-muted';
  const primaryBtnCls =
    'flex h-11 w-full items-center justify-center gap-2 rounded-console bg-dark-container font-label-sm text-white transition-colors hover:bg-dark-container-hover disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer';
  const ghostBtnCls =
    'flex h-10 shrink-0 items-center justify-center rounded-console border border-border-main bg-card-bg px-3 font-label-micro text-text-prominent transition-colors hover:bg-page-bg disabled:cursor-not-allowed disabled:text-text-light-mono disabled:hover:bg-card-bg cursor-pointer';
  const hintCardCls = 'flex items-start gap-2.5 rounded-console border px-3.5 py-3';
  const iconCls = 'pointer-events-none absolute left-3 h-3.5 w-3.5 shrink-0 transition-colors';

  const tabDefs = [
    { id: 'sms' as const, label: '短信免密', Icon: Smartphone, bar: 'bg-status-olive', fg: 'text-status-olive' },
    { id: 'password' as const, label: '密码账密', Icon: KeyRound, bar: 'bg-status-terracotta', fg: 'text-status-terracotta' },
    { id: 'auto' as const, label: '设备指纹', Icon: Fingerprint, bar: 'bg-slate-blue', fg: 'text-slate-blue' }
  ] as const;

  /** 输入框前置图标：聚焦时放大并跟随信号色 */
  const FieldIcon = ({
    name,
    Icon,
    tone
  }: {
    name: string;
    Icon: React.ComponentType<{ className?: string }>;
    tone: string;
  }) => {
    const active = focusedField === name;
    return (
      <motion.span
        aria-hidden
        className="pointer-events-none absolute left-3 flex items-center"
        animate={active && !reduceMotion ? { scale: 1.12 } : { scale: 1 }}
        transition={microFade}
      >
        <Icon className={`h-3.5 w-3.5 transition-colors ${active ? tone : 'text-text-light-mono'}`} />
      </motion.span>
    );
  };

  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="黑曜石会员登录与注册"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={reduceMotion ? {} : { opacity: 1 }}
      transition={panelFade}
      className="fixed inset-0 z-[99999] overflow-y-auto bg-background font-sans text-text-prominent antialiased"
    >
      {/* ---------- 背景层：纯色暖白 + 工业细网格（无渐变） ---------- */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-50"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(17,17,17,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(17,17,17,0.035) 1px, transparent 1px)',
          backgroundSize: '28px 28px'
        }}
      />

      {/* ---------- 顶栏 ---------- */}
      <motion.header
        initial={reduceMotion ? false : { opacity: 0, y: -14 }}
        animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
        transition={{ ...panelFade, delay: reduceMotion ? 0 : 0.05 }}
        className="sticky top-0 z-30 border-b border-border-main bg-white/70 backdrop-blur-xl"
      >
        <div className="mx-auto flex h-14 w-full max-w-[1360px] items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <motion.div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-console bg-dark-container text-white"
              whileHover={reduceMotion ? undefined : { scale: 1.06 }}
              transition={microFade}
            >
              <Sparkles className="h-3.5 w-3.5" />
            </motion.div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate font-label-sm text-text-prominent">黑曜石会员中心</span>
                <span className="shrink-0 rounded-[2px] border border-border-main bg-card-bg px-1 py-px font-label-micro uppercase tracking-wider text-text-muted">
                  UR-AUTH
                </span>
              </div>
              <span className="hidden font-label-micro uppercase tracking-[0.16em] text-text-light-mono sm:block">
                Obsidian Member Gateway
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-console border border-border-main bg-card-bg px-2 py-1 sm:flex">
              <motion.span
                className="h-1.5 w-1.5 rounded-full bg-status-olive"
                animate={reduceMotion ? undefined : { opacity: [1, 0.35, 1] }}
                transition={reduceMotion ? undefined : { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <Lock className="h-2.5 w-2.5 text-text-light-mono" />
              <span className="font-label-micro uppercase tracking-wider text-text-secondary">
                Secure Channel
              </span>
            </span>
            <motion.button
              type="button"
              onClick={onClose}
              title="关闭 (Esc)"
              whileHover={reduceMotion ? undefined : { scale: 1.06, rotate: 90 }}
              whileTap={reduceMotion ? undefined : { scale: 0.94 }}
              transition={microFade}
              className="flex h-8 w-8 items-center justify-center rounded-console border border-border-main bg-card-bg text-text-secondary transition-colors hover:border-text-prominent hover:text-text-prominent cursor-pointer"
            >
              {/* 交互图标 3/3：关闭 X 悬停旋转 90° */}
              <X className="h-4 w-4" />
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* ---------- 主区 ---------- */}
      <main className="relative mx-auto flex w-full max-w-[1360px] flex-col px-0 py-0 sm:px-6 sm:py-6 lg:min-h-[calc(100dvh-3.5rem)]">
        <div className="my-auto grid w-full items-start gap-0 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] xl:grid-cols-[minmax(0,1fr)_minmax(0,468px)]">
          {/* ===== 左：品牌叙事（lg 及以上） ===== */}
          <section className="hidden flex-col gap-3 lg:flex">
            {/* 深色结构块 */}
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ ...panelFade, delay: reduceMotion ? 0 : 0.08 }}
              className="relative overflow-hidden rounded-console-lg bg-dark-container px-6 py-7 text-white"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.14]"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.5) 1px, transparent 1px)',
                  backgroundSize: '24px 24px'
                }}
              />
              <Fingerprint
                aria-hidden
                className="pointer-events-none absolute -bottom-12 -right-8 h-48 w-48 text-white/[0.06]"
              />

              <div className="relative">
                <div className="flex items-center gap-2">
                  <motion.span
                    className="h-1.5 w-1.5 rounded-full bg-signal-live"
                    animate={reduceMotion ? undefined : { opacity: [1, 0.35, 1] }}
                    transition={reduceMotion ? undefined : { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <span className="font-label-micro uppercase tracking-[0.2em] text-white/45">
                    Urban Radar · Member Access
                  </span>
                </div>

                <h1 className="mt-4 text-[34px] font-bold leading-[1.1] tracking-[-0.03em] text-white">
                  黑曜石会员
                </h1>
                <p className="mt-1.5 font-headline-md text-white/45">登录 / 注册</p>

                <p className="mt-4 max-w-[34ch] font-label-md leading-relaxed text-white/60">
                  一个账号贯通点单、取餐、钱包与券包，跨设备保留口味偏好与订单记录。
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-2">
                  {[
                    { label: 'TCB CLOUD', Icon: Database },
                    { label: 'TLS 1.3', Icon: ShieldCheck },
                    { label: 'PNVS SMS', Icon: MessageSquare }
                  ].map(({ label, Icon }) => (
                    <span
                      key={label}
                      className="flex items-center gap-1.5 rounded-console border border-white/15 bg-white/[0.06] px-2 py-1 font-label-micro uppercase tracking-wider text-white/70"
                    >
                      <Icon className="h-2.5 w-2.5" />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* 权益面板（毛玻璃） */}
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ ...panelFade, delay: reduceMotion ? 0 : 0.14 }}
              className="rounded-console-lg border border-border-main bg-white/60 p-5 backdrop-blur-2xl"
            >
              <div className="flex items-center justify-between">
                <span className="font-label-micro uppercase tracking-[0.16em] text-text-muted">
                  Member Benefits
                </span>
                <span className="font-label-micro tabular-nums text-text-light-mono">03</span>
              </div>

              <ul className="mt-2 divide-y divide-border-main">
                <li className="flex items-start gap-3 transition-transform duration-150 ease-out hover:translate-x-1 pb-3 pt-3 first:pt-1">
                  <span className="mt-px flex h-7 w-7 shrink-0 items-center justify-center rounded-console border border-border-main bg-card-bg">
                    <Gift className="h-3.5 w-3.5 text-status-olive" />
                  </span>
                  <div className="min-w-0">
                    <div className="font-label-sm text-text-prominent">¥88 迎新体验金</div>
                    <div className="mt-0.5 font-label-micro leading-relaxed text-text-muted">
                      未注册手机号验证通过即自动建号，同时发放 VIP 会员卡
                    </div>
                  </div>
                </li>

                <li className="flex items-start gap-3 transition-transform duration-150 ease-out hover:translate-x-1 py-3">
                  <span className="mt-px flex h-7 w-7 shrink-0 items-center justify-center rounded-console border border-border-main bg-card-bg">
                    <CheckCircle2 className="h-3.5 w-3.5 text-status-olive" />
                  </span>
                  <div className="min-w-0">
                    <div className="font-label-sm text-text-prominent">全渠道订单与钱包同步</div>
                    <div className="mt-0.5 font-label-micro leading-relaxed text-text-muted">
                      堂食、自提、外卖订单历史统一归档，余额与券包跨设备一致
                    </div>
                  </div>
                </li>

                <li className="flex items-start gap-3 transition-transform duration-150 ease-out hover:translate-x-1 pb-1 pt-3">
                  <span className="mt-px flex h-7 w-7 shrink-0 items-center justify-center rounded-console border border-border-main bg-card-bg">
                    <Fingerprint className="h-3.5 w-3.5 text-slate-blue" />
                  </span>
                  <div className="min-w-0">
                    <div className="font-label-sm text-text-prominent">设备指纹免密识别</div>
                    <div className="mt-0.5 font-label-micro leading-relaxed text-text-muted">
                      硬件特征码绑定本机，下次打开秒级识别，无需重复收码
                    </div>
                  </div>
                </li>
              </ul>
            </motion.div>

            {/* 底座状态条（毛玻璃） */}
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ ...panelFade, delay: reduceMotion ? 0 : 0.2 }}
              className="rounded-console-lg border border-border-main bg-white/45 px-4 py-3 backdrop-blur-xl"
            >
              <div className="grid grid-cols-3 gap-3">
                {[
                  { k: 'Data', v: 'TCB 云开发', Icon: Database },
                  { k: 'Cipher', v: 'TLS 1.3', Icon: ShieldCheck },
                  { k: 'SMS', v: '阿里云 PNVS', Icon: MessageSquare }
                ].map(({ k, v, Icon }) => (
                  <div key={k}>
                    <div className="flex items-center gap-1 font-label-micro uppercase tracking-wider text-text-light-mono">
                      <Icon className="h-3 w-3" />
                      {k}
                    </div>
                    <div className="mt-0.5 font-label-sm text-text-secondary">{v}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </section>

          {/* ===== 右：表单主面板 ===== */}
          <motion.section
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ ...panelFade, delay: reduceMotion ? 0 : 0.12 }}
            className="relative overflow-hidden rounded-none border-0 bg-white/85 shadow-none backdrop-blur-2xl sm:rounded-console-lg sm:border sm:border-border-main sm:shadow-console-2"
          >
            {/* 头部 */}
            <div className="border-b border-border-main px-5 py-4 sm:px-6 sm:py-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-label-micro uppercase tracking-[0.18em] text-text-light-mono">
                    {tab === 'sms' ? (
                      <Smartphone className="h-2.5 w-2.5" />
                    ) : tab === 'password' ? (
                      <KeyRound className="h-2.5 w-2.5" />
                    ) : (
                      <Fingerprint className="h-2.5 w-2.5" />
                    )}
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={tab}
                        initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                        animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
                        exit={reduceMotion ? {} : { opacity: 0, y: -4 }}
                        transition={microFade}
                      >
                        {tab === 'sms'
                          ? 'SMS Passwordless'
                          : tab === 'password'
                            ? isRegisterMode
                              ? 'Account Registration'
                              : 'Password Sign-in'
                            : 'Device Identity'}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                  <h2 className="mt-1.5 font-headline-md text-text-prominent">
                    {isRegisterMode && tab === 'password'
                      ? '注册新食客账号'
                      : '黑曜石会员登录 / 注册'}
                  </h2>
                  <p className="mt-1 font-label-sm leading-relaxed text-text-body">
                    {tab === 'auto'
                      ? '用本机硬件特征免密识别常驻账号'
                      : '登录后同步全渠道订单历史、VIP 权益与钱包余额'}
                  </p>
                </div>
                <span className="hidden shrink-0 rounded-console border border-border-main bg-page-bg px-2 py-1 font-label-micro uppercase tracking-wider text-text-muted sm:block">
                  {tab === 'sms' ? '01' : tab === 'password' ? '02' : '03'}
                </span>
              </div>
            </div>

            {/* 三段页签：layoutId 白底滑块 + 顶部信号色条 */}
            <div className="border-b border-border-main px-3 py-2 sm:px-5">
              <div className="grid grid-cols-3 gap-1 rounded-console border border-border-main bg-page-bg p-1">
                {tabDefs.map(({ id, label, Icon, bar, fg }) => {
                  const isActive = tab === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setTab(id);
                        setErrorMessage(null);
                      }}
                      className={`relative flex h-9 items-center justify-center gap-1.5 rounded-console transition-colors cursor-pointer ${
                        isActive ? 'text-text-prominent' : 'text-text-muted hover:text-text-secondary'
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="authTabPill"
                          transition={spring}
                          className="absolute inset-0 rounded-console border border-border-main bg-card-bg shadow-console-1"
                        />
                      )}
                      {isActive && (
                        <motion.span
                          layoutId="authTabBar"
                          transition={spring}
                          className={`absolute inset-x-2.5 top-0 h-[2px] rounded-full ${bar}`}
                        />
                      )}
                      <motion.span
                        className="relative flex items-center gap-1.5"
                        animate={isActive && !reduceMotion ? { scale: 1.04 } : { scale: 1 }}
                        transition={microFade}
                      >
                        {/* 交互图标 1/3：页签切换时图标弹入（pop） */}
                        <motion.span
                          key={`${id}-${isActive ? 'on' : 'off'}`}
                          initial={reduceMotion ? false : { scale: 0.6, rotate: -14, opacity: 0 }}
                          animate={reduceMotion ? {} : { scale: 1, rotate: 0, opacity: 1 }}
                          transition={spring}
                          className="inline-flex"
                        >
                          <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? fg : ''}`} />
                        </motion.span>
                        <span className="font-label-micro">{label}</span>
                      </motion.span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 表单体：按 tab 换场 */}
            <div className="px-5 py-4 sm:px-6 sm:py-5">
              <AnimatePresence mode="wait" initial={false}>
                {/* 错误横幅 */}
                {errorMessage && (
                  <motion.div
                    key="auth-error"
                    initial={reduceMotion ? false : { opacity: 0, y: -6, x: 0 }}
                    animate={
                      reduceMotion
                        ? {}
                        : { opacity: 1, y: 0, x: [0, -5, 5, -3, 3, 0] }
                    }
                    exit={reduceMotion ? {} : { opacity: 0, y: -4 }}
                    transition={reduceMotion ? undefined : { duration: 0.36, ease: 'easeOut' }}
                    className="mb-3.5 flex items-start gap-2 rounded-console border border-signal-critical-border-soft bg-signal-critical-surface px-3 py-2"
                  >
                    <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0 text-signal-critical-text" />
                    <span className="font-label-sm leading-relaxed text-signal-critical-strong">
                      {errorMessage}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait" initial={false}>
                {/* ---------- TAB 1：短信免密 ---------- */}
                {tab === 'sms' && (
                  <motion.form
                    key="tab-sms"
                    onSubmit={handleSubmitSms}
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
                    exit={reduceMotion ? {} : { opacity: 0, y: -6 }}
                    transition={panelFade}
                    className="space-y-3.5"
                  >
                    <div className={`${hintCardCls} border-status-olive-border bg-status-olive-bg`}>
                      <Gift className="mt-0.5 h-4 w-4 shrink-0 text-status-olive" />
                      <div className="font-label-sm leading-relaxed text-text-body">
                        <span className="font-bold text-text-prominent">极速无感登录 · </span>
                        输入手机号即可登录；未注册手机号将
                        <span className="font-bold text-status-olive">
                          自动注册并赠送 ¥88 迎新体验金
                        </span>
                        与 VIP 会员卡。
                        {reverifyDays !== null && (
                          <span className="mt-1 block font-label-micro text-text-muted">
                            手机号验证有效期由总部设置（当前 {reverifyDays} 天）
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className={labelCls}>手机号码 (Phone Number)</label>
                      <div className="relative flex items-center">
                        <FieldIcon name="smsPhone" Icon={Smartphone} tone="text-status-olive" />
                        <span className="pointer-events-none absolute left-9 font-label-micro uppercase text-text-muted">
                          +86
                        </span>
                        <input
                          type="tel"
                          value={smsPhone}
                          onChange={(e) => setSmsPhone(e.target.value)}
                          onFocus={() => setFocusedField('smsPhone')}
                          onBlur={() => setFocusedField(null)}
                          placeholder="请输入 11 位手机号码"
                          className={`${inputCls} pl-16 tabular-nums`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelCls}>短信验证码 (Verification Code)</label>
                      <div className="flex gap-2">
                        <div className="relative flex flex-1 items-center">
                          <FieldIcon name="smsCode" Icon={KeyRound} tone="text-status-olive" />
                          <input
                            type="text"
                            maxLength={6}
                            value={smsCode}
                            onChange={(e) => setSmsCode(e.target.value)}
                            onFocus={() => setFocusedField('smsCode')}
                            onBlur={() => setFocusedField(null)}
                            placeholder="6 位数字验证码"
                            className={`${inputCls} pl-9 tracking-[0.3em] tabular-nums`}
                          />
                        </div>
                        <motion.button
                          type="button"
                          disabled={countdown > 0 || isSendingCode}
                          onClick={handleSendSmsCode}
                          whileTap={countdown > 0 || isSendingCode || reduceMotion ? undefined : { scale: 0.96 }}
                          transition={microFade}
                          className={`${ghostBtnCls} ml-auto w-[112px] gap-1.5`}
                        >
                          <AnimatePresence mode="wait" initial={false}>
                            {isSendingCode ? (
                              <motion.span
                                key="sending"
                                initial={reduceMotion ? false : { opacity: 0 }}
                                animate={reduceMotion ? {} : { opacity: 1 }}
                                exit={reduceMotion ? {} : { opacity: 0 }}
                                transition={microFade}
                                className="flex items-center gap-1"
                              >
                                <motion.span className="inline-flex" {...spinLoop}>
                                  <RefreshCw className="h-3 w-3" />
                                </motion.span>
                                发送中
                              </motion.span>
                            ) : countdown > 0 ? (
                              <motion.span
                                key="counting"
                                initial={reduceMotion ? false : { opacity: 0 }}
                                animate={reduceMotion ? {} : { opacity: 1 }}
                                exit={reduceMotion ? {} : { opacity: 0 }}
                                transition={microFade}
                                className="flex items-center gap-1"
                              >
                                <Clock className="h-3 w-3" />
                                <span className="tabular-nums">{countdown}s</span>
                              </motion.span>
                            ) : (
                              <motion.span
                                key="idle"
                                initial={reduceMotion ? false : { opacity: 0 }}
                                animate={reduceMotion ? {} : { opacity: 1 }}
                                exit={reduceMotion ? {} : { opacity: 0 }}
                                transition={microFade}
                                className="flex items-center gap-1"
                              >
                                <Send className="h-3 w-3" />
                                获取验证码
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </motion.button>
                      </div>
                    </div>

                    {/* 图形验证码（服务端 428 时出现） */}
                    <AnimatePresence>
                      {captcha && (
                        <motion.div
                          initial={reduceMotion ? false : { opacity: 0, height: 0, y: -4 }}
                          animate={reduceMotion ? {} : { opacity: 1, height: 'auto', y: 0 }}
                          exit={reduceMotion ? {} : { opacity: 0, height: 0, y: -4 }}
                          transition={microFade}
                          className="overflow-hidden"
                        >
                          <div className="flex flex-wrap items-center gap-2 rounded-console border border-status-terracotta-border bg-status-terracotta-bg px-3 py-2">
                            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-status-terracotta" />
                            <span className="font-label-sm tabular-nums text-text-prominent">
                              {captcha.question}
                            </span>
                            <input
                              value={captchaAnswer}
                              onChange={(e) =>
                                setCaptchaAnswer(e.target.value.replace(/\D/g, '').slice(0, 4))
                              }
                              inputMode="numeric"
                              placeholder="答案"
                              className="w-16 rounded-console border border-border-main bg-card-bg px-2 py-1 font-label-sm tabular-nums outline-none focus:border-text-prominent"
                            />
                            <button
                              type="button"
                              disabled={!captchaAnswer.trim() || isSendingCode}
                              onClick={handleCaptchaSend}
                              className="ml-auto rounded-console bg-dark-container px-2.5 py-1 font-label-micro text-white transition-colors hover:bg-dark-container-hover disabled:opacity-40 cursor-pointer"
                            >
                              验证并发送
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex items-center justify-between pt-0.5 font-label-micro text-text-light-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {countdown > 0 ? '验证码 5 分钟内有效' : '验证码由短信下发，请勿泄露'}
                      </span>
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="h-2.5 w-2.5 text-status-olive" />
                        银行级安全通道
                      </span>
                    </div>

                    <motion.button
                      type="submit"
                      disabled={isLoading}
                      whileHover={isLoading || reduceMotion ? undefined : { y: -1 }}
                      whileTap={isLoading || reduceMotion ? undefined : { scale: 0.99 }}
                      transition={microFade}
                      className={primaryBtnCls}
                    >
                      {isLoading ? (
                        <>
                          <motion.span className="inline-flex" {...spinLoop}>
                            <RefreshCw className="h-3.5 w-3.5" />
                          </motion.span>
                          <span>正在鉴权验证…</span>
                        </>
                      ) : (
                        <>
                          <span>立即验证并登录 / 自动注册</span>
                          <motion.span
                            className="inline-flex"
                            animate={reduceMotion ? undefined : { x: [0, 3, 0] }}
                            transition={reduceMotion ? undefined : { duration: 1.8, repeat: Infinity, repeatDelay: 1.2, ease: 'easeInOut' }}
                          >
                            <ArrowRight className="h-3.5 w-3.5" />
                          </motion.span>
                        </>
                      )}
                    </motion.button>
                  </motion.form>
                )}

                {/* ---------- TAB 2：密码账密（双因子） ---------- */}
                {tab === 'password' && (
                  <motion.form
                    key="tab-password"
                    onSubmit={handleSubmitPassword}
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
                    exit={reduceMotion ? {} : { opacity: 0, y: -6 }}
                    transition={panelFade}
                    className="space-y-3.5"
                  >
                    <div className={`${hintCardCls} border-status-terracotta-border bg-status-terracotta-bg`}>
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-status-terracotta" />
                      <div className="font-label-sm leading-relaxed text-text-body">
                        <span className="font-bold text-text-prominent">双因子校验 · </span>
                        短信验证码 + 密码，二者都通过才能登录。
                      </div>
                    </div>

                    {/* 登录 / 注册 子模式：layoutId 滑块 */}
                    <div className="relative grid grid-cols-2 gap-1 rounded-console border border-border-main bg-page-bg p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsRegisterMode(false);
                          setErrorMessage(null);
                        }}
                        className={`relative h-8 rounded-console font-label-micro transition-colors cursor-pointer ${
                          !isRegisterMode ? 'text-text-prominent' : 'text-text-muted hover:text-text-secondary'
                        }`}
                      >
                        {!isRegisterMode && (
                          <motion.span
                            layoutId="authSubMode"
                            transition={spring}
                            className="absolute inset-0 rounded-console bg-card-bg shadow-console-1"
                          />
                        )}
                        <span className="relative">已有账号密码登录</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsRegisterMode(true);
                          setErrorMessage(null);
                        }}
                        className={`relative h-8 rounded-console font-label-micro transition-colors cursor-pointer ${
                          isRegisterMode ? 'text-text-prominent' : 'text-text-muted hover:text-text-secondary'
                        }`}
                      >
                        {isRegisterMode && (
                          <motion.span
                            layoutId="authSubMode"
                            transition={spring}
                            className="absolute inset-0 rounded-console bg-card-bg shadow-console-1"
                          />
                        )}
                        <span className="relative">注册新食客账号</span>
                      </button>
                    </div>

                    {/* 注册态：昵称 + 头像 */}
                    <AnimatePresence initial={false}>
                      {isRegisterMode && (
                        <motion.div
                          initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                          animate={reduceMotion ? {} : { opacity: 1, height: 'auto' }}
                          exit={reduceMotion ? {} : { opacity: 0, height: 0 }}
                          transition={panelFade}
                          className="overflow-hidden"
                        >
                          <div className="space-y-2.5 rounded-console border border-border-main bg-page-bg p-3">
                            <div>
                              <label className={labelCls}>食客专属昵称 (Nickname)</label>
                              <div className="relative flex items-center">
                                <FieldIcon name="nickname" Icon={UserRound} tone="text-status-terracotta" />
                                <input
                                  type="text"
                                  value={registerNickname}
                                  onChange={(e) => setRegisterNickname(e.target.value)}
                                  onFocus={() => setFocusedField('nickname')}
                                  onBlur={() => setFocusedField(null)}
                                  placeholder="例：和牛炭烤达人"
                                  className={`${inputCls} bg-card-bg pl-9`}
                                />
                              </div>
                            </div>

                            <div>
                              <label className={labelCls}>选择头像 (Avatar)</label>
                              <div className="flex items-center gap-2">
                                {PRESET_AVATARS.map((av, idx) => (
                                  <motion.button
                                    key={idx}
                                    type="button"
                                    onClick={() => setSelectedAvatar(av)}
                                    whileHover={reduceMotion ? undefined : { scale: 1.08 }}
                                    whileTap={reduceMotion ? undefined : { scale: 0.95 }}
                                    animate={
                                      selectedAvatar === av && !reduceMotion ? { scale: 1.04 } : { scale: 1 }
                                    }
                                    transition={microFade}
                                    className={`relative h-8 w-8 overflow-hidden rounded-full border-2 transition-colors cursor-pointer ${
                                      selectedAvatar === av
                                        ? 'border-status-olive'
                                        : 'border-transparent opacity-60 hover:opacity-100'
                                    }`}
                                  >
                                    <img
                                      /* 性能手术：非首屏图片懒加载 */
                                      loading="lazy"
                                      decoding="async"
                                      src={av}
                                      alt="Avatar"
                                      className="h-full w-full object-cover"
                                    />
                                    {selectedAvatar === av && (
                                      <span className="absolute inset-0 flex items-center justify-center bg-dark-container/45">
                                        <Check className="h-3 w-3 stroke-[3] text-white" />
                                      </span>
                                    )}
                                  </motion.button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div>
                      <label className={labelCls}>手机号码 (Phone Number)</label>
                      <div className="relative flex items-center">
                        <FieldIcon name="account" Icon={Smartphone} tone="text-status-terracotta" />
                        <input
                          type="tel"
                          value={accountInput}
                          onChange={(e) =>
                            setAccountInput(e.target.value.replace(/\D/g, '').slice(0, 11))
                          }
                          onFocus={() => setFocusedField('account')}
                          onBlur={() => setFocusedField(null)}
                          placeholder="11 位手机号"
                          className={`${inputCls} pl-9 tabular-nums`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelCls}>短信验证码 (Verification Code)</label>
                      <div className="flex gap-2">
                        <div className="relative flex flex-1 items-center">
                          <FieldIcon name="pwdCode" Icon={KeyRound} tone="text-status-terracotta" />
                          <input
                            type="text"
                            maxLength={6}
                            value={pwdCode}
                            onChange={(e) => setPwdCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            onFocus={() => setFocusedField('pwdCode')}
                            onBlur={() => setFocusedField(null)}
                            placeholder="6 位数字验证码"
                            className={`${inputCls} pl-9 tracking-[0.3em] tabular-nums`}
                          />
                        </div>
                        <motion.button
                          type="button"
                          disabled={pwdCountdown > 0 || isSendingPwdCode}
                          onClick={handleSendPwdCode}
                          whileTap={pwdCountdown > 0 || isSendingPwdCode || reduceMotion ? undefined : { scale: 0.96 }}
                          transition={microFade}
                          className={`${ghostBtnCls} ml-auto w-[112px] gap-1.5`}
                        >
                          <AnimatePresence mode="wait" initial={false}>
                            {isSendingPwdCode ? (
                              <motion.span
                                key="pwd-sending"
                                initial={reduceMotion ? false : { opacity: 0 }}
                                animate={reduceMotion ? {} : { opacity: 1 }}
                                exit={reduceMotion ? {} : { opacity: 0 }}
                                transition={microFade}
                                className="flex items-center gap-1"
                              >
                                <motion.span className="inline-flex" {...spinLoop}>
                                  <RefreshCw className="h-3 w-3" />
                                </motion.span>
                                发送中
                              </motion.span>
                            ) : pwdCountdown > 0 ? (
                              <motion.span
                                key="pwd-counting"
                                initial={reduceMotion ? false : { opacity: 0 }}
                                animate={reduceMotion ? {} : { opacity: 1 }}
                                exit={reduceMotion ? {} : { opacity: 0 }}
                                transition={microFade}
                                className="flex items-center gap-1"
                              >
                                <Clock className="h-3 w-3" />
                                <span className="tabular-nums">{pwdCountdown}s</span>
                              </motion.span>
                            ) : (
                              <motion.span
                                key="pwd-idle"
                                initial={reduceMotion ? false : { opacity: 0 }}
                                animate={reduceMotion ? {} : { opacity: 1 }}
                                exit={reduceMotion ? {} : { opacity: 0 }}
                                transition={microFade}
                                className="flex items-center gap-1"
                              >
                                <Send className="h-3 w-3" />
                                获取验证码
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </motion.button>
                      </div>
                    </div>

                    <div>
                      <label className={labelCls}>登录密码 (Password)</label>
                      <div className="relative flex items-center">
                        <FieldIcon name="password" Icon={Lock} tone="text-status-terracotta" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          onFocus={() => setFocusedField('password')}
                          onBlur={() => setFocusedField(null)}
                          placeholder="至少 8 位：字母+数字+符号更安全"
                          className={`${inputCls} pl-9 pr-10`}
                        />
                        <motion.button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          whileTap={reduceMotion ? undefined : { scale: 0.9 }}
                          transition={microFade}
                          className="absolute right-3 cursor-pointer text-text-light-mono transition-colors hover:text-text-prominent"
                          title={showPassword ? '隐藏密码' : '显示密码'}
                        >
                          {/* 交互图标 2/3：明暗文切换时眼睛图标弹跳换形 */}
                          <AnimatePresence mode="wait" initial={false}>
                            <motion.span
                              key={showPassword ? 'eye-off' : 'eye-on'}
                              initial={reduceMotion ? false : { scale: 0.5, opacity: 0, rotate: -18 }}
                              animate={reduceMotion ? {} : { scale: 1, opacity: 1, rotate: 0 }}
                              exit={reduceMotion ? {} : { scale: 0.5, opacity: 0, rotate: 18 }}
                              transition={spring}
                              className="inline-flex"
                            >
                              {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </motion.span>
                          </AnimatePresence>
                        </motion.button>
                      </div>
                    </div>

                    <AnimatePresence initial={false}>
                      {isRegisterMode && (
                        <motion.div
                          initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                          animate={reduceMotion ? {} : { opacity: 1, height: 'auto' }}
                          exit={reduceMotion ? {} : { opacity: 0, height: 0 }}
                          transition={panelFade}
                          className="overflow-hidden"
                        >
                          <div>
                            <label className={labelCls}>确认密码 (Confirm Password)</label>
                            <div className="relative flex items-center">
                              <FieldIcon name="confirm" Icon={Lock} tone="text-status-terracotta" />
                              <input
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPasswordInput}
                                onChange={(e) => setConfirmPasswordInput(e.target.value)}
                                onFocus={() => setFocusedField('confirm')}
                                onBlur={() => setFocusedField(null)}
                                placeholder="请再次输入密码"
                                className={`${inputCls} pl-9`}
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <motion.button
                      type="submit"
                      disabled={isLoading}
                      whileHover={isLoading || reduceMotion ? undefined : { y: -1 }}
                      whileTap={isLoading || reduceMotion ? undefined : { scale: 0.99 }}
                      transition={microFade}
                      className={primaryBtnCls}
                    >
                      {isLoading ? (
                        <>
                          <motion.span className="inline-flex" {...spinLoop}>
                            <RefreshCw className="h-3.5 w-3.5" />
                          </motion.span>
                          <span>正在提交…</span>
                        </>
                      ) : (
                        <>
                          <span>{isRegisterMode ? '立即注册并进入会员中心' : '立即登录'}</span>
                          <motion.span
                            className="inline-flex"
                            animate={reduceMotion ? undefined : { x: [0, 3, 0] }}
                            transition={reduceMotion ? undefined : { duration: 1.8, repeat: Infinity, repeatDelay: 1.2, ease: 'easeInOut' }}
                          >
                            <ArrowRight className="h-3.5 w-3.5" />
                          </motion.span>
                        </>
                      )}
                    </motion.button>
                  </motion.form>
                )}

                {/* ---------- TAB 3：设备指纹免密 ---------- */}
                {tab === 'auto' && (
                  <motion.div
                    key="tab-auto"
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
                    exit={reduceMotion ? {} : { opacity: 0, y: -6 }}
                    transition={panelFade}
                    className="space-y-3.5"
                  >
                    <div className="rounded-console-lg border border-dark-container-border bg-dark-container p-4 text-white">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          {/* 指纹扫描：外圈扩散脉冲 */}
                          <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
                            <motion.span
                              className="absolute inset-0 rounded-full border border-signal-live"
                              {...pulseLoop}
                            />
                            {!reduceMotion && (
                              <motion.span
                                className="absolute inset-0 rounded-full border border-signal-live"
                                animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                                transition={{ repeat: Infinity, duration: 1.8, delay: 0.6, ease: 'easeOut' }}
                              />
                            )}
                            <Fingerprint className="relative h-4 w-4 text-signal-live" />
                          </span>
                          <span className="truncate font-label-sm text-white">
                            当前设备硬件特征已就绪
                          </span>
                        </div>
                        <span className="shrink-0 rounded-[2px] border border-white/15 bg-white/[0.08] px-1.5 py-0.5 font-label-micro text-white/70">
                          高熵 99.8%
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 rounded-console border border-white/10 bg-white/[0.04] p-2.5">
                        <div className="min-w-0">
                          <span className="flex items-center gap-1 font-label-micro uppercase tracking-wider text-white/40">
                            <Hash className="h-2.5 w-2.5" />
                            硬件指纹码
                          </span>
                          <span className="mt-0.5 block truncate font-label-micro text-signal-live">
                            {hardwareDetails?.hardwareHash || 'HW-SCANNING…'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <span className="flex items-center gap-1 font-label-micro uppercase tracking-wider text-white/40">
                            <Cpu className="h-2.5 w-2.5" />
                            GPU 渲染器
                          </span>
                          <span className="mt-0.5 block truncate font-label-micro text-white/70">
                            {hardwareDetails?.gpuRenderer || 'Apple M-Series / RTX'}
                          </span>
                        </div>
                      </div>

                      <p className="mt-3 font-label-micro leading-relaxed text-white/45">
                        通过设备原生不可变硬件特征码自动识别。换浏览器或清空缓存依然秒级识别常驻会员账号。
                      </p>
                    </div>

                    <motion.button
                      type="button"
                      disabled={isLoading}
                      onClick={handleAutoLoginClick}
                      whileHover={isLoading || reduceMotion ? undefined : { y: -1 }}
                      whileTap={isLoading || reduceMotion ? undefined : { scale: 0.99 }}
                      transition={microFade}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-console bg-status-olive font-label-sm text-white transition-colors hover:bg-status-olive/90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                    >
                      {isLoading ? (
                        <>
                          <motion.span className="inline-flex" {...spinLoop}>
                            <RefreshCw className="h-3.5 w-3.5" />
                          </motion.span>
                          <span>正在进行高熵硬件比对…</span>
                        </>
                      ) : (
                        <>
                          <Fingerprint className="h-3.5 w-3.5" />
                          <span>一键免密识别并登录</span>
                        </>
                      )}
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 安全条 */}
            <div className="flex items-center justify-center gap-1.5 border-t border-border-main bg-white/60 px-4 py-3 backdrop-blur-xl">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-status-olive" />
              <span className="font-label-micro text-text-muted">
                腾讯云开发 TCB 与 TLS 1.3 银行级安全加密保护
              </span>
            </div>
          </motion.section>
        </div>

        {/* 移动端底部状态行 */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={reduceMotion ? {} : { opacity: 1 }}
          transition={{ ...panelFade, delay: reduceMotion ? 0 : 0.26 }}
          className="mt-0 flex items-center justify-between px-4 py-3 font-label-micro text-text-light-mono sm:mt-3 sm:px-1 sm:py-0 lg:hidden"
        >
          <span className="flex items-center gap-1">
            <Lock className="h-2.5 w-2.5" />
            TCB · TLS 1.3 · 阿里云 PNVS
          </span>
          <span>UR-AUTH</span>
        </motion.div>
      </main>
    </motion.div>,
    document.body
  );
};

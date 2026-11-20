/**
 * 短信与账号服务替身（演示模式）
 *
 * 原项目走的是自建 `/auth/*` 网关 + 短信通道。抽出的界面只关心「能不能拿到成功/失败」，
 * 所以这里用本地模拟：验证码固定 `123456`，其余流程一律按成功返回。
 * 这样资料编辑页的「换绑手机号」「密码注册/登录」都能走通，不需要真发短信。
 */
import { safeGetStorage, safeSetStorage } from './safeStorage';

export type SmsPurpose = 'login' | 'bind' | 'reset';

export interface SmsCaptcha {
  id: string;
  question: string;
  sig?: string;
}

export interface SmsCaptchaAnswer {
  id?: string;
  answer?: string;
  captchaId?: string;
  captchaAnswer?: string;
  captchaSig?: string;
}

export interface SmsSendResult {
  ok: boolean;
  message?: string;
  error?: string;
  /** 演示模式：把验证码直接回传，方便界面提示 */
  devCode?: string;
  cooldownSeconds?: number;
  retryAfter?: number;
  mock?: boolean;
  captchaRequired?: boolean;
  captcha?: SmsCaptcha;
}

export interface SmsVerifyResult {
  ok: boolean;
  message?: string;
  error?: string;
  uid?: string;
  sessionToken?: string;
}

export interface AuthSettings {
  phoneReverifyDays: number;
  deviceLoginEnabled: boolean;
  presetsEnabled: boolean;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface PasswordAuthResult {
  ok: boolean;
  uid?: string;
  sessionToken?: string;
  message?: string;
  error?: string;
}

export const SESSION_TOKEN_KEY = 'obsidian_session_token';
export const DEMO_SMS_CODE = '123456';

const COOLDOWN_KEY = 'demo_sms_cooldown_until';

export async function sendSmsCode(
  phone: string,
  purpose: SmsPurpose = 'login',
  _captcha?: SmsCaptchaAnswer
): Promise<SmsSendResult> {
  if (!/^1\d{10}$/.test(String(phone || '').trim())) {
    return { ok: false, error: 'INVALID_PHONE', message: '请输入 11 位手机号' };
  }
  const until = Date.now() + 60_000;
  safeSetStorage(COOLDOWN_KEY, until);
  return {
    ok: true,
    message: `验证码已发送（演示模式固定 ${DEMO_SMS_CODE}）`,
    devCode: DEMO_SMS_CODE,
    cooldownSeconds: 60,
    retryAfter: 60,
    mock: true
  };
}

export async function verifySmsCode(
  phone: string,
  code: string,
  _purpose: SmsPurpose = 'login',
  uid?: string
): Promise<SmsVerifyResult> {
  const expected = safeGetStorage<string>(`demo_sms_code_${phone}`, DEMO_SMS_CODE);
  if (String(code || '').trim() !== expected && String(code || '').trim() !== DEMO_SMS_CODE) {
    return { ok: false, error: 'CODE_MISMATCH', message: '验证码不正确（演示模式请填 123456）' };
  }
  const resolvedUid = uid || `cust_demo_${String(phone).slice(-4)}`;
  safeSetStorage(SESSION_TOKEN_KEY, `demo_session_${Date.now()}`);
  return { ok: true, uid: resolvedUid, sessionToken: `demo_session_${Date.now()}` };
}

export async function getCaptcha(): Promise<SmsCaptcha | null> {
  return null; // 演示模式不启用图形验证码
}

export async function getSmsMode(): Promise<{ mock: boolean; configured: boolean }> {
  return { mock: true, configured: true };
}

export async function getAuthSettings(): Promise<AuthSettings | null> {
  return { phoneReverifyDays: 30, deviceLoginEnabled: true, presetsEnabled: true, updatedAt: null, updatedBy: null };
}

export async function getVerifyState(phone: string): Promise<{
  needsReverify: boolean;
  days: number;
  elapsedDays?: number;
  lastVerifiedAt?: string | null;
  message?: string | null;
}> {
  const last = safeGetStorage<string | null>(`demo_phone_verified_at_${phone}`, null);
  if (!last) return { needsReverify: false, days: 30, message: null };
  const elapsed = Math.floor((Date.now() - new Date(last).getTime()) / 86_400_000);
  return { needsReverify: elapsed > 30, days: 30, elapsedDays: elapsed, lastVerifiedAt: last, message: null };
}

export async function markPhoneVerified(phone: string, _uid?: string, _deviceHash?: string): Promise<void> {
  safeSetStorage(`demo_phone_verified_at_${phone}`, new Date().toISOString());
}

export async function passwordRegister(p: {
  phone: string;
  password: string;
  code: string;
  uid?: string;
  deviceHash?: string;
}): Promise<PasswordAuthResult> {
  if (String(p.code || '').trim() !== DEMO_SMS_CODE) {
    return { ok: false, error: 'CODE_MISMATCH', message: '验证码不正确（演示模式请填 123456）' };
  }
  const uid = p.uid || `cust_demo_${String(p.phone).slice(-4)}`;
  await markPhoneVerified(p.phone, uid, p.deviceHash);
  safeSetStorage(SESSION_TOKEN_KEY, `demo_session_${Date.now()}`);
  return { ok: true, uid, sessionToken: `demo_session_${Date.now()}`, message: '注册成功' };
}

export async function passwordLogin(p: {
  phone: string;
  password: string;
  code: string;
  deviceHash?: string;
}): Promise<PasswordAuthResult> {
  if (String(p.code || '').trim() !== DEMO_SMS_CODE) {
    return { ok: false, error: 'CODE_MISMATCH', message: '验证码不正确（演示模式请填 123456）' };
  }
  const uid = `cust_demo_${String(p.phone).slice(-4)}`;
  safeSetStorage(SESSION_TOKEN_KEY, `demo_session_${Date.now()}`);
  return { ok: true, uid, sessionToken: `demo_session_${Date.now()}`, message: '登录成功' };
}

export async function issueDeviceToken(p: { phone: string; deviceHash?: string; uid?: string }): Promise<{
  ok: boolean;
  token?: string;
  days?: number;
  expiresAt?: string;
  message?: string;
}> {
  return { ok: true, token: `demo_device_token_${p.phone}`, days: 30, expiresAt: null as unknown as string, message: '已签发演示设备令牌' };
}

export async function validateDeviceToken(token: string, _deviceHash?: string): Promise<{
  ok: boolean;
  valid: boolean;
  phone?: string;
  uid?: string;
  days?: number;
  remainingSeconds?: number;
  reason?: string;
  message?: string;
}> {
  const valid = Boolean(token && token.startsWith('demo_device_token_'));
  return { ok: true, valid, days: 30, remainingSeconds: valid ? 2_592_000 : 0, message: valid ? '令牌有效' : '令牌无效' };
}

export async function revokeDeviceToken(_token: string): Promise<void> {
  /* 演示模式无需处理 */
}

/**
 * 云服务替身：抽出的演示项目不连腾讯云 / 自建 PostgREST。
 * 保持与原模块相同的导出面，行为按「本地保存成功」处理。
 */
import { safeGetStorage, safeSetStorage } from './safeStorage';
import { INITIAL_USER_PROFILE } from '../data/mockUser';
import type { UserProfile } from '../types/user';

export const TCB_CLOUD_ENABLED = false;

const PROFILE_KEY = 'obsidian_user_profile';

/**
 * 与原实现同签名。原版会先拉云端权威档案做字段清洗再落库；
 * 这里直接本地保存，并锁定余额/积分/会员等级不被界面改动覆盖。
 */
export async function syncUserProfileToCloud(
  profile: UserProfile
): Promise<{ success: boolean; profile: UserProfile; error?: string; source: 'cloud_function' | 'cloud_database' | 'local_storage'; sanitized?: boolean }> {
  const authoritative = safeGetStorage<UserProfile>(PROFILE_KEY, INITIAL_USER_PROFILE);
  const merged: UserProfile = {
    ...authoritative,
    ...profile,
    // 核心资产字段以本地权威为准（原版由云端锁定）
    balance: authoritative.balance,
    points: authoritative.points,
    membershipTier: authoritative.membershipTier,
    role: authoritative.role
  } as UserProfile;
  safeSetStorage(PROFILE_KEY, merged);
  return { success: true, profile: merged, source: 'local_storage', sanitized: true };
}

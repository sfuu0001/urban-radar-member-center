/**
 * 优惠券引擎替身：只保留界面用到的「读/写持券记录」两个能力。
 * 原实现还包含发放规则、核销流水、云端差异上行，这里不需要。
 */
import { safeGetStorage, safeSetStorage } from './safeStorage';
import { INITIAL_USER_COUPONS } from '../data/mockCoupons';
import type { UserCouponRecord } from '../types/coupon';

const USER_COUPONS_KEY = 'obsidian_user_coupons';

export function getUserCouponRecords(): UserCouponRecord[] {
  const raw = safeGetStorage<UserCouponRecord[]>(USER_COUPONS_KEY, INITIAL_USER_COUPONS);
  return Array.isArray(raw) ? raw : INITIAL_USER_COUPONS;
}

export function saveUserCouponRecords(records: UserCouponRecord[]): void {
  safeSetStorage(USER_COUPONS_KEY, records);
}

/** 可用券数量（ProfilePageView 顶部角标用） */
export function countUsableCoupons(): number {
  return getUserCouponRecords().filter((r) => r.status === 'available').length;
}

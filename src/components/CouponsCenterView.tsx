import React, { useState, useMemo } from 'react';
import {
  Ticket,
  Copy,
  Check,
  Sparkles,
  Tag,
  ChevronRight,
  ChevronDown,
  Truck,
  Clock,
  Calendar,
  Store,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { CouponItem, UserCouponRecord } from '../types/coupon';
import { INITIAL_MERCHANT_COUPONS } from '../data/mockCoupons';
import { safeGetStorage, safeSetStorage } from '../utils/safeStorage';
import { getUserCouponRecords, saveUserCouponRecords } from '../utils/couponEngine';
import { UnifiedPageHeader } from './ui/UnifiedPageHeader';
import { useToast } from './ui/ToastContext';

export interface CouponsCenterViewProps {
  onBack?: () => void;
  onSelectCouponToUse?: (couponCode: string) => void;
  onGoToMenu?: () => void;
  isVIPActive?: boolean;
  headerStickyClass?: string;
}

type CouponTab = 'available' | 'market' | 'used' | 'expired';

const QUICK_REDEEM_CODES = ['UR-VIP5', 'UR-FREESHIP', 'UR-DRINK88'];

function getStubTheme(designStyle: CouponItem['designStyle'], muted: boolean) {
  if (muted) {
    return {
      container: 'bg-neutral-100 text-neutral-500',
      value: 'text-neutral-500',
      unit: 'text-neutral-400',
      sub: 'text-neutral-400'
    };
  }
  switch (designStyle) {
    case 'black_gold':
      return {
        container: 'bg-[#141413] text-white',
        value: 'text-amber-300',
        unit: 'text-amber-300/90',
        sub: 'text-neutral-300'
      };
    case 'emerald_fresh':
      return {
        container: 'bg-emerald-50 text-emerald-800',
        value: 'text-emerald-700',
        unit: 'text-emerald-600',
        sub: 'text-emerald-700/80'
      };
    case 'ember_orange':
      return {
        container: 'bg-amber-50 text-amber-800',
        value: 'text-amber-700',
        unit: 'text-amber-600',
        sub: 'text-amber-700/80'
      };
    case 'minimal_silver':
    default:
      return {
        container: 'bg-[#f1efe9] text-[#141413]',
        value: 'text-[#141413]',
        unit: 'text-neutral-600',
        sub: 'text-neutral-500'
      };
  }
}

export const CouponsCenterView: React.FC<CouponsCenterViewProps> = ({
  onBack,
  onSelectCouponToUse,
  onGoToMenu,
  isVIPActive = true,
  headerStickyClass
}) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<CouponTab>('available');
  const [couponInput, setCouponInput] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isNotificationOn, setIsNotificationOn] = useState<boolean>(() =>
    safeGetStorage<boolean>('obsidian_member_notification_on', true)
  );

  const [userCoupons, setUserCoupons] = useState<UserCouponRecord[]>(() =>
    getUserCouponRecords()
  );

  const merchantCoupons: CouponItem[] = useMemo(
    () => safeGetStorage<CouponItem[]>('obsidian_merchant_coupons', INITIAL_MERCHANT_COUPONS),
    []
  );

  const persistUserCoupons = (nextList: UserCouponRecord[]) => {
    setUserCoupons(nextList);
    saveUserCouponRecords(nextList);
  };

  const availableCoupons = useMemo(
    () => userCoupons.filter((c) => c.status === 'available'),
    [userCoupons]
  );
  const usedCoupons = useMemo(
    () => userCoupons.filter((c) => c.status === 'used'),
    [userCoupons]
  );
  const expiredCoupons = useMemo(
    () => userCoupons.filter((c) => c.status === 'expired'),
    [userCoupons]
  );
  const marketCoupons = useMemo(
    () => merchantCoupons.filter((mc) => mc.status === 'active'),
    [merchantCoupons]
  );

  const totalPotentialSavings = useMemo(() => {
    return availableCoupons.reduce((sum, item) => {
      if (item.coupon.couponType === 'amount_cut' || item.coupon.couponType === 'no_threshold') {
        return sum + item.coupon.discountValue;
      }
      if (item.coupon.couponType === 'delivery_free') {
        return sum + 5;
      }
      if (item.coupon.couponType === 'discount_percent') {
        return sum + (item.coupon.maxDiscountCap || 12);
      }
      return sum;
    }, 0);
  }, [availableCoupons]);

  const handleRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setUserCoupons(getUserCouponRecords());
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success('礼券包已同步', `当前共有 ${availableCoupons.length} 张可用礼券`);
    }, 300);
  };

  const toggleNotification = () => {
    setIsNotificationOn((prev) => {
      const next = !prev;
      safeSetStorage('obsidian_member_notification_on', next);
      toast.info(next ? '礼券到期提醒已开启' : '礼券到期提醒已关闭');
      return next;
    });
  };

  const handleRedeemCode = (e?: React.FormEvent, customCode?: string) => {
    if (e) e.preventDefault();
    const targetCode = (customCode ?? couponInput).trim().toUpperCase();
    if (!targetCode) {
      toast.warning('请输入兑换码', '可点击下方常用礼券口令快速填入');
      return;
    }

    const alreadyHas = userCoupons.find(
      (uc) => uc.coupon.code.toUpperCase() === targetCode && uc.status === 'available'
    );
    if (alreadyHas) {
      toast.info('您已持有该礼券', `「${alreadyHas.coupon.title}」已在可用列表中`);
      setCouponInput('');
      return;
    }

    const matched = merchantCoupons.find((mc) => mc.code.toUpperCase() === targetCode);
    if (matched) {
      const newRecord: UserCouponRecord = {
        userCouponId: `uc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        couponId: matched.id,
        coupon: matched,
        status: 'available',
        acquiredAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
      };
      persistUserCoupons([newRecord, ...userCoupons]);
      toast.success('兑换成功', `已将「${matched.title}」存入礼券包`);
      setCouponInput('');
      setActiveTab('available');
      return;
    }

    const dynamicCoupon: CouponItem = {
      id: `cpn-custom-${Date.now()}`,
      code: targetCode,
      title: `口令直减礼遇券 (${targetCode})`,
      subtitle: '黑曜石全品类现制饮品与餐食可用',
      couponType: 'amount_cut',
      discountValue: 8.0,
      minSpend: 40.0,
      truckScopeType: 'all_trucks',
      applicableTruckNames: ['全车队通用 (01/02/03/04号车)'],
      scopeType: 'all_dishes',
      timeSlotType: 'all_day',
      timeSlotLabel: '全天全时段通用',
      dayRestriction: 'all_week',
      dayRestrictionLabel: '全周通用',
      designStyle: 'black_gold',
      badgeText: '口令礼遇',
      totalQuantity: 100,
      issuedCount: 1,
      usedCount: 0,
      status: 'active',
      expireDate: '2026-09-30',
      createdAt: new Date().toISOString().slice(0, 10)
    };
    const newRecord: UserCouponRecord = {
      userCouponId: `uc-${Date.now()}`,
      couponId: dynamicCoupon.id,
      coupon: dynamicCoupon,
      status: 'available',
      acquiredAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
    };
    persistUserCoupons([newRecord, ...userCoupons]);
    toast.success('兑换成功', `已录入「${dynamicCoupon.title}」`);
    setCouponInput('');
    setActiveTab('available');
  };

  const handleClaimMarketCoupon = (coupon: CouponItem) => {
    const alreadyHas = userCoupons.find(
      (uc) => uc.couponId === coupon.id && uc.status === 'available'
    );
    if (alreadyHas) {
      toast.info('已在券包中', `您已领取过「${coupon.title}」`);
      return;
    }
    const newRecord: UserCouponRecord = {
      userCouponId: `uc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      couponId: coupon.id,
      coupon,
      status: 'available',
      acquiredAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
    };
    persistUserCoupons([newRecord, ...userCoupons]);
    toast.success('领取成功', `「${coupon.title}」已放入可用券包`);
  };

  const handleCopyCode = (code: string) => {
    void navigator.clipboard?.writeText(code).catch(() => {});
    setCopiedCode(code);
    toast.success('券码已复制', `${code} 已复制到剪贴板`);
    setTimeout(() => setCopiedCode(null), 1800);
  };

  const handleUseCoupon = (coupon: CouponItem) => {
    if (onSelectCouponToUse) {
      onSelectCouponToUse(coupon.code);
      onBack?.();
      return;
    }
    if (onGoToMenu) {
      toast.success(`已选定「${coupon.title}」`, '结算时将自动为您抵扣最优金额');
      onGoToMenu();
      return;
    }
    toast.success(`已选定「${coupon.title}」`, '下次下单结算自动应用此优惠券');
    onBack?.();
  };

  const renderStubValue = (coupon: CouponItem) => {
    if (coupon.couponType === 'discount_percent') {
      return {
        prefix: '',
        main: (coupon.discountValue * 10).toFixed(1),
        suffix: '折'
      };
    }
    if (coupon.couponType === 'delivery_free') {
      return {
        prefix: '',
        main: '免运',
        suffix: ''
      };
    }
    return {
      prefix: '¥',
      main: String(coupon.discountValue),
      suffix: ''
    };
  };

  const renderTicketCard = (record: UserCouponRecord) => {
    const { coupon, status, usedAt, usedOrderNo } = record;
    const isAvailable = status === 'available';
    const isExpanded = expandedRuleId === record.userCouponId;
    const stubTheme = getStubTheme(coupon.designStyle, !isAvailable);
    const val = renderStubValue(coupon);

    const scopeSummary = [
      coupon.badgeText || (coupon.truckScopeType === 'all_trucks' ? '全车通用' : '指定餐车'),
      coupon.scopeType === 'all_dishes'
        ? '全品类可用'
        : coupon.scopeCategoryNames?.join(' / ') || '限定品类'
    ].join(' · ');

    return (
      <article
        key={record.userCouponId}
        className={`bg-white rounded-2xl border border-black/[0.06] shadow-[0_3px_14px_-8px_rgba(15,23,42,0.1)] overflow-hidden transition ${
          isAvailable ? '' : 'opacity-70'
        }`}
      >
        <div className="flex items-stretch">
          {/* Left Value Stub */}
          <div
            className={`w-[104px] shrink-0 px-2.5 py-4 flex flex-col items-center justify-center text-center ${stubTheme.container}`}
          >
            <div className={`flex items-baseline justify-center gap-0.5 leading-none ${stubTheme.value}`}>
              {val.prefix && <span className="text-sm font-extrabold">{val.prefix}</span>}
              <span className="text-[26px] font-black tracking-tight tabular-nums leading-none">
                {val.main}
              </span>
              {val.suffix && <span className="text-xs font-extrabold">{val.suffix}</span>}
            </div>
            <span className={`text-[11px] font-semibold mt-1.5 tabular-nums ${stubTheme.sub}`}>
              {coupon.minSpend === 0 ? '无门槛' : `满 ¥${coupon.minSpend}`}
            </span>
          </div>

          {/* Perforated Vertical Seam with Clean Canvas Notches */}
          <div className="relative w-0 border-l border-dashed border-black/[0.1] shrink-0">
            <span
              aria-hidden="true"
              className="absolute -top-2 -left-[7px] w-3.5 h-3.5 rounded-full bg-[#f5f4f0]"
            />
            <span
              aria-hidden="true"
              className="absolute -bottom-2 -left-[7px] w-3.5 h-3.5 rounded-full bg-[#f5f4f0]"
            />
          </div>

          {/* Right Ticket Details */}
          <div className="flex-1 min-w-0 px-3.5 py-3 flex flex-col justify-between gap-2.5">
            <div>
              <div className="text-[11px] font-medium text-neutral-400 truncate">
                {scopeSummary}
              </div>
              <h4 className="text-[13px] font-extrabold text-[#141413] leading-snug mt-0.5 line-clamp-1">
                {coupon.title}
              </h4>
              <p className="text-[11px] text-neutral-500 mt-0.5 line-clamp-1">
                {coupon.subtitle}
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-black/[0.05]">
              <button
                type="button"
                onClick={() =>
                  setExpandedRuleId(isExpanded ? null : record.userCouponId)
                }
                className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-400 hover:text-[#141413] transition cursor-pointer min-w-0"
              >
                <span className="tabular-nums truncate">
                  {status === 'used'
                    ? `已核销 · ${usedOrderNo || '已完成'}`
                    : status === 'expired'
                      ? `已过期 · ${coupon.expireDate}`
                      : `至 ${coupon.expireDate}`}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                    isExpanded ? 'rotate-180 text-[#141413]' : ''
                  }`}
                />
              </button>

              {isAvailable ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopyCode(coupon.code)}
                    aria-label={`复制券码 ${coupon.code}`}
                    title={`复制券码 ${coupon.code}`}
                    className="w-9 h-9 rounded-xl bg-[#f1efe9] hover:bg-neutral-200/80 text-neutral-700 flex items-center justify-center transition cursor-pointer"
                  >
                    {copiedCode === coupon.code ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUseCoupon(coupon)}
                    className="h-9 px-3.5 rounded-xl bg-[#141413] hover:bg-neutral-800 text-white text-[11px] font-bold whitespace-nowrap shrink-0 active:scale-95 transition cursor-pointer"
                  >
                    去使用
                  </button>
                </div>
              ) : (
                <span className="text-[11px] font-semibold text-neutral-400 whitespace-nowrap shrink-0">
                  {status === 'used' ? '已使用' : '已失效'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Expandable Rule Details Drawer */}
        {isExpanded && (
          <div className="px-3.5 py-2.5 bg-[#faf9f6] border-t border-black/[0.05] text-[11px] text-neutral-600 space-y-1.5 animate-in fade-in">
            <div className="flex items-center justify-between gap-2">
              <span className="text-neutral-400">礼券编号</span>
              <button
                type="button"
                onClick={() => handleCopyCode(coupon.code)}
                className="font-mono font-bold text-[#141413] inline-flex items-center gap-1 hover:text-emerald-700 cursor-pointer"
              >
                <span>{coupon.code}</span>
                <Copy className="w-3 h-3 text-neutral-400" />
              </button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-neutral-400 inline-flex items-center gap-1">
                <Truck className="w-3 h-3" /> 适用餐车
              </span>
              <span className="font-medium text-neutral-700 text-right">
                {coupon.applicableTruckNames?.join('、') || '全车队通用'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-neutral-400 inline-flex items-center gap-1">
                <Clock className="w-3 h-3" /> 核销时段
              </span>
              <span className="font-medium text-neutral-700">
                {coupon.timeSlotLabel || '全天通用'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-neutral-400 inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" /> 日期限制
              </span>
              <span className="font-medium text-neutral-700">
                {coupon.dayRestrictionLabel || '全周通用'}
              </span>
            </div>
            {coupon.maxDiscountCap && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-neutral-400">最高优惠封顶</span>
                <span className="font-bold text-[#141413] tabular-nums">
                  ¥{coupon.maxDiscountCap.toFixed(0)}
                </span>
              </div>
            )}
            {usedAt && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-neutral-400">使用时间</span>
                <span className="tabular-nums text-neutral-600">{usedAt}</span>
              </div>
            )}
          </div>
        )}
      </article>
    );
  };

  const renderMarketCard = (coupon: CouponItem) => {
    const isClaimed = userCoupons.some(
      (uc) => uc.couponId === coupon.id && uc.status === 'available'
    );
    const stubTheme = getStubTheme(coupon.designStyle, false);
    const val = renderStubValue(coupon);

    const scopeSummary = [
      coupon.badgeText || (coupon.truckScopeType === 'all_trucks' ? '全车通用' : '限定车队'),
      coupon.dayRestrictionLabel || '全周可用'
    ].join(' · ');

    const remainRatio = Math.max(
      0,
      Math.min(100, Math.round(((coupon.totalQuantity - coupon.issuedCount) / coupon.totalQuantity) * 100))
    );

    return (
      <article
        key={coupon.id}
        className="bg-white rounded-2xl border border-black/[0.06] shadow-[0_3px_14px_-8px_rgba(15,23,42,0.1)] overflow-hidden"
      >
        <div className="flex items-stretch">
          <div
            className={`w-[104px] shrink-0 px-2.5 py-4 flex flex-col items-center justify-center text-center ${stubTheme.container}`}
          >
            <div className={`flex items-baseline justify-center gap-0.5 leading-none ${stubTheme.value}`}>
              {val.prefix && <span className="text-sm font-extrabold">{val.prefix}</span>}
              <span className="text-[26px] font-black tracking-tight tabular-nums leading-none">
                {val.main}
              </span>
              {val.suffix && <span className="text-xs font-extrabold">{val.suffix}</span>}
            </div>
            <span className={`text-[11px] font-semibold mt-1.5 tabular-nums ${stubTheme.sub}`}>
              {coupon.minSpend === 0 ? '无门槛' : `满 ¥${coupon.minSpend}`}
            </span>
          </div>

          <div className="relative w-0 border-l border-dashed border-black/[0.1] shrink-0">
            <span
              aria-hidden="true"
              className="absolute -top-2 -left-[7px] w-3.5 h-3.5 rounded-full bg-[#f5f4f0]"
            />
            <span
              aria-hidden="true"
              className="absolute -bottom-2 -left-[7px] w-3.5 h-3.5 rounded-full bg-[#f5f4f0]"
            />
          </div>

          <div className="flex-1 min-w-0 px-3.5 py-3 flex flex-col justify-between gap-2.5">
            <div>
              <div className="text-[11px] font-medium text-neutral-400 truncate">
                {scopeSummary}
              </div>
              <h4 className="text-[13px] font-extrabold text-[#141413] leading-snug mt-0.5 line-clamp-1">
                {coupon.title}
              </h4>
              <p className="text-[11px] text-neutral-500 mt-0.5 line-clamp-1">
                {coupon.subtitle}
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-black/[0.05]">
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center justify-between text-[11px] text-neutral-400 tabular-nums mb-1">
                  <span className="truncate">{coupon.timeSlotLabel || '全天可用'}</span>
                  <span className="shrink-0 ml-1">余 {remainRatio}%</span>
                </div>
                <div className="w-full h-1 rounded-full bg-[#f1efe9] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${remainRatio}%` }}
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={isClaimed}
                onClick={() => handleClaimMarketCoupon(coupon)}
                className={`h-9 px-3.5 rounded-xl text-[11px] font-bold whitespace-nowrap shrink-0 transition ${
                  isClaimed
                    ? 'bg-[#f1efe9] text-neutral-400 cursor-not-allowed'
                    : 'bg-[#141413] hover:bg-neutral-800 text-white active:scale-95 cursor-pointer'
                }`}
              >
                {isClaimed ? '已在券包' : '免费领取'}
              </button>
            </div>
          </div>
        </div>
      </article>
    );
  };

  const currentRecords =
    activeTab === 'available'
      ? availableCoupons
      : activeTab === 'used'
        ? usedCoupons
        : expiredCoupons;

  return (
    <div className="w-full min-h-screen bg-[#f5f4f0] text-[#141413] pb-14 select-none font-sans">
      <UnifiedPageHeader
        title="我的优惠券包"
        onBack={onBack}
        backLabel="返回会员中心"
        statusTone={isVIPActive ? 'online' : 'offline'}
        statusTitle={isVIPActive ? '黑卡礼券权益激活中' : '普通会员礼券包'}
        primaryActive={activeTab === 'market'}
        onPrimaryClick={() => setActiveTab((prev) => (prev === 'market' ? 'available' : 'market'))}
        primaryTitle={activeTab === 'market' ? '查看已有礼券' : '前往领券中心'}
        isRefreshing={isRefreshing}
        onRefreshClick={handleRefresh}
        refreshTitle="刷新礼券状态"
        notificationOn={isNotificationOn}
        onNotificationClick={toggleNotification}
        stickyClassName={headerStickyClass || 'sticky top-0 z-30'}
      />

      <main className="w-full mx-auto px-3.5 pt-3.5 flex flex-col gap-3.5">
        {/* Hero Privilege Voucher Summary Card */}
        <section
          aria-label="礼券资产总览"
          className="obsidian-mesh rounded-2xl p-5 text-white border border-neutral-800 shadow-[0_14px_34px_-16px_rgba(20,20,19,0.55)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold tracking-wider text-emerald-300/90">
                黑曜石会员礼券中心 · {isVIPActive ? 'VIP 尊享折扣叠加' : '标准账户'}
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-[34px] font-black tracking-tight text-white tabular-nums leading-none">
                  ¥{totalPotentialSavings.toFixed(0)}
                </span>
                <span className="text-xs font-medium text-neutral-300">
                  预计最高可省
                </span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-[22px] font-black text-amber-300 tabular-nums leading-none">
                {availableCoupons.length}
              </div>
              <div className="text-[11px] text-neutral-400 mt-1">张可用礼券</div>
            </div>
          </div>

          <div className="mt-4 pt-3.5 border-t border-white/10 flex items-center justify-between gap-2 text-[11px] text-neutral-300">
            <span className="truncate">
              无门槛立减 · 时段专享折扣 · 专送免运费
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('market')}
              className="inline-flex items-center gap-1 text-emerald-300 hover:text-emerald-200 font-bold whitespace-nowrap shrink-0 cursor-pointer transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>去领更多</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>

        {/* Promo Code Redemption Card */}
        <section className="bg-white rounded-2xl border border-black/[0.06] shadow-[0_2px_10px_-6px_rgba(20,20,19,0.06)] p-3.5 space-y-2.5">
          <form onSubmit={(e) => handleRedeemCode(e)} className="flex items-center gap-2">
            <div className="flex-1 h-11 bg-[#f7f6f2] border border-black/[0.07] focus-within:bg-white focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/15 rounded-xl px-3 flex items-center gap-2 transition">
              <Tag className="w-4 h-4 text-neutral-400 shrink-0" />
              <input
                type="text"
                placeholder="输入礼券口令或兑换码"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                className="w-full bg-transparent text-xs font-bold text-[#141413] placeholder:font-medium placeholder:text-neutral-400 outline-none uppercase tracking-wider tabular-nums"
              />
            </div>
            <button
              type="submit"
              className="h-11 px-4 rounded-xl bg-[#141413] hover:bg-neutral-800 text-white text-xs font-bold whitespace-nowrap shrink-0 active:scale-95 transition cursor-pointer"
            >
              立即兑换
            </button>
          </form>

          <div className="flex items-center justify-between gap-2 text-[11px] text-neutral-400">
            <span>常用口令快速填入</span>
            <div className="flex items-center gap-2.5 overflow-x-auto">
              {QUICK_REDEEM_CODES.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setCouponInput(code)}
                  className="font-mono font-bold text-neutral-600 hover:text-[#141413] whitespace-nowrap cursor-pointer transition"
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Segmented Filter Tabs */}
        <nav
          aria-label="优惠券分类筛选"
          className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-[#eceae3]"
        >
          {[
            { id: 'available' as const, label: `可用 (${availableCoupons.length})` },
            { id: 'market' as const, label: '领券中心' },
            { id: 'used' as const, label: `已用 (${usedCoupons.length})` },
            { id: 'expired' as const, label: `过期 (${expiredCoupons.length})` }
          ].map((tabItem) => (
            <button
              key={tabItem.id}
              type="button"
              onClick={() => setActiveTab(tabItem.id)}
              aria-pressed={activeTab === tabItem.id}
              className={`h-10 rounded-xl text-xs whitespace-nowrap transition cursor-pointer ${
                activeTab === tabItem.id
                  ? 'bg-white text-[#141413] font-extrabold shadow-xs'
                  : 'text-neutral-500 font-semibold hover:text-[#141413]'
              }`}
            >
              {tabItem.label}
            </button>
          ))}
        </nav>

        {/* Voucher List */}
        {activeTab === 'market' ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#141413]">
                <Store className="w-3.5 h-3.5 text-emerald-600" />
                <span>流动餐车官方派券专区</span>
              </div>
              <span className="text-[11px] text-neutral-400">点击免费领取</span>
            </div>
            <div className="space-y-2.5">
              {marketCoupons.map(renderMarketCard)}
            </div>
          </section>
        ) : currentRecords.length === 0 ? (
          <section className="bg-white rounded-2xl border border-black/[0.06] py-12 px-6 text-center flex flex-col items-center gap-2.5">
            <div className="w-12 h-12 rounded-2xl bg-[#f1efe9] text-neutral-400 flex items-center justify-center">
              <Ticket className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-[#141413]">
              {activeTab === 'available'
                ? '暂无可用优惠券'
                : activeTab === 'used'
                  ? '暂无已核销记录'
                  : '暂无已过期礼券'}
            </div>
            <p className="text-xs text-neutral-400 max-w-[240px]">
              前往领券中心可免费领取全车通用券与饮品折扣券
            </p>
            <button
              type="button"
              onClick={() => setActiveTab('market')}
              className="mt-1 h-10 px-4 rounded-xl bg-[#141413] hover:bg-neutral-800 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition"
            >
              <span>前往领券中心</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </section>
        ) : (
          <section className="space-y-2.5">
            {currentRecords.map(renderTicketCard)}
          </section>
        )}

        {/* Quiet Bottom Assurance */}
        <footer className="pt-2 pb-4 flex items-center justify-center gap-1.5 text-[11px] text-neutral-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>黑曜石餐车网络 · 结算时自动匹配最优组合抵扣方案</span>
        </footer>
      </main>
    </div>
  );
};

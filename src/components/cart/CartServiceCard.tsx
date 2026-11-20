import React from 'react';
import { Ticket, Leaf, MessageSquareText, ChevronRight } from 'lucide-react';
import type { DiningMode } from '../../types';
import type { UserCouponRecord } from '../../types/coupon';
import type { OrderPricingTotals } from '../../utils/orderPricingEngine';
import { CartPriceBreakdownCard } from './CartPriceBreakdownCard';

export type PackagingOption = 'eco_cane' | 'insulated_std';

export interface CartServiceCardProps {
  selectedCoupon: UserCouponRecord | null;
  couponDiscount: number;
  packaging: PackagingOption;
  orderRemark: string;
  diningMode: DiningMode;
  totals: OrderPricingTotals;
  breakdownExpanded: boolean;
  onToggleBreakdown: () => void;
  onOpenCouponModal: () => void;
  onChangePackaging: (pkg: PackagingOption) => void;
  onOpenRemarkModal: () => void;
}

export const CartServiceCard: React.FC<CartServiceCardProps> = ({
  selectedCoupon,
  couponDiscount,
  packaging,
  orderRemark,
  diningMode,
  totals,
  breakdownExpanded,
  onToggleBreakdown,
  onOpenCouponModal,
  onChangePackaging,
  onOpenRemarkModal
}) => {
  return (
    <section
      aria-label="服务偏好与费用明细"
      className="bg-white/82 backdrop-blur-md rounded-2xl border border-black/[0.06] shadow-[0_6px_24px_-12px_rgba(20,20,19,0.1)] divide-y divide-black/[0.06] overflow-hidden"
    >
      {/* 1. 优惠抵扣 */}
      <button
        type="button"
        onClick={onOpenCouponModal}
        className="w-full px-3.5 py-2.5 hover:bg-white/60 flex items-center justify-between gap-2 text-left transition cursor-pointer"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Ticket className="w-4 h-4 text-emerald-700 shrink-0" />
          <span className="text-xs font-bold text-[#141413] shrink-0">优惠抵扣</span>
          <span className="text-[11px] text-neutral-400 truncate">
            {selectedCoupon ? selectedCoupon.coupon.code : '未选券'}
          </span>
        </div>

        <span className="text-xs font-bold inline-flex items-center gap-1 shrink-0">
          <span
            className={`font-mono tabular-nums ${
              couponDiscount > 0 ? 'text-emerald-700' : 'text-neutral-500'
            }`}
          >
            {couponDiscount > 0 ? `-¥${couponDiscount.toFixed(2)}` : '选券'}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
        </span>
      </button>

      {/* 2. 包装方式（内联切换） */}
      <div className="px-3.5 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Leaf className="w-4 h-4 text-emerald-700 shrink-0" />
          <span className="text-xs font-bold text-[#141413] shrink-0">包装方式</span>
          <span className="text-[10px] text-neutral-400 truncate">
            {packaging === 'eco_cane' ? '减碳25g' : '锁温30分'}
          </span>
        </div>

        <div className="inline-flex items-center p-0.5 rounded-xl bg-[#f4f4f5]/90 border border-black/[0.05] shrink-0">
          <button
            type="button"
            onClick={() => onChangePackaging('eco_cane')}
            aria-pressed={packaging === 'eco_cane'}
            className={`h-7 px-2.5 rounded-[10px] text-[11px] font-bold transition cursor-pointer whitespace-nowrap ${
              packaging === 'eco_cane'
                ? 'bg-white text-[#141413] shadow-2xs'
                : 'text-neutral-500 hover:text-[#141413]'
            }`}
          >
            甘蔗环保
          </button>
          <button
            type="button"
            onClick={() => onChangePackaging('insulated_std')}
            aria-pressed={packaging === 'insulated_std'}
            className={`h-7 px-2.5 rounded-[10px] text-[11px] font-bold transition cursor-pointer whitespace-nowrap ${
              packaging === 'insulated_std'
                ? 'bg-white text-[#141413] shadow-2xs'
                : 'text-neutral-500 hover:text-[#141413]'
            }`}
          >
            标准保温
          </button>
        </div>
      </div>

      {/* 3. 制作备注 */}
      <button
        type="button"
        onClick={onOpenRemarkModal}
        className="w-full px-3.5 py-2.5 hover:bg-white/60 flex items-center justify-between gap-2 text-left transition cursor-pointer"
      >
        <div className="flex items-center gap-2 shrink-0">
          <MessageSquareText className="w-4 h-4 text-neutral-500 shrink-0" />
          <span className="text-xs font-bold text-[#141413]">制作备注</span>
        </div>

        <span className="text-[11px] text-neutral-500 inline-flex items-center gap-1 min-w-0">
          <span
            className={`truncate max-w-[190px] ${
              orderRemark ? 'font-bold text-[#141413]' : ''
            }`}
          >
            {orderRemark || '添加整单口味要求'}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
        </span>
      </button>

      {/* 4. 费用明细（收纳折叠行） */}
      <CartPriceBreakdownCard
        embedded
        expanded={breakdownExpanded}
        onToggleExpand={onToggleBreakdown}
        diningMode={diningMode}
        totals={totals}
        selectedCouponCode={selectedCoupon?.coupon.code}
      />
    </section>
  );
};

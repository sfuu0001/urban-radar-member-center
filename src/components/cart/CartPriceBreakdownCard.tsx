import React from 'react';
import { ChevronDown, Receipt } from 'lucide-react';
import type { DiningMode } from '../../types';
import type { OrderPricingTotals } from '../../utils/orderPricingEngine';

export interface CartPriceBreakdownCardProps {
  expanded: boolean;
  onToggleExpand: () => void;
  diningMode: DiningMode;
  totals: OrderPricingTotals;
  selectedCouponCode?: string;
  embedded?: boolean;
}

export const CartPriceBreakdownCard: React.FC<CartPriceBreakdownCardProps> = ({
  expanded,
  onToggleExpand,
  diningMode,
  totals,
  selectedCouponCode,
  embedded = false
}) => {
  const activityAndChannelDiscount = totals.channelDiscount + totals.tieredActivityDiscount;

  const content = (
    <>
      <button
        type="button"
        onClick={onToggleExpand}
        aria-expanded={expanded}
        className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-white/60 transition cursor-pointer"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Receipt className="w-4 h-4 text-neutral-500 shrink-0" />
          <span className="text-xs font-bold text-[#141413] shrink-0">费用明细</span>
          {!expanded && totals.totalDiscount > 0 && (
            <span className="text-[11px] font-bold text-emerald-700 tabular-nums truncate">
              共省 ¥{totals.totalDiscount.toFixed(2)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-neutral-500 shrink-0">
          <span className="font-mono text-xs font-extrabold text-[#141413] tabular-nums">
            ¥{totals.finalTotal.toFixed(2)}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              expanded ? 'rotate-180 text-[#141413]' : ''
            }`}
          />
        </div>
      </button>

      {expanded && (
        <div className="px-3.5 pb-3 pt-2 border-t border-black/[0.05] bg-[#fafafa]/80 backdrop-blur-sm space-y-1.5 text-[11px] animate-in fade-in">
          <div className="flex items-center justify-between gap-2">
            <span className="text-neutral-500">餐品小计</span>
            <span className="font-mono font-bold text-[#141413] tabular-nums">
              ¥{totals.itemsSubtotal.toFixed(2)}
            </span>
          </div>

          {diningMode === 'delivery' && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-neutral-500">
                配送费
                {totals.deliveryWaivedReason && (
                  <span className="ml-1 text-emerald-700 font-medium">
                    ({totals.deliveryWaivedReason})
                  </span>
                )}
              </span>
              <span className="font-mono font-bold text-[#141413] tabular-nums">
                ¥{totals.deliveryFee.toFixed(2)}
              </span>
            </div>
          )}

          {totals.couponDiscount > 0 && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-neutral-500">
                优惠券{selectedCouponCode ? ` (${selectedCouponCode})` : ''}
              </span>
              <span className="font-mono font-bold text-emerald-700 tabular-nums">
                -¥{totals.couponDiscount.toFixed(2)}
              </span>
            </div>
          )}

          {totals.vipDiscount > 0 && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-neutral-500">VIP 专享权益</span>
              <span className="font-mono font-bold text-emerald-700 tabular-nums">
                -¥{totals.vipDiscount.toFixed(2)}
              </span>
            </div>
          )}

          {activityAndChannelDiscount > 0 && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-neutral-500">
                {totals.tieredActivityDiscount > 0
                  ? totals.tieredActivityLabel
                  : totals.channelDiscountLabel}
              </span>
              <span className="font-mono font-bold text-emerald-700 tabular-nums">
                -¥{activityAndChannelDiscount.toFixed(2)}
              </span>
            </div>
          )}

          <div className="pt-1.5 mt-1 border-t border-dashed border-black/[0.08] flex items-center justify-between gap-2">
            <span className="text-neutral-600 font-semibold">
              实付合计
              {diningMode === 'delivery' && (
                <span className="ml-1.5 text-[10px] font-normal text-neutral-400 tabular-nums">
                  (起送计价 ¥{totals.postDiscountDishAmount.toFixed(2)})
                </span>
              )}
            </span>
            <span className="font-mono text-xs font-black text-[#141413] tabular-nums">
              ¥{totals.finalTotal.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </>
  );

  if (embedded) {
    return <div aria-label="费用明细">{content}</div>;
  }

  return (
    <section
      aria-label="费用明细"
      className="bg-white/82 backdrop-blur-md rounded-2xl border border-black/[0.06] shadow-[0_6px_24px_-12px_rgba(20,20,19,0.1)] overflow-hidden"
    >
      {content}
    </section>
  );
};

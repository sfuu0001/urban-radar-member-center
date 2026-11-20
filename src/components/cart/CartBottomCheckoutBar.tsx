import React from 'react';
import { Zap, ShieldCheck } from 'lucide-react';

export interface CartBottomCheckoutBarProps {
  finalTotal: number;
  totalDiscount?: number;
  disabled?: boolean;
  onOpenDirectCashier: () => void;
  onProceedCheckout: () => void;
}

export const CartBottomCheckoutBar: React.FC<CartBottomCheckoutBarProps> = ({
  finalTotal,
  totalDiscount = 0,
  disabled = false,
  onOpenDirectCashier,
  onProceedCheckout
}) => {
  return (
    <div
      data-purpose="checkout-bar"
      className="sticky bottom-2.5 z-30 w-full px-3 pb-2 pointer-events-none"
    >
      <div className="max-w-5xl mx-auto rounded-2xl bg-white/80 backdrop-blur-xl border border-black/[0.08] px-3.5 py-2.5 shadow-[0_14px_34px_-10px_rgba(20,20,19,0.18)] pointer-events-auto flex items-center justify-between gap-2.5">
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[11px] font-bold text-neutral-500">实付总额</span>
            <span className="font-mono text-[22px] font-black text-[#141413] tracking-tight tabular-nums leading-none">
              ¥{finalTotal.toFixed(2)}
            </span>
          </div>
          <div className="text-[10px] text-neutral-500 flex items-center gap-1 mt-1 truncate tabular-nums">
            <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
            <span className="truncate">
              {totalDiscount > 0
                ? `已省 ¥${totalDiscount.toFixed(2)} · 含税费、包装及配送费`
                : '已含全部税费、包装费及配送费'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onOpenDirectCashier}
            title="直通安全收银台"
            aria-label="直通安全收银台"
            className="w-11 h-11 rounded-xl border border-black/[0.08] bg-white/90 hover:bg-[#f4f4f5] text-[#141413] flex items-center justify-center shrink-0 active:scale-95 transition cursor-pointer shadow-[0_1px_2px_rgba(20,20,19,0.04)]"
          >
            <Zap className="w-4 h-4 text-amber-500 fill-amber-400" />
          </button>

          <button
            type="button"
            onClick={onProceedCheckout}
            disabled={disabled}
            className="h-11 px-4 rounded-xl bg-[#141413] hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 text-white text-xs font-extrabold tracking-tight whitespace-nowrap shrink-0 active:scale-[0.98] transition cursor-pointer disabled:cursor-not-allowed tabular-nums shadow-[0_6px_16px_-6px_rgba(20,20,19,0.4)]"
          >
            前往结算 ¥{finalTotal.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
};

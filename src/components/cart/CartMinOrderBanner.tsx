import React from 'react';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import type { DiningMode } from '../../types';

export interface CartMinOrderBannerProps {
  diningMode: DiningMode;
  minOrderThreshold: number;
  postDiscountDishAmount: number;
  minOrderMet: boolean;
  minOrderShortfall: number;
  onBackToMenu: () => void;
}

/**
 * 仅在「外卖专送且未达到起送线」时显示紧凑提示条；
 * 自提、堂食及已达标状态自动收纳隐藏，减少无效占屏。
 */
export const CartMinOrderBanner: React.FC<CartMinOrderBannerProps> = ({
  diningMode,
  minOrderThreshold,
  postDiscountDishAmount,
  minOrderMet,
  minOrderShortfall,
  onBackToMenu
}) => {
  if (diningMode !== 'delivery' || minOrderMet) {
    return null;
  }

  const ratio =
    minOrderThreshold > 0
      ? Math.max(0, Math.min(100, Math.round((postDiscountDishAmount / minOrderThreshold) * 100)))
      : 100;

  return (
    <div
      role="status"
      className="bg-amber-50/85 backdrop-blur-md rounded-2xl border border-amber-200/80 px-3.5 py-2.5 space-y-1.5 text-xs shadow-[0_4px_16px_-10px_rgba(217,119,6,0.2)]"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="font-bold text-amber-900 tabular-nums truncate">
            还差 ¥{minOrderShortfall.toFixed(2)} 起送（满 ¥{minOrderThreshold}）
          </span>
        </div>
        <button
          type="button"
          onClick={onBackToMenu}
          className="h-8 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer transition active:scale-95"
        >
          <ArrowLeft className="w-3 h-3" />
          <span>去加购</span>
        </button>
      </div>
      <div className="w-full h-1 rounded-full bg-amber-200/80 overflow-hidden">
        <div
          className="h-full bg-amber-600 rounded-full transition-all duration-300"
          style={{ width: `${ratio}%` }}
        />
      </div>
    </div>
  );
};

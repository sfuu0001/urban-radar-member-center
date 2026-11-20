import React from 'react';
import { Minus, Plus, Trash2, Users, AlignLeft, LayoutGrid } from 'lucide-react';
import type { CartItem, DiningMode } from '../../types';
import { DishThumbIllustration } from './DishThumbIllustration';

export interface CartItemListSectionProps {
  items: CartItem[];
  diningMode: DiningMode;
  displayMode: 'rich' | 'text';
  onChangeDisplayMode: (mode: 'rich' | 'text') => void;
  onUpdateQuantity: (cartItemId: string, delta: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onBackToMenu: () => void;
}

interface ParticipantGroup {
  participantId: string;
  participantName: string;
  ownerLeft: boolean;
  items: CartItem[];
  subtotal: number;
}

export const CartItemListSection: React.FC<CartItemListSectionProps> = ({
  items,
  diningMode,
  displayMode,
  onChangeDisplayMode,
  onUpdateQuantity,
  onRemoveItem,
  onBackToMenu
}) => {
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // 堂食模式下按同桌加购人分组
  const groups: ParticipantGroup[] = React.useMemo(() => {
    if (diningMode !== 'dine_in') {
      return [
        {
          participantId: 'all',
          participantName: '全部餐品',
          ownerLeft: false,
          items,
          subtotal: items.reduce((s, i) => s + i.calculatedPrice * i.quantity, 0)
        }
      ];
    }

    const map = new Map<string, ParticipantGroup>();
    items.forEach((item) => {
      const pid = item.participantId || 'owner';
      const pname = item.participantName || '桌主 (你)';
      const existing = map.get(pid);
      if (existing) {
        existing.items.push(item);
        existing.subtotal += item.calculatedPrice * item.quantity;
        if (item.ownerLeft) existing.ownerLeft = true;
      } else {
        map.set(pid, {
          participantId: pid,
          participantName: pname,
          ownerLeft: Boolean(item.ownerLeft),
          items: [item],
          subtotal: item.calculatedPrice * item.quantity
        });
      }
    });
    return Array.from(map.values());
  }, [items, diningMode]);

  const renderItemRow = (item: CartItem) => {
    const optionsSummary = Object.entries(item.selectedOptions || {})
      .map(([, v]) => v)
      .filter(Boolean)
      .join(' · ');
    const lineTotal = item.calculatedPrice * item.quantity;
    const isLeft = Boolean(item.ownerLeft);

    const showParticipantLine =
      diningMode === 'dine_in' ||
      (item.participantId && item.participantId !== 'owner') ||
      isLeft;

    return (
      <div
        key={item.cartItemId}
        className={`py-3 flex items-start justify-between gap-2.5 transition ${
          isLeft ? 'opacity-60 bg-neutral-50/80 -mx-3.5 px-3.5' : ''
        }`}
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {displayMode === 'rich' && (
            <DishThumbIllustration
              dishId={item.dish.id}
              category={item.dish.category}
              name={item.dish.name}
              size="md"
              muted={isLeft}
            />
          )}

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-[13px] font-extrabold text-[#141413] leading-snug break-words">
                {item.dish.name}
              </h3>
            </div>

            {optionsSummary && (
              <p className="text-[11px] text-neutral-500 leading-snug break-words">
                {optionsSummary}
              </p>
            )}

            {showParticipantLine && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-neutral-400">
                {item.participantName && <span>由 {item.participantName} 添加</span>}
                {isLeft && (
                  <span className="text-neutral-500 font-semibold">
                    · 已退桌 (保留对账)
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-1.5">
              <div className="flex items-baseline gap-2 tabular-nums">
                <span className="font-mono text-[13px] font-black text-[#141413]">
                  ¥{lineTotal.toFixed(2)}
                </span>
                {item.quantity > 1 && (
                  <span className="text-[11px] text-neutral-400">
                    ¥{item.calculatedPrice.toFixed(2)}/份
                  </span>
                )}
              </div>

              {/* Stepper */}
              <div className="inline-flex items-center border border-black/[0.08] rounded-xl bg-white/90 overflow-hidden shadow-[0_1px_2px_rgba(20,20,19,0.03)]">
                <button
                  type="button"
                  onClick={() =>
                    item.quantity <= 1
                      ? onRemoveItem(item.cartItemId)
                      : onUpdateQuantity(item.cartItemId, -1)
                  }
                  aria-label={item.quantity <= 1 ? `删除 ${item.dish.name}` : `减少 ${item.dish.name} 数量`}
                  className="w-8 h-8 flex items-center justify-center text-neutral-600 hover:bg-[#f4f4f5] hover:text-[#141413] transition cursor-pointer"
                >
                  {item.quantity <= 1 ? (
                    <Trash2 className="w-3.5 h-3.5 text-neutral-500" />
                  ) : (
                    <Minus className="w-3.5 h-3.5" />
                  )}
                </button>
                <span className="w-7 text-center font-mono text-xs font-extrabold text-[#141413] tabular-nums select-none">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(item.cartItemId, 1)}
                  aria-label={`增加 ${item.dish.name} 数量`}
                  className="w-8 h-8 flex items-center justify-center bg-[#141413] text-white hover:bg-neutral-800 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section
      aria-label="已点餐品明细"
      className="bg-white/82 backdrop-blur-md rounded-2xl border border-black/[0.06] shadow-[0_6px_24px_-12px_rgba(20,20,19,0.1)] p-3.5"
    >
      {/* Section Header */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-black/[0.06]">
        <div className="flex items-baseline gap-2">
          <h2 className="text-xs font-black text-[#141413]">已点餐品明细</h2>
          <span className="text-[11px] font-mono text-neutral-500 tabular-nums">
            共 {totalCount} 份
          </span>
        </div>

        {/* Display Mode Switcher: 图文 / 纯文字 */}
        <div className="inline-flex items-center p-0.5 rounded-xl bg-[#f4f4f5]/90 border border-black/[0.05]">
          <button
            type="button"
            onClick={() => onChangeDisplayMode('rich')}
            className={`h-7 px-2.5 rounded-[10px] text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer ${
              displayMode === 'rich'
                ? 'bg-white text-[#141413] shadow-2xs'
                : 'text-neutral-500 hover:text-[#141413]'
            }`}
          >
            <LayoutGrid className="w-3 h-3" />
            <span>图文</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeDisplayMode('text')}
            className={`h-7 px-2.5 rounded-[10px] text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer ${
              displayMode === 'text'
                ? 'bg-white text-[#141413] shadow-2xs'
                : 'text-neutral-500 hover:text-[#141413]'
            }`}
          >
            <AlignLeft className="w-3 h-3" />
            <span>纯文字</span>
          </button>
        </div>
      </div>

      {/* Empty State */}
      {items.length === 0 ? (
        <div className="py-10 text-center space-y-2.5">
          <div className="text-sm font-bold text-[#141413]">选购清单暂无餐品</div>
          <p className="text-xs text-neutral-500">
            请返回餐车菜单挑选现烤美味
          </p>
          <button
            type="button"
            onClick={onBackToMenu}
            className="h-9 px-4 rounded-xl bg-[#141413] hover:bg-neutral-800 text-white text-xs font-bold cursor-pointer transition active:scale-95"
          >
            去挑选餐品
          </button>
        </div>
      ) : diningMode === 'dine_in' ? (
        <div className="divide-y divide-black/[0.08]">
          {groups.map((group) => (
            <div key={group.participantId} className="pt-3 first:pt-2">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#141413]">
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{group.participantName}</span>
                  {group.ownerLeft && (
                    <span className="text-neutral-400 font-normal">· 已离开桌台</span>
                  )}
                </div>
                <span className="text-[11px] font-mono font-bold text-neutral-600 tabular-nums">
                  分单小计 ¥{group.subtotal.toFixed(2)}
                </span>
              </div>
              <div className="divide-y divide-black/[0.05]">
                {group.items.map(renderItemRow)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="divide-y divide-black/[0.05]">
          {items.map(renderItemRow)}
        </div>
      )}
    </section>
  );
};

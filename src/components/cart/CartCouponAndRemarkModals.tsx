import React, { useState } from 'react';
import { X, Ticket, Tag, Check, MessageSquareText, Trash2, MapPin, Plus } from 'lucide-react';
import type { UserAddress } from '../../types';
import type { UserCouponRecord } from '../../types/coupon';
import { CART_REMARK_PRESETS } from '../../data/mockCart';

/* ==================== 1. 选择或兑换优惠券弹层 ==================== */
export interface CartCouponModalProps {
  isOpen: boolean;
  availableCoupons: UserCouponRecord[];
  selectedCouponId: string | null;
  itemsSubtotal: number;
  onSelectCoupon: (record: UserCouponRecord | null) => void;
  onRedeemCode: (code: string) => void;
  onClose: () => void;
}

export const CartCouponModal: React.FC<CartCouponModalProps> = ({
  isOpen,
  availableCoupons,
  selectedCouponId,
  itemsSubtotal,
  onSelectCoupon,
  onRedeemCode,
  onClose
}) => {
  const [codeInput, setCodeInput] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = codeInput.trim().toUpperCase();
    if (!cleaned) return;
    onRedeemCode(cleaned);
    setCodeInput('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-[430px] bg-white/92 backdrop-blur-xl rounded-t-3xl sm:rounded-2xl border border-black/[0.08] shadow-[0_24px_56px_-16px_rgba(20,20,19,0.28)] overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-4 py-3 border-b border-black/[0.06] flex items-center justify-between gap-2 bg-white/60">
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-emerald-700" />
            <h3 className="text-sm font-black text-[#141413]">选择或兑换优惠券</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭优惠券选择"
            className="w-8 h-8 rounded-xl hover:bg-[#f4f4f5] flex items-center justify-center text-neutral-500 cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 兑换码输入 */}
        <form onSubmit={handleSubmit} className="p-3 border-b border-black/[0.06] bg-[#fafafa]/70 flex items-center gap-2">
          <div className="flex-1 h-10 bg-white/90 border border-black/[0.08] focus-within:border-[#141413] rounded-xl px-3 flex items-center gap-2">
            <Tag className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="输入券码如 UR-FREESHIP / UR-VIP5"
              className="w-full bg-transparent text-xs font-mono font-bold text-[#141413] placeholder:font-sans placeholder:font-normal placeholder:text-neutral-400 outline-none uppercase"
            />
          </div>
          <button
            type="submit"
            className="h-10 px-4 rounded-xl bg-[#141413] hover:bg-neutral-800 text-white text-xs font-bold shrink-0 cursor-pointer transition active:scale-95"
          >
            兑换
          </button>
        </form>

        {/* 可用卡券列表 */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <button
            type="button"
            onClick={() => {
              onSelectCoupon(null);
              onClose();
            }}
            className={`w-full px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between text-xs font-bold cursor-pointer transition ${
              selectedCouponId === null
                ? 'border-[#141413] bg-[#f4f4f5]/80 text-[#141413]'
                : 'border-black/[0.07] bg-white/80 hover:bg-white text-neutral-600'
            }`}
          >
            <span>不使用优惠券</span>
            {selectedCouponId === null && <Check className="w-4 h-4 text-emerald-600" />}
          </button>

          {availableCoupons.map((rec) => {
            const c = rec.coupon;
            const eligible = itemsSubtotal >= c.minSpend;
            const isSelected = selectedCouponId === rec.userCouponId;

            return (
              <button
                key={rec.userCouponId}
                type="button"
                disabled={!eligible}
                onClick={() => {
                  onSelectCoupon(rec);
                  onClose();
                }}
                className={`w-full rounded-2xl border p-3 text-left flex items-center justify-between gap-2.5 transition ${
                  !eligible
                    ? 'border-black/[0.05] bg-[#f4f4f5]/60 opacity-55 cursor-not-allowed'
                    : isSelected
                      ? 'border-[#141413] bg-emerald-50/45 cursor-pointer'
                      : 'border-black/[0.07] bg-white/85 hover:bg-white cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-14 h-12 rounded-xl obsidian-mesh text-white flex flex-col items-center justify-center shrink-0">
                    <span className="font-mono text-sm font-black text-amber-300 tabular-nums">
                      {c.couponType === 'discount_percent'
                        ? `${(c.discountValue * 10).toFixed(1)}折`
                        : c.couponType === 'delivery_free'
                          ? '免运'
                          : `¥${c.discountValue}`}
                    </span>
                    <span className="text-[9px] text-neutral-300 tabular-nums">
                      {c.minSpend === 0 ? '无门槛' : `满¥${c.minSpend}`}
                    </span>
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <div className="text-xs font-extrabold text-[#141413] truncate">
                      {c.title}
                    </div>
                    <div className="text-[11px] text-neutral-500 truncate">
                      {c.code} · {c.timeSlotLabel || '全天可用'}
                    </div>
                    {!eligible && (
                      <div className="text-[10px] font-bold text-amber-700 tabular-nums">
                        还差 ¥{(c.minSpend - itemsSubtotal).toFixed(2)} 可用
                      </div>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5" strokeWidth={2.6} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ==================== 2. 制作与口味备注弹层 ==================== */
export interface CartRemarkModalProps {
  isOpen: boolean;
  initialRemark: string;
  onSave: (remark: string) => void;
  onClose: () => void;
}

export const CartRemarkModal: React.FC<CartRemarkModalProps> = ({
  isOpen,
  initialRemark,
  onSave,
  onClose
}) => {
  const [draft, setDraft] = useState(initialRemark);

  React.useEffect(() => {
    if (isOpen) setDraft(initialRemark);
  }, [isOpen, initialRemark]);

  if (!isOpen) return null;

  const appendPreset = (tag: string) => {
    setDraft((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return tag;
      if (trimmed.includes(tag)) return trimmed;
      return `${trimmed}，${tag}`;
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-[430px] bg-white/92 backdrop-blur-xl rounded-t-3xl sm:rounded-2xl border border-black/[0.08] shadow-[0_24px_56px_-16px_rgba(20,20,19,0.28)] overflow-hidden">
        <div className="px-4 py-3 border-b border-black/[0.06] flex items-center justify-between gap-2 bg-white/60">
          <div className="flex items-center gap-2">
            <MessageSquareText className="w-4 h-4 text-[#141413]" />
            <h3 className="text-sm font-black text-[#141413]">添加制作与口味备注</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭备注弹层"
            className="w-8 h-8 rounded-xl hover:bg-[#f4f4f5] flex items-center justify-center text-neutral-500 cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="text-[11px] text-neutral-500">
            此备注作用于整笔订单（后厨联 + 骑手联同步展示），单品规格请在菜品明细中核对。
          </div>

          <textarea
            rows={3}
            maxLength={120}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="例如：全部免葱，黑椒酱单独分装..."
            className="w-full p-3 rounded-xl border border-black/[0.08] bg-[#f5f5f5]/90 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 text-xs text-[#141413] outline-none resize-none transition"
          />

          <div className="space-y-1.5">
            <div className="text-[11px] font-bold text-neutral-600">常用快速标签</div>
            <div className="flex flex-wrap gap-1.5">
              {CART_REMARK_PRESETS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => appendPreset(tag)}
                  className="h-8 px-2.5 rounded-xl border border-black/[0.08] bg-white/90 hover:bg-[#f4f4f5] text-[11px] font-semibold text-[#141413] cursor-pointer transition"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-black/[0.06] bg-[#fafafa]/75 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setDraft('')}
            className="h-9 px-3 rounded-xl border border-black/[0.08] bg-white/90 hover:bg-[#f4f4f5] text-xs font-bold text-neutral-600 cursor-pointer transition"
          >
            清空文本
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(draft.trim());
              onClose();
            }}
            className="h-9 px-4 rounded-xl bg-[#141413] hover:bg-neutral-800 text-white text-xs font-bold cursor-pointer transition active:scale-95"
          >
            确认保存
          </button>
        </div>
      </div>
    </div>
  );
};

/* ==================== 3. 确认清空清单弹层 ==================== */
export interface ClearCartConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ClearCartConfirmModal: React.FC<ClearCartConfirmModalProps> = ({
  isOpen,
  onConfirm,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="w-full max-w-[360px] bg-white/92 backdrop-blur-xl rounded-2xl border border-black/[0.08] shadow-[0_24px_56px_-16px_rgba(20,20,19,0.28)] p-4 space-y-3.5">
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
            <Trash2 className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-black text-[#141413]">确认清空清单？</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              清空后所有已选菜品和定制选项将被移除，需要重新挑选餐品。
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-black/[0.08] bg-white/90 hover:bg-[#f4f4f5] text-xs font-bold text-[#141413] cursor-pointer transition"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer transition active:scale-95"
          >
            确认清空
          </button>
        </div>
      </div>
    </div>
  );
};

/* ==================== 4. 收货地址快选弹层 ==================== */
export interface CartAddressModalProps {
  isOpen: boolean;
  addresses: UserAddress[];
  selectedAddressId: string | null;
  onSelectAddress: (addr: UserAddress) => void;
  onManageAddresses: () => void;
  onClose: () => void;
}

export const CartAddressModal: React.FC<CartAddressModalProps> = ({
  isOpen,
  addresses,
  selectedAddressId,
  onSelectAddress,
  onManageAddresses,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-[430px] bg-white/92 backdrop-blur-xl rounded-t-3xl sm:rounded-2xl border border-black/[0.08] shadow-[0_24px_56px_-16px_rgba(20,20,19,0.28)] overflow-hidden flex flex-col max-h-[80vh]">
        <div className="px-4 py-3 border-b border-black/[0.06] flex items-center justify-between gap-2 bg-white/60">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-700" />
            <h3 className="text-sm font-black text-[#141413]">选择收货地址</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭地址选择"
            className="w-8 h-8 rounded-xl hover:bg-[#f4f4f5] flex items-center justify-center text-neutral-500 cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {addresses.map((addr) => {
            const active = addr.id === selectedAddressId;
            return (
              <button
                key={addr.id}
                type="button"
                onClick={() => {
                  onSelectAddress(addr);
                  onClose();
                }}
                className={`w-full p-3 rounded-2xl border text-left flex items-start justify-between gap-2.5 cursor-pointer transition ${
                  active
                    ? 'border-[#141413] bg-emerald-50/40'
                    : 'border-black/[0.07] bg-white/85 hover:bg-white'
                }`}
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-emerald-700">[{addr.tag}]</span>
                    <span className="text-xs font-extrabold text-[#141413]">{addr.address}</span>
                  </div>
                  <div className="text-[11px] text-neutral-600">{addr.detail}</div>
                  <div className="text-[11px] text-neutral-500 tabular-nums">
                    {addr.name} · {addr.phone}
                  </div>
                </div>
                {active && (
                  <span className="w-5 h-5 rounded-lg bg-[#141413] text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="px-4 py-3 border-t border-black/[0.06] bg-[#fafafa]/75 flex items-center justify-between gap-2">
          <span className="text-[11px] text-neutral-500">同步来自「资料设置 · 常用地址」</span>
          <button
            type="button"
            onClick={() => {
              onClose();
              onManageAddresses();
            }}
            className="h-9 px-3 rounded-xl border border-black/[0.08] bg-white/90 hover:bg-[#f4f4f5] text-xs font-bold text-[#141413] inline-flex items-center gap-1 cursor-pointer transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新增/编辑地址</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import {
  X,
  ShieldCheck,
  Check,
  AlertCircle,
  Lock,
  QrCode,
  Copy,
  CheckCircle2
} from 'lucide-react';
import type { DiningMode } from '../../types';
import type { PaymentChannelId, PaymentVoucher } from '../../types/payment';
import type { OrderPricingTotals } from '../../utils/orderPricingEngine';

export interface PaymentChannelOption {
  id: PaymentChannelId;
  name: string;
  subtitle: string;
  badge?: string;
}

export const PAYMENT_CHANNELS: readonly PaymentChannelOption[] = [
  { id: 'wechat', name: '微信免密支付', subtitle: '支持微信立减金叠加', badge: '推荐' },
  { id: 'alipay', name: '支付宝极速付', subtitle: '碰一碰 / 花呗分期可用' },
  { id: 'dcep', name: '数字人民币钱包', subtitle: '央行数字货币 · 满30减2', badge: '立减¥2' },
  { id: 'card', name: '银联云闪付', subtitle: 'Apple Pay / 信用卡满60减3' },
  { id: 'enterprise', name: '企业餐补直扣', subtitle: '静安签约白名单免密签单' },
  { id: 'cash', name: '线下现金到付', subtitle: '餐车出餐台当面核收' }
];

/* ==================== 5. 直通安全收银台弹层 ==================== */
export interface CartCashierModalProps {
  isOpen: boolean;
  diningMode: DiningMode;
  totals: OrderPricingTotals;
  selectedChannel: PaymentChannelId;
  disabledChannels: Record<PaymentChannelId, boolean>;
  channelAlert: string | null;
  onSelectChannel: (channel: PaymentChannelId) => void;
  onToggleSimulateDisabled: (channel: PaymentChannelId) => void;
  onConfirmPay: () => void;
  onClose: () => void;
}

export const CartCashierModal: React.FC<CartCashierModalProps> = ({
  isOpen,
  diningMode,
  totals,
  selectedChannel,
  disabledChannels,
  channelAlert,
  onSelectChannel,
  onToggleSimulateDisabled,
  onConfirmPay,
  onClose
}) => {
  if (!isOpen) return null;

  const modeLabel =
    diningMode === 'delivery' ? '外卖专送' : diningMode === 'dine_in' ? '堂食就餐' : '到车自提';

  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-[430px] bg-white/92 backdrop-blur-xl rounded-t-3xl sm:rounded-2xl border border-black/[0.08] shadow-[0_24px_56px_-16px_rgba(20,20,19,0.28)] overflow-hidden flex flex-col max-h-[88vh]">
        <div className="px-4 py-3 border-b border-black/[0.06] flex items-center justify-between gap-2 bg-white/60">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-700" />
            <h3 className="text-sm font-black text-[#141413]">直通安全收银台</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭收银台"
            className="w-8 h-8 rounded-xl hover:bg-[#f4f4f5] flex items-center justify-center text-neutral-500 cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {/* Amount Summary */}
          <div className="p-3.5 rounded-2xl bg-[#f4f4f5]/80 border border-black/[0.06] flex items-center justify-between gap-2">
            <div>
              <div className="text-[11px] font-bold text-neutral-500">
                应付总额 · {modeLabel}
              </div>
              <div className="font-mono text-2xl font-black text-[#141413] tabular-nums mt-0.5">
                ¥{totals.finalTotal.toFixed(2)}
              </div>
            </div>
            <div className="text-right text-[11px] text-emerald-700 font-bold tabular-nums">
              已叠加减免 ¥{totals.totalDiscount.toFixed(2)}
            </div>
          </div>

          {channelAlert && (
            <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{channelAlert}</span>
            </div>
          )}

          {/* Channel Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-neutral-500">
              <span className="font-bold text-[#141413]">选择支付渠道（实时校验可用性）</span>
              <span>点右侧开关可测试通道降级</span>
            </div>

            <div className="space-y-1.5">
              {PAYMENT_CHANNELS.map((ch) => {
                const isDisabled = Boolean(disabledChannels[ch.id]);
                const active = selectedChannel === ch.id;

                return (
                  <div
                    key={ch.id}
                    className={`rounded-2xl border p-3 flex items-center justify-between gap-2 transition ${
                      active
                        ? 'border-[#141413] bg-emerald-50/35'
                        : 'border-black/[0.07] bg-white/85'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectChannel(ch.id)}
                      className="flex-1 min-w-0 text-left flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-extrabold text-[#141413]">
                            {ch.name}
                          </span>
                          {ch.badge && (
                            <span className="text-[10px] font-bold text-emerald-700">
                              · {ch.badge}
                            </span>
                          )}
                          {isDisabled && (
                            <span className="text-[10px] font-bold text-red-600">
                              · 商家暂未启用
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-neutral-500 truncate">
                          {ch.subtitle}
                        </div>
                      </div>
                      {active && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleSimulateDisabled(ch.id)}
                      title="模拟该渠道关闭/开启"
                      className={`h-7 px-2.5 rounded-lg text-[10px] font-bold border shrink-0 cursor-pointer transition ${
                        isDisabled
                          ? 'bg-red-50 border-red-200 text-red-700'
                          : 'bg-[#f4f4f5] border-black/[0.06] text-neutral-500 hover:text-[#141413]'
                      }`}
                    >
                      {isDisabled ? '已模拟关闭' : '正常'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-black/[0.06] bg-[#fafafa]/75 space-y-2">
          <button
            type="button"
            onClick={onConfirmPay}
            className="w-full h-11 rounded-xl bg-[#141413] hover:bg-neutral-800 text-white text-xs font-extrabold tracking-tight flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-[0.98] tabular-nums"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>确认安全支付 ¥{totals.finalTotal.toFixed(2)}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/* ==================== 6. 支付存证与取餐核对码弹层 ==================== */
export interface CartVoucherModalProps {
  voucher: PaymentVoucher | null;
  onCopyCode: (text: string, label: string) => void;
  onDone: () => void;
}

export const CartVoucherModal: React.FC<CartVoucherModalProps> = ({
  voucher,
  onCopyCode,
  onDone
}) => {
  if (!voucher) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="w-full max-w-[390px] bg-white/92 backdrop-blur-xl rounded-2xl border border-black/[0.08] shadow-[0_24px_56px_-16px_rgba(20,20,19,0.3)] overflow-hidden">
        <div className="obsidian-mesh text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="text-sm font-black">支付成功 · 电子存证已生成</div>
              <div className="text-[11px] text-neutral-400 font-mono tabular-nums">
                {voucher.voucherNo}
              </div>
            </div>
          </div>
          <span className="font-mono text-base font-black text-amber-300 tabular-nums">
            ¥{voucher.paidAmount.toFixed(2)}
          </span>
        </div>

        <div className="p-4 space-y-3 text-xs">
          {/* 取餐核对码核心卡片 */}
          <div className="p-3.5 rounded-2xl bg-[#f4f4f5]/80 border border-black/[0.06] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-white border border-black/[0.07] flex items-center justify-center text-[#141413]">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-neutral-500">取餐 / 核销凭证码</div>
                <div className="font-mono text-xl font-black tracking-widest text-[#141413] tabular-nums">
                  {voucher.offlineRecoveryCode}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onCopyCode(voucher.offlineRecoveryCode, '取餐核对码')}
              className="h-9 px-3 rounded-xl border border-black/[0.08] bg-white/90 hover:bg-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition active:scale-95"
            >
              <Copy className="w-3 h-3" />
              <span>复制</span>
            </button>
          </div>

          {/* 存证字段明细 */}
          <div className="space-y-1.5 text-[11px] border-t border-black/[0.06] pt-2.5">
            <div className="flex justify-between gap-2">
              <span className="text-neutral-500">订单编号</span>
              <span className="font-mono font-bold text-[#141413] tabular-nums">{voucher.orderNo}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-neutral-500">履约方式</span>
              <span className="font-bold text-[#141413]">
                {voucher.diningMode}
                {voucher.tableCode ? ` · ${voucher.tableCode}号桌` : ''}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-neutral-500">支付渠道</span>
              <span className="font-bold text-[#141413]">{voucher.channelName}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-neutral-500">交易流水号</span>
              <span className="font-mono text-neutral-600 tabular-nums">{voucher.transactionId}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-neutral-500">防伪校验摘要</span>
              <span className="font-mono text-neutral-500 truncate max-w-[190px]">{voucher.securityHash}</span>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-black/[0.06] bg-[#fafafa]/75">
          <button
            type="button"
            onClick={onDone}
            className="w-full h-10 rounded-xl bg-[#141413] hover:bg-neutral-800 text-white text-xs font-bold cursor-pointer transition active:scale-95"
          >
            完成并返回
          </button>
        </div>
      </div>
    </div>
  );
};

import type { CartItem, DeliverySettings, DiningMode } from '../types';
import type { UserCouponRecord } from '../types/coupon';
import type { PaymentChannelId } from '../types/payment';

export interface OrderPricingInput {
  items: CartItem[];
  diningMode: DiningMode;
  deliverySettings: DeliverySettings;
  selectedCoupon: UserCouponRecord | null;
  isVIPActive: boolean;
  paymentChannel: PaymentChannelId;
}

export interface OrderPricingTotals {
  totalQuantity: number;
  itemsSubtotal: number;
  rawDeliveryFee: number;
  deliveryFee: number;
  deliveryWaivedReason?: string;
  couponDiscount: number;
  couponDeliveryDiscount: number;
  vipDiscount: number;
  channelDiscount: number;
  channelDiscountLabel: string;
  tieredActivityDiscount: number;
  tieredActivityLabel: string;
  totalDiscount: number;
  /** 剔除优惠后菜品实付（用于外卖起送门槛判定，不含配送费） */
  postDiscountDishAmount: number;
  minOrderThreshold: number;
  minOrderMet: boolean;
  minOrderShortfall: number;
  finalTotal: number;
}

const CHANNEL_DISCOUNT_MAP: Record<PaymentChannelId, { label: string; minSpend: number; cut: number }> = {
  dcep: { label: '数字人民币消费补贴', minSpend: 30, cut: 2.0 },
  wechat: { label: '微信支付立减金', minSpend: 45, cut: 1.5 },
  alipay: { label: '支付宝碰一碰立减', minSpend: 45, cut: 1.5 },
  card: { label: '银联云闪付随机减', minSpend: 60, cut: 3.0 },
  enterprise: { label: '企业签约餐补通道', minSpend: 0, cut: 0 },
  cash: { label: '现金到付', minSpend: 0, cut: 0 }
};

export function roundMoney(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * 统一算价引擎：购物车、直通收银台、支付存证共用同一套计算口径。
 */
export function computeOrderTotals(input: OrderPricingInput): OrderPricingTotals {
  const { items, diningMode, deliverySettings, selectedCoupon, isVIPActive, paymentChannel } = input;

  const totalQuantity = items.reduce((sum, item) => sum + Math.max(0, item.quantity), 0);
  const itemsSubtotal = roundMoney(
    items.reduce((sum, item) => sum + item.calculatedPrice * item.quantity, 0)
  );

  // 1. 基础配送费
  const rawDeliveryFee =
    diningMode === 'delivery'
      ? itemsSubtotal >= deliverySettings.freeDeliveryThreshold
        ? 0
        : deliverySettings.deliveryFee
      : 0;

  let deliveryWaivedReason: string | undefined;
  if (diningMode === 'delivery' && itemsSubtotal >= deliverySettings.freeDeliveryThreshold) {
    deliveryWaivedReason = `满 ¥${deliverySettings.freeDeliveryThreshold} 免配送费`;
  }

  // 2. 优惠券抵扣试算
  let couponDiscount = 0;
  let couponDeliveryDiscount = 0;

  if (selectedCoupon && itemsSubtotal > 0) {
    const c = selectedCoupon.coupon;
    if (itemsSubtotal >= c.minSpend) {
      if (c.couponType === 'no_threshold' || c.couponType === 'amount_cut') {
        couponDiscount = Math.min(itemsSubtotal, c.discountValue);
      } else if (c.couponType === 'discount_percent') {
        const rawCut = itemsSubtotal * (1 - c.discountValue);
        const capped = c.maxDiscountCap ? Math.min(rawCut, c.maxDiscountCap) : rawCut;
        couponDiscount = Math.min(itemsSubtotal, roundMoney(capped));
      } else if (c.couponType === 'delivery_free' && diningMode === 'delivery') {
        couponDeliveryDiscount = Math.min(rawDeliveryFee, c.discountValue);
        if (couponDeliveryDiscount > 0) {
          deliveryWaivedReason = '免运券抵扣';
        }
      }
    }
  }
  couponDiscount = roundMoney(couponDiscount);
  couponDeliveryDiscount = roundMoney(couponDeliveryDiscount);

  // 3. VIP 黑卡权益（若会员生效且满 ¥20，享餐品 95 折，最高减 ¥15）
  let vipDiscount = 0;
  if (isVIPActive && itemsSubtotal >= 20) {
    const afterCoupon = Math.max(0, itemsSubtotal - couponDiscount);
    vipDiscount = roundMoney(Math.min(15, afterCoupon * 0.05));
    if (diningMode === 'delivery' && rawDeliveryFee > couponDeliveryDiscount) {
      // 黑卡免配送费权益
      couponDeliveryDiscount = rawDeliveryFee;
      deliveryWaivedReason = '黑卡会员免配送费';
    }
  }

  const deliveryFee = roundMoney(Math.max(0, rawDeliveryFee - couponDeliveryDiscount));

  // 4. 阶梯满减活动
  let tieredActivityDiscount = 0;
  let tieredActivityLabel = '暂无满足阶梯';
  if (itemsSubtotal >= 150) {
    tieredActivityDiscount = 15;
    tieredActivityLabel = '满 ¥150 减 ¥15';
  } else if (itemsSubtotal >= 88) {
    tieredActivityDiscount = 6;
    tieredActivityLabel = '满 ¥88 减 ¥6';
  }

  // 5. 支付渠道直减
  const channelRule = CHANNEL_DISCOUNT_MAP[paymentChannel] ?? CHANNEL_DISCOUNT_MAP.wechat;
  const channelDiscount =
    itemsSubtotal >= channelRule.minSpend && channelRule.cut > 0 ? channelRule.cut : 0;
  const channelDiscountLabel = channelDiscount > 0 ? channelRule.label : '当前渠道无直减';

  // 菜品级优惠上限不超过菜品原价小计
  const rawDishDiscounts = couponDiscount + vipDiscount + tieredActivityDiscount + channelDiscount;
  const dishDiscountTotal = roundMoney(Math.min(itemsSubtotal, rawDishDiscounts));
  const totalDiscount = roundMoney(dishDiscountTotal + couponDeliveryDiscount);

  // 剔除优惠后菜品实付（不含配送费，用于起送门槛判定）
  const postDiscountDishAmount = roundMoney(Math.max(0, itemsSubtotal - dishDiscountTotal));

  const minOrderThreshold = diningMode === 'delivery' ? deliverySettings.minDeliveryAmount : 0;
  const amountForThreshold =
    deliverySettings.requirePostDiscountAmount || deliverySettings.excludeDiscountsFromMinSpend
      ? postDiscountDishAmount
      : itemsSubtotal;

  const minOrderMet =
    diningMode !== 'delivery' || (itemsSubtotal > 0 && amountForThreshold >= minOrderThreshold);
  const minOrderShortfall =
    diningMode === 'delivery' && !minOrderMet
      ? roundMoney(Math.max(0, minOrderThreshold - amountForThreshold))
      : 0;

  const finalTotal = roundMoney(Math.max(0, postDiscountDishAmount + deliveryFee));

  return {
    totalQuantity,
    itemsSubtotal,
    rawDeliveryFee,
    deliveryFee,
    deliveryWaivedReason,
    couponDiscount,
    couponDeliveryDiscount,
    vipDiscount,
    channelDiscount,
    channelDiscountLabel,
    tieredActivityDiscount,
    tieredActivityLabel,
    totalDiscount,
    postDiscountDishAmount,
    minOrderThreshold,
    minOrderMet,
    minOrderShortfall,
    finalTotal
  };
}

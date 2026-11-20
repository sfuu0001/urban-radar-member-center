import React, { useMemo, useState } from 'react';
import type {
  BoundTableInfo,
  CartItem,
  DeliverySettings,
  DiningMode,
  UserAddress,
  UserProfile
} from '../types';
import type { UserCouponRecord } from '../types/coupon';
import type { PaymentChannelId, PaymentVoucher } from '../types/payment';
import { INITIAL_MERCHANT_COUPONS } from '../data/mockCoupons';
import {
  CURRENT_TRUCK_SUMMARY,
  DEFAULT_DELIVERY_SETTINGS,
  INITIAL_CART_ITEMS
} from '../data/mockCart';
import { getUserCouponRecords, saveUserCouponRecords } from '../utils/couponEngine';
import { computeOrderTotals } from '../utils/orderPricingEngine';
import { safeGetStorage, safeSetStorage } from '../utils/safeStorage';
import { useToast } from './ui/ToastContext';
import { CartHeaderSection } from './cart/CartHeaderSection';
import { CartDeliveryCard } from './cart/CartDeliveryCard';
import { CartItemListSection } from './cart/CartItemListSection';
import { CartServiceCard, type PackagingOption } from './cart/CartServiceCard';
import { CartMinOrderBanner } from './cart/CartMinOrderBanner';
import { CartBottomCheckoutBar } from './cart/CartBottomCheckoutBar';
import {
  CartAddressModal,
  CartCouponModal,
  CartRemarkModal,
  ClearCartConfirmModal
} from './cart/CartCouponAndRemarkModals';
import { CartTableSelectorModal } from './cart/CartTableSelectorModal';
import {
  CartCashierModal,
  CartVoucherModal,
  PAYMENT_CHANNELS
} from './cart/CartCashierModal';

const CART_ITEMS_KEY = 'obsidian_cart_items_v1';
const CART_MODE_KEY = 'obsidian_cart_dining_mode_v1';
const CART_TABLE_KEY = 'obsidian_current_bound_table_info_v1';

export interface CartPageViewProps {
  userProfile: UserProfile;
  onBackToMenu: () => void;
  onOpenAddressManager?: () => void;
  headerStickyClass?: string;
}

/**
 * 餐车选购清单（购物车独立控制台页面）
 * - 画布内自持 --ipc-* 工业微圆角白底令牌，不污染全局 index.css
 */
export const CartPageView: React.FC<CartPageViewProps> = ({
  userProfile,
  onBackToMenu,
  onOpenAddressManager,
  headerStickyClass = 'sticky top-0 z-30'
}) => {
  const toast = useToast();

  const isVIPActive = userProfile.isVIPActive ?? true;

  // 1. 购物车清单与履约状态
  const [cartItems, setCartItems] = useState<CartItem[]>(() =>
    safeGetStorage<CartItem[]>(CART_ITEMS_KEY, INITIAL_CART_ITEMS)
  );
  const [diningMode, setDiningMode] = useState<DiningMode>(() =>
    safeGetStorage<DiningMode>(CART_MODE_KEY, 'delivery')
  );
  const [displayMode, setDisplayMode] = useState<'rich' | 'text'>('rich');
  const [packaging, setPackaging] = useState<PackagingOption>('eco_cane');
  const [orderRemark, setOrderRemark] = useState<string>('');
  const [breakdownExpanded, setBreakdownExpanded] = useState<boolean>(false);

  // 2. 商家配送配置（支持外部事件推送实时更新）
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings>(() =>
    safeGetStorage<DeliverySettings>('obsidian_delivery_settings', DEFAULT_DELIVERY_SETTINGS)
  );

  React.useEffect(() => {
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent<DeliverySettings>).detail;
      if (detail) setDeliverySettings(detail);
    };
    window.addEventListener('obsidian:delivery-settings-updated', handler);
    return () => window.removeEventListener('obsidian:delivery-settings-updated', handler);
  }, []);

  // 3. 地址与堂食桌台
  const addresses: UserAddress[] = userProfile.addresses || [];
  const defaultAddress = addresses.find((a) => a.isDefault) || addresses[0] || null;
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    defaultAddress?.id || null
  );
  const selectedAddress =
    addresses.find((a) => a.id === selectedAddressId) || defaultAddress;

  const [boundTable, setBoundTable] = useState<BoundTableInfo | null>(() =>
    safeGetStorage<BoundTableInfo | null>(CART_TABLE_KEY, null)
  );
  const [dinerCount, setDinerCount] = useState<number>(boundTable?.guests || 2);

  // 4. 优惠券（VIP 默认优先选中 UR-VIP5）
  const [userCoupons, setUserCoupons] = useState<UserCouponRecord[]>(() =>
    getUserCouponRecords()
  );
  const availableCoupons = useMemo(
    () => userCoupons.filter((c) => c.status === 'available'),
    [userCoupons]
  );
  const [selectedCouponId, setSelectedCouponId] = useState<string | null>(() => {
    if (!isVIPActive) return null;
    const records = getUserCouponRecords().filter((c) => c.status === 'available');
    const vip5 = records.find((c) => c.coupon.code.toUpperCase() === 'UR-VIP5');
    return vip5?.userCouponId || records[0]?.userCouponId || null;
  });

  const selectedCoupon = useMemo(
    () => availableCoupons.find((c) => c.userCouponId === selectedCouponId) || null,
    [availableCoupons, selectedCouponId]
  );

  // 5. 支付渠道状态与弹层开关
  const [paymentChannel, setPaymentChannel] = useState<PaymentChannelId>('wechat');
  const [disabledChannels, setDisabledChannels] = useState<Record<PaymentChannelId, boolean>>({
    wechat: false,
    alipay: false,
    card: false,
    dcep: false,
    enterprise: false,
    cash: false
  });
  const [channelAlert, setChannelAlert] = useState<string | null>(null);

  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [remarkModalOpen, setRemarkModalOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [cashierModalOpen, setCashierModalOpen] = useState(false);
  const [generatedVoucher, setGeneratedVoucher] = useState<PaymentVoucher | null>(null);

  const persistCart = (next: CartItem[]) => {
    setCartItems(next);
    safeSetStorage(CART_ITEMS_KEY, next);
  };

  // 6. 统一算价
  const totals = useMemo(
    () =>
      computeOrderTotals({
        items: cartItems,
        diningMode,
        deliverySettings,
        selectedCoupon,
        isVIPActive,
        paymentChannel
      }),
    [cartItems, diningMode, deliverySettings, selectedCoupon, isVIPActive, paymentChannel]
  );

  // 交互处理器
  const handleChangeDiningMode = (nextMode: DiningMode) => {
    setDiningMode(nextMode);
    safeSetStorage(CART_MODE_KEY, nextMode);
    const label =
      nextMode === 'delivery' ? '外卖专送' : nextMode === 'dine_in' ? '堂食就餐' : '到车自提';
    toast.info(`已切换为「${label}」`, '起送门槛与配送费用已同步重算');
  };

  const handleUpdateQuantity = (cartItemId: string, delta: number) => {
    const next = cartItems
      .map((item) =>
        item.cartItemId === cartItemId
          ? { ...item, quantity: Math.max(0, item.quantity + delta) }
          : item
      )
      .filter((item) => item.quantity > 0);
    persistCart(next);
  };

  const handleRemoveItem = (cartItemId: string) => {
    const target = cartItems.find((i) => i.cartItemId === cartItemId);
    const next = cartItems.filter((i) => i.cartItemId !== cartItemId);
    persistCart(next);
    if (target) {
      toast.info(`已移除「${target.dish.name}」`);
    }
  };

  const handleClearCart = () => {
    persistCart([]);
    toast.success('已清空选购清单');
  };

  const handleCopyList = () => {
    const modeName =
      diningMode === 'delivery' ? '外卖专送' : diningMode === 'dine_in' ? '堂食就餐' : '到车自提';
    const lines = [
      `【${CURRENT_TRUCK_SUMMARY.name} · ${modeName}】`,
      ...cartItems.map(
        (i) =>
          `• ${i.dish.name} x${i.quantity}  ¥${(i.calculatedPrice * i.quantity).toFixed(2)}`
      ),
      `----------------`,
      `优惠合计：-¥${totals.totalDiscount.toFixed(2)}`,
      `实付总额：¥${totals.finalTotal.toFixed(2)}`
    ];
    void navigator.clipboard?.writeText(lines.join('\n')).catch(() => {});
    toast.success('选购清单已复制', '可直接粘贴发送给同桌好友或拼单群');
  };

  const handleRedeemCouponCode = (code: string) => {
    const already = userCoupons.find(
      (uc) => uc.coupon.code.toUpperCase() === code && uc.status === 'available'
    );
    if (already) {
      setSelectedCouponId(already.userCouponId);
      toast.info('已选中该优惠券', `「${already.coupon.title}」已自动应用`);
      return;
    }
    const merchantMatch = INITIAL_MERCHANT_COUPONS.find(
      (mc) => mc.code.toUpperCase() === code
    );
    const couponEntity = merchantMatch || {
      id: `cpn-cart-${Date.now()}`,
      code,
      title: `口令立减礼券 (${code})`,
      subtitle: '黑曜石餐车全品类立减可用',
      couponType: 'amount_cut' as const,
      discountValue: 8,
      minSpend: 40,
      scopeType: 'all_dishes' as const,
      timeSlotType: 'all_day' as const,
      timeSlotLabel: '全天通用',
      dayRestriction: 'all_week' as const,
      dayRestrictionLabel: '全周通用',
      designStyle: 'black_gold' as const,
      badgeText: '口令券',
      totalQuantity: 100,
      issuedCount: 1,
      usedCount: 0,
      status: 'active' as const,
      expireDate: '2026-09-30',
      createdAt: new Date().toISOString().slice(0, 10)
    };
    const newRecord: UserCouponRecord = {
      userCouponId: `uc-cart-${Date.now()}`,
      couponId: couponEntity.id,
      coupon: couponEntity,
      status: 'available',
      acquiredAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
    };
    const updated = [newRecord, ...userCoupons];
    setUserCoupons(updated);
    saveUserCouponRecords(updated);
    setSelectedCouponId(newRecord.userCouponId);
    toast.success('兑换并已选用', `「${couponEntity.title}」已应用至本单`);
  };

  const handleChangePackaging = (pkg: PackagingOption) => {
    setPackaging(pkg);
    toast.success(
      pkg === 'eco_cane' ? '已选择环保甘蔗降解包装' : '已选择标准保温装',
      pkg === 'eco_cane' ? '预计减碳 25g' : '长效锁温 30 分钟'
    );
  };

  // 4 道前置结算门禁校验
  const validateBeforeCheckout = (): boolean => {
    // 门 1：空清单拦截
    if (cartItems.length === 0) {
      toast.warning('选购单暂无餐品', '正在为您返回挑选美味');
      onBackToMenu();
      return false;
    }

    // 门 2：堂食未绑桌硬拦截
    if (diningMode === 'dine_in' && !boundTable) {
      toast.warning('请先绑定堂食桌台', '堂食必须先选择桌台或扫码绑桌才可结算');
      setTableModalOpen(true);
      return false;
    }

    // 门 3：外卖未达起送线拦截（按剔除优惠后菜品实付判定）
    if (diningMode === 'delivery' && !totals.minOrderMet) {
      toast.warning(
        `未达到外卖起送标准 · 还差 ¥${totals.minOrderShortfall.toFixed(2)}`,
        '请补充选购餐品或切换为「自提 / 堂食」'
      );
      return false;
    }

    // 门 4：支付渠道可用性校验 + 自动降级兜底
    if (disabledChannels[paymentChannel]) {
      const fallbackOrder: PaymentChannelId[] = ['wechat', 'alipay', 'dcep', 'card', 'cash'];
      const fallback =
        fallbackOrder.find((id) => !disabledChannels[id]) || 'cash';
      const fallbackLabel =
        PAYMENT_CHANNELS.find((c) => c.id === fallback)?.name || '现金到付';
      const currentLabel =
        PAYMENT_CHANNELS.find((c) => c.id === paymentChannel)?.name || paymentChannel;

      setPaymentChannel(fallback);
      const alertText = `「${currentLabel}」当前暂不可用，已自动为您切换至推荐兜底渠道：${fallbackLabel}`;
      setChannelAlert(alertText);
      toast.warning('支付渠道已自动切换', alertText);
      return true;
    }

    setChannelAlert(null);
    return true;
  };

  const handleOpenCheckoutOrCashier = () => {
    if (!validateBeforeCheckout()) return;
    setCashierModalOpen(true);
  };

  const handleSelectChannel = (ch: PaymentChannelId) => {
    if (disabledChannels[ch]) {
      const fallbackOrder: PaymentChannelId[] = ['wechat', 'alipay', 'dcep', 'card', 'cash'];
      const fallback = fallbackOrder.find((id) => !disabledChannels[id]) || 'cash';
      const chName = PAYMENT_CHANNELS.find((c) => c.id === ch)?.name || ch;
      const fbName = PAYMENT_CHANNELS.find((c) => c.id === fallback)?.name || fallback;
      setPaymentChannel(fallback);
      const msg = `「${chName}」商户通道暂未开启，已自动切换兜底渠道：${fbName}`;
      setChannelAlert(msg);
      toast.warning('通道校验未通过', msg);
      return;
    }
    setChannelAlert(null);
    setPaymentChannel(ch);
  };

  const handleToggleSimulateDisabled = (ch: PaymentChannelId) => {
    setDisabledChannels((prev) => {
      const nextState = !prev[ch];
      const updated = { ...prev, [ch]: nextState };
      if (nextState && paymentChannel === ch) {
        const fallbackOrder: PaymentChannelId[] = ['wechat', 'alipay', 'dcep', 'card', 'cash'];
        const fallback = fallbackOrder.find((id) => !updated[id]) || 'cash';
        const chName = PAYMENT_CHANNELS.find((c) => c.id === ch)?.name || ch;
        const fbName = PAYMENT_CHANNELS.find((c) => c.id === fallback)?.name || fallback;
        setPaymentChannel(fallback);
        setChannelAlert(`「${chName}」已关闭，已自动切换至兜底渠道：${fbName}`);
      } else if (!nextState) {
        setChannelAlert(null);
      }
      return updated;
    });
  };

  const handleConfirmPay = () => {
    if (!validateBeforeCheckout()) return;
    const chInfo = PAYMENT_CHANNELS.find((c) => c.id === paymentChannel);
    const now = new Date();
    const random4 = String(Math.floor(1000 + Math.random() * 9000));
    const voucher: PaymentVoucher = {
      voucherNo: `VOU-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${random4}`,
      orderNo: `UR-${diningMode === 'dine_in' ? 'DIN-' : ''}${random4}`,
      transactionId: `TXN${Date.now().toString().slice(-10)}${random4}`,
      channelId: paymentChannel,
      channelName: chInfo?.name || '微信免密支付',
      mchId: '1688920199',
      paidAmount: totals.finalTotal,
      originalAmount: totals.itemsSubtotal + totals.rawDeliveryFee,
      discountAmount: totals.totalDiscount,
      paidAt: now.toISOString(),
      paidTimeFormatted: now.toISOString().slice(0, 19).replace('T', ' '),
      idempotencyKey: `IDEM-${Date.now()}`,
      securityHash: `SM3:${Math.random().toString(16).slice(2, 10).toUpperCase()}${Math.random()
        .toString(16)
        .slice(2, 10)
        .toUpperCase()}`,
      escrowStatus: 'verified_synced',
      offlineRecoveryCode: random4,
      diningMode:
        diningMode === 'delivery' ? '外卖专送' : diningMode === 'dine_in' ? '堂食就餐' : '到车自提',
      customerPhone: userProfile.phone,
      tableCode: diningMode === 'dine_in' ? boundTable?.code : undefined
    };

    setCashierModalOpen(false);
    setGeneratedVoucher(voucher);
    toast.success('支付成功', `取餐核对码 ${random4} 与电子凭证已生成`);
  };

  // 画布内自持 --ipc-* 令牌，对齐全站毛玻璃与圆角体系（不污染全局 index.css）
  const ipcCanvasTokens = {
    '--ipc-bg': '#ffffff',
    '--ipc-surface': 'rgba(255, 255, 255, 0.82)',
    '--ipc-surface-muted': 'rgba(244, 244, 245, 0.85)',
    '--ipc-border': 'rgba(20, 20, 19, 0.07)',
    '--ipc-ink': '#141413',
    '--ipc-ink-muted': '#71717a',
    '--ipc-accent': '#059669',
    '--ipc-radius': '16px'
  } as React.CSSProperties;

  return (
    <div
      style={ipcCanvasTokens}
      className="w-full min-h-screen bg-white bg-[radial-gradient(90%_55%_at_100%_0%,rgba(16,185,129,0.055)_0%,transparent_60%),radial-gradient(80%_50%_at_0%_100%,rgba(244,244,245,0.9)_0%,transparent_65%)] text-[var(--ipc-ink)] flex flex-col font-sans select-none"
    >
      {/* 1. 顶部清单头 + 履约模式三选一 */}
      <CartHeaderSection
        itemCount={totals.totalQuantity}
        diningMode={diningMode}
        onChangeDiningMode={handleChangeDiningMode}
        onBack={onBackToMenu}
        onCopyList={handleCopyList}
        onRequestClear={() => setClearConfirmOpen(true)}
        stickyClassName={headerStickyClass}
      />

      {/* 主内容流 */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-3.5 pt-2.5 pb-4 space-y-3">
        {/* 2. 配送路径 / 自提 / 堂食餐位详情 */}
        <CartDeliveryCard
          diningMode={diningMode}
          selectedAddress={selectedAddress}
          boundTable={boundTable}
          dinerCount={dinerCount}
          isVIPActive={isVIPActive}
          onChangeAddress={() => setAddressModalOpen(true)}
          onOpenTableSelector={() => setTableModalOpen(true)}
        />

        {/* 3. 已点餐品明细（图文/纯文字 + 同桌分组 + 步进器） */}
        <CartItemListSection
          items={cartItems}
          diningMode={diningMode}
          displayMode={displayMode}
          onChangeDisplayMode={setDisplayMode}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onBackToMenu={onBackToMenu}
        />

        {/* 4. 服务偏好与费用明细（统一收纳折叠卡片） */}
        <CartServiceCard
          selectedCoupon={selectedCoupon}
          couponDiscount={totals.couponDiscount}
          packaging={packaging}
          orderRemark={orderRemark}
          diningMode={diningMode}
          totals={totals}
          breakdownExpanded={breakdownExpanded}
          onToggleBreakdown={() => setBreakdownExpanded((p) => !p)}
          onOpenCouponModal={() => setCouponModalOpen(true)}
          onChangePackaging={handleChangePackaging}
          onOpenRemarkModal={() => setRemarkModalOpen(true)}
        />

        {/* 5. 起送门槛差额提示（仅外卖未达标时出现） */}
        <CartMinOrderBanner
          diningMode={diningMode}
          minOrderThreshold={totals.minOrderThreshold}
          postDiscountDishAmount={totals.postDiscountDishAmount}
          minOrderMet={totals.minOrderMet}
          minOrderShortfall={totals.minOrderShortfall}
          onBackToMenu={onBackToMenu}
        />
      </main>

      {/* 底部固定结算条 */}
      <CartBottomCheckoutBar
        finalTotal={totals.finalTotal}
        totalDiscount={totals.totalDiscount}
        disabled={false}
        onOpenDirectCashier={handleOpenCheckoutOrCashier}
        onProceedCheckout={handleOpenCheckoutOrCashier}
      />

      {/* 弹层 1：选择或兑换优惠券 */}
      <CartCouponModal
        isOpen={couponModalOpen}
        availableCoupons={availableCoupons}
        selectedCouponId={selectedCouponId}
        itemsSubtotal={totals.itemsSubtotal}
        onSelectCoupon={(rec) => {
          setSelectedCouponId(rec?.userCouponId || null);
          if (rec) {
            toast.success(`已选用「${rec.coupon.title}」`);
          } else {
            toast.info('已取消使用优惠券');
          }
        }}
        onRedeemCode={handleRedeemCouponCode}
        onClose={() => setCouponModalOpen(false)}
      />

      {/* 弹层 2：制作与口味备注（整单级） */}
      <CartRemarkModal
        isOpen={remarkModalOpen}
        initialRemark={orderRemark}
        onSave={(val) => {
          setOrderRemark(val);
          toast.success(val ? '整单备注已保存' : '已清除整单备注');
        }}
        onClose={() => setRemarkModalOpen(false)}
      />

      {/* 弹层 3：确认清空清单 */}
      <ClearCartConfirmModal
        isOpen={clearConfirmOpen}
        onConfirm={handleClearCart}
        onClose={() => setClearConfirmOpen(false)}
      />

      {/* 弹层 4：收货地址快选 */}
      <CartAddressModal
        isOpen={addressModalOpen}
        addresses={addresses}
        selectedAddressId={selectedAddress?.id || null}
        onSelectAddress={(addr) => {
          setSelectedAddressId(addr.id);
          toast.success('收货地址已更新', `${addr.address} ${addr.detail}`);
        }}
        onManageAddresses={() => {
          if (onOpenAddressManager) {
            onOpenAddressManager();
          } else {
            toast.info('请在顶部下拉切换至「资料设置 → 常用地址」管理地址簿');
          }
        }}
        onClose={() => setAddressModalOpen(false)}
      />

      {/* 弹层 5：堂食选桌 */}
      <CartTableSelectorModal
        isOpen={tableModalOpen}
        currentTable={boundTable}
        dinerCount={dinerCount}
        onSelectTable={(table, guests) => {
          setBoundTable(table);
          setDinerCount(guests);
          safeSetStorage(CART_TABLE_KEY, table);
          toast.success(`已绑定 ${table.code} 号桌`, `${table.zoneLabel} · ${guests} 位就餐`);
        }}
        onClose={() => setTableModalOpen(false)}
      />

      {/* 弹层 6：直通安全收银台 */}
      <CartCashierModal
        isOpen={cashierModalOpen}
        diningMode={diningMode}
        totals={totals}
        selectedChannel={paymentChannel}
        disabledChannels={disabledChannels}
        channelAlert={channelAlert}
        onSelectChannel={handleSelectChannel}
        onToggleSimulateDisabled={handleToggleSimulateDisabled}
        onConfirmPay={handleConfirmPay}
        onClose={() => setCashierModalOpen(false)}
      />

      {/* 弹层 7：支付存证与取餐核对码 */}
      <CartVoucherModal
        voucher={generatedVoucher}
        onCopyCode={(text, label) => {
          void navigator.clipboard?.writeText(text).catch(() => {});
          toast.success(`${label}已复制`, text);
        }}
        onDone={() => {
          setGeneratedVoucher(null);
        }}
      />
    </div>
  );
};

export type CouponType = 'amount_cut' | 'no_threshold' | 'discount_percent' | 'delivery_free';
export type CouponScopeType = 'all_dishes' | 'category' | 'specific_dishes';
export type CouponTruckScopeType = 'all_trucks' | 'specific_trucks';
export type CouponDayRestriction = 'all_week' | 'workdays_only' | 'weekends_only';
export type CouponDesignStyle = 'black_gold' | 'emerald_fresh' | 'ember_orange' | 'minimal_silver' | 'custom_image' | 'custom_html';
export type CouponDispatchChannel = 'all_members' | 'new_customers' | 'vip_black' | 'dormant_customers' | 'order_share' | 'wheel_reward' | 'scan_qr';

export interface CouponItem {
  id: string;
  code: string; // e.g. "UR-VIP5", "UR-LUNCH10", "UR-BBQ15"
  title: string; // e.g. "VIP 专属无门槛立减券"
  subtitle?: string; // e.g. "黑曜石流动餐车全品类通用"
  couponType: CouponType;
  discountValue: number; // 减免金额 (如 5, 10, 20) 或 折扣 (如 0.88 表示8.8折)
  minSpend: number; // 最低消费门槛，0为无门槛
  maxDiscountCap?: number; // 折扣券封顶金额 (如 15)

  // 多餐车隔离与车队通用设置
  truckScopeType?: CouponTruckScopeType; // 'all_trucks' (全部餐车通用) | 'specific_trucks' (多餐车隔离/限定适用)
  applicableTruckIds?: string[]; // 适用餐车 ID 列表，如 ['truck-01', 'truck-02']
  applicableTruckNames?: string[]; // 适用餐车名称列表
  truckIsolationStrict?: boolean; // 严格餐车隔离：非指定餐车核销即时风控阻断
  antiBrushEnabled?: boolean; // 是否开启营销防刷与套券风控
  maxUniversalBurnLimit?: number; // 通用券单车每日核销限额（元）

  // 适用范围与分类
  scopeType: CouponScopeType;
  scopeCategories?: ('mains' | 'drinks' | 'desserts' | 'snacks')[];
  scopeCategoryNames?: string[]; // e.g. ["炙烤主餐", "精酿饮品"]
  scopeDishIds?: string[]; // 适用单品 ID 列表

  // 适用时段限制
  timeSlotType: 'all_day' | 'lunch_only' | 'dinner_night' | 'custom';
  customTimeStart?: string; // e.g. "11:00"
  customTimeEnd?: string; // e.g. "14:00"
  timeSlotLabel?: string; // e.g. "午市专享 11:00-14:00"

  // 适用工作日/周末限制
  dayRestriction: CouponDayRestriction;
  dayRestrictionLabel?: string; // e.g. "仅限工作日 (周一至周五)"

  // 营销发放渠道与精准定向
  dispatchChannel?: CouponDispatchChannel;
  dispatchChannelLabel?: string;
  autoDispatchOnRegister?: boolean; // 新人注册自动发券
  autoDispatchOnOrderDone?: boolean; // 订单满额后自动发券 (裂变券)
  shareBonusCut?: number; // 裂变分享双方各得优惠券面额
  perUserLimit?: number; // 每人限领张数 (如 1, 2, 5)

  // 自定义设计与封面样式
  designStyle: CouponDesignStyle;
  bgImageUrl?: string; // 自定义背景图
  badgeText?: string; // 角标 e.g. "热门", "VIP", "限时"
  themeColor?: string; // 主题色
  customHtmlCode?: string; // 自定义卡券设计源码 (HTML/SVG/Tailwind)

  // 发放与核销数据
  totalQuantity: number; // 0 表示不限量
  issuedCount: number; // 已领取量
  usedCount: number; // 已使用量
  status: 'active' | 'paused' | 'ended'; // 状态

  // 优惠同享与互斥设置
  allowStackWithActivity?: boolean; // 是否允许与满减活动同享 (默认 true)
  allowStackWithVIP?: boolean; // 是否允许与VIP会员折扣同享 (默认 true)
  isExclusive?: boolean; // 是否独享特惠 (不可叠加任何其他优惠)
  dispatchMessage?: string; // 营销赠言 (如 "感谢支持，赠您一张炙烤特惠券！")

  // 有效期
  validDays?: number; // 领取后天数
  expireDate: string; // 截止日期 e.g. "2026-09-30"
  createdAt: string;

  // 2026-11-19 新增：食客端自助领取与首屏触达（默认关闭，避免旧券突然全部可领）
  claimable?: boolean; // 允许顾客在「可领取」中自助领取
  showOnFirstVisit?: boolean; // 首访弹窗展示（新人礼包）
}

/**
 * 用户持券状态（2026-11-19 新增 revoked：商家作废，券仍在券包但不可用）
 */
export type UserCouponStatus = 'available' | 'used' | 'expired' | 'revoked';

/**
 * 用户持券记录 —— 单一规范化形态。
 *
 * 2026-11-08 统一：本接口曾同时支持两种形态——
 *   A. 规范化：userCouponId + 内嵌 coupon 实体（唯一保留的形态）
 *   B. 扁平快照：id + code + title + discountValue + expireAt…（已废弃）
 * 形态 B 的 19 个字段中只有 couponId / code / status 被真正读取，其余 16 个全库零读取点，
 * 却导致结算页资格判定（record.coupon.xxx）与核销（r.coupon.code）在 B 记录上崩溃。
 * 现已收窄为形态 A；浏览器里的历史 B 数据由 couponEngine.getUserCouponRecords() 的迁移函数兜底。
 */
export interface UserCouponRecord {
  userCouponId: string; // 记录唯一键
  couponId: string; // 券模板 id
  coupon: CouponItem; // 券实体快照（完整，用于资格判定与渲染）
  status: UserCouponStatus;
  acquiredAt: string; // 领取时间

  /**
   * 持券人维度（2026-11-19 新增）
   * 此前记录没有归属人 → 商家只知道「发了 N 张」不知发给谁，无法做个人级作废/删除。
   * 老记录缺这些字段时归入「未标注持券人」，不做强制迁移。
   */
  memberId?: string;
  memberName?: string;
  memberPhone?: string;
  /** 来源：自助领取 / 商家派发 / 自动发放 / 历史迁移 */
  source?: 'claim' | 'dispatch' | 'auto_new_user' | 'auto_order' | 'migrated';

  usedAt?: string;
  usedOrderNo?: string;

  // 作废留痕（status === 'revoked' 时有效）
  revokedAt?: string;
  revokedBy?: string; // 操作人姓名 / 工号
  revokeReason?: string;
}

/**
 * 核销流水（2026-11-19 新增）
 *
 * 此前 markCouponUsed 只把券置 used + 商家 usedCount+1，没有流水表，
 * 导致「今天核销了哪些 / 谁核销的 / 哪个订单 / 哪辆车」全都查不到。
 *
 * 存储：obsidian_coupon_redemption_logs（按 at 倒序，保留最近 2000 条，
 * 超出滚动聚合进 obsidian_coupon_redemption_archive）
 */
export interface CouponRedemptionLog {
  id: string; // rlog-<ts>-<rand>，订阅方按此去重（BC 与 WS 双通道会重复投递）
  userCouponId: string;
  couponId: string;
  couponCode: string;
  couponTitle: string;
  couponType: CouponType;
  discountAmount: number; // 实际抵扣金额（不是券面额）
  memberId?: string;
  memberName?: string;
  memberPhone?: string;
  orderNo: string;
  orderAmount?: number;
  truckId?: string;
  operator?: string; // 核销操作人（手动核销时）
  at: number; // 毫秒时间戳 —— 排序与断线补差的唯一基准
  source: 'checkout' | 'manual' | 'system';
}

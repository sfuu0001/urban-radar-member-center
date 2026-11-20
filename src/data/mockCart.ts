import type { CartItem, DeliverySettings, DishItem, TableItem } from '../types';

export const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  minDeliveryAmount: 48,
  requirePostDiscountAmount: true,
  freeDeliveryThreshold: 98,
  deliveryFee: 6,
  excludeDiscountsFromMinSpend: true,
  minimumNoticeText: '实付满 ¥48 起送，满 ¥98 免配送费'
};

export const CURRENT_TRUCK_SUMMARY = {
  id: 'truck-01',
  name: '01 号·黑曜石翡翠餐车',
  location: '静安大悦城北座 1F 中庭',
  distanceMeters: 420,
  etaMinutes: 18,
  pickupWindow: '约 8-10 分钟现场出餐'
};

export const CART_REMARK_PRESETS = [
  '免葱姜蒜',
  '多放黑松露酱',
  '现烤焦香',
  '保温密封',
  '咖啡去冰免糖',
  '餐具按人数配齐'
] as const;

export const MOCK_DINING_TABLES: TableItem[] = [
  {
    id: 'tbl-a1',
    truckId: 'truck-01',
    code: 'A1',
    name: '餐车外摆 01 号桌',
    zone: 'patio',
    zoneLabel: '外摆休闲区',
    capacity: 4,
    currentGuests: 2,
    status: 'idle',
    qrCode: 'A1-8F3K',
    serverName: '值班主理人·陈默'
  },
  {
    id: 'tbl-a2',
    truckId: 'truck-01',
    code: 'A2',
    name: '餐车外摆 02 号桌',
    zone: 'patio',
    zoneLabel: '外摆休闲区',
    capacity: 4,
    currentGuests: 4,
    status: 'dining',
    elapsedMinutes: 22,
    qrCode: 'A2-4M9P',
    serverName: '值班主理人·陈默'
  },
  {
    id: 'tbl-b1',
    truckId: 'truck-01',
    code: 'B1',
    name: '吧台明档 01 位',
    zone: 'hall',
    zoneLabel: '明档吧台区',
    capacity: 2,
    status: 'idle',
    qrCode: 'B1-2C7X',
    serverName: '吧台咖啡师·Kira'
  },
  {
    id: 'tbl-b2',
    truckId: 'truck-01',
    code: 'B2',
    name: '吧台明档 02 位',
    zone: 'hall',
    zoneLabel: '明档吧台区',
    capacity: 2,
    status: 'idle',
    qrCode: 'B2-9Q1L',
    serverName: '吧台咖啡师·Kira'
  },
  {
    id: 'tbl-c1',
    truckId: 'truck-01',
    code: 'C1',
    name: '遮阳卡座 01 席',
    zone: 'booth',
    zoneLabel: '卡座包厢区',
    capacity: 6,
    status: 'idle',
    qrCode: 'C1-5W6N',
    serverName: '值班主理人·陈默'
  },
  {
    id: 'tbl-w01',
    truckId: 'truck-01',
    code: 'W01',
    name: '等位候补 01 号',
    zone: 'patio',
    zoneLabel: '等位候补区',
    capacity: 4,
    status: 'reserved',
    qrCode: 'W01-WAIT',
    serverName: '前厅接待'
  }
];

export const MOCK_MENU_DISHES: DishItem[] = [
  {
    id: 'dish-wagyu-burger',
    name: '澳洲 M5 和牛炭烤厚牛堡',
    enName: 'M5 Wagyu Charcoal Burger',
    description: '现打 M5 和牛肉饼配布里欧修黄油面包与黑松露蛋黄酱',
    price: 42,
    originalPrice: 48,
    category: 'western',
    orderType: 'both',
    typeTag: '招牌',
    prepTime: '约8m',
    imageUrl: '',
    available: true
  },
  {
    id: 'dish-wagyu-skewer',
    name: '果木炭烤安格斯雪花牛肉串',
    enName: 'Charcoal Angus Beef Skewer',
    description: '220°C 果木炭明档直烤，佐喜马拉雅玫瑰海盐（3 串/份）',
    price: 26,
    category: 'skewers',
    orderType: 'both',
    typeTag: '热销',
    prepTime: '约6m',
    imageUrl: '',
    available: true
  },
  {
    id: 'dish-coldbrew',
    name: '埃塞俄比亚耶加雪菲冷萃美式',
    enName: 'Yirgacheffe Cold Brew',
    description: '14 小时低温慢萃，柑橘茉莉花香尾韵',
    price: 22,
    category: 'drinks',
    orderType: 'both',
    typeTag: '饮品',
    prepTime: '约2m',
    imageUrl: '',
    available: true
  },
  {
    id: 'dish-truffle-fries',
    name: '黑松露帕玛森粗切薯条',
    enName: 'Truffle Parmesan Fries',
    description: '现炸比利时粗薯拌白松露油与陈年帕玛森干酪碎',
    price: 18,
    category: 'snacks',
    orderType: 'both',
    typeTag: '凑单',
    prepTime: '约4m',
    imageUrl: '',
    available: true
  },
  {
    id: 'dish-yakitori-thigh',
    name: '备长炭京葱鸡腿肉串',
    enName: 'Negima Yakitori',
    description: '三黄鸡琵琶腿配甜嫩大葱段，十年老卤照烧刷汁',
    price: 16,
    category: 'yakitori',
    orderType: 'both',
    typeTag: '烧鸟',
    prepTime: '约5m',
    imageUrl: '',
    available: true
  },
  {
    id: 'dish-matcha-basque',
    name: '宇治抹茶流心巴斯克蛋糕',
    enName: 'Uji Matcha Basque Cake',
    description: '高温炙烤焦糖表皮，中心微流心半熟乳酪口感',
    price: 24,
    category: 'desserts',
    orderType: 'both',
    typeTag: '甜品',
    prepTime: '即取',
    imageUrl: '',
    available: true
  },
  {
    id: 'dish-onsen-rice',
    name: '黑椒雪花牛温泉蛋拌饭',
    enName: 'Wagyu Onsen Egg Don',
    description: '越光米底铺炙烤牛肉片，戳破 63°C 温泉蛋拌匀即食',
    price: 34,
    category: 'mains',
    orderType: 'both',
    typeTag: '主食',
    prepTime: '约7m',
    imageUrl: '',
    available: true
  },
  {
    id: 'dish-yuzu-soda',
    name: '京都青柚气泡冷泡茶',
    enName: 'Kyoto Yuzu Sparkling Tea',
    description: '鲜榨日本青柚原汁配冷泡白茶与绵密气泡',
    price: 15,
    category: 'drinks',
    orderType: 'both',
    typeTag: '解腻',
    prepTime: '约2m',
    imageUrl: '',
    available: true
  },
  {
    id: 'dish-garlic-shrimp',
    name: '铁板蒜蓉黄油黑虎虾串',
    enName: 'Garlic Butter Tiger Prawn',
    description: '开背大黑虎虾配焦香蒜蓉黄油淋汁（2 只/份）',
    price: 29,
    category: 'skewers',
    orderType: 'both',
    typeTag: '海鲜',
    prepTime: '约6m',
    imageUrl: '',
    available: true
  }
];

export const INITIAL_CART_ITEMS: CartItem[] = [
  {
    cartItemId: 'ci-1',
    dish: MOCK_MENU_DISHES[0],
    quantity: 1,
    selectedOptions: {
      规格: '标准份量',
      加料: '流心温泉蛋（标配）',
      熟度: '七分熟多汁'
    },
    calculatedPrice: 42,
    truckId: 'truck-01',
    truckName: CURRENT_TRUCK_SUMMARY.name,
    participantId: 'owner',
    participantName: '桌主 (你)',
    updatedAt: '12:18'
  },
  {
    cartItemId: 'ci-2',
    dish: MOCK_MENU_DISHES[2],
    quantity: 1,
    selectedOptions: {
      杯型: '大杯 450ml',
      冰度: '少冰',
      糖度: '无糖原萃'
    },
    calculatedPrice: 22,
    truckId: 'truck-01',
    truckName: CURRENT_TRUCK_SUMMARY.name,
    participantId: 'p-lin',
    participantName: '同桌食客·小林',
    updatedAt: '12:20'
  },
  {
    cartItemId: 'ci-3',
    dish: MOCK_MENU_DISHES[1],
    quantity: 1,
    selectedOptions: {
      辣度: '微辣椒盐',
      出品: '新鲜现制'
    },
    calculatedPrice: 26,
    truckId: 'truck-01',
    truckName: CURRENT_TRUCK_SUMMARY.name,
    participantId: 'p-qiang',
    participantName: '同桌食客·阿强',
    ownerLeft: true,
    leftAt: '12:22',
    updatedAt: '12:21'
  }
];

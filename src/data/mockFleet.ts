import type { FleetTruckRecord } from '../types/radar';

export const INITIAL_DISPATCH_FLEET: FleetTruckRecord[] = [
  {
    id: 'truck-01',
    code: '#01',
    name: '01 号·重庆摊面 / 黑曜石一号车',
    district: '静安大悦城',
    location: '静安大悦城北座 1F 中庭广场',
    latitude: 31.2468,
    longitude: 121.4648,
    isOpen: true,
    regularHours: '10:30 - 22:30',
    weeklyPlanHours: '10:30 - 22:30',
    todayOverrideHours: '10:30 - 23:00',
    minDeliveryAmount: 48,
    coverageRadiusKm: 3.5,
    queueOrders: 3,
    avgTicketPrice: 54,
    chefNotices: [
      {
        id: 'cn-01-1',
        message: '牛油红汤现熬开锅，炭烤和牛堡配现拌渝派小面即刻出炉，15分钟内直达',
        publishedAt: '10:25',
        chefName: '主理人·陈默'
      },
      {
        id: 'cn-01-0',
        message: '早市备料完成，冷链肉饼与鲜面团均已入柜',
        publishedAt: '09:40',
        chefName: '主理人·陈默'
      }
    ],
    scheduleHistory: [
      {
        id: 'sch-01-2',
        tag: '今日调整',
        effectiveWindow: '10:30 - 23:00',
        updatedAt: '今日 09:50',
        reason: '配合北座夜间市集延后 30 分钟收档',
        operator: '陈默'
      },
      {
        id: 'sch-01-1',
        tag: '常规排期',
        effectiveWindow: '10:30 - 22:30',
        updatedAt: '本周一 08:00',
        reason: '静安商圈标准午晚市运营窗口',
        operator: '车队调度中心'
      }
    ],
    prepDishes: [
      { dishId: 'dish-wagyu-burger', name: '澳洲 M5 和牛炭烤厚牛堡', price: 42, stock: 14, prepMinutes: 8, tag: '招牌' },
      { dishId: 'dish-wagyu-skewer', name: '果木炭烤安格斯雪花牛肉串', price: 26, stock: 22, prepMinutes: 6, tag: '热销' },
      { dishId: 'dish-coldbrew', name: '埃塞俄比亚耶加雪菲冷萃美式', price: 22, stock: 18, prepMinutes: 2, tag: '饮品' },
      { dishId: 'dish-truffle-fries', name: '黑松露帕玛森粗切薯条', price: 18, stock: 0, prepMinutes: 4, tag: '售罄测试' }
    ],
    demoTelemetry: {
      batteryPercent: 86,
      busVoltageV: 48.6,
      estimatedRuntimeHours: 9.4,
      cleanWaterPercent: 78,
      greyWaterPercent: 24,
      freezerTempC: -19.2,
      chillerTempC: 2.8,
      canBusLoadPercent: 31,
      canTecCount: 0,
      canRecCount: 1,
      rtkPrecisionCm: 1.8,
      baudRateKbps: 500
    }
  },
  {
    id: 'truck-02',
    code: '#02',
    name: '02 号·炭火烧鸟特快车',
    district: '市北高新',
    location: '市北高新壹中心下沉广场 B1',
    latitude: 31.2986,
    longitude: 121.4482,
    isOpen: true,
    regularHours: '11:00 - 23:30',
    minDeliveryAmount: 38,
    coverageRadiusKm: 4.0,
    queueOrders: 0,
    avgTicketPrice: 49,
    chefNotices: [
      {
        id: 'cn-02-1',
        message: '备长炭炉温已稳在 240°C，京葱鸡腿肉与提灯零排队现点现烤',
        publishedAt: '10:32',
        chefName: '烧鸟主厨·林修'
      }
    ],
    scheduleHistory: [
      {
        id: 'sch-02-1',
        tag: '常规排期',
        effectiveWindow: '11:00 - 23:30',
        updatedAt: '本周一 08:00',
        reason: '市北园区午市兼夜间烧鸟档口排班',
        operator: '车队调度中心'
      }
    ],
    prepDishes: [
      { dishId: 'dish-yakitori-thigh', name: '备长炭京葱鸡腿肉串', price: 16, stock: 30, prepMinutes: 5, tag: '烧鸟' },
      { dishId: 'dish-garlic-shrimp', name: '铁板蒜蓉黄油黑虎虾串', price: 29, stock: 12, prepMinutes: 6, tag: '海鲜' },
      { dishId: 'dish-yuzu-soda', name: '京都青柚气泡冷泡茶', price: 15, stock: 25, prepMinutes: 2, tag: '解腻' }
    ],
    demoTelemetry: {
      batteryPercent: 91,
      busVoltageV: 49.1,
      estimatedRuntimeHours: 10.8,
      cleanWaterPercent: 88,
      greyWaterPercent: 16,
      freezerTempC: -18.5,
      chillerTempC: 3.1,
      canBusLoadPercent: 24,
      canTecCount: 0,
      canRecCount: 0,
      rtkPrecisionCm: 1.4,
      baudRateKbps: 500
    }
  },
  {
    id: 'truck-03',
    code: '#03',
    name: '03 号·黑金和牛汉堡站',
    district: '陆家嘴',
    location: '陆家嘴滨江金融广场东侧步道',
    latitude: 31.2397,
    longitude: 121.4998,
    isOpen: true,
    regularHours: '10:00 - 22:00',
    minDeliveryAmount: 58,
    coverageRadiusKm: 3.2,
    queueOrders: 5,
    avgTicketPrice: 68,
    chefNotices: [
      {
        id: 'cn-03-1',
        message: '午高峰金融城团餐密集，现煎黑金和牛厚堡与冰美式优先通道开放中',
        publishedAt: '10:40',
        chefName: '主理人·Kira'
      }
    ],
    scheduleHistory: [
      {
        id: 'sch-03-1',
        tag: '常规排期',
        effectiveWindow: '10:00 - 22:00',
        updatedAt: '本周一 08:00',
        reason: '陆家嘴滨江全天候快闪泊位',
        operator: '车队调度中心'
      }
    ],
    prepDishes: [
      { dishId: 'dish-wagyu-burger', name: '澳洲 M5 和牛炭烤厚牛堡', price: 42, stock: 19, prepMinutes: 8, tag: '招牌' },
      { dishId: 'dish-onsen-rice', name: '黑椒雪花牛温泉蛋拌饭', price: 34, stock: 11, prepMinutes: 7, tag: '主食' },
      { dishId: 'dish-matcha-basque', name: '宇治抹茶流心巴斯克蛋糕', price: 24, stock: 9, prepMinutes: 1, tag: '甜品' }
    ],
    demoTelemetry: {
      batteryPercent: 74,
      busVoltageV: 47.9,
      estimatedRuntimeHours: 7.2,
      cleanWaterPercent: 64,
      greyWaterPercent: 39,
      freezerTempC: -18.9,
      chillerTempC: 2.5,
      canBusLoadPercent: 42,
      canTecCount: 1,
      canRecCount: 2,
      rtkPrecisionCm: 2.1,
      baudRateKbps: 500
    }
  },
  {
    id: 'truck-04',
    code: '#04',
    name: '04 号·深夜铁板串车',
    district: '新天地',
    location: '新天地湖滨道西侧夜市泊位',
    latitude: 31.2194,
    longitude: 121.4748,
    isOpen: true,
    regularHours: '17:00 - 02:30',
    todayOverrideHours: '10:00 - 02:30',
    minDeliveryAmount: 42,
    coverageRadiusKm: 4.5,
    queueOrders: 0,
    avgTicketPrice: 56,
    chefNotices: [
      {
        id: 'cn-04-1',
        message: '跨夜宵档提前通电开炉，铁板黑虎虾串与雪花牛肉串现点零等待',
        publishedAt: '10:15',
        chefName: '夜宵主厨·阿峰'
      }
    ],
    scheduleHistory: [
      {
        id: 'sch-04-2',
        tag: '今日调整',
        effectiveWindow: '10:00 - 02:30',
        updatedAt: '今日 09:30',
        reason: '提前联动午市并保留跨夜 02:30 夜宵通道',
        operator: '阿峰'
      },
      {
        id: 'sch-04-1',
        tag: '常规排期',
        effectiveWindow: '17:00 - 02:30',
        updatedAt: '本周一 08:00',
        reason: '新天地跨夜宵夜专车标准班次',
        operator: '车队调度中心'
      }
    ],
    prepDishes: [
      { dishId: 'dish-wagyu-skewer', name: '果木炭烤安格斯雪花牛肉串', price: 26, stock: 28, prepMinutes: 6, tag: '夜宵' },
      { dishId: 'dish-garlic-shrimp', name: '铁板蒜蓉黄油黑虎虾串', price: 29, stock: 16, prepMinutes: 6, tag: '铁板' },
      { dishId: 'dish-truffle-fries', name: '黑松露帕玛森粗切薯条', price: 18, stock: 20, prepMinutes: 4, tag: '小食' }
    ],
    demoTelemetry: {
      batteryPercent: 95,
      busVoltageV: 49.4,
      estimatedRuntimeHours: 12.1,
      cleanWaterPercent: 92,
      greyWaterPercent: 11,
      freezerTempC: -20.1,
      chillerTempC: 2.2,
      canBusLoadPercent: 19,
      canTecCount: 0,
      canRecCount: 0,
      rtkPrecisionCm: 1.3,
      baudRateKbps: 500
    }
  },
  {
    id: 'truck-05',
    code: '#05',
    name: '05 号·静安寺特调休整车',
    district: '静安寺',
    location: '静安嘉里中心南广场',
    latitude: 31.2238,
    longitude: 121.4465,
    isOpen: false,
    standbyReason: '消杀与水箱补给中 · 预计 16:00 恢复开档',
    regularHours: '10:30 - 21:30',
    minDeliveryAmount: 45,
    coverageRadiusKm: 3.0,
    queueOrders: 0,
    avgTicketPrice: 44,
    chefNotices: [
      {
        id: 'cn-05-1',
        message: '当前进行食品级净水箱换洗与冷链机组例行巡检，暂由 #01/#02 协同接单',
        publishedAt: '10:05',
        chefName: '主理人·小安'
      }
    ],
    scheduleHistory: [
      {
        id: 'sch-05-2',
        tag: '今日已打烊',
        effectiveWindow: '16:00 - 21:30 (维护后重开)',
        updatedAt: '今日 10:05',
        reason: '例行消杀与净水补给暂停营业',
        operator: '小安'
      },
      {
        id: 'sch-05-1',
        tag: '常规排期',
        effectiveWindow: '10:30 - 21:30',
        updatedAt: '本周一 08:00',
        reason: '静安寺商圈日常排期',
        operator: '车队调度中心'
      }
    ],
    prepDishes: [
      { dishId: 'dish-coldbrew', name: '埃塞俄比亚耶加雪菲冷萃美式', price: 22, stock: 0, prepMinutes: 2, tag: '暂停' },
      { dishId: 'dish-yuzu-soda', name: '京都青柚气泡冷泡茶', price: 15, stock: 0, prepMinutes: 2, tag: '暂停' }
    ],
    demoTelemetry: {
      batteryPercent: 52,
      busVoltageV: 46.8,
      estimatedRuntimeHours: 4.5,
      cleanWaterPercent: 32,
      greyWaterPercent: 68,
      freezerTempC: -17.4,
      chillerTempC: 3.8,
      canBusLoadPercent: 12,
      canTecCount: 0,
      canRecCount: 0,
      rtkPrecisionCm: 2.5,
      baudRateKbps: 250
    }
  }
];

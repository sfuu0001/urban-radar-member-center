/**
 * 地址存取替身。原模块还有门店选址、配送半径、测距等能力，
 * 资料编辑页只用「整表保存收货地址」这一个入口，这里就只留它。
 */
import { safeSetStorage, safeGetStorage } from './safeStorage';

const STORAGE_KEY_ADDRESS_LIST = 'obsidian_delivery_addresses';

export interface DeliveryAddressItem {
  id: string;
  title: string;
  detail: string;
  latitude: number;
  longitude: number;
  tag: string;
  isDefault?: boolean;
  receiverName?: string;
  receiverPhone?: string;
}

export function saveAddresses(addresses: DeliveryAddressItem[]): void {
  safeSetStorage(STORAGE_KEY_ADDRESS_LIST, addresses);
}

export function loadAddresses(): DeliveryAddressItem[] {
  return safeGetStorage<DeliveryAddressItem[]>(STORAGE_KEY_ADDRESS_LIST, []);
}

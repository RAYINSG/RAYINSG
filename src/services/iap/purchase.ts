import {
  initConnection,
  endConnection,
  getProducts,
  requestPurchase,
  getPurchaseHistory,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  ProductPurchase,
  PurchaseError,
} from 'react-native-iap';
import { EmitterSubscription } from 'react-native';

// 在 Google Play Console 建立的產品 ID
export const PREMIUM_SKU = 'homestore_premium_v1';

let purchaseUpdateSub: EmitterSubscription | null = null;
let purchaseErrorSub: EmitterSubscription | null = null;

/**
 * 初始化 IAP 連線（App 啟動時呼叫一次）
 */
export async function initIAP(): Promise<void> {
  try {
    await initConnection();
  } catch {
    // 模擬器或無 Play Services 環境會失敗，忽略
  }
}

/**
 * 關閉 IAP 連線（App 關閉時呼叫）
 */
export async function closeIAP(): Promise<void> {
  purchaseUpdateSub?.remove();
  purchaseErrorSub?.remove();
  await endConnection();
}

/**
 * 取得 Premium 產品資訊（價格等）
 */
export async function getPremiumProduct() {
  try {
    const products = await getProducts({ skus: [PREMIUM_SKU] });
    return products[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * 發起購買
 */
export async function purchasePremium(): Promise<void> {
  await requestPurchase({ skus: [PREMIUM_SKU] });
}

/**
 * 恢復過去的購買記錄（重裝 App 後使用）
 * 回傳 true 代表曾購買過
 */
export async function restorePremiumPurchase(): Promise<boolean> {
  try {
    const history = await getPurchaseHistory();
    return history.some(p => p.productId === PREMIUM_SKU);
  } catch {
    return false;
  }
}

/**
 * 監聽購買結果，成功時回呼 onSuccess
 */
export function listenPurchaseUpdates(
  onSuccess: () => void,
  onError: (msg: string) => void,
) {
  purchaseUpdateSub?.remove();
  purchaseErrorSub?.remove();

  purchaseUpdateSub = purchaseUpdatedListener(async (purchase: ProductPurchase) => {
    if (purchase.productId === PREMIUM_SKU) {
      try {
        // 必須 acknowledge，否則 Google 會在 3 天後退款
        await finishTransaction({ purchase, isConsumable: false });
        onSuccess();
      } catch {
        onError('購買確認失敗，請稍後再試');
      }
    }
  });

  purchaseErrorSub = purchaseErrorListener((error: PurchaseError) => {
    if (error.code !== 'E_USER_CANCELLED') {
      onError(error.message ?? '購買失敗，請稍後再試');
    }
  });
}

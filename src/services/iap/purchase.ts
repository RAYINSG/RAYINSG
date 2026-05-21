import { EmitterSubscription } from 'react-native';

// 在 Google Play Console 建立的產品 ID
export const PREMIUM_SKU = 'homestore_premium_v1';

// 動態載入，開發環境沒有原生模組時不 crash
let iap: any = null;
try {
  iap = require('react-native-iap');
} catch {}

let purchaseUpdateSub: EmitterSubscription | null = null;
let purchaseErrorSub: EmitterSubscription | null = null;

/**
 * 初始化 IAP 連線（App 啟動時呼叫一次）
 */
export async function initIAP(): Promise<void> {
  if (!iap) return;
  try {
    await iap.initConnection();
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
  if (!iap) return;
  try { await iap.endConnection(); } catch {}
}

/**
 * 取得 Premium 產品資訊（價格等）
 */
export async function getPremiumProduct() {
  if (!iap) return null;
  try {
    const products = await iap.getProducts({ skus: [PREMIUM_SKU] });
    return products[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * 發起購買
 */
export async function purchasePremium(): Promise<void> {
  if (!iap) throw new Error('IAP not available');
  await iap.requestPurchase({ skus: [PREMIUM_SKU] });
}

/**
 * 恢復過去的購買記錄（重裝 App 後使用）
 * 回傳 true 代表曾購買過
 */
export async function restorePremiumPurchase(): Promise<boolean> {
  if (!iap) return false;
  try {
    const history = await iap.getPurchaseHistory();
    return history.some((p: any) => p.productId === PREMIUM_SKU);
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
  if (!iap) return;

  purchaseUpdateSub = iap.purchaseUpdatedListener(async (purchase: any) => {
    if (purchase.productId === PREMIUM_SKU) {
      try {
        await iap.finishTransaction({ purchase, isConsumable: false });
        onSuccess();
      } catch {
        onError('購買確認失敗，請稍後再試');
      }
    }
  });

  purchaseErrorSub = iap.purchaseErrorListener((error: any) => {
    if (error.code !== 'E_USER_CANCELLED') {
      onError(error.message ?? '購買失敗，請稍後再試');
    }
  });
}

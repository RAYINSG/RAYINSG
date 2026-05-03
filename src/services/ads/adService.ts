import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo' || __DEV__;
// 測試模式：true = 顯示 Google 測試廣告（帳號審核前用）
//           false = 使用真實廣告（帳號過審後改回）
const IS_TEST = false;

let MobileAds: any, InterstitialAd: any, RewardedAd: any, AdEventType: any, RewardedAdEventType: any, TestIds: any;

if (!isExpoGo) {
  const ads = require('react-native-google-mobile-ads');
  MobileAds = ads.default;
  InterstitialAd = ads.InterstitialAd;
  RewardedAd = ads.RewardedAd;
  AdEventType = ads.AdEventType;
  RewardedAdEventType = ads.RewardedAdEventType;
  TestIds = ads.TestIds;
}

export const AD_UNITS = {
  BANNER:       (!isExpoGo && IS_TEST) ? TestIds?.BANNER       : 'ca-app-pub-3113431571318750/8193483692',
  INTERSTITIAL: (!isExpoGo && IS_TEST) ? TestIds?.INTERSTITIAL : 'ca-app-pub-3113431571318750/2689028118',
  REWARDED:     (!isExpoGo && IS_TEST) ? TestIds?.REWARDED     : 'ca-app-pub-3113431571318750/6111292015',
};

export async function initAds() {
  if (isExpoGo) return;
  try {
    await MobileAds().initialize();
  } catch {}
}

let interstitial: InterstitialAd | null = null;
let interstitialLoaded = false;

export function preloadInterstitial() {
  if (isExpoGo) return;
  try {
    interstitial = InterstitialAd.createForAdRequest(AD_UNITS.INTERSTITIAL);
    interstitial.addAdEventListener(AdEventType.LOADED, () => { interstitialLoaded = true; });
    interstitial.addAdEventListener(AdEventType.CLOSED, () => { interstitialLoaded = false; preloadInterstitial(); });
    // 載入失敗時 30 秒後重試
    interstitial.addAdEventListener(AdEventType.ERROR, () => {
      interstitialLoaded = false;
      setTimeout(() => preloadInterstitial(), 30000);
    });
    interstitial.load();
  } catch {}
}

// 每次新增、編輯、刪除都觸發廣告
export function onItemChanged() {
  if (interstitialLoaded && interstitial) {
    interstitial.show();
  }
}

// 向下相容舊呼叫
export const onItemSaved = onItemChanged;

export function showRewardedAd(): Promise<boolean> {
  if (isExpoGo) return Promise.resolve(false);
  return new Promise(resolve => {
    try {
      const rewarded = RewardedAd.createForAdRequest(AD_UNITS.REWARDED);
      rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => rewarded.show());
      rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => resolve(true));
      rewarded.addAdEventListener(AdEventType.CLOSED, () => resolve(false));
      rewarded.addAdEventListener(AdEventType.ERROR, () => resolve(false));
      rewarded.load();
    } catch {
      resolve(false);
    }
  });
}

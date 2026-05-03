# HomeStore - Google Play Console 準備記錄
更新日期：2026-04-25

## App 基本資料
- App 名稱：HomeStore
- Package name：com.yourname.homestore（已鎖定，不能改）
- Play Console App ID：4973743758487157316
- Developer ID：5470177847376852093
- 目前狀態：Closed testing（alpha, v1.0.0, 21 Apr 2026）

## 測試帳號（給 Google 審核員）
- Email：test@gmail.com
- Password：testtest

## Privacy Policy
- 網址：https://rayinsg.github.io/homestore-privacy
- GitHub repo：RAYINSG/homestore-privacy

## Store Listing（已確認正確）
- App name：HomeStore
- Short description：Smart home inventory tracker with expiry alerts and AI photo scanning.
- Full description：
  HomeStore helps you manage your household inventory with ease. Track groceries,
  medicines, and household items with expiry date alerts so you never let anything go to waste.

  Key features:
  • Photo scanning with AI to quickly add items
  • OCR expiry date scanning from product labels
  • Smart notifications before items expire
  • Free tier: up to 10 items
  • Premium: unlimited items with rewarded ads
  • Multiple storage locations
  • Multi-language support (English, Chinese, Japanese, and more)

  Stay organised, reduce waste, and save money with HomeStore.

## 程式碼已修正項目（app.json + adService.ts）
- 移除 android.permission.RECORD_AUDIO（未使用的敏感權限）
- 移除重複的 android.permission.CAMERA
- 廣告頻率：改為每 4 次操作才顯示一次插頁廣告

## 待辦事項（時間表）
- 2026-05-01：EAS build 額度重置 → 重新 build 並上傳 closed testing
- 2026-05-05：Closed test 滿 14 天 → 可申請 Production access
- 申請 Production 時需填入：
  1. 測試帳號（test@gmail.com / testtest）
  2. Privacy Policy 網址
  3. App content / App access 表單（屆時才會開放）
  4. Content rating 問卷
  5. Ads 聲明（app 有廣告）

## 尚未確認項目
- Screenshots 是否與實際功能相符

## 下次改版計畫
- 登入頁加語言選擇器（目前只跟隨系統語言）
- 註冊後發送 email 驗證信（目前註冊後直接登入，無驗證）

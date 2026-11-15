/* Royalfood POS — site configuration.
   Paste your Google Apps Script Web App URL into API_URL to use Google Sheets as the database.
   While API_URL is empty the app runs in demo mode (data stays in this browser only). */
window.APP_CONFIG = {
  BRAND: 'Royalfood',
  DOMAIN: 'royalfood.pos',
  COMPANY: 'ROYALFOOD POS',
  SUBTITLE: 'ระบบบริหารร้านอาหาร',
  API_URL: 'https://script.google.com/macros/s/AKfycbxNI02Vb8NvKgo_sQVLXGCLYMujqbu1gYxUWEshvwcKhnWMMVHiGZcO9DuwYW6CLrpvlQ/exec',
  CURRENCY: 'Baht',
  TAX_PERCENT: 0,
  POINTS_PER: 100, // 1 member point for every 100 spent
  SUPPORT: { line: '@royalfood', call: '000-000-0000', hours: '09.00 A.M.-10.00 P.M.', overtime: ['000-000-0001', '000-000-0002'] }
};

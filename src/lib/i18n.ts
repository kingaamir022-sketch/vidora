/**
 * Vidora i18n (Phase 9, Section M — M-LOCALE).
 * Locales: English, Urdu, Hindi, Arabic (RTL). The chrome (top bar, left
 * tabs, dashboard headings, common buttons, settings) is translated;
 * deep editor labels (effect names, panel internals) stay in English —
 * the Settings dialog says so plainly.
 * All strings are original Vidora copy.
 */

export type Locale = 'en' | 'ur' | 'hi' | 'ar';

export const LOCALES: { id: Locale; label: string; native: string }[] = [
  { id: 'en', label: 'English', native: 'English' },
  { id: 'ur', label: 'Urdu', native: 'اردو' },
  { id: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { id: 'ar', label: 'Arabic', native: 'العربية' },
];

export const RTL_LOCALES: Locale[] = ['ar'];

export function isRtl(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale);
}

export const LOCALE_STORAGE_KEY = 'vidora.locale.v1';

export function loadLocale(): Locale {
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (raw === 'en' || raw === 'ur' || raw === 'hi' || raw === 'ar') return raw;
  } catch {
    /* storage unavailable — fall through to English */
  }
  return 'en';
}

export function saveLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* storage unavailable — the choice applies for this session only */
  }
}

export type StringKey =
  | 'dashboard.title'
  | 'dashboard.newProject'
  | 'dashboard.search'
  | 'dashboard.backups'
  | 'dashboard.account'
  | 'dashboard.recent'
  | 'tab.media'
  | 'tab.text'
  | 'tab.stickers'
  | 'tab.captions'
  | 'tab.effects'
  | 'tab.filters'
  | 'tab.transitions'
  | 'tab.audio'
  | 'tab.adjustment'
  | 'tab.templates'
  | 'tab.aiTools'
  | 'topbar.export'
  | 'topbar.shortcuts'
  | 'topbar.saved'
  | 'topbar.unsaved'
  | 'topbar.settings'
  | 'topbar.account'
  | 'common.cancel'
  | 'common.close'
  | 'common.back'
  | 'common.next'
  | 'common.skip'
  | 'common.save'
  | 'common.startEditing'
  | 'settings.title'
  | 'settings.language'
  | 'settings.theme'
  | 'settings.help'
  | 'settings.featureUsage'
  | 'settings.showTour'
  | 'settings.reset'
  | 'settings.themeDark'
  | 'settings.themeLight'
  | 'auth.signIn'
  | 'auth.signUp'
  | 'auth.signOut'
  | 'auth.readOnly';

const STRINGS: Record<Locale, Record<StringKey, string>> = {
  en: {
    'dashboard.title': 'Your projects',
    'dashboard.newProject': 'New Project',
    'dashboard.search': 'Search projects',
    'dashboard.backups': 'Backups',
    'dashboard.account': 'Account',
    'dashboard.recent': 'Recent',
    'tab.media': 'Media',
    'tab.text': 'Text',
    'tab.stickers': 'Stickers',
    'tab.captions': 'Captions',
    'tab.effects': 'Effects',
    'tab.filters': 'Filters',
    'tab.transitions': 'Transitions',
    'tab.audio': 'Audio',
    'tab.adjustment': 'Adjustment',
    'tab.templates': 'Templates',
    'tab.aiTools': 'AI Tools',
    'topbar.export': 'Export',
    'topbar.shortcuts': 'Shortcuts',
    'topbar.saved': 'Saved',
    'topbar.unsaved': 'Unsaved',
    'topbar.settings': 'Settings',
    'topbar.account': 'Account',
    'common.cancel': 'Cancel',
    'common.close': 'Close',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.skip': 'Skip tour',
    'common.save': 'Save',
    'common.startEditing': 'Start editing',
    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.theme': 'Theme',
    'settings.help': 'Help',
    'settings.featureUsage': 'Feature usage',
    'settings.showTour': 'Show the tour again',
    'settings.reset': 'Reset settings',
    'settings.themeDark': 'Dark',
    'settings.themeLight': 'Light',
    'auth.signIn': 'Sign in',
    'auth.signUp': 'Create account',
    'auth.signOut': 'Sign out',
    'auth.readOnly': 'You are signed in as Customer — read-only. Ask the Owner to make changes.',
  },
  ur: {
    'dashboard.title': 'آپ کے پروجیکٹس',
    'dashboard.newProject': 'نیا پروجیکٹ',
    'dashboard.search': 'پروجیکٹس تلاش کریں',
    'dashboard.backups': 'بیک اپ',
    'dashboard.account': 'اکاؤنٹ',
    'dashboard.recent': 'حالیہ',
    'tab.media': 'میڈیا',
    'tab.text': 'متن',
    'tab.stickers': 'اسٹیکرز',
    'tab.captions': 'کیپشن',
    'tab.effects': 'ایفیکٹس',
    'tab.filters': 'فلٹرز',
    'tab.transitions': 'ٹرانزیشن',
    'tab.audio': 'آڈیو',
    'tab.adjustment': 'ایڈجسٹمنٹ',
    'tab.templates': 'ٹیمپلیٹس',
    'tab.aiTools': 'AI ٹولز',
    'topbar.export': 'ایکسپورٹ',
    'topbar.shortcuts': 'شارٹ کٹس',
    'topbar.saved': 'محفوظ ہو گیا',
    'topbar.unsaved': 'محفوظ نہیں ہوا',
    'topbar.settings': 'سیٹنگز',
    'topbar.account': 'اکاؤنٹ',
    'common.cancel': 'منسوخ کریں',
    'common.close': 'بند کریں',
    'common.back': 'واپس',
    'common.next': 'اگلا',
    'common.skip': 'ٹور چھوڑیں',
    'common.save': 'محفوظ کریں',
    'common.startEditing': 'ایڈیٹنگ شروع کریں',
    'settings.title': 'سیٹنگز',
    'settings.language': 'زبان',
    'settings.theme': 'تھیم',
    'settings.help': 'مدد',
    'settings.featureUsage': 'فیچرز کی فہرست',
    'settings.showTour': 'ٹور دوبارہ دکھائیں',
    'settings.reset': 'سیٹنگز بحال کریں',
    'settings.themeDark': 'گہرا',
    'settings.themeLight': 'ہلکا',
    'auth.signIn': 'سائن ان',
    'auth.signUp': 'اکاؤنٹ بنائیں',
    'auth.signOut': 'سائن آؤٹ',
    'auth.readOnly': 'آپ کسٹمر کے طور پر سائن ان ہیں — صرف دیکھ سکتے ہیں۔ تبدیلی کے لیے مالک سے کہیں۔',
  },
  hi: {
    'dashboard.title': 'आपके प्रोजेक्ट',
    'dashboard.newProject': 'नया प्रोजेक्ट',
    'dashboard.search': 'प्रोजेक्ट खोजें',
    'dashboard.backups': 'बैकअप',
    'dashboard.account': 'खाता',
    'dashboard.recent': 'हाल के',
    'tab.media': 'मीडिया',
    'tab.text': 'टेक्स्ट',
    'tab.stickers': 'स्टिकर',
    'tab.captions': 'कैप्शन',
    'tab.effects': 'इफेक्ट्स',
    'tab.filters': 'फ़िल्टर',
    'tab.transitions': 'ट्रांज़िशन',
    'tab.audio': 'ऑडियो',
    'tab.adjustment': 'एडजस्टमेंट',
    'tab.templates': 'टेम्पलेट',
    'tab.aiTools': 'AI टूल्स',
    'topbar.export': 'एक्सपोर्ट',
    'topbar.shortcuts': 'शॉर्टकट',
    'topbar.saved': 'सहेजा गया',
    'topbar.unsaved': 'सहेजा नहीं गया',
    'topbar.settings': 'सेटिंग्स',
    'topbar.account': 'खाता',
    'common.cancel': 'रद्द करें',
    'common.close': 'बंद करें',
    'common.back': 'वापस',
    'common.next': 'अगला',
    'common.skip': 'टूर छोड़ें',
    'common.save': 'सहेजें',
    'common.startEditing': 'संपादन शुरू करें',
    'settings.title': 'सेटिंग्स',
    'settings.language': 'भाषा',
    'settings.theme': 'थीम',
    'settings.help': 'मदद',
    'settings.featureUsage': 'फ़ीचर सूची',
    'settings.showTour': 'टूर फिर से दिखाएं',
    'settings.reset': 'सेटिंग्स रीसेट करें',
    'settings.themeDark': 'गहरा',
    'settings.themeLight': 'हल्का',
    'auth.signIn': 'साइन इन',
    'auth.signUp': 'खाता बनाएं',
    'auth.signOut': 'साइन आउट',
    'auth.readOnly': 'आप ग्राहक के रूप में साइन इन हैं — केवल देख सकते हैं। बदलाव के लिए मालिक से कहें।',
  },
  ar: {
    'dashboard.title': 'مشاريعك',
    'dashboard.newProject': 'مشروع جديد',
    'dashboard.search': 'ابحث في المشاريع',
    'dashboard.backups': 'النسخ الاحتياطية',
    'dashboard.account': 'الحساب',
    'dashboard.recent': 'الأخيرة',
    'tab.media': 'الوسائط',
    'tab.text': 'النص',
    'tab.stickers': 'الملصقات',
    'tab.captions': 'الترجمة',
    'tab.effects': 'التأثيرات',
    'tab.filters': 'الفلاتر',
    'tab.transitions': 'الانتقالات',
    'tab.audio': 'الصوت',
    'tab.adjustment': 'الضبط',
    'tab.templates': 'القوالب',
    'tab.aiTools': 'أدوات الذكاء الاصطناعي',
    'topbar.export': 'تصدير',
    'topbar.shortcuts': 'الاختصارات',
    'topbar.saved': 'تم الحفظ',
    'topbar.unsaved': 'غير محفوظ',
    'topbar.settings': 'الإعدادات',
    'topbar.account': 'الحساب',
    'common.cancel': 'إلغاء',
    'common.close': 'إغلاق',
    'common.back': 'رجوع',
    'common.next': 'التالي',
    'common.skip': 'تخطَّ الجولة',
    'common.save': 'حفظ',
    'common.startEditing': 'ابدأ التحرير',
    'settings.title': 'الإعدادات',
    'settings.language': 'اللغة',
    'settings.theme': 'السمة',
    'settings.help': 'المساعدة',
    'settings.featureUsage': 'قائمة الميزات',
    'settings.showTour': 'أعد عرض الجولة',
    'settings.reset': 'إعادة تعيين الإعدادات',
    'settings.themeDark': 'داكنة',
    'settings.themeLight': 'فاتحة',
    'auth.signIn': 'تسجيل الدخول',
    'auth.signUp': 'إنشاء حساب',
    'auth.signOut': 'تسجيل الخروج',
    'auth.readOnly': 'أنت مسجّل كعميل — للعرض فقط. اطلب من المالك إجراء التغييرات.',
  },
};

/** Translate a chrome string key; falls back to English for a missing key. */
export function t(locale: Locale, key: StringKey): string {
  return STRINGS[locale]?.[key] ?? STRINGS.en[key] ?? key;
}

/** Locale-aware date, e.g. "Nov 24, 2026" in en, "۲۴ نومبر ۲۰۲۶" in ur. */
export function formatDate(locale: Locale, date: Date): string {
  try {
    return new Intl.DateTimeFormat(locale === 'ur' ? 'ur-PK' : locale === 'hi' ? 'hi-IN' : locale === 'ar' ? 'ar-EG' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return date.toDateString();
  }
}

/** Locale-aware number, e.g. 1,234 in en, ۱٬۲۳۴ in ar. */
export function formatNumber(locale: Locale, value: number): string {
  try {
    return new Intl.NumberFormat(locale === 'ur' ? 'ur-PK' : locale === 'hi' ? 'hi-IN' : locale === 'ar' ? 'ar-EG' : 'en-US').format(value);
  } catch {
    return String(value);
  }
}

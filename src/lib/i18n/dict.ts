export type Lang = 'en' | 'ta'
export const LANGS: { code: Lang; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'ta', label: 'தமிழ்' },
]

/** English text is the key; strings missing here fall back to English. */
const ta: Record<string, string> = {
  // navigation
  Dashboard: 'டாஷ்போர்டு',
  'Add harvest': 'அறுவடை சேர்க்க',
  'Harvest +': 'அறுவடை +',
  Harvests: 'அறுவடைகள்',
  Farms: 'தோட்டங்கள்',
  Market: 'சந்தை',
  Fertilizer: 'உரம்',
  Pests: 'பூச்சிகள்',
  Weather: 'வானிலை',
  Reports: 'அறிக்கைகள்',
  Expenses: 'செலவுகள்',
  More: 'மேலும்',
  'Sign out': 'வெளியேறு',
  'Loading…': 'ஏற்றுகிறது…',
  'Loading comparison…': 'ஒப்பீடு ஏற்றுகிறது…',
  // headings
  'New farm': 'புதிய தோட்டம்',
  Fertilizers: 'உரங்கள்',
  'Edit harvest': 'அறுவடையைத் திருத்து',
  'Market rates': 'சந்தை விலைகள்',
  'Harvest report': 'அறுவடை அறிக்கை',
  'All reports': 'அனைத்து அறிக்கைகள்',
  // auth
  'Welcome back': 'மீண்டும் வருக',
  'Create your account': 'உங்கள் கணக்கை உருவாக்குங்கள்',
  Email: 'மின்னஞ்சல்',
  Password: 'கடவுச்சொல்',
  'Confirm password': 'கடவுச்சொல்லை உறுதிசெய்',
  'Sign in': 'உள்நுழை',
  'Signing in…': 'உள்நுழைகிறது…',
  'Sign up': 'பதிவு செய்',
  'Creating account…': 'கணக்கு உருவாகிறது…',
  'New here?': 'புதியவரா?',
  'Create an account': 'கணக்கை உருவாக்கு',
  'Already have an account?': 'ஏற்கனவே கணக்கு உள்ளதா?',
  // dashboard
  'All farms': 'அனைத்து தோட்டங்கள்',
  Production: 'உற்பத்தி',
  'Nuts (mudi)': 'காய்கள் (முடி)',
  Tons: 'டன்',
  Trees: 'மரங்கள்',
  'Last harvest': 'கடைசி அறுவடை',
  'Revenue this year': 'இந்த ஆண்டு வருவாய்',
  'Sold harvests only': 'விற்ற அறுவடைகள் மட்டும்',
  'Avg temperature': 'சராசரி வெப்பநிலை',
  'this month so far': 'இந்த மாதம் இதுவரை',
  'vs 10-year normal': '10 ஆண்டு சராசரியுடன் ஒப்பிடுகையில்',
  'Whole nut': 'முழு தேங்காய்',
  Dehusked: 'உரித்த தேங்காய்',
  Copra: 'கொப்பரை',
  'per nut': 'ஒரு காய்க்கு',
  'per ton': 'ஒரு டன்னுக்கு',
  'per kg': 'ஒரு கிலோவுக்கு',
  // expenses
  'Add expense': 'செலவு சேர்க்க',
  Farm: 'தோட்டம்',
  Date: 'தேதி',
  Category: 'வகை',
  'Amount (₹)': 'தொகை (₹)',
  'Notes (optional)': 'குறிப்புகள் (விருப்பம்)',
  'Save expense': 'செலவைச் சேமி',
  'Saving...': 'சேமிக்கிறது...',
  'Expense saved.': 'செலவு சேமிக்கப்பட்டது.',
  Labour: 'ஆள் கூலி',
  Pesticide: 'பூச்சிக்கொல்லி',
  Irrigation: 'நீர்ப்பாசனம்',
  Transport: 'போக்குவரத்து',
  Equipment: 'உபகரணங்கள்',
  Other: 'மற்றவை',
  'Profit this year': 'இந்த ஆண்டு லாபம்',
  'Revenue (sold harvests)': 'வருவாய் (விற்ற அறுவடைகள்)',
  'Total expenses': 'மொத்த செலவு',
  Profit: 'லாபம்',
  'By category': 'வகை வாரியாக',
  'Recent expenses': 'சமீபத்திய செலவுகள்',
  'No expenses recorded.': 'செலவுகள் எதுவும் பதிவு செய்யப்படவில்லை.',
  'Add a farm first.': 'முதலில் ஒரு தோட்டத்தைச் சேர்க்கவும்.',
}

export const dictionaries: Record<Lang, Record<string, string>> = { en: {}, ta }

export function translate(lang: Lang, text: string): string {
  return dictionaries[lang][text] ?? text
}

export const isLang = (v: unknown): v is Lang => v === 'en' || v === 'ta'

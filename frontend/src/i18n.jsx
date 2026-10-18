/** i18n — tiny English/Urdu switch. Keys are the English strings; anything missing falls back to English. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const UR = {
  // navigation + footer
  'Home': 'ہوم', 'Studio': 'اسٹوڈیو', 'History': 'ہسٹری', 'Pricing': 'قیمتیں', 'About': 'ہمارے بارے میں',
  'Sign in': 'سائن اِن', 'Get started': 'شروع کریں', 'Account': 'اکاؤنٹ', 'Sign out': 'سائن آؤٹ',
  'Product': 'پروڈکٹ', 'Legal': 'قانونی', 'Create account': 'اکاؤنٹ بنائیں', 'Reset password': 'پاس ورڈ ری سیٹ',
  'My account': 'میرا اکاؤنٹ', 'Terms & Conditions': 'شرائط و ضوابط', 'Privacy Policy': 'پرائیویسی پالیسی',
  'Refund Policy': 'ریفنڈ پالیسی',
  'AI interior design for homes, studios and renovation projects. Upload a photo or describe a room and see it restyled in minutes.':
    'گھروں، اسٹوڈیوز اور تزئین و آرائش کے لیے اے آئی انٹیریئر ڈیزائن۔ اپنے کمرے کی تصویر دیں یا اس کا حال لکھیں اور چند منٹ میں نیا انداز دیکھیں۔',
  'All rights reserved.': 'جملہ حقوق محفوظ ہیں۔',
  // auth
  'Create your account': 'اپنا اکاؤنٹ بنائیں', 'Welcome back': 'خوش آمدید', 'Free. Takes ten seconds.': 'مفت۔ صرف دس سیکنڈ۔',
  'Sign in to open your Studio.': 'اپنا اسٹوڈیو کھولنے کے لیے سائن اِن کریں۔', 'Name': 'نام', 'Email': 'ای میل', 'Password': 'پاس ورڈ',
  'Forgot password?': 'پاس ورڈ بھول گئے؟', 'Already have an account? ': 'پہلے سے اکاؤنٹ ہے؟ ', 'New to Aeterna? ': 'ایٹرنا پر نئے ہیں؟ ',
  'Create an account': 'اکاؤنٹ بنائیں',
  // studio
  'My room photo': 'میرے کمرے کی تصویر', 'From scratch': 'شروع سے', 'Your photo': 'آپ کی تصویر', 'Room': 'کمرہ', 'Style': 'انداز',
  'Furnishing': 'فرنیچر', 'How much to change': 'کتنی تبدیلی', 'Lighting': 'روشنی', 'Colours': 'رنگ', 'Anything specific?': 'کوئی خاص بات؟',
  'Variations': 'ورژنز', 'optional': 'اختیاری', 'more = slower': 'زیادہ = سست', 'Redesign my room': 'میرا کمرہ نئے سرے سے ڈیزائن کریں',
  'Generate designs': 'ڈیزائن بنائیں', 'Designing …': 'ڈیزائن ہو رہا ہے …', 'Add a photo to continue': 'جاری رکھنے کے لیے تصویر شامل کریں',
  'Your designs': 'آپ کے ڈیزائن', 'New variations': 'نئے ورژنز', 'Your designs will appear here': 'آپ کے ڈیزائن یہاں نظر آئیں گے',
  'Only change part of the room': 'کمرے کا صرف ایک حصہ بدلیں', 'Paint over what you want to change. The rest stays exactly as it is.': 'جو حصہ بدلنا ہے اس پر برش پھیریں۔ باقی کمرہ جوں کا توں رہے گا۔',
  'Paint': 'برش', 'Erase': 'مٹائیں', 'Undo': 'واپس', 'Clear': 'صاف کریں', 'Brush': 'برش کا سائز', 'Remove photo': 'تصویر ہٹائیں',
  'Paint the area you want to change': 'جو حصہ بدلنا ہے اس پر برش پھیریں',
  'Modern': 'جدید', 'Contemporary': 'عصری', 'Minimalist': 'سادہ', 'Scandinavian': 'اسکینڈے نیوین', 'Japandi': 'جاپانڈی', 'Industrial': 'انڈسٹریل', 'Luxury': 'لگژری',
  'Minimal': 'کم', 'Balanced': 'متوازن', 'Full': 'بھرپور', 'Subtle': 'ہلکی', 'Bold': 'بھرپور تبدیلی',
  'Natural': 'قدرتی', 'Warm': 'گرم', 'Bright': 'روشن', 'Evening': 'شام', 'Golden hour': 'سنہری وقت', 'Overcast': 'ابر آلود',
  'Neutral': 'نیوٹرل', 'Cool': 'ٹھنڈے', 'Earth': 'مٹیالے', 'Mono': 'سیاہ و سفید', 'Forest': 'سبز',
  'Living room': 'ڈرائنگ روم', 'Bedroom': 'بیڈ روم', 'Kitchen': 'کچن', 'Bathroom': 'باتھ روم', 'Dining room': 'ڈائننگ روم',
  'Home office': 'ہوم آفس', 'Nursery': 'بچوں کا کمرہ', 'Studio apartment': 'اسٹوڈیو اپارٹمنٹ',
  'Add a photo of your room': 'اپنے کمرے کی تصویر شامل کریں', 'Drop it here or click · JPG, PNG, WEBP · up to {mb} MB': 'یہاں چھوڑیں یا کلک کریں · JPG, PNG, WEBP · زیادہ سے زیادہ {mb} MB',
  '{n} of {limit} designs left today': 'آج {limit} میں سے {n} ڈیزائن باقی ہیں', 'Restyles, keeps the room recognisable': 'انداز بدلتا ہے مگر کمرہ پہچانا جا سکتا ہے',
  'Keeps your layout and furniture': 'ترتیب اور فرنیچر وہی رہتا ہے', 'Big changes, only the structure stays': 'بڑی تبدیلیاں، صرف ڈھانچہ وہی رہتا ہے',
  'Add a photo, pick a style and press Redesign. Tip: a bright, straight-on photo of the whole room works best.': 'تصویر شامل کریں، انداز چنیں اور "ڈیزائن" دبائیں۔ مشورہ: پورے کمرے کی روشن اور سیدھی تصویر بہتر رہتی ہے۔',
  'Choose a room, style and lighting, then press Generate to see new room concepts.': 'کمرہ، انداز اور روشنی چنیں، پھر "بنائیں" دبائیں۔',
  'e.g. large windows, green velvet sofa': 'مثلاً بڑی کھڑکیاں، سبز مخملی صوفہ', 'picked from your likes': 'آپ کی پسند سے منتخب',
  // pricing
  'Get Pro': 'پرو حاصل کریں', 'I have paid': 'میں نے ادائیگی کر دی', 'Transaction ID': 'ٹرانزیکشن آئی ڈی', 'Your payments': 'آپ کی ادائیگیاں',
  'Waiting for review': 'جائزے کا انتظار', 'Approved': 'منظور', 'Rejected': 'مسترد',
  // landing
  'Ready to see your room differently?': 'اپنا کمرہ نئے انداز میں دیکھنے کے لیے تیار ہیں؟',
  'Open the Studio': 'اسٹوڈیو کھولیں', 'Create your free account': 'مفت اکاؤنٹ بنائیں', 'Free · takes ten seconds': 'مفت · صرف دس سیکنڈ',
  // results + tools
  'HD': 'ایچ ڈی', 'Share': 'شیئر', 'Budget': 'بجٹ', 'Mood board': 'موڈ بورڈ', 'More like this': 'اسی جیسے مزید', 'Copy': 'کاپی',
  'Estimated budget': 'اندازہ بجٹ', 'Estimated total': 'کل اندازہ', 'Share this design': 'یہ ڈیزائن شیئر کریں', 'Create variations': 'ورژنز بنائیں',
  'Original': 'اصل', 'Redesign': 'نیا ڈیزائن', 'Spotted in your photo': 'آپ کی تصویر میں نظر آیا', 'How this was made': 'یہ کیسے بنا',
  'Payments accepted via Easypaisa · Prices in PKR · Made in Karachi, Pakistan': 'ادائیگی ایزی پیسہ سے · قیمتیں پاکستانی روپے میں · کراچی میں بنایا گیا',
  'Pay online': 'آن لائن ادائیگی', 'with': 'بذریعہ', 'Pro switches on automatically.': 'پرو خود بخود چالو ہو جاتا ہے۔', 'Pay PKR': 'ادا کریں روپے', 'online': 'آن لائن',
  'Or pay by transfer below.': 'یا نیچے دیے گئے طریقے سے ٹرانسفر کریں۔',
  'Weekly': 'ہفتہ وار', 'Monthly': 'ماہانہ', 'days': 'دن',
  'No photo handy? Try a sample room': 'تصویر نہیں ہے؟ نمونے کا کمرہ آزمائیں', 'Quick start': 'جلدی شروع کریں', 'Got it': 'سمجھ گیا',
  'Add a bright, straight-on photo of the whole room (or use the sample).': 'پورے کمرے کی روشن اور سامنے سے لی گئی تصویر شامل کریں (یا نمونہ استعمال کریں)۔',
  'Pick a style and colours, then press the button.': 'انداز اور رنگ چنیں، پھر بٹن دبائیں۔',
  'Like or dislike results so Aeterna learns your taste.': 'نتائج کو پسند یا ناپسند کریں تاکہ ایٹرنا آپ کا ذوق سیکھ سکے۔',
  'Good questions': 'عام سوالات', 'FAQ': 'اکثر پوچھے گئے سوالات',
}

const DICT = { ur: UR }
const Ctx = createContext({ lang: 'en', t: (s) => s, setLang: () => {} })

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => { try { return localStorage.getItem('aeterna.lang') || 'en' } catch { return 'en' } })
  const setLang = useCallback((l) => { setLangState(l); try { localStorage.setItem('aeterna.lang', l) } catch { /* ignore */ } }, [])
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr'
  }, [lang])
  const t = useCallback((s, vars) => {
    let out = (typeof s === 'string' && DICT[lang]?.[s]) || s
    if (vars && typeof out === 'string') for (const k in vars) out = out.replaceAll(`{${k}}`, String(vars[k]))
    return out
  }, [lang])
  const value = useMemo(() => ({ lang, t, setLang }), [lang, t, setLang])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useT = () => useContext(Ctx)

export function LangToggle() {
  const { lang, setLang } = useT()
  return (
    <button type="button" onClick={() => setLang(lang === 'ur' ? 'en' : 'ur')} title="Language / زبان"
      style={{ background: 'none', border: '1px solid #E5E5E5', cursor: 'pointer', padding: '5px 10px', fontSize: 12, color: '#444' }}>
      {lang === 'ur' ? 'English' : 'اردو'}
    </button>
  )
}

import type { Dictionary } from './en';
import type { DeepPartial } from './types';

export const hi: DeepPartial<Dictionary> = {
  app: { tagline: 'बोलकर स्टॉक संभालें' },
  nav: {
    overview: 'अवलोकन', products: 'सामान', voice: 'वॉइस असिस्टेंट', movements: 'स्टॉक लेन-देन', alerts: 'कम स्टॉक अलर्ट',
    suppliers: 'सप्लायर', reports: 'रिपोर्ट', team: 'टीम और अनुमतियाँ', settings: 'सेटिंग्स', home: 'होम', history: 'इतिहास',
    more: 'और', voiceShort: 'बोलें',
  },
  top: { search: 'नाम या SKU से सामान खोजें', notifications: 'सूचनाएँ', logout: 'लॉग आउट', language: 'भाषा', settings: 'सेटिंग्स' },
  common: {
    save: 'सहेजें', saving: 'सहेज रहे हैं…', cancel: 'रद्द करें', retry: 'फिर कोशिश करें', edit: 'बदलें', view: 'देखें', archive: 'संग्रहित करें',
    back: 'वापस', next: 'आगे', close: 'बंद करें', loading: 'लोड हो रहा है…', optional: 'वैकल्पिक', previous: 'पिछला', confirm: 'पुष्टि करें',
    pageOf: 'पेज {page} / {pages}', viewAll: 'सब देखें', errorTitle: 'लोड नहीं हो सका',
  },
  status: { in_stock: 'स्टॉक में', low_stock: 'कम हो रहा है', out_of_stock: 'स्टॉक खत्म', active: 'सक्रिय', archived: 'संग्रहित' },
  auth: {
    loginTitle: 'अपनी दुकान में साइन इन करें', email: 'ईमेल', password: 'पासवर्ड', fullName: 'आपका नाम', phone: 'मोबाइल नंबर',
    signIn: 'साइन इन', forgot: 'पासवर्ड भूल गए?', createAccount: 'खाता बनाएँ', register: 'खाता बनाएँ', backToLogin: 'साइन इन पर वापस',
  },
  validation: { required: 'यह भरना ज़रूरी है', email: 'सही ईमेल डालें', passwordMin: 'कम से कम 8 अक्षर रखें', nonNegative: 'ऋणात्मक नहीं हो सकता', number: 'सही संख्या डालें' },
  onboarding: { title: 'अपनी दुकान सेट करें', shopName: 'दुकान का नाम', ownerName: 'मालिक का नाम', uiLanguage: 'ऐप की भाषा', voiceLanguage: 'बोलने की भाषा', finish: 'सेटअप पूरा करें' },
  dashboard: {
    title: 'अवलोकन', activeProducts: 'सक्रिय सामान', inventoryValue: 'स्टॉक का मूल्य', lowStock: 'कम स्टॉक', outOfStock: 'स्टॉक खत्म',
    stockIn: 'माल आया', stockOut: 'माल गया', quickActions: 'तुरंत काम', addStock: 'स्टॉक जोड़ें', removeStock: 'स्टॉक घटाएँ',
    addProduct: 'सामान जोड़ें', openVoice: 'वॉइस असिस्टेंट खोलें', reorder: 'दोबारा मंगाने के सुझाव', recentTransactions: 'हाल के लेन-देन',
  },
  products: {
    title: 'सामान', add: 'सामान जोड़ें', name: 'सामान का नाम', category: 'श्रेणी', currentStock: 'मौजूदा स्टॉक', minStock: 'न्यूनतम स्टॉक',
    purchaseCost: 'खरीद मूल्य (₹)', sellingPrice: 'बिक्री मूल्य (₹)', baseUnit: 'मूल इकाई', supplier: 'पसंदीदा सप्लायर',
  },
  movement: { stock_in: 'माल आया', stock_out: 'माल गया', adjustment: 'समायोजन', voice: 'वॉइस', manual: 'मैनुअल' },
};

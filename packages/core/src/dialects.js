/**
 * SmartLangGuard Core - Arabic Dialects Module
 * 
 * Comprehensive Arabic dialect support for better correction accuracy.
 * Covers: Egyptian, Gulf (Kuwait, Saudi, UAE, Oman, Qatar, Bahrain),
 * Levantine (Syrian, Lebanese, Jordanian, Palestinian), 
 * Maghrebi (Moroccan, Algerian, Tunisian, Libyan),
 * Iraqi, and Sudanese dialects.
 * 
 * @module core/dialects
 */

'use strict';

/**
 * Dialect types supported
 */
const DIALECTS = {
  MSA: 'msa',           // Modern Standard Arabic (default)
  EGYPTIAN: 'egyptian', // مصر
  GULF: 'gulf',         // الخليج (Saudi, UAE, Kuwait, Oman, Qatar, Bahrain)
  LEVANTINE: 'levantine', // الشام (Syria, Lebanon, Jordan, Palestine)
  MAGHREBI: 'maghrebi', // المغرب (Morocco, Algeria, Tunisia, Libya)
  IRAQI: 'iraqi',       // العراق
  SUDANESE: 'sudanese'   // السودان
};

/**
 * Dialect-specific bigrams for better scoring
 * These are letter pairs that are common in specific dialects but rare in MSA
 */
const DIALECT_BIGRAMS = {
  [DIALECTS.EGYPTIAN]: {
    'بق': 40, 'لأ': 35, 'بت': 30, 'ضا': 35, 'ضه': 30,
    'ند': 35, 'ني': 30, 'سل': 30, 'صل': 35, 'ست': 35,
    'كت': 40, 'خد': 35, 'جص': 30, 'خخ': 25, 'بو': 25,
    'عا': 35, 'ند': 35, 'يا': 30, 'لو': 30, 'دي': 30,
    'إيه': 45, 'إز': 35, 'أوي': 40, 'كد': 35, 'لهم': 30,
    'منه': 35, 'عنده': 40, 'على طول': 50, 'من غير': 40,
    'عشان كذا': 45, 'على طول': 40, 'دلوقتي': 45, 'كده': 45
  },
  [DIALECTS.GULF]: {
    'بغ': 40, 'نش': 35, 'يش': 30, 'خل': 35, 'يش': 30,
    'صب': 35, 'عب': 30, 'عس': 35, 'قس': 30, 'قب': 35,
    'غ': 40, 'شه': 35, 'شو': 40, 'ليش': 45, 'وين': 45,
    'ابي': 50, 'ابيك': 45, 'ابغى': 45, '下身': 40,
    'الحين': 45, 'بعدين': 40, 'زينة': 40, 'زين': 40,
    'مو': 35, 'موب': 30, 'ادري': 40, 'تدري': 35,
    'هسه': 40, 'هلق': 40, 'خلاص': 40, 'إن شاء': 45,
    'ماقصرت': 45, 'حبيبي': 40, 'ياخي': 35, 'يعطيك': 40
  },
  [DIALECTS.LEVANTINE]: {
    'بدي': 45, 'بدك': 45, 'بدو': 40, 'بدها': 40,
    'شو': 50, 'كيف': 40, 'ليش': 45, 'وين': 40,
    'كتير': 50, 'شوي': 40, 'هيك': 45, 'هلق': 40,
    'منيح': 45, 'منيحة': 40, 'مو': 35, 'لا': 30,
    'هلق': 40, 'هس': 35, 'لأ': 35, 'خلص': 40,
    'يعني': 40, 'عم': 35, 'ال': 30, 'ب': 25,
    'تكرم': 40, 'عافية': 40, 'معليش': 45,
    'يا سيدي': 45, 'سلامات': 40, 'يسلمو': 45
  },
  [DIALECTS.MAGHREBI]: {
    'واش': 50, 'شنو': 50, 'علاش': 50, 'فين': 40,
    'بزاف': 50, 'ديال': 40, 'مزيان': 45, 'غير': 40,
    'نهار': 35, 'غير': 40, 'ماشاء': 40, 'كول': 35,
    'نتا': 45, 'نت': 40, 'هوّا': 45, 'حنا': 40,
    'نتوم': 40, 'أنا': 35, 'ها': 30, 'هوم': 35,
    'كيداير': 50, 'بزاف': 45, 'قرّب': 40, 'خلاص': 35,
    'دابا': 45, 'رشح': 40, 'فما': 40, 'ما فماش': 45,
    'شد': 35, 'هضر': 40, 'مßer': 35
  },
  [DIALECTS.IRAQI]: {
    'ج': 40, 'چ': 50, 'ماكو': 50, 'هاي': 40,
    'شني': 50, 'شسوي': 45, 'وين': 40, 'ليش': 40,
    'دز': 45, 'روح': 35, 'جي': 40, 'اكعد': 40,
    'هسة': 45, 'هل': 35, 'يت': 30, 'به': 35,
    'زين': 45, 'عجيب': 40, 'يوم': 35, 'پي': 40,
    'چي': 40, 'نو': 35, 'ئة': 30, 'ئة': 35,
    'عفاية': 40, 'يوطة': 40, 'حجي': 40, 'هواية': 45
  },
  [DIALECTS.SUDANESE]: {
    'دي': 45, 'دا': 45, 'شنو': 45, 'ليه': 45,
    'كدي': 50, 'قسيم': 45, 'يازول': 50,
    'حسي': 45, 'صاح': 40, 'عمنا': 45,
    'ياخ': 45, 'جقر': 40, 'زي': 35, 'ما': 30,
    'ح': 35, 'الد': 40, 'لو': 35, 'عا': 30,
    'حاجة': 40, 'حالك': 35, 'عندك': 40,
    'كد': 35, 'كده': 40, 'الآن': 35, 'دلوقتي': 40
  }
};

/**
 * Dialect-specific vocabulary
 * Format: { word: score }
 * Higher scores = more confident this is the correct word for this dialect
 */
const DIALECT_VOCAB = {
  [DIALECTS.EGYPTIAN]: {
    // Pronouns
    'انا': 90, 'انتا': 85, 'انتي': 85, 'هو': 85, 'هي': 85,
    'ده': 80, 'دي': 80, 'دول': 80, 'هاد': 80, 'هاي': 80,
    'الي': 85, 'اللي': 85, 'اللي': 90,
    
    // Question words
    'ايه': 90, 'ليه': 85, 'ازاي': 90, 'فين': 85, 'متى': 80,
    'ايتها': 70, 'كام': 75, 'بكام': 70,
    
    // Common verbs
    ' сказа': 80, 'قال': 80, 'قالي': 85, 'قول': 75,
    'عمل': 85, 'عملت': 85, 'عملي': 80,
    'خلاص': 85, 'خلاص': 90, 'خلص': 80,
    'بقى': 85, 'بقي': 80, 'بقى': 85,
    'هت': 80, 'هتيجي': 85, 'هروح': 85, 'هكون': 80,
    'مش': 90, 'مش': 85, 'مو': 80, 'مفيش': 90,
    'عرفت': 85, 'عرف': 80, 'معرفتش': 85,
    'اخت': 80, 'خد': 85, 'خدها': 80,
    'حبيب': 85, 'حبيبة': 80, 'حبيبي': 85,
    
    // Adverbs & phrases
    'كده': 90, 'كده': 85, 'دلوقتي': 90, 'الحين': 85,
    'عشان': 85, 'عشان كذا': 80, 'علشان': 85,
    'علي طول': 85, 'تمام': 90, 'ماشي': 85,
    'اصلا': 85, 'مش': 90, 'طب': 85, 'يا': 80,
    'بلاش': 80, 'مizu': 75, 'Vale': 70,
    'الاول': 80, 'اول حاجة': 85, 'اضرب': 80,
    'حاجة': 90, 'حاجات': 85, 'حاجتين': 80,
    'اوي': 85, 'اوى': 85, 'مفيش': 90, 'في': 85,
    'كلها': 80, 'كله': 80, 'اية': 85,
    
    // Tech terms (Egyptian context)
    'محمول': 80, 'تليفون': 85, 'لاب': 80, 'كمبيوتر': 85,
    'نت': 80, 'النت': 85, 'واي فاي': 75, 'موبايل': 80,
    
    // Common nouns
    'بلد': 85, 'مصر': 90, 'قاهرة': 85, 'اسكندرية': 85,
    'بيضة': 80, 'بيض': 80, 'فول': 80, 'طعمية': 75,
    'شاي': 85, 'نسكافيه': 70, 'قهوة': 80,
    
    // Negation
    'مش': 95, 'مو': 80, 'مفيش': 90, 'من غير': 80,
    'لا': 70, 'مش': 95, 'ما': 70, 'ما هو': 75
  },
  
  [DIALECTS.GULF]: {
    // Pronouns
    'انا': 85, 'انت': 85, 'اني': 90, 'انك': 85,
    'ابي': 90, 'ابيك': 85, 'ابغى': 85, 'ابان': 80,
    'هلا': 85, 'هلا والله': 80, 'مرحبا': 80,
    
    // Question words
    'شلون': 90, 'ليش': 90, 'وين': 90, 'متى': 85,
    'وش': 90, 'شو': 85, 'كيف': 80, 'كم': 80,
    
    // Common verbs
    'قال': 85, 'يقول': 85, 'قول': 80, 'ابي': 90,
    'ابغى': 85, 'اريد': 80, 'ود': 85,
    'سويت': 85, 'سوا': 80, ' اسوي': 85,
    'جاز': 80, 'يجي': 85, 'يجي': 85,
    'روحي': 80, 'اطلع': 85, 'نزل': 80,
    'خلاص': 85, 'خلص': 80, 'تم': 80,
    'ادري': 85, 'تدري': 80, 'جد': 75,
    
    // Adverbs & phrases
    'الحين': 90, 'بعدين': 85, 'زينة': 85, 'زين': 85,
    'صج': 80, 'صج': 85, 'كذب': 80,
    'مو': 90, 'موو': 85, 'موب': 80,
    'هالس': 80, 'هذي': 85, 'هذيكم': 80,
    'خلاص': 85, 'تمام': 80, 'okee': 75,
    'ماقصرت': 85, 'ما قصر': 80, 'حبيبي': 80,
    'يعطيك': 85, 'الله يعطيك': 90, 'ياليت': 80,
    'ان شاء': 85, 'إن شاء الله': 90, 'شاء': 80,
    'بس': 85, 'غير': 80, '暇': 75,
    
    // Tech terms (Gulf context)
    'جوال': 90, 'هاتف': 80, 'لابتوب': 85, 'كمبيوتر': 80,
    'نت': 80, 'انترنت': 85, 'واير': 75, 'شبكة': 80,
    'ايميل': 80, 'بريد': 75,
    
    // Common nouns
    'بيت': 85, 'بر': 90, 'مدينة': 80, 'شارع': 80,
    'سوق': 85, 'مول': 80, 'Hospital': 75,
    'تمن': 80, 'فلوس': 85, 'ريال': 85, 'درهم': 80,
    'قهوة': 85, 'شاي': 80, 'تمر': 85, 'haleeb': 70,
    
    // Negation
    'ما': 85, 'مو': 90, 'ليس': 70, 'لا': 75, 'مافي': 80
  },
  
  [DIALECTS.LEVANTINE]: {
    // Pronouns
    'انا': 85, 'انت': 85, 'اني': 80, 'انتي': 85,
    'هلق': 90, 'هل': 85, 'هيك': 80, 'هي': 80,
    'هاد': 85, 'هدول': 80, 'هذي': 85,
    
    // Question words
    'شو': 90, 'كيف': 85, 'ليش': 85, 'وين': 85,
    'متى': 80, 'قديش': 75, 'كيفك': 80,
    
    // Common verbs
    'قال': 85, 'قل': 80, 'عم': 80, 'بقل': 75,
    'عمل': 85, 'عم اشتغل': 80, 'عمل': 85,
    'بدّي': 90, 'بدك': 85, 'بدو': 85, 'بدها': 80,
    'سمعت': 85, 'سمع': 80, 'بيسمع': 75,
    'فيّ': 80, 'فيك': 75, 'فينا': 70,
    
    // Adverbs & phrases
    'كتير': 90, ' كتير': 85, 'شوي': 85, 'شوية': 80,
    'هيك': 90, 'هيك': 85, 'هكة': 80,
    'هلق': 85, 'هلأ': 80, 'هس': 75,
    'منيح': 85, 'منيحة': 80, 'مش': 80,
    'خلاص': 85, 'خلص': 80, 'يك': 75,
    'تكرم': 85, 'تكرمي': 80, 'العفو': 85,
    'معليش': 90, 'عفو': 80, 'sorry': 70,
    'يا سيدي': 85, 'سلام': 80, 'سلامات': 80,
    'يسلمو': 85, 'يسلمو ايديك': 80, 'الله يسلمك': 85,
    
    // Tech terms (Levantine context)
    'موبايل': 85, 'تلفون': 80, 'حاسوب': 80, 'لابتوب': 80,
    'نت': 80, 'انترنت': 85, 'واي فاي': 75,
    'صفحة': 80, 'موقع': 80, 'ايميل': 80,
    
    // Common nouns
    'بيت': 85, 'شارع': 80, 'سوق': 80, 'مقهى': 80,
    'قهوة': 85, 'شاي': 80, 'بيبسي': 70, 'سفن اب': 70,
    'ارض': 80, 'ارض': 80, 'جبل': 80, 'بحر': 80,
    
    // Negation
    'ما': 85, 'مش': 80, 'لا': 80, 'مو': 75, 'ليس': 65
  },
  
  [DIALECTS.MAGHREBI]: {
    // Pronouns
    'انا': 85, 'نتا': 85, 'نت': 80, 'انتي': 80,
    'هوّا': 90, 'هيّا': 85, 'حنا': 85, 'نتوم': 80,
    'هوم': 75, 'ها': 70, 'هدا': 85, 'هادي': 80,
    
    // Question words
    'واش': 90, 'شنو': 85, 'علاش': 90, 'فين': 85,
    'كيفاش': 80, 'لاحظ': 75, 'قداش': 80,
    
    // Common verbs
    'قلت': 85, 'قال': 80, 'كون': 85, 'كان': 80,
    'درت': 85, 'عمل': 80, 'عطا': 75, 'عطاني': 80,
    'باغي': 85, 'بغيت': 80, 'نبغا': 75,
    'مشا': 80, 'مشى': 75, 'رجع': 80, 'قبل': 75,
    'كل': 85, 'كول': 80, ' شرب': 80, 'شريب': 75,
    
    // Adverbs & phrases
    'بزاف': 90, 'كتير': 80, 'شوية': 80, 'شوية شوية': 75,
    'مزيان': 90, 'زين': 85, 'عاف': 75,
    'غير': 85, 'غير': 80, 'سوا': 80,
    'دابا': 90, 'لوين': 80, '，乌': 75,
    'حنا': 85, 'احنا': 80, 'نتوما': 75,
    'هضر': 85, 'هضرة': 80, 'حكي': 75,
    'قرّب': 80, 'بعد': 75, '园': 70,
    'ماشاء': 85, 'ماشاء الله': 80, 'سبحان': 75,
    'خلاص': 85, 'عين': 80, 'علاه': 75,
    
    // Tech terms (Maghrebi context)
    'موبايل': 85, 'فون': 80, 'لابتوب': 80, 'كمبيوتر': 80,
    'انترنت': 85, 'نت': 80, 'واي فاي': 75,
    'ميقاد': 70, 'طوموبيل': 75,
    
    // Common nouns
    'بيت': 85, 'دار': 85, 'مزرة': 75, 'فلا': 75,
    'سوق': 80, 'درب': 75, 'شارع': 80, 'زنقة': 75,
    'خباز': 75, 'مقردة': 70, 'كسكسي': 75, 'طاجين': 70,
    'شاي': 85, 'نbé': 70, 'قهوة': 80,
    
    // Negation
    'ما': 90, 'ماش': 85, 'ل': 75, 'لا': 70, 'غن': 65
  },
  
  [DIALECTS.IRAQI]: {
    // Pronouns
    'انه': 85, 'انت': 80, 'اني': 85, 'انك': 80,
    'هاي': 80, 'هذي': 75, 'د': 70, 'دي': 75,
    
    // Question words
    'شني': 90, 'شسوي': 85, 'وين': 85, 'ليش': 85,
    'كيف': 80, 'متى': 75, 'چند': 70,
    
    // Common verbs
    'گال': 85, 'قال': 80, 'گل': 80, 'حچی': 75,
    'سوی': 85, 'سويت': 80, 'عما': 80,
    'راح': 85, 'اجی': 80, 'اكعد': 85, 'اروح': 80,
    'شديت': 80, 'گیر': 75, 'خذه': 80,
    'چا': 85, 'چای': 80, 'نچ': 75,
    
    // Adverbs & phrases
    'هسة': 90, 'هل': 80, 'الحين': 85, 'هله': 75,
    'زين': 85, 'حلو': 80, 'منSAR': 75,
    'ماكو': 90, 'مگداش': 80, 'عگد': 75,
    'گل': 80, 'چ': 75, 'بة': 70,
    'عفاية': 85, 'يوطة': 80, 'حجي': 80,
    'هواية': 85, 'هوية': 80, 'هاي': 75,
    '、保': 70, 'گد': 75, 'ارگد': 70,
    
    // Tech terms (Iraqi context)
    'موبايل': 85, 'فون': 80, 'لابتوب': 80, 'كمپيوتن': 75,
    'انترنيت': 80, 'نت': 75, 'wifi': 70,
    
    // Common nouns
    'بيت': 85, 'دار': 80, 'شارع': 80, 'سو': 75,
    'قهوة': 85, 'شاي': 80, 'كولي': 70,
    'فلوس': 80, 'دينار': 80, 'doller': 70,
    
    // Negation
    'ما': 85, 'مو': 80, 'لا': 70, 'گ': 75, 'نه': 65
  },
  
  [DIALECTS.SUDANESE]: {
    // Pronouns
    'انا': 85, 'انت': 80, 'انتو': 75, 'هو': 80,
    'دي': 85, 'دا': 85, 'دول': 80, 'حاجة': 85,
    
    // Question words
    'شنو': 90, 'ليه': 85, 'فين': 80, 'ازاي': 75,
    'كام': 70, 'قد ايه': 75,
    
    // Common verbs
    'قال': 85, 'حك': 80, 'عمل': 80, 'عملت': 80,
    'خلاص': 85, 'كمل': 80, 'كمل': 75,
    'روح': 85, 'اجر': 80, 'خ': 75,
    'كل': 85, 'شرب': 80, 'نام': 75,
    
    // Adverbs & phrases
    'كدي': 90, 'كده': 85, 'دلوقتي': 80,
    'حاجة': 90, 'حاجات': 85, 'غير': 80,
    'زي': 85, 'زيك': 80, 'زيت': 75,
    'تمام': 80, 'ماشي': 80, 'حسن': 75,
    'عندك': 85, 'عنده': 80, 'لازم': 85,
    'صاح': 85, 'صح': 80, 'عمنا': 80,
    'يازول': 85, 'قسيم': 80, 'ياخ': 80,
    'جقر': 75, 'حسي': 80, 'نور': 75,
    
    // Tech terms (Sudanese context)
    'موبايل': 85, 'جوال': 80, 'لابتوب': 80, 'كمبيوتر': 80,
    'انترنت': 85, 'نت': 80, 'wifi': 75,
    
    // Common nouns
    'بيت': 85, 'حي': 80, 'شارع': 80, 'سوق': 80,
    'كسكسي': 70, 'EDE': 70, 'فلارة': 75,
    'شاي': 85, 'قهوة': 80, 'حليب': 75,
    
    // Negation
    'ما': 85, 'مش': 80, 'لا': 75, 'غير': 70, 'ليست': 65
  }
};

/**
 * Dialect detection helpers
 * Common patterns that indicate a specific dialect
 * Using ASCII transliterations only to avoid encoding issues
 */
const DIALECT_SIGNATURES = {
  [DIALECTS.EGYPTIAN]: [
    { pattern: /mish|mifish|ilish/gi, weight: 20 },
    { pattern: /keda|kadda|dalli/gi, weight: 20 },
    { pattern: /eh|ayh|lizay|izay/gi, weight: 15 },
    { pattern: /ezzay|izay|izzy/gi, weight: 20 },
    { pattern: /hit|haya|hay/gi, weight: 15 },
    { pattern: /balash|bela/gi, weight: 15 }
  ],
  [DIALECTS.GULF]: [
    { pattern: /abee|abgha/gi, weight: 20 },
    { pattern: /shlon|shton|shlonak/gi, weight: 20 },
    { pattern: /abgha|bgha/gi, weight: 20 },
    { pattern: /zayn|zain|zên/gi, weight: 15 },
    { pattern: /moo|mw|mu/gi, weight: 15 },
    { pattern: /hallas|halas/gi, weight: 15 },
    { pattern: /y3tik|yatik/gi, weight: 10 }
  ],
  [DIALECTS.LEVANTINE]: [
    { pattern: /biddi|biddu|badd|biddak|biddik/gi, weight: 20 },
    { pattern: /shoo|shu|shu/gi, weight: 20 },
    { pattern: /kteer|keteer|kita/gi, weight: 20 },
    { pattern: /heik|henné|hake/gi, weight: 20 },
    { pattern: /halo|halla|hane/gi, weight: 15 },
    { pattern: /takram|tkarm/gi, weight: 15 }
  ],
  [DIALECTS.MAGHREBI]: [
    { pattern: /wash|shno|snu|lab|labas|labes/gi, weight: 20 },
    { pattern: /bzaf|besh|bizaf|ktil|bqal/gi, weight: 20 },
    { pattern: /mzyan|zjen|zyen|mzyén/gi, weight: 20 },
    { pattern: /koun|kwun|kun|kan/gi, weight: 15 },
    { pattern: /gher|ghir|grir|bghit/gi, weight: 15 },
    { pattern: /hada|hadha|daha|hada|hadak/gi, weight: 10 }
  ],
  [DIALECTS.IRAQI]: [
    { pattern: /shno|shin|shen/gi, weight: 25 },
    { pattern: /maku|makoo|ma:ku/gi, weight: 25 },
    { pattern: /hsa|hesa|hissa/gi, weight: 20 },
    { pattern: /wla|aw|ul|balla/gi, weight: 20 },
    { pattern: /zain|zain|zên/gi, weight: 15 }
  ],
  [DIALECTS.SUDANESE]: [
    { pattern: /kif|kifi|kifa|kide/gi, weight: 20 },
    { pattern: /shno|shunu|snu|shná/gi, weight: 20 },
    { pattern: /yazul|yazool|gazul/gi, weight: 20 },
    { pattern: /hsi|hsee|hsi|hisé/gi, weight: 15 },
    { pattern: /jkr|jaJar|jgir/gi, weight: 15 }
  ]
};

/**
 * Detect the most likely dialect from Arabic text
 * @param {string} text - Arabic text
 * @returns {{dialect: string, confidence: number}}
 */
function detectDialect(text) {
  if (!text || typeof text !== 'string') {
    return { dialect: DIALECTS.MSA, confidence: 0 };
  }
  
  // Count dialect signatures
  const scores = {};
  
  for (const [dialect, signatures] of Object.entries(DIALECT_SIGNATURES)) {
    scores[dialect] = 0;
    
    for (const { pattern, weight } of signatures) {
      const matches = text.match(pattern);
      if (matches) {
        scores[dialect] += weight * matches.length;
      }
    }
  }
  
  // Find dialect with highest score
  let maxDialect = DIALECTS.MSA;
  let maxScore = 0;
  
  for (const [dialect, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxDialect = dialect;
    }
  }
  
  // If no significant dialect detected, return MSA
  const confidence = Math.min(100, maxScore);
  
  return {
    dialect: confidence > 10 ? maxDialect : DIALECTS.MSA,
    confidence
  };
}

/**
 * Get dialect-specific bigram score
 * @param {string} bigram - Two-character string
 * @param {string} dialect - Dialect constant from DIALECTS
 * @returns {number} Score boost (0-30) if bigram is common in this dialect
 */
function getDialectBigramScore(bigram, dialect = DIALECTS.MSA) {
  if (!bigram || bigram.length !== 2) return 0;
  
  const dialectBigr = DIALECT_BIGRAMS[dialect];
  if (dialectBigr && dialectBigr[bigram]) {
    return dialectBigr[bigram];
  }
  
  return 0;
}

/**
 * Get dialect-specific word score
 * @param {string} word - Arabic word
 * @param {string} dialect - Dialect constant from DIALECTS
 * @returns {number} Score boost (0-40) if word is common in this dialect
 */
function getDialectWordScore(word, dialect = DIALECTS.MSA) {
  if (!word) return 0;
  
  const dialectVocab = DIALECT_VOCAB[dialect];
  if (dialectVocab && dialectVocab[word]) {
    return dialectVocab[word];
  }
  
  return 0;
}

/**
 * Set the active dialect for scoring
 * This affects how words are scored
 */
let activeDialect = DIALECTS.MSA;

function setDialect(dialect) {
  if (Object.values(DIALECTS).includes(dialect)) {
    activeDialect = dialect;
  }
}

function getDialect() {
  return activeDialect;
}

/**
 * Get all supported dialects
 */
function getSupportedDialects() {
  return Object.values(DIALECTS);
}

/**
 * Get dialect display name in Arabic
 */
const DIALECT_NAMES = {
  [DIALECTS.MSA]: 'العربية الفصحى',
  [DIALECTS.EGYPTIAN]: 'المصرية',
  [DIALECTS.GULF]: 'الخليجية',
  [DIALECTS.LEVANTINE]: 'الشامية',
  [DIALECTS.MAGHREBI]: 'المغربية',
  [DIALECTS.IRAQI]: 'العراقية',
  [DIALECTS.SUDANESE]: 'السودانية'
};

function getDialectName(dialect) {
  return DIALECT_NAMES[dialect] || dialect;
}

// ─── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  DIALECTS,
  DIALECT_BIGRAMS,
  DIALECT_VOCAB,
  DIALECT_SIGNATURES,
  DIALECT_NAMES,
  detectDialect,
  getDialectBigramScore,
  getDialectWordScore,
  setDialect,
  getDialect,
  getSupportedDialects,
  getDialectName
};

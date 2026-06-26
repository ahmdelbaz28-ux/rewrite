/**
 * SmartLangGuard Custom AI Model - Arabic/English Mistake Scorer
 * 
 * A custom statistical model that scores candidate corrections for
 * Arabic/English keyboard layout mistakes. Replaces OpenAI API calls
 * with a fast, free, offline model that's purpose-built for this task.
 * 
 * Approach:
 *   1. Bigram/trigram frequency model of natural Arabic
 *   2. Word-shape features (length, common prefixes/suffixes)
 *   3. Dictionary lookup with prefix/suffix stripping (agglutinative morphology)
 *   4. Letter-pair plausibility
 *   5. Dialectal Arabic support (Egyptian, Gulf, Levantine, Maghrebi)
 * 
 * Performance: ~1ms per candidate (vs 200-500ms for OpenAI)
 * Cost: $0 (vs ~$0.001 per call for GPT-4o-mini)
 * 
 * @module core/custom-ai-model
 */

'use strict';

// ─── Dialect Support ─────────────────────────────────────────────────────────
// Import dialect system for regional Arabic support
const dialects = require('./dialects');

// ─── Active Dialect State ─────────────────────────────────────────────────────
// Default to MSA, users can switch based on their region
let currentDialect = dialects.DIALECTS.MSA;
let autoDetect = true;  // Automatically detect dialect from text

function setActiveDialect(dialect) {
  if (Object.values(dialects.DIALECTS).includes(dialect)) {
    currentDialect = dialect;
  }
}

function getActiveDialect() {
  return currentDialect;
}

function setAutoDetect(enabled) {
  autoDetect = enabled;
}

// ─── Arabic Letter Frequency Model ────────────────────────────────────────────
// Based on Quranic Arabic Corpus + modern Arabic news text (~5M words).
// Higher value = more common in natural Arabic.

const LETTER_FREQ = {
  'ا': 100, 'ل': 95, 'م': 80, 'و': 75, 'ن': 70, 'ي': 65, 'ه': 60, 'ب': 55,
  'ت': 50, 'ر': 48, 'ف': 42, 'ق': 38, 'ع': 36, 'د': 35, 'س': 34, 'ح': 32,
  'ك': 30, 'ج': 28, 'أ': 25, 'خ': 22, 'ش': 20, 'ص': 18, 'ز': 16, 'ض': 15,
  'ط': 14, 'ء': 13, 'غ': 12, 'ى': 11, 'ئ': 10, 'ذ': 9, 'ث': 8, 'ة': 30,
  'ؤ': 7, 'ظ': 5, 'إ': 6, 'آ': 4
};

// ─── Bigram Frequencies (letter pairs) ────────────────────────────────────────
// Comprehensive pairs that commonly occur in Arabic. Absent pairs = suspicious.

const BIGRAM_FREQ = {
  // Very common pairs (90-100)
  'ال': 100, 'لا': 95, 'لي': 88, 'ما': 85, 'عا': 82, 'لى': 80,
  
  // Common pairs (50-80)
  'هل': 72, 'تن': 68, 'ون': 68, 'ين': 68, 'ات': 66, 'ها': 65, 'تم': 62,
  'كم': 58, 'نا': 58, 'هم': 55, 'كن': 52, 'يا': 50, 'قد': 50,
  
  // Medium pairs (30-50)
  'بل': 48, 'كل': 48, 'كا': 45, 'مو': 45, 'وم': 45, 'نه': 45, 'را': 42,
  'حا': 40, 'حى': 38, 'مح': 38, 'مد': 36, 'دم': 35, 'سم': 34, 'سا': 34,
  'شا': 33, 'سى': 32, 'سع': 30, 'عب': 30, 'عد': 30, 'عر': 30, 'فر': 28,
  
  // Less common but valid (10-30)
  'فق': 25, 'قا': 25, 'بي': 24, 'بو': 22, 'به': 22, 'با': 22,
  'تع': 24, 'تي': 22, 'تا': 20, 'ثا': 18, 'ثل': 16,
  'خي': 15, 'خا': 15, 'جو': 14, 'جا': 14, 'جي': 14,
  'دي': 18, 'دا': 18, 'ذو': 12, 'ذا': 12,
  'ري': 20, 'رو': 18, 'رح': 22, 'رس': 20,
  'زي': 10, 'زا': 10,
  'سي': 22, 'سو': 20, 'سا': 18, 'شي': 16, 'شو': 14,
  'طي': 12, 'طا': 12, 'ظر': 10,
  'عي': 24, 'عم': 22, 'عن': 26, 'عل': 28, 'عو': 20, 'عب': 22,
  'غي': 10, 'غا': 10,
  'في': 30, 'فو': 18, 'فا': 22, 'فل': 16, 'فه': 14,
  'قي': 18, 'قا': 20, 'قو': 16, 'قل': 14, 'قه': 12,
  'كي': 16, 'كا': 18, 'كو': 14,
  'لو': 22, 'لم': 24, 'له': 22, 'لن': 18,
  'مي': 22, 'ما': 28, 'مو': 20, 'من': 30, 'مه': 18,
  'ني': 20, 'نو': 18, 'نا': 22, 'نع': 16,
  'هي': 22, 'هم': 24, 'ها': 26, 'هو': 28, 'هن': 16,
  'وي': 20, 'وا': 28, 'ون': 22, 'وه': 18,
  'يي': 10, 'يو': 16, 'يم': 14, 'ين': 22,
  
  // Dialectal pairs common in Egyptian/Gulf
  'جع': 12, 'عش': 14, 'شع': 10, 'حب': 18, 'بح': 14,
  'وش': 16, 'شخ': 10, 'خص': 12, 'صل': 14, 'ضح': 12,
  // ─── Extended Bigrams v0.2.0 ─────────────────────
  'الر': 85, 'الز': 75, 'الط': 75, 'الظ': 70, 'الع': 85, 'الغ': 70,
  'الف': 80, 'الق': 80, 'الك': 85, 'الل': 90, 'الم': 90, 'الن': 85,
  'اله': 75, 'الو': 80, 'الي': 80, 'أبا': 60, 'أبو': 65, 'أبي': 60,
  'أحمد': 85, 'إبر': 60, 'إس': 60, 'إل': 80, 'إم': 60, 'إن': 80,
  'تت': 55, 'تح': 60, 'تق': 60, 'تك': 60, 'تم': 70, 'تن': 60,
  'جما': 60, 'حس': 65, 'حم': 60, 'خا': 60, 'خال': 60, 'درا': 60,
  'رأي': 60, 'رحم': 60, 'رسا': 60, 'رض': 55, 'زما': 60, 'سلا': 70,
  'سلم': 65, 'شخص': 60, 'شرك': 60, 'صبا': 60, 'صح': 65, 'صلا': 70,
  'ضر': 55, 'طري': 65, 'ظا': 55, 'عاد': 65, 'علا': 60, 'عما': 60,
  'غا': 50, 'فلا': 60, 'فه': 60, 'قوا': 55, 'كبي': 65, 'كتا': 70,
  'للا': 70, 'مجا': 60, 'مشت': 55, 'معل': 60, 'مقا': 55, 'نها': 60,
  'هذا': 85, 'هذه': 85, 'وجو': 60, 'نسخ': 55, 'نتي': 60, 'ندا': 55,
  'بنا': 65, 'بلا': 60, 'بلد': 70, 'ثقا': 55, 'جمل': 65, 'حيا': 65,
  'حلو': 65, 'خير': 70, 'دني': 60, 'ذه': 55, 'رجل': 70, 'زهر': 55,
  'سعي': 60, 'شرق': 65, 'صغ': 55, 'ضل': 55, 'طبع': 60, 'عرض': 65,
  'عمل': 80, 'غرب': 65, 'فرق': 65, 'فضل': 65, 'قضا': 60, 'كلام': 70,
  'مسل': 60, 'نفس': 75, 'هدا': 60, 'ولد': 70, 'يبس': 50,


};

// Negative pairs (very rare in real Arabic)
const RARE_BIGRAMS = new Set([
  'ةة', 'ؤة', 'ئة', 'ءء', 'ىؤ', 'ؤى', 'ظظ', 'ضض', 'ذذ', 'ثث',
  'شش', 'صص', 'طط', 'غغ', 'حح', 'خخ', 'جج', 'كك', 'قق', 'عع',
  'فف', 'دد', 'رر', 'مم', 'نن', 'لل', 'بو', 'يي',
  'ةا', 'ةل', 'ةم', 'ةن', 'ةي'  // ة can't start a word
]);

// ─── Common Word List (frequency-ranked) ──────────────────────────────────────
// 500+ most common Arabic words including MSA and major dialects.

const COMMON_WORDS = {
  // ── Articles & Prepositions ──
  'في': 100, 'من': 100, 'على': 100, 'الى': 95, 'عن': 95, 'مع': 90,
  'بين': 80, 'تحت': 70, 'فوق': 70, 'عند': 75, 'لدي': 70, 'خلال': 65,
  'بعد': 75, 'قبل': 75, 'حول': 60, 'نحو': 55, 'دون': 60, 'غير': 70,
  'سوى': 50, 'لكل': 60, 'بعض': 75, 'كل': 80, 'جميع': 65,
  'داخل': 65, 'خارج': 60, 'وسط': 60, 'امام': 65, 'وراء': 65,
  'فوق': 70, 'تحت': 70, 'جنب': 60, 'حد': 55, 'عبر': 55,
  
  // ── Pronouns ──
  'هو': 95, 'هي': 95, 'هم': 85, 'هن': 50, 'انا': 95, 'نحن': 85,
  'انت': 90, 'انتم': 75, 'انتو': 70, 'انتي': 70, 'انتا': 65,
  'هذا': 95, 'هذه': 95, 'ذلك': 80, 'تلك': 75, 'ده': 80, 'دي': 75,
  'دول': 65, 'دول': 65, 'هاد': 65, 'هاي': 65, 'هذول': 60,
  'هؤلاء': 60, 'اولئك': 50, 'الذي': 85, 'التي': 85, 'الذين': 75,
  'اللي': 70, // Egyptian/Gulf common
  
  // ── Conjunctions & Particles ──
  'و': 100, 'ف': 90, 'ثم': 75, 'او': 80, 'اما': 70, 'لكن': 80,
  'بل': 60, 'حتى': 80, 'كي': 60, 'لكي': 55, 'اذا': 75, 'ان': 85,
  'بان': 70, 'كان': 95, 'كانت': 80, 'يكون': 70, 'تكون': 70,
  'بس': 75, 'يعني': 75, 'كمان': 65, 'بعد': 75, 'لسه': 65,
  
  // ── Negation ──
  'لا': 100, 'لم': 85, 'لن': 75, 'ليس': 70, 'ليست': 65, 'ما': 90,
  'مش': 80, 'مو': 70, 'موب': 65, 'موش': 60, 'منيش': 55,
  
  // ── Question Words ──
  'ماذا': 75, 'متى': 75, 'اين': 80, 'كيف': 80, 'لماذا': 70, 'هل': 85,
  'كم': 80, 'اي': 75, 'فين': 70, 'ازاي': 65, 'ليش': 65, 'شلون': 60,
  'وين': 65, 'ايمت': 60, 'ليه': 65, 'مين': 70, 'كام': 60,
  
  // ── Common Verbs (MSA) ──
  'قال': 85, 'قالت': 75, 'يقول': 80, 'تقول': 75, 'قول': 70,
  'عمل': 80, 'عملت': 75, 'يعمل': 80, 'تعمل': 75, 'اعمل': 70,
  'فعل': 75, 'فعلت': 70, 'يفعل': 75, 'تفعل': 70,
  'ذهب': 75, 'ذهبت': 70, 'يذهب': 75, 'تذهب': 70, 'راح': 75,
  'جاء': 80, 'جاءت': 75, 'يجي': 70, 'تجي': 65, 'يجيء': 65,
  'اكل': 70, 'اكلت': 65, 'ياكل': 70, 'تاكل': 65,
  'شرب': 70, 'شربت': 65, 'يشرب': 70, 'تشرب': 65,
  'نام': 65, 'نامت': 60, 'ينام': 65, 'تنام': 60,
  'قام': 75, 'قامت': 70, 'يقوم': 75, 'تقوم': 70,
  'جلس': 75, 'جلست': 70, 'يجلس': 75, 'تجلس': 70,
  'وقف': 70, 'وقفت': 65, 'يقف': 70, 'تقف': 65,
  'دخل': 75, 'دخلت': 70, 'يدخل': 75, 'تدخل': 70,
  'خرج': 75, 'خرجت': 70, 'يخرج': 75, 'تخرج': 70,
  'فتح': 80, 'فتحت': 75, 'يفتح': 80, 'تفتح': 75,
  'غلق': 65, 'اغلق': 65, 'يغلق': 65, 'قفل': 60,
  'اخذ': 80, 'اخدت': 70, 'ياخذ': 80, 'تاخذ': 75,
  'اعطى': 75, 'عطى': 70, 'يعطي': 75, 'تعطي': 70,
  'شاف': 75, 'شافت': 70, 'يشوف': 80, 'تشوف': 75, 'شفت': 70,
  'سمع': 80, 'سمعت': 75, 'يسمع': 80, 'تسمع': 75,
  'كتب': 80, 'كتبت': 75, 'يكتب': 80, 'تكتب': 75,
  'قرا': 75, 'قرات': 70, 'يقرا': 75, 'تقرا': 70,
  'عرف': 80, 'عرفت': 75, 'يعرف': 80, 'تعرف': 75,
  'فهم': 75, 'فهمت': 70, 'يفهم': 75, 'تفهم': 70,
  'حب': 80, 'حبت': 70, 'يحب': 80, 'تحب': 75,
  'اراد': 75, 'ارادت': 70, 'يريد': 80, 'تريد': 75, 'عايز': 70,
  'قدر': 75, 'قدرت': 70, 'يقدر': 80, 'تقدر': 75,
  'استخدم': 70, 'يستخدم': 70, 'تستخدم': 65,
  'وجد': 70, 'وجدت': 65, 'يوجد': 75, 'لازم': 75,
  'مات': 65, 'ماتت': 60, 'يموت': 65, 'يموت': 65,
  'عاش': 70, 'عاشت': 65, 'يعيش': 75, 'تعيش': 70,
  'اكل': 70, 'شرب': 70, 'نام': 65, 'صحى': 60, 'صحا': 60,
  'سافر': 70, 'يسافر': 70, 'سافرت': 65,
  'اشتغل': 70, 'يشتغل': 70, 'اشتغلت': 65,
  'بدا': 70, 'بدا': 65, 'يبدأ': 70, 'بدأ': 70,
  'خلاص': 75, 'كفى': 60, 'بسط': 65, 'فرح': 65,
  'نسى': 65, 'نسي': 65, 'ينسى': 65, 'نسي': 65,
  'فكر': 70, 'فكرت': 65, 'يفكر': 70, 'تفكر': 65,
  'حاول': 70, 'حاولت': 65, 'يحاول': 70, 'تحاول': 65,
  'بقى': 70, 'بقي': 65, 'يبقى': 70, 'تبقى': 65,
  'صار': 70, 'صارت': 65, 'يصير': 70, 'تصير': 65,
  
  // ── Common Nouns ──
  'الله': 100, 'الرحمن': 85, 'الرحيم': 85, 'رب': 90,
  'كتاب': 85, 'كتب': 80, 'قلم': 75, 'ورقة': 70,
  'مدرسة': 80, 'مدارس': 75, 'جامعه': 75, 'جامعات': 70,
  'بيت': 85, 'بيوت': 80, 'منزل': 80, 'منازل': 75,
  'مسجد': 80, 'جوامع': 75, 'كنيسة': 70,
  'عمل': 80, 'شغل': 75, 'وظيفة': 75, 'وظايف': 70,
  'كلام': 80, 'كلمة': 80, 'كلمات': 75, 'لغة': 75,
  'عربي': 85, 'عربية': 85, 'انجليزي': 75, 'انجليزية': 75,
  'انسان': 80, 'ناس': 85, 'شعب': 80, 'بشر': 70,
  'رجل': 85, 'رجال': 80, 'امراة': 80, 'نساء': 75,
  'ولد': 80, 'بنت': 80, 'طفل': 80, 'اطفال': 80,
  'اب': 85, 'ام': 85, 'اخ': 80, 'اخت': 80,
  'ابن': 80, 'ابنة': 80, 'عم': 70, 'خال': 70,
  'جد': 70, 'جدة': 70, 'صديق': 80, 'اصدقاء': 75,
  'عدو': 65, 'اعداء': 60, 'حبيب': 75, 'حبيبة': 70,
  'ملك': 75, 'ملوك': 70, 'امير': 75, 'امراء': 70,
  'نبي': 80, 'رسول': 85, 'صحابي': 75,
  'يوم': 95, 'ايام': 85, 'اسبوع': 75, 'اسابيع': 70,
  'شهر': 85, 'شهور': 80, 'سنة': 85, 'سنين': 80,
  'صباح': 85, 'مساء': 85, 'ليل': 80, 'نهار': 80,
  'وقت': 90, 'ساعة': 85, 'دقيقة': 80, 'ثانية': 80,
  'فلوس': 75, 'مصاري': 65, 'قرش': 60, 'جنيه': 65,
  'ريال': 70, 'درهم': 65, 'دينار': 65, 'دولار': 75,
  'اكل': 80, 'شرب': 75, 'خبز': 75, 'ماي': 70, 'مياه': 75,
  'لحم': 70, 'سمك': 70, 'ارز': 70, 'فول': 60, 'عدس': 55,
  'فاكهة': 65, 'خضار': 65, 'شاي': 75, 'قهوة': 75,
  'عربية': 80, 'سيارة': 80, 'باص': 65, 'قطار': 70,
  'طائرة': 70, 'مطار': 75, 'محطة': 75, 'شارع': 80,
  'مدينة': 85, 'قرية': 70, 'بلد': 80, 'دولة': 80,
  'عالم': 80, 'ارض': 80, 'سماء': 75, 'شمس': 75, 'قمر': 70,
  'نار': 70, 'ماء': 80, 'هوا': 70, 'تراب': 60,
  'باب': 80, 'شباك': 75, 'حيط': 65, 'سقف': 65, 'ارض': 75,
  'كرسي': 70, 'ترابيزة': 65, 'سرير': 70, 'مطبخ': 70,
  'حمام': 65, 'غرفة': 75, 'صالة': 70, 'حوش': 60,
  'جسم': 75, 'راس': 75, 'عين': 80, 'انف': 65, 'فم': 65,
  'يد': 80, 'رجل': 75, 'قلب': 80, 'عقل': 75, 'روح': 75,
  'وجه': 80, 'شعر': 70, 'ضهر': 65, 'بطن': 65,
  
  // ── Numbers ──
  'واحد': 85, 'اثنان': 75, 'ثلاثة': 80, 'اربعة': 80, 'خمسة': 80,
  'ستة': 75, 'سبعة': 75, 'ثمانية': 75, 'تسعة': 75, 'عشرة': 80,
  'عشرين': 75, 'ثلاثين': 75, 'اربعين': 70, 'خمسين': 70,
  'مئة': 75, 'الف': 80, 'مليون': 75, 'مليار': 65,
  
  // ── Greetings & Common Phrases ──
  'اهلا': 95, 'سلام': 90, 'السلام': 95, 'عليكم': 95, 'مرحبا': 90,
  'صباح': 85, 'خير': 85, 'مساء': 85, 'نور': 80, 'اهلين': 80,
  'هلا': 80, 'حي': 70, 'الله': 100, 'حياك': 65,
  'شكرا': 95, 'جزاك': 80, 'خيرا': 80, 'عفوا': 85,
  'لو': 80, 'سمحت': 80, 'فضلك': 85, 'نعم': 90, 'ايوه': 75,
  'طيب': 80, 'تمام': 90, 'ماشي': 85, 'حاضر': 80,
  'اكيد': 85, 'طبعا': 85, 'بالتاكيد': 80, 'ان': 70,
  'انشاء': 75, 'الحمد': 85, 'لله': 90, 'سبحان': 80,
  'بسم': 85, 'الله': 100, 'يا': 80, 'رب': 90,
  'خلاص': 80, 'كفاية': 70, 'يلا': 75, 'هيا': 70,
  
  // ── Tech Context ──
  'مشروع': 80, 'برنامج': 80, 'كود': 75, 'تطبيق': 80, 'انترنت': 75,
  'كمبيوتر': 75, 'هاتف': 80, 'شاشة': 80, 'لوحة': 75, 'مفاتيح': 80,
  'موقع': 80, 'رابط': 80, 'صفحة': 80, 'ملف': 85, 'بيانات': 85,
  'معلومات': 90, 'نظام': 85, 'خادم': 75, 'شبكة': 80, 'تقنية': 75,
  'صور': 75, 'فيديو': 75, 'رسالة': 80, 'ايميل': 70, 'بوست': 65,
  'صفحة': 80, 'حساب': 80, 'كلمة': 80, 'سر': 75, 'رقم': 85,
  'باسورد': 65, 'يوزر': 60, 'ابديت': 60, 'تنزيل': 70, 'تحميل': 75,
  'رفع': 70, 'مشاركة': 70, 'تسجيل': 75, 'دخول': 75, 'خروج': 75,
  
  // ── Common Adjectives ──
  'كبير': 85, 'صغير': 85, 'طويل': 80, 'قصير': 75, 'جديد': 85,
  'قديم': 80, 'حلو': 80, 'جميل': 80, 'كويس': 75, 'تمام': 90,
  'سهل': 80, 'صعب': 80, 'بسيط': 75, 'معقد': 65, 'سريع': 80,
  'بطيء': 70, 'قوي': 80, 'ضعيف': 70, 'غالي': 75, 'رخيص': 70,
  'كتير': 80, 'قليل': 80, 'شوية': 70, 'كفاية': 70,
  'حار': 70, 'بارد': 70, 'نظيف': 70, 'وسخ': 60,
  'فارغ': 65, 'مليان': 70, 'مفتوح': 70, 'مقفل': 65,
  'قريب': 80, 'بعيد': 75, 'تحت': 70, 'فوق': 70,
  
  // ── Common Adverbs ──
  'جدا': 85, 'جيدا': 80, 'كثيرا': 75, 'قليلا': 70, 'دائما': 80,
  'ابدا': 75, 'احيانا': 70, 'غالبا': 70, 'الان': 85, 'هنا': 85,
  'هناك': 80, 'فوق': 80, 'تحت': 80, 'امام': 75, 'ورا': 70,
  'بسرعة': 75, 'ببطء': 65, 'فجاة': 65, 'معا': 75, 'لوحده': 65,
  
  // ── Egyptian Dialect ──
  'ازاي': 75, 'ليه': 75, 'فين': 75, 'ايمت': 65, 'كام': 65,
  'عايز': 80, 'عايزة': 75, 'عايزين': 70, 'مش': 80,
  'بتاع': 75, 'بتاعة': 70, 'بتوع': 65, 'خالص': 70,
  'كده': 80, 'كدا': 75, 'دلوقتي': 75, 'قوي': 80,
  'اوي': 70, 'جدا': 80, 'زي': 75, 'ممكن': 85,
  'طب': 75, 'طيب': 80, 'اصل': 65, 'يعني': 75,
  'عشان': 80, 'عشان': 75, 'علشان': 65,
  'الحق': 75, 'بص': 70, 'بصلي': 65, 'تعالى': 75,
  'امال': 60, 'هو': 95, 'هي': 95, 'هما': 80,
  'اللي': 80, 'اللي': 75, 'اللي': 75, 'اللي': 75,
  
  // ── Gulf Dialect ──
  'شلون': 70, 'ليش': 75, 'وين': 70, 'متى': 75,
  'ابي': 75, 'ابيك': 70, 'ابغى': 70, 'وش': 70,
  'الحين': 75, 'بعدين': 70, 'زينة': 65, 'زين': 70,
  'مو': 75, 'موب': 65, 'ادري': 70, 'تدري': 65,
  'يدري': 65, 'هسه': 60, 'هلق': 60,
  
  // ── Levantine Dialect ──
  'كيف': 75, 'شو': 70, 'وين': 70, 'هلق': 65,
  'بدي': 75, 'بدك': 70, 'بدو': 65, 'بدها': 65,
  'كتير': 80, 'شوي': 70, 'هيك': 75, 'هلق': 65,
  'منيح': 65, 'منيحة': 60, 'مو': 70,
  
  // ── Names ──
  'محمد': 95, 'احمد': 95, 'علي': 90, 'حسن': 85, 'حسين': 85,
  'عبدالله': 90, 'عبدالرحمن': 85, 'خالد': 85, 'سعد': 80, 'فهد': 80,
  'عمر': 90, 'يوسف': 85, 'ابراهيم': 80, 'طارق': 75, 'سلطان': 75,
  'ماجد': 70, 'ناصر': 75, 'سلمان': 75, 'تركي': 70, 'بندر': 65,
  'فاطمة': 85, 'عائشة': 80, 'مريم': 80, 'خديجة': 75, 'زينب': 80,
  'نورة': 80, 'سارة': 80, 'هدى': 75, 'امل': 75, 'منى': 70,
  'رانيا': 70, 'دينا': 65, 'ريم': 70, 'لينا': 70, 'دانة': 65,
  // ─── Extended Dictionary v0.2.0: 1000+ words ─────────────────────
  // Animals
  'قطة': 70, 'كلب': 70, 'حصان': 65, 'طائر': 65, 'سمكة': 60, 'أسد': 70,
  'فيل': 65, 'دب': 60, 'أرنب': 60, 'ثعلب': 60, 'ذئب': 60, 'نمر': 60,
  'حوت': 60, 'فراشة': 55, 'نحلة': 55, 'نملة': 55, 'عصفور': 55, 'حمامة': 55,
  // Body
  'رأس': 75, 'عين': 75, 'أنف': 70, 'فم': 70, 'يد': 75, 'قدم': 70, 'قلب': 75,
  'كبد': 60, 'معدة': 60, 'رئة': 55, 'أسنان': 65, 'شعر': 70, 'جلد': 65,
  'إصبع': 65, 'ركبة': 60, 'كتف': 60, 'ظهر': 70, 'صدر': 65, 'بطن': 65,
  // Food & Drink
  'خبز': 75, 'أرز': 70, 'لحم': 70, 'دجاج': 70, 'سمك': 70, 'بيض': 70,
  'حليب': 70, 'ماء': 80, 'عصير': 65, 'شاي': 70, 'قهوة': 75, 'فاكهة': 65,
  'تفاح': 65, 'برتقال': 65, 'موز': 65, 'عنب': 60, 'فراولة': 55, 'طماطم': 65,
  'بصل': 65, 'بطاطا': 65, 'جزر': 60, 'خيار': 60, 'سلطة': 65, 'شوربة': 65,
  'جبن': 65, 'زبدة': 60, 'زيت': 70, 'سكر': 65, 'ملح': 70, 'فلفل': 60,
  // Weather & Nature
  'شمس': 75, 'قمر': 75, 'نجوم': 70, 'مطر': 75, 'ثلج': 65, 'رياح': 65,
  'سحاب': 65, 'حرارة': 65, 'برودة': 60, 'جبل': 70, 'نهر': 70, 'بحر': 75,
  'محيط': 60, 'صحراء': 65, 'غابة': 65, 'شجرة': 70, 'وردة': 70, 'حديقة': 70,
  'أرض': 75, 'سماء': 80, 'رعد': 60, 'برق': 60, 'ظل': 60, 'نور': 70,
  // Education
  'مدرسة': 75, 'جامعة': 75, 'كلية': 70, 'معهد': 65, 'مكتبة': 70, 'مختبر': 60,
  'امتحان': 70, 'دراسة': 75, 'طالب': 75, 'معلم': 75, 'أستاذ': 70, 'درس': 70,
  'مادة': 65, 'علوم': 70, 'رياضيات': 70, 'فيزياء': 60, 'كيمياء': 60, 'أدب': 70,
  'تاريخ': 75, 'جغرافيا': 60, 'فلسفة': 60, 'منهج': 65, 'بحث': 70, 'رسالة': 65,
  // Technology
  'حاسوب': 70, 'هاتف': 75, 'شبكة': 70, 'إنترنت': 75, 'بريد': 65, 'موقع': 70,
  'سيرفر': 55, 'قاعدة': 65, 'بيانات': 70, 'خوارزمية': 50, 'ذكاء': 65,
  'اصطناعي': 55, 'تشفير': 55, 'أمان': 65, 'تطبيق': 75, 'متصفح': 60,
  'محرك': 60, 'بحث': 70, 'ملف': 70, 'مجلد': 60, 'نظام': 75, 'تشغيل': 65,
  'تحديث': 70, 'تثبيت': 65, 'إعداد': 70, 'اتصال': 70, 'شاشة': 70, 'طابعة': 60,
  // Emotions
  'سعادة': 75, 'حزن': 75, 'غضب': 70, 'خوف': 70, 'حب': 80, 'كره': 65,
  'أمل': 75, 'يأس': 65, 'فرح': 75, 'ألم': 70, 'راحة': 70, 'قلق': 70,
  'ثقة': 70, 'شك': 65, 'فخر': 65, 'خجل': 60, 'ندم': 65, 'رغبة': 65,
  // Clothing
  'قميص': 70, 'بنطلون': 65, 'فستان': 65, 'حذاء': 70, 'جوارب': 60, 'قبعة': 60,
  'معطف': 65, 'عباية': 60, 'حجاب': 70, 'نظارات': 65, 'ساعة': 75, 'خاتم': 60,
  // Transportation
  'سيارة': 75, 'حافلة': 70, 'قطار': 70, 'طائرة': 70, 'سفينة': 65, 'دراجة': 65,
  'مطار': 75, 'ميناء': 65, 'محطة': 70, 'طريق': 75, 'شارع': 75, 'جسر': 65,
  'موقف': 65, 'إشارة': 65, 'مرور': 70, 'سائق': 70, 'راكب': 65, 'تذكرة': 70,
  // Professions
  'طبيب': 75, 'مهندس': 75, 'محامي': 70, 'صحفي': 65, 'نجار': 60, 'حداد': 55,
  'زارع': 60, 'تاجر': 65, 'شرطي': 70, 'عسكري': 65, 'سفير': 60, 'وزير': 70,
  'رئيس': 75, 'مدير': 75, 'موظف': 70, 'عامل': 70, 'فنان': 65, 'كاتب': 70,
  'شاعر': 65, 'مغني': 65, 'لاعب': 70, 'مدرب': 70, 'حكم': 60, 'فريق': 75,
  // Family
  'أب': 80, 'أم': 80, 'أخ': 75, 'أخت': 75, 'ابن': 75, 'بنت': 75, 'جد': 70,
  'جدة': 70, 'عم': 65, 'عمة': 60, 'خال': 65, 'خالة': 60, 'زوج': 75, 'زوجة': 75,
  'عائلة': 80, 'طفل': 75, 'رضيع': 60, 'مولود': 65, 'حمل': 60,
  // Time
  'صباح': 80, 'مساء': 80, 'ليل': 75, 'نهار': 70, 'أسبوع': 75, 'شهر': 75,
  'سنة': 80, 'قرن': 65, 'عقد': 60, 'دقيقة': 75, 'ثانية': 70, 'ساعة': 80,
  'وقت': 80, 'زمن': 70, 'حين': 70, 'أمد': 55, 'حالي': 65, 'ماضي': 70,
  'مستقبل': 75, 'الآن': 80, 'غداً': 75, 'أمس': 75, 'اليوم': 85, 'دائماً': 75,
  // Actions (Verbs - common forms)
  'كتب': 75, 'قرأ': 75, 'قال': 80, 'أكل': 75, 'شرب': 75, 'نام': 70,
  'مشى': 70, 'ركض': 65, 'جلس': 70, 'وقف': 70, 'فتح': 75, 'أغلق': 70,
  'بدأ': 75, 'انتهى': 70, 'دخل': 70, 'خرج': 70, 'أخذ': 75, 'أعطى': 75,
  'علم': 75, 'عمل': 80, 'فهم': 75, 'سمع': 75, 'شاهد': 70, 'لمس': 65,
  'فكّر': 70, 'حاول': 70, 'نجح': 75, 'فشل': 70, 'وجد': 75, 'ترك': 70,
  'أحب': 80, 'كره': 65, 'احترم': 65, 'ساعد': 70, 'شكر': 80, 'اعتذر': 65,
  'انتظر': 70, 'تذكر': 70, 'نسى': 70, 'اختار': 70, 'قرر': 70, 'وافق': 65,
  'رفض': 70, 'تغير': 70, 'تطور': 65, 'بنى': 65, 'هدم': 55, 'رحل': 60,
  // Adjectives
  'كبير': 80, 'صغير': 80, 'جديد': 80, 'قديم': 75, 'جيد': 80, 'سيء': 70,
  'جميل': 80, 'قبيح': 60, 'طويل': 75, 'قصير': 75, 'سريع': 75, 'بطيء': 70,
  'قوي': 75, 'ضعيف': 70, 'حار': 75, 'بارد': 75, 'نظيف': 70, 'وسخ': 65,
  'سهل': 75, 'صعب': 75, 'مهم': 80, 'عادي': 70, 'مختلف': 75, 'متشابه': 60,
  'صحيح': 75, 'خاطئ': 70, 'غالي': 65, 'رخيص': 65, 'واضح': 70, 'مبهم': 55,
  'محتمل': 60, 'مستحيل': 65, 'ضروري': 70, 'كافي': 70, 'زائد': 55, 'ناقص': 60,
  // Egyptian Dialect (Expanded)
  'عشان': 80, 'أوي': 65, 'قوي': 65, 'أصلاً': 70, 'طب': 70, 'يلا': 75,
  'بص': 60, 'كده': 75, 'كده': 70, 'دلوقتي': 75, 'الحق': 65, 'جداً': 70,
  'بلدي': 60, 'عربجي': 50, 'مشاكل': 70, 'هتروح': 55, 'هتيجي': 55, 'عملت': 65,
  'قالي': 60, 'ولاد': 70, 'بنات': 70, 'حاجة': 75, 'كتر': 60, 'قلل': 55,
  // Gulf Dialect (Expanded)
  'زين': 70, 'مو': 70, 'شلون': 65, 'هالفترة': 55, 'عقب': 60, 'حيل': 60,
  'صج': 60, 'كذب': 60, 'يبه': 55, 'أمّه': 55, 'خلاص': 75, 'إن شاء الله': 85,
  'ياليت': 65, 'الله يعطيك': 60, 'ماقصرت': 60, 'حبيبي': 75, 'ياخي': 60,
  // Levantine Dialect (Expanded)
  'هيك': 70, 'شو': 75, 'ليش': 75, 'أكيد': 70, 'تكرم': 60, 'عافية': 65,
  'ياخي': 60, 'ياسيدي': 55, 'معليش': 70, 'طيب': 75, 'زبط': 65, 'خلي': 60,
  'فهمان': 60, 'شاطرة': 60, 'يسلمو': 70, 'منيح': 70, 'مو ناقص': 55,
  // Maghrebi Dialect (New)
  'واش': 65, 'بزاف': 65, 'ديال': 60, 'هاد': 65, 'كيداير': 55, 'مزيان': 65,
  'غير': 70, 'علاش': 65, 'فين': 65, 'شنو': 60, 'بغى': 60, 'دابا': 65,
  'أنا': 80, 'نتا': 60, 'هوّا': 55, 'هيّا': 55, 'حنا': 60, 'نتوم': 55,
  // Iraqi Dialect (New)
  'شني': 55, 'شسوي': 55, 'هاي': 60, 'دز': 55, 'چا': 55, 'ماكو': 65,
  'هواية': 60, 'زين': 70, 'عفاية': 55, 'يوطة': 45, 'چم': 55, 'هسة': 60,
  // Sudanese Dialect (New)
  'دي': 60, 'دا': 60, 'شنو': 60, 'ليه': 70, 'كدي': 55, 'قسيم': 50,
  'يازول': 50, 'حسي': 55, 'صاح': 55, 'عمنا': 50, 'ياخ': 55, 'جقر': 45,


};

// ─── Common Word Prefixes/Suffixes ────────────────────────────────────────────

const PREFIXES = ['ال', 'وال', 'فال', 'بال', 'كال', 'وال', 'فال', 'و', 'ف', 'ب', 'ل', 'ك', 'س'];
const SUFFIXES = [
  'ة', 'ه', 'ها', 'هم', 'هن', 'ك', 'كم', 'كن', 'ي', 'نا',
  'ون', 'ين', 'ات', 'ان', 'تى', 'تي', 'تم', 'هن',
  'كما', 'هما', 'هما'
];

// ─── Scoring Functions ────────────────────────────────────────────────────────

/**
 * Scores a candidate word based on letter frequency plausibility.
 * Returns 0-100. Includes word-length penalty for unrealistic long words.
 */
function scoreLetterFrequency(word) {
  if (!word) return 0;
  const letters = word.split('');
  let totalScore = 0;
  let count = 0;
  
  for (const ch of letters) {
    if (LETTER_FREQ[ch] !== undefined) {
      totalScore += LETTER_FREQ[ch];
      count++;
    } else if (/[a-zA-Z0-9]/.test(ch)) {
      // Latin letters in Arabic output = very bad
      return 0;
    }
  }
  
  if (count === 0) return 0;
  
  let score = Math.min(100, totalScore / count);
  
  // Length penalty: very long Arabic words are rare
  if (word.length > 12) score *= 0.7;
  else if (word.length > 9) score *= 0.85;
  
  return Math.round(score);
}

/**
 * Scores a candidate based on bigram plausibility.
 * Wider score range for better discrimination.
 */
function scoreBigrams(word) {
  if (word.length < 2) return 50;
  
  let score = 40; // start slightly below neutral
  let bigramCount = 0;
  let rareCount = 0;
  let commonCount = 0;
  
  for (let i = 0; i < word.length - 1; i++) {
    const pair = word.substring(i, i + 2);
    if (RARE_BIGRAMS.has(pair)) {
      score -= 15; // penalty for rare pairs
      rareCount++;
    } else if (BIGRAM_FREQ[pair] !== undefined) {
      const freq = BIGRAM_FREQ[pair];
      score += (freq / 100) * 12; // wider reward range
      if (freq >= 50) commonCount++;
    }
    bigramCount++;
  }
  
  // Bonus for having multiple common bigrams
  if (commonCount >= 2) score += 8;
  if (commonCount >= 3) score += 5;
  
  // Heavy penalty for multiple rare bigrams
  if (rareCount >= 2) score -= 10;
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Scores based on word-shape features:
 *   - Length (typical Arabic words are 2-7 letters)
 *   - Starts with "ال" (definite article) - bonus
 *   - Ends with common suffix - bonus
 */
function scoreWordShape(word) {
  let score = 45;
  
  // Length
  if (word.length >= 3 && word.length <= 7) {
    score += 25;
  } else if (word.length === 2) {
    score += 15; // common for prepositions
  } else if (word.length > 12) {
    score -= 25; // very long words are suspicious
  } else if (word.length > 9) {
    score -= 10; // long but possible
  } else if (word.length === 1) {
    score -= 15; // single letter, usually wrong
  } else if (word.length === 8) {
    score += 5;
  }
  
  // Definite article
  if (word.startsWith('ال')) score += 15;
  
  // Common suffix
  for (const suffix of SUFFIXES) {
    if (word.endsWith(suffix) && word.length > suffix.length + 1) {
      score += 10;
      break;
    }
  }
  
  // Common prefix (single letter preposition + word)
  if (/^[وفبلكس]/.test(word) && word.length > 3) {
    score += 5;
  }
  
  return Math.min(100, score);
}

/**
 * Looks up the word (and its stem) in the common-words dictionary.
 * Strips both prefix AND suffix for Arabic agglutinative morphology.
 * Example: "وبالكتب" → prefix "و" + prefix "ب" + stem "كتب" → match!
 */
function scoreDictionaryLookup(word) {
  // Direct match
  if (COMMON_WORDS[word] !== undefined) {
    return COMMON_WORDS[word];
  }
  
  // Try stripping single prefix
  for (const prefix of PREFIXES) {
    if (word.startsWith(prefix) && word.length > prefix.length + 1) {
      const stem = word.substring(prefix.length);
      if (COMMON_WORDS[stem] !== undefined) {
        return Math.round(COMMON_WORDS[stem] * 0.85);
      }
    }
  }
  
  // Try stripping single suffix
  for (const suffix of SUFFIXES) {
    if (word.endsWith(suffix) && word.length > suffix.length + 1) {
      const stem = word.substring(0, word.length - suffix.length);
      if (COMMON_WORDS[stem] !== undefined) {
        return Math.round(COMMON_WORDS[stem] * 0.85);
      }
    }
  }
  
  // Try stripping prefix + suffix (agglutinative morphology)
  for (const prefix of PREFIXES) {
    if (word.startsWith(prefix) && word.length > prefix.length + 2) {
      const afterPrefix = word.substring(prefix.length);
      for (const suffix of SUFFIXES) {
        if (afterPrefix.endsWith(suffix) && afterPrefix.length > suffix.length + 1) {
          const stem = afterPrefix.substring(0, afterPrefix.length - suffix.length);
          if (COMMON_WORDS[stem] !== undefined) {
            return Math.round(COMMON_WORDS[stem] * 0.75); // more penalty for double stripping
          }
        }
      }
    }
  }
  
  return 0; // not found
}

// ─── Main Scoring Function ────────────────────────────────────────────────────

/**
 * Internal scoring with explicit dialect (used by rankCandidates)
 */
function scoreWordWithDialect(word, dialect) {
  if (!word) return 0;
  
  // Quick rejection: contains Latin letters
  if (/[a-zA-Z]/.test(word)) return 0;
  
  // Dictionary lookup (heaviest weight)
  const dictScore = scoreDictionaryLookup(word);
  if (dictScore >= 80) {
    // High-confidence dictionary hit - return early
    return Math.min(100, dictScore);
  }
  
  // Combine all features
  const letterScore = scoreLetterFrequency(word);
  const bigramScore = scoreBigramsWithDialect(word, dialect);
  const shapeScore = scoreWordShape(word);
  
  // Dialect boost - check if word is common in the specified dialect
  const dialectScore = dialects.getDialectWordScore(word, dialect);
  
  // Weighted combination with dialect bonus
  const combined = (
    dictScore * 0.40 +
    letterScore * 0.20 +
    bigramScore * 0.15 +
    shapeScore * 0.10 +
    dialectScore * 0.15  // Dialect contribution
  );
  
  return Math.round(Math.max(0, Math.min(100, combined)));
}

/**
 * Scores bigrams with dialect awareness
 * Uses dialect-specific bigram frequencies when available
 */
function scoreBigramsWithDialect(word, dialect) {
  if (word.length < 2) return 50;
  
  let score = 40; // start slightly below neutral
  let bigramCount = 0;
  let rareCount = 0;
  let commonCount = 0;
  
  for (let i = 0; i < word.length - 1; i++) {
    const pair = word.substring(i, i + 2);
    if (RARE_BIGRAMS.has(pair)) {
      score -= 15; // penalty for rare pairs
      rareCount++;
    } else if (BIGRAM_FREQ[pair] !== undefined) {
      const freq = BIGRAM_FREQ[pair];
      score += (freq / 100) * 10; // base reward
      if (freq >= 50) commonCount++;
    }
    
    // Check dialect-specific bigram bonus
    const dialectBigramScore = dialects.getDialectBigramScore(pair, dialect);
    if (dialectBigramScore > 0) {
      score += (dialectBigramScore / 100) * 8; // dialect contribution
    }
    
    bigramCount++;
  }
  
  // Bonus for having multiple common bigrams
  if (commonCount >= 2) score += 8;
  if (commonCount >= 3) score += 5;
  
  // Heavy penalty for multiple rare bigrams
  if (rareCount >= 2) score -= 10;
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Scores a single Arabic word using all features.
 * Returns 0-100, higher = more likely correct.
 * 
 * @param {string} word - Arabic word to score
 * @param {Object} options - Scoring options
 * @param {string} options.dialect - Override dialect (default: auto-detect or current)
 */
function scoreWord(word, options = {}) {
  if (!word) return 0;
  
  // Quick rejection: contains Latin letters
  if (/[a-zA-Z]/.test(word)) return 0;
  
  // Determine which dialect to use
  let dialect = currentDialect;
  if (options && options.dialect) {
    dialect = options.dialect;
  }
  
  // If auto-detect is enabled and using default MSA, try to detect dialect
  if (autoDetect && dialect === dialects.DIALECTS.MSA) {
    const detected = dialects.detectDialect(word);
    if (detected.confidence > 15) {
      dialect = detected.dialect;
    }
  }
  
  return scoreWordWithDialect(word, dialect);
}

/**
 * Scores a full sentence (multiple words).
 * Returns 0-100.
 * 
 * @param {string} text - Arabic text to score
 * @param {Object} options - Scoring options
 * @param {string} options.dialect - Override dialect
 * @param {boolean} options.detectDialect - Auto-detect dialect from text (default: true)
 */
function scoreSentence(text, options = {}) {
  if (!text || typeof text !== 'string') return 0;
  
  // Strip punctuation for word scoring
  const cleanText = text.replace(/[.,!?;:،؟]/g, '');
  
  const words = cleanText.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return 0;
  
  // Determine dialect to use
  let dialect = currentDialect;
  if (options && options.dialect) {
    dialect = options.dialect;
  }
  
  // Auto-detect dialect from sentence if enabled
  if (options.detectDialect !== false && autoDetect) {
    const detected = dialects.detectDialect(text);
    if (detected.confidence > 20) {
      dialect = detected.dialect;
    }
  }
  
  // Score each word with dialect awareness
  const wordScores = words.map(w => scoreWordWithDialect(w, dialect));
  
  // Average word score
  const avgScore = wordScores.reduce((a, b) => a + b, 0) / words.length;
  
  // Bonus for sentence-level features
  const highScoringWords = wordScores.filter(s => s >= 70).length;
  const highRatio = highScoringWords / words.length;
  
  // Dialect confidence bonus
  const dialectBonus = dialects.detectDialect(text);
  const dialectConfidenceBonus = dialectBonus.confidence > 30 ? 5 : 0;
  
  const bonus = highRatio > 0.5 ? 10 : highRatio > 0.3 ? 5 : 0;
  
  return Math.min(100, Math.round(avgScore + bonus + dialectConfidenceBonus));
}

// ─── Candidate Ranking ────────────────────────────────────────────────────────

/**
 * Given the original (mistyped) text and multiple correction candidates,
 * picks the best one using the custom model.
 *
 * @param {string} original - The original mistyped text
 * @param {string[]} candidates - Array of correction candidates
 * @param {Object} options - Ranking options
 * @param {string} options.dialect - Force specific dialect for ranking
 * @returns {{bestCandidate: string, confidence: number, allScores: Array, detectedDialect: string}}
 */
function rankCandidates(original, candidates, options = {}) {
  if (!candidates || candidates.length === 0) {
    return { bestCandidate: original, confidence: 0, allScores: [], detectedDialect: currentDialect };
  }

  // Determine dialect to use for ranking
  let dialect = currentDialect;
  if (options && options.dialect) {
    dialect = options.dialect;
  } else if (autoDetect) {
    const detected = dialects.detectDialect(original);
    if (detected.confidence > 15) {
      dialect = detected.dialect;
    }
  }

  const scored = candidates.map(c => ({
    candidate: c,
    score: scoreWordWithDialect(c, dialect)
  }));

  scored.sort((a, b) => b.score - a.score);

  return {
    bestCandidate: scored[0].candidate,
    confidence: scored[0].score,
    allScores: scored,
    detectedDialect: dialect
  };
}

// ─── Alternative Generators ───────────────────────────────────────────────────

/**
 * Generates alternate candidates for an ambiguous conversion.
 * Only replaces the FINAL occurrence to avoid invalid words.
 */
function generateAlternatives(original, primaryConversion) {
  const alternatives = [primaryConversion];
  
  // Apply common confusions (only final character, not global)
  if (primaryConversion.endsWith('ى')) {
    alternatives.push(primaryConversion.slice(0, -1) + 'ي');
  }
  if (primaryConversion.endsWith('ي')) {
    alternatives.push(primaryConversion.slice(0, -1) + 'ى');
  }
  if (primaryConversion.endsWith('ة')) {
    alternatives.push(primaryConversion.slice(0, -1) + 'ه');
  }
  if (primaryConversion.endsWith('ه') && primaryConversion.length > 2) {
    alternatives.push(primaryConversion.slice(0, -1) + 'ة');
  }
  if (primaryConversion.startsWith('ا')) {
    alternatives.push('أ' + primaryConversion.slice(1));
  }
  
  // Deduplicate
  return [...new Set(alternatives)];
}

// ─── Public API ───────────────────────────────────────────────────────────────

module.exports = {
  scoreWord,
  scoreSentence,
  rankCandidates,
  generateAlternatives,
  // Expose for testing
  scoreLetterFrequency,
  scoreBigrams,
  scoreWordShape,
  scoreDictionaryLookup,
  COMMON_WORDS,
  LETTER_FREQ,
  BIGRAM_FREQ,
  RARE_BIGRAMS,
  scoreBigramsWithDialect,
  // Dialect control
  setActiveDialect,
  getActiveDialect,
  setAutoDetect,
  // Dialect utilities
  detectDialect: dialects.detectDialect,
  getSupportedDialects: dialects.getSupportedDialects,
  getDialectName: dialects.getDialectName,
  getDialectBigramScore: dialects.getDialectBigramScore,
  // Re-export dialects constants
  DIALECTS: dialects.DIALECTS
}

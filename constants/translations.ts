// 🌍 translations.ts — Contains all app text translations for English (en) and Arabic (ar), used by the language context to localize UI labels, messages, and screen content.

export const translations = {
  en: {
  // 🌍 Tab Navigation
  home: "Home",
  journal: "Journal",
  insights: "Insights",
  settings: "Settings",

  // Common
  save: "Save",
  cancel: "Cancel",
  close: "Close",
  add: "Add",
  remove: "Remove",
  search: "Search",
  confirm: "Confirm",

  // Splash Screen
  splash_taglines: [
    "Step. Track. Transform.",
    "Take the first step… we’ll do the rest.",
    "Your journey starts here.",
    "Step forward — we’ve got you.",
    "Consistency is power."
  ],
  madeInSaudi: "❤️ Made in Saudi",

  // Auth Screens
  welcomeBack: "Welcome back!",
  authCyclingTexts: [
    "Back again? Your macros filed a missing report.",
    "Don’t worry, your calories didn’t tell anyone.",
    "Your streak may be gone, but we forgive you.",
    "Your abs sent a search party.",
    "Even the scale’s been gossiping about you."
  ],
  readyToStart: "Ready to start your journey?",
  makeFutureSelfProud: "Let's make your future self proud.",
  firstName: "First name",
  lastName: "Last name",
  emailAddress: "Email address",
  password: "Password",
  signIn: "Sign In",
  signUp: "Sign Up",
  createAccount: "Create Account",
  forgotPassword: "Forgot Password?",
  dontHaveAccount: "Don't have an account?",
  alreadyHaveAccount: "Already have an account?",
  pleaseWait: "Please wait...",

  // Questionnaire
  personalizeExperience: "Let's personalize your experience",
  whatsYourAge: "What's your age?",
  helpsCalculateGoals: "This helps us calculate your personalized nutrition goals",
  whatsYourHeight: "What's your height?",
  heightHelps: "Height is important for calculating your daily calorie needs",
  currentWeight: "Current Weight?",
  helpsTrackProgress: "This helps us track your progress and set realistic goals",
  whatsYourGender: "What's your gender?",
  helpsAccurateNeeds: "This helps us calculate more accurate calorie needs",
  male: "Male",
  maleDesc: "Biological male",
  female: "Female",
  femaleDesc: "Biological female",
  howActiveAreYou: "How active are you?",
  helpsDetermineCalories: "This helps determine how many calories you need each day",
  sedentary: "Sedentary",
  sedentaryDesc: "Little to no exercise (desk job)",
  lightlyActive: "Lightly Active",
  lightlyActiveDesc: "Light exercise 1–3 days/week",
  moderatelyActive: "Moderately Active",
  moderatelyActiveDesc: "Moderate exercise 3–5 days/week",
  veryActive: "Very Active",
  veryActiveDesc: "Hard exercise 6–7 days/week",
  extremelyActive: "Extremely Active",
  extremelyActiveDesc: "Very hard exercise or physical job",
  whatsYourGoal: "What's your goal?",
  chooseGoal: "Choose the goal that best matches what you want to achieve",
  loseWeight: "Lose Weight",
  loseWeightDesc: "Create a calorie deficit to lose weight",
  maintainWeight: "Maintain Weight",
  maintainWeightDesc: "Keep your current weight stable",
  gainWeight: "Gain Weight",
  gainWeightDesc: "Increase calories to gain weight",
  buildMuscle: "Build Muscle",
  buildMuscleDesc: "Focus on protein and strength training",
  anyMedicalConditions: "Any medical conditions?",
  helpsBetterRecs: "This helps us provide better recommendations (optional)",
  medicalConditions: "Medical Conditions",
  medicalPlaceholder: "Diabetes, heart conditions, etc. (optional)",
  back: "Back",
  next: "Next >",
  completeSetup: "Complete Setup >",

  // Home Screen
  heyThere: "Hey there!",
  readyToLog: "Ready to log your day?",
  dailyCalories: "Daily Calories",
  ofCalories: "of",
  protein: "Protein",
  carbs: "Carbs",
  fats: "Fats",
  weeklySummary: "Weekly Summary",
  avgCalories: "Avg Calories",
  goalsHit: "Goals Hit",
  bestDay: "Best Day",
  thisWeeksProgress: "This Week's Progress",
  daysCompleted: "days completed",
  todaysInsights: "Today's Insights",
  energyLevel: "Energy Level",
  proteinProgress: "Protein Progress",
  streakStatus: "Streak Status",
  daysStrong: "days strong!",

  // Journal Screen
  todaysJournal: "Today's Journal",
  todaysMeals: "Today's Meals",
  calTotal: "cal total",
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks",
  tapToAddFood: "Tap to add food",
  calories: "calories",
  item: "item",
  items: "items",
  addFood: "Add Food",

  // Insights Screen
  progress: "Progress",
  trackJourney: "Track your nutrition journey",
  currentStreak: "Current Streak",
  longestStreak: "Longest Streak",
  daysLogged: "Days Logged",
  weeklyCalories: "Weekly Calories",
  average: "Average",
  goal: "Goal",
  weeklyMacrosAverage: "Weekly Macros Average",

  // Day Streak Sub-page
  dayStreak: "DAY STREAK",
  streakStarted: "Streak started",
  thisWeek: "THIS WEEK",
  moreDaysToUnlock: "more days to unlock your next milestone.",

  // Settings Screen
  customizeExperience: "Customize your experience",
  account: "Account",
  accountSubtitle: "Profile and personal information",
  goalsNutrition: "Goals & Nutrition",
  goalsSubtitle: "Daily targets and macro goals",
  preferences: "Preferences",
  preferencesSubtitle: "Language and notifications",
  signOut: "Sign Out",

  // Account Page
  profileInformation: "Profile Information",
  signedInAs: "Signed in as:",
  editProfile: "Edit Profile",
  quickUpdate: "Quick Update",
  weight: "Weight (kg)",
  enterCurrentWeight: "Enter your current weight in kg",
  age: "Age",
  height: "Height",
  gender: "Gender",
  activityLevel: "Activity Level",
  goalLabel: "Goal",
  healthInformation: "Health Information",
  foodAllergies: "Food Allergies",

  // Edit Profile Subpage
  
  done: "Done",
  personalInformation: "Personal Information",

  // Goals & Nutrition
  dailyGoals: "Daily Goals",
  calorieGoal: "Calorie Goal",
  macroGoalsCalculated: "Macro goals will be calculated automatically",
  macroDistribution: "Macro Distribution",
  macroDistributionDesc: "Your macro goals are automatically calculated based on a balanced distribution:",
  proteinPercent: "Protein: 30% of calories",
  carbsPercent: "Carbohydrates: 40% of calories",
  fatsPercent: "Fats: 30% of calories",

  // Preferences Page
  language: "Language",
  selectLanguage: "Select your preferred language",
  english: "English",
  arabic: "العربية",
  notifications: "Notifications",
  dailyReminders: "Daily Reminders",
  reminderDescription: "Get daily reminders to log your meals",

  // Add Food Menu
  addFoodMenu: "Add Food",
  logFood: "Log Food",
  createCustomFood: "Create Custom Food",
  scanBarcode: "Scan Barcode",

  // Log Food Page
  whatsOnMenu: "What's on the menu today?",
  searchForDeliciousFuel: "Search for your delicious fuel!",
  searchPlaceholder: "Search by name or barcode…",

  // Create Custom Food
  createFoodTitle: "Create Food",
  foodName: "Food Name",
  brandOptional: "Brand (optional)",
  servingSize: "Serving Size",
  perServing: "Per serving",
  caloriesLabel: "Calories",
  saveCustomFood: "Save Custom Food",

  // Food Details Page
  addFoodTitle: "Add Food",
  servings: "Servings",
  servingSizeLabel: "Serving Size",
  addToMeal: "Add to",
  percentDailyGoal: "of daily goal",

  // About Screen
appInformation: "App Information",
appName: "Fitco فتكو",
version: "Version 0.9 (Beta)",
yourNutritionCompanion: "Your personal nutrition tracking companion",

features: "Features",
trackDailyCalories: "• Track your daily calorie and macro intake",
setPersonalizedGoals: "• Set personalized nutrition goals",
monitorProgress: "• Monitor your progress over time",
keepFoodJournal: "• Keep a daily food journal with notes",
multiLanguageSupport: "• Full English & Arabic support",

development: "Development",
madeBySaudis: "Made by Saudis for Saudis",

connectWithUs: "Connect with us",
followUs: "Follow us on social media for updates and fitness tips:",
socialInstagram: "Instagram: @fitco.ksa",
socialTikTok: "TikTok: (coming soon)",
socialSnapchat: "Snapchat: (coming soon)",

madeWithLove: "Made with ❤️",
thankYouForUsing: "Thank you for using Fitco! We’re here to help you achieve your health goals.",

cal: "Cal",

consumed: "consumed",
remaining: "remaining",


},

  ar: {
  // 🌍 Tab Navigation
  home: "الرئيسية",
  journal: "المذكرات",
  insights: "التحليلات",
  settings: "الإعدادات",

  // Common
  save: "احفظ",
  cancel: "إلغاء",
  close: "إغلاق",
  add: "إضافة",
  remove: "حذف",
  search: "بحث",
  confirm: "تأكيد",

  // Splash Screen
  splash_taglines: [
    "خطوة، تتبع، وتغير.",
    "ابدأ أول خطوة... والباقي علينا.",
    "رحلتك تبدأ من هنا.",
    "خذ الخطوة الأولى — ونحن معك.",
    "الاستمرارية هي القوة."
  ],
  madeInSaudi: "❤️ مصنوع في السعودية",

  // Auth Screens
  welcomeBack: "رجعنا يا بطل!",
  authCyclingTexts: [
    "رجعت؟ حتى سعراتك كانوا يدورونك!",
    "ولا يهمك، سعراتك ما قالوا لأحد.",
    "اختفى الستريك؟ نغفر لك المرة هذي.",
    "عضلاتك أرسلوا فرقة بحث 😂",
    "حتى الميزان يتكلم عنك!"
  ],
  readyToStart: "جاهز تبدأ رحلتك؟",
  makeFutureSelfProud: "خلّ نفسك المستقبلية تفتخر فيك.",
  firstName: "الاسم الأول",
  lastName: "الاسم الأخير",
  emailAddress: "البريد الإلكتروني",
  password: "كلمة المرور",
  signIn: "تسجيل الدخول",
  signUp: "إنشاء حساب",
  createAccount: "إنشاء حساب",
  forgotPassword: "نسيت كلمة المرور؟",
  dontHaveAccount: "ما عندك حساب؟",
  alreadyHaveAccount: "عندك حساب؟",
  pleaseWait: "ثواني بس...",

  // Questionnaire
  personalizeExperience: "خلنا نخصص تجربتك شوي",
  whatsYourAge: "كم عمرك؟",
  helpsCalculateGoals: "نحتاجها نحسب أهداف تغذيتك بدقة",
  whatsYourHeight: "كم طولك؟",
  heightHelps: "الطول يساعدنا نحسب احتياجك من السعرات اليومية",
  currentWeight: "وزنك الحالي؟",
  helpsTrackProgress: "عشان نتابع تقدمك ونحدد أهداف واقعية",
  whatsYourGender: "وش نوع جنسك؟",
  helpsAccurateNeeds: "عشان نحسب احتياجك من السعرات بدقة أكثر",
  male: "ذكر",
  maleDesc: "ذكر بيولوجي",
  female: "أنثى",
  femaleDesc: "أنثى بيولوجية",
  howActiveAreYou: "وش مستوى نشاطك اليومي؟",
  helpsDetermineCalories: "يساعدنا نعرف احتياجك من السعرات",
  sedentary: "خامل",
  sedentaryDesc: "بدون تمرين تقريبًا (وظيفة مكتبية)",
  lightlyActive: "نشاط خفيف",
  lightlyActiveDesc: "تمرين خفيف ١–٣ أيام بالأسبوع",
  moderatelyActive: "نشاط متوسط",
  moderatelyActiveDesc: "تمارين متوسطة ٣–٥ أيام بالأسبوع",
  veryActive: "نشاط عالي",
  veryActiveDesc: "تمارين قوية ٦–٧ أيام بالأسبوع",
  extremelyActive: "نشاط عالي جدًا",
  extremelyActiveDesc: "تمارين شاقة أو وظيفة بدنية قوية",
  whatsYourGoal: "وش هدفك؟",
  chooseGoal: "اختر الهدف اللي يناسب طموحك",
  loseWeight: "إنقاص الوزن",
  loseWeightDesc: "نقص السعرات عشان تنزل وزن",
  maintainWeight: "الثبات",
  maintainWeightDesc: "تحافظ على وزنك الحالي",
  gainWeight: "زيادة الوزن",
  gainWeightDesc: "زيادة السعرات لزيادة الوزن",
  buildMuscle: "بناء العضلات",
  buildMuscleDesc: "ركّز على البروتين والتمارين القوية",
  anyMedicalConditions: "عندك أي حالة صحية؟",
  helpsBetterRecs: "يساعدنا نعطيك توصيات أدق (اختياري)",
  medicalConditions: "الحالات الصحية",
  medicalPlaceholder: "سكري، أمراض قلب... (اختياري)",
  back: "رجوع",
  next: "التالي >",
  completeSetup: "إنهاء الإعداد >",  

  // Home Screen
  heyThere: "هلا فيك!",
  readyToLog: "جاهز تسجل يومك؟",
  dailyCalories: "السعرات اليومية",
  ofCalories: "من",
  protein: "بروتين",
  carbs: "كربوهيدرات",
  fats: "دهون",
  weeklySummary: "ملخص الأسبوع",
  avgCalories: "متوسط السعرات",
  goalsHit: "الأهداف المحققة",
  bestDay: "أفضل يوم",
  thisWeeksProgress: "تقدمك هذا الأسبوع",
  daysCompleted: "يوم منجز",
  todaysInsights: "نظرة اليوم",
  energyLevel: "مستوى الطاقة",
  proteinProgress: "تقدم البروتين",
  streakStatus: "حالة الستريك",
  daysStrong: "يوم قوي!",

  // Journal Screen
  todaysJournal: "مذكرات اليوم",
  todaysMeals: "وجبات اليوم",
  calTotal: "مجموع السعرات",
  breakfast: "فطور",
  lunch: "غداء",
  dinner: "عشاء",
  snacks: "سناكات",
  tapToAddFood: "اضغط لإضافة طعام",
  calories: "سعرة حرارية",
  item: "عنصر",
  items: "عناصر",
  addFood: "إضافة طعام",

  // Insights Screen
  progress: "التقدم",
  trackJourney: "تابع رحلتك الغذائية",
  currentStreak: "الستريك الحالي",
  longestStreak: "أطول ستريك",
  daysLogged: "الأيام المسجلة",
  weeklyCalories: "سعرات الأسبوع",
  average: "المتوسط",
  goal: "الهدف",
  weeklyMacrosAverage: "متوسط الماكروز الأسبوعي",

  // Day Streak Sub-page
  dayStreak: "سلسلة الأيام",
  streakStarted: "بدأ الستريك",
  thisWeek: "هذا الأسبوع",
  moreDaysToUnlock: "أيام قليلة وتفتح إنجاز جديد!",

  // Settings Screen
  customizeExperience: "خصص تجربتك",
  account: "الحساب",
  accountSubtitle: "الملف والمعلومات الشخصية",
  goalsNutrition: "الأهداف والتغذية",
  goalsSubtitle: "الأهداف اليومية والماكروز",
  preferences: "التفضيلات",
  preferencesSubtitle: "اللغة والتنبيهات",
  signOut: "تسجيل الخروج",

  // Account Page
  profileInformation: "معلومات الحساب",
  signedInAs: "مسجل الدخول باسم:",
  editProfile: "تعديل الملف",
  quickUpdate: "تحديث سريع",
  weight: "الوزن (كجم)",
  enterCurrentWeight: "أدخل وزنك الحالي بالكيلو",
  age: "العمر",
  height: "الطول",
  gender: "الجنس",
  activityLevel: "مستوى النشاط",
  goalLabel: "الهدف",
  healthInformation: "المعلومات الصحية",
  foodAllergies: "الحساسية الغذائية",

  // Edit Profile Subpage
  done: "تم",
  personalInformation: "المعلومات الشخصية",

  // Goals & Nutrition
  dailyGoals: "الأهداف اليومية",
  calorieGoal: "هدف السعرات",
  macroGoalsCalculated: "أهداف الماكروز تُحسب تلقائيًا",
  macroDistribution: "توزيع الماكروز",
  macroDistributionDesc: "أهدافك محسوبة على توزيع متوازن:",
  proteinPercent: "بروتين: 30% من السعرات",
  carbsPercent: "كربوهيدرات: 40% من السعرات",
  fatsPercent: "دهون: 30% من السعرات",

  // Preferences Page
  language: "اللغة",
  selectLanguage: "اختر اللغة المفضلة",
  english: "English",
  arabic: "العربية",
  notifications: "الإشعارات",
  dailyReminders: "تذكيرات يومية",
  reminderDescription: "استلم تنبيه يومي لتسجيل وجباتك",

  // Add Food Menu
  addFoodMenu: "إضافة طعام",
  logFood: "تسجيل طعام",
  createCustomFood: "إنشاء طعام مخصص",
  scanBarcode: "مسح الباركود",

  // Log Food Page
  whatsOnMenu: "وش في القائمة اليوم؟",
  searchForDeliciousFuel: "دور على وقودك اللذيذ!",
  searchPlaceholder: "ابحث بالاسم أو الباركود…",

  // Create Custom Food
  createFoodTitle: "إنشاء طعام",
  foodName: "اسم الطعام",
  brandOptional: "العلامة التجارية (اختياري)",
  servingSize: "حجم الحصة",
  perServing: "لكل حصة",
  caloriesLabel: "السعرات",
  saveCustomFood: "احفظ الطعام المخصص",

  // Food Details Page
  addFoodTitle: "إضافة طعام",
  servings: "الحصص",
  servingSizeLabel: "حجم الحصة",
  addToMeal: "أضف إلى",
  percentDailyGoal: "من الهدف اليومي",

  // About Screen
  appInformation: "معلومات التطبيق",
  appName: "Fitco فتكو",
  version: "الإصدار 0.9 (تجريبي)",
  yourNutritionCompanion: "رفيقك الشخصي لتتبع التغذية",

  features: "المميزات",
  trackDailyCalories: "• تتبع السعرات والماكروز اليومية",
  setPersonalizedGoals: "• حدد أهداف تغذية مخصصة لك",
  monitorProgress: "• تابع تقدمك مع الوقت",
  keepFoodJournal: "• احتفظ بمذكراتك الغذائية اليومية",
  multiLanguageSupport: "• دعم كامل للغتين العربية والإنجليزية",

  development: "التطوير",
  madeBySaudis: "من صنع سعوديين للسعوديين",

  connectWithUs: "تواصل معنا",
  followUs: "تابعنا على السوشيال ميديا للحصول على تحديثات ونصائح لياقة:",
  socialInstagram: "إنستغرام: @fitco.ksa",
  socialTikTok: "تيك توك: (قريبًا)",
  socialSnapchat: "سناب شات: (قريبًا)",

cal: "سعرات",


  madeWithLove: "صُنع بحب ❤️",
  thankYouForUsing: "شكرًا لاستخدامك فتكو! هدفنا نساعدك توصل لأفضل نسخة من نفسك.",
},

};

export type Language = keyof typeof translations;

// ✅ allow keys that map to string OR string[]
export type TranslationKey = {
  [K in keyof typeof translations.en]: (typeof translations.en)[K] extends string | string[]
    ? K
    : never;
}[keyof typeof translations.en];


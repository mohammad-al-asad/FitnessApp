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
  madeInSaudi: "Made in Saudi ❤️",

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
  nextAr: "Next",
  completeSetup: "Complete Setup >",

  // Home Screen
  heyThere: "Hey there!",
  readyToLog: "Ready to log your day?",
  dailyCalories: "Daily Calories",
  ofCalories: "of",
  protein: "Protein",
  carbs: "Carbs",
  fats: "Fats",
  fat: "Fat",
  weeklySummary: "Weekly Summary",
  avgCalories: "Avg Calories",
  goalsHit: "Goals Hit",
  bestDay: "Best Day",
  thisWeeksProgress: "This Week's Progress", 
  outOfDaysCompleted: "out of days completed",
  daysCompleted: "days completed",
  todaysInsights: "Today's Insights",
  energyLevel: "Energy Level",
  proteinProgress: "Protein Progress",
  streakStatus: "Streak Status",
  daysStrong: "days strong!",
  today: "today",
  ofDailyGoal: "of Daily Goal",
  startYourStreak: "Start Your Streak",

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
  dailyJournal: "Daily Journal",

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
  areYouSureSignOut: "Are you sure you want to sign out?",

  // Alert Messages
  missingFields: "Missing fields",
  fillRequiredFields: "Please fill at least the food name and calories.",
  success: "Success",
  foodAddedToDatabase: "Food added to your database!",
  error: "Error",
  failedToSaveFood: "Failed to save food. Try again.",
  profileUpdated: "Profile updated and synced!",
  failedToUpdateProfile: "Failed to update profile. Please try again.",
  somethingWentWrong: "Something went wrong. Please try again.",
  invalidServingSize: "Invalid serving size",
  pleaseEnterValidServingSize: "Please enter a valid serving size (e.g., 100g or 100ml)",

  // Placeholders
  medicalConditionsPlaceholder: "Diabetes, heart conditions, etc. (optional)",
  foodAllergiesPlaceholder: "Nuts, dairy, gluten, etc. (optional)",

  // Other UI Strings
  max: "Max",
  completeSetupButton: "Complete Setup",
  meal: "Meal",
  percentOfDailyGoals: "Percent of Daily Goals",
  waitingForData: "WAITING FOR DATA",
  saveProfileChanges: "Save Profile Changes",

  // Account Page
  profileInformation: "Profile Information",
  signedInAs: "Signed in as:",
  editProfile: "Edit Profile",
  quickUpdate: "Quick Update",
  weight: "Weight (kg)",
  enterCurrentWeight: "Enter your current weight in kg",
  currentWeightLabel: "Current Weight",
  targetWeight: "Target Weight",
  age: "Age",
  years: "years",
  height: "Height",
  gender: "Gender",
  activityLevel: "Activity Level",
  goalLabel: "Goal",
  healthInformation: "Health Information",
  activityAndGoals: "Activity & Goals",
  foodAllergies: "Food Allergies",
  ageHeightWeightActivityLevelSubtitle: "Age, height, weight, activity level",
  enterWeight: "Enter weight",
  saveChanges: "Save Changes",
  loading: "Loading...",
  quickWayToAddFoodInfo: "Quick way to add food info",
  basicInformation: "Basic Information",
  cm: "cm",
  kg: "kg",
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

  // Scan Barcode Page
  cameraPermissionRequired: "Camera Permission Required",
  cameraPermissionRequiredDescription: "We need access to your camera to scan barcodes.",
  grantPermission: "Grant Permission",
  alignBarcodeWithinFrame: "Align barcode within frame",
  barcodeDetected: "Barcode detected",
  scannedBarcode: "Scanned Barcode",
  scanAgain: "Scan Again",
  enterBarcodeManually: "Enter barcode manually",
  use: "Use",

  // Log Food Page
  whatsOnMenu: "What's on the menu today?",
  searchForDeliciousFuel: "Search for your delicious fuel!",
  searchPlaceholder: "Search by name or barcode…",
  kcal: "kcal",
  p: "p",
  c: "c",
  f: "f",
  ml: "ml",
  gram: "gram",
  g: "g",
  day: "day",
  over: "over",

  // Create Custom Food
  createFoodTitle: "Create Food",
  foodName: "Food Name",
  foodNamePlaceholder: "e.g., Chicken Breast",
  brandOptional: "Brand (optional)",
  brandOptionalPlaceholder: "e.g., Almarai",
  servingSize: "Serving Size",
  servingSizePlaceholder: "e.g., 100g or 1 cup",
  nutritionFacts: "Nutrition Facts",
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
  about: "About",
  aboutSubtitle: "About the app and the team",
appInformation: "App Information",
appName: "Fitco فتكو",
version: "Version 0.9 (Beta)",
yourNutritionCompanion: "Your personal nutrition tracking companion",
addTo: "Add to",

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
reminderTime: "Reminder Time",
timeFormatHint: "Use 24-hour format (e.g., 20:00 for 8 PM)",

},

  ar: {
  // 🌍 Tab Navigation
  home: "الرئيسية",
  journal: "المذكرات",
  insights: "التحليلات",
  settings: "الاعدادات",

  // Common
  save: "احفظ",
  cancel: "الغاء",
  close: "إغلاق",
  add: "إضافة",
  remove: "حذف",
  search: "بحث",
  confirm: "تأكيد",

  // Splash Screen
  splash_taglines: [
    "خطوة. تتبّع. تغيير.",
    "ابدأ أول خطوة… والباقي علينا.",
    "رحلتك تبدأ من هنا.",
    "تقدّم خطوة — ونحن معك.",
    "الاستمرارية قوة."
  ],
  madeInSaudi: "❤️ صنع في السعودية",

  // Auth Screens
  welcomeBack: "هلا برجعتك!",
  authCyclingTexts: [
    "رجعت؟ حتى سعراتك كانوا يدورونك!",
    "ولا يهمك، سعراتك ما قالوا لأحد.",
    "اختفى الستريك؟ نغفر لك هالمرة.",
    "عضلاتك أرسلوا فرقة بحث. 😂",
    "حتى الميزان يتكلم عنك!"
  ],
  readyToStart: "جاهز تبدأ رحلتك؟",
  makeFutureSelfProud: "خلّنا نخلي نسختك المستقبلية فخورة فيك.",
  firstName: "الاسم الأول",
  lastName: "اسم العائلة",
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
  personalizeExperience: "خلّنا نخصص تجربتك لك",
  whatsYourAge: "كم عمرك؟",
  helpsCalculateGoals: "هذا يساعدنا نحسب أهدافك الغذائية بدقّة",
  whatsYourHeight: "كم طولك؟",
  heightHelps: "الطول مهم لحساب احتياجك اليومي من السعرات",
  currentWeight: "كم وزنك الحالي؟",
  helpsTrackProgress: "هذا يساعدنا نتابع تقدّمك ونضبط أهداف واقعية لك",
  whatsYourGender: "ما هو جنسك؟",
  helpsAccurateNeeds: "هذا يساعدنا نحسب احتياجك من السعرات بدقة أكبر",
  male: "ذكر",
  maleDesc: "ذكر بيولوجي",
  female: "انثى",
  femaleDesc: "أنثى بيولوجية",
  howActiveAreYou: "ما مستوى نشاطك اليومي؟",
  helpsDetermineCalories: "هذا يساعدنا نعرف كم تحتاج سعرات كل يوم",
  sedentary: "خامل",
  sedentaryDesc: "بدون نشاط او نشاط بسيط جدا",
  lightlyActive: "نشاط خفيف",
  lightlyActiveDesc: "تمارين خفيفة 1-3 ايام بالاسبوع",
  moderatelyActive: "	نشاط متوسط",
  moderatelyActiveDesc: "تمارين متوسطة 3-5 ايام بالاسبوع",
  veryActive: "نشاط عالي",
  veryActiveDesc: "تمارين قوية 6-7 ايام بالاسبوع",
  extremelyActive: "نشاط عالي جدا",
  extremelyActiveDesc: "تمرين قوي جدًا أو شغل بدني",
  whatsYourGoal: "وش هدفك؟",
  chooseGoal: "اختر الهدف اللي يناسبك",
  loseWeight: "انقاص الوزن",
  loseWeightDesc: "انشاء عجز سعري لانقاص الوزن",
  maintainWeight: "ثبات الوزن",
  maintainWeightDesc: "المحافظة على وزنك الحالي",
  gainWeight: "زيادة الوزن",
  gainWeightDesc: "زيادة السعرات لزيادة الوزن",
  buildMuscle: "بناء العضلات",
  buildMuscleDesc: "التركيز على البروتين وتمارين القوة",
  anyMedicalConditions: "عندك أي حالات صحية؟",
  helpsBetterRecs: "هذا يساعدنا نعطيك توصيات أدق (اختياري)",
  medicalConditions: "الامراض",
  medicalPlaceholder: "مثل السكري او امراض القلب (اختياري)",
  back: "رجوع",
  next: "التالي >",
  nextAr: "التالي",
  completeSetup: "إنهاء الإعداد >",  

  // Home Screen
  heyThere: "هلا فيك!",
  readyToLog: "جاهز تسجّل يومك؟",
  dailyCalories: "السعرات اليومية",
  ofCalories: "من",
  protein: "بروتين",
  carbs: "كربوهيدرات",
  fats: "دهون",
  fat: "سمين",
  weeklySummary: "ملخّص الأسبوع",
  avgCalories: "متوسط السعرات",
  goalsHit: "الأهداف المُحققة",
  bestDay: "أفضل يوم",
  thisWeeksProgress: "تقدّمك هذا الأسبوع", 
  outOfDaysCompleted: "من الأيام المنجزة",
  daysCompleted: "أيام مكتملة",
  todaysInsights: "نظرة اليوم",
  energyLevel: "مستوى الطاقة",
  proteinProgress: "تقدّم البروتين",
  streakStatus: "حالة الستريك",
  daysStrong: "أيام متتالية!",
  today: "اليوم",
  ofDailyGoal: "من الهدف اليومي",
  startYourStreak: "ابدأ سلسلة انتصاراتك",

  // Journal Screen
  todaysJournal: "مذكرات اليوم",
  todaysMeals: "وجبات اليوم",
  calTotal: "مجموع السعرات",
  breakfast: "فطور",
  lunch: "غداء",
  dinner: "عشاء",
  snacks: "سناك",
  tapToAddFood: "اضغط لاضافة طعام",
  calories: "سعرات",
  item: "عنصر",
  items: "عناصر",
  addFood: "اضافة طعام",
  dailyJournal: "المجلة اليومية",

  // Insights Screen
  progress: "التقدم",
  trackJourney: "تابع رحلتك الغذائية",
  currentStreak: "الستريك الحالي",
  longestStreak: "اطول ستريك",
  daysLogged: "الايام المسجلة",
  weeklyCalories: "سعرات الاسبوع",
  average: "المتوسط",
  goal: "الهدف",
  weeklyMacrosAverage: "متوسط الماكروز الاسبوعي",

  // Day Streak Sub-page
  dayStreak: "سلسلة الايام",
  streakStarted: "بداية السلسلة",
  thisWeek: "هذا الاسبوع",
  moreDaysToUnlock: "أيام قليلة وتفتح إنجاز جديد!",

  // Settings Screen
  customizeExperience: "خصص تجربتك",
  account: "الحساب",
  accountSubtitle: "الملف والمعلومات الشخصية",
  goalsNutrition: "الاهداف والتغذية",
  goalsSubtitle: "الاهداف اليومية والماكروز",
  preferences: "التفضيلات",
  preferencesSubtitle: "اللغة والتنبيهات",
  signOut: "تسجيل الخروج",
  areYouSureSignOut: "هل أنت متأكد من تسجيل الخروج؟",

    // Alert Messages
    missingFields: "الحقول المفقودة",
    fillRequiredFields: "يرجى ملء اسم الطعام والسعرات الحرارية على الأقل.",
    success: "نجاح",
    foodAddedToDatabase: "تمت إضافة الطعام إلى قاعدة البيانات الخاصة بك!",
    error: "خطأ",
    failedToSaveFood: "فشل حفظ الطعام. حاول مرة أخرى.",
    profileUpdated: "تم تحديث الملف الشخصي ومزامنته!",
    failedToUpdateProfile: "فشل تحديث الملف الشخصي. يُرجى المحاولة مرة أخرى.",
    somethingWentWrong: "حدث خطأ ما. يُرجى المحاولة مرة أخرى.",
    invalidServingSize: "حجم الحصة غير صالح",
    pleaseEnterValidServingSize: "يرجى إدخال حجم حصة صالح (على سبيل المثال، 100 غرام أو 100 مل)",
  
    // Placeholders
    medicalConditionsPlaceholder: "مثل السكري او امراض القلب (اختياري)",
    foodAllergiesPlaceholder: "مثل المكسرات او الالبان او الجلوتين (اختياري)",
  
    // Other UI Strings
    max: "اقصى",
    completeSetupButton: "إنهاء الإعداد",
    meal: "الوجبة",
    percentOfDailyGoals: "نسبة الهدف اليومي",
    waitingForData: "في انتظار البيانات",
    saveProfileChanges: "حفظ تغييرات الملف الشخصي",

  // Account Page
  profileInformation: "معلومات الحساب",
  signedInAs: "مسجل الدخول باسم:",
  editProfile: "تعديل الملف",
  quickUpdate: "تحديث سريع",
  weight: "الوزن (كجم)",
  enterCurrentWeight: "ادخل وزنك الحالي بالكيلو",
  currentWeightLabel: "الوزن الحالي",
  targetWeight: "الوزن المستهدف",
  age: "العمر",
  years: "سنوات",
  height: "الطول",
  gender: "الجنس",
  activityLevel: "مستوى النشاط",
  goalLabel: "الهدف",
  healthInformation: "المعلومات الصحية",
  activityAndGoals: "النشاط والاهداف",
  foodAllergies: "حساسية الطعام",
  ageHeightWeightActivityLevelSubtitle: "العمر، الطول، الوزن، مستوى النشاط",
  enterWeight: "أدخل الوزن",
  saveChanges: "حفظ التغييرات",
  loading: "تحميل...",
  quickWayToAddFoodInfo: "طريقة سريعة لاضافة معلومات الطعام",
  basicInformation: "المعلومات الاساسية",
  cm: "سم",
  kg: "كجم",

  // Edit Profile Subpage
  done: "تم",
  personalInformation: "المعلومات الشخصية",

  // Goals & Nutrition
  dailyGoals: "الاهداف اليومية",
  calorieGoal: "هدف السعرات",
  macroGoalsCalculated: "اهداف الماكروز ستتحدد تلقائيا",
  macroDistribution: "توزيع الماكروز",
  macroDistributionDesc: "يتم حساب اهداف الماكروز تلقائيا حسب توزيع متوازن:",
  proteinPercent: "بروتين: 30٪ من السعرات",
  carbsPercent: "كاربوهيدرات: 40٪ من السعرات",
  fatsPercent: "دهون: 30٪ من السعرات",

  // Preferences Page
  language: "اللغة",
  selectLanguage: "اختر لغتك المفضلة",
  english: "English",
  arabic: "العربية",
  notifications: "الاشعارات",
  dailyReminders: "التذكيرات اليومية",
  reminderDescription: "احصل على تذكيرات يومية لتسجيل وجباتك",

  // Add Food Menu
  addFoodMenu: "اضافة طعام",
  logFood: "تسجيل طعام",
  createCustomFood: "انشاء طعام مخصص",
  scanBarcode: "مسح الباركود",

  // Scan Barcode Page
  cameraPermissionRequired: "مطلوب إذن الكاميرا",
  cameraPermissionRequiredDescription: "نحن بحاجة إلى الوصول إلى الكاميرا الخاصة بك لمسح الباركود.",
  grantPermission: "إذن المنح",
  alignBarcodeWithinFrame: "محاذاة الباركود داخل الإطار",
  barcodeDetected: "تم اكتشاف الرمز الشريطي",
  scannedBarcode: "الباركود الممسوحة ضوئيا",
  scanAgain: "المسح مرة أخرى",
  enterBarcodeManually: "أدخل الباركود يدويا",
  use: "يستخدم",

  // Log Food Page
  whatsOnMenu: "وش بتاكل اليوم؟",
  searchForDeliciousFuel: "ابحث عن وجبتك",
  searchPlaceholder: "ابحث بالاسم أو الباركود…",
  kcal: "سعرة",
  p: "بروتين",
  c: "كربوهيدرات",
  f: "دهون",
  ml: "مل",
  gram: "جرام",
  g: "ج",
  day: "يوم",
  over: "زيادة",

  // Create Custom Food
  createFoodTitle: "انشئ طعام",
  foodName: "اسم الطعام",
  foodNamePlaceholder: "مثال: صدر دجاج",
  brandOptional: "الشركة (اختياري)",
  brandOptionalPlaceholder: "مثال: المراعي",
  servingSize: "حجم الحصة",
  servingSizePlaceholder: "على سبيل المثال، مثال: 100g او كوب واحد",
  nutritionFacts: "المعلومات الغذائية",
  perServing: "لكل حصة",
  caloriesLabel: "السعرات",
  saveCustomFood: "حفظ الطعام المخصص",

  // Food Details Page
  addFoodTitle: "اضافة طعام",
  servings: "الحصص",
  servingSizeLabel: "حجم الحصة",
  addToMeal: "أضف إلى",
  percentDailyGoal: "من الهدف اليومي",

  // About Screen
  about: "عن فتكو",
  aboutSubtitle: "عن التطبيق والفريق",
  appInformation: "معلومات التطبيق",
  appName: "Fitco فتكو",
  version: "الاصدار 0.9 (تجريبي)",
  yourNutritionCompanion: "رفيقك الشخصي لمتابعة التغذية",
  addTo: "اضف إليه",

  features: "المميزات",
  trackDailyCalories: "• تابع السعرات والماكروز اليومية",
  setPersonalizedGoals: "• حدد اهداف تغذيتك حسب احتياجك",
  monitorProgress: "• راقب تقدمك مع الوقت",
  keepFoodJournal: "• احتفظ بمذكرات يومية للطعام مع الملاحظات",
  multiLanguageSupport: "• دعم كامل للانجليزي والعربي",

  development: "التطوير",
  madeBySaudis: "من صنع سعوديين للسعوديين",

  connectWithUs: "تواصل معنا",
  followUs: "تابعنا على السوشيال ميديا للحصول على تحديثات ونصائح لياقة:",
  socialInstagram: "إنستغرام: @fitco.ksa",
  socialTikTok: "تيك توك: (قريبًا)",
  socialSnapchat: "سناب شات: (قريبًا)",

cal: "سعرات",

consumed: "المستهلكة",
remaining: "متبقي",
reminderTime: "وقت التذكير",
timeFormatHint: "استخدم تنسيق 24 ساعة مثل 20:00",

  madeWithLove: "مصنوع بحب ❤️",
  thankYouForUsing: "شكراً لاستخدامك فتكو! حنا هنا لمساعدتك تحقق اهدافك الصحية.",
},

};

export type Language = keyof typeof translations;

// ✅ allow keys that map to string OR string[]
export type TranslationKey = {
  [K in keyof typeof translations.en]: (typeof translations.en)[K] extends string | string[]
    ? K
    : never;
}[keyof typeof translations.en];


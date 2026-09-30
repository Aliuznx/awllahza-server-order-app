export const strings = {
  en: {
    withoutCheese:'Without cheese',
    ...{"myOrders":"My orders","historyHint":"Orders saved in this browser appear here. Keep your tracking link to open an order on another device.","noSavedOrders":"No saved orders yet","sourceIp":"Order IP address","notifications":"Order notifications","enableSound":"Enable sound","muteSound":"Mute sound","soundHint":"Enable sound once after opening this page. Keep the admin page open to receive alerts.","soundUnavailable":"Sound could not start. Check your browser sound settings and try again.","alertsConnected":"Connected · checking for order updates","alertsReconnecting":"Connection interrupted · retrying automatically","noNotifications":"No recent order notifications","event_created":"New order","event_edited":"Customer edited order","event_cancelled":"Customer cancelled order"},
    orderNotes:'Order notes', notesOptional:'Optional · up to 1,000 characters', notesPlaceholder:'For example: no pickles, sauce on the side…',
    invalid_notes:'Keep your order notes within 1,000 characters.', productDetails:'Product details', locationMap:'Awl Lahza location in Dammam',
    editOrder:'Edit order', cancelOrder:'Cancel order', cancelPendingConfirm:'Cancel this order before the restaurant accepts it?',
    pendingEditHint:'You can change or cancel your order until the restaurant accepts it.',
    order_locked:'The restaurant has already processed this order. It can no longer be edited or cancelled here.',
    order_changed:'This order changed. Close the editor and open it again to review the latest order.',
    addProduct:'Add another item', chooseProduct:'Choose an item', editTotal:'Updated total', saveOrder:'Save order changes',
    brand:'Awl Lahza', tagline:'Taste the First Moment', menu:'Menu', admin:'Restaurant admin',
    cart:'Your order', add:'Add to cart', increase:'Increase quantity', decrease:'Decrease quantity', remove:'Remove',
    items:'items', total:'Total', empty:'Your cart is empty', emptyHint:'Choose something from the menu to start your order.',
    continue:'Continue browsing', checkout:'Review & order', firstName:'First name', lastName:'Last name', phone:'Phone number',
    dineIn:'Dine-in', pickup:'Pick up', fulfillment:'How would you like your order?', table:'Table number',
    payment:'Payment', cash:'Cash only', cashHint:'Pay at the restaurant when you collect your order.',
    finalPrice:'Final total · no extra fees', placeOrder:'Send order for approval', sending:'Sending…',
    approvalHint:'The restaurant will confirm your order before preparation starts.',
    ingredients:'Ingredients', calories:'kcal', caloriesUnknown:'Calories for this option are not listed',
    baseCalories:'Base item', unavailable:'Unavailable', option:'Option', close:'Close',
    open:'Accepting orders', closed:'Ordering is closed', hours:'Daily', localTime:'Dammam time',
    testNotice:'Test mode — orders are for testing and will not be prepared.',
    new:'Awaiting approval', preparing:'Preparing', ready:'Ready to collect', completed:'Collected', cancelled:'Declined / cancelled',
    orderNumber:'Order number', track:'Track your order', lastOrder:'Track last order', backMenu:'Back to menu',
    newHint:'Your order has been sent. Please wait for the restaurant to accept it.',
    preparingHint:'The restaurant has accepted your order and is preparing it.',
    readyHint:'Your order is ready. Show this number at the restaurant to collect it.',
    completedHint:'Your order has been collected. Thank you for choosing Awl Lahza.',
    cancelledHint:'This order was declined or cancelled and will not be prepared.',
    trackingHint:'Keep this page open or save its link. It updates automatically.',
    copyLink:'Copy tracking link', copied:'Link copied', live:'Updates automatically', lastUpdated:'Last updated',
    login:'Sign in', username:'Username', password:'Password', logout:'Sign out', orders:'Orders', products:'Menu settings',
    all:'All orders', accept:'Accept & prepare', markReady:'Mark ready', markCollected:'Mark collected', cancel:'Decline / cancel',
    cancelConfirm:'Decline or cancel this order?', noOrders:'No orders here yet', noOrdersHint:'Orders placed through this application will appear here.',
    refresh:'Refresh', previous:'Previous', next:'Next', page:'Page', paid:'Paid', unpaid:'Cash on collection',
    save:'Save changes', saved:'Changes saved', edit:'Edit', active:'Available to order',
    nameEn:'Name · English', nameAr:'Name · Arabic', descEn:'Description · English', descAr:'Description · Arabic',
    ingEn:'Ingredients · English', ingAr:'Ingredients · Arabic', noteEn:'Note · English', noteAr:'Note · Arabic',
    price:'Price (SAR)', variants:'Options & prices', optionalCalories:'Calories (leave empty if unknown)',
    hoursTitle:'Order hours', opensAt:'Opens at', closesAt:'Closes at', acceptingOrders:'Enable ordering during these hours',
    settingsHint:'Hours use Dammam time (Asia/Riyadh). Closing after midnight is supported.',
    editProduct:'Edit product', source:'Original menu', findUs:'Find us', maps:'Open in Google Maps',
    thanks:'Thank you for choosing the First Moment', rights:'All rights reserved', loading:'Loading…', retry:'Try again',
    connection:'Connection lost. Your information is kept here. Try again.',
    invalid_name:'Enter your first and last name.', invalid_phone:'Enter a valid phone number with its country code.',
    invalid_table:'Enter a table number between 1 and 9999.', cash_only:'Payment is cash only.',
    invalid_items:'Check the products in your cart.', invalid_quantity:'Quantity must be between 1 and 99.',
    product_unavailable:'An item is no longer available. Update your cart before ordering.',
    price_changed:'Prices changed. Review the updated total and submit again.',
    ordering_closed:'The restaurant is not accepting orders right now. Please check the order hours.',
    invalid_credentials:'Incorrect username or password.', unauthorized:'Please sign in again.',
    too_many_requests:'Too many attempts. Please wait and try again.', server_error:'We could not complete this request. Please try again.',
    invalid_request:'Check the entered information.', invalid_product:'Check both translations, prices and calories.',
    status_conflict:'This order was already updated. Refresh to see its current status.',
    request_conflict:'This checkout changed. Please review it and try again.', not_found:'Order not found. Use the tracking link from your confirmation.',
    invalid_origin:'Open the application using its configured address.', noTracking:'Use the tracking link shown after placing your order.',
    changedCart:'Your saved cart was updated to match the current menu.', count:'Quantity', status:'Status',
  },
  ar: {
    withoutCheese:'بدون جبن',
    ...{"myOrders":"طلباتي","historyHint":"تظهر هنا الطلبات المحفوظة في هذا المتصفح. احتفظ برابط التتبع لفتح الطلب على جهاز آخر.","noSavedOrders":"لا توجد طلبات محفوظة بعد","sourceIp":"عنوان IP للطلب","notifications":"إشعارات الطلبات","enableSound":"تفعيل الصوت","muteSound":"كتم الصوت","soundHint":"فعّل الصوت بعد فتح هذه الصفحة واترك لوحة الإدارة مفتوحة لاستقبال التنبيهات.","soundUnavailable":"تعذر تشغيل الصوت. تحقق من إعدادات الصوت في المتصفح وحاول مجدداً.","alertsConnected":"متصل · نتحقق من تحديثات الطلبات","alertsReconnecting":"انقطع الاتصال · نحاول الاتصال تلقائياً","noNotifications":"لا توجد إشعارات طلبات حديثة","event_created":"طلب جديد","event_edited":"عدّل العميل الطلب","event_cancelled":"ألغى العميل الطلب"},
    orderNotes:'ملاحظات الطلب', notesOptional:'اختياري · حتى ١٠٠٠ حرف', notesPlaceholder:'مثلاً: بدون مخلل، الصوص على الجانب…',
    invalid_notes:'يجب ألا تتجاوز ملاحظات الطلب ١٠٠٠ حرف.', productDetails:'تفاصيل المنتج', locationMap:'موقع أول لحظة في الدمام',
    editOrder:'تعديل الطلب', cancelOrder:'إلغاء الطلب', cancelPendingConfirm:'هل تريد إلغاء هذا الطلب قبل موافقة المطعم؟',
    pendingEditHint:'يمكنك تعديل طلبك أو إلغاؤه قبل موافقة المطعم.',
    order_locked:'عالج المطعم هذا الطلب بالفعل. لم يعد بإمكانك تعديله أو إلغائه هنا.',
    order_changed:'تم تغيير هذا الطلب. أغلق نافذة التعديل وافتحها مجدداً لمراجعة آخر تحديث.',
    addProduct:'إضافة منتج آخر', chooseProduct:'اختر منتجاً', editTotal:'الإجمالي الجديد', saveOrder:'حفظ تعديلات الطلب',
    brand:'أول لحظة', tagline:'ذوق أول لحظة', menu:'القائمة', admin:'إدارة المطعم',
    cart:'طلبك', add:'أضف إلى السلة', increase:'زيادة الكمية', decrease:'تقليل الكمية', remove:'إزالة',
    items:'منتجات', total:'الإجمالي', empty:'سلتك فارغة', emptyHint:'اختر من القائمة لبدء طلبك.',
    continue:'متابعة التصفح', checkout:'مراجعة الطلب', firstName:'الاسم الأول', lastName:'اسم العائلة', phone:'رقم الهاتف',
    dineIn:'داخل المطعم', pickup:'استلام من المطعم', fulfillment:'كيف تود استلام طلبك؟', table:'رقم الطاولة',
    payment:'الدفع', cash:'نقداً فقط', cashHint:'ادفع نقداً في المطعم عند استلام طلبك.',
    finalPrice:'المبلغ النهائي · بدون رسوم إضافية', placeOrder:'إرسال الطلب للموافقة', sending:'جارٍ الإرسال…',
    approvalHint:'سيؤكد المطعم طلبك قبل بدء التحضير.',
    ingredients:'المكونات', calories:'سعرة حرارية', caloriesUnknown:'السعرات لهذا الخيار غير مذكورة',
    baseCalories:'المنتج الأساسي', unavailable:'غير متوفر', option:'الخيار', close:'إغلاق',
    open:'نستقبل الطلبات', closed:'الطلب مغلق حالياً', hours:'يومياً', localTime:'بتوقيت الدمام',
    testNotice:'وضع التجربة — الطلبات للاختبار ولن يتم تحضيرها.',
    new:'بانتظار الموافقة', preparing:'قيد التحضير', ready:'جاهز للاستلام', completed:'تم الاستلام', cancelled:'مرفوض / ملغى',
    orderNumber:'رقم الطلب', track:'تتبع طلبك', lastOrder:'تتبع آخر طلب', backMenu:'العودة إلى القائمة',
    newHint:'تم إرسال طلبك. يرجى انتظار موافقة المطعم.',
    preparingHint:'وافق المطعم على طلبك ويقوم بتحضيره الآن.',
    readyHint:'طلبك جاهز. أظهر هذا الرقم في المطعم لاستلامه.',
    completedHint:'تم استلام طلبك. شكراً لاختيارك أول لحظة.',
    cancelledHint:'تم رفض هذا الطلب أو إلغاؤه ولن يتم تحضيره.',
    trackingHint:'احتفظ بهذه الصفحة أو احفظ رابطها. يتم تحديثها تلقائياً.',
    copyLink:'نسخ رابط التتبع', copied:'تم نسخ الرابط', live:'يتم التحديث تلقائياً', lastUpdated:'آخر تحديث',
    login:'تسجيل الدخول', username:'اسم المستخدم', password:'كلمة المرور', logout:'تسجيل الخروج', orders:'الطلبات', products:'إعدادات القائمة',
    all:'جميع الطلبات', accept:'قبول وبدء التحضير', markReady:'جاهز للاستلام', markCollected:'تم الاستلام', cancel:'رفض / إلغاء',
    cancelConfirm:'هل تريد رفض هذا الطلب أو إلغاءه؟', noOrders:'لا توجد طلبات هنا بعد', noOrdersHint:'ستظهر هنا الطلبات الواردة من هذا التطبيق.',
    refresh:'تحديث', previous:'السابق', next:'التالي', page:'الصفحة', paid:'تم الدفع', unpaid:'نقداً عند الاستلام',
    save:'حفظ التغييرات', saved:'تم حفظ التغييرات', edit:'تعديل', active:'متاح للطلب',
    nameEn:'الاسم · الإنجليزية', nameAr:'الاسم · العربية', descEn:'الوصف · الإنجليزية', descAr:'الوصف · العربية',
    ingEn:'المكونات · الإنجليزية', ingAr:'المكونات · العربية', noteEn:'ملاحظة · الإنجليزية', noteAr:'ملاحظة · العربية',
    price:'السعر (ر.س)', variants:'الخيارات والأسعار', optionalCalories:'السعرات الحرارية (اتركها فارغة إن لم تتوفر)',
    hoursTitle:'أوقات الطلب', opensAt:'وقت الفتح', closesAt:'وقت الإغلاق', acceptingOrders:'تفعيل الطلب خلال هذه الأوقات',
    settingsHint:'الأوقات بتوقيت الدمام (Asia/Riyadh). يمكن تحديد الإغلاق بعد منتصف الليل.',
    editProduct:'تعديل المنتج', source:'القائمة الأصلية', findUs:'موقعنا', maps:'افتح في خرائط Google',
    thanks:'شكراً لاختياركم أول لحظة', rights:'جميع الحقوق محفوظة', loading:'جارٍ التحميل…', retry:'حاول مجدداً',
    connection:'انقطع الاتصال. بياناتك محفوظة هنا. حاول مجدداً.',
    invalid_name:'أدخل الاسم الأول واسم العائلة.', invalid_phone:'أدخل رقم هاتف صحيحاً مع رمز الدولة.',
    invalid_table:'أدخل رقم طاولة بين 1 و9999.', cash_only:'الدفع نقداً فقط.',
    invalid_items:'راجع المنتجات في سلتك.', invalid_quantity:'يجب أن تكون الكمية بين 1 و99.',
    product_unavailable:'أحد المنتجات لم يعد متاحاً. حدّث سلتك قبل الطلب.',
    price_changed:'تغيرت الأسعار. راجع الإجمالي الجديد ثم أرسل الطلب مجدداً.',
    ordering_closed:'المطعم لا يستقبل الطلبات الآن. يرجى مراجعة أوقات الطلب.',
    invalid_credentials:'اسم المستخدم أو كلمة المرور غير صحيحة.', unauthorized:'يرجى تسجيل الدخول مجدداً.',
    too_many_requests:'محاولات كثيرة. يرجى الانتظار ثم المحاولة مجدداً.', server_error:'تعذر إتمام الطلب. يرجى المحاولة مجدداً.',
    invalid_request:'راجع البيانات المدخلة.', invalid_product:'راجع الترجمتين والأسعار والسعرات.',
    status_conflict:'تم تحديث هذا الطلب بالفعل. حدّث الصفحة لرؤية حالته الحالية.',
    request_conflict:'تغير هذا الطلب. يرجى مراجعته والمحاولة مجدداً.', not_found:'لم يتم العثور على الطلب. استخدم رابط التتبع الموجود في تأكيد الطلب.',
    invalid_origin:'افتح التطبيق باستخدام عنوانه المحدد.', noTracking:'استخدم رابط التتبع الذي ظهر بعد إرسال طلبك.',
    changedCart:'تم تحديث سلتك المحفوظة لتتوافق مع القائمة الحالية.', count:'الكمية', status:'الحالة',
  },
};
export function readStorage(key, fallback = null) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
export function writeStorage(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Ordering remains usable in private browsing. */ } }
const savedLang = readStorage('awllahza-language');
export let lang = ['en','ar'].includes(savedLang) ? savedLang : (navigator.languages?.[0] || navigator.language || 'en').toLowerCase().startsWith('ar') ? 'ar' : 'en';
export const t = key => strings[lang][key] || strings[lang].server_error;
export const tr = value => value?.[lang] || '';
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const money = value => new Intl.NumberFormat(lang === 'ar' ? 'ar-SA' : 'en-SA', { style:'currency', currency:'SAR', minimumFractionDigits:2 }).format(value / 100);
export const date = value => new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA' : 'en-GB', { timeZone:'Asia/Riyadh', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }).format(new Date(value));
export const cartIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 3h2l2.4 11.3a2 2 0 0 0 2 1.7h8.9a2 2 0 0 0 2-1.6L22 7H6"/><circle cx="10" cy="21" r="1"/><circle cx="19" cy="21" r="1"/></svg>';
export async function api(path, options = {}) {
  let response;
  try { response = await fetch(path, { ...options, headers:{ ...(options.body ? {'Content-Type':'application/json'} : {}), ...options.headers } }); }
  catch { const error = new Error('connection'); error.code = 'connection'; throw error; }
  const data = await response.json();
  if (!response.ok) { const error = new Error(data.error); error.code = data.error; error.status = response.status; throw error; }
  return data;
}
export function message(element, key, good = false) { element.textContent = t(key); element.hidden = false; element.classList.toggle('success-message', good); }
export function updateLanguage() {
  document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach(el => el.textContent = t(el.dataset.i18n));
  document.querySelectorAll('[data-lang]').forEach(el => { el.classList.toggle('on', el.dataset.lang === lang); el.setAttribute('aria-pressed', String(el.dataset.lang === lang)); });
  document.querySelectorAll('[data-close]').forEach(el => el.setAttribute('aria-label', t('close')));
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>el.placeholder=t(el.dataset.i18nPlaceholder));
  document.querySelectorAll('[data-i18n-title]').forEach(el=>el.title=t(el.dataset.i18nTitle));
  document.title = `${t(document.body.dataset.title || 'menu')} | ${t('brand')}`;
}
export function initLanguage(callback) {
  document.querySelectorAll('[data-lang]').forEach(el => el.addEventListener('click', () => {
    lang = el.dataset.lang; writeStorage('awllahza-language', lang); updateLanguage(); callback?.();
  }));
  updateLanguage();
}

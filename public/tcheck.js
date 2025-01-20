// إنشاء عنصر div لعرض رسالة عدم الاتصال
const offlineMessage = document.createElement('div');
offlineMessage.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: #ff4444;
    color: white;
    text-align: center;
    padding: 1rem;
    font-size: 1.2rem;
    z-index: 9999;
    display: none;
    direction: rtl;
`;
offlineMessage.textContent = "لا يتوفر اتصال بالإنترنت. يرجى التحقق من الشبكة الخاصة بك.";
document.body.appendChild(offlineMessage);

// دالة فحص الإنترنت
function checkInternetBeforeNavigate(url, event) {
 if (!navigator.onLine) {
  if (event) {
   event.preventDefault();
  }
  offlineMessage.style.display = 'block';
  setTimeout(() => {
   offlineMessage.style.display = 'none';
  }, 3000);
  return false;
 }
 return true;
}

// حماية الروابط
function protectLinks() {
 document.querySelectorAll('a').forEach(link => {
  if (!link.hasAttribute('data-protected')) {
   link.setAttribute('data-protected', 'true');

   // إضافة مستمع حدث للنقر
   link.addEventListener('click', function (e) {
    return checkInternetBeforeNavigate(this.href, e);
   });
  }
 });
}

// مراقبة حالة الاتصال
function checkInternetConnection() {
 if (!navigator.onLine) {
  offlineMessage.style.display = 'block';
  setTimeout(() => {
   offlineMessage.style.display = 'none';
  }, 3000);
 } else {
  offlineMessage.style.display = 'none';
 }
}

// مراقبة التغييرات في DOM للروابط الجديدة
const observer = new MutationObserver((mutations) => {
 mutations.forEach(mutation => {
  if (mutation.addedNodes.length) {
   protectLinks();
  }
 });
});

// بدء مراقبة التغييرات
observer.observe(document.body, {
 childList: true,
 subtree: true
});

// إعداد مراقبي حالة الاتصال
window.addEventListener('online', checkInternetConnection);
window.addEventListener('offline', checkInternetConnection);

// التطبيق الأولي
document.addEventListener('DOMContentLoaded', () => {
 protectLinks();
 checkInternetConnection();
});

// التطبيق بعد تحميل AJAX
window.addEventListener('load', () => {
 protectLinks();
});

// اعتراض عمليات التنقل
window.addEventListener('beforeunload', function (e) {
 if (!navigator.onLine) {
  e.preventDefault();
  offlineMessage.style.display = 'block';
  setTimeout(() => {
   offlineMessage.style.display = 'none';
  }, 3000);
  return false;
 }
});
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
`;
offlineMessage.textContent = "لا يتوفر اتصال بالإنترنت. يرجى التحقق من الشبكة الخاصة بك.";
document.body.appendChild(offlineMessage);

// دالة للتحقق من حالة الاتصال
function checkInternetConnection() {
 if (!navigator.onLine) {
  offlineMessage.style.display = 'block';
  // تخزين URL الحالي للرجوع إليه عند عودة الاتصال
 } else {
  offlineMessage.style.display = 'none';
  // التحقق إذا كان هناك صفحة سابقة للرجوع إليها
  const lastPage = window.location.href;
  if (lastPage) {
   window.location.href = lastPage;
  }
 }
}

// مراقبة حالة الاتصال
window.addEventListener('online', checkInternetConnection);
window.addEventListener('offline', checkInternetConnection);

// التحقق من حالة الاتصال عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', checkInternetConnection);
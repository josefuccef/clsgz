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

let wasOffline = false; // متغير لتتبع حالة الاتصال السابقة

// دالة للتحقق من حالة الاتصال
function checkInternetConnection() {
    if (!navigator.onLine) {
        offlineMessage.style.display = 'block';
        wasOffline = true;
    } else {
        offlineMessage.style.display = 'none';
        if (wasOffline) {
            // التأكد من أننا في نفس النافذة الأصلية
            if (window.self === window.top) {
                // إعادة تحميل الصفحة الحالية في نفس النافذة
                window.location.reload();
            }
            wasOffline = false;
        }
    }
}

// مراقبة حالة الاتصال
window.addEventListener('online', checkInternetConnection);
window.addEventListener('offline', checkInternetConnection);

// التحقق من حالة الاتصال عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', checkInternetConnection);

// إضافة مراقب للتأكد من أن الصفحة محملة بشكل كامل
window.addEventListener('load', () => {
    // التحقق من حالة الاتصال مرة أخرى بعد اكتمال تحميل الصفحة
    checkInternetConnection();
});
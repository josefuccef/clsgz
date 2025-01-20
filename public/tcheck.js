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

// حماية الروابط
function protectLinks() {
    // حماية الروابط الموجودة
    document.querySelectorAll('a').forEach(link => {
        if (!link.hasAttribute('data-protected')) {
            const originalHref = link.getAttribute('href');
            link.setAttribute('data-original-href', originalHref);
            link.setAttribute('data-protected', 'true');
            
            // استبدال الرابط الأصلي بـ JavaScript handler
            link.setAttribute('href', 'javascript:void(0)');
            
            link.addEventListener('click', function(e) {
                e.preventDefault();
                if (navigator.onLine) {
                    const href = this.getAttribute('data-original-href');
                    if (href) {
                        // فتح الرابط في نفس النافذة
                        window.location.href = href;
                    }
                } else {
                    offlineMessage.style.display = 'block';
                    setTimeout(() => {
                        offlineMessage.style.display = 'none';
                    }, 3000);
                }
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

// تطبيق الحماية على الروابط الجديدة
const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
        if (mutation.addedNodes.length) {
            protectLinks();
        }
    });
});

// بدء مراقبة التغييرات في DOM
observer.observe(document.body, {
    childList: true,
    subtree: true
});

// إعداد مراقبي حالة الاتصال
window.addEventListener('online', checkInternetConnection);
window.addEventListener('offline', checkInternetConnection);

// التطبيق الأولي عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    protectLinks();
    checkInternetConnection();
});

// إعادة تطبيق الحماية بعد تحميل AJAX
document.addEventListener('load', () => {
    protectLinks();
});

// معالجة النقر على أي عنصر في الصفحة
document.addEventListener('click', (e) => {
    if (!navigator.onLine) {
        // التحقق مما إذا كان العنصر المنقور عليه أو أحد آبائه رابطاً
        let element = e.target;
        while (element) {
            if (element.tagName === 'A') {
                e.preventDefault();
                e.stopPropagation();
                offlineMessage.style.display = 'block';
                setTimeout(() => {
                    offlineMessage.style.display = 'none';
                }, 3000);
                return false;
            }
            element = element.parentElement;
        }
    }
}, true);
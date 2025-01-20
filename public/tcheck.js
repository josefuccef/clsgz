function checkInternetBeforeLoading() {
                if (navigator.onLine) {
                    // إذا كان الاتصال بالإنترنت متاحًا، تحميل الصفحة بشكل طبيعي
                    window.location.reload(); // يمكن استبدال هذا بتطبيق أي كود تحميل آخر
                } else {
                    // إذا لم يكن هناك اتصال بالإنترنت، إظهار رسالة تنبيه
                    alert(
                        "لا يتوفر اتصال بالإنترنت. يرجى التحقق من الشبكة الخاصة بك."
                    );
                }
            }

            // التأكد من الاتصال بالإنترنت عند تحميل الصفحة
            window.addEventListener("load", checkInternetBeforeLoading);

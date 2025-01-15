const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const path = require("path");

const app = express();

// إعداد البيانات
app.use(express.json()); // استبدال body-parser.json()
app.use(express.urlencoded({ extended: true })); // استبدال body-parser.urlencoded()
app.use(express.static(path.join(__dirname, "public")));
app.set("views", path.join(__dirname, "./views"));
app.set("view engine", "ejs");

let storedMatches = []; // تخزين البيانات المعدلة في الذاكرة

// دالة لجلب المباريات
async function fetchMatches() {
    try {
        const { data } = await axios.get("https://www.koraa-live.com/");
        const $ = cheerio.load(data);

        const matches = [];
        $(".AY_Match").each((index, element) => {
            const team1 = $(element)
                .find(".MT_Team.TM1 .TM_Name")
                .text()
                .trim();
            const team2 = $(element)
                .find(".MT_Team.TM2 .TM_Name")
                .text()
                .trim();
            const logo1 = $(element)
                .find(".MT_Team.TM1 .TM_Logo img")
                .attr("data-src");
            const logo2 = $(element)
                .find(".MT_Team.TM2 .TM_Logo img")
                .attr("data-src");
            const time = $(element).find(".MT_Time").text().trim();
            const competition = $(element)
                .find(".MT_Info ul li")
                .last()
                .text()
                .trim();
            const moaalik =
                $(element).find(".MT_Info ul li").first().text().trim() ||
                "غير معروف";
            const status = $(element).find(".MT_Stat").text().trim();
            const link = $(element).find("a").attr("vide");

            matches.push({
                team1,
                team2,
                logo1,
                logo2,
                time,
                competition,
                moaalik,
                status,
                link
            });
        });

        return matches;
    } catch (error) {
        console.error("خطأ أثناء جلب البيانات:", error.message);
        return [];
    }
}

// الصفحة الرئيسية
app.get("/", async (req, res) => {
    if (storedMatches.length == 0) {
        // تحقق من أن المخزن فارغ
        storedMatches = await fetchMatches(); // جلب البيانات وتخزينها
    }
    // تعديل الوقت وإضافة ساعة
    res.render("index", { matches: storedMatches });
});

app.get("/tableau", (req, res) => {
    res.render("tableau", { matches: storedMatches });
});

// صفحة التعديل
app.get("/edit", (req, res) => {
    res.render("edit", { matches: storedMatches });
});

// حفظ التعديلات
app.post("/update", (req, res) => {
    const updatedMatches = req.body.matches;
    storedMatches = updatedMatches;
    // تحديث البيانات في الذاكرة
    res.redirect("/"); // إعادة توجيه للصفحة الرئيسية
});

// مسح البيانات

app.get("/clear", (req, res) => {
    storedMatches = []; // إعادة تعيين البيانات المخزنة
    res.redirect("/edit");
});
// إعادة جلب البيانات
app.get("/reload", async (req, res) => {
    storedMatches = await fetchMatches(); // جلب البيانات مجددًا وتحديث البيانات المخزنة

    storedMatches.forEach(match => {
        const { status, link, moaalik, competition, ...rest } = match; // إزالة status
        // تحويل الوقت وإضافة ساعة
        const [hours, minutes] = match.time.split(":");
        let date = new Date();
        date.setHours(parseInt(hours) - 1); // إضافة ساعة
        date.setMinutes(parseInt(minutes));
        // إعادة تنسيق الوقت إلى صيغة HH:mm
        const newTime = date.toTimeString().split(" ")[0].slice(0, 5);
        // تحديث الوقت في الكائن
        match.time = newTime;
        // يمكن تخزين "status" في مكان آخر إذا كان ضرورياً.
    });
    res.redirect("/");
});

// تشغيل الخادم
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`الخادم يعمل على http://localhost:${PORT}`);
});

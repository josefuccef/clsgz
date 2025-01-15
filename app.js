const express = require("express");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const uuidv4 = require("uuid").v4;
const app = express();

// إعداد البيانات
app.set("views", path.join(__dirname, "./views"));
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

let storedMatches = [];
let channels = [];

// دالة لتوليد التوكن ووقت انتهاء الصلاحية

function generateToken() {
    const token = uuidv4(); // استبدل بـ توليد توكن فعلي إذا لزم الأمر
    const expires = Math.floor(Date.now() / 1000) + 3600; // انتهاء الصلاحية بعد ساعة
    return { token, expires };
}

// دالة لجلب القنوات من رابط M3U
async function fetchChannels() {
    const m3uUrl =
        "http://xtream-ie.com:80/get.php?username=mo3ad201&password=mo3ad201&type=m3u8";
    try {
        const { token, expires } = generateToken(); // توليد التوكن ووقت انتهاء الصلاحية
        console.log("Fetching channels...");
        const { data } = await axios.get(m3uUrl);
        console.log("Channels fetched successfully!");

        const lines = data.split("\n");
        const extractedChannels = [];
        let currentName = "";
        let currentUrl = "";

        lines.forEach(line => {
            line = line.trim();

            if (line.startsWith("#EXTINF")) {
                const nameMatch = line.match(/,([^,]+)$/);
                if (nameMatch && nameMatch[1]) {
                    currentName = nameMatch[1].trim();
                }
            } else if (line && !line.startsWith("#")) {
                currentUrl = line.trim();
                if (currentName && currentUrl) {
                    const urlWithToken = `${currentUrl}?token=${token}&expires=${expires}`;
                    extractedChannels.push({
                        name: currentName,
                        url: urlWithToken
                    });
                    currentName = "";
                    currentUrl = "";
                }
            }
        });

        channels = extractedChannels;
        saveChannelsToFile(channels);
    } catch (error) {
        console.error("Error fetching channels:", error.message);
    }
}

// دالة لحفظ القنوات في ملف
function saveChannelsToFile(channels) {
    try {
        if (!Array.isArray(channels)) {
            throw new Error("Channels data must be an array");
        }

        // التحقق من صلاحية البيانات
        channels.forEach((channel, index) => {
            if (
                typeof channel.name !== "string" ||
                typeof channel.url !== "string"
            ) {
                throw new Error(`Invalid channel at index ${index}`);
            }
        });

        const fileName = "channels.json";
        const fileContent = JSON.stringify(channels, null, 2); // تحويل إلى JSON
        fs.writeFileSync(fileName, fileContent, "utf-8");
        console.log("Channels are saved to file:", fileName);
    } catch (error) {
        console.error("Error saving channels:", error.message);
    }
}

// دالة لجلب المباريات
async function fetchMatches() {
    try {
        const { data } = await axios.get("https://www.koraa-live.com/");
        const $ = require("cheerio").load(data);

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
            console.log("Canal:", moaalik); // طباعة اسم القناة
            const status = $(element).find(".MT_Stat").text().trim();
            const link = $(element).find("a").attr("vide");

            // جلب القناة من ملف JSON بناءً على اسم القناة
            const moaalikLinks = readmoaalikLinks(); // دالة لقراءة القنوات من ملف JSON
            const channelLink = moaalikLinks[moaalik] || "رابط غير متوفر";
            console.log("Channel link for canal:", channelLink);
            console.log(moaalikLinks);
            matches.push({
                team1,
                team2,
                logo1,
                logo2,
                time,
                competition,
                moaalik,
                status,
                link: channelLink // استخدام الرابط الذي تم العثور عليه من ملف JSON
            });
        });

        return matches;
    } catch (error) {
        console.error("خطأ أثناء جلب البيانات:", error.message);
        return [];
    }
}

// دالة لقراءة روابط القنوات من ملف JSON
function readmoaalikLinks() {
    try {
        const filePath = path.join(__dirname, "canalSport.json");
        console.log("Reading file from:", filePath); // طباعة المسار

        const data = fs.readFileSync(filePath, "utf-8");

        const channels = JSON.parse(data);
        const channelMap = {};

        channels.forEach(channel => {
            console.log(`Processing channel: ${channel.name}`); // طباعة اسم القناة
            channelMap[channel.name.trim()] = channel.url.trim();
        });
        return channelMap;
    } catch (error) {
        console.error("Error reading canalSport.json:", error.message);
        return {};
    }
}
// الصفحة الرئيسية
app.get("/", async (req, res) => {
    try {
        // التحقق من وجود المباريات
        if (!storedMatches || storedMatches.length === 0) {
            console.log("جلب المباريات...");
            storedMatches = await fetchMatches();
        }

        // التحقق من وجود القنوات
        if (!channels || channels.length === 0) {
            console.log("جلب القنوات...");
            await fetchChannels();
        }

        // تمرير المتغير `noMatches` بناءً على طول قائمة المباريات
        const noMatches = !storedMatches || storedMatches.length === 0;

        res.render("index", { matches: storedMatches, channels, noMatches });
    } catch (error) {
        console.error("خطأ أثناء جلب البيانات:", error.message);
        res.status(500).send("حدث خطأ أثناء معالجة الطلب.");
    }
});

app.get("/tableau", (req, res) => {
    res.render("tableau", { matches: storedMatches });
});

// صفحة التعديل
app.get("/edit", (req, res) => {
    res.render("edit", { matches: storedMatches });
});

// مسح البيانات
app.get("/clear", (req, res) => {
    storedMatches = [];
    channels = [];
    res.redirect("/edit");
});

// إعادة جلب البيانات
app.get("/reload", async (req, res) => {
    storedMatches = await fetchMatches();
    await fetchChannels(); // جلب القنوات مرة أخرى
    res.redirect("/");
});

app.post("/update", (req, res) => {
    const updatedMatches = req.body.matches;
    storedMatches = updatedMatches;
    // تحديث البيانات في الذاكرة
    res.redirect("/"); // إعادة توجيه للصفحة الرئيسية
});

// دالة لقراءة القنوات من ملف JSON
function readChannels() {
    try {
        const data = fs.readFileSync("canalSport.json", "utf-8");
        const channels = JSON.parse(data);

        // إنشاء خريطة للقنوات
        const channelMap = {};

        // التأكد من البيانات
        channels.forEach(channel => {
            // تحقق من وجود 'name' و 'url'
            if (channel.name && channel.url) {
                // إزالة المسافات الزائدة من الأسماء وتحويل النص إلى أحرف صغيرة
                const name = channel.name.trim().toLowerCase();
                const url = channel.url.trim();

                // إضافة الرابط للقناة
                channelMap[name] = url;
            } else {
                console.warn(
                    `قناة بدون بيانات صحيحة: ${JSON.stringify(channel)}`
                );
            }
        });

        return channelMap;
    } catch (error) {
        console.error("خطأ أثناء قراءة ملف القنوات:", error.message);
        return {};
    }
}

// صفحة البحث
app.get("/search", (req, res) => {
    res.render("search", { result: null, query: "", error: null });
});

// معالجة البحث
app.post("/search", (req, res) => {
    const { channelName } = req.body; // اسم القناة المرسل من المستخدم
    const channelMap = readChannels(); // قراءة القنوات من ملف JSON

    if (!channelName) {
        return res.render("search", {
            result: null,
            query: "",
            error: "يرجى إدخال اسم القناة."
        });
    }

    // تحويل اسم القناة المدخل إلى أحرف صغيرة
    const channelNameLower = channelName.trim().toLowerCase();

    // البحث عن القناة في الخريطة (التي تم إنشاؤها من ملفات القنوات)
    const result = Object.keys(channelMap).find(
        channel => channel === channelNameLower
    );

    // إذا تم العثور على القناة
    const channelUrl = result ? channelMap[result] : null;

    res.render("search", {
        result: channelUrl ? { name: result, url: channelUrl } : null, // إظهار النتيجة إذا كانت موجودة
        query: channelName,
        error: channelUrl ? null : "لم يتم العثور على القناة."
    });
});

// تشغيل الخادم
const PORT = 3000;
app.listen(PORT, () => {
    console.log("Server is running on http://localhost:3000");
});

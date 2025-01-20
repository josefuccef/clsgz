const express = require("express");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const moment = require("moment"); // مكتبة لمعالجة التواريخ
const crypto = require("crypto");
const uuidv4 = require("uuid").v4;
const app = express(); // يجب أن يكون هنا تعريف الـ app

// إعداد البيانات
app.set("views", path.join(__dirname, "./views"));
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// دوال البيانات والملفات (تأكد من وضعها قبل استخدام الـ app)
function writeDataToFile(fileName, data) {
 try {
  const fileContent = JSON.stringify(data, null, 2);
  fs.writeFileSync(fileName, fileContent, "utf-8");
  console.log(`Data successfully saved to ${fileName}`);
 } catch (error) {
  console.error(`Error saving data to ${fileName}:`, error.message);
 }
}

function readDataFromFile(fileName) {
 try {
  const filePath = path.join(__dirname, fileName);
  const data = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data);
 } catch (error) {
  console.error(`Error reading file ${fileName}:`, error.message);
  return [];
 }
}

// تعريف دالة generateToken لتوليد التوكن ووقت الصلاحية
function generateToken() {
 const token = Math.random().toString(36).substr(2); // توكن عشوائي
 const expires = Math.floor(Date.now() / 1000) + 3600; // الصلاحية لمدة ساعة (3600 ثانية)
 return { token, expires };
}

// دالة fetchChannels لتحميل القنوات
async function fetchChannels() {
 const m3uUrl =
  "http://xtream-ie.com:80/get.php?username=mo3ad201&password=mo3ad201&type=m3u8";
 try {
  const { token, expires } = generateToken(); // توليد التوكن ووقت الصلاحية
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
     const urlWithToken = `${currentUrl}|user-agent=${expires}?token=${token}&expires=${expires}`;
     extractedChannels.push({
      name: currentName,
      url: urlWithToken
     });
     currentName = "";
     currentUrl = "";
    }
   }
  });

  // حفظ القنوات في ملف JSON
  writeDataToFile("canalSport.json", extractedChannels);
 } catch (error) {
  console.error("Error fetching channels:", error.message);
 }
}

// دالة لحفظ البيانات إلى ملف JSON
function writeDataToFile(filename, data) {
 fs.writeFileSync(filename, JSON.stringify(data, null, 2), "utf-8");
 console.log(`Channels saved to ${filename}`);
}

// استدعاء الدالة
fetchChannels();

// دالة لقراءة روابط القنوات من ملف canalSport.json
function readChannelsFromFile() {
 try {
  const filePath = path.join(__dirname, "Sport.json");
  const data = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data); // إرجاع القنوات المقروءة من الملف
 } catch (error) {
  console.error("Error reading Channels.json:", error.message);
  return [];
 }
}

// دالة لجلب المباريات
// دالة لجلب المباريات مع تحديث حالة status عند كل تحميل
async function fetchMatches() {
 try {
  const { data } = await axios.get("https://www.kooralive-new.com/");
  const $ = require("cheerio").load(data);

  const matches = [];

  // قراءة القنوات من ملف JSON
  const moaalikLinks = readChannelsFromFile();

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
    $(element).find(".MT_Info ul li").first().text().trim().toUpperCase() || "غير معروف";
   const link = $(element).find("a").attr("vide");

   // جلب الحالة الفعلية للمباراة
   const status = $(element).find(".MT_Stat").text().trim();

   // جلب الرابط من ملف JSON
   const channelLink = moaalikLinks[moaalik] || "رابط غير متوفر";

   matches.push({
    team1,
    team2,
    logo1,
    logo2,
    time,
    competition,
    moaalik,
    status, // تعيين الحالة المستخرجة
    link: channelLink
   });
  });

  return matches;
 } catch (error) {
  console.error("خطأ أثناء جلب البيانات:", error.message);
  return [];
 }
}

// دالة لحفظ المباريات في ملف JSON
function writeMatchesToFile(matches) {
 try {
  const fileContent = JSON.stringify(matches, null, 2);
  fs.writeFileSync(
   path.join(__dirname, "matches.json"),
   fileContent,
   "utf-8"
  );
  console.log("Matches saved successfully!");
 } catch (error) {
  console.error("Error saving matches:", error.message);
 }
}

// صفحة إعادة تحميل البيانات مع تحديث status
app.get("/reload", async (req, res) => {
 console.log("جلب المباريات...");
 const matches = await fetchMatches(); // جلب المباريات

 // حفظ المباريات في ملف matches.json مع الحالة الجديدة
 writeMatchesToFile(matches);

 await fetchChannels(); // جلب القنوات بعد تحميل المباريات
 res.redirect("edit"); // إعادة توجيه للصفحة الرئيسية
});

// تحديث المباريات عند الإرسال
app.post("/update", (req, res) => {
 const updatedMatches = req.body.matches;

 if (Array.isArray(updatedMatches)) {
  writeDataToFile("matches.json", updatedMatches); // حفظ التحديثات في ملف matches.json
  res.redirect("/"); // إعادة توجيه للصفحة الرئيسية
 } else {
  res.status(400).send("البيانات غير صحيحة.");
 }
});

// الصفحة الرئيسية

app.get("/", async (req, res) => {
 try {
  // قراءة المباريات من الملف
  let matches = readDataFromFile("matches.json");

  // تحديث أو جلب المباريات
  if (matches && matches.length > 0) {
   // إذا كانت البيانات موجودة، فقط حدث الحالات والأوقات
   const updatedMatches = await fetchMatches(); // جلب البيانات المحدثة من المصدر

   matches = matches.map(match => {
    // تحديث الحالة بناءً على المصدر
    const updatedMatch = updatedMatches.find(
     m => m.team1 === match.team1 && m.team2 === match.team2
    );
    if (updatedMatch) {
     match.status = updatedMatch.status; // تحديث الحالة فقط
    }

    // تحديث الوقت بإنقاص ساعتين
    if (match.time) {
     const matchTime = moment(match.time, "HH:mm"); // افترض أن الوقت بصيغة HH:mm
     match.time = matchTime.subtract(2, "hours").format("HH:mm");
    }

    return match;
   });
  } else {
   // إذا لم تكن هناك بيانات، يتم جلبها من المصدر
   matches = await fetchMatches();

   // تحديث الوقت بإنقاص ساعتين وترتيب المباريات
   matches = matches.map(match => {
    if (match.time) {
     const matchTime = moment(match.time, "HH:mm");
     match.time = matchTime.subtract(2, "hours").format("HH:mm");
    }
    return match;
   });

   // ترتيب المباريات حسب الحالة والوقت
   matches.sort((a, b) => {
    const statusOrder = {
     "جارية حاليا": 0, // الأولوية الأعلى
     "لم تبدأ بعد": 1, // الأولوية المتوسطة
     "انتهت": 2        // الأولوية الأقل
    };

    // مقارنة الحالات أولاً
    const statusA = statusOrder[a.status] ?? 3; // إذا كانت الحالة غير معروفة
    const statusB = statusOrder[b.status] ?? 3;

    if (statusA !== statusB) {
     return statusA - statusB;
    }

    // إذا كانت الحالة متساوية، نرتب حسب الوقت
    const timeA = moment(a.time, "HH:mm");
    const timeB = moment(b.time, "HH:mm");
    return timeA - timeB;
   });
  }

  // قراءة القنوات من الملف
  let channels = readDataFromFile("Sport.json");

  // إذا لم تكن هناك بيانات قنوات، يتم جلبها من المصدر
  if (!channels || channels.length === 0) {
   await fetchChannels(); // جلب القنوات
   channels = readDataFromFile("Sport.json"); // إعادة قراءة البيانات بعد الجلب
  }

  // تحديث روابط المباريات بناءً على القنوات
  matches = matches.map(match => {
   const matchingChannel = channels.find(channel => channel.name === match.moaalik);
   match.link = matchingChannel ? matchingChannel.url : "رابط غير متوفر";
   return match;
  });

  // تحديد إذا لم تكن هناك مباريات
  const noMatches = matches.length === 0;

  // عرض الصفحة
  res.render("index", { matches, channels, noMatches });
 } catch (error) {
  // التعامل مع الأخطاء وطباعة الرسالة
  console.error("Error rendering homepage:", error.message);
  res.status(500).send("حدث خطأ أثناء معالجة الطلب.");
 }
});

// صفحة التعديل
app.get("/edit", (req, res) => {
 const matches = readDataFromFile("matches.json");
 res.render("edit", { matches });
});

// مسح البيانات
app.get("/clear", (req, res) => {
 writeDataToFile("matches.json", []);
 writeDataToFile("canalSport.json", []);
 res.redirect("/edit");
});

app.get("/login", (req, res) => {
 res.render("singup")
})

// إعادة جلب البيانات
function readChannels() {
 try {
  const data = fs.readFileSync("Sport.json", "utf-8");
  const channels = JSON.parse(data);

  const channelMap = {};

  channels.forEach(channel => {
   if (channel.name && channel.url) {
    const name = channel.name.trim().toUpperCase();
    const url = channel.url.trim();
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

app.get("/search", (req, res) => {
 res.render("search", {
  result: null,
  query: "",
  error: null,
  suggestions: []
 });
});

app.post("/search", (req, res) => {
 const { channelName } = req.body;
 const channelMap = readChannels();

 if (!channelName) {
  return res.render("search", {
   result: null,
   query: "",
   error: "يرجى إدخال اسم القناة.",
   suggestions: []
  });
 }

 const query = channelName.trim().toLowerCase(); // تحويل الإدخال إلى أحرف صغيرة
 const suggestions = Object.keys(channelMap).filter(name =>
  name.toLowerCase().includes(query) // مطابقة بغض النظر عن حالة الأحرف
 );

 // إذا كان هناك اقتراحات
 if (suggestions.length > 0) {
  const result = suggestions.length === 1 ? suggestions[0] : null;
  const channelUrl = result ? channelMap[result] : null;

  return res.render("search", {
   result: channelUrl ? { name: result, url: channelUrl } : null,
   query: channelName,
   error: null,
   suggestions
  });
 }

 // إذا لم يتم العثور على أي قناة
 res.render("search", {
  result: null,
  query: channelName,
  error: "لم يتم العثور على القناة.",
  suggestions: []
 });
});

// تشغيل الخادم
const PORT = 3000;
app.listen(PORT, () => {
 console.log(`Server is running on http://localhost:${PORT}`);
});

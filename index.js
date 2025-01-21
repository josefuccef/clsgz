const express = require("express");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const moment = require("moment"); // مكتبة لمعالجة التواريخ
const crypto = require("crypto");
const uuidv4 = require("uuid").v4;
const app = express(); // يجب أن يكون هنا تعريف الـ app

app.set("views", path.join(__dirname, "./views"));
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// تحديد المسارات الأساسية للملفات
const sportFilePath = path.join(__dirname, "public", "Sport.json");
const matchesFilePath = path.join(__dirname, "public", "matches.json");

// دوال قراءة وكتابة البيانات
function writeDataToFile(fileName, data) {
  try {
    const filePath = path.join(__dirname, "public", fileName);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    console.log(`Data successfully saved to ${filePath}`);
  } catch (error) {
    console.error(`Error saving data to ${fileName}:`, error.message);
  }
}

function readDataFromFile(fileName) {
  try {
    const filePath = path.join(__dirname, "public", fileName);
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading file ${fileName}:`, error.message);
    return [];
  }
}

// توليد توكن عشوائي
function generateToken() {
  const token = Math.random().toString(36).substr(2);
  const expires = Math.floor(Date.now() / 1000) + 3600; // صلاحية ساعة
  return { token, expires };
}

// دالة لجلب القنوات
async function fetchChannels() {
  const m3uUrl =
    "http://xtream-ie.com:80/get.php?username=mo3ad201&password=mo3ad201&type=m3u8";
  try {
    const { token, expires } = generateToken();
    console.log("Fetching channels...");
    const { data } = await axios.get(m3uUrl);
    console.log("Channels fetched successfully!");

    const lines = data.split("\n");
    const extractedChannels = [];
    let currentName = "";
    let currentUrl = "";

    lines.forEach((line) => {
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
            url: urlWithToken,
          });
          currentName = "";
          currentUrl = "";
        }
      }
    });

    // حفظ القنوات في ملف JSON
    writeDataToFile("Sport.json", extractedChannels);
  } catch (error) {
    console.error("Error fetching channels:", error.message);
  }
}

// دالة لجلب المباريات
async function fetchMatches() {
  try {
    const { data } = await axios.get("https://www.kooralive-new.com/");
    const $ = require("cheerio").load(data);

    const matches = [];
    const moaalikLinks = readDataFromFile("Sport.json");

    $(".AY_Match").each((index, element) => {
      const team1 = $(element).find(".MT_Team.TM1 .TM_Name").text().trim();
      const team2 = $(element).find(".MT_Team.TM2 .TM_Name").text().trim();
      const logo1 = $(element).find(".MT_Team.TM1 .TM_Logo img").attr("data-src");
      const logo2 = $(element).find(".MT_Team.TM2 .TM_Logo img").attr("data-src");
      const time = $(element).find(".MT_Time").text().trim();
      const competition = $(element)
        .find(".MT_Info ul li")
        .last()
        .text()
        .trim();
      const moaalik =
        $(element).find(".MT_Info ul li").first().text().trim().toUpperCase() ||
        "غير معروف";
      const status = $(element).find(".MT_Stat").text().trim();

      const matchingChannel = moaalikLinks.find(
        (channel) => channel.name === moaalik
      );
      const channelLink = matchingChannel ? matchingChannel.url : "رابط غير متوفر";

      matches.push({
        team1,
        team2,
        logo1,
        logo2,
        time,
        competition,
        moaalik,
        status,
        link: channelLink,
      });
    });

    return matches;
  } catch (error) {
    console.error("Error fetching matches:", error.message);
    return [];
  }
}

// حفظ المباريات
function writeMatchesToFile(matches) {
  writeDataToFile("matches.json", matches);
}

// نقطة نهاية لتحميل المباريات والقنوات
app.get("/reload", async (req, res) => {
  console.log("Reloading matches and channels...");
  const matches = await fetchMatches();
  writeMatchesToFile(matches);
  await fetchChannels();
  res.redirect("/edit");
});

// الصفحة الرئيسية
app.get("/", async (req, res) => {
  try {
    let matches = readDataFromFile("matches.json");

    if (!matches || matches.length === 0) {
      matches = await fetchMatches();
      writeMatchesToFile(matches);
    }

    let channels = readDataFromFile("Sport.json");
    if (!channels || channels.length === 0) {
      await fetchChannels();
      channels = readDataFromFile("Sport.json");
    }

    res.render("index", { matches, channels });
  } catch (error) {
    console.error("Error rendering homepage:", error.message);
    res.status(500).send("حدث خطأ أثناء معالجة الطلب.");
  }
});

// تشغيل الخادم
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
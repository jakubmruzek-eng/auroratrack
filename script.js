document.addEventListener("DOMContentLoaded", () => {
  console.log("Aurora Track loaded.");

  // ---------- TABS ----------
  const tabs = {
  current: document.getElementById("current"),
  future: document.getElementById("future"),
  sun: document.getElementById("sun"),
  weather: document.getElementById("weather"),
};
const buttons = {
  current: document.getElementById("tab-current"),
  future: document.getElementById("tab-future"),
  sun: document.getElementById("tab-sun"),
  weather: document.getElementById("tab-weather"),
};

  for (let key in buttons) {
  buttons[key].onclick = () => {
    Object.values(buttons).forEach((b) => b.classList.remove("active"));
    Object.values(tabs).forEach((t) => t.classList.remove("active"));
    buttons[key].classList.add("active");
    tabs[key].classList.add("active");

    if (key === "current") updateCurrent?.();
    if (key === "future") loadFutureForecast();
    if (key === "sun") updateSunActivity?.();
    if (key === "weather") updateWeather?.();
  };
}


  // ---------- SUN ACTIVITY ----------
  function updateSunActivity() {
    const coronal = document.getElementById("img-coronal");
    const aurora = document.getElementById("img-aurora");
    if (coronal)
      coronal.src =
        "https://sdo.oma.be/data/aia_quicklook_image/latest/AIA.latest.0193.quicklook.png?t=" +
        Date.now();
    if (aurora)
      aurora.src =
        "https://services.swpc.noaa.gov/images/aurora-forecast-northern-hemisphere.jpg?t=" +
        Date.now();
  }

  // ---------- NOAA DATA ----------
  async function getNoaaData() {
    try {
      const [plasmaRes, magRes, kpRes] = await Promise.all([
        fetch("https://services.swpc.noaa.gov/products/solar-wind/plasma-1-day.json"),
        fetch("https://services.swpc.noaa.gov/products/solar-wind/mag-1-day.json"),
        fetch("https://services.swpc.noaa.gov/json/planetary_k_index_1m.json"),
      ]);

      const plasma = await plasmaRes.json();
      const mag = await magRes.json();
      const kp = await kpRes.json();

      const plasmaHeader = plasma[0];
      const magHeader = mag[0];
      const speedIndex = plasmaHeader.indexOf("speed") !== -1 ? plasmaHeader.indexOf("speed") : 2;
      const densityIndex = plasmaHeader.indexOf("density") !== -1 ? plasmaHeader.indexOf("density") : 1;
      const bzIndex = magHeader.indexOf("bz_gsm") !== -1 ? magHeader.indexOf("bz_gsm") : 4;

      const lastPlasma = plasma.at(-1);
      const lastMag = mag.at(-1);

      // ✅ vezme poslední platnou KP hodnotu
      const lastKp = kp.reverse().find((x) => x.kp_index !== undefined);
      const kpValue = lastKp ? parseFloat(lastKp.kp_index) : 0;

      return {
        density: parseFloat(lastPlasma[densityIndex]),
        speed: parseFloat(lastPlasma[speedIndex]),
        bz: parseFloat(lastMag[bzIndex]),
        kp: kpValue,
      };
    } catch (err) {
      console.error("Error loading NOAA data:", err);
      return { density: 0, speed: 0, bz: 0, kp: 0 };
    }
  }

  // ---------- COLOR + GAUGE ----------
  function getColor(val, max, reverse = false) {
    const ratio = Math.min(Math.abs(val) / max, 1);
    const hue = reverse ? (val < 0 ? 120 - ratio * 120 : 120) : 120 - ratio * 120;
    return `hsl(${hue}, 80%, 50%)`;
  }

  function drawGauge(id, value, max, reverse = false) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const color = getColor(value, max, reverse);
    if (ctx._chart) ctx._chart.destroy();
    ctx._chart = new Chart(ctx, {
      type: "doughnut",
      data: {
        datasets: [
          {
            data: [Math.abs(value), Math.max(max - Math.abs(value), 0)],
            backgroundColor: [color, "#1e293b"],
            borderWidth: 0,
          },
        ],
      },
      options: {
        cutout: "75%",
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
      },
    });
    const gauge = canvas.parentElement;
    let valEl = gauge.querySelector(".value");
    if (!valEl) {
      valEl = document.createElement("div");
      valEl.className = "value";
      gauge.appendChild(valEl);
    }
    valEl.textContent = value.toFixed(1);
    valEl.style.color = color;
  }

  // ---------- UPDATE CURRENT ACTIVITY ----------
  async function updateCurrent() {
    const data = await getNoaaData();

    // KP text a barva
    const kpEl = document.getElementById("kp");
    kpEl.textContent = data.kp.toFixed(1);

    if (data.kp < 3) kpEl.style.color = "#22c55e";      // zelená
    else if (data.kp < 5) kpEl.style.color = "#eab308"; // žlutá
    else kpEl.style.color = "#ef4444";                  // červená

    // odstraníme "Updated"
    const updated = document.getElementById("updated");
    if (updated) updated.style.display = "none";

    drawGauge("windGauge", data.speed, 800);
    drawGauge("densityGauge", data.density, 20);
    drawGauge("bzGauge", data.bz, 30, true);
    updateAuroraTip(data.kp);
  }

  // ---------- WEATHER ----------
  async function getWeather(lat, lon) {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=cloudcover`
      );
      const data = await res.json();

      const temp = data.current_weather.temperature;
      const wind = data.current_weather.windspeed;
      const clouds = data.hourly.cloudcover[0];

      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
      );
      const geo = await geoRes.json();

      const city =
        geo.address.city ||
        geo.address.town ||
        geo.address.village ||
        "Unknown";
      const country = geo.address.country || "";

      document.getElementById(
        "weather-short"
      ).innerHTML = `<strong>📍 ${city}, ${country}</strong><br>🌡️ ${temp}°C | ☁️ ${clouds}% clouds | 💨 ${wind} km/h`;

      window.currentClouds = clouds;
    } catch {
      document.getElementById("weather-short").textContent =
        "Weather data unavailable.";
    }
  }

  // ---------- MOON PHASE ----------
  function loadMoonPhase() {
    const moonDiv = document.getElementById("moon-phase");
    const now = new Date();
    const lp = 2551443;
    const newMoon = new Date(1970, 0, 7, 20, 35, 0);
    const phaseTime = ((now - newMoon) / 1000) % lp;
    const phase = phaseTime / lp;
    const illum = Math.round((1 - Math.cos(phase * 2 * Math.PI)) * 50 * 2) / 2;

    let name = "", icon = "🌑";
    if (phase < 0.03) { name = "New Moon"; icon = "🌑"; }
    else if (phase < 0.25) { name = "Waxing Crescent"; icon = "🌒"; }
    else if (phase < 0.27) { name = "First Quarter"; icon = "🌓"; }
    else if (phase < 0.47) { name = "Waxing Gibbous"; icon = "🌔"; }
    else if (phase < 0.53) { name = "Full Moon"; icon = "🌕"; }
    else if (phase < 0.75) { name = "Waning Gibbous"; icon = "🌖"; }
    else if (phase < 0.77) { name = "Last Quarter"; icon = "🌗"; }
    else { name = "Waning Crescent"; icon = "🌘"; }

    moonDiv.innerHTML = `${icon} ${name} — ${illum}% illuminated`;
  }

  // ---------- AURORA TIP ----------
  function updateAuroraTip(kp) {
    const tip = document.getElementById("aurora-tip");
    const clouds = window.currentClouds || 50;

    if (clouds > 70)
      tip.textContent = "☁️ Too cloudy for aurora tonight.";
    else if (kp >= 5)
      tip.textContent = "🌌 Strong geomagnetic activity! Great chance to see aurora!";
    else if (kp >= 3)
      tip.textContent = "✨ Today is good to see aurora if there are no clouds.";
    else
      tip.textContent = "😴 Low activity tonight.";
  }

  // ---------- GEOLOCATION ----------
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        getWeather(latitude, longitude);

        const windy = document.getElementById("windyMap");
        if (windy)
          windy.src = `https://embed.windy.com/embed2.html?lat=${latitude.toFixed(
            2
          )}&lon=${longitude.toFixed(
            2
          )}&zoom=5&level=surface&overlay=lowclouds&marker=true&menu=false&message=true`;

        const yr = document.getElementById("yrMeteogram");
        if (yr)
          yr.src = `https://www.yr.no/en/content/${latitude.toFixed(
            2
          )},${longitude.toFixed(2)}/meteogram.svg`;
      },
      () => {
        document.getElementById("weather-short").textContent =
          "Location access denied.";
      }
    );
  } else {
    document.getElementById("weather-short").textContent =
      "Geolocation not supported.";
 // ---------- FUTURE FORECAST ----------
async function loadFutureForecast() {
  const summaryEl = document.getElementById("future-summary");
  const tableEl = document.getElementById("future-table");
  summaryEl.innerHTML = "<p>Loading forecast...</p>";
  tableEl.innerHTML = "";

  try {
    const res = await fetch("https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json");
    const data = await res.json();

    const items = data.slice(1).map((x) => ({
      time: x[0],
      kp: parseFloat(x[1]),
    }));

    const nextStorm = items.find((i) => i.kp >= 5);
    const night = await getNightTime();

    const chance = nextStorm ? (nextStorm.kp >= 6 ? "Very High" : "High") : "Low";
    summaryEl.innerHTML = `
      🌙 Night at your location: ${night.set} → ${night.rise}<br>
      ⚡ Next storm: ${nextStorm ? formatTime(nextStorm.time) + " — " + getLevel(nextStorm.kp) + " (KP " + nextStorm.kp + ")" : "None"}<br>
      🎯 Aurora chance tonight: ${chance}
    `;

    let html = `<table><tr><th>Time (UTC)</th><th>KP</th><th>Level</th><th>Chance</th></tr>`;
    items.slice(0, 24).forEach((x) => {
      const level = getLevel(x.kp);
      const color = getColor(x.kp);
      const emoji = getEmoji(x.kp);
      const label = level.includes("Storm") ? ` — ${level}` : "";
      html += `<tr>
        <td>${formatTime(x.time)}${label}</td>
        <td>${x.kp.toFixed(1)}</td>
        <td>${level}</td>
        <td style="color:${color}">${emoji}</td>
      </tr>`;
    });
    html += `</table>`;
    tableEl.innerHTML = html;
  } catch (e) {
    summaryEl.textContent = "Forecast data unavailable.";
    console.error(e);
  }
}

function formatTime(t) {
  const d = new Date(t);
  const day = d.toUTCString().split(" ")[0];
  const time = d.toUTCString().slice(17, 22);
  return `${day} ${time}`;
}

function getLevel(kp) {
  if (kp < 3) return "Quiet";
  if (kp < 5) return "Active";
  if (kp < 6) return "G1 Storm";
  if (kp < 7) return "G2 Storm";
  return "G3+ Storm";
}

function getColor(kp) {
  if (kp < 3) return "#22c55e";
  if (kp < 5) return "#eab308";
  if (kp < 6) return "#f97316";
  return "#ef4444";
}

function getEmoji(kp) {
  if (kp < 3) return "🟢 Low";
  if (kp < 5) return "🟡 Medium";
  if (kp < 6) return "🟠 High";
  return "🔴 Very High";
}

async function getNightTime() {
  try {
    const pos = await new Promise((res) =>
      navigator.geolocation.getCurrentPosition((p) => res(p))
    );
    const { latitude, longitude } = pos.coords;
    const r = await fetch(`https://api.sunrise-sunset.org/json?lat=${latitude}&lng=${longitude}&formatted=0`);
    const js = await r.json();
    const s = new Date(js.results.sunset).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"});
    const rise = new Date(js.results.sunrise).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"});
    return { set: s, rise: rise };
  } catch {
    return { set: "--:--", rise: "--:--" };
  }
}
 }

  // ---------- INIT ----------
  updateCurrent();
  loadMoonPhase();
  setInterval(updateCurrent, 60000); // každou minutu
  setInterval(loadMoonPhase, 3600000); // každou hodinu
});

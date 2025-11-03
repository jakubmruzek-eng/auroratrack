document.addEventListener("DOMContentLoaded", () => {
  console.log("Aurora Forecast loaded.");

  // ---------- FUTURE FORECAST ----------
  async function loadForecast() {
    const summaryEl = document.getElementById("forecast-summary");
    const tableEl = document.getElementById("forecast-table");
    summaryEl.textContent = "Loading aurora forecast...";
    tableEl.innerHTML = "";

    try {
      const res = await fetch("https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json");
      const data = await res.json();

      const items = data.slice(1).map((x) => ({
        time: new Date(x[0]),
        kp: parseFloat(x[1]),
      }));

      let html = `<table class="aurora-table">
        <tr><th>Date & Time (UTC)</th><th>KP</th><th>Level</th><th>Moon Phase</th><th>Chance</th></tr>`;

      items.slice(0, 24).forEach((x) => {
        const formatted = formatTime(x.time);
        const level = getLevel(x.kp);
        const color = getColor(x.kp);
        const emoji = getEmoji(x.kp);
        const moon = getMoonPhase(x.time);

        html += `<tr>
          <td>${formatted}</td>
          <td>${x.kp.toFixed(1)}</td>
          <td>${level}</td>
          <td>${moon}</td>
          <td style="color:${color}">${emoji}</td>
        </tr>`;
      });

      html += `</table>`;
      tableEl.innerHTML = html;
      summaryEl.textContent = "";
    } catch (err) {
      summaryEl.textContent = "❌ Error loading forecast data.";
      console.error(err);
    }
  }

  // ---------- Helper Functions ----------
  function formatTime(date) {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const d = new Date(date);
    const day = days[d.getUTCDay()];
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const h = String(d.getUTCHours()).padStart(2, "0");
    const m = String(d.getUTCMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${day} ${h}:${m}`;
  }

  function getLevel(kp) {
    if (kp < 3) return "Quiet";
    if (kp < 5) return "Active";
    if (kp < 6) return "G1 Storm";
    if (kp < 7) return "G2 Storm";
    if (kp < 8) return "G3 Storm";
    return "G4+ Storm";
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

  function getMoonPhase(date) {
    const lp = 2551443;
    const now = date.getTime() / 1000;
    const newMoon = new Date(1970, 0, 7, 20, 35).getTime() / 1000;
    const phase = ((now - newMoon) % lp) / lp;
    if (phase < 0.03 || phase > 0.97) return "🌑 New Moon";
    if (phase < 0.22) return "🌒 Waxing Crescent";
    if (phase < 0.28) return "🌓 First Quarter";
    if (phase < 0.47) return "🌔 Waxing Gibbous";
    if (phase < 0.53) return "🌕 Full Moon";
    if (phase < 0.72) return "🌖 Waning Gibbous";
    if (phase < 0.78) return "🌗 Last Quarter";
    return "🌘 Waning Crescent";
  }

  // ---------- Load forecast ----------
  loadForecast();
});


// ------------------------------
// Redirects to index.html tabs
// ------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const redirects = {
    "tab-current": "../index.html#future",
    "tab-sun": "../index.html#sun-activity",
    "tab-weather": "../index.html#weather"
  };

  Object.entries(redirects).forEach(([id, link]) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = link;
      });
    }
  });
});

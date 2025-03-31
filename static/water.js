document.addEventListener("DOMContentLoaded", () => {
  const simulateBtn = document.getElementById("simulateBtn");
  const exportBtn = document.getElementById("exportBtn");
  const viewLogsBtn = document.getElementById("viewLogsBtn");

  let barChart, donutChart;

  simulateBtn.addEventListener("click", async () => {
    const irrigation = document.getElementById("irrigation").value;
    const soil = document.getElementById("soil").value;
    const crop = document.getElementById("crop").value;
    const area = parseFloat(document.getElementById("area").value);
    const unit = document.getElementById("unit").value;
    const location = document.getElementById("location").value;

    if (!irrigation || !soil || !crop || !area || !location) {
      alert("Please fill in all fields.");
      return;
    }

    const response = await fetch("/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ irrigation, soil, crop, area, unit, location })
    });

    const data = await response.json();
    const {
      used_liters,
      used_gallons,
      saved_liters,
      saved_gallons,
      score,
      badge,
      weather,
      tip,
      eco_tip,
      rainAlert,
      match
    } = data;

    document.getElementById("results").classList.remove("hidden");

    document.getElementById("weather-summary").innerText = `🌦️ Weather: ${weather.temp}°C, ${weather.humidity}% humidity, ${weather.desc}`;
    document.getElementById("rain-alert").innerText = rainAlert ? `🌧️ Rain forecasted in next 24hr. Reduce irrigation by 30%!` : "";

    document.getElementById("water-used").innerText = `💧 Water Used: ${used_liters}L / ${used_gallons} gal`;
    document.getElementById("water-saved").innerText = `💡 Water Saved: ${saved_liters}L / ${saved_gallons} gal`;

    const level = score >= 80 ? "High" : score >= 60 ? "Moderate" : "Low";
    document.getElementById("conservation-score").innerText = `🌿 Score: ${score}% (${level})`;
    document.getElementById("badge").innerText = `🥇 Badge: ${badge}`;
    document.getElementById("soil-crop-match").innerText = `🧪 Soil-Crop Match: ${match}`;
    document.getElementById("smart-tip").innerText = `💬 Tip: ${tip}\n${eco_tip}`;

    // Bar Chart
    if (barChart) barChart.destroy();
    const ctx1 = document.getElementById("barChart").getContext("2d");
    barChart = new Chart(ctx1, {
      type: "bar",
      data: {
        labels: ["Water Used", "Water Saved"],
        datasets: [{
          label: "Liters",
          data: [used_liters, saved_liters],
          backgroundColor: ["#3b82f6", "#10b981"]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.label}: ${ctx.parsed.y.toFixed(1)} liters`
            }
          }
        }
      }
    });

    // Donut Chart
    if (donutChart) donutChart.destroy();
    const ctx2 = document.getElementById("donutChart").getContext("2d");
    donutChart = new Chart(ctx2, {
      type: "doughnut",
      data: {
        labels: ["Efficiency", "Waste"],
        datasets: [{
          data: [score, 100 - score],
          backgroundColor: ["#16a34a", "#f87171"]
        }]
      },
      options: {
        responsive: true,
        cutout: "70%",
        plugins: {
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.label}: ${ctx.parsed.toFixed(1)}%`
            }
          }
        }
      }
    });
  });

  exportBtn.addEventListener("click", async () => {
    const crop = document.getElementById("crop").value;
    const soil = document.getElementById("soil").value;
    const irrigation = document.getElementById("irrigation").value;
    const area = document.getElementById("area").value;
    const location = document.getElementById("location").value;

    const res = await fetch("/export-water-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crop, soil, irrigation, area, location })
    });

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "water_simulation_report.pdf";
    link.click();
  });

  viewLogsBtn.addEventListener("click", async () => {
    const res = await fetch("/water-logs");
    const logs = await res.json();
    const list = document.getElementById("log-list");
    list.innerHTML = "";

    logs.slice(-5).reverse().forEach(log => {
      const item = document.createElement("li");
      item.innerText = `🕒 ${new Date(log.timestamp * 1000).toLocaleString()} – ${log.input.crop} | ${log.input.irrigation} | ${log.input.soil} | Score: ${log.output.score}%`;
      list.appendChild(item);
    });
  });
});

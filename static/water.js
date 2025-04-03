document.addEventListener("DOMContentLoaded", () => {
  const simulateBtn = document.getElementById("simulateBtn");
  const exportBtn = document.getElementById("exportBtn");
  const viewLogsBtn = document.getElementById("viewLogsBtn");
  const fixBtn = document.getElementById("fixBtn");
  let barChart, donutChart;

  const cropProfiles = {
    Wheat: { soil: "Loamy", irrigation: "Sprinkler" },
    Rice: { soil: "Silty", irrigation: "Flood" },
    Corn: { soil: "Loamy", irrigation: "Sprinkler" },
    Tomato: { soil: "Loamy", irrigation: "Drip" },
    Cucumber: { soil: "Peaty", irrigation: "Drip" },
    Sugarcane: { soil: "Silty", irrigation: "Flood" },
    Lettuce: { soil: "Loamy", irrigation: "Drip" },
    Carrot: { soil: "Loamy", irrigation: "Drip" },
    Banana: { soil: "Clay", irrigation: "Sprinkler" }
  };

  async function runSimulation(inputs) {
    const res = await fetch("/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inputs)
    });

    const data = await res.json();
    const {
      used_liters, used_gallons,
      saved_liters, saved_gallons,
      score, badge, weather,
      alerts, tip, eco_tip, match
    } = data;

    document.getElementById("results").classList.remove("hidden");
    document.getElementById("water-used").innerText = `💧 Water Used: ${used_liters}L / ${used_gallons} gal`;
    document.getElementById("water-saved").innerText = `💡 Water Saved: ${saved_liters}L / ${saved_gallons} gal`;
    document.getElementById("conservation-score").innerText = `🌿 Score: ${score}% (${score > 90 ? "High" : score > 70 ? "Moderate" : "Low"})`;
    document.getElementById("badge").innerText = `🥇 Badge: ${badge}`;
    document.getElementById("weather-summary").innerText = `🌦️ Weather: ${weather.temp}°C, ${weather.humidity}% humidity, ${weather.desc}`;
    document.getElementById("rain-alert").innerText = alerts.join(" ");

    const tipBox = document.getElementById("smart-tip");
    tipBox.innerHTML = `💬 <strong>Tip:</strong><br>${tip.replace(/\n/g, "<br>")}`;

    const ecoEl = document.getElementById("eco-tip");
    ecoEl.innerHTML = `🌿 <strong>Eco Tip:</strong><br>${eco_tip.replace(/\n/g, "<br>")}`;

    const matchEl = document.getElementById("soil-crop-match");
    matchEl.innerText = `🧪 Soil-Crop Match: ${match}`;
    matchEl.className = "font-semibold whitespace-pre-line";
    matchEl.classList.remove("text-green-600", "text-yellow-500", "text-red-500");
    matchEl.classList.add(
      match === "Excellent" ? "text-green-600" :
      match === "Okay" ? "text-yellow-500" :
      "text-red-500"
    );

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
              label: ctx => `${ctx.label}: ${ctx.raw} L (${((ctx.raw / (used_liters + saved_liters)) * 100).toFixed(1)}%)`
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
  }

  simulateBtn.addEventListener("click", () => {
    const input = {
      irrigation: document.getElementById("irrigation").value,
      soil: document.getElementById("soil").value,
      crop: document.getElementById("crop").value,
      area: parseFloat(document.getElementById("area").value),
      unit: document.getElementById("unit").value,
      location: document.getElementById("location").value
    };
    if (!input.irrigation || !input.soil || !input.crop || !input.area || !input.location) {
      alert("Please fill in all fields.");
      return;
    }
    runSimulation(input);
  });

  exportBtn.addEventListener("click", async () => {
    const input = {
      irrigation: document.getElementById("irrigation").value,
      soil: document.getElementById("soil").value,
      crop: document.getElementById("crop").value,
      area: document.getElementById("area").value,
      unit: document.getElementById("unit").value,
      location: document.getElementById("location").value
    };

    const res = await fetch("/export-water-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    });

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "water_report.pdf";
    link.click();
  });

  viewLogsBtn.addEventListener("click", async () => {
    const res = await fetch("/water-logs");
    const logs = await res.json();
    const list = document.getElementById("log-list");
    list.innerHTML = "";

    if (!logs.length) {
      list.innerHTML = "<li class='text-gray-500 italic'>No past simulations found.</li>";
      return;
    }

    logs
      .filter(log => log.input && log.output)
      .slice(-5)
      .reverse()
      .forEach(log => {
        const time = new Date(log.timestamp * 1000).toLocaleString();
        const crop = log.input.crop || "N/A";
        const irrigation = log.input.irrigation || "N/A";
        const score = log.output.score || "N/A";
        const badge = log.output.badge || "";

        const item = document.createElement("li");
        item.className = "text-sm text-gray-800 bg-blue-50 border rounded p-2";
        item.innerHTML = `
          🕒 <strong>${time}</strong><br>
          🌾 <strong>Crop:</strong> ${crop} | 💧 <strong>Irrigation:</strong> ${irrigation}<br>
          ✅ <strong>Score:</strong> ${score}% | 🏅 <strong>Badge:</strong> ${badge}
        `;
        list.appendChild(item);
      });
  });

  fixBtn.addEventListener("click", async () => {
    const crop = document.getElementById("crop").value;
    const location = document.getElementById("location").value;
    const area = parseFloat(document.getElementById("area").value);
    const unit = document.getElementById("unit").value;

    if (!crop || !location || !area) {
      alert("Please select crop, farm area, and location.");
      return;
    }

    const suggestion = cropProfiles[crop];
    document.getElementById("irrigation").value = suggestion.irrigation;
    document.getElementById("soil").value = suggestion.soil;

    const optimizedInput = {
      irrigation: suggestion.irrigation,
      soil: suggestion.soil,
      crop,
      area,
      unit,
      location
    };

    // Re-run with optimized setup
    await runSimulation(optimizedInput);

    // Log to blockchain
    await fetch("/log-fix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        crop,
        area,
        location,
        irrigation: suggestion.irrigation,
        soil: suggestion.soil
      })
    });

    alert("🛠️ Fix applied! Your simulation was optimized with ideal inputs.");
  });
});

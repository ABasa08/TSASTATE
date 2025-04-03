document.addEventListener("DOMContentLoaded", async () => {
  const today = new Date("April 2, 2025");
  const dateString = today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  let chainData = [];
  let waterLogs = [];
  try {
    const chainResponse = await fetch("http://localhost:5005/chain.json");
    if (!chainResponse.ok) throw new Error("Chain data not found");
    chainData = await chainResponse.json();

    const waterResponse = await fetch("http://localhost:5005/water-logs");
    if (!waterResponse.ok) throw new Error("Water logs not found");
    waterLogs = await waterResponse.json();
  } catch (error) {
    console.error("Error fetching data:", error.message);
    document.getElementById("welcome-banner").innerHTML = `🌿 Dashboard – ${dateString} • 📍 Data Unavailable`;
  }

  // 1. Welcome Banner
  const latestLocation = getLatestLocation(waterLogs);
  document.getElementById("welcome-banner").innerHTML = `🌿 Dashboard – ${dateString} • 📍 ${latestLocation || "Unknown"}`;

  // 2. EcoScore / Water Saved Stats
  const { ecoScore, waterSaved } = calculateSustainabilityStats(chainData, waterLogs);
  updateEcoScore(ecoScore);
  updateWaterSaved(waterSaved);

  // 3. Dual-Axis Time Toggle Chart
  const chartCtx = document.getElementById("dual-axis-chart").getContext("2d");
  let dualAxisChart = initDualAxisChart(chartCtx, chainData, waterLogs);
  const toggleButtons = {
    yearly: document.getElementById("yearlyBtn"),
    monthly: document.getElementById("monthlyBtn"),
    weekly: document.getElementById("weeklyBtn")
  };
  Object.entries(toggleButtons).forEach(([timeframe, btn]) => {
    btn.addEventListener("click", () => updateChart(timeframe, dualAxisChart, chainData, waterLogs, toggleButtons));
  });

  // 4. Crop Status Cards
  await renderCropStatusCards(chainData);

  // 5. Irrigation Schedule Table
  await renderIrrigationSchedule(waterLogs);

  // 6. Blockchain Trail Table
  await renderBlockchainTrail(chainData);

  // 7. Add Schedule Button
  document.getElementById("addScheduleBtn").addEventListener("click", () => {
    alert("Opening irrigation schedule form...");
  });

  // View All Blockchain Button
  document.getElementById("viewAllBlockchainBtn").addEventListener("click", async () => {
    renderBlockchainTrail(chainData, true);
  });
});

function getLatestLocation(waterLogs) {
  const latestWaterLog = waterLogs[waterLogs.length - 1];
  return latestWaterLog?.data?.input?.location || "Unknown";
}

function calculateSustainabilityStats(chainData, waterLogs) {
  const ecoScores = [
    ...chainData.filter(b => b.feature === "EcoScore Prediction").map(b => b.data.output.score),
    ...waterLogs.map(w => w.data.output.score)
  ];
  const ecoScore = ecoScores.length ? Math.round(ecoScores.reduce((a, b) => a + b, 0) / ecoScores.length) : 0;
  const waterSaved = waterLogs.reduce((sum, log) => sum + (log.data.output.saved_liters || 0), 0);
  return { ecoScore, waterSaved };
}

function updateEcoScore(score) {
  document.getElementById("eco-score").textContent = score;
  document.getElementById("eco-progress").style.width = `${score}%`;
  document.getElementById("eco-trend").innerHTML = `<i class="fas fa-arrow-up"></i> ${score >= 80 ? "Excellent" : score >= 50 ? "Moderate" : "Poor"}`;
}

function updateWaterSaved(waterSaved) {
  document.getElementById("water-saved").textContent = Math.round(waterSaved).toLocaleString();
  document.getElementById("water-progress").style.width = `${Math.min(100, (waterSaved / 50000) * 100)}%`;
  document.getElementById("water-trend").innerHTML = `<i class="fas fa-arrow-up"></i> ${waterSaved > 10000 ? "Great Savings" : "Keep Going"}`;
}

function initDualAxisChart(ctx, chainData, waterLogs) {
  const yieldData = chainData.filter(b => b.feature === "Crop Planner").map(b => parseFloat(b.data.output.yield.match(/[\d.]+/)[0]) || 0);
  const waterData = waterLogs.map(w => w.data.output.used_liters / 1000);

  return new Chart(ctx, {
    data: {
      labels: Array(Math.max(yieldData.length, waterData.length)).fill().map((_, i) => `Period ${i + 1}`),
      datasets: [
        {
          type: 'bar',
          label: 'Yield (Tons)',
          data: yieldData,
          backgroundColor: 'rgba(22, 163, 74, 0.7)',
          borderColor: 'rgba(22, 163, 74, 1)',
          borderWidth: 1
        },
        {
          type: 'line',
          label: 'Water Usage (1000L)',
          data: waterData,
          borderColor: 'rgba(59, 130, 246, 1)',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, title: { display: true, text: 'Yield (Tons)', color: '#16a34a' } },
        y1: { beginAtZero: true, position: 'right', title: { display: true, text: 'Water Usage (1000L)', color: '#3b82f6' } }
      }
    }
  });
}

async function updateChart(timeframe, chart, chainData, waterLogs, buttons) {
  let labels, yieldData, waterUsageData;
  const yieldFullData = chainData.filter(b => b.feature === "Crop Planner").map(b => parseFloat(b.data.output.yield.match(/[\d.]+/)[0]) || 0);
  const waterFullData = waterLogs.map(w => w.data.output.used_liters / 1000);

  switch (timeframe) {
    case "yearly":
      labels = Array(12).fill().map((_, i) => new Date(2025, i).toLocaleString("en-US", { month: "short" }));
      yieldData = yieldFullData.slice(-12);
      waterUsageData = waterFullData.slice(-12);
      break;
    case "monthly":
      labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      yieldData = yieldFullData.slice(-4);
      waterUsageData = waterFullData.slice(-4);
      break;
    case "weekly":
      labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      yieldData = yieldFullData.slice(-7);
      waterUsageData = waterFullData.slice(-7);
      break;
  }

  chart.data.labels = labels;
  chart.data.datasets[0].data = yieldData.concat(Array(labels.length - yieldData.length).fill(0));
  chart.data.datasets[1].data = waterUsageData.concat(Array(labels.length - waterUsageData.length).fill(0));
  chart.update();

  Object.values(buttons).forEach(btn => {
    btn.classList.remove("btn-outline-success", "active");
    btn.classList.add("btn-outline-secondary");
  });
  buttons[timeframe].classList.remove("btn-outline-secondary");
  buttons[timeframe].classList.add("btn-outline-success", "active");
}

async function renderCropStatusCards(chainData) {
  const container = document.getElementById("crop-status-container");
  container.innerHTML = "";
  const cropBlocks = chainData.filter(b => b.feature === "Crop Planner").slice(-3);

  cropBlocks.forEach(block => {
    const { input, output } = block.data;
    const efficiency = ((parseFloat(output.yield.match(/[\d.]+/)[0]) / input.yield) * 100) || 80;
    const health = efficiency >= 95 ? "Excellent" : efficiency >= 85 ? "Good" : "Fair";
    const progress = Math.min(100, Math.random() * 100); // Placeholder

    const card = `
      <div class="bg-white rounded-lg shadow overflow-hidden hover-zoom">
        <div class="bg-${health === 'Excellent' ? 'green' : health === 'Good' ? 'yellow' : 'red'}-100 p-3 flex justify-between items-center">
          <h3 class="font-semibold text-${health === 'Excellent' ? 'green' : health === 'Good' ? 'yellow' : 'red'}-800">${input.crop}</h3>
          <span class="bg-${health === 'Excellent' ? 'green' : health === 'Good' ? 'yellow' : 'red'}-500 text-white text-xs px-2 py-1 rounded-full">Growing</span>
        </div>
        <div class="p-4">
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div><div class="text-gray-600">Area</div><div class="font-medium">${input.area} acres</div></div>
            <div><div class="text-gray-600">Soil</div><div class="font-medium">${input.soil}</div></div>
            <div><div class="text-gray-600">Planted</div><div class="font-medium">${new Date(block.timestamp * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div></div>
            <div><div class="text-gray-600">Est. Harvest</div><div class="font-medium">${new Date(block.timestamp * 1000 + 90 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div></div>
            <div><div class="text-gray-600">Health</div><div class="font-medium text-${health === 'Excellent' ? 'green' : health === 'Good' ? 'yellow' : 'red'}-600">${health}</div></div>
          </div>
          <div class="mt-3">
            <div class="text-xs text-gray-600 mb-1">Growth Progress</div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div class="bg-${health === 'Excellent' ? 'green' : health === 'Good' ? 'yellow' : 'red'}-500 h-2 rounded-full" style="width: ${progress}%"></div>
            </div>
            <div class="text-xs text-gray-600 text-right">${progress.toFixed(0)}%</div>
          </div>
        </div>
      </div>`;
    container.innerHTML += card;
  });
}

async function renderIrrigationSchedule(waterLogs) {
  const tbody = document.getElementById("irrigation-table-body");
  tbody.innerHTML = "";
  const latestLogs = waterLogs.slice(-3);

  latestLogs.forEach(log => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${log.data.input.crop}</td>
      <td>${log.data.input.irrigation}</td>
      <td>Mon, Wed, Fri</td> <!-- Placeholder -->
      <td>${Math.round(log.data.output.used_liters)} L/day</td>
      <td><span class="badge bg-success">Active</span></td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-primary me-1 edit-btn"><i class="fas fa-edit"></i></button>
        <button class="btn btn-sm btn-outline-danger delete-btn"><i class="fas fa-trash"></i></button>
      </td>`;
    tbody.appendChild(row);
  });

  document.querySelectorAll(".edit-btn").forEach(btn => {
    btn.addEventListener("click", () => alert(`Editing irrigation for ${btn.closest("tr").cells[0].textContent}`));
  });
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      if (confirm("Are you sure?")) btn.closest("tr").remove();
    });
  });
}

async function renderBlockchainTrail(chainData, showAll = false) {
  const tbody = document.getElementById("blockchain-table-body");
  tbody.innerHTML = "";
  const dataToShow = showAll ? chainData : chainData.slice(-3);

  dataToShow.forEach(block => {
    const time = new Date(block.timestamp * 1000).toLocaleString();
    const action = block.feature === "Crop Planner" ? `${block.data.input.crop} Plan` : block.feature === "Water Simulation" ? "Water Simulation" : block.feature;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${time}</td>
      <td>${action}</td>
      <td><code class="text-xs bg-gray-100 p-1 rounded">${block.hash.slice(0, 10)}...</code></td>
      <td><span class="badge bg-success">Verified</span></td>`;
    tbody.appendChild(row);
  });
}


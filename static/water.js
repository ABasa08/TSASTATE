document.addEventListener("DOMContentLoaded", () => {
    const simulateBtn = document.getElementById("simulateBtn");
    const waterSlider = document.getElementById("waterSlider");
    const waterValue = document.getElementById("waterValue");
    let chartInstance = null;
  
    // Update slider value display
    waterSlider.addEventListener("input", () => {
      waterValue.textContent = `${waterSlider.value} liters/acre`;
    });
  
    simulateBtn.addEventListener("click", async () => {
      const irrigationMethod = document.getElementById("irrigation").value;
      const soilType = document.getElementById("soil").value;
      const cropType = document.getElementById("crop").value;
      const farmSize = parseFloat(document.getElementById("farmSize").value) || 1;
      const waterInput = parseFloat(waterSlider.value);
  
      if (!irrigationMethod || !soilType || !cropType || !farmSize) {
        alert("Please fill in all fields.");
        return;
      }
  
      // Calculate water usage based on crop and irrigation
      const baseWaterNeeds = {
        Wheat: 300, // liters/acre
        Rice: 1200,
        Corn: 500,
        Tomato: 400
      };
      let waterUsed = baseWaterNeeds[cropType] * farmSize;
      let efficiencyFactor = { Drip: 0.6, Sprinkler: 0.8, Flood: 1.0 }; // Lower = more efficient
      waterUsed *= efficiencyFactor[irrigationMethod];
  
      // Adjust with slider input
      waterUsed = Math.min(waterUsed, waterInput * farmSize); // Cap at user-adjusted input
      const waterSaved = (baseWaterNeeds[cropType] * farmSize - waterUsed).toFixed(1);
  
      // Fetch weather and tips
      const weatherData = await fetchWeatherData();
      const tips = getWaterSavingTips(soilType, cropType, irrigationMethod, weatherData);
  
      // Display results
      document.getElementById("water-used").innerText = `💧 Water Used: ${waterUsed.toFixed(1)} liters`;
      document.getElementById("water-saved").innerText = `💡 Water Saved: ${waterSaved} liters`;
      document.getElementById("water-saving-tips").innerText = `🌱 Tip: ${tips}`;
      document.getElementById("water-output").classList.remove("hidden");
  
      // Blockchain logging (stub)
      logToBlockchain({ irrigationMethod, soilType, cropType, farmSize, waterUsed, waterSaved, timestamp: new Date() });
  
      // Generate chart
      if (chartInstance) chartInstance.destroy();
      const ctx = document.getElementById("water-chart").getContext("2d");
      chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
          labels: ["Water Used", "Water Saved"],
          datasets: [{
            label: "Water (liters)",
            data: [waterUsed, waterSaved],
            backgroundColor: ["#f6ad55", "#38a169"],
            borderColor: "#2f855a",
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          scales: { y: { beginAtZero: true } },
          plugins: { legend: { position: "top" } }
        }
      });
    });
  
    // Stub for viewing past data
    document.getElementById("viewDataBtn").addEventListener("click", () => {
      alert("Past simulations would be displayed here (blockchain data).");
    });
  });
  
  // Weather API fetch
  async function fetchWeatherData() {
    const apiKey = "YOUR_API_KEY"; // Replace with your OpenWeatherMap key
    const city = "YOUR_CITY"; // Replace with a default or user-input location
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      return { rainExpected: data.list.some(item => item.rain && item.rain["3h"] > 0) };
    } catch (e) {
      console.error("Weather fetch failed:", e);
      return { rainExpected: false };
    }
  }
  
  // Enhanced tips function
  function getWaterSavingTips(soilType, cropType, irrigationMethod, weatherData) {
    const baseTips = {
      Loamy: `Loamy soil retains water well. For ${cropType}, use ${irrigationMethod} sparingly.`,
      Sandy: `Sandy soil drains fast. For ${cropType}, mulch and use ${irrigationMethod} consistently.`,
      Clay: `Clay holds water. For ${cropType}, avoid overwatering with ${irrigationMethod}.`,
      Silty: `Silty soil retains moisture. For ${cropType}, monitor ${irrigationMethod} usage.`,
      Peaty: `Peaty soil is water-rich. For ${cropType}, reduce ${irrigationMethod} frequency.`,
      Chalky: `Chalky soil needs care. For ${cropType}, adjust ${irrigationMethod} to avoid runoff.`
    };
    let tip = baseTips[soilType] || "Adjust irrigation based on crop needs.";
    if (weatherData.rainExpected) tip += " 🌧️ Skip irrigation today due to rain!";
    return tip;
  }
  
  // Blockchain logging (stub)
  function logToBlockchain(data) {
    console.log("Logged to blockchain:", data); // Replace with actual blockchain integration
  }
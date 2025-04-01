document.addEventListener("DOMContentLoaded", async () => {
    const viewDataBtn = document.getElementById("viewDataBtn");
    let waterSaved = 0;
    let yieldEfficiency = 0;
    let soilHealth = 0;
    let plannerCount = 0;
    let waterCount = 0;
  
    // Fetch initial blockchain data
    const plannerRes = await fetch("/chain.json");
    const plannerData = await plannerRes.json();
    const waterRes = await fetch("/water-logs");
    const waterData = await waterRes.json();
  
    // Process initial Crop Planner data
    plannerData.forEach(block => {
      if (block.feature === "Crop Planner" && block.data) {
        const { input, output } = block.data;
        const pastYield = parseFloat(input.yield);
        const predictedYield = parseFloat(output.yield.match(/[\d.]+/)[0]);
        yieldEfficiency += (predictedYield / pastYield) * 100;
        plannerCount++;
  
        const soilScores = { Loamy: 80, Clay: 60, Sandy: 50, Silty: 70, Peaty: 75, Chalky: 55 };
        soilHealth += soilScores[input.soil] || 50;
      }
    });
  
    // Process initial Water Tool data
    waterData.forEach(log => {
      if (log.data && log.data.input && log.data.output) {
        waterSaved += parseFloat(log.data.output.saved_liters);
        waterCount++;
      }
    });
  
    // Calculate averages
    yieldEfficiency = plannerCount ? (yieldEfficiency / plannerCount).toFixed(1) : 0;
    soilHealth = plannerCount ? (soilHealth / plannerCount).toFixed(0) : 0;
    waterSaved = waterCount ? waterSaved : 0;
  
    // WebSocket for real-time updates
    const socket = new WebSocket("ws://localhost:5000/updates");
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "water") {
        waterSaved += parseFloat(data.data.output.saved_liters);
        waterCount++;
        updateWaterChart();
      } else if (data.type === "planner") {
        const pastYield = parseFloat(data.data.input.yield);
        const predictedYield = parseFloat(data.data.output.yield.match(/[\d.]+/)[0]);
        yieldEfficiency = ((yieldEfficiency * plannerCount) + (predictedYield / pastYield) * 100) / (plannerCount + 1);
        plannerCount++;
        const soilScores = { Loamy: 80, Clay: 60, Sandy: 50, Silty: 70, Peaty: 75, Chalky: 55 };
        soilHealth = ((soilHealth * (plannerCount - 1)) + (soilScores[data.data.input.soil] || 50)) / plannerCount;
        updateYieldChart();
        updateSoilChart();
      }
      updateEcoScore();
    };
  
    // AI EcoScore Prediction
    async function getEcoScore() {
      const res = await fetch("/predict-ecoscore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waterSaved, yieldEfficiency, soilHealth })
      });
      const data = await res.json();
      return { score: data.score, tip: data.tip };
    }
  
    // Charts
    const ecoscoreCtx = document.getElementById("ecoscore-chart").getContext("2d");
    let ecoscoreChart = new Chart(ecoscoreCtx, {
      type: "doughnut",
      data: {
        labels: ["EcoScore", "Remaining"],
        datasets: [{ data: [0, 100], backgroundColor: ["#16a34a", "#e5e7eb"] }]
      },
      options: { cutout: "70%", plugins: { legend: { display: false } } }
    });
  
    const waterCtx = document.getElementById("water-chart").getContext("2d");
    let waterChart = new Chart(waterCtx, {
      type: "bar",
      data: {
        labels: ["Water Saved"],
        datasets: [{ label: "Liters", data: [waterSaved], backgroundColor: "#10b981" }]
      },
      options: { scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } } }
    });
  
    const soilCanvas = document.getElementById("soil-chart");
    const soilRenderer = new THREE.WebGLRenderer({ canvas: soilCanvas, antialias: true });
    soilRenderer.setSize(soilCanvas.clientWidth, soilCanvas.clientHeight);
    const soilScene = new THREE.Scene();
    const soilCamera = new THREE.PerspectiveCamera(45, soilCanvas.clientWidth / soilCanvas.clientHeight, 0.1, 1000);
    soilCamera.position.set(0, 5, 10);
    const soilControls = new THREE.OrbitControls(soilCamera, soilRenderer.domElement);
    const soilBar = new THREE.Mesh(
      new THREE.BoxGeometry(2, soilHealth / 10, 2),
      new THREE.MeshBasicMaterial({ color: 0x8B4513 })
    );
    soilScene.add(soilBar);
    function animateSoil() {
      requestAnimationFrame(animateSoil);
      soilControls.update();
      soilRenderer.render(soilScene, soilCamera);
    }
    animateSoil();
  
    const yieldCanvas = document.getElementById("yield-chart");
    const yieldRenderer = new THREE.WebGLRenderer({ canvas: yieldCanvas, antialias: true });
    yieldRenderer.setSize(yieldCanvas.clientWidth, yieldCanvas.clientHeight);
    const yieldScene = new THREE.Scene();
    const yieldCamera = new THREE.PerspectiveCamera(45, yieldCanvas.clientWidth / yieldCanvas.clientHeight, 0.1, 1000);
    yieldCamera.position.set(0, 5, 10);
    const yieldControls = new THREE.OrbitControls(yieldCamera, yieldRenderer.domElement);
    const yieldBar = new THREE.Mesh(
      new THREE.BoxGeometry(2, yieldEfficiency / 10, 2),
      new THREE.MeshBasicMaterial({ color: 0x34d399 })
    );
    yieldScene.add(yieldBar);
    function animateYield() {
      requestAnimationFrame(animateYield);
      yieldControls.update();
      yieldRenderer.render(yieldScene, yieldCamera);
    }
    animateYield();
  
    // Update functions
    async function updateEcoScore() {
      const { score, tip } = await getEcoScore();
      ecoscoreChart.data.datasets[0].data = [score, 100 - score];
      ecoscoreChart.update();
      document.getElementById("ecoscore-text").textContent = `Current: ${score >= 75 ? "Gold" : score >= 50 ? "Silver" : "Bronze"} (${score}%)`;
      document.getElementById("ai-tip").textContent = `AI Tip: ${tip}`;
    }
  
    function updateWaterChart() {
      waterChart.data.datasets[0].data = [waterSaved];
      waterChart.update();
      document.getElementById("water-text").textContent = `Total: ${waterSaved.toFixed(0)}L`;
    }
  
    function updateSoilChart() {
      soilBar.scale.y = soilHealth / 10;
      document.getElementById("soil-text").textContent = `Score: ${soilHealth}%`;
    }
  
    function updateYieldChart() {
      yieldBar.scale.y = yieldEfficiency / 10;
      document.getElementById("yield-text").textContent = `Average: ${yieldEfficiency}%`;
    }
  
    // Initial updates
    updateEcoScore();
    updateWaterChart();
    updateSoilChart();
    updateYieldChart();
  
    // Blockchain Data
    viewDataBtn.addEventListener("click", () => {
      const list = document.getElementById("blockchain-data");
      list.innerHTML = "";
  
      plannerData.forEach(block => {
        if (block.feature === "Crop Planner") {
          const { input, output } = block.data;
          const time = new Date(block.timestamp * 1000).toLocaleString();
          const li = document.createElement("li");
          li.textContent = `🕒 ${time} – Crop: ${input.crop}, Yield: ${output.yield}`;
          list.appendChild(li);
        }
      });
  
      waterData.forEach(log => {
        if (log.data && log.data.input && log.data.output) {
          const time = new Date(log.timestamp * 1000).toLocaleString();
          const li = document.createElement("li");
          li.textContent = `🕒 ${time} – Crop: ${log.data.input.crop}, Water Saved: ${log.data.output.saved_liters}L`;
          list.appendChild(li);
        }
      });
  
      document.getElementById("blockchain-modal").classList.remove("hidden");
    });
  });
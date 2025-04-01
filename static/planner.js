console.log("✅ JS Loaded");

document.addEventListener("DOMContentLoaded", () => {
  const predictBtn = document.getElementById("predictBtn");
  const viewDataBtn = document.getElementById("viewDataBtn");
  const graphBtn = document.getElementById("showGraph");
  const visualizeBtn = document.getElementById("visualizeBtn");

  let predictedYield = 0;
  let pastYield = 0;

  predictBtn.addEventListener("click", async () => {
    const crop = document.getElementById("crop").value;
    const soil = document.getElementById("soil").value;
    const area = document.getElementById("area").value;
    pastYield = parseFloat(document.getElementById("yield").value);

    if (!crop || !soil || !area || !pastYield) {
      alert("Please fill in all fields.");
      return;
    }

    const res = await fetch("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crop, soil, area, yield: pastYield })
    });

    const data = await res.json();
    predictedYield = parseFloat(data.yield.match(/[\d.]+/)[0]);
    const efficiency = ((predictedYield / pastYield) * 100).toFixed(1);

    const badgeLabel = efficiency >= 95 ? "🟩 Good" : efficiency >= 85 ? "🟨 Moderate" : "🟥 Poor";
    const badgeColor = efficiency >= 95 ? "bg-green-600" : efficiency >= 85 ? "bg-yellow-500" : "bg-red-600";

    document.getElementById("yield-result").textContent = `📈 Predicted Yield: ${data.yield}`;
    document.getElementById("yield-diff").textContent =
      predictedYield > pastYield
        ? `⬆️ Up ${Math.abs(predictedYield - pastYield).toFixed(2)} tons from last season`
        : predictedYield < pastYield
        ? `⬇️ Down ${Math.abs(predictedYield - pastYield).toFixed(2)} tons from last season`
        : `➡️ Same as last season`;

    document.getElementById("efficiency-result").textContent = `🔢 Efficiency Score: ${efficiency}%`;
    const badge = document.getElementById("badge-result");
    badge.textContent = `🎖️ Efficiency Badge: ${badgeLabel}`;
    badge.className = `font-bold text-white inline-block px-3 py-1 rounded-full ${badgeColor}`;

    document.getElementById("companion-result").textContent = `🌻 Companion Crops: ${data.companions.join(", ")}`;
    document.getElementById("farming-tip").textContent = `🌿 Tip: ${data.tip}`;

    document.getElementById("planner-output").classList.remove("hidden");
    document.getElementById("planner-output").scrollIntoView({ behavior: "smooth" });
  });

  graphBtn.addEventListener("click", () => {
    if (!predictedYield || !pastYield) return;

    const ctx = document.getElementById("yield-chart").getContext("2d");
    if (window.yieldChart) window.yieldChart.destroy();

    window.yieldChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Past Yield", "Predicted Yield"],
        datasets: [{
          label: "Yield (tons)",
          data: [pastYield, predictedYield],
          backgroundColor: ["#f87171", "#34d399"]
        }]
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true } },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: context => ` ${context.dataset.label}: ${context.parsed.y} tons`
            }
          }
        }
      }
    });

    const insight = document.getElementById("graph-insight");
    const summary = document.getElementById("graph-summary");
    if (predictedYield > pastYield) {
      insight.textContent = "📈 Your predicted yield is higher than your past performance. Great job improving efficiency!";
    } else if (predictedYield < pastYield) {
      insight.textContent = "⚠️ Predicted yield is lower. Consider adjusting crop rotation or water usage.";
    } else {
      insight.textContent = "🔍 Predicted yield is the same as last season. Consistency is good — but there's room to optimize.";
    }
    summary.classList.remove("hidden");
  });

  viewDataBtn.addEventListener("click", async () => {
    const list = document.getElementById("blockchain-data");
    list.innerHTML = "";

    const res = await fetch("/chain.json");
    const data = await res.json();

    data.forEach(block => {
      if (block.feature === "Crop Planner") {
        const { input, output } = block.data;
        const time = new Date(block.timestamp * 1000).toLocaleString();
        const li = document.createElement("li");
        li.textContent = `🕒 ${time} – ${input.crop} | ${input.area} acres | Yield: ${output.yield}, Companions: ${output.companions.join(", ")}`;
        list.appendChild(li);
      }
    });

    document.getElementById("all-data-modal").classList.remove("hidden");
    document.getElementById("all-data-modal").scrollIntoView({ behavior: "smooth" });
  });

  // 3D Visualization with OrbitControls (Module Version)
  visualizeBtn.addEventListener("click", async () => {
    const crop = document.getElementById("crop").value;
    const soil = document.getElementById("soil").value;
    const area = parseFloat(document.getElementById("area").value);
    if (!crop || !soil || !area) {
      alert("Please select crop, soil, and area first.");
      return;
    }

    try {
      console.log("Loading Three.js and OrbitControls dynamically...");
      const THREE = await import('https://unpkg.com/three@0.149.0/build/three.module.js');
      const { OrbitControls } = await import('https://unpkg.com/three@0.149.0/examples/jsm/controls/OrbitControls.js');

      console.log("✅ Three.js and OrbitControls loaded successfully.");

      const container = document.getElementById("farm3d-container");
      const canvas = document.getElementById("farm3d");
      container.classList.remove("hidden");

      const newCanvas = canvas.cloneNode();
      canvas.parentNode.replaceChild(newCanvas, canvas);

      const renderer = new THREE.WebGLRenderer({ canvas: newCanvas, antialias: true });
      renderer.setSize(newCanvas.clientWidth, newCanvas.clientHeight);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf0fdf4);

      const camera = new THREE.PerspectiveCamera(60, newCanvas.clientWidth / newCanvas.clientHeight, 0.1, 1000);
      camera.position.set(10, 10, 15);

      const light = new THREE.DirectionalLight(0xffffff, 1);
      light.position.set(5, 10, 7.5);
      scene.add(light);

      const ambient = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambient);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;
      controls.enableZoom = true;
      controls.autoRotate = false;

      const soilColors = {
        Loamy: 0x8B4513, Clay: 0xB87333, Sandy: 0xEDC9AF,
        Silty: 0xA0522D, Peaty: 0x5C4033, Chalky: 0xF5F5DC
      };
      const soilColor = soilColors[soil] || 0xcccccc;

      const soilGeo = new THREE.BoxGeometry(12, 0.5, 12);
      const soilMat = new THREE.MeshStandardMaterial({ color: soilColor });
      const soilBlock = new THREE.Mesh(soilGeo, soilMat);
      soilBlock.position.y = -0.25;
      scene.add(soilBlock);

      const cropMat = new THREE.MeshStandardMaterial({ color: 0x32CD32 });
      const cropCount = Math.min(25, Math.floor(area));
      const rows = Math.ceil(Math.sqrt(cropCount));
      const spacing = 1.2;

      for (let i = 0; i < cropCount; i++) {
        const cube = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1, 0.5), cropMat);
        const x = (i % rows - rows / 2) * spacing;
        const z = (Math.floor(i / rows) - rows / 2) * spacing;
        cube.position.set(x, 0.5, z);
        scene.add(cube);
      }

      function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      }

      animate();
    } catch (error) {
      console.error("Failed to load Three.js or OrbitControls:", error);
      alert("Failed to load 3D visualization libraries. Please try again later.");
    }
  });
});
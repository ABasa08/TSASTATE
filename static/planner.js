document.addEventListener("DOMContentLoaded", () => {
  const predictBtn = document.getElementById("predictBtn");
  const viewDataBtn = document.getElementById("viewDataBtn");
  const graphBtn = document.getElementById("showGraph");
  const visualizeBtn = document.getElementById("visualizeBtn");

  let predictedYield = 0;
  let pastYield = 0;
  let scene, renderer, camera, controls;

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
        plugins: { legend: { display: false } }
      }
    });

    const insight = document.getElementById("graph-insight");
    const summary = document.getElementById("graph-summary");
    insight.textContent = predictedYield > pastYield
      ? "📈 Your predicted yield is higher than your past performance!"
      : predictedYield < pastYield
      ? "⚠️ Predicted yield is lower. Consider optimizing."
      : "🔍 Predicted yield matches last season.";
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
        li.textContent = `🕒 ${time} – ${input.crop} | ${input.area} acres | Yield: ${output.yield}`;
        list.appendChild(li);
      }
    });

    document.getElementById("all-data-modal").classList.remove("hidden");
  });

  // Enhanced 3D Visualization with Fixed Growth Stages
  visualizeBtn.addEventListener("click", () => {
    const crop = document.getElementById("crop").value;
    const soil = document.getElementById("soil").value;
    const area = parseFloat(document.getElementById("area").value);
    const efficiency = predictedYield && pastYield ? (predictedYield / pastYield) * 100 : 0;
    const companions = document.getElementById("companion-result").textContent.split(": ")[1]?.split(", ") || [];

    if (!crop || !soil || !area) {
      alert("Please select crop, soil, and area first.");
      return;
    }

    // Show 3D container
    const container = document.getElementById("farm3d-container");
    container.classList.remove("hidden");

    // Initialize Three.js
    const canvas = document.getElementById("farm3d");
    if (!canvas) {
      console.error("Canvas element 'farm3d' not found!");
      return;
    }

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setClearColor(0x87CEEB, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    scene = new THREE.Scene();

    // Skybox
    const skyboxGeo = new THREE.BoxGeometry(500, 500, 500);
    const skyboxMats = [
      new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide }),
      new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide }),
      new THREE.MeshBasicMaterial({ color: 0xB0E0E6, side: THREE.BackSide }),
      new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide }),
      new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide }),
      new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide })
    ];
    const skybox = new THREE.Mesh(skyboxGeo, skyboxMats);
    scene.add(skybox);

    camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.set(20, 10, 20);

    // Lighting (no day/night cycle, so static lighting)
    const sun = new THREE.DirectionalLight(0xffffbb, 1.2);
    sun.position.set(10, 20, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 50;
    scene.add(sun);
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x5C4033, 0.3);
    scene.add(hemisphereLight);

    // OrbitControls
    if (!THREE.OrbitControls) {
      console.error("OrbitControls not loaded!");
      return;
    }
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.enableZoom = true;

    // Ground with procedural texture
    const soilProperties = {
      Loamy: { color: 0x8B4513, roughness: 0.9, metalness: 0.1, bumpScale: 0.05, detailScale: 0.1 },
      Clay: { color: 0xB87333, roughness: 0.85, metalness: 0.15, bumpScale: 0.03, detailScale: 0.15 },
      Sandy: { color: 0xEDC9AF, roughness: 0.6, metalness: 0.05, bumpScale: 0.07, detailScale: 0.2 },
      Silty: { color: 0xA0522D, roughness: 0.75, metalness: 0.1, bumpScale: 0.04, detailScale: 0.12 },
      Peaty: { color: 0x3B2F2F, roughness: 0.95, metalness: 0.05, bumpScale: 0.06, detailScale: 0.08 },
      Chalky: { color: 0xF5F5DC, roughness: 0.5, metalness: 0.2, bumpScale: 0.02, detailScale: 0.05 }
    };
    const groundSize = Math.sqrt(area) * 10;
    const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize, 128, 128);
    const soilProps = soilProperties[soil] || { color: 0xcccccc, roughness: 0.9, metalness: 0.1, bumpScale: 0.05, detailScale: 0.1 };

    const positions = groundGeo.attributes.position.array;
    for (let i = 2; i < positions.length; i += 3) {
      const x = positions[i - 2];
      const z = positions[i - 1];
      positions[i] += Math.sin(x * 0.1) * Math.cos(z * 0.1) * soilProps.bumpScale;
      positions[i] += Math.random() * soilProps.detailScale;
    }
    groundGeo.attributes.position.needsUpdate = true;
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      color: soilProps.color,
      roughness: soilProps.roughness,
      metalness: soilProps.metalness
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.userData = { type: "soil", name: soil };
    scene.add(ground);

    // Irrigation lines
    const pipeGeo = new THREE.CylinderGeometry(0.05, 0.05, groundSize, 8);
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const pipes = [];
    for (let i = 0; i < 2; i++) {
      const pipe = new THREE.Mesh(pipeGeo, pipeMat);
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(0, 0.1, i === 0 ? -groundSize / 4 : groundSize / 4);
      pipe.castShadow = true;
      pipe.visible = false;
      scene.add(pipe);
      pipes.push(pipe);
    }

    // Crop models with enhanced realism and growth stages
    const cropCount = Math.min(50, Math.floor(area * 5));
    const rows = Math.ceil(Math.sqrt(cropCount));
    const spacing = groundSize / rows;
    const crops = [];

    const cropStyles = {
      Wheat: {
        type: "stalk",
        height: 1.5,
        width: 0.1,
        color: 0xFFD700,
        leafColor: 0x228B22,
        leafCount: 4,
        leafWidth: 0.3,
        leafHeight: 0.1,
        fruitHeight: 0.4,
        fruitWidth: 0.2
      },
      Rice: {
        type: "stalk",
        height: 1.2,
        width: 0.08,
        color: 0x7CFC00,
        leafColor: 0x228B22,
        leafCount: 4,
        leafWidth: 0.3,
        leafHeight: 0.1,
        fruitHeight: 0.3,
        fruitWidth: 0.15
      },
      Corn: {
        type: "stalk",
        height: 2,
        width: 0.15,
        color: 0xFFFF99,
        leafColor: 0x228B22,
        leafCount: 6,
        leafWidth: 0.4,
        leafHeight: 0.15,
        fruitHeight: 0.5,
        fruitWidth: 0.2
      },
      Tomato: {
        type: "bush",
        height: 1,
        width: 0.8,
        color: 0xFF6347,
        leafColor: 0x228B22,
        leafCount: 5,
        leafWidth: 0.3,
        leafHeight: 0.1,
        fruitHeight: 0.2,
        fruitWidth: 0.2
      },
      Cucumber: {
        type: "vine",
        height: 0.5,
        width: 0.3,
        color: 0x006400,
        leafColor: 0x228B22,
        leafCount: 6,
        leafWidth: 0.4,
        leafHeight: 0.15,
        fruitHeight: 0.6,
        fruitWidth: 0.1
      },
      Sugarcane: {
        type: "stalk",
        height: 2.5,
        width: 0.2,
        color: 0x9ACD32,
        leafColor: 0x228B22,
        leafCount: 4,
        leafWidth: 0.5,
        leafHeight: 0.2,
        fruitHeight: 0,
        fruitWidth: 0
      },
      Lettuce: {
        type: "bush",
        height: 0.4,
        width: 0.5,
        color: 0x32CD32,
        leafColor: 0x32CD32,
        leafCount: 8,
        leafWidth: 0.3,
        leafHeight: 0.1,
        fruitHeight: 0,
        fruitWidth: 0
      },
      Carrot: {
        type: "root",
        height: 0.4,
        width: 0.15,
        color: 0xFF4500,
        leafColor: 0x228B22,
        leafCount: 8,
        leafWidth: 0.2,
        leafHeight: 0.3,
        fruitHeight: 0,
        fruitWidth: 0
      },
      Banana: {
        type: "tree",
        height: 2,
        width: 0.2,
        color: 0xFFFF00,
        leafColor: 0x228B22,
        leafCount: 4,
        leafWidth: 0.5,
        leafHeight: 0.2,
        fruitHeight: 0.5,
        fruitWidth: 0.1
      }
    };

    // Define growth stages for each crop
    const growthStages = {
      Wheat: {
        Sprout: { heightScale: 0.3, leafCount: 2, fruit: false },
        Growing: { heightScale: 0.6, leafCount: 3, fruit: false },
        Mature: { heightScale: 1.0, leafCount: 4, fruit: true }
      },
      Rice: {
        Sprout: { heightScale: 0.3, leafCount: 2, fruit: false },
        Growing: { heightScale: 0.6, leafCount: 3, fruit: false },
        Mature: { heightScale: 1.0, leafCount: 4, fruit: true }
      },
      Corn: {
        Sprout: { heightScale: 0.3, leafCount: 2, fruit: false },
        Growing: { heightScale: 0.6, leafCount: 4, fruit: false },
        Mature: { heightScale: 1.0, leafCount: 6, fruit: true }
      },
      Tomato: {
        Sprout: { heightScale: 0.3, leafCount: 2, fruit: false },
        Growing: { heightScale: 0.6, leafCount: 3, fruit: true, fruitScale: 0.5 },
        Mature: { heightScale: 1.0, leafCount: 5, fruit: true, fruitScale: 1.0 }
      },
      Cucumber: {
        Sprout: { heightScale: 0.3, leafCount: 2, fruit: false },
        Growing: { heightScale: 0.6, leafCount: 4, fruit: false },
        Mature: { heightScale: 1.0, leafCount: 6, fruit: true }
      },
      Sugarcane: {
        Sprout: { heightScale: 0.3, leafCount: 2, fruit: false },
        Growing: { heightScale: 0.6, leafCount: 3, fruit: false },
        Mature: { heightScale: 1.0, leafCount: 4, fruit: false }
      },
      Lettuce: {
        Sprout: { heightScale: 0.3, leafCount: 3, fruit: false },
        Growing: { heightScale: 0.6, leafCount: 5, fruit: false },
        Mature: { heightScale: 1.0, leafCount: 8, fruit: false }
      },
      Carrot: {
        Sprout: { heightScale: 0.3, leafCount: 3, fruit: false },
        Growing: { heightScale: 0.6, leafCount: 5, fruit: false },
        Mature: { heightScale: 1.0, leafCount: 8, fruit: true }
      },
      Banana: {
        Sprout: { heightScale: 0.3, leafCount: 2, fruit: false },
        Growing: { heightScale: 0.6, leafCount: 3, fruit: false },
        Mature: { heightScale: 1.0, leafCount: 4, fruit: true }
      }
    };

    const cropStyle = cropStyles[crop] || {
      type: "stalk",
      height: 1,
      width: 0.1,
      color: 0x32CD32,
      leafColor: 0x228B22,
      leafCount: 4,
      leafWidth: 0.3,
      leafHeight: 0.1,
      fruitHeight: 0,
      fruitWidth: 0
    };
    const cropColor = efficiency >= 95 ? cropStyle.color : efficiency >= 85 ? 0xFFD700 : 0xFF4500;

    // Function to create custom leaf geometry with more realism
    const createLeafGeometry = (width, height, cropType) => {
      const leafShape = new THREE.Shape();
      if (cropType === "Corn" || cropType === "Sugarcane" || cropType === "Banana") {
        leafShape.moveTo(0, 0);
        leafShape.lineTo(width / 4, height);
        leafShape.lineTo(-width / 4, height);
        leafShape.lineTo(0, 0);
      } else if (cropType === "Tomato" || cropType === "Cucumber") {
        leafShape.moveTo(0, 0);
        leafShape.quadraticCurveTo(width / 2, height / 2, width / 3, height);
        leafShape.quadraticCurveTo(0, height / 1.5, -width / 3, height);
        leafShape.quadraticCurveTo(-width / 2, height / 2, 0, 0);
      } else {
        leafShape.moveTo(0, 0);
        leafShape.quadraticCurveTo(width / 2, height / 2, 0, height);
        leafShape.quadraticCurveTo(-width / 2, height / 2, 0, 0);
      }
      return new THREE.ShapeGeometry(leafShape);
    };

    // Function to build a plant (used for initial creation and stage updates)
    const buildPlant = (plantGroup, crop, stage, cropStyle, efficiency) => {
      const stageProps = growthStages[crop][stage];
      const scaledHeight = cropStyle.height * stageProps.heightScale;
      const scaledWidth = cropStyle.width * stageProps.heightScale;
      const fruitScale = stageProps.fruitScale || 1.0;

      // Clear existing children
      while (plantGroup.children.length > 0) {
        plantGroup.remove(plantGroup.children[0]);
      }

      // Color variation
      const colorVariation = new THREE.Color(cropStyle.color);
      colorVariation.offsetHSL(0, (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1);
      const leafColorVariation = new THREE.Color(cropStyle.leafColor);
      leafColorVariation.offsetHSL(0, (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1);

      // Build the plant based on type
      let plantMesh;
      if (cropStyle.type === "stalk") {
        const stalkGeo = new THREE.CylinderGeometry(scaledWidth, scaledWidth * 0.8, scaledHeight, 12);
        const stalkMat = new THREE.MeshStandardMaterial({ color: leafColorVariation, roughness: 0.7 });
        plantMesh = new THREE.Mesh(stalkGeo, stalkMat);
        plantMesh.position.y = scaledHeight / 2;
        if (stageProps.fruit) {
          if (crop === "Wheat") {
            const headGeo = new THREE.ConeGeometry(cropStyle.fruitWidth * fruitScale, cropStyle.fruitHeight * fruitScale, 12);
            const headMat = new THREE.MeshStandardMaterial({ color: colorVariation });
            const head = new THREE.Mesh(headGeo, headMat);
            head.position.y = scaledHeight;
            for (let j = 0; j < 12; j++) {
              const grainGeo = new THREE.SphereGeometry(0.03 * fruitScale, 6, 6);
              const grain = new THREE.Mesh(grainGeo, headMat);
              grain.position.set(
                Math.cos((j * Math.PI * 2) / 12) * 0.12 * fruitScale,
                cropStyle.fruitHeight * (0.2 + j * 0.03) * fruitScale,
                Math.sin((j * Math.PI * 2) / 12) * 0.12 * fruitScale
              );
              head.add(grain);
            }
            plantMesh.add(head);
          } else if (crop === "Rice") {
            const headGeo = new THREE.ConeGeometry(cropStyle.fruitWidth * fruitScale, cropStyle.fruitHeight * fruitScale, 12);
            const headMat = new THREE.MeshStandardMaterial({ color: colorVariation });
            const head = new THREE.Mesh(headGeo, headMat);
            head.position.y = scaledHeight;
            head.rotation.x = Math.PI / 6;
            for (let j = 0; j < 8; j++) {
              const grainGeo = new THREE.SphereGeometry(0.02 * fruitScale, 6, 6);
              const grain = new THREE.Mesh(grainGeo, headMat);
              grain.position.set(
                Math.cos((j * Math.PI * 2) / 8) * 0.1 * fruitScale,
                cropStyle.fruitHeight * (0.1 + j * 0.02) * fruitScale,
                Math.sin((j * Math.PI * 2) / 8) * 0.1 * fruitScale
              );
              head.add(grain);
            }
            plantMesh.add(head);
          } else if (crop === "Corn") {
            const fruitGeo = new THREE.CylinderGeometry(cropStyle.fruitWidth * fruitScale, cropStyle.fruitWidth * fruitScale, cropStyle.fruitHeight * fruitScale, 12);
            const fruitMat = new THREE.MeshStandardMaterial({ color: colorVariation });
            const fruit = new THREE.Mesh(fruitGeo, fruitMat);
            fruit.position.y = scaledHeight * 0.6;
            const huskGeo = new THREE.ConeGeometry(cropStyle.fruitWidth * 1.2 * fruitScale, cropStyle.fruitHeight * 1.2 * fruitScale, 8);
            const huskMat = new THREE.MeshStandardMaterial({ color: 0x8FBC8F });
            const husk = new THREE.Mesh(huskGeo, huskMat);
            husk.position.y = cropStyle.fruitHeight * 0.5 * fruitScale;
            fruit.add(husk);
            for (let j = 0; j < 30; j++) {
              const kernelGeo = new THREE.SphereGeometry(0.03 * fruitScale, 6, 6);
              const kernel = new THREE.Mesh(kernelGeo, fruitMat);
              kernel.position.set(
                Math.cos((j * Math.PI * 2) / 15) * cropStyle.fruitWidth * fruitScale,
                (j % 5) * 0.1 * fruitScale - 0.2 * fruitScale,
                Math.sin((j * Math.PI * 2) / 15) * cropStyle.fruitWidth * fruitScale
              );
              fruit.add(kernel);
            }
            plantMesh.add(fruit);
          }
        }
        if (crop === "Sugarcane") {
          for (let j = 0; j < 5; j++) {
            const ringGeo = new THREE.TorusGeometry(scaledWidth * 1.1, 0.02, 8, 12);
            const ringMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.y = (j + 1) * (scaledHeight / 6);
            ring.rotation.x = Math.PI / 2;
            plantMesh.add(ring);
          }
        }
      } else if (cropStyle.type === "bush") {
        const bushGeo = new THREE.SphereGeometry(scaledWidth, 16, 16);
        const bushMat = new THREE.MeshStandardMaterial({ color: leafColorVariation, roughness: 0.7 });
        plantMesh = new THREE.Mesh(bushGeo, bushMat);
        plantMesh.position.y = scaledHeight;
        if (crop === "Lettuce") {
          for (let j = 0; j < 5; j++) {
            const layerGeo = new THREE.SphereGeometry(scaledWidth * (1 - j * 0.15), 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
            const layerMat = new THREE.MeshStandardMaterial({ color: leafColorVariation });
            const layer = new THREE.Mesh(layerGeo, layerMat);
            layer.position.y = j * 0.05;
            plantMesh.add(layer);
          }
        }
      } else if (cropStyle.type === "vine") {
        const vineGeo = new THREE.CylinderGeometry(scaledWidth, scaledWidth, scaledHeight, 16);
        const vineMat = new THREE.MeshStandardMaterial({ color: leafColorVariation, roughness: 0.7 });
        plantMesh = new THREE.Mesh(vineGeo, vineMat);
        plantMesh.position.y = scaledHeight / 2;
        plantMesh.rotation.z = Math.PI / 2;
      } else if (cropStyle.type === "root") {
        const rootGeo = new THREE.ConeGeometry(scaledWidth, scaledHeight, 16, 1, false, 0, Math.PI * 2);
        const rootMat = new THREE.MeshStandardMaterial({ color: colorVariation, roughness: 0.6 });
        plantMesh = new THREE.Mesh(rootGeo, rootMat);
        plantMesh.position.y = -scaledHeight / 2;
        for (let j = 0; j < 10; j++) {
          const detailGeo = new THREE.SphereGeometry(0.02, 6, 6);
          const detail = new THREE.Mesh(detailGeo, rootMat);
          detail.position.set(
            Math.cos((j * Math.PI * 2) / 10) * scaledWidth * 0.9,
            -scaledHeight * (0.3 + j * 0.05),
            Math.sin((j * Math.PI * 2) / 10) * scaledWidth * 0.9
          );
          plantMesh.add(detail);
        }
      } else if (cropStyle.type === "tree") {
        const trunkGeo = new THREE.CylinderGeometry(scaledWidth, scaledWidth * 1.2, scaledHeight, 12);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        plantMesh = new THREE.Mesh(trunkGeo, trunkMat);
        plantMesh.position.y = scaledHeight / 2;
      }

      plantMesh.castShadow = true;
      plantGroup.add(plantMesh);

      // Add leaves
      const leafGeo = createLeafGeometry(cropStyle.leafWidth, cropStyle.leafHeight, crop);
      const leafMat = new THREE.MeshStandardMaterial({
        color: leafColorVariation,
        roughness: 0.4 + Math.random() * 0.2,
        metalness: 0.1,
        side: THREE.DoubleSide
      });
      for (let j = 0; j < stageProps.leafCount; j++) {
        if (crop === "Carrot") {
          const leafGroup = new THREE.Group();
          const angle = (j * Math.PI * 2) / stageProps.leafCount;
          for (let k = 0; k < 3; k++) {
            const leaf = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, cropStyle.leafHeight * (0.8 + Math.random() * 0.4), 8), leafMat);
            leaf.position.set(
              Math.cos(angle) * (scaledWidth * (0.5 + k * 0.2)),
              scaledHeight * 0.5 + k * 0.05,
              Math.sin(angle) * (scaledWidth * (0.5 + k * 0.2))
            );
            leaf.rotation.x = Math.PI / 4 + Math.random() * 0.2;
            leaf.rotation.y = angle + Math.random() * 0.1;
            leaf.castShadow = true;
            leafGroup.add(leaf);
          }
          plantGroup.add(leafGroup);
        } else {
          const leaf = new THREE.Mesh(leafGeo, leafMat);
          const angle = (j * Math.PI * 2) / stageProps.leafCount;
          const heightOffset = cropStyle.type === "bush" || cropStyle.type === "root" ? scaledHeight * 0.5 : scaledHeight * (j % 2 === 0 ? 0.5 : 0.3);
          leaf.position.set(
            Math.cos(angle) * (scaledWidth * 0.8),
            heightOffset + Math.random() * 0.1,
            Math.sin(angle) * (scaledWidth * 0.8)
          );
          leaf.rotation.x = Math.PI / 3 + Math.random() * 0.2;
          leaf.rotation.y = angle + Math.random() * 0.2;
          leaf.castShadow = true;
          plantGroup.add(leaf);
        }
      }

      // Add fruits if applicable
      if (stageProps.fruit) {
        if (crop === "Cucumber") {
          for (let j = 0; j < 4; j++) {
            const fruitGeo = new THREE.CylinderGeometry(cropStyle.fruitWidth * 0.8 * fruitScale, cropStyle.fruitWidth * fruitScale, cropStyle.fruitHeight * fruitScale, 12);
            const fruitMat = new THREE.MeshStandardMaterial({ color: colorVariation });
            const fruit = new THREE.Mesh(fruitGeo, fruitMat);
            fruit.position.set(
              Math.cos((j * Math.PI) / 2) * 0.5,
              scaledHeight * 0.3,
              Math.sin((j * Math.PI) / 2) * 0.5
            );
            fruit.rotation.z = Math.PI / 2;
            fruit.castShadow = true;
            plantGroup.add(fruit);
          }
        } else if (crop === "Tomato") {
          for (let j = 0; j < 6; j++) {
            const fruitGeo = new THREE.SphereGeometry(cropStyle.fruitWidth * (0.8 + Math.random() * 0.4) * fruitScale, 12, 12);
            const fruitMat = new THREE.MeshStandardMaterial({ color: colorVariation });
            const fruit = new THREE.Mesh(fruitGeo, fruitMat);
            fruit.position.set(
              Math.cos((j * Math.PI) / 3) * 0.6,
              scaledHeight * (0.7 + Math.random() * 0.2),
              Math.sin((j * Math.PI) / 3) * 0.6
            );
            fruit.castShadow = true;
            plantGroup.add(fruit);
          }
        } else if (crop === "Banana") {
          const bunchGroup = new THREE.Group();
          for (let j = 0; j < 5; j++) {
            const fruitGeo = new THREE.CylinderGeometry(cropStyle.fruitWidth * fruitScale, cropStyle.fruitWidth * 0.8 * fruitScale, cropStyle.fruitHeight * fruitScale, 12);
            const fruitMat = new THREE.MeshStandardMaterial({ color: colorVariation });
            const fruit = new THREE.Mesh(fruitGeo, fruitMat);
            fruit.position.set(
              Math.cos((j * Math.PI) / 5) * 0.3,
              scaledHeight * 0.9 - j * 0.1,
              Math.sin((j * Math.PI) / 5) * 0.3
            );
            fruit.rotation.z = Math.PI / 4 + j * 0.1;
            fruit.castShadow = true;
            bunchGroup.add(fruit);
          }
          plantGroup.add(bunchGroup);
        }
      }
    };

    // Build crops
    for (let i = 0; i < cropCount; i++) {
      const plantGroup = new THREE.Group();
      let currentStage = "Sprout";

      // Initial build
      buildPlant(plantGroup, crop, currentStage, cropStyle, efficiency);

      const x = (i % rows - rows / 2) * spacing;
      const z = (Math.floor(i / rows) - rows / 2) * spacing;
      plantGroup.position.set(x, 0, z);
      plantGroup.userData = {
        crop,
        yield: predictedYield,
        efficiency,
        growthStage: currentStage,
        health: efficiency >= 95 ? "Healthy" : efficiency >= 85 ? "Moderate" : "Poor",
        updateStage: (newStage) => {
          currentStage = newStage;
          buildPlant(plantGroup, crop, currentStage, cropStyle, efficiency);
          plantGroup.userData.growthStage = currentStage;
        }
      };
      crops.push(plantGroup);
      scene.add(plantGroup);
    }

    // Companion crops
    companions.forEach((companion, i) => {
      const compGeo = new THREE.SphereGeometry(0.4, 8, 8);
      const compMat = new THREE.MeshStandardMaterial({ color: 0xADFF2F });
      const compMesh = new THREE.Mesh(compGeo, compMat);
      compMesh.position.set(-rows * spacing / 2 - 1, 0.4, i * spacing - companions.length * spacing / 2);
      compMesh.castShadow = true;
      compMesh.userData = { crop: companion, type: "companion" };
      scene.add(compMesh);
    });

    // UI Controls (positioned beside the canvas)
    const uiContainer = document.createElement("div");
    uiContainer.className = "absolute top-4 right-4 flex flex-col gap-2";
    container.appendChild(uiContainer);

    const createButton = (text, onClick) => {
      const btn = document.createElement("button");
      btn.textContent = text;
      btn.className = "bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700";
      btn.addEventListener("click", onClick);
      uiContainer.appendChild(btn);
      return btn;
    };

    // Toggle Irrigation
    const irrigationBtn = createButton("Toggle Irrigation 💧", () => {
      pipes.forEach(pipe => (pipe.visible = !pipe.visible));
      irrigationBtn.textContent = pipes[0].visible ? "Hide Irrigation 🚫" : "Toggle Irrigation 💧";
    });

    // Growth Stage Control
    let currentGrowthStage = "Sprout";
    const growthBtn = createButton("Next Growth Stage 🌱", () => {
      currentGrowthStage = currentGrowthStage === "Sprout" ? "Growing" : currentGrowthStage === "Growing" ? "Mature" : "Sprout";
      crops.forEach(crop => crop.userData.updateStage(currentGrowthStage));
      growthBtn.textContent = `Stage: ${currentGrowthStage} 🌱`;
    });

    // Farm Overview (without soil type)
    const overviewBtn = createButton("Farm Overview 📊", () => {
      const totalYield = crops.reduce((sum, crop) => sum + crop.userData.yield, 0);
      const avgEfficiency = crops.reduce((sum, crop) => sum + crop.userData.efficiency, 0) / crops.length;
      const healthyCrops = crops.filter(crop => crop.userData.health === "Healthy").length;
      alert(
        `Farm Overview:\n` +
        `Total Predicted Yield: ${totalYield.toFixed(2)} tons\n` +
        `Average Efficiency: ${avgEfficiency.toFixed(1)}%\n` +
        `Healthy Crops: ${healthyCrops} out of ${crops.length}\n` +
        `Area: ${area} acres`
      );
    });

    // Tooltips on hover (only for crops and companions)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const tooltip = document.createElement("div");
    tooltip.style.position = "absolute";
    tooltip.style.background = "rgba(0,0,0,0.8)";
    tooltip.style.color = "white";
    tooltip.style.padding = "5px";
    tooltip.style.borderRadius = "3px";
    tooltip.style.display = "none";
    document.body.appendChild(tooltip);

    canvas.addEventListener("mousemove", (event) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(crops.concat(scene.children.filter(c => c.userData.type === "companion")));
      if (intersects.length > 0) {
        const obj = intersects[0].object;
        tooltip.style.left = event.clientX + 10 + "px";
        tooltip.style.top = event.clientY + 10 + "px";
        tooltip.style.display = "block";
        tooltip.textContent = obj.userData.type === "companion"
          ? `Companion: ${obj.userData.crop}`
          : `Crop: ${obj.userData.crop}, Yield: ${obj.userData.yield} tons, Efficiency: ${obj.userData.efficiency.toFixed(1)}%`;
      } else {
        tooltip.style.display = "none";
      }
    });

    // Animation loop (removed sun animation and rain)
    let time = 0;
    function animate() {
      requestAnimationFrame(animate);
      time += 0.05;

      // Animate crop sway
      crops.forEach(crop => {
        crop.rotation.y = Math.sin(time + crop.position.x) * 0.05;
        crop.position.y = Math.sin(time + crop.position.x) * 0.02;
      });

      controls.update();
      renderer.render(scene, camera);
    }
    animate();
  });
});
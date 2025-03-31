document.addEventListener("DOMContentLoaded", () => {
  const predictBtn = document.getElementById("predictBtn");
  const viewDataBtn = document.getElementById("viewDataBtn");
  const graphBtn = document.getElementById("showGraph");

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

    // Badge logic
    const badgeLabel = efficiency >= 95 ? "🟩 Good" : efficiency >= 85 ? "🟨 Moderate" : "🟥 Poor";
    const badgeColor = efficiency >= 95 ? "bg-green-600" : efficiency >= 85 ? "bg-yellow-500" : "bg-red-600";

    // Results
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
        scales: {
          y: { beginAtZero: true }
        },
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

    // Show chart insight
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
});

document.addEventListener("DOMContentLoaded", () => {
    const predictBtn = document.getElementById("predictBtn");
    const viewDataBtn = document.getElementById("viewDataBtn");
    const graphBtn = document.getElementById("showGraph");
  
    predictBtn?.addEventListener("click", async () => {
      const crop = document.getElementById("crop").value;
      const soil = document.getElementById("soil").value;
      const area = document.getElementById("area").value;
      const pastYield = document.getElementById("yield").value;
  
      if (!crop || !soil || !area || !pastYield) {
        alert("Please fill out all fields.");
        return;
      }
  
      const response = await fetch("/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crop, soil, area, yield: pastYield }),
      });
  
      const result = await response.json();
  
      document.getElementById("yield-result").innerText = `📈 Predicted Yield: ${result.yield}`;
      document.getElementById("companion-result").innerText = `🌻 Companion Crops: ${result.companions.join(", ")}`;
      document.getElementById("planner-output").classList.remove("hidden");
    });
  
    viewDataBtn?.addEventListener("click", async () => {
      const list = document.getElementById("blockchain-data");
      list.innerHTML = "";
  
      const res = await fetch("/chain.json");
      const data = await res.json();
  
      data.forEach(block => {
        if (block.feature === "Crop Planner") {
          const { input, output } = block.data;
          const entry = document.createElement("li");
          entry.textContent = `🕒 ${new Date(block.timestamp * 1000).toLocaleString()} – Crop: ${input.crop}, Area: ${input.area} acres → Yield: ${output.yield}, Companions: ${output.companions.join(", ")}`;
          list.appendChild(entry);
        }
      });
  
      document.getElementById("all-data-modal").classList.remove("hidden");
      document.getElementById("all-data-modal").scrollIntoView({ behavior: "smooth" });
    });
  
    graphBtn?.addEventListener("click", () => {
      const pastYield = parseFloat(document.getElementById("yield").value);
      const predictedYield = parseFloat(document.getElementById("yield-result").textContent.match(/[\d.]+/)[0]);
  
      if (!pastYield || !predictedYield) {
        alert("No yield data!");
        return;
      }
  
      const ctx = document.getElementById("yield-chart").getContext("2d");
      new Chart(ctx, {
        type: "bar",
        data: {
          labels: ["Past Yield", "Predicted Yield"],
          datasets: [{
            label: "Yield (tons)",
            data: [pastYield, predictedYield],
            backgroundColor: ["#f6ad55", "#38a169"],
            borderColor: "#2f855a",
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    });
  });
  
// main.js

document.addEventListener("DOMContentLoaded", () => {
    // Crop Planner Form
    const cropForm = document.getElementById("crop-form");
    if (cropForm) {
      cropForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(cropForm);
        const data = Object.fromEntries(formData.entries());
  
        const res = await fetch("/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
  
        const json = await res.json();
        document.getElementById("yield-result").innerText = json.yield;
        document.getElementById("companion-list").innerHTML = json.companions
          .map(crop => `<li>${crop}</li>`)
          .join("");
        document.getElementById("planner-output").classList.remove("hidden");
      });
  
      document.getElementById("auto-layout").onclick = () => {
        alert("Auto layout activated! (placeholder)");
      };
    }
  
    // Water Simulator
    const waterForm = document.getElementById("water-form");
    if (waterForm) {
      waterForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(waterForm);
        const data = Object.fromEntries(formData.entries());
  
        const res = await fetch("/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
  
        const json = await res.json();
        const ctx = document.getElementById("water-chart").getContext("2d");
        new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['Water Used', 'Water Saved'],
            datasets: [{
              data: [json.used, json.saved],
              backgroundColor: ['#60A5FA', '#34D399']
            }]
          }
        });
        document.getElementById("water-output").classList.remove("hidden");
      });
    }
  
    // Dashboard Chart
    if (document.getElementById("dashboard-chart")) {
      fetch("/dashboard-data")
        .then(res => res.json())
        .then(data => {
          document.getElementById("eco-score").innerText = data.ecoScore;
          document.getElementById("water-saved").innerText = `${data.waterSaved}L`;
          document.getElementById("soil-health").innerText = data.soilHealth;
          document.getElementById("yield-efficiency").innerText = `${data.yieldEfficiency}%`;
  
          new Chart(document.getElementById("dashboard-chart"), {
            type: "line",
            data: {
              labels: data.labels,
              datasets: [{ label: "EcoScore", data: data.history, borderColor: "#10B981" }]
            }
          });
        });
    }
  });
  
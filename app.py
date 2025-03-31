from flask import Flask, render_template, request, jsonify, send_file, make_response
import json, hashlib, time, pdfkit, requests

app = Flask(__name__)
OPENWEATHER_KEY = "c51ef5af8ecbffc163bf9de5ed12587d"

# ----------------- Blockchain -----------------
class Block:
    def __init__(self, index, timestamp, feature, data, prev_hash):
        self.index = index
        self.timestamp = timestamp
        self.feature = feature
        self.data = data
        self.prev_hash = prev_hash
        self.hash = self.calc_hash()

    def calc_hash(self):
        block_str = f"{self.index}{self.timestamp}{self.feature}{self.data}{self.prev_hash}"
        return hashlib.sha256(block_str.encode()).hexdigest()

class Blockchain:
    def __init__(self):
        self.chain = [self.create_genesis_block()]

    def create_genesis_block(self):
        return Block(0, time.time(), "Genesis", "Initial block", "0")

    def add_block(self, feature, data):
        last = self.chain[-1]
        new_block = Block(len(self.chain), time.time(), feature, data, last.hash)
        self.chain.append(new_block)
        self.save_chain()

    def save_chain(self):
        with open("chain.json", "w") as f:
            json.dump([block.__dict__ for block in self.chain], f, indent=2)

blockchain = Blockchain()

# ----------------- Routes -----------------
@app.route("/")
def home():
    return render_template("index.html")

@app.route("/planner")
def planner():
    return render_template("planner.html")

@app.route("/water")
def water():
    return render_template("water.html")

@app.route("/dashboard")
def dashboard():
    return render_template("dashboard.html")

@app.route("/tips")
def tips():
    return render_template("tips.html")

@app.route("/reports")
def reports():
    return render_template("reports.html")

# ----------------- Prediction -----------------
@app.route("/predict", methods=["POST"])
def predict():
    data = request.json
    crop = data["crop"]
    soil = data["soil"]
    area = float(data["area"])
    past_yield = float(data["yield"])
    predicted = round(past_yield * 1.1, 2)
    result = {
        "yield": f"{predicted} tons",
        "companions": ["Beans", "Sunflowers"]
    }
    blockchain.add_block("Crop Planner", {"input": data, "output": result})
    return jsonify(result)

# ----------------- Water Simulation -----------------
@app.route("/simulate", methods=["POST"])
def simulate():
    data = request.json
    method = data["irrigation"]
    soil = data["soil"]
    crop = data["crop"]
    area = float(data["area"])
    unit = data.get("unit", "acres")
    location = data["location"]

    if unit == "hectares":
        area *= 2.47105

    base_needs = {
        "Wheat": 300, "Rice": 1200, "Corn": 500, "Tomato": 400,
        "Cucumber": 350, "Sugarcane": 1500, "Lettuce": 250,
        "Carrot": 280, "Banana": 900
    }
    efficiency = {"Drip": 0.6, "Sprinkler": 0.8, "Flood": 1.0}
    base = base_needs.get(crop, 500)

    weather = get_forecast(location)
    humidity = weather["humidity"]
    temp = weather["temp"]
    rain_expected = weather["rain"]

    multiplier = 1.0
    if rain_expected:
        multiplier *= 0.7
    if humidity > 75:
        multiplier *= 0.85
    if humidity < 35:
        multiplier *= 1.1
    multiplier = max(0.4, min(multiplier, 1.2))

    full = base * area
    used = full * efficiency[method] * multiplier
    saved = full - used
    score = round((saved / full) * 100, 1)
    badge = "🟥 Poor" if score < 50 else "🟨 Moderate" if score < 80 else "🟩 Excellent"
    match = "Excellent" if (soil == "Loamy" and method == "Drip") else "Okay" if soil in ["Silty", "Peaty"] else "Poor"

    smart_tip = f"Use {method} for {crop} on {soil} soil. "
    if rain_expected:
        smart_tip += "Rain expected – reduce watering."
    elif humidity > 75:
        smart_tip += "High humidity – less irrigation needed."
    elif temp > 32:
        smart_tip += "Hot – irrigate early morning."

    eco_tip = "🌿 Eco Tip: Use rainwater harvesting in wet seasons to save 50%."

    result = {
        "used_liters": round(used, 1),
        "used_gallons": round(used * 0.264172, 1),
        "saved_liters": round(saved, 1),
        "saved_gallons": round(saved * 0.264172, 1),
        "score": score,
        "badge": badge,
        "weather": weather,
        "tip": smart_tip,
        "eco_tip": eco_tip,
        "rainAlert": rain_expected,
        "match": match
    }

    blockchain.add_block("Water Simulation", {"input": data, "output": result})
    return jsonify(result)

def get_forecast(city):
    try:
        url = f"http://api.openweathermap.org/data/2.5/forecast?q={city}&appid={OPENWEATHER_KEY}&units=metric"
        res = requests.get(url).json()
        rain_expected = any("rain" in d and d["rain"].get("3h", 0) > 0 for d in res["list"][:8])
        current = res["list"][0]
        return {
            "temp": current["main"]["temp"],
            "humidity": current["main"]["humidity"],
            "desc": current["weather"][0]["description"].title(),
            "rain": rain_expected
        }
    except:
        return {"temp": "-", "humidity": "-", "desc": "Unavailable", "rain": False}

@app.route("/water-logs")
def water_logs():
    with open("chain.json") as f:
        chain = json.load(f)
    return jsonify([b for b in chain if b["feature"] == "Water Simulation"])

@app.route("/export-water-pdf", methods=["POST"])
def export_water_pdf():
    data = request.json
    html = f"""
    <h2>💦 AgriNova – Water Simulation Report</h2>
    <p><b>Crop:</b> {data['crop']}</p>
    <p><b>Soil:</b> {data['soil']}</p>
    <p><b>Irrigation:</b> {data['irrigation']}</p>
    <p><b>Area:</b> {data['area']} acres</p>
    <p><b>Location:</b> {data['location']}</p>
    """
    pdf = pdfkit.from_string(html, False)
    response = make_response(pdf)
    response.headers["Content-Type"] = "application/pdf"
    response.headers["Content-Disposition"] = "attachment; filename=water_simulation_report.pdf"
    return response

@app.route("/dashboard-data")
def dashboard_data():
    result = {
        "ecoScore": "Silver",
        "waterSaved": 120,
        "soilHealth": 8.5,
        "yieldEfficiency": 92,
        "labels": ["Week 1", "Week 2", "Week 3"],
        "history": [60, 80, 92]
    }
    blockchain.add_block("Dashboard Accessed", result)
    return jsonify(result)

@app.route("/chain.json")
def view_chain():
    return send_file("chain.json")


if __name__ == "__main__":
    app.run(debug=True, port=5001)


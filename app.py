from flask import Flask, render_template, request, jsonify, send_file, make_response
import json, hashlib, time, requests, random
from flask_socketio import SocketIO, emit
from sklearn.linear_model import LinearRegression
import numpy as np
from io import BytesIO
from flask import Flask, render_template, request, jsonify, send_file, make_response
import os, json, hashlib, time, requests, random


app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")
OPENWEATHER_KEY = "c51ef5af8ecbffc163bf9de5ed12587d"


class Block:
    def __init__(self, index, timestamp, feature, data, prev_hash):
        self.index = index
        self.timestamp = timestamp
        self.feature = feature
        self.data = data
        self.prev_hash = prev_hash
        self.hash = self.calc_hash()

    def calc_hash(self):
        block_str = f"{self.index}{self.timestamp}{self.feature}{json.dumps(self.data)}{self.prev_hash}"
        return hashlib.sha256(block_str.encode()).hexdigest() # Same Blockchain Network as Bitcoin SHA256

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
        
        if feature == "Crop Planner":
            socketio.emit("update", {
                "type": "planner",
                "data": data
            })
        elif feature == "Water Simulation":
            socketio.emit("update", {
                "type": "water",
                "data": data
            })

    def save_chain(self):
        with open("chain.json", "w") as f:
            json.dump([block.__dict__ for block in self.chain], f, indent=2)

blockchain = Blockchain()


crop_profiles = {
    "Wheat": {"ideal_soil": "Loamy", "ideal_irrigation": "Sprinkler"},
    "Rice": {"ideal_soil": "Silty", "ideal_irrigation": "Flood"},
    "Corn": {"ideal_soil": "Loamy", "ideal_irrigation": "Sprinkler"},
    "Tomato": {"ideal_soil": "Loamy", "ideal_irrigation": "Drip"},
    "Cucumber": {"ideal_soil": "Peaty", "ideal_irrigation": "Drip"},
    "Sugarcane": {"ideal_soil": "Silty", "ideal_irrigation": "Flood"},
    "Lettuce": {"ideal_soil": "Loamy", "ideal_irrigation": "Drip"},
    "Carrot": {"ideal_soil": "Loamy", "ideal_irrigation": "Drip"},
    "Banana": {"ideal_soil": "Clay", "ideal_irrigation": "Sprinkler"},
}


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

@app.route("/marketplace")
def marketplace():
    return render_template("marketplace.html")



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
    alerts = []
    if rain_expected:
        multiplier *= 0.7
        alerts.append("🌧️ Rain expected in next 24hr – reduce irrigation.")
    if humidity > 75:
        multiplier *= 0.85
        alerts.append("💧 High humidity – reduce water slightly.")
    if humidity < 35:
        multiplier *= 1.1
        alerts.append("🔥 Low humidity – increase irrigation slightly.")
    if temp > 32:
        alerts.append("☀️ High temp – irrigate early morning.")
    multiplier = max(0.4, min(multiplier, 1.2))

    full = base * area
    used = full * efficiency[method] * multiplier
    saved = full - used
    score = round((saved / full) * 100, 1)
    badge = "🟥 Poor" if score < 50 else "🟨 Moderate" if score < 80 else "🟩 Excellent"

    match = "Excellent" if (soil == crop_profiles[crop]["ideal_soil"] and method == crop_profiles[crop]["ideal_irrigation"]) \
        else "Okay" if soil in ["Silty", "Peaty", "Loamy"] else "Poor"

    smart_tip = (
        f"✅ Your setup is optimized for {crop}.\n"
        f"• {method} irrigation supports water efficiency\n"
        f"• {soil} soil enhances nutrient retention for better yield"
    ) if (soil == crop_profiles[crop]["ideal_soil"] and method == crop_profiles[crop]["ideal_irrigation"]) else (
        f"⚠️ To improve your {crop} yield:\n"
        f"• Switch irrigation to {crop_profiles[crop]['ideal_irrigation']}\n"
        f"• Use {crop_profiles[crop]['ideal_soil']} soil for better root absorption"
    )

    eco_tip = (
        "💧 Rain expected – save water:\n"
        "• Set up rain barrels\n"
        "• Skip tomorrow’s irrigation schedule"
    ) if rain_expected else (
        "🌿 General Eco Tip:\n"
        "• Perform weekly soil moisture checks\n"
        "• Adjust irrigation based on plant growth"
    )

    result = {
        "used_liters": round(used, 1),
        "used_gallons": round(used * 0.264172, 1),
        "saved_liters": round(saved, 1),
        "saved_gallons": round(saved * 0.264172, 1),
        "score": score,
        "badge": badge,
        "weather": weather,
        "alerts": alerts,
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
    logs = [b for b in chain if b.get("feature") == "Water Simulation" and "input" in b.get("data", {})]
    return jsonify(logs)


@app.route("/export-water-pdf", methods=["POST"])
def export_water_pdf():
    data = request.json
    html = f"""
    <h2>TSA – Water Simulation Report</h2>
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


@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    crop = data["crop"]
    soil = data["soil"]
    area = float(data["area"])
    past_yield = float(data["yield"])

    X = np.array([[area, past_yield]])
    y = np.array([past_yield * 1.1])
    model = LinearRegression().fit(X, y)
    predicted_yield = model.predict([[area, past_yield]])[0]
    predicted_yield = round(max(predicted_yield, past_yield * 0.8), 2)

    companions = {
        "Wheat": ["Peas", "Clover"], "Rice": ["Sesbania", "Soybean"], "Corn": ["Beans", "Squash"],
        "Tomato": ["Basil", "Carrot"], "Cucumber": ["Dill", "Radish"], "Sugarcane": ["Marigold", "Spinach"],
        "Lettuce": ["Chives", "Carrot"], "Carrot": ["Lettuce", "Tomato"], "Banana": ["Sweet Potato", "Taro"]
    }

    tips = {
        "Wheat": "Rotate with legumes to improve nitrogen levels.",
        "Rice": "Keep consistent shallow flooding.",
        "Corn": "Apply compost and check soil pH.",
        "Tomato": "Use staking and prune bottom leaves.",
        "Cucumber": "Provide trellis support and mulch well.",
        "Sugarcane": "Ensure good drainage and sunlight.",
        "Lettuce": "Harvest early for best taste.",
        "Carrot": "Thin seedlings to allow root expansion.",
        "Banana": "Mulch heavily and protect from wind."
    }

    output = {
        "yield": f"{predicted_yield} tons",
        "companions": companions.get(crop, []),
        "tip": tips.get(crop, "Maintain regular irrigation and fertilize organically.")
    }

    blockchain.add_block("Crop Planner", {"input": data, "output": output})
    return jsonify(output)


@app.route("/predict-ecoscore", methods=["POST"])
def predict_ecoscore():
    data = request.json
    water = float(data["waterSaved"])
    yield_eff = float(data["yieldEfficiency"])
    soil = float(data["soilHealth"])

    score = min(100, (water / 100 * 30) + (yield_eff * 40) + (soil * 30) / 100)
    tip = random.choice([
        "Use drip irrigation to boost your score!",
        "Rotate crops to improve soil health.",
        "Reduce water waste for a higher EcoScore."
    ])

    result = {"score": round(score, 1), "tip": tip}
    blockchain.add_block("EcoScore Prediction", {"input": data, "output": result})
    return jsonify(result)


@app.route("/chain.json")
def view_chain():
    return send_file("chain.json")


@app.route("/log-fix", methods=["POST"])
def log_fix():
    data = request.json
    log_data = {
        "input": {
            "crop": data["crop"],
            "area": data["area"],
            "location": data["location"]
        },
        "suggested": {
            "irrigation": data["irrigation"],
            "soil": data["soil"]
        },
        "timestamp": time.time()
    }
    blockchain.add_block("FixSuggestion", log_data)
    return jsonify({"status": "success"})


@socketio.on("connect")
def handle_connect():
    print("Client connected")

@socketio.on("disconnect")
def handle_disconnect():
    print("Client disconnected")
    
    
    
@app.route("/buy", methods=["POST"])
def buy_crop():
    data = request.json
    crop = data["crop"]
    qty = int(data["qty"])
    buyer = data["buyer"]
    price = float(data["price"])
    store = data.get("store")

    if not store:
        return jsonify({"error": "Missing store name"}), 400

    order = {
        "crop": crop,
        "quantity": qty,
        "buyer": buyer,
        "price": price,
        "total": round(qty * price, 2),
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }

    # Save to orders/{store}.json
    os.makedirs("orders", exist_ok=True)
    order_file = f"orders/{store.lower()}.json"
    if os.path.exists(order_file):
        with open(order_file, "r") as f:
            existing = json.load(f)
    else:
        existing = []

    existing.append(order)
    with open(order_file, "w") as f:
        json.dump(existing, f, indent=2)

    # Notify farmer in real-time
    socketio.emit("new_order", {
        "crop": crop,
        "qty": qty,
        "buyer": buyer,
        "total": qty * price
    })

    # Return dummy receipt
    receipt_html = f"""
    <h1>TSA Order Receipt</h1>
    <p><strong>Buyer:</strong> {buyer}</p>
    <p><strong>Crop:</strong> {crop}</p>
    <p><strong>Quantity:</strong> {qty}kg</p>
    <p><strong>Price:</strong> ${price}/kg</p>
    <p><strong>Total:</strong> ${qty * price}</p>
    """
    result = BytesIO()
    pisa.CreatePDF(BytesIO(receipt_html.encode()), dest=result)
    result.seek(0)
    return send_file(result, download_name="receipt.pdf", as_attachment=True)




@app.route("/generate_receipt", methods=["POST"])
def generate_receipt():
    data = request.json
    html = f"""
    <h1 style='color: green;'>TSA Marketplace Receipt</h1>
    <p><strong>Buyer:</strong> {data['buyer']}</p>
    <p><strong>Crop:</strong> {data['crop']}</p>
    <p><strong>Quantity:</strong> {data['qty']} kg</p>
    <p><strong>Price:</strong> ${data['price']} / kg</p>
    <p><strong>Total:</strong> ${float(data['qty']) * float(data['price'])}</p>
    """
    pdf = HTML(string=html).write_pdf()
    return send_file(BytesIO(pdf), download_name="receipt.pdf", as_attachment=True)


@app.route("/marketplace/save", methods=["POST"])
def save_marketplace():
    data = request.json
    store_name = data["storeName"]
    crops = data["crops"]

    os.makedirs("marketplaces", exist_ok=True)
    with open(f"marketplaces/{store_name.lower()}.json", "w") as f:
        json.dump(crops, f, indent=2)

    return jsonify({"status": "saved"})


@app.route("/marketplace/view/<storename>")
def view_marketplace(storename):
    store_file = f"marketplaces/{storename.lower()}.json"  # ✅ correct path
    if not os.path.exists(store_file):
        return render_template("store_not_found.html", store=storename)

    with open(store_file) as f:
        data = json.load(f)
    return render_template("store.html", store_name=storename, crops=data)


@app.route("/marketplace/orders/<storename>")
def view_orders(storename):
    path = f"orders/{storename.lower()}.json"
    if not os.path.exists(path):
        return jsonify([])

    with open(path) as f:
        orders = json.load(f)
    return jsonify(orders)


if __name__ == "__main__":
    socketio.run(app, debug=True, port=5005)
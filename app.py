from flask import Flask, render_template, request, jsonify, send_file
import json, hashlib, time
import pdfkit

app = Flask(__name__)

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

# ----------------- AI Prediction -----------------
@app.route("/predict", methods=["POST"])
def predict():
    data = request.json
    crop = data["crop"]
    soil = data["soil"]
    area = float(data["area"])
    past_yield = float(data["yield"])
    predicted = round(past_yield * 1.1, 2)  # Simple prediction model
    result = {
        "yield": f"{predicted} tons",
        "companions": ["Beans", "Sunflowers"]
    }
    blockchain.add_block("Crop Planner", {"input": data, "output": result})
    return jsonify(result)

# ----------------- Water Simulator -----------------
@app.route("/simulate", methods=["POST"])
def simulate():
    data = request.json
    method = data["irrigation"]
    soil = data["soil"]
    used = 100
    saved = 40 if method == "Drip" else 20 if method == "Sprinkler" else 5
    result = {"used": used, "saved": saved}
    blockchain.add_block("Water Simulator", {"input": data, "output": result})
    return jsonify(result)

# ----------------- Dashboard Data -----------------
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

# ----------------- Blockchain Viewer -----------------
@app.route("/chain.json")
def view_chain():
    return send_file("chain.json")

@app.route("/export-pdf", methods=["POST"])
def export_pdf():
    data = request.json
    html = f"""
    <h2>TSA – Crop Planner Report</h2>
    <p><strong>Crop:</strong> {data['crop']}</p>
    <p><strong>Soil:</strong> {data['soil']}</p>
    <p><strong>Area:</strong> {data['area']} acres</p>
    <p><strong>Past Yield:</strong> {data['yield']} tons</p>
    <p><strong>Predicted Yield:</strong> {data['predicted']}</p>
    <p><strong>Companion Crops:</strong> {", ".join(data['companions'])}</p>
    """

    pdf = pdfkit.from_string(html, False)
    response = make_response(pdf)
    response.headers["Content-Type"] = "application/pdf"
    response.headers["Content-Disposition"] = "attachment; filename=planner_report.pdf"
    return response
    
# ----------------- Run App -----------------
if __name__ == "__main__":
    app.run(debug=True, port=5001)

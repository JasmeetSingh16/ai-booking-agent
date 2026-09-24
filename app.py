import json, os, datetime
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS

from services.groq_service import get_ai_response
from services.booking_service import get_available_slots, get_all_slots, book_slot, book_slot_iso
from prompts.booking_prompt import create_booking_prompt

app = Flask(__name__)
CORS(app)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/slots")
def slots():
    return jsonify(get_all_slots())


@app.route("/book", methods=["POST"])
def book():
    data = request.json or {}
    booking = book_slot_iso(data.get("iso", ""), data.get("time", ""))
    if not booking:
        return jsonify({"ok": False, "error": "That slot was just taken. Please pick another."}), 409
    return jsonify({"ok": True, "booking": booking})


@app.route("/lead", methods=["POST"])
def lead():
    d = request.json or {}
    email = (d.get("email") or "").strip()
    if "@" not in email:
        return jsonify({"ok": False}), 400
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "leads.json")
    try:
        with open(path) as f:
            leads = json.load(f)
    except Exception:
        leads = []
    leads.append({"name": (d.get("name") or "").strip(), "email": email,
                  "time": datetime.datetime.now().isoformat(timespec="seconds")})
    with open(path, "w") as f:
        json.dump(leads, f, indent=2)
    return jsonify({"ok": True})


@app.route("/chat", methods=["POST"])
def chat():
    data = request.json or {}
    user_message = data.get("message", "")
    history = data.get("history", [])

    prompt = create_booking_prompt(get_available_slots(), history, user_message)
    response = get_ai_response(prompt)

    booking = None
    if "BOOKED|" in response:
        text, booking_line = response.split("BOOKED|", 1)
        parts = [p.strip() for p in booking_line.strip().split("|")]
        response = text.strip()
        if len(parts) >= 3:
            booking = book_slot(parts[0], parts[1], parts[2])
            if booking is None:
                response = "Sorry, that slot is no longer available. Please pick another time."

    return jsonify({"reply": response, "booking": booking})


if __name__ == "__main__":
    app.run(debug=True, port=5005)
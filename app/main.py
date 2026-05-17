from flask import Flask, render_template, request, jsonify
from database import init_db, get_visited, add_visited, remove_visited

app = Flask(__name__)

# Run at import time so Gunicorn workers initialise the DB
init_db()

@app.route("/")
def index():
    visited = get_visited()
    return render_template("index.html", visited=visited)

@app.route("/api/visited", methods=["GET"])
def api_get_visited():
    return jsonify(get_visited())

@app.route("/api/visited", methods=["POST"])
def api_add_visited():
    data = request.json
    code = data.get("code")
    name = data.get("name")
    kind = data.get("kind")  # "state" or "country"
    if not code or not kind:
        return jsonify({"error": "Missing code or kind"}), 400
    add_visited(code, name, kind)
    return jsonify({"status": "added", "code": code})

@app.route("/api/visited/<kind>/<code>", methods=["DELETE"])
def api_remove_visited(kind, code):
    remove_visited(code, kind)
    return jsonify({"status": "removed", "code": code})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

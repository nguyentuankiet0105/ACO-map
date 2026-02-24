
from flask import Flask, request, jsonify
from flask_cors import CORS
from app.aco import AntColonyOptimization

app = Flask(__name__)
CORS(app)

# Enhanced graph with more nodes for mountain trekking scenario
# Real-world example: Mountain paths near Hanoi, Vietnam
graph = {
    ("A", "B"): 2.5,
    ("A", "C"): 5.2,
    ("A", "D"): 8.1,
    ("B", "C"): 1.8,
    ("B", "E"): 3.4,
    ("C", "D"): 2.3,
    ("C", "F"): 4.6,
    ("D", "G"): 3.2,
    ("E", "F"): 2.7,
    ("E", "H"): 5.5,
    ("F", "G"): 1.9,
    ("F", "H"): 3.8,
    ("G", "H"): 2.4,
}

# Node positions with real GPS coordinates (Hanoi area example)
# You can replace these with actual locations
node_positions = {
    "A": {"lat": 21.0285, "lng": 105.8542, "name": "Ba Vi Mountain Base"},
    "B": {"lat": 21.0385, "lng": 105.8642, "name": "Trail Junction 1"},
    "C": {"lat": 21.0185, "lng": 105.8642, "name": "Trail Junction 2"},
    "D": {"lat": 21.0285, "lng": 105.8742, "name": "Mountain Pass"},
    "E": {"lat": 21.0485, "lng": 105.8742, "name": "North Peak"},
    "F": {"lat": 21.0285, "lng": 105.8842, "name": "Valley Point"},
    "G": {"lat": 21.0285, "lng": 105.8942, "name": "Summit Station"},
    "H": {"lat": 21.0385, "lng": 105.8942, "name": "Peak Viewpoint"},
}

@app.route("/graph", methods=["GET"])
def get_graph():
    """Return graph structure and node positions"""
    edges = [{"from": edge[0], "to": edge[1], "weight": weight}
             for edge, weight in graph.items()]
    return jsonify({
        "edges": edges,
        "nodes": node_positions
    })

@app.route("/optimize", methods=["POST"])
def optimize():
    data = request.json
    start = data.get("start")
    end = data.get("end")
    blocked_edges = data.get("blocked_edges", [])  # List of blocked edges due to landslide/disaster

    # Convert blocked edges to tuples
    blocked_edges_tuples = [tuple(edge) for edge in blocked_edges]

    aco = AntColonyOptimization(graph, n_ants=15, n_iterations=30, blocked_edges=blocked_edges_tuples)
    best_path, best_distance, iterations_history = aco.run(start, end)

    return jsonify({
        "best_path": best_path,
        "distance": best_distance,
        "iterations": iterations_history,
        "graph_edges": [{"from": edge[0], "to": edge[1], "weight": weight}
                       for edge, weight in graph.items()],
        "node_positions": node_positions
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)

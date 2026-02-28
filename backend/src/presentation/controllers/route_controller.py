"""
Route Controller
SOLID - Single Responsibility: Only handles HTTP request/response
"""
from flask import jsonify, request, Response
from typing import Dict, Any
from ...application.use_cases import FindOptimalPathUseCase, GetGraphUseCase
from ...domain.entities import Node, Edge
from ...domain.interfaces import IGraphRepository

class RouteController:
    """
    Controller for route optimization endpoints
    Thin layer that delegates to use cases
    """

    def __init__(
        self,
        find_optimal_path_use_case: FindOptimalPathUseCase,
        get_graph_use_case: GetGraphUseCase,
        graph_repository: IGraphRepository
    ):
        self._find_optimal_path_use_case = find_optimal_path_use_case
        self._get_graph_use_case = get_graph_use_case
        self._graph_repository = graph_repository

    def get_graph(self) -> Response:
        """
        GET /graph
        Returns graph structure with nodes and edges
        """
        try:
            result = self._get_graph_use_case.execute()
            return jsonify(result), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    def optimize_route(self) -> Response:
        """
        POST /optimize
        Find optimal route between two points

        Request body:
        {
            "start": "A",
            "end": "H",
            "blocked_edges": [["B", "C"], ["D", "E"]]  // optional
        }
        """
        try:
            # Parse request
            data = request.get_json()

            if not data:
                return jsonify({"error": "Request body is required"}), 400

            start_node = data.get("start")
            end_node = data.get("end")
            blocked_edges = data.get("blocked_edges", [])

            # Validate required fields
            if not start_node or not end_node:
                return jsonify({
                    "error": "Both 'start' and 'end' fields are required"
                }), 400

            # Convert blocked edges to tuples
            blocked_edges_tuples = [tuple(edge) for edge in blocked_edges] if blocked_edges else None

            # Execute use case
            result = self._find_optimal_path_use_case.execute(
                start_node_id=start_node,
                end_node_id=end_node,
                blocked_edges=blocked_edges_tuples
            )

            # Get graph for response
            graph_data = self._get_graph_use_case.execute()

            # Build response with safe defaults
            response_data = result.to_dict()
            response_data["graph_edges"] = graph_data.get("edges", [])
            response_data["node_positions"] = graph_data.get("nodes", {})

            print(f"✅ Response data: graph_edges count = {len(response_data['graph_edges'])}, nodes count = {len(response_data['node_positions'])}")

            return jsonify(response_data), 200

        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            return jsonify({"error": f"Internal server error: {str(e)}"}), 500

    def health_check(self) -> Response:
        """
        GET /health
        Health check endpoint
        """
        return jsonify({
            "status": "healthy",
            "service": "ACO Route Optimization API"
        }), 200

    def add_node(self) -> Response:
        """
        POST /nodes
        Add a new node to the graph

        Request body:
        {
            "id": "I",
            "lat": 21.0485,
            "lng": 105.8542,
            "name": "New Location"
        }
        """
        try:
            data = request.get_json()
            if not data:
                return jsonify({"error": "Request body is required"}), 400

            node_id = data.get("id")
            lat = data.get("lat")
            lng = data.get("lng")
            name = data.get("name", f"Node {node_id}")

            if not all([node_id, lat, lng]):
                return jsonify({
                    "error": "Fields 'id', 'lat', and 'lng' are required"
                }), 400

            node = Node(id=node_id, latitude=lat, longitude=lng, name=name)
            self._graph_repository.add_node(node)

            return jsonify({
                "message": f"Node {node_id} added successfully",
                "node": {"id": node_id, "lat": lat, "lng": lng, "name": name}
            }), 201

        except Exception as e:
            return jsonify({"error": str(e)}), 500

    def remove_node(self, node_id: str) -> Response:
        """
        DELETE /nodes/<node_id>
        Remove a node from the graph
        """
        try:
            self._graph_repository.remove_node(node_id)
            return jsonify({
                "message": f"Node {node_id} removed successfully"
            }), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    def add_edge(self) -> Response:
        """
        POST /edges
        Add a new edge to the graph

        Request body:
        {
            "from": "A",
            "to": "I",
            "weight": 3.5
        }
        """
        try:
            data = request.get_json()
            if not data:
                return jsonify({"error": "Request body is required"}), 400

            from_node = data.get("from")
            to_node = data.get("to")
            weight = data.get("weight")

            if not all([from_node, to_node, weight]):
                return jsonify({
                    "error": "Fields 'from', 'to', and 'weight' are required"
                }), 400

            edge = Edge(from_node=from_node, to_node=to_node, weight=float(weight))
            self._graph_repository.add_edge(edge)

            return jsonify({
                "message": f"Edge {from_node}-{to_node} added successfully",
                "edge": {"from": from_node, "to": to_node, "weight": weight}
            }), 201

        except Exception as e:
            return jsonify({"error": str(e)}), 500

    def remove_edge(self) -> Response:
        """
        DELETE /edges
        Remove an edge from the graph

        Request body:
        {
            "from": "A",
            "to": "I"
        }
        """
        try:
            data = request.get_json()
            if not data:
                return jsonify({"error": "Request body is required"}), 400

            from_node = data.get("from")
            to_node = data.get("to")

            if not all([from_node, to_node]):
                return jsonify({
                    "error": "Fields 'from' and 'to' are required"
                }), 400

            self._graph_repository.remove_edge(from_node, to_node)

            return jsonify({
                "message": f"Edge {from_node}-{to_node} removed successfully"
            }), 200

        except Exception as e:
            return jsonify({"error": str(e)}), 500

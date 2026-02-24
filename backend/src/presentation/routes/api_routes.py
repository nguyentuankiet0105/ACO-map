"""
API Routes Configuration
Registers all Flask routes with the application
"""
from flask import Flask
from ..controllers import RouteController


def register_routes(app: Flask, controller: RouteController) -> None:
    """
    Register all API routes

    Args:
        app: Flask application instance
        controller: Route controller instance
    """

    # Health check
    @app.route('/health', methods=['GET'])
    def health():
        return controller.health_check()

    # Get graph structure
    @app.route('/graph', methods=['GET'])
    def get_graph():
        return controller.get_graph()

    # Optimize route
    @app.route('/optimize', methods=['POST'])
    def optimize():
        return controller.optimize_route()

    # Node management
    @app.route('/nodes', methods=['POST'])
    def add_node():
        return controller.add_node()

    @app.route('/nodes/<node_id>', methods=['DELETE'])
    def remove_node(node_id):
        return controller.remove_node(node_id)

    # Edge management
    @app.route('/edges', methods=['POST'])
    def add_edge():
        return controller.add_edge()

    @app.route('/edges', methods=['DELETE'])
    def remove_edge():
        return controller.remove_edge()

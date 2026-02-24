"""
Flask Application Factory
Creates and configures Flask application with Clean Architecture
"""
from flask import Flask
from flask_cors import CORS
from src.config import get_config, DependencyContainer
from src.presentation.routes import register_routes


def create_app(config_name: str = 'development') -> Flask:
    """
    Application factory pattern
    Creates and configures Flask application

    Args:
        config_name: Configuration environment name

    Returns:
        Configured Flask application
    """
    # Create Flask app
    app = Flask(__name__)

    # Load configuration
    config = get_config(config_name)
    app.config.from_object(config)

    # Enable CORS
    CORS(app, resources={
        r"/*": {
            "origins": config.CORS_ORIGINS,
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })

    # Setup dependency injection
    container = DependencyContainer()

    # Get controller with all dependencies injected
    controller = container.get_route_controller()

    # Register routes
    register_routes(app, controller)

    # Add error handlers
    @app.errorhandler(404)
    def not_found(error):
        return {"error": "Endpoint not found"}, 404

    @app.errorhandler(500)
    def internal_error(error):
        return {"error": "Internal server error"}, 500

    return app


if __name__ == '__main__':
    # Create app with development config
    app = create_app('development')

    # Run server
    print("=" * 60)
    print("🚀 ACO Route Optimization API - Clean Architecture")
    print("=" * 60)
    print(f"Environment: {app.config['ENV']}")
    print(f"Debug: {app.config['DEBUG']}")
    print(f"Running on: http://127.0.0.1:5000")
    print("=" * 60)
    print("Available endpoints:")
    print("  GET  /health   - Health check")
    print("  GET  /graph    - Get graph structure")
    print("  POST /optimize - Find optimal path")
    print("=" * 60)

    app.run(
        host='127.0.0.1',
        port=5000,
        debug=app.config['DEBUG']
    )

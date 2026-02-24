"""
Application Configuration Settings
"""
import os


class Config:
    """Base configuration"""
    DEBUG = False
    TESTING = False
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

    # CORS settings
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*')

    # API settings
    API_TITLE = "ACO Route Optimization API"
    API_VERSION = "2.0.0"


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    ENV = 'development'


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    ENV = 'production'


class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DEBUG = True


# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}


def get_config(env: str = None) -> Config:
    """Get configuration based on environment"""
    if env is None:
        env = os.environ.get('FLASK_ENV', 'development')
    return config.get(env, config['default'])

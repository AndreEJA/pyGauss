from flask import Flask
def crear_app():
    app = Flask(__name__)
    app.config["JSON_AS_ASCII"] = False
    app.config["SECRET_KEY"] = "dev-secret"
    from app.routes import principal_bp
    from app.matrices.gauss.routes import gauss_bp

    from app.matrices.operaciones.routes import operaciones_bp
    
    app.register_blueprint(principal_bp)
    app.register_blueprint(gauss_bp, url_prefix="/matrices/gauss")
    
    app.register_blueprint(operaciones_bp, url_prefix="/matrices/operaciones")
    
    return app
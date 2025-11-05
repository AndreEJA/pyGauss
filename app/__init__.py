from flask import Flask

def crear_app():
    app = Flask(__name__)
    app.config["JSON_AS_ASCII"] = False
    app.config["SECRET_KEY"] = "dev-secret"
    
    from app.routes import principal_bp
    from app.matrices.gauss.routes import gauss_bp
    from app.matrices.operaciones.routes import operaciones_bp
    from app.matrices.vectores.routes import vectores_bp
    from app.ocio.routes import ocio_bp
    from app.metodos_numericos.routes import metodos_bp   
    
    app.register_blueprint(principal_bp)
    app.register_blueprint(gauss_bp, url_prefix="/matrices/gauss")
    app.register_blueprint(operaciones_bp, url_prefix="/matrices/operaciones")
    app.register_blueprint(vectores_bp, url_prefix="/matrices/vectores")
    app.register_blueprint(ocio_bp, url_prefix="/ocio")
    
    app.register_blueprint(metodos_bp)  
    return app

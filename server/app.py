
from flask import Flask
from routes.rag import rag_bp
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
app.register_blueprint(rag_bp)

if __name__ == "__main__":
    from waitress import serve
    serve(app, host="0.0.0.0", port=5001, threads=8)

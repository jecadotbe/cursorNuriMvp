```python
from flask import Flask
from routes.rag import rag_bp

app = Flask(__name__)
app.register_blueprint(rag_bp)

if __name__ == "__main__":
    from waitress import serve
    serve(app, host="0.0.0.0", port=5001, threads=8)
```

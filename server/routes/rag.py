```python
from flask import Blueprint, request, jsonify
from services.rag_service import RAGService
import os

rag_bp = Blueprint('rag', __name__)
rag_service = RAGService()

@rag_bp.route('/api/rag/process-pdf', methods=['POST'])
async def process_pdf():
    """Process a PDF file and add it to the knowledge base"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if not file.filename.endswith('.pdf'):
        return jsonify({'error': 'File must be a PDF'}), 400
    
    # Save file temporarily
    temp_path = f"./temp/{file.filename}"
    os.makedirs("./temp", exist_ok=True)
    file.save(temp_path)
    
    # Process the PDF
    success = await rag_service.process_pdf(temp_path)
    
    # Clean up
    os.remove(temp_path)
    
    if success:
        return jsonify({'message': 'PDF processed successfully'}), 200
    return jsonify({'error': 'Failed to process PDF'}), 500

@rag_bp.route('/api/rag/query', methods=['POST'])
async def query_knowledge_base():
    """Query the knowledge base"""
    data = request.get_json()
    if not data or 'query' not in data:
        return jsonify({'error': 'No query provided'}), 400
    
    query = data['query']
    num_results = data.get('num_results', 4)
    
    results = await rag_service.query_knowledge_base(query, num_results)
    return jsonify({'results': results}), 200

@rag_bp.route('/api/rag/stats', methods=['GET'])
def get_stats():
    """Get statistics about the knowledge base"""
    stats = rag_service.get_collection_stats()
    return jsonify(stats), 200
```

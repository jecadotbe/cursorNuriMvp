import sys
import os
import json
from pathlib import Path

# Add the server directory to Python path
server_dir = Path(__file__).parent.parent
sys.path.append(str(server_dir))

from flask import Flask, request, jsonify
from server.services.memory_service import (
    create_memory,
    get_relevant_memories,
    search_memories,
    delete_memory
)
from waitress import serve

app = Flask(__name__)

if not os.getenv("MEM0_API_KEY"):
    raise ValueError("MEM0_API_KEY environment variable is required")

@app.route('/api/memories', methods=['POST'])
def create_memory_route():
    try:
        data = request.get_json()
        print(f"Received create memory request: {json.dumps(data, indent=2)}")

        user_id = data.get('userId')
        content = data.get('content')
        metadata = data.get('metadata', {})

        if not all([user_id, content]):
            return jsonify({"error": "Missing required fields"}), 400

        memory = create_memory(user_id, content, metadata)
        return jsonify(memory)
    except Exception as e:
        print(f"Error creating memory: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/memories/relevant', methods=['POST'])
def get_relevant_memories_route():
    try:
        data = request.get_json()
        print(f"Received relevant memories request: {json.dumps(data, indent=2)}")

        user_id = data.get('userId')
        context = data.get('context')

        if not all([user_id, context]):
            return jsonify({"error": "Missing required fields"}), 400

        memories = get_relevant_memories(user_id, context)
        return jsonify(memories)
    except Exception as e:
        print(f"Error getting relevant memories: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/memories/search', methods=['POST'])
def search_memories_route():
    try:
        data = request.get_json()
        user_id = data.get('userId')
        query = data.get('query')

        if not all([user_id, query]):
            return jsonify({"error": "Missing required fields"}), 400

        memories = search_memories(user_id, query)
        return jsonify(memories)
    except Exception as e:
        print(f"Error searching memories: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/memories/<memory_id>', methods=['DELETE'])
def delete_memory_route(memory_id):
    try:
        delete_memory(memory_id)
        return jsonify({"message": "Memory deleted successfully"})
    except Exception as e:
        print(f"Error deleting memory: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("Starting memory service on port 5001...")
    serve(app, host='0.0.0.0', port=5001)
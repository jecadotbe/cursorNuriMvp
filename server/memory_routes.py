from flask import Flask, request, jsonify
import os
from mem0 import MemoryClient
from waitress import serve

app = Flask(__name__)

if not os.getenv("MEM0_API_KEY"):
    raise ValueError("MEM0_API_KEY environment variable is required")

client = MemoryClient(api_key=os.getenv("MEM0_API_KEY"))

@app.route('/api/memories', methods=['POST'])
def create_memory():
    try:
        data = request.get_json()
        user_id = data.get('userId')
        content = data.get('content')
        metadata = data.get('metadata', {})

        if not all([user_id, content]):
            return jsonify({"error": "Missing required fields"}), 400

        # Format messages for mem0ai
        messages = [{
            "role": metadata.get("role", "system"),
            "content": content
        }]

        # Add memory using the SDK
        memory = client.add(
            messages,
            user_id=str(user_id),
            metadata={
                **metadata,
                "source": "nuri-chat",
                "type": "conversation"
            }
        )

        return jsonify({
            "id": memory.id,
            "content": content,
            "metadata": memory.metadata,
            "createdAt": memory.created_at.isoformat()
        })
    except Exception as e:
        print(f"Error creating memory: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/memories/relevant', methods=['POST'])
def get_relevant_memories():
    try:
        data = request.get_json()
        user_id = data.get('userId')
        context = data.get('context')

        if not all([user_id, context]):
            return jsonify({"error": "Missing required fields"}), 400

        # Search for relevant memories using the SDK
        memories = client.search(
            context,
            user_id=str(user_id),
            limit=5,
            metadata={
                "source": "nuri-chat",
                "type": "conversation"
            }
        )

        return jsonify([{
            "id": memory.id,
            "content": memory.content,
            "metadata": memory.metadata,
            "createdAt": memory.created_at.isoformat()
        } for memory in memories])
    except Exception as e:
        print(f"Error getting relevant memories: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/memories/search', methods=['POST'])
def search_memories():
    try:
        data = request.get_json()
        user_id = data.get('userId')
        query = data.get('query')

        if not all([user_id, query]):
            return jsonify({"error": "Missing required fields"}), 400

        memories = client.search(
            query,
            user_id=str(user_id),
            metadata={
                "source": "nuri-chat",
                "type": "conversation"
            }
        )

        return jsonify([{
            "id": memory.id,
            "content": memory.content,
            "metadata": memory.metadata,
            "createdAt": memory.created_at.isoformat()
        } for memory in memories])
    except Exception as e:
        print(f"Error searching memories: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/memories/<memory_id>', methods=['DELETE'])
def delete_memory(memory_id):
    try:
        client.delete(memory_id)
        return jsonify({"message": "Memory deleted successfully"})
    except Exception as e:
        print(f"Error deleting memory: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Run on port 5001 to avoid conflict with the main server
    print("Starting memory service on port 5001...")
    serve(app, host='0.0.0.0', port=5001)
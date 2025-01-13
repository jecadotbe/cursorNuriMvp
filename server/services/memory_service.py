import os
import json
from typing import Dict, List, Optional, Any
from mem0 import MemoryClient

if not os.getenv("MEM0_API_KEY"):
    raise ValueError("MEM0_API_KEY environment variable is required")

print(f"Initializing memory service with API key: {'*' * len(os.getenv('MEM0_API_KEY', ''))}")
client = MemoryClient(api_key=os.getenv("MEM0_API_KEY"))

def create_memory(user_id: int, content: str, metadata: Optional[Dict[str, Any]] = None) -> Dict:
    try:
        print(f"Creating memory for user {user_id}")
        print(f"Content: {content[:100]}...")
        print(f"Metadata: {json.dumps(metadata, indent=2)}")

        # Format messages for mem0ai with previous context
        messages = []

        # Add previous context as system message if available
        if metadata and metadata.get("conversationContext"):
            messages.append({
                "role": "system",
                "content": f"Previous conversation context:\n{metadata['conversationContext']}"
            })

        # Add the current message
        messages.append({
            "role": metadata.get("role", "user") if metadata else "user",
            "content": content
        })

        print(f"Formatted messages for mem0ai: {json.dumps(messages, indent=2)}")

        # Add memory using the SDK
        memory = client.add(
            messages,
            user_id=str(user_id),
            metadata={
                **(metadata or {}),
                "source": "nuri-chat",
                "type": "conversation"
            }
        )

        print(f"Successfully created memory with ID: {memory.id}")

        return {
            "id": memory.id,
            "content": content,
            "metadata": memory.metadata,
            "createdAt": memory.created_at.isoformat()
        }
    except Exception as e:
        print(f"Error creating memory: {str(e)}")
        raise

def get_relevant_memories(user_id: int, current_context: str) -> List[Dict]:
    try:
        print(f"Getting relevant memories for user {user_id}")
        print(f"Context: {current_context[:100]}...")

        # Search for relevant memories using the SDK
        memories = client.search(
            current_context,
            user_id=str(user_id),
            limit=5,
            metadata={
                "source": "nuri-chat",
                "type": "conversation"
            }
        )

        print(f"Found {len(memories)} relevant memories")

        result = [{
            "id": memory.id,
            "content": memory.content,
            "metadata": memory.metadata,
            "createdAt": memory.created_at.isoformat()
        } for memory in memories]

        print(f"Returning memories: {json.dumps(result, indent=2)}")
        return result
    except Exception as e:
        print(f"Error getting relevant memories: {str(e)}")
        return []

def search_memories(user_id: int, query: str) -> List[Dict]:
    try:
        memories = client.search(
            query,
            user_id=str(user_id),
            metadata={
                "source": "nuri-chat",
                "type": "conversation"
            }
        )

        return [{
            "id": memory.id,
            "content": memory.content,
            "metadata": memory.metadata,
            "createdAt": memory.created_at.isoformat()
        } for memory in memories]
    except Exception as e:
        print(f"Error searching memories: {str(e)}")
        return []

def delete_memory(memory_id: str) -> None:
    try:
        client.delete(memory_id)
    except Exception as e:
        print(f"Error deleting memory: {str(e)}")
        raise
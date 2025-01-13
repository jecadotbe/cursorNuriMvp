import os
import json
from typing import Dict, List, Optional, Any
from mem0 import Memory

if not os.getenv("MEM0_API_KEY"):
    raise ValueError("MEM0_API_KEY environment variable is required")

if not os.getenv("ANTHROPIC_API_KEY"):
    raise ValueError("ANTHROPIC_API_KEY environment variable is required")

print(f"Initializing memory service with API key: {'*' * len(os.getenv('MEM0_API_KEY', ''))}")

config = {
    "llm": {
        "provider": "anthropic",
        "config": {
            "model": "claude-3-5-sonnet-20241022",  # Latest model
            "temperature": 0.1,
            "max_tokens": 2000,
        }
    }
}

memory_client = Memory.from_config(config)

def create_memory(user_id: int, content: str, metadata: Optional[Dict[str, Any]] = None) -> Dict:
    try:
        print(f"Creating memory for user {user_id}")
        print(f"Content: {content[:100]}...")
        print(f"Metadata: {json.dumps(metadata, indent=2)}")

        # Create the memory
        result = memory_client.add(
            content,
            user_id=str(user_id),
            metadata={
                **(metadata or {}),
                "source": "nuri-chat",
                "type": "conversation",
                "category": "chat_history"
            }
        )

        print(f"Successfully created memory: {result}")
        return {
            "id": result.id,
            "content": content,
            "metadata": result.metadata,
            "createdAt": result.created_at.isoformat()
        }
    except Exception as e:
        print(f"Error creating memory: {str(e)}")
        raise

def get_relevant_memories(user_id: int, current_context: str) -> List[Dict]:
    try:
        print(f"Getting relevant memories for user {user_id}")
        print(f"Context: {current_context[:100]}...")

        # Search for relevant memories
        memories = memory_client.search(
            current_context,
            user_id=str(user_id),
            limit=5,
            metadata={
                "source": "nuri-chat",
                "type": "conversation",
                "category": "chat_history"
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
        memories = memory_client.search(
            query,
            user_id=str(user_id),
            metadata={
                "source": "nuri-chat",
                "type": "conversation",
                "category": "chat_history"
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
        memory_client.delete(memory_id)
    except Exception as e:
        print(f"Error deleting memory: {str(e)}")
        raise
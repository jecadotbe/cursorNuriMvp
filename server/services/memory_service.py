```python
from mem0 import MemoryClient
import os
import json
from typing import Dict, List, Optional, Any

if not os.getenv("MEM0_API_KEY"):
    raise ValueError("MEM0_API_KEY environment variable is required")

client = MemoryClient(api_key=os.getenv("MEM0_API_KEY"))

def create_memory(user_id: int, content: str, metadata: Optional[Dict[str, Any]] = None) -> Dict:
    try:
        # Format messages for mem0ai
        messages = [{
            "role": metadata.get("role", "system") if metadata else "system",
            "content": content
        }]
        
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
        
        return [{
            "id": memory.id,
            "content": memory.content,
            "metadata": memory.metadata,
            "createdAt": memory.created_at.isoformat()
        } for memory in memories]
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
```

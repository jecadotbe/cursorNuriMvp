```python
from typing import List, Optional
import os
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.document_loaders import PyPDFLoader
from langchain.embeddings import HuggingFaceEmbeddings
from langchain.vectorstores import Chroma
from chromadb.config import Settings

class RAGService:
    def __init__(self):
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            model_kwargs={'device': 'cpu'}
        )
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=50,
            separators=["\n\n", "\n", ".", "!", "?", ",", " ", ""]
        )
        self.vector_store = None
        self.initialize_vector_store()

    def initialize_vector_store(self):
        """Initialize the vector store with ChromaDB"""
        self.vector_store = Chroma(
            persist_directory="./data/chroma",
            embedding_function=self.embeddings,
            client_settings=Settings(
                anonymized_telemetry=False
            )
        )

    async def process_pdf(self, file_path: str) -> bool:
        """Process a PDF file and store its chunks in the vector store"""
        try:
            # Load PDF
            loader = PyPDFLoader(file_path)
            documents = loader.load()
            
            # Split into chunks
            chunks = self.text_splitter.split_documents(documents)
            
            # Add to vector store
            self.vector_store.add_documents(chunks)
            return True
        except Exception as e:
            print(f"Error processing PDF: {str(e)}")
            return False

    async def query_knowledge_base(
        self, 
        query: str, 
        num_results: int = 4
    ) -> List[dict]:
        """Query the vector store for relevant document chunks"""
        try:
            results = self.vector_store.similarity_search_with_relevance_scores(
                query,
                k=num_results
            )
            
            return [
                {
                    'content': doc.page_content,
                    'metadata': doc.metadata,
                    'score': score
                }
                for doc, score in results
            ]
        except Exception as e:
            print(f"Error querying knowledge base: {str(e)}")
            return []

    def get_collection_stats(self) -> dict:
        """Get statistics about the vector store"""
        try:
            collection = self.vector_store._collection
            return {
                'total_chunks': collection.count(),
                'total_documents': len(set(m.get('source') for m in collection.get()['metadatas']))
            }
        except Exception as e:
            print(f"Error getting collection stats: {str(e)}")
            return {'total_chunks': 0, 'total_documents': 0}
```

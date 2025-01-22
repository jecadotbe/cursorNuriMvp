import { NeonPostgres } from "@langchain/community/vectorstores/neon";
import { OpenAIEmbeddings } from "@langchain/openai";

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-large",
  api_key: process.env.OPENAI_API_KEY,
});

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Ensure the connection string has SSL mode required
const connectionString = process.env.DATABASE_URL;

// Configuration for NeonPostgres

export async function initializeVectorStore() {
  const config = {
    connectionString,
    tableName: "langchain_pg_embedding",
    columns: {
      idColumnName: "id",
      vectorColumnName: "embedding",
      contentColumnName: "document",
      metadataColumnName: "cmetadata",
    },
  };

  let vectorStore: NeonPostgres | null = null;
  if (!vectorStore) {
    vectorStore = await NeonPostgres.initialize(embeddings, config);
  }
  return vectorStore;
}

export async function searchBooks(input: string, k: number = 4) {
  const store = await initializeVectorStore();
  const similaritySearchResults = await store.similaritySearch(input, k);
  return similaritySearchResults;
}

import { NeonPostgres } from "@langchain/community/vectorstores/neon";
import { OpenAIEmbeddings } from "@langchain/openai";

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-large",
});

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Ensure the connection string has SSL mode required
const connectionString = process.env.DATABASE_URL.includes('sslmode=require') 
  ? process.env.DATABASE_URL 
  : `${process.env.DATABASE_URL}${process.env.DATABASE_URL.includes('?') ? '&' : '?'}sslmode=require`;

// Configuration for NeonPostgres
const config = {
  connectionString,
  tableName: "langchain_pg_embedding",
  columns: {
    idColumnName: "id",
    vectorColumnName: "embedding",
    contentColumnName: "document",
    metadataColumnName: "cmetadata",
  }
};

let vectorStore: NeonPostgres | null = null;

export async function initializeVectorStore() {
  if (!vectorStore) {
    vectorStore = await NeonPostgres.initialize(embeddings, config);
  }
  return vectorStore;
}

export async function search(input: string, k: number = 4) {
  const store = await initializeVectorStore();
  const similaritySearchResults = await store.similaritySearch(input, k);
  return similaritySearchResults;
}
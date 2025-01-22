import {
  PGVectorStore,
  DistanceStrategy,
} from "@langchain/community/vectorstores/pgvector";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Pool } from "pg";

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-large",
});

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Parse the connection URL and add ssl requirement
const connectionString = new URL(process.env.DATABASE_URL);
connectionString.searchParams.set('sslmode', 'require');

// Create a pool with SSL required
const pool = new Pool({
  connectionString: connectionString.toString(),
  ssl: {
    rejectUnauthorized: false
  }
});

// Configuration for PGVectorStore
const config = {
  postgresConnectionOptions: pool,
  tableName: "langchain_pg_embedding",
  columns: {
    idColumnName: "id",
    vectorColumnName: "embedding",
    contentColumnName: "document",
    metadataColumnName: "cmetadata",
  },
  distanceStrategy: "cosine" as DistanceStrategy,
};

let vectorStore: PGVectorStore | null = null;

export async function initializeVectorStore() {
  if (!vectorStore) {
    vectorStore = await PGVectorStore.initialize(embeddings, config);
  }
  return vectorStore;
}

export async function search(input: string, k: number = 4) {
  const store = await initializeVectorStore();
  const similaritySearchResults = await store.similaritySearch(input, k);
  return similaritySearchResults;
}
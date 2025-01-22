import {
  PGVectorStore,
  DistanceStrategy,
} from "@langchain/community/vectorstores/pgvector";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PoolConfig } from "pg";

// Initialize embeddings with API key
const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-large",
});

// Sample config
const config = {
  postgresConnectionOptions: {
    type: "postgres",
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || "5432"),
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
  } as PoolConfig,
  tableName: "langchain_pg_embedding",
  columns: {
    idColumnName: "id",
    vectorColumnName: "embedding",
    contentColumnName: "document",
    metadataColumnName: "cmetadata",
  },
  distanceStrategy: "cosine" as DistanceStrategy,
};

// Initialize vector store
async function initVectorStore() {
  return await PGVectorStore.initialize(embeddings, config);
}

// Search function
export async function search(input: string, k: number = 3) {
  const vectorStore = await initVectorStore();
  const similaritySearchResults = await vectorStore.similaritySearch(input, k);
  return similaritySearchResults;
}
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { Document } from "langchain/document";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { db } from "@db";
import { chats, type Chat } from "@db/schema";
import { sql } from "drizzle-orm";

// Initialize the embedding model
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: "text-embedding-ada-002", // OpenAI's most efficient embedding model
  stripNewLines: true,
});

interface VectorMetadata {
  source: string;
  type: "chat" | "profile" | "memory";
  userId: number;
  timestamp: string;
  [key: string]: any;
}

/**
 * Convert text content into vector embeddings and store in database
 */
export async function upsertDocument(
  content: string,
  metadata: VectorMetadata
) {
  try {
    // Generate embedding using OpenAI
    const embedding = await embeddings.embedQuery(content);

    // Store in database
    await db.insert(chats).values({
      userId: metadata.userId,
      title: metadata.title || `Chat ${new Date().toISOString()}`,
      summary: content.slice(0, 100) + "...", // Basic summary
      messages: [], // Will be populated later
      metadata: metadata,
      contentEmbedding: JSON.stringify(embedding),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return true;
  } catch (error) {
    console.error("Error upserting document:", error);
    throw error;
  }
}

/**
 * Find similar documents based on vector similarity
 */
export async function findSimilarDocuments(
  query: string,
  userId: number,
  limit: number = 5
): Promise<Chat[]> {
  try {
    // Generate embedding for query
    const queryEmbedding = await embeddings.embedQuery(query);

    // Perform vector similarity search
    const results = await db.query.chats.findMany({
      where: sql`${chats.userId} = ${userId}`,
      orderBy: sql`content_embedding_vector <-> ${queryEmbedding}::vector`,
      limit,
    });

    return results;
  } catch (error) {
    console.error("Error finding similar documents:", error);
    throw error;
  }
}

/**
 * Process and store a batch of documents
 */
export async function processBatchDocuments(
  documents: { content: string; metadata: VectorMetadata }[]
) {
  try {
    for (const doc of documents) {
      await upsertDocument(doc.content, doc.metadata);
    }
    return true;
  } catch (error) {
    console.error("Error processing batch documents:", error);
    throw error;
  }
}

/**
 * Get context-enhanced prompt by combining query with similar documents
 */
export async function getEnhancedPrompt(
  query: string,
  userId: number,
  limit: number = 3
): Promise<string> {
  const similarDocs = await findSimilarDocuments(query, userId, limit);
  
  let context = similarDocs
    .map(doc => `Context from ${doc.metadata.source}:\n${doc.summary}`)
    .join('\n\n');

  return `
Context information:
${context}

User query:
${query}

Please use the above context to provide a more informed and personalized response.`;
}

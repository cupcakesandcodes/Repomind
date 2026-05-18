import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { MongoClient } from "mongodb";

const MONGODB_ATLAS_URI = process.env.MONGODB_ATLAS_URI!;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "repomind";
const MONGODB_COLLECTION_NAME = process.env.MONGODB_COLLECTION_NAME || "embeddings";
const MONGODB_INDEX_NAME = process.env.MONGODB_INDEX_NAME || "vector_index";

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    const client = new MongoClient(MONGODB_ATLAS_URI);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  const client = new MongoClient(MONGODB_ATLAS_URI);
  clientPromise = client.connect();
}

export async function getMongoClient() {
  return await clientPromise;
}

export async function getVectorStore() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing in .env.local. Please add it to use the Gemini embeddings.");
  }

  const client = await getMongoClient();
  const collection = client.db(MONGODB_DB_NAME).collection(MONGODB_COLLECTION_NAME);

  return new MongoDBAtlasVectorSearch(
    new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GEMINI_API_KEY,
      modelName: "gemini-embedding-2",
    }),
    {
      collection,
      indexName: MONGODB_INDEX_NAME,
      textKey: "text",
      embeddingKey: "embedding",
    } as any
  );
}

export async function purgeRepoEmbeddings(repoId: string) {
  const client = await getMongoClient();
  const collection = client.db(MONGODB_DB_NAME).collection(MONGODB_COLLECTION_NAME);
  
  const result = await collection.deleteMany({ repo_id: repoId });
  console.log(`Purged ${result.deletedCount} embeddings for repo: ${repoId}`);
}

export async function getRepoMetadata(repoUrl: string) {
  const client = await getMongoClient();
  const collection = client.db(MONGODB_DB_NAME).collection("repo_meta");
  
  return await collection.findOne({ url: repoUrl });
}

export async function updateRepoMetadata(repoUrl: string, metadata: any) {
  const client = await getMongoClient();
  const collection = client.db(MONGODB_DB_NAME).collection("repo_meta");
  
  await collection.updateOne(
    { url: repoUrl },
    { $set: { ...metadata, updated_at: new Date() } },
    { upsert: true }
  );
}

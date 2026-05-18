import { NextRequest, NextResponse } from 'next/server';
import { getLatestCommitHash, cloneRepository, cleanupDirectory, getRepoIdFromUrl } from '@/lib/github';
import { getRepoMetadata, updateRepoMetadata, purgeRepoEmbeddings, getVectorStore } from '@/lib/vector-store';
import { DirectoryLoader, UnknownHandling } from "langchain/document_loaders/fs/directory";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "@langchain/core/documents";
import fs from 'fs/promises';
import path from 'path';

export const maxDuration = 300; // 5 minutes (for Vercel Pro)

export async function POST(req: NextRequest) {
  let repoId = 'unknown';
  
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

    console.log(`Starting ingestion for: ${url}`);
    
    // Check Redis for job status
    const { getRedis } = await import('@/lib/redis');
    const redis = getRedis();
    repoId = getRepoIdFromUrl(url);
    const jobKey = `job:${repoId}`;

    const existingStatus = await redis?.get(jobKey);
    if (existingStatus === 'indexing') {
      return NextResponse.json({ message: "Job already in progress", repoId, status: "indexing" });
    }

    // 1. Check SHA for freshness
    const latestSha = await getLatestCommitHash(url);
    const existingMeta = await getRepoMetadata(url);

    if (existingMeta && existingMeta.last_sha === latestSha) {
      console.log("Repo is up to date. Skipping re-indexing.");
      await redis?.set(jobKey, 'ready', 'EX', 3600);
      return NextResponse.json({ 
        message: "Repository is already up to date", 
        repoId,
        status: "ready" 
      });
    }

    // Set job status to indexing
    await redis?.set(jobKey, 'indexing', 'EX', 300); // 5 mins timeout


    // 2. Clear old data if SHA changed
    if (existingMeta) {
      console.log("SHA changed. Purging old embeddings...");
      await purgeRepoEmbeddings(repoId);
    }

    // 3. Clone and Process
    const tempDir = await cloneRepository(url);
    
    try {
      // Remove .git to save initial traversal time
      await cleanupDirectory(path.join(tempDir, '.git')).catch(() => {});
      
      // 4. Memory-Efficient Custom File Walker
      async function walkDir(dir: string, fileList: string[] = []) {
        const files = await fs.readdir(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          // Ignore massive/unneeded directories
          if (file === '.git' || file === 'node_modules' || file === 'dist' || file === 'build' || file === 'vendor' || file === '.next') continue;
          
          const stat = await fs.stat(filePath);
          if (stat.isDirectory()) {
            await walkDir(filePath, fileList);
          } else {
            const ext = path.extname(file);
            if (['.ts', '.tsx', '.js', '.jsx', '.md', '.py', '.go', '.java', '.cpp', '.c', '.h', '.rb', '.php'].includes(ext)) {
              fileList.push(filePath);
            }
          }
        }
        return fileList;
      }

      const allFiles = await walkDir(tempDir);
      console.log(`Found ${allFiles.length} source files to ingest from ${url}`);

      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });

      const vectorStore = await getVectorStore();
      
      let totalChunks = 0;
      const BATCH_SIZE = 200; // Process 200 files at a time to prevent OOM
      
      for (let i = 0; i < allFiles.length; i += BATCH_SIZE) {
        const batchPaths = allFiles.slice(i, i + BATCH_SIZE);
        console.log(`Processing batch ${i / BATCH_SIZE + 1} / ${Math.ceil(allFiles.length / BATCH_SIZE)} (${batchPaths.length} files)...`);
        
        const batchDocs = [];
        for (const filePath of batchPaths) {
          try {
            const loader = new TextLoader(filePath);
            const docs = await loader.load();
            batchDocs.push(...docs);
          } catch (err) {
            // Silently skip unreadable files
          }
        }
        
        if (batchDocs.length === 0) continue;

        // Chunking the batch
        const splitDocs = await splitter.splitDocuments(batchDocs);
        
        // Add repo metadata to each chunk
        const docsWithMeta = splitDocs.map(doc => {
          return new Document({
            pageContent: doc.pageContent,
            metadata: {
              ...doc.metadata,
              repo_id: repoId,
              source: doc.metadata.source ? doc.metadata.source.replace(tempDir, '') : 'unknown', // Relative path
            }
          });
        });

        // Index into Vector Store
        await vectorStore.addDocuments(docsWithMeta);
        totalChunks += docsWithMeta.length;
        
        // Force garbage collection of chunk data (implicit in V8 as loop continues)
      }

      console.log(`Ingestion complete! Split into ${totalChunks} chunks.`);

      // 7. Update Metadata
      await updateRepoMetadata(url, {
        repo_id: repoId,
        last_sha: latestSha,
        file_count: allFiles.length,
        chunk_count: totalChunks,
      });

      await redis?.set(jobKey, 'ready', 'EX', 3600);
      console.log("Ingestion complete!");

      return NextResponse.json({ 
        message: "Ingestion successful", 
        repoId,
        status: "ready" 
      });

    } finally {
      // 8. Cleanup
      await cleanupDirectory(tempDir);
    }

  } catch (error: any) {
    console.error("Ingestion failed:", error);
    try {
      const { getRedis } = await import('@/lib/redis');
      const redis = getRedis();
      await redis?.set(`job:${repoId}`, 'error', 'EX', 60);
    } catch (innerError) {
      console.error("Failed to update error status in Redis:", innerError);
    }
    
    return NextResponse.json({ error: error.message || "Ingestion failed" }, { status: 500 });
  }

}

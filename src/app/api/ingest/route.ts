import { NextRequest, NextResponse } from 'next/server';
import { getRepoIdFromUrl, getLatestCommitHash, getRepoFileTree, getFileContent, parseOwnerRepo } from '@/lib/github';
import { getRepoMetadata, updateRepoMetadata, purgeRepoEmbeddings, getVectorStore } from '@/lib/vector-store';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from '@langchain/core/documents';

export const maxDuration = 300; // 5 minutes (Vercel Pro) — falls back to 60s on Hobby

export async function POST(req: NextRequest) {
  let repoId = 'unknown';

  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    console.log(`Starting ingestion for: ${url}`);

    // ── Redis job tracking ───────────────────────────────────────────────────
    const { getRedis } = await import('@/lib/redis');
    const redis = getRedis();
    repoId = getRepoIdFromUrl(url);
    const jobKey = `job:${repoId}`;

    const existingStatus = await redis?.get(jobKey);
    if (existingStatus === 'indexing') {
      return NextResponse.json({ message: 'Job already in progress', repoId, status: 'indexing' });
    }

    // ── SHA freshness check ──────────────────────────────────────────────────
    const latestSha = await getLatestCommitHash(url);
    const existingMeta = await getRepoMetadata(url);

    if (existingMeta && existingMeta.last_sha === latestSha) {
      console.log('Repo is up to date. Skipping re-indexing.');
      await redis?.set(jobKey, 'ready', 'EX', 3600);
      return NextResponse.json({ message: 'Repository is already up to date', repoId, status: 'ready' });
    }

    // Mark as indexing
    await redis?.set(jobKey, 'indexing', 'EX', 300);

    // ── Purge stale embeddings if SHA changed ────────────────────────────────
    if (existingMeta) {
      console.log('SHA changed. Purging old embeddings...');
      await purgeRepoEmbeddings(repoId);
    }

    // ── Fetch file tree via GitHub API (no git binary needed) ────────────────
    const { owner, repo } = parseOwnerRepo(url);
    const allFiles = await getRepoFileTree(owner, repo, latestSha);
    console.log(`Found ${allFiles.length} source files to ingest from ${url}`);

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const vectorStore = await getVectorStore();

    // ── Fetch file contents in parallel batches ──────────────────────────────
    const BATCH_SIZE = 20; // fetch 20 files concurrently
    let totalChunks = 0;

    for (let i = 0; i < allFiles.length; i += BATCH_SIZE) {
      const batch = allFiles.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(allFiles.length / BATCH_SIZE);
      console.log(`Fetching batch ${batchNum}/${totalBatches} (${batch.length} files)...`);

      // Fetch all files in this batch in parallel
      const contents = await Promise.all(
        batch.map(file => getFileContent(owner, repo, file.path))
      );

      const batchDocs: Document[] = [];
      for (let j = 0; j < batch.length; j++) {
        const content = contents[j];
        if (!content || content.trim().length === 0) continue;
        batchDocs.push(new Document({
          pageContent: content,
          metadata: { source: batch[j].path, repo_id: repoId },
        }));
      }

      if (batchDocs.length === 0) continue;

      const splitDocs = await splitter.splitDocuments(batchDocs);
      await vectorStore.addDocuments(splitDocs);
      totalChunks += splitDocs.length;
    }

    console.log(`Ingestion complete! ${totalChunks} chunks indexed.`);

    // ── Update metadata & mark ready ─────────────────────────────────────────
    await updateRepoMetadata(url, {
      repo_id: repoId,
      last_sha: latestSha,
      file_count: allFiles.length,
      chunk_count: totalChunks,
    });

    await redis?.set(jobKey, 'ready', 'EX', 3600);

    return NextResponse.json({ message: 'Ingestion successful', repoId, status: 'ready' });

  } catch (error: any) {
    console.error('Ingestion failed:', error);
    try {
      const { getRedis } = await import('@/lib/redis');
      const redis = getRedis();
      await redis?.set(`job:${repoId}`, 'error', 'EX', 60);
    } catch { /* silent */ }

    return NextResponse.json({ error: error.message || 'Ingestion failed' }, { status: 500 });
  }
}

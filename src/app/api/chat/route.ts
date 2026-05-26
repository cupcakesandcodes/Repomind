import { NextRequest, NextResponse } from 'next/server';
import { getVectorStore } from '@/lib/vector-store';
import { getRepoIssues, getSingleIssue } from '@/lib/octokit';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { formatDocumentsAsString } from "langchain/util/document";

export const maxDuration = 60; // 1 minute

export async function POST(req: NextRequest) {
  try {
    const { messages, repoId, repoUrl, issueNumber } = await req.json();
    if (!messages || !repoId || !repoUrl) {
      return NextResponse.json({ error: "Messages, repoId, and repoUrl are required" }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1].content;

    // 1. Check API Key
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY is missing in .env.local" }, { status: 400 });
    }

    // 2. Get Vector Store
    const vectorStore = await getVectorStore();

    // 3. Setup LLM (Gemini)
    const model = new ChatGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
      model: "gemini-flash-latest",
      streaming: true,
      temperature: 0,
    });

    // 3. Define RAG Prompt
    const template = `
      You are RepoMind, an expert senior software engineer and codebase assistant.
      You are currently assisting the user with the repository: {repoUrl}
      Use the following pieces of retrieved context and optional issue data to answer the user's question.
      
      CRITICAL FORMATTING RULES:
      1. ALWAYS use Markdown headings (### or ####) to break your answer into clear, logical sections.
      2. ALWAYS use bullet points or numbered lists instead of comma-separated sentences.
      3. Use **bold text** to highlight key terms, variable names, or important concepts.
      4. ALWAYS add blank lines (gaps) between paragraphs, lists, and sections to make the text highly readable.
      5. Never output a single massive wall of text. Keep paragraphs short (2-3 sentences max).
      6. CLICKABLE LINKS: Whenever you mention an Issue, PR, file, or commit, you MUST make it a clickable Markdown link using the base repository URL ({repoUrl}).
         - Example Issue: [Issue #123]({repoUrl}/issues/123)
         - Example File: [src/main.ts]({repoUrl}/blob/main/src/main.ts)
      
      Current Issues in Repository:
      {issues}

      Specific Issue Selected by User:
      {specificIssue}

      Codebase Context:
      {context}

      Question: {question}
      Answer:
    `;

    const prompt = PromptTemplate.fromTemplate(template);

    const parseOwnerRepo = (url: string) => {
      const match = url.match(/github\.com\/([^/]+)\/([^/.]+)/);
      if (!match) return { owner: '', repo: '' };
      return { owner: match[1], repo: match[2] };
    };

    // 4. Create RAG Chain
    const chain = RunnableSequence.from([
      {
        context: async (input: any) => {
          const retriever = vectorStore.asRetriever({
            filter: { preFilter: { repo_id: input.repoId } },
            k: 5,
          });
          const docs = await retriever.invoke(input.question);
          return formatDocumentsAsString(docs);
        },
        issues: async (input: any) => {
          if (input.issueNumber) return "User is asking about a specific issue (see below).";
          const { owner, repo } = parseOwnerRepo(input.repoUrl);
          const issues = await getRepoIssues(owner, repo);
          return JSON.stringify(issues, null, 2);
        },
        specificIssue: async (input: any) => {
          if (!input.issueNumber) return "No specific issue selected.";
          const { owner, repo } = parseOwnerRepo(input.repoUrl);
          const issue = await getSingleIssue(owner, repo, input.issueNumber);
          return issue ? JSON.stringify(issue, null, 2) : "Could not fetch specific issue.";
        },
        question: (input: any) => input.question,
        repoUrl: (input: any) => input.repoUrl,
      },
      prompt,
      model,
      new StringOutputParser(),
    ]);

    // 5. Execute Chain and Stream Response
    const stream = await chain.stream({ question: lastMessage, repoId, repoUrl, issueNumber });


    // Convert stream to ReadableStream for Next.js response
    const readableStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          controller.enqueue(new TextEncoder().encode(chunk));
        }
        controller.close();
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });

  } catch (error: any) {
    console.error("Chat failed. Full error:", error);
    if (error.stack) console.error("Stack trace:", error.stack);
    return NextResponse.json({ error: error.message || "Chat failed" }, { status: 500 });
  }
}

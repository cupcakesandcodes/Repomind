'use client';

import React, { useEffect, useState } from 'react';
import ChatWindow from '@/components/ChatWindow';
import { useParams, useSearchParams } from 'next/navigation';

export default function RepoChatPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const repoId = params.repoId as string;
  const issueTitle = searchParams.get('issueTitle') || undefined;
  const issueNumberParam = searchParams.get('issueNumber');
  const issueNumber = issueNumberParam ? parseInt(issueNumberParam, 10) : undefined;
  const [repoUrl, setRepoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('repomind_history');
    let foundUrl = null;
    if (saved) {
      const history = JSON.parse(saved);
      const repo = history.find((r: any) => r.id === repoId);
      if (repo) {
        foundUrl = repo.url;
      }
    }

    if (!foundUrl) {
      if (repoId.includes('_')) {
        const [owner, repo] = repoId.split('_');
        foundUrl = `https://github.com/${owner}/${repo}`;
      } else if (repoId.includes('-')) {
        const [owner, repo] = repoId.split('-');
        foundUrl = `https://github.com/${owner}/${repo}`;
      }
    }

    setRepoUrl(foundUrl || 'Unknown Repository');
    setLoading(false);
  }, [repoId]);

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080909' }}>
        <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>Initializing chat...</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ChatWindow key={repoId} repoId={repoId} repoUrl={repoUrl || 'Unknown'} initialIssueTitle={issueTitle} initialIssueNumber={issueNumber} />
    </div>
  );
}

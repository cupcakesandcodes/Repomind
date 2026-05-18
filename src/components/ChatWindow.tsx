'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Code, Bot, Loader2, FileText, X, CheckCircle, Target, BookmarkPlus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface SimilarIssue {
  title: string;
  number: number;
  url: string;
  closedAt: string;
  isPR: boolean;
  labels: string[];
}

export default function ChatWindow({ repoId, repoUrl, initialIssueTitle }: { repoId: string, repoUrl: string, initialIssueTitle?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDraft, setShowDraft] = useState(false);
  const [similarIssues, setSimilarIssues] = useState<SimilarIssue[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialIssueTitle) {
      setLoadingSimilar(true);
      const parts = repoUrl.split('/');
      const repo = parts.slice(-2).join('/');
      fetch(`/api/similar-issues?repo=${encodeURIComponent(repo)}&title=${encodeURIComponent(initialIssueTitle)}`)
        .then(res => res.json())
        .then(data => setSimilarIssues(data.similar || []))
        .catch(console.error)
        .finally(() => setLoadingSimilar(false));
    }
  }, [initialIssueTitle, repoUrl]);

  useEffect(() => {
    const saved = localStorage.getItem(`repomind_chat_${repoId}`);
    if (saved) {
      setMessages(JSON.parse(saved));
    } else {
      setMessages([
        { role: 'assistant', content: `I've finished indexing **${repoUrl}**. ${initialIssueTitle ? `I see you're looking at "${initialIssueTitle}".` : ''} Ask me anything about this codebase.` }
      ]);
    }
  }, [repoId, repoUrl, initialIssueTitle]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`repomind_chat_${repoId}`, JSON.stringify(messages));
    }
  }, [messages, repoId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage], repoId }),
      });
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      let aiResponse = '';
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = new TextDecoder().decode(value);
        aiResponse += chunk;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          return [...prev.slice(0, -1), { ...last, content: aiResponse }];
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const repoName = repoUrl.split('/').pop() || 'Repository';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#080909' }}>
      
      {/* Header */}
      <div style={{
        height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Code size={15} color="rgba(100,140,220,0.7)" />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>{repoName}</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)', fontWeight: 500 }}>Chat</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button 
            onClick={() => {
              const saved = localStorage.getItem('repomind_bookmarks');
              const bookmarks = saved ? JSON.parse(saved) : [];
              const repo = repoUrl.split('/').slice(-2).join('/');
              const id = repoId + (initialIssueTitle || '');
              const exists = bookmarks.find((b: any) => b.id === id);
              if (exists) {
                localStorage.setItem('repomind_bookmarks', JSON.stringify(bookmarks.filter((b: any) => b.id !== id)));
              } else {
                bookmarks.push({ id, repo, title: initialIssueTitle || repo, url: repoUrl, savedAt: new Date().toISOString() });
                localStorage.setItem('repomind_bookmarks', JSON.stringify(bookmarks));
              }
              window.dispatchEvent(new Event('storage')); // Notify other components
            }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.4)', padding: 8
            }}
          >
            <BookmarkPlus size={18} />
          </button>
          <button 
            onClick={() => setShowDraft(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.6)',
              padding: '6px 14px', borderRadius: 8,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <FileText size={13} /> Generate PR
          </button>
        </div>

      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Main Chat Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Messages */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '40px 28px' }}>
            <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  {msg.role === 'assistant' && (
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: 'rgba(100,140,220,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, marginTop: 2,
                    }}>
                      <Bot size={14} color="rgba(100,140,220,0.7)" />
                    </div>
                  )}
                  <div style={{
                    maxWidth: '75%',
                    ...(msg.role === 'user' ? {
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '16px 16px 4px 16px',
                      padding: '14px 18px',
                      color: 'rgba(255,255,255,0.85)',
                      fontSize: 14,
                      lineHeight: 1.7,
                      fontWeight: 500,
                    } : {
                      color: 'rgba(255,255,255,0.55)',
                      fontSize: 14,
                      lineHeight: 1.8,
                    }),
                  }}>
                    {msg.content === '' && isLoading ? (
                      <div style={{ display: 'flex', gap: 4, padding: '4px 0' }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', animation: 'pulse 1.2s ease infinite' }} />
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', animation: 'pulse 1.2s ease infinite 0.2s' }} />
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', animation: 'pulse 1.2s ease infinite 0.4s' }} />
                      </div>
                    ) : (
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p style={{ marginBottom: '1.2em', lineHeight: 1.7 }}>{children}</p>,
                          ul: ({ children }) => <ul style={{ marginBottom: '1.2em', paddingLeft: '1.5em', display: 'flex', flexDirection: 'column', gap: '8px' }}>{children}</ul>,
                          ol: ({ children }) => <ol style={{ marginBottom: '1.2em', paddingLeft: '1.5em', display: 'flex', flexDirection: 'column', gap: '8px' }}>{children}</ol>,
                          h3: ({ children }) => <h3 style={{ marginTop: '1.5em', marginBottom: '0.8em', fontSize: '1.1em', fontWeight: 700, color: '#fff' }}>{children}</h3>,
                          h4: ({ children }) => <h4 style={{ marginTop: '1.2em', marginBottom: '0.6em', fontSize: '1em', fontWeight: 600, color: '#fff' }}>{children}</h4>,
                          a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" style={{ color: '#648cdc', textDecoration: 'none', borderBottom: '1px solid rgba(100,140,220,0.4)', paddingBottom: 1, fontWeight: 600, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#648cdc'}>{children}</a>,
                          pre: ({ children }) => (
                            <pre style={{
                              background: 'rgba(0,0,0,0.4)',
                              border: '1px solid rgba(255,255,255,0.06)',
                              borderRadius: 12,
                              padding: 16,
                              overflow: 'auto',
                              fontSize: 13,
                              margin: '12px 0 24px 0',
                            }}>{children}</pre>
                          ),
                          code: ({ className, children, ...props }) => {
                            const match = /language-(\w+)/.exec(className || '');
                            const isInline = !match;
                            return isInline ? (
                              <code style={{
                                background: 'rgba(255,255,255,0.06)',
                                padding: '2px 6px',
                                borderRadius: 4,
                                fontSize: '0.9em',
                                color: 'rgba(255,255,255,0.85)',
                              }}>{children}</code>
                            ) : (
                              <code className={className}>{children}</code>
                            );
                          },
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Input */}
          <div style={{ padding: '20px 28px', flexShrink: 0 }}>
            <form onSubmit={handleSubmit} style={{ maxWidth: 720, margin: '0 auto' }}>
              <div style={{
                display: 'flex', alignItems: 'center',
                background: '#0d0e0f',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14,
                padding: '5px 5px 5px 18px',
              }}>
                <input
                  type="text"
                  placeholder="Ask about the codebase..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isLoading}
                  suppressHydrationWarning
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    color: '#fff', fontSize: 14, fontFamily: 'inherit', fontWeight: 500,
                    padding: '10px 8px',
                  }}
                />
                <button 
                  type="submit" 
                  disabled={isLoading || !input.trim()}
                  style={{
                    background: '#fff', color: '#000', border: 'none', cursor: 'pointer',
                    width: 36, height: 36, borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: (isLoading || !input.trim()) ? 0.2 : 1,
                    flexShrink: 0,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {isLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Intelligence Sidebar */}
        {initialIssueTitle && (
          <div style={{
            width: 340, borderLeft: '1px solid rgba(255,255,255,0.06)',
            background: '#0a0b0c', display: 'flex', flexDirection: 'column', flexShrink: 0,
          }}>
            <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Target size={14} color="rgba(100,140,220,0.8)" />
                <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Intelligence
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                Context pulled for your active issue.
              </p>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              <h3 style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
                Similar Solved Issues
              </h3>
              
              {loadingSimilar ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Finding similar...
                </div>
              ) : similarIssues.length === 0 ? (
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No highly similar issues found.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {similarIssues.map((si, i) => (
                    <a key={i} href={si.url} target="_blank" rel="noopener noreferrer" style={{
                      display: 'block', textDecoration: 'none',
                      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: 12, padding: 14, transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                        <CheckCircle size={14} color="rgba(170,130,220,0.6)" style={{ flexShrink: 0, marginTop: 2 }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>
                          {si.title}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 22 }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>#{si.number}</span>
                        {si.isPR && (
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(100,200,130,0.1)', color: 'rgba(100,200,130,0.7)' }}>PR</span>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* PR Draft Modal */}
      {showDraft && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 32,
        }}>
          <div style={{
            background: '#0d0e0f',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20,
            padding: 36,
            maxWidth: 520, width: '100%',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={16} color="rgba(100,140,220,0.7)" />
                <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>PR Description</span>
              </div>
              <button onClick={() => setShowDraft(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12,
              padding: 20,
              fontFamily: 'monospace',
              fontSize: 13,
              color: 'rgba(255,255,255,0.45)',
              lineHeight: 1.8,
              marginBottom: 24,
              whiteSpace: 'pre-wrap',
            }}>
{`## Summary
Fixed hydration mismatch in Sidebar component.

## Changes
- Added mounted state to ensure client-only rendering.
- Wrapped localStorage access in useEffect.`}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowDraft(false)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.3)',
                padding: '8px 16px',
              }}>
                Close
              </button>
              <button onClick={() => setShowDraft(false)} style={{
                background: '#fff', color: '#000', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 700, padding: '8px 20px', borderRadius: 10,
              }}>
                Copy
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

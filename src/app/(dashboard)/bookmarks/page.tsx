'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, ExternalLink, MessageSquare, Trash2, ArrowLeft, ChevronRight } from 'lucide-react';

interface BookmarkedIssue {
  id: string;
  repo: string;
  title: string;
  url: string;
  notes?: string;
  savedAt: string;
}

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkedIssue[]>([]);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem('repomind_bookmarks');
    if (saved) setBookmarks(JSON.parse(saved));
    setMounted(true);
  }, []);

  const removeBookmark = (id: string) => {
    const updated = bookmarks.filter(b => b.id !== id);
    setBookmarks(updated);
    localStorage.setItem('repomind_bookmarks', JSON.stringify(updated));
  };

  const updateNote = (id: string, note: string) => {
    const updated = bookmarks.map(b => b.id === id ? { ...b, notes: note } : b);
    setBookmarks(updated);
    localStorage.setItem('repomind_bookmarks', JSON.stringify(updated));
  };

  if (!mounted) return null;

  return (
    <div style={{ flex: 1, background: '#080909', minHeight: '100vh', padding: '40px 48px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <button 
          onClick={() => router.push('/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 32 }}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(100,140,220,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bookmark size={20} color="rgba(100,140,220,0.8)" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Your Bookmarks</h1>
        </div>

        {bookmarks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: 24 }}>
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 15 }}>No bookmarks yet. Issues you save will appear here.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {bookmarks.map(bookmark => (
              <div 
                key={bookmark.id}
                style={{ background: '#0d0e0f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: 24 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(100,140,220,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                      {bookmark.repo}
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{bookmark.title}</h3>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <a 
                      href={bookmark.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: 'rgba(255,255,255,0.3)', hover: { color: '#fff' } } as any}
                    >
                      <ExternalLink size={18} />
                    </a>
                    <button 
                      onClick={() => removeBookmark(bookmark.id)}
                      style={{ background: 'none', border: 'none', color: 'rgba(220,100,100,0.4)', cursor: 'pointer' }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <textarea 
                    placeholder="Add a personal note..."
                    value={bookmark.notes || ''}
                    onChange={(e) => updateNote(bookmark.id, e.target.value)}
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: 12, padding: 12, color: 'rgba(255,255,255,0.7)', fontSize: 13,
                      resize: 'vertical', minHeight: 60, outline: 'none', fontFamily: 'inherit'
                    }}
                  />
                </div>

                <button 
                  onClick={() => router.push(`/dashboard/${bookmark.repo.replace('/', '_')}?issueTitle=${encodeURIComponent(bookmark.title)}`)}
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12, padding: '12px', color: '#fff', fontSize: 13, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer'
                  }}
                >
                  <MessageSquare size={16} /> Resume Discussion <ChevronRight size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

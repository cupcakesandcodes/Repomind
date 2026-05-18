'use client';

import React from 'react';
import { Bookmark, ExternalLink, MessageSquare } from 'lucide-react';

export default function BookmarksPage() {
  const bookmarks = [
    {
      repo: 'facebook/react',
      title: 'Fix edge case in concurrent rendering',
      note: 'Needs more research on Fiber tree traversal. Similar to issue #24512.',
      date: 'Saved 3 days ago'
    },
    {
      repo: 'tailwindlabs/tailwindcss',
      title: 'Support dynamic utility values in v4',
      note: 'I can tackle this after I finish the Next.js PR.',
      date: 'Saved 1 week ago'
    }
  ];

  return (
    <div style={{ flex: 1, background: '#080909', overflowY: 'auto', padding: '40px 48px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        
        <div style={{ marginBottom: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <Bookmark size={24} color="rgba(220,180,80,0.8)" />
              <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                Saved & Notes
              </h1>
            </div>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
              Issues you've bookmarked and private context notes.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {bookmarks.map((bookmark, i) => (
            <div key={i} style={{
              background: '#0d0e0f', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(100,140,220,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  {bookmark.repo}
                </span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{bookmark.date}</span>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: 16, lineHeight: 1.4 }}>
                {bookmark.title}
              </h3>
              <div style={{ 
                background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 12, 
                fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, flex: 1,
                border: '1px solid rgba(255,255,255,0.03)', marginBottom: 20
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: 'rgba(255,255,255,0.3)' }}>
                  <MessageSquare size={12} />
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Note</span>
                </div>
                {bookmark.note}
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button style={{
                  flex: 1, background: '#fff', color: '#000', border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 800, padding: '10px 0', borderRadius: 8,
                }}>
                  Chat
                </button>
                <button style={{
                  width: 40, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', 
                  border: 'none', cursor: 'pointer', borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <ExternalLink size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

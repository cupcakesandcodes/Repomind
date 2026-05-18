'use client';

import React from 'react';
import { Route, CheckCircle, ArrowRight, ShieldAlert, GitCommit } from 'lucide-react';

export default function RoadmapPage() {
  // Hardcoded for the MVP demo
  const roadmapSteps = [
    {
      title: 'Fix typo in documentation',
      repo: 'vercel/next.js',
      status: 'completed',
      difficulty: 'Easy',
      date: '2 days ago',
    },
    {
      title: 'Update TailwindCSS config for v4',
      repo: 'vercel/next.js',
      status: 'active',
      difficulty: 'Medium',
      date: 'In progress',
    },
    {
      title: 'Implement App Router caching header',
      repo: 'vercel/next.js',
      status: 'locked',
      difficulty: 'Hard',
      date: 'Unlock by completing active step',
    }
  ];

  return (
    <div style={{ flex: 1, background: '#080909', overflowY: 'auto', padding: '40px 48px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Route size={24} color="rgba(100,200,130,0.8)" />
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
              Your Contribution Roadmap
            </h1>
          </div>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
            A structured path of progressively harder issues, tailored to help you become a core contributor in targeted repositories.
          </p>
        </div>

        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 32 }}>
          {/* Vertical line */}
          <div style={{ position: 'absolute', left: 24, top: 24, bottom: 24, width: 2, background: 'rgba(255,255,255,0.05)' }} />

          {roadmapSteps.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 24, position: 'relative', opacity: step.status === 'locked' ? 0.4 : 1 }}>
              {/* Icon */}
              <div style={{
                width: 50, height: 50, borderRadius: '50%', flexShrink: 0,
                background: step.status === 'completed' ? 'rgba(100,200,130,0.1)' : step.status === 'active' ? 'rgba(100,140,220,0.1)' : '#0d0e0f',
                border: '1px solid',
                borderColor: step.status === 'completed' ? 'rgba(100,200,130,0.3)' : step.status === 'active' ? 'rgba(100,140,220,0.3)' : 'rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 2,
              }}>
                {step.status === 'completed' && <CheckCircle size={20} color="rgba(100,200,130,0.8)" />}
                {step.status === 'active' && <GitCommit size={20} color="rgba(100,140,220,0.8)" />}
                {step.status === 'locked' && <ShieldAlert size={18} color="rgba(255,255,255,0.2)" />}
              </div>

              {/* Card */}
              <div style={{
                flex: 1, background: '#0d0e0f', border: '1px solid',
                borderColor: step.status === 'active' ? 'rgba(100,140,220,0.2)' : 'rgba(255,255,255,0.05)',
                borderRadius: 16, padding: '24px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(100,140,220,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    {step.repo}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)' }}>
                    {step.date}
                  </span>
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: 16 }}>
                  {step.title}
                </h3>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 6,
                    background: step.difficulty === 'Easy' ? 'rgba(100,200,130,0.1)' : step.difficulty === 'Medium' ? 'rgba(220,180,80,0.1)' : 'rgba(220,100,100,0.1)',
                    color: step.difficulty === 'Easy' ? 'rgba(100,200,130,0.8)' : step.difficulty === 'Medium' ? 'rgba(220,180,80,0.8)' : 'rgba(220,100,100,0.8)',
                  }}>
                    {step.difficulty}
                  </span>

                  {step.status === 'active' && (
                    <button style={{
                      background: '#fff', color: '#000', border: 'none', cursor: 'pointer',
                      fontSize: 11, fontWeight: 800, padding: '6px 16px', borderRadius: 8,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      Continue <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

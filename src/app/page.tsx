'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Zap, MessageSquare, Box, Target, Activity, Code, ChevronRight } from 'lucide-react';

function FadeIn({ children, delay = 0, yOffset = 30 }: { children: React.ReactNode, delay?: number, yOffset?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.1, rootMargin: '50px' });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : `translateY(${yOffset}px)`,
        transition: `opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        width: '100%',
      }}
    >
      {children}
    </div>
  );
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [profileUrl, setProfileUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div style={{ background: '#000', color: '#888', fontFamily: 'Inter, -apple-system, sans-serif', overflowX: 'hidden' }} className="min-h-screen antialiased selection:bg-white selection:text-black">
      
      {/* ─── NAVBAR ─── */}
      <nav
        style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          zIndex: 100, height: 60, display: 'flex', alignItems: 'center',
          background: scrolled ? 'rgba(0,0,0,0.8)' : 'transparent',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          transition: 'all 0.2s ease',
        }}
      >
        <div style={{ maxWidth: 1080, margin: '0 auto', width: '100%', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 22, height: 22, background: '#fff', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 10, height: 10, background: '#000', borderRadius: 2 }} />
            </div>
            <span style={{ color: '#fff', fontWeight: 600, fontSize: 15, letterSpacing: '-0.02em' }}>RepoMind</span>
          </Link>

          <div style={{ display: 'flex', gap: 32, fontSize: 13, fontWeight: 500 }}>
            <Link href="/dashboard" style={{ color: '#fff', textDecoration: 'none' }}>Platform</Link>
            <Link href="/dashboard" style={{ color: '#888', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#888'}>Solutions</Link>
            <Link href="/dashboard" style={{ color: '#888', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#888'}>Changelog</Link>
          </div>

          <Link
            href="/dashboard"
            style={{
              background: '#fff', color: '#000', fontSize: 13, fontWeight: 600,
              padding: '6px 16px', borderRadius: 6, textDecoration: 'none',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#e5e5e5'}
            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
          >
            Dashboard
          </Link>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section style={{ paddingTop: 180, paddingBottom: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '180px 24px 100px' }}>
        <FadeIn delay={0}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '4px 12px', borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.02)',
            fontSize: 12, fontWeight: 500, color: '#aaa',
            marginBottom: 40,
            justifyContent: 'center'
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
            RepoMind 3.0 is now available
          </div>
        </FadeIn>

        <FadeIn delay={100}>
          {/* Headline */}
          <h1 style={{
            fontSize: 'clamp(3rem, 5vw, 4.5rem)',
            fontWeight: 600, color: '#fff',
            lineHeight: 1.1, letterSpacing: '-0.03em',
            maxWidth: 900, marginBottom: 24,
            marginLeft: 'auto', marginRight: 'auto'
          }}>
            Your open source journey,<br />
            <span style={{ color: '#aaa' }}>personalised.</span>
          </h1>
        </FadeIn>

        <FadeIn delay={200}>
          {/* Subtext */}
          <p style={{
            fontSize: 18, color: '#888',
            maxWidth: 700, lineHeight: 1.6,
            marginBottom: 48, fontWeight: 400,
            marginLeft: 'auto', marginRight: 'auto'
          }}>
            RepoMind analyses your GitHub profile, finds open source issues matched to your skill level, and builds a day-by-day roadmap to get your first PR merged — and your first job offer.
          </p>
        </FadeIn>

        <FadeIn delay={300}>
          {/* CTA Button */}
          <div style={{ width: '100%', maxWidth: 540, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button
              onClick={() => router.push('/dashboard')}
              style={{
                background: '#fff', color: '#000', border: 'none', cursor: 'pointer',
                fontSize: 16, fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: '16px 32px', borderRadius: 8,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#e5e5e5'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              Connect your GitHub — it's free
            </button>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 24, fontSize: 13, color: '#666', fontWeight: 500 }}>
              <span>✓ Takes 30 seconds</span>
              <span>✓ Free for open source</span>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ─── FEATURES: ZIG-ZAG LAYOUT ─── */}
      <section style={{ maxWidth: 1080, margin: '0 auto', padding: '80px 24px 140px' }}>
        <FadeIn yOffset={40}>
          <div style={{ marginBottom: 100, textAlign: 'center' }}>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.5rem)', fontWeight: 600, color: '#fff', letterSpacing: '-0.03em', marginBottom: 16 }}>
              Everything you need to master any codebase.
            </h2>
            <p style={{ fontSize: 16, color: '#888', maxWidth: 600, margin: '0 auto', lineHeight: 1.6 }}>
              A complete suite of intelligence tools designed to accelerate your understanding, track your impact, and guide your open-source journey.
            </p>
          </div>
        </FadeIn>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 120 }}>
          
          {/* Feature 1: Contextual Chat */}
          <FadeIn yOffset={50}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              <div>
                <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.05)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                  <MessageSquare size={20} color="#fff" />
                </div>
                <h3 style={{ fontSize: 24, fontWeight: 600, color: '#fff', marginBottom: 16, letterSpacing: '-0.02em' }}>Intelligent Contextual Chat</h3>
                <p style={{ fontSize: 16, color: '#888', lineHeight: 1.6 }}>
                  Stop blindly searching through files. Ask complex architectural questions using natural language, and our RAG pipeline instantly fetches relevant code, issues, and PR context to give you precise, actionable answers.
                </p>
              </div>
              {/* Chat UI Mockup */}
              <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: '0 12px 12px 12px', fontSize: 13, color: '#ddd' }}>
                    Where is the authentication logic for the API routes?
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', alignSelf: 'flex-end', flexDirection: 'row-reverse' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 4, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 12, height: 12, background: '#000', borderRadius: 2 }} />
                  </div>
                  <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: '12px 0 12px 12px', fontSize: 13, color: '#aaa', maxWidth: 320 }}>
                    <div style={{ marginBottom: 8 }}>The authentication logic is handled via the NextAuth configuration in <span style={{ color: '#fff' }}>src/lib/auth.ts</span>.</div>
                    <div style={{ background: '#000', padding: 8, borderRadius: 4, fontFamily: 'monospace', fontSize: 11, color: '#888' }}>
                      export const authOptions = {'{ ... }'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Feature 2: Roadmaps (Reversed) */}
          <FadeIn yOffset={50}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              <div className="order-2 md:order-1">
                {/* Roadmap UI Mockup */}
                <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 32, display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
                  {[
                    { level: 1, title: 'Fix Typo in README', status: 'done' },
                    { level: 2, title: 'Resolve ESLint Warnings', status: 'current' },
                    { level: 3, title: 'Implement Rate Limiting', status: 'locked' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <div style={{ 
                        width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600,
                        background: item.status === 'done' ? '#fff' : item.status === 'current' ? 'transparent' : 'rgba(255,255,255,0.02)',
                        color: item.status === 'done' ? '#000' : item.status === 'current' ? '#fff' : '#444',
                        border: item.status === 'current' ? '1px solid #fff' : '1px solid rgba(255,255,255,0.1)',
                      }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1, height: 48, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, display: 'flex', alignItems: 'center', padding: '0 16px', fontSize: 13, color: item.status === 'locked' ? '#666' : '#fff' }}>
                        Level {item.level}: {item.title}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="order-1 md:order-2">
                <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.05)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                  <Target size={20} color="#fff" />
                </div>
                <h3 style={{ fontSize: 24, fontWeight: 600, color: '#fff', marginBottom: 16, letterSpacing: '-0.02em' }}>AI-Driven Roadmaps</h3>
                <p style={{ fontSize: 16, color: '#888', lineHeight: 1.6 }}>
                  Generate highly personalized, leveled contribution paths based on your current expertise and the repository's needs. We gamify your open-source journey from your first PR to maintainer status.
                </p>
              </div>
            </div>
          </FadeIn>

          {/* Feature 3: Issue Discovery */}
          <FadeIn yOffset={50}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              <div>
                <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.05)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                  <Search size={20} color="#fff" />
                </div>
                <h3 style={{ fontSize: 24, fontWeight: 600, color: '#fff', marginBottom: 16, letterSpacing: '-0.02em' }}>Advanced Issue Discovery</h3>
                <p style={{ fontSize: 16, color: '#888', lineHeight: 1.6 }}>
                  Filter open bounties and issues by difficulty, label, and competition level. RepoMind analyzes issue complexity so you can find the perfect starting point without getting overwhelmed.
                </p>
              </div>
              {/* Issues UI Mockup */}
              <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
                {[
                  { title: 'Update Vector Store indexing logic', diff: 'Intermediate', bounty: true },
                  { title: 'Fix hydration error on dashboard', diff: 'Beginner', bounty: false },
                ].map((issue, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, padding: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 12 }}>{issue.title}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.1)', color: '#ccc', fontSize: 11 }}>{issue.diff}</span>
                      {issue.bounty && <span style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(255, 215, 0, 0.1)', color: '#ffd700', fontSize: 11 }}>$ Bounty</span>}
                      <span style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(100, 200, 100, 0.1)', color: '#6c6', fontSize: 11 }}>good first issue</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* Feature 4: Developer Profiles (Reversed) */}
          <FadeIn yOffset={50}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              <div className="order-2 md:order-1">
                {/* Profile UI Mockup */}
                <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 32, display: 'flex', flexDirection: 'column', gap: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 4 }}>alex_dev</div>
                      <div style={{ fontSize: 13, color: '#888' }}>Full-Stack Engineer</div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#aaa', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Language Proficiency</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 75, fontSize: 12, color: '#fff' }}>TypeScript</div>
                        <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: '85%', height: '100%', background: '#3178c6' }} />
                        </div>
                        <div style={{ fontSize: 11, color: '#888', width: 60, textAlign: 'right' }}>Advanced</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 75, fontSize: 12, color: '#fff' }}>Rust</div>
                        <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: '40%', height: '100%', background: '#dea584' }} />
                        </div>
                        <div style={{ fontSize: 11, color: '#888', width: 60, textAlign: 'right' }}>Mid-level</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="order-1 md:order-2">
                <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.05)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                  <Activity size={20} color="#fff" />
                </div>
                <h3 style={{ fontSize: 24, fontWeight: 600, color: '#fff', marginBottom: 16, letterSpacing: '-0.02em' }}>Dynamic Developer Profiles</h3>
                <p style={{ fontSize: 16, color: '#888', lineHeight: 1.6 }}>
                  Showcase your actual impact, not just lines of code. We track your language proficiency, merged PRs, and bounty streaks to build a verifiable, enterprise-grade reputation profile.
                </p>
              </div>
            </div>
          </FadeIn>

        </div>
        
        {/* Minor Features Grid */}
        <FadeIn yOffset={50}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 40, marginTop: 140, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 80 }}>
            {[
              { icon: <Activity size={18} />, title: 'Architectural DNA Mapping', desc: 'Maps code frequency, cyclomatic complexity, and contribution impact in real-time.' },
              { icon: <Box size={18} />, title: 'Enterprise Indexing', desc: 'Memory-efficient local batching ingests massive repositories without crashing.' },
              { icon: <Zap size={18} />, title: 'Delta-Based Verification', desc: 'We verify your PRs in real-time, automatically updating your tracking velocity.' },
              { icon: <Target size={18} />, title: 'Contextual Bookmarks', desc: 'Save complex issues and attach private research notes before starting your work.' },
            ].map((f, i) => (
              <div key={i}>
                <div style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.05)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', marginBottom: 16 }}>
                  {f.icon}
                </div>
                <h4 style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 8 }}>{f.title}</h4>
                <p style={{ fontSize: 14, color: '#888', lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* ─── CODE SNIPPET ─── */}
      <section style={{ maxWidth: 700, margin: '0 auto', padding: '40px 24px 160px' }}>
        <FadeIn yOffset={50}>
          <div style={{
            background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, overflow: 'hidden',
            boxShadow: '0 40px 80px rgba(0,0,0,0.6)'
          }}>
            <div style={{
              height: 40, borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', padding: '0 16px',
              background: '#050505', gap: 12,
            }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#888', fontFamily: 'monospace' }}>
                repomind_profile.json
              </span>
            </div>
            <div style={{ padding: '32px', fontFamily: '"JetBrains Mono", monospace, ui-monospace', fontSize: 13, lineHeight: 2 }}>
              {[
                [<span key="o" style={{ color: '#fff' }}>{'{'}</span>],
                [<span key="l" style={{ color: '#888' }}>&nbsp;&nbsp;<span style={{ color: '#ccc' }}>"developer"</span>: <span style={{ color: '#fff' }}>"repomind_user"</span>,</span>],
                [<span key="s" style={{ color: '#888' }}>&nbsp;&nbsp;<span style={{ color: '#ccc' }}>"primary_stack"</span>: [<span style={{ color: '#fff' }}>"React", "Rust", "TypeScript"</span>],</span>],
                [<span key="sp" style={{ color: '#888' }}>&nbsp;&nbsp;<span style={{ color: '#ccc' }}>"specialization"</span>: <span style={{ color: '#fff' }}>"Distributed Systems"</span>,</span>],
                [<span key="i" style={{ color: '#888' }}>&nbsp;&nbsp;<span style={{ color: '#ccc' }}>"impact_score"</span>: <span style={{ color: '#fff' }}>0.94</span>,</span>],
                [<span key="v" style={{ color: '#888' }}>&nbsp;&nbsp;<span style={{ color: '#ccc' }}>"recent_velocity"</span>: <span style={{ color: '#fff' }}>"+12% WoW"</span></span>],
                [<span key="c" style={{ color: '#fff' }}>{'}'}</span>],
              ].map((content, i) => (
                <div key={i} style={{ display: 'flex', gap: 24, alignItems: 'baseline' }}>
                  <span style={{ color: '#444', width: 16, textAlign: 'right', userSelect: 'none', flexShrink: 0, fontSize: 12 }}>
                    {i + 1}
                  </span>
                  <span>{content}</span>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ─── FAQ SECTION ─── */}
      <section style={{ maxWidth: 840, margin: '0 auto', padding: '40px 24px 160px' }}>
        <FadeIn yOffset={40}>
          <div style={{ marginBottom: 64, textAlign: 'center' }}>
            <h2 style={{ fontSize: 'clamp(2rem, 3vw, 2.5rem)', fontWeight: 600, color: '#fff', letterSpacing: '-0.03em', marginBottom: 16 }}>
              Frequently Asked Questions
            </h2>
            <p style={{ fontSize: 16, color: '#888' }}>
              Everything you need to know about the product and billing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
            {[
              {
                q: 'Does RepoMind store my private source code?',
                a: 'No. We only index metadata, commit histories, and create vector embeddings. Your actual source code is never permanently stored on our servers.',
              },
              {
                q: 'Is there a limit on repository size?',
                a: 'Our local batching ingestion engine is memory-efficient and can process enterprise-scale repositories of any size without crashing.',
              },
              {
                q: 'Can I use it for private repositories?',
                a: 'Yes. By authenticating securely with your GitHub account, you can grant RepoMind read-only access to analyze your private repositories.',
              },
              {
                q: 'How do the AI Roadmaps work?',
                a: 'The AI analyzes open issues and your past contribution history to suggest a progressive, gamified list of tasks perfectly suited to your current skill level.',
              },
            ].map((faq, i) => (
              <div key={i}>
                <h4 style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 8 }}>{faq.q}</h4>
                <p style={{ fontSize: 15, color: '#888', lineHeight: 1.6 }}>{faq.a}</p>
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '80px 24px 60px', background: '#0a0a0a' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-12 mb-16">
            
            {/* Logo Column */}
            <div className="col-span-2">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 22, height: 22, background: '#fff', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 10, height: 10, background: '#0a0a0a', borderRadius: 2 }} />
                </div>
                <span style={{ color: '#fff', fontWeight: 600, fontSize: 16, letterSpacing: '-0.02em' }}>RepoMind</span>
              </div>
              <p style={{ fontSize: 14, color: '#888', lineHeight: 1.6, maxWidth: 280 }}>
                The intelligence layer for professional developers. Master any codebase and accelerate your open-source journey.
              </p>
            </div>

            {/* Links Columns */}
            <div>
              <h5 style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 16 }}>Product</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14, color: '#888' }}>
                <Link href="#" className="hover:text-white transition-colors">Features</Link>
                <Link href="#" className="hover:text-white transition-colors">Integrations</Link>
                <Link href="#" className="hover:text-white transition-colors">Pricing</Link>
                <Link href="#" className="hover:text-white transition-colors">Changelog</Link>
              </div>
            </div>

            <div>
              <h5 style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 16 }}>Resources</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14, color: '#888' }}>
                <Link href="#" className="hover:text-white transition-colors">Documentation</Link>
                <Link href="#" className="hover:text-white transition-colors">API Reference</Link>
                <Link href="#" className="hover:text-white transition-colors">Community</Link>
                <Link href="#" className="hover:text-white transition-colors">Open Source</Link>
              </div>
            </div>

            <div>
              <h5 style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 16 }}>Company</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14, color: '#888' }}>
                <Link href="#" className="hover:text-white transition-colors">About</Link>
                <Link href="#" className="hover:text-white transition-colors">Blog</Link>
                <Link href="#" className="hover:text-white transition-colors">Careers</Link>
                <Link href="#" className="hover:text-white transition-colors">Contact</Link>
              </div>
            </div>

          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 32, display: 'flex', flexDirection: 'column', gap: 16 }} className="flex flex-col md:flex-row justify-between items-center">
            <div style={{ fontSize: 13, color: '#666' }}>
              © {new Date().getFullYear()} RepoMind Inc. All rights reserved.
            </div>
            <div style={{ display: 'flex', gap: 24, fontSize: 13, color: '#666' }}>
              <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
              <Link href="#" className="hover:text-white transition-colors">Cookie Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

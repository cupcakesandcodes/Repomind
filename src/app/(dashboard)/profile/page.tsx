'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin, Link as LinkIcon, Building, Users, Star, GitPullRequest,
  GitCommit, Trophy, Flame, Loader2, Copy, Check, ExternalLink,
  Code, Target, Calendar, GitBranch, MessageCircle, Eye, PlusCircle
} from 'lucide-react';

interface ProfileData {
  username: string; name: string; avatar: string; bio: string;
  location: string; company: string; blog: string;
  followers: number; following: number; publicRepos: number;
  tagline: string;
  stats: {
    issuesSolved: number; prsRaised: number; prsMerged: number; reposContributed: number;
    totalBounties: number; streak: number; totalStars: number;
  };
  languages: Array<{ language: string; repoCount: number; proficiency: string; percentage: number }>;
  heatmap: Array<{ date: string; count: number }>;
  recentContributions: Array<{ type: string; repo: string; title: string; date: string; url: string }>;
}

const LANG_COLORS: Record<string, string> = {
  TypeScript: '#3178c6', JavaScript: '#f1e05a', Python: '#3572A5',
  Rust: '#dea584', Go: '#00ADD8', Java: '#b07219', 'C++': '#f34b7d',
  C: '#555', Ruby: '#701516', PHP: '#4F5D95', Swift: '#F05138',
  Kotlin: '#A97BFF', Dart: '#00B4AB', Shell: '#89e051', HTML: '#e34c26',
  CSS: '#563d7c', Vue: '#41b883', Svelte: '#ff3e00',
};

const PROF_COLORS: Record<string, { bg: string; text: string }> = {
  Advanced: { bg: 'rgba(100,200,130,0.1)', text: 'rgba(100,200,130,0.8)' },
  Intermediate: { bg: 'rgba(100,140,220,0.1)', text: 'rgba(100,140,220,0.8)' },
  Beginner: { bg: 'rgba(220,180,80,0.1)', text: 'rgba(220,180,80,0.8)' },
};

function HeatmapGrid({ data }: { data: Array<{ date: string; count: number }> }) {
  const weeks: Array<Array<{ date: string; count: number }>> = [];
  let week: Array<{ date: string; count: number }> = [];
  const startDay = new Date(data[0]?.date || '').getDay();
  for (let i = 0; i < startDay; i++) week.push({ date: '', count: 0 });
  for (const d of data) {
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) weeks.push(week);

  const getColor = (count: number) => {
    if (count === 0) return 'rgba(255,255,255,0.03)';
    if (count <= 2) return 'rgba(100,200,130,0.2)';
    if (count <= 5) return 'rgba(100,200,130,0.4)';
    if (count <= 10) return 'rgba(100,200,130,0.6)';
    return 'rgba(100,200,130,0.85)';
  };

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
      <div style={{ display: 'flex', gap: 2, minWidth: 'fit-content' }}>
        {weeks.map((w, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {w.map((d, di) => (
              <div key={di} title={d.date ? `${d.date}: ${d.count} contributions` : ''}
                style={{
                  width: 11, height: 11, borderRadius: 2,
                  background: d.date ? getColor(d.count) : 'transparent',
                  transition: 'transform 0.1s',
                }}
                onMouseEnter={(e) => { if (d.date) e.currentTarget.style.transform = 'scale(1.4)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              />
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 9, color: 'rgba(255,255,255,0.15)', fontWeight: 600 }}>
        {months.map(m => <span key={m}>{m}</span>)}
      </div>
    </div>
  );
}

function SkillBar({ language, percentage, proficiency, index }: {
  language: string; percentage: number; proficiency: string; index: number;
}) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(percentage), 100 + index * 80);
    return () => clearTimeout(t);
  }, [percentage, index]);

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: LANG_COLORS[language] || '#666' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{language}</span>
        </div>
        <span style={{
          fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 4,
          ...(PROF_COLORS[proficiency] || PROF_COLORS.Beginner),
        }}>{proficiency}</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 3,
          background: `linear-gradient(90deg, ${LANG_COLORS[language] || '#666'}88, ${LANG_COLORS[language] || '#666'})`,
          width: `${width}%`, transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
        }} />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('repomind_profile');
    if (saved) {
      const p = JSON.parse(saved);
      fetchProfile(p.username);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProfile = async (username: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/profile-stats', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      if (!res.ok) throw new Error('Failed');
      setData(await res.json());
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const copyLink = () => {
    if (!data) return;
    navigator.clipboard.writeText(`commitchat.dev/u/${data.username}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const eventIcon = (type: string) => {
    if (type === 'pr_merged') return <GitPullRequest size={14} color="rgba(170,130,220,0.8)" />;
    if (type === 'pr_opened') return <GitPullRequest size={14} color="rgba(100,200,130,0.7)" />;
    if (type === 'pr_review') return <Eye size={14} color="rgba(220,180,80,0.7)" />;
    if (type === 'push') return <GitCommit size={14} color="rgba(100,200,130,0.7)" />;
    if (type === 'issue_opened') return <PlusCircle size={14} color="rgba(100,140,220,0.7)" />;
    if (type === 'issue_closed') return <Target size={14} color="rgba(100,140,220,0.7)" />;
    if (type === 'comment') return <MessageCircle size={14} color="rgba(220,180,80,0.7)" />;
    if (type === 'starred') return <Star size={14} color="rgba(255,200,50,0.7)" />;
    if (type === 'forked') return <GitBranch size={14} color="rgba(170,130,220,0.7)" />;
    if (type === 'repo_created' || type === 'branch_created') return <PlusCircle size={14} color="rgba(100,200,130,0.7)" />;
    return <Target size={14} color="rgba(100,140,220,0.7)" />;
  };

  const eventColor = (type: string) => {
    if (type === 'pr_merged') return 'rgba(170,130,220,0.15)';
    if (type === 'pr_opened') return 'rgba(100,200,130,0.15)';
    if (type === 'pr_review') return 'rgba(220,180,80,0.12)';
    if (type === 'push') return 'rgba(100,200,130,0.15)';
    if (type === 'comment') return 'rgba(220,180,80,0.12)';
    if (type === 'starred') return 'rgba(255,200,50,0.12)';
    if (type === 'forked') return 'rgba(170,130,220,0.12)';
    if (type === 'repo_created' || type === 'branch_created') return 'rgba(100,200,130,0.12)';
    return 'rgba(100,140,220,0.15)';
  };

  if (!mounted) return null;

  if (loading) {
    return (
      <div style={{ flex: 1, background: '#080909', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={32} color="rgba(170,130,220,0.6)" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Loading profile data from GitHub...</p>
        </div>
        <style jsx global>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ flex: 1, background: '#080909', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(170,130,220,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Users size={24} color="rgba(170,130,220,0.7)" />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 8 }}>No Profile Yet</h2>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, marginBottom: 24 }}>
            Analyze your GitHub profile from the Explore page first.
          </p>
          <button onClick={() => router.push('/dashboard')}
            style={{ background: '#fff', color: '#000', border: 'none', padding: '10px 24px', borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: 'pointer', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>
            Go to Explore
          </button>
        </div>
      </div>
    );
  }

  const totalContributions = data.heatmap.reduce((s, d) => s + d.count, 0);

  return (
    <div style={{ flex: 1, background: '#080909', overflowY: 'auto' }}>
      <div style={{ maxWidth: 920, margin: '0 auto', padding: '40px 48px 80px' }}>

        {/* ── PROFILE HEADER ── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(170,130,220,0.06) 0%, rgba(100,140,220,0.04) 100%)',
          border: '1px solid rgba(255,255,255,0.06)', borderRadius: 28,
          padding: '36px 40px', marginBottom: 24, position: 'relative', overflow: 'hidden',
        }}>
          {/* Ambient glow */}
          <div style={{ position: 'absolute', top: -60, right: -60, width: 180, height: 180, background: 'radial-gradient(circle, rgba(170,130,220,0.1) 0%, transparent 70%)', filter: 'blur(30px)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', position: 'relative' }}>
            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <img src={data.avatar} alt={data.username}
                style={{ width: 88, height: 88, borderRadius: 20, border: '2px solid rgba(255,255,255,0.1)' }} />
              {data.stats.streak > 0 && (
                <div style={{
                  position: 'absolute', bottom: -6, right: -6, background: '#080909',
                  borderRadius: 10, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 3,
                  border: '1px solid rgba(255,160,50,0.3)',
                }}>
                  <Flame size={12} color="rgba(255,160,50,0.9)" />
                  <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,160,50,0.9)' }}>{data.stats.streak}</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', margin: '0 0 2px' }}>{data.name}</h1>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', fontWeight: 600, marginBottom: 8 }}>@{data.username}</div>
              <p style={{ fontSize: 13, color: 'rgba(170,130,220,0.7)', fontWeight: 600, margin: '0 0 12px', fontStyle: 'italic' }}>{data.tagline}</p>

              {/* Meta */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                {data.location && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={12} /> {data.location}
                  </span>
                )}
                {data.company && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Building size={12} /> {data.company}
                  </span>
                )}
                {data.bio && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {data.bio}
                  </span>
                )}
              </div>

              {/* Followers */}
              <div style={{ display: 'flex', gap: 14, marginTop: 12, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.25)' }}>
                <span><strong style={{ color: 'rgba(255,255,255,0.7)' }}>{data.followers}</strong> followers</span>
                <span><strong style={{ color: 'rgba(255,255,255,0.7)' }}>{data.following}</strong> following</span>
                <span><strong style={{ color: 'rgba(255,255,255,0.7)' }}>{data.publicRepos}</strong> repos</span>
              </div>
            </div>

            {/* Share button */}
            <button onClick={copyLink}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                color: copied ? 'rgba(100,200,130,0.8)' : 'rgba(255,255,255,0.4)',
                fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copied!' : 'Share Profile'}
            </button>
          </div>
        </div>

        {/* ── STATS BAR ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
          marginBottom: 24,
        }}>
          {[
            { label: 'Issues Solved', value: data.stats.issuesSolved, icon: <Target size={16} color="rgba(100,140,220,0.7)" />, color: 'rgba(100,140,220,0.1)' },
            { label: 'PRs Raised', value: data.stats.prsRaised, icon: <GitPullRequest size={16} color="rgba(100,200,130,0.7)" />, color: 'rgba(100,200,130,0.1)' },
            { label: 'PRs Merged', value: data.stats.prsMerged, icon: <GitPullRequest size={16} color="rgba(170,130,220,0.7)" />, color: 'rgba(170,130,220,0.1)' },
            { label: 'Repos Contributed', value: data.stats.reposContributed, icon: <Code size={16} color="rgba(100,200,130,0.7)" />, color: 'rgba(100,200,130,0.1)' },
            { label: 'Total Stars', value: data.stats.totalStars, icon: <Star size={16} color="rgba(255,200,50,0.7)" />, color: 'rgba(255,200,50,0.1)' },
            { label: 'Day Streak', value: data.stats.streak, icon: <Flame size={16} color="rgba(255,160,50,0.7)" />, color: 'rgba(255,160,50,0.1)' },
          ].map(stat => (
            <div key={stat.label} style={{
              background: '#0d0e0f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 18,
              padding: '20px 18px', textAlign: 'center',
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                {stat.icon}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: 2 }}>
                {stat.value >= 1000 ? `${(stat.value / 1000).toFixed(1)}k` : stat.value}
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ── TWO COLUMN: Skills + Timeline ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>

          {/* Skill Radar */}
          <div style={{
            background: '#0d0e0f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 22,
            padding: '28px 28px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(100,140,220,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Code size={16} color="rgba(100,140,220,0.7)" />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>Skill Radar</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontWeight: 600 }}>Auto-detected from repositories</div>
              </div>
            </div>
            {data.languages.map((lang, i) => (
              <SkillBar key={lang.language} language={lang.language} percentage={lang.percentage} proficiency={lang.proficiency} index={i} />
            ))}
            {data.languages.length === 0 && (
              <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No language data found</p>
            )}
          </div>

          {/* Recent Activity Timeline */}
          <div style={{
            background: '#0d0e0f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 22,
            padding: '28px 28px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(170,130,220,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={16} color="rgba(170,130,220,0.7)" />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>Recent Activity</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontWeight: 600 }}>Live from GitHub events</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {data.recentContributions.map((c, i) => (
                <a key={i} href={c.url} target="_blank" rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0',
                    borderBottom: i < data.recentContributions.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                    textDecoration: 'none', transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: eventColor(c.type), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    {eventIcon(c.type)}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontWeight: 600, marginTop: 2 }}>
                      {c.repo} · {formatDate(c.date)}
                    </div>
                  </div>
                </a>
              ))}
              {data.recentContributions.length === 0 && (
                <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No recent activity</p>
              )}
            </div>
          </div>
        </div>

        {/* ── CONTRIBUTION HEATMAP ── */}
        <div style={{
          background: '#0d0e0f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 22,
          padding: '28px 28px 20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(100,200,130,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GitCommit size={16} color="rgba(100,200,130,0.7)" />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>Contribution Timeline</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontWeight: 600 }}>Open source activity — last 12 months</div>
              </div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(100,200,130,0.7)' }}>
              {totalContributions} contributions
            </div>
          </div>
          <HeatmapGrid data={data.heatmap} />
          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 8, fontSize: 10, color: 'rgba(255,255,255,0.15)' }}>
            <span>Less</span>
            {[0, 2, 5, 10, 15].map(v => (
              <div key={v} style={{
                width: 11, height: 11, borderRadius: 2,
                background: v === 0 ? 'rgba(255,255,255,0.03)' : v <= 2 ? 'rgba(100,200,130,0.2)' : v <= 5 ? 'rgba(100,200,130,0.4)' : v <= 10 ? 'rgba(100,200,130,0.6)' : 'rgba(100,200,130,0.85)',
              }} />
            ))}
            <span>More</span>
          </div>
        </div>

      </div>
      <style jsx global>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

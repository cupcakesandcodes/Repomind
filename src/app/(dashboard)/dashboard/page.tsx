'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Plus, Search, Star, TrendingUp, Users, GitPullRequest,
  ExternalLink, Loader2, AlertCircle, Compass, Sparkles,
  ArrowRight, Globe, Flame, Code
} from 'lucide-react';

interface TrendingRepo {
  id: string; name: string; fullName: string; description: string;
  url: string; stars: number; forks: number; language: string;
  topics: string[]; owner: { login: string; avatar: string };
  updatedAt: string; openIssuesCount: number;
}
interface TopContributor {
  login: string; avatar: string; contributions: number;
  url: string; repos: string[];
}
interface LevelUpIssue {
  id: string; title: string; repo: string; url: string;
  labels: string[]; comments: number; createdAt: string;
}
interface Category { name: string; emoji: string; description: string; }
interface UserProfile {
  username: string; name: string; avatar: string; bio: string;
  primaryStack: string[]; totalStars: number; publicRepos: number; topics: string[];
}

const LANG_COLORS: Record<string, string> = {
  TypeScript: '#3178c6', JavaScript: '#f1e05a', Python: '#3572A5',
  Rust: '#dea584', Go: '#00ADD8', Java: '#b07219', 'C++': '#f34b7d',
  C: '#555555', Ruby: '#701516', PHP: '#4F5D95', Swift: '#F05138',
  Kotlin: '#A97BFF', Dart: '#00B4AB', Shell: '#89e051',
};

export default function ExplorePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [repos, setRepos] = useState<TrendingRepo[]>([]);
  const [contributors, setContributors] = useState<TopContributor[]>([]);
  const [levelUpIssues, setLevelUpIssues] = useState<LevelUpIssue[]>([]);
  const [helpWanted, setHelpWanted] = useState<LevelUpIssue[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [profileInput, setProfileInput] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [ingesting, setIngesting] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNew = searchParams.get('new') === 'true';

  useEffect(() => {
    const saved = localStorage.getItem('repomind_profile');
    if (saved) {
      const p = JSON.parse(saved);
      setProfile(p);
      fetchExploreData(p.primaryStack);
    } else {
      fetchExploreData([]);
    }
    setMounted(true);
  }, []);

  const fetchExploreData = async (stack: string[], category?: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/explore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primaryStack: stack, category }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setRepos(data.trendingRepos || []);
      setContributors(data.topContributors || []);
      setLevelUpIssues(data.levelUpIssues || []);
      setHelpWanted(data.helpWantedIssues || []);
      setCategories(data.categories || []);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const analyzeProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileInput.trim()) return;
    setProfileLoading(true); setError('');
    const match = profileInput.match(/github\.com\/([^/\s]+)/);
    const username = match ? match[1] : profileInput.trim();
    try {
      const res = await fetch('/api/analyze-profile', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setProfile(data);
      localStorage.setItem('repomind_profile', JSON.stringify(data));
      fetchExploreData(data.primaryStack);
    } catch (err: any) { setError(err.message || 'Analysis failed'); }
    finally { setProfileLoading(false); }
  };

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;
    setIngesting(true);
    try {
      const response = await fetch('/api/ingest', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: repoUrl }),
      });
      const data = await response.json();
      if (data.status === 'ready') {
        const history = JSON.parse(localStorage.getItem('repomind_history') || '[]');
        const name = repoUrl.split('/').slice(-2).join('/');
        if (!history.find((h: any) => h.id === data.repoId)) {
          history.unshift({ id: data.repoId, name, url: repoUrl });
          localStorage.setItem('repomind_history', JSON.stringify(history));
        }
        window.location.href = `/dashboard/${data.repoId}`;
      }
    } catch { /* silent */ } finally { setIngesting(false); }
  };

  const handleCategoryClick = (cat: string) => {
    const next = activeCategory === cat ? '' : cat;
    setActiveCategory(next);
    fetchExploreData(profile?.primaryStack || [], next || undefined);
  };

  if (!mounted) return null;

  // NO PROFILE + new repo mode
  if (!profile || isNew) {
    return (
      <div style={{ flex: 1, background: '#080909', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, background: '#fff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px' }}>
            <div style={{ width: 24, height: 24, background: '#000', borderRadius: 6 }} />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: 12 }}>
            {isNew ? 'New Repository' : 'Welcome to RepoMind'}
          </h1>
          <p style={{ fontSize: 15, color: '#444', lineHeight: 1.7, marginBottom: 40 }}>
            {isNew ? 'Paste any public GitHub repository URL to start a new chat session.' : 'Paste your GitHub profile to discover repos and issues matched to your skills.'}
          </p>
          {isNew ? (
            <form onSubmit={handleIngest}>
              <div style={{ display: 'flex', alignItems: 'center', background: '#0d0e0f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '5px 5px 5px 18px' }}>
                <Plus size={16} color="rgba(255,255,255,0.18)" style={{ flexShrink: 0 }} />
                <input type="text" placeholder="github.com/owner/repo" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} suppressHydrationWarning
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 14, fontFamily: 'inherit', fontWeight: 500, padding: '12px 10px' }} />
                <button type="submit" disabled={ingesting} style={{ background: '#fff', color: '#000', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase' as const, padding: '12px 24px', borderRadius: 10, opacity: ingesting ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {ingesting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                  {ingesting ? 'Ingesting...' : 'Start Chat'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={analyzeProfile}>
              <div style={{ display: 'flex', alignItems: 'center', background: '#0d0e0f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '5px 5px 5px 18px' }}>
                <Search size={16} color="rgba(255,255,255,0.18)" style={{ flexShrink: 0 }} />
                <input type="text" placeholder="github.com/username or just username" value={profileInput} onChange={(e) => setProfileInput(e.target.value)} suppressHydrationWarning
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 14, fontFamily: 'inherit', fontWeight: 500, padding: '12px 10px' }} />
                <button type="submit" disabled={profileLoading} style={{ background: '#fff', color: '#000', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase' as const, padding: '12px 24px', borderRadius: 10, opacity: profileLoading ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {profileLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                  {profileLoading ? 'Analyzing...' : 'Analyze'}
                </button>
              </div>
            </form>
          )}
          {isNew && profile && (
            <button onClick={() => router.push('/dashboard')} style={{ marginTop: 24, background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>← Back to Explore</button>
          )}
          {error && (
            <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', color: 'rgba(220,100,100,0.8)', fontSize: 13, fontWeight: 600 }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}
          <style jsx global>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // ── MAIN EXPLORE PAGE ──
  return (
    <div style={{ flex: 1, background: '#080909', overflowY: 'auto' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 48px 80px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, rgba(100,140,220,0.15), rgba(170,130,220,0.15))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Compass size={22} color="rgba(170,130,220,0.8)" />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>Explore</h1>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, margin: '2px 0 0' }}>Discover repos, issues & contributors to level up</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={profile.avatar} alt="" style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>{profile.username}</span>
          </div>
        </div>

        {/* Ingest Bar */}
        <form onSubmit={handleIngest} style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', background: '#0d0e0f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '5px 5px 5px 18px' }}>
            <input type="text" placeholder="Paste a repo URL to chat with its codebase..." value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} suppressHydrationWarning
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 14, fontFamily: 'inherit', fontWeight: 500, padding: '10px 8px' }} />
            <button type="submit" disabled={ingesting} style={{ background: '#fff', color: '#000', border: 'none', cursor: 'pointer', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: ingesting ? 0.4 : 1, flexShrink: 0 }}>
              {ingesting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={16} />}
            </button>
          </div>
        </form>

        {/* Interest Categories */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={12} /> Explore by Interest
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {categories.map(cat => (
              <button key={cat.name} onClick={() => handleCategoryClick(cat.name)}
                style={{
                  padding: '8px 16px', borderRadius: 12, cursor: 'pointer',
                  fontSize: 12, fontWeight: 700, transition: 'all 0.2s',
                  background: activeCategory === cat.name ? 'rgba(170,130,220,0.15)' : 'rgba(255,255,255,0.03)',
                  color: activeCategory === cat.name ? 'rgba(170,130,220,0.9)' : 'rgba(255,255,255,0.4)',
                  border: activeCategory === cat.name ? '1px solid rgba(170,130,220,0.3)' : '1px solid rgba(255,255,255,0.06)',
                }}
                onMouseEnter={(e) => { if (activeCategory !== cat.name) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}}
                onMouseLeave={(e) => { if (activeCategory !== cat.name) { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}}
              >
                {cat.emoji} {cat.name}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <Loader2 size={32} color="rgba(170,130,220,0.6)" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Discovering amazing repos...</p>
          </div>
        ) : (
          <>
            {/* Trending Repos */}
            <div style={{ marginBottom: 40 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.2em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TrendingUp size={13} color="rgba(100,200,130,0.6)" /> Trending Repos
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.15)' }}>{repos.length} found</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                {repos.slice(0, 9).map(repo => (
                  <div key={repo.id}
                    onClick={() => window.open(repo.url, '_blank')}
                    style={{
                      background: '#0d0e0f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 18,
                      padding: '20px 22px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <img src={repo.owner.avatar} alt="" style={{ width: 24, height: 24, borderRadius: 6 }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(100,140,220,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{repo.fullName}</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, margin: '0 0 14px', flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {repo.description || 'No description'}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: LANG_COLORS[repo.language] || '#666' }} />
                        {repo.language}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>★ {repo.stars >= 1000 ? `${(repo.stars / 1000).toFixed(1)}k` : repo.stars}</span>
                      <span>{repo.forks} forks</span>
                      {repo.openIssuesCount > 0 && <span style={{ color: 'rgba(100,200,130,0.6)' }}>{repo.openIssuesCount} issues</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Level Up — Good First Issues */}
            {levelUpIssues.length > 0 && (
              <div style={{ marginBottom: 40 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Flame size={13} color="rgba(255,160,50,0.7)" /> Level Up — Good First Issues
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {levelUpIssues.map(issue => (
                    <a key={issue.id} href={issue.url} target="_blank" rel="noopener noreferrer"
                      style={{
                        display: 'block', textDecoration: 'none', background: '#0d0e0f',
                        border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: '16px 20px',
                        transition: 'border-color 0.2s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(100,200,130,0.2)')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)')}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(100,140,220,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{issue.repo}</span>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: 'rgba(100,200,130,0.08)', color: 'rgba(100,200,130,0.7)' }}>Good First Issue</span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.8)', letterSpacing: '-0.01em' }}>{issue.title}</div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Top Contributors */}
            {contributors.length > 0 && (
              <div style={{ marginBottom: 40 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Users size={13} color="rgba(170,130,220,0.6)" /> Top Contributors
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {contributors.slice(0, 8).map((c, i) => (
                    <a key={c.login} href={c.url} target="_blank" rel="noopener noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none',
                        background: '#0d0e0f', border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: 14, padding: '14px 16px', transition: 'border-color 0.2s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(170,130,220,0.2)')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)')}
                    >
                      <div style={{ position: 'relative' }}>
                        <img src={c.avatar} alt="" style={{ width: 32, height: 32, borderRadius: 8 }} />
                        {i < 3 && <span style={{ position: 'absolute', top: -4, right: -4, fontSize: 10, width: 16, height: 16, borderRadius: '50%', background: i === 0 ? 'rgba(255,200,50,0.9)' : i === 1 ? 'rgba(200,200,200,0.8)' : 'rgba(205,127,50,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#000' }}>{i + 1}</span>}
                      </div>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.login}</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontWeight: 600 }}>{c.contributions.toLocaleString()} commits</div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Help Wanted Issues */}
            {helpWanted.length > 0 && (
              <div style={{ marginBottom: 40 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <GitPullRequest size={13} color="rgba(100,140,220,0.6)" /> Help Wanted
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {helpWanted.map(issue => (
                    <a key={issue.id} href={issue.url} target="_blank" rel="noopener noreferrer"
                      style={{
                        display: 'block', textDecoration: 'none', background: '#0d0e0f',
                        border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: '16px 20px',
                        transition: 'border-color 0.2s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(100,140,220,0.2)')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)')}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(100,140,220,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{issue.repo}</span>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: 'rgba(100,140,220,0.08)', color: 'rgba(100,140,220,0.6)' }}>Help Wanted</span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{issue.title}</div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <style jsx global>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

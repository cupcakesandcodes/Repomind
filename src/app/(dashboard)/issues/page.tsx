'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, GitPullRequest, ExternalLink, BookmarkPlus,
  Loader2, Search, Star, MessageSquare, RefreshCw, Filter
} from 'lucide-react';
import { useFilters } from '@/lib/filter-context';

interface Issue {
  id: string;
  repo: string;
  repoUrl: string;
  title: string;
  body: string;
  url: string;
  number: number;
  labels: string[];
  matchScore: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  competitionScore: number;
  repoStars: number;
  repoLanguage: string;
  momentum: 'Growing' | 'Stable' | 'Declining' | 'Unknown';
  responsiveness: 'Fast' | 'Moderate' | 'Slow' | 'Unknown';
  avgMergeTimeDays: number | null;
  hasBounty?: boolean;
  bountyAmount?: string | null;
  createdAt?: string;
}

const DIFF_COLORS: Record<string, { bg: string; text: string }> = {
  Easy: { bg: 'rgba(100,200,130,0.1)', text: 'rgba(100,200,130,0.8)' },
  Medium: { bg: 'rgba(220,180,80,0.1)', text: 'rgba(220,180,80,0.8)' },
  Hard: { bg: 'rgba(220,100,100,0.1)', text: 'rgba(220,100,100,0.8)' },
};

type FilterOption = { label: string; value: string };

const DIFFICULTY_OPTIONS: FilterOption[] = [
  { label: 'All', value: 'All' },
  { label: 'Easy', value: 'Easy' },
  { label: 'Medium', value: 'Medium' },
  { label: 'Hard', value: 'Hard' },
];

const TYPE_OPTIONS: FilterOption[] = [
  { label: 'All', value: 'All' },
  { label: '📄 Docs', value: 'Documentation' },
  { label: '🐛 Bug', value: 'Bug' },
  { label: '✨ Feature', value: 'Feature' },
  { label: '🎨 Design', value: 'Design' },
  { label: '🧪 Test', value: 'Test' },
  { label: '♻️ Refactor', value: 'Refactor' },
];

const DATE_OPTIONS: FilterOption[] = [
  { label: 'All', value: 'All' },
  { label: 'Today', value: 'Today' },
  { label: 'This Week', value: 'This Week' },
  { label: 'This Month', value: 'This Month' },
];

const COMPETITION_OPTIONS: FilterOption[] = [
  { label: 'All', value: 'All' },
  { label: '🟢 Low', value: 'Low' },
  { label: '🟡 Medium', value: 'Medium' },
  { label: '🔴 High', value: 'High' },
];

function FilterChips({ options, selected, onSelect }: {
  options: FilterOption[];
  selected: string;
  onSelect: (val: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onSelect(opt.value)}
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '5px 10px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.15s',
            background: selected === opt.value ? 'rgba(170,130,220,0.15)' : 'rgba(255,255,255,0.03)',
            color: selected === opt.value ? 'rgba(170,130,220,0.9)' : 'rgba(255,255,255,0.3)',
          }}
          onMouseEnter={(e) => {
            if (selected !== opt.value) {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
            }
          }}
          onMouseLeave={(e) => {
            if (selected !== opt.value) {
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              e.currentTarget.style.color = 'rgba(255,255,255,0.3)';
            }
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function IssuesPage() {
  const [profile, setProfile] = useState<any>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [bountyIssues, setBountyIssues] = useState<Issue[]>([]);
  const [bookmarksState, setBookmarksState] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const { filters, setFilter, resetFilters, activeCount } = useFilters();

  useEffect(() => {
    setMounted(true);

    const savedProfile = localStorage.getItem('repomind_profile');
    if (savedProfile) {
      const p = JSON.parse(savedProfile);
      setProfile(p);
      loadIssues(p.primaryStack, p.topics);
    }

    const savedBookmarks = localStorage.getItem('repomind_bookmarks');
    if (savedBookmarks) {
      setBookmarksState(JSON.parse(savedBookmarks));
    }
  }, []);

  const loadIssues = async (primaryStack: string[], topics: string[], forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = localStorage.getItem('repomind_discovered_issues');
      if (cached) {
        const data = JSON.parse(cached);
        setIssues(data.issues || []);
        setBountyIssues(data.bountyIssues || []);
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch('/api/discover-issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primaryStack, topics }),
      });
      if (!res.ok) throw new Error('Discovery failed');
      const data = await res.json();
      setIssues(data.issues || []);
      setBountyIssues(data.bountyIssues || []);
      localStorage.setItem('repomind_discovered_issues', JSON.stringify(data));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (profile) {
      loadIssues(profile.primaryStack, profile.topics, true);
    }
  };

  const handleBookmark = (issue: Issue, e: React.MouseEvent) => {
    e.stopPropagation();
    const saved = localStorage.getItem('repomind_bookmarks');
    const bookmarks = saved ? JSON.parse(saved) : [];
    const exists = bookmarks.find((b: any) => b.id === issue.id);

    let updated;
    if (exists) {
      updated = bookmarks.filter((b: any) => b.id !== issue.id);
    } else {
      const newBookmark = {
        id: issue.id,
        repo: issue.repo,
        title: issue.title,
        url: issue.url,
        savedAt: new Date().toISOString()
      };
      updated = [...bookmarks, newBookmark];
    }
    localStorage.setItem('repomind_bookmarks', JSON.stringify(updated));
    setBookmarksState(updated);
  };

  const isBookmarked = (id: string) => {
    return !!bookmarksState.find((b: any) => b.id === id);
  };

  const detectType = (labels: string[]): string => {
    const lower = labels.map(l => l.toLowerCase());
    if (lower.some(l => l.includes('documentation') || l.includes('docs'))) return 'Documentation';
    if (lower.some(l => l.includes('bug') || l.includes('fix'))) return 'Bug';
    if (lower.some(l => l.includes('feature') || l.includes('enhancement'))) return 'Feature';
    if (lower.some(l => l.includes('design') || l.includes('ui') || l.includes('ux'))) return 'Design';
    if (lower.some(l => l.includes('test') || l.includes('testing'))) return 'Test';
    if (lower.some(l => l.includes('refactor') || l.includes('cleanup'))) return 'Refactor';
    return 'Other';
  };

  const filteredIssues = useMemo(() => {
    const all = [...issues, ...bountyIssues];
    const unique = Array.from(new Map(all.map(item => [item.id, item])).values());

    return unique.filter(issue => {
      // Search text filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = issue.title.toLowerCase().includes(query);
        const matchesRepo = issue.repo.toLowerCase().includes(query);
        const matchesLabels = issue.labels.some(l => l.toLowerCase().includes(query));
        if (!matchesTitle && !matchesRepo && !matchesLabels) return false;
      }

      // Difficulty
      if (filters.difficulty !== 'All' && issue.difficulty !== filters.difficulty) return false;

      // Type
      if (filters.type !== 'All' && detectType(issue.labels) !== filters.type) return false;

      // Date
      if (filters.datePosted !== 'All' && issue.createdAt) {
        const created = new Date(issue.createdAt).getTime();
        const now = Date.now();
        if (filters.datePosted === 'Today' && now - created > 86400000) return false;
        if (filters.datePosted === 'This Week' && now - created > 604800000) return false;
        if (filters.datePosted === 'This Month' && now - created > 2592000000) return false;
      }

      // Competition
      if (filters.competition !== 'All') {
        if (filters.competition === 'Low' && issue.competitionScore > 3) return false;
        if (filters.competition === 'Medium' && (issue.competitionScore <= 3 || issue.competitionScore > 8)) return false;
        if (filters.competition === 'High' && issue.competitionScore <= 8) return false;
      }

      return true;
    });
  }, [issues, bountyIssues, filters, searchQuery]);

  if (!mounted) return null;

  return (
    <div style={{ flex: 1, background: '#080909', minHeight: '100vh', padding: '40px 48px', overflowY: 'auto' }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>

        {/* Back Link */}
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'none', border: 'none',
            color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', marginBottom: 32, transition: 'color 0.2s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
        >
          <ArrowLeft size={16} /> Back to Explore
        </button>

        {/* Title & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(170,130,220,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GitPullRequest size={22} color="rgba(170,130,220,0.8)" />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>All Matched Issues</h1>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, margin: '4px 0 0 0' }}>
                Open source tasks targeted exactly to your technical profile and experience.
              </p>
            </div>
          </div>

          {profile && (
            <button
              onClick={handleRefresh}
              disabled={loading}
              style={{
                background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)',
                color: 'rgba(255,255,255,0.6)', cursor: 'pointer', borderRadius: 10,
                padding: '10px 16px', fontSize: 12, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
              }}
            >
              <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              {loading ? 'Refreshing...' : 'Refresh Issues'}
            </button>
          )}
        </div>

        {/* ── Beautiful In-Page Filter Panel ── */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: 20,
          padding: '24px 28px',
          marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              <Filter size={12} color="rgba(170,130,220,0.8)" /> Filter Matched Issues
              {activeCount > 0 && (
                <span style={{
                  fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
                  background: 'rgba(170,130,220,0.15)', color: 'rgba(170,130,220,0.9)',
                  minWidth: 14, textAlign: 'center',
                }}>
                  {activeCount} active
                </span>
              )}
            </div>
            {activeCount > 0 && (
              <button
                onClick={resetFilters}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 11, fontWeight: 700, color: 'rgba(220,100,100,0.6)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(220,100,100,0.9)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(220,100,100,0.6)')}
              >
                Reset Filters
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Row 1: Difficulty & Date Posted */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, paddingLeft: 2 }}>
                  Difficulty Level
                </div>
                <FilterChips options={DIFFICULTY_OPTIONS} selected={filters.difficulty} onSelect={(v) => setFilter('difficulty', v as any)} />
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, paddingLeft: 2 }}>
                  Date Posted
                </div>
                <FilterChips options={DATE_OPTIONS} selected={filters.datePosted} onSelect={(v) => setFilter('datePosted', v as any)} />
              </div>
            </div>

            {/* Row 2: Task Type */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, paddingLeft: 2 }}>
                Task Type
              </div>
              <FilterChips options={TYPE_OPTIONS} selected={filters.type} onSelect={(v) => setFilter('type', v as any)} />
            </div>

            {/* Row 3: Competition Level */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, paddingLeft: 2 }}>
                Competition Level
              </div>
              <FilterChips options={COMPETITION_OPTIONS} selected={filters.competition} onSelect={(v) => setFilter('competition', v as any)} />
            </div>
          </div>
        </div>

        {/* Premium Active Bounties Showcase */}
        {!loading && bountyIssues.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(250, 180, 50, 0.04) 0%, rgba(170, 130, 220, 0.01) 100%)',
            border: '1px solid rgba(250, 180, 50, 0.15)',
            borderRadius: 24,
            padding: '28px 32px',
            marginBottom: 32,
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Ambient gold glow in corner */}
            <div style={{
              position: 'absolute', top: -40, right: -40, width: 120, height: 120,
              background: 'radial-gradient(circle, rgba(250, 180, 50, 0.15) 0%, transparent 70%)',
              filter: 'blur(20px)', pointerEvents: 'none'
            }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(250, 180, 50, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 18 }}>💰</span>
                </div>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>Premium Active Bounties</h2>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: '2px 0 0 0' }}>Earn real cash for solving verified open-source issues.</p>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              {bountyIssues.slice(0, 3).map((issue) => (
                <div
                  key={issue.id}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.04)',
                    borderRadius: 18,
                    padding: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.25s',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(250, 180, 50, 0.3)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                  }}
                >
                  <div>
                    {/* Top line: Repo and Bounty Badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
                        {issue.repo.split('/')[1]}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
                        background: 'rgba(250,180,50,0.15)', color: 'rgba(250,180,50,0.9)',
                        border: '1px solid rgba(250,180,50,0.25)', display: 'flex', alignItems: 'center', gap: 3
                      }}>
                        ⚡ {issue.bountyAmount || 'Bounty'}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.95)', lineBreak: 'anywhere', margin: '0 0 16px 0', lineHeight: 1.4, height: 38, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {issue.title}
                    </h3>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button
                      onClick={() => router.push(`/dashboard/${issue.repo.replace('/', '_')}?issueTitle=${encodeURIComponent(issue.title)}`)}
                      style={{
                        flex: 1, background: 'rgba(250, 180, 50, 0.1)', border: '1px solid rgba(250, 180, 50, 0.2)',
                        borderRadius: 8, padding: '8px 10px', color: 'rgba(250, 180, 50, 0.9)', fontSize: 11, fontWeight: 700,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(250, 180, 50, 0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(250, 180, 50, 0.1)';
                      }}
                    >
                      <MessageSquare size={12} /> Solve Bounty
                    </button>
                    <a
                      href={issue.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 8, padding: '8px 10px', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                        e.currentTarget.style.color = '#fff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                      }}
                    >
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Local Search Bar */}
        <div style={{
          display: 'flex', alignItems: 'center',
          background: '#0d0e0f', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14, padding: '5px 16px', marginBottom: 28,
        }}>
          <Search size={16} color="rgba(255,255,255,0.18)" style={{ flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search by issue title, repository name or label..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: '#fff', fontSize: 14, fontFamily: 'inherit', fontWeight: 500, padding: '10px 12px',
            }}
          />
        </div>

        {/* Loading / Results View */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <Loader2 size={36} color="rgba(170,130,220,0.6)" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Discovering tasks matching your stack...</p>
          </div>
        ) : filteredIssues.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: 24 }}>
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 15 }}>
              {issues.length === 0
                ? 'No issues discovered yet. Refresh the list to fetch matched issues.'
                : 'No issues match your current filter criteria or search query.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filteredIssues.map((issue) => (
              <div
                key={issue.id}
                style={{
                  background: '#0d0e0f', border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: 20, padding: '24px 28px', position: 'relative',
                  transition: 'border-color 0.2s', display: 'flex', flexDirection: 'column'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)')}
              >
                {/* Actions Top Right */}
                <div style={{ position: 'absolute', top: 24, right: 28, display: 'flex', gap: 14, alignItems: 'center' }}>
                  <button
                    onClick={(e) => handleBookmark(issue, e)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: isBookmarked(issue.id) ? 'rgba(100,140,220,0.8)' : 'rgba(255,255,255,0.2)',
                      transition: 'color 0.2s', padding: 0, display: 'flex'
                    }}
                  >
                    <BookmarkPlus size={18} fill={isBookmarked(issue.id) ? 'currentColor' : 'none'} />
                  </button>
                  <a
                    href={issue.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: 'rgba(255,255,255,0.3)', transition: 'color 0.2s', display: 'flex'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>

                {/* Top Info Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingRight: 48 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(100,140,220,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                      {issue.repo}
                    </span>
                    {issue.repoStars > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        ★ {issue.repoStars >= 1000 ? `${(issue.repoStars / 1000).toFixed(1)}k` : issue.repoStars}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {issue.hasBounty && (
                      <span style={{
                        fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 6,
                        background: 'rgba(255,180,50,0.15)', color: 'rgba(255,180,50,0.9)',
                      }}>
                        {issue.bountyAmount || '💰 Bounty'}
                      </span>
                    )}
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                      background: 'rgba(100,200,130,0.08)', color: 'rgba(100,200,130,0.7)',
                    }}>
                      {issue.matchScore}% Match
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                      ...DIFF_COLORS[issue.difficulty],
                    }}>
                      {issue.difficulty}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.9)', letterSpacing: '-0.01em', margin: '0 0 10px 0', paddingRight: 48 }}>
                  {issue.title}
                </h3>

                {/* Intelligence Signals Bar */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                  {/* Competition */}
                  {issue.competitionScore < 3 && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 5,
                      background: 'rgba(100,140,220,0.08)', color: 'rgba(100,140,220,0.6)',
                    }}>
                      👥 Low competition
                    </span>
                  )}
                  {issue.competitionScore >= 3 && issue.competitionScore < 8 && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 5,
                      background: 'rgba(220,180,80,0.08)', color: 'rgba(220,180,80,0.6)',
                    }}>
                      👥 {issue.competitionScore} working
                    </span>
                  )}

                  {/* Responsiveness */}
                  {issue.responsiveness === 'Fast' && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 5,
                      background: 'rgba(100,200,130,0.08)', color: 'rgba(100,200,130,0.6)',
                    }}>
                      ⚡ Merges in {issue.avgMergeTimeDays}d
                    </span>
                  )}
                  {issue.responsiveness === 'Moderate' && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 5,
                      background: 'rgba(220,180,80,0.08)', color: 'rgba(220,180,80,0.5)',
                    }}>
                      ⏱ ~{issue.avgMergeTimeDays}d to merge
                    </span>
                  )}
                  {issue.responsiveness === 'Slow' && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 5,
                      background: 'rgba(220,100,100,0.08)', color: 'rgba(220,100,100,0.5)',
                    }}>
                      🐌 Slow responder
                    </span>
                  )}

                  {/* Momentum */}
                  {issue.momentum === 'Growing' && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 5,
                      background: 'rgba(100,200,130,0.08)', color: 'rgba(100,200,130,0.6)',
                    }}>
                      📈 Growing
                    </span>
                  )}
                  {issue.momentum === 'Declining' && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 5,
                      background: 'rgba(220,100,100,0.08)', color: 'rgba(220,100,100,0.5)',
                    }}>
                      📉 Declining
                    </span>
                  )}

                  {/* Repo Language */}
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 5,
                    background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.4)',
                  }}>
                    💻 {issue.repoLanguage}
                  </span>
                </div>

                {/* Labels Chips */}
                {issue.labels.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
                    {issue.labels.slice(0, 5).map((label, i) => (
                      <span key={i} style={{
                        fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.25)',
                        background: 'rgba(255,255,255,0.03)', padding: '3px 8px', borderRadius: 6,
                      }}>
                        {label}
                      </span>
                    ))}
                  </div>
                )}

                {/* Resume/Start Chat Button */}
                <button
                  onClick={() => router.push(`/dashboard/${issue.repo.replace('/', '_')}?issueTitle=${encodeURIComponent(issue.title)}`)}
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 12, padding: '12px', color: '#fff', fontSize: 13, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                  }}
                >
                  <MessageSquare size={16} /> Chat with Codebase
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <style jsx global>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

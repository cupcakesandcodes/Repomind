'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Code, History, Filter, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useFilters } from '@/lib/filter-context';
import styles from './Sidebar.module.css';

interface RepoHistory {
  id: string;
  name: string;
  url: string;
}

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
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6, marginBottom: 4 }}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onSelect(opt.value)}
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: 6,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.15s',
            background: selected === opt.value ? 'rgba(100,140,220,0.15)' : 'rgba(255,255,255,0.03)',
            color: selected === opt.value ? 'rgba(100,140,220,0.9)' : 'rgba(255,255,255,0.3)',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function Sidebar() {
  const [history, setHistory] = useState<RepoHistory[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [streak, setStreak] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const params = useParams();
  const pathname = usePathname();
  const activeRepoId = params.repoId as string | undefined;
  const [mounted, setMounted] = useState(false);
  const { filters, setFilter, resetFilters, activeCount } = useFilters();

  const isDashboard = pathname === '/dashboard';
  const isProfile = pathname === '/profile';
  const isIssues = pathname === '/issues';
  const isRoadmap = pathname === '/roadmap';
  const isBookmarks = pathname === '/bookmarks';
  const showFilters = isIssues;

  useEffect(() => {
    setMounted(true);
    const savedHistory = localStorage.getItem('repomind_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));

    const savedProfile = localStorage.getItem('repomind_profile');
    if (savedProfile) setProfile(JSON.parse(savedProfile));

    const savedStreak = localStorage.getItem('repomind_streak');
    if (savedStreak) setStreak(parseInt(savedStreak, 10));
  }, []);

  if (!mounted) return null;

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <div className={styles.logo}>
          <div style={{ width: 20, height: 20, background: '#fff', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 10, height: 10, background: '#000', borderRadius: 2 }} />
          </div>
          <Link href="/">RepoMind</Link>
        </div>

        {profile && (
          <Link href="/profile" style={{ textDecoration: 'none' }}>
            <div className={styles.profileChip} style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}>
              <img src={profile.avatar} alt={profile.username} className={styles.avatar} />
              <div className={styles.profileInfo}>
                <div className={styles.username}>{profile.name || profile.username}</div>
                <div className={styles.streak}>
                  <span style={{ color: streak > 0 ? '#ff9500' : 'rgba(255,255,255,0.2)' }}>●</span> {streak} day streak
                </div>
              </div>
            </div>
          </Link>
        )}
      </div>

      <div className={styles.repoList}>
        {/* Insights Navigation */}
        <div style={{ marginBottom: 20 }}>
          <div className={styles.sectionLabel}>Insights</div>
          <Link href="/dashboard" className={`${styles.repoItem} ${isDashboard ? styles.activeRepo : ''}`}>
            <span>Explore</span>
          </Link>
          <Link href="/profile" className={`${styles.repoItem} ${isProfile ? styles.activeRepo : ''}`}>
            <span>Profile</span>
          </Link>
          <Link href="/issues" className={`${styles.repoItem} ${isIssues ? styles.activeRepo : ''}`}>
            <span>Issues</span>
          </Link>
          <Link href="/roadmap" className={`${styles.repoItem} ${isRoadmap ? styles.activeRepo : ''}`}>
            <span>Roadmap</span>
          </Link>
          <Link href="/bookmarks" className={`${styles.repoItem} ${isBookmarks ? styles.activeRepo : ''}`}>
            <span>Bookmarks</span>
          </Link>
        </div>

        {/* Issue Filters */}
        {showFilters && (
          <div style={{ marginBottom: 20 }}>
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '4px 8px',
                background: 'none', border: 'none', cursor: 'pointer',
                marginBottom: filtersOpen ? 8 : 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                <Filter size={11} />
                Issue Filters
                {activeCount > 0 && (
                  <span style={{
                    fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 4,
                    background: 'rgba(100,140,220,0.15)', color: 'rgba(100,140,220,0.9)',
                    minWidth: 14, textAlign: 'center',
                  }}>
                    {activeCount}
                  </span>
                )}
              </div>
              {filtersOpen ? <ChevronUp size={12} color="rgba(255,255,255,0.15)" /> : <ChevronDown size={12} color="rgba(255,255,255,0.15)" />}
            </button>

            {filtersOpen && (
              <div style={{ padding: '0 4px' }}>
                {/* Difficulty */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.25)', paddingLeft: 4, marginBottom: 2 }}>Level</div>
                  <FilterChips options={DIFFICULTY_OPTIONS} selected={filters.difficulty} onSelect={(v) => setFilter('difficulty', v as any)} />
                </div>

                {/* Type */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.25)', paddingLeft: 4, marginBottom: 2 }}>Type</div>
                  <FilterChips options={TYPE_OPTIONS} selected={filters.type} onSelect={(v) => setFilter('type', v as any)} />
                </div>

                {/* Date Posted */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.25)', paddingLeft: 4, marginBottom: 2 }}>Posted</div>
                  <FilterChips options={DATE_OPTIONS} selected={filters.datePosted} onSelect={(v) => setFilter('datePosted', v as any)} />
                </div>

                {/* Competition */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.25)', paddingLeft: 4, marginBottom: 2 }}>Competition</div>
                  <FilterChips options={COMPETITION_OPTIONS} selected={filters.competition} onSelect={(v) => setFilter('competition', v as any)} />
                </div>

                {/* Reset */}
                {activeCount > 0 && (
                  <button
                    onClick={resetFilters}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      fontSize: 10, fontWeight: 700, color: 'rgba(220,100,100,0.6)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: '4px 4px', marginTop: 4,
                    }}
                  >
                    <RotateCcw size={10} /> Clear all filters
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Recent Work */}
        <div className={styles.sectionLabel}>
          <History size={12} />
          Recent Work
        </div>
        
        {history.map(repo => (
          <Link 
            key={repo.id}
            href={`/dashboard/${repo.id}`}
            className={`${styles.repoItem} ${activeRepoId === repo.id ? styles.activeRepo : ''}`}
          >
            <Code size={14} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{repo.name}</span>
          </Link>
        ))}

        {history.length === 0 && (
          <div style={{ padding: '32px 12px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.15)', fontSize: 13 }}>
            No repositories yet
          </div>
        )}
      </div>

      <div className={styles.sidebarFooter}>
        <Link href="/dashboard?new=true" className={styles.newBtn}>
          <Plus size={16} />
          <span>New Repository</span>
        </Link>
      </div>
    </aside>
  );
}

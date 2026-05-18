'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Lock, Sparkles, ChevronRight, Loader2, RefreshCw, Shield, ExternalLink, GitPullRequest, Star, Flame, Trophy, List, Calendar, LayoutGrid } from 'lucide-react';

type View = 'list'|'calendar'|'kanban';
interface Task { id:string; week:number; day:string; title:string; description:string; timeEstimate:string; verifyType:string; verifyDescription:string; xp:number; suggestedRepo:string|null; whyItMatters:string; }
interface Phase { id:number; name:string; weeks:string; description:string; tasks:Task[]; }
interface Milestone { week:number; title:string; badge:string; requirement:string; }
interface SuggestedRepo { name:string; why:string; difficulty:string; goodFirstIssues:boolean; }
interface Roadmap { level:string; levelLabel:string; totalWeeks:number; summary:string; phases:Phase[]; suggestedRepos:SuggestedRepo[]; milestones:Milestone[]; profile:any; }

export default function RoadmapPage() {
  const [profile, setProfile] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<'onboard'|'loading'|'view'>('onboard');
  const [goal, setGoal] = useState('');
  const [hours, setHours] = useState('5');
  const [roadmap, setRoadmap] = useState<Roadmap|null>(null);
  const [verified, setVerified] = useState<Record<string,boolean>>({});
  const [verifying, setVerifying] = useState(false);
  const [view, setView] = useState<View>('list');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const s = localStorage.getItem('repomind_profile');
    if (s) setProfile(JSON.parse(s));
    const r = localStorage.getItem('rm_ai_roadmap');
    if (r) { const d = JSON.parse(r); setRoadmap(d.roadmap); setVerified(d.verified||{}); setGoal(d.goal||''); setStep('view'); }
  }, []);

  const generate = async (regenCtx?: any) => {
    if (!profile || !goal) return;
    setStep('loading'); setError('');
    try {
      // Snapshot current GitHub stats as baseline before generating
      let baseline: any = {};
      try {
        const bRes = await fetch('/api/verify-quests', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username: profile.username, questPath: 'first-pr' }) });
        if (bRes.ok) baseline = await bRes.json();
      } catch {}

      const res = await fetch('/api/generate-roadmap', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ username: profile.username, goal, hoursPerWeek: hours, regenerationContext: regenCtx }),
      });
      let data;
      try {
        data = await res.json();
      } catch (err) {
        throw new Error('Server returned invalid response');
      }
      if (!res.ok) {
        throw new Error(data.error || `Server error (${res.status})`);
      }
      setRoadmap(data); setVerified({}); setStep('view');
      // Save baseline so verification only counts NEW activity after this point
      localStorage.setItem('rm_ai_roadmap', JSON.stringify({
        roadmap: data, verified: {}, goal, hours, generatedAt: Date.now(),
        baseline: {
          prsRaised: baseline.prsRaised || 0,
          prsMerged: baseline.prsMerged || 0,
          pushEvents: baseline.pushEvents || 0,
          forkedRepos: baseline.forkedRepos || 0,
          starsGiven: baseline.starsGiven || 0,
          issueComments: baseline.issueComments || 0,
          prReviews: baseline.prReviews || 0,
        },
      }));
    } catch (e:any) { setError(e.message); setStep('onboard'); }
  };

  // Adaptive regeneration — compares actual pace to planned pace
  const regenerate = async () => {
    if (!roadmap || !profile) return;
    const at = roadmap.phases.flatMap(p => p.tasks);
    const done = at.filter(t => verified[t.id]).length;
    const total = at.length;
    const savedData = JSON.parse(localStorage.getItem('rm_ai_roadmap') || '{}');
    const daysSinceGenerated = savedData.generatedAt ? Math.round((Date.now() - savedData.generatedAt) / 86400000) : 0;
    const expectedWeeks = daysSinceGenerated / 7;
    const tasksPerWeek = total / (roadmap.totalWeeks || 8);
    const expectedDone = Math.round(expectedWeeks * tasksPerWeek);
    const ahead = done > expectedDone;
    const behind = done < expectedDone && expectedDone > 0;

    let paceNote = '';
    let reason = 'Manual refresh';
    if (ahead) {
      paceNote = `Great work! You completed ${done} tasks in ${daysSinceGenerated} days — that's ${done - expectedDone} ahead of schedule. Accelerating your roadmap.`;
      reason = 'Ahead of schedule';
    } else if (behind) {
      paceNote = `You've completed ${done} of ${expectedDone} expected tasks in ${daysSinceGenerated} days. No worries — breaking remaining tasks into smaller, easier steps.`;
      reason = 'Behind schedule — simplifying';
    } else {
      paceNote = `You're right on track with ${done} tasks done. Refreshing your plan with your latest GitHub stats.`;
      reason = 'On-pace refresh';
    }

    await generate({
      completedCount: done,
      originalPace: `${tasksPerWeek.toFixed(1)} tasks/week`,
      actualPace: daysSinceGenerated > 0 ? `${(done / (daysSinceGenerated / 7)).toFixed(1)} tasks/week` : 'just started',
      reason,
      paceNote,
    });
  };

  const verify = async () => {
    if (!profile || !roadmap) return;
    setVerifying(true);
    try {
      const res = await fetch('/api/verify-quests', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username: profile.username, questPath: 'first-pr' }) });
      if (!res.ok) throw new Error('Failed');
      const stats = await res.json();

      // Get baseline from when roadmap was created
      const saved = JSON.parse(localStorage.getItem('rm_ai_roadmap')||'{}');
      const base = saved.baseline || {};

      // Only count NEW activity since roadmap was generated
      const delta = {
        prsRaised: Math.max(0, (stats.prsRaised || 0) - (base.prsRaised || 0)),
        prsMerged: Math.max(0, (stats.prsMerged || 0) - (base.prsMerged || 0)),
        pushEvents: Math.max(0, (stats.pushEvents || 0) - (base.pushEvents || 0)),
        forkedRepos: Math.max(0, (stats.forkedRepos || 0) - (base.forkedRepos || 0)),
        starsGiven: Math.max(0, (stats.starsGiven || 0) - (base.starsGiven || 0)),
        issueComments: Math.max(0, (stats.issueComments || 0) - (base.issueComments || 0)),
        prReviews: Math.max(0, (stats.prReviews || 0) - (base.prReviews || 0)),
      };

      const v: Record<string,boolean> = {};
      const typeCounters: Record<string,number> = {};
      const allT = roadmap.phases.flatMap(p => p.tasks);
      const sorted = [...allT].sort((a,b) => a.week - b.week || a.id.localeCompare(b.id));

      for (const t of sorted) {
        if (t.verifyType === 'manual') { v[t.id] = verified[t.id] || false; continue; }
        typeCounters[t.verifyType] = (typeCounters[t.verifyType] || 0) + 1;
        const needed = typeCounters[t.verifyType];

        if (t.verifyType === 'auto_pr') v[t.id] = delta.prsRaised >= needed;
        else if (t.verifyType === 'auto_pr_merged') v[t.id] = delta.prsMerged >= needed;
        else if (t.verifyType === 'auto_commit') v[t.id] = delta.pushEvents >= needed;
        else if (t.verifyType === 'auto_fork') v[t.id] = delta.forkedRepos >= needed;
        else if (t.verifyType === 'auto_star') v[t.id] = delta.starsGiven >= needed;
        else if (t.verifyType === 'auto_issue_comment') v[t.id] = delta.issueComments >= needed;
        else if (t.verifyType === 'auto_pr_review') v[t.id] = delta.prReviews >= needed;
        else v[t.id] = false;
      }

      setVerified(v);
      localStorage.setItem('rm_ai_roadmap', JSON.stringify({ ...saved, verified: v }));
    } catch {} finally { setVerifying(false); }
  };

  const manualVerify = (id:string) => {
    const v = { ...verified, [id]: !verified[id] };
    setVerified(v);
    const saved = JSON.parse(localStorage.getItem('rm_ai_roadmap')||'{}');
    localStorage.setItem('rm_ai_roadmap', JSON.stringify({ ...saved, verified: v }));
  };

  const reset = () => { localStorage.removeItem('rm_ai_roadmap'); setRoadmap(null); setVerified({}); setStep('onboard'); };

  const allTasks = roadmap?.phases.flatMap(p => p.tasks) || [];
  const doneCount = allTasks.filter(t => verified[t.id]).length;
  const totalXp = allTasks.reduce((s,t) => s+t.xp, 0);
  const earnedXp = allTasks.filter(t => verified[t.id]).reduce((s,t) => s+t.xp, 0);

  if (!mounted) return null;

  // ── ONBOARDING ──
  if (step === 'onboard') {
    const goals = [
      { id:'Land my first open-source PR', emoji:'🚀' },
      { id:'Get an internship/job through OSS contributions', emoji:'💼' },
      { id:'Earn money from bounties', emoji:'💰' },
      { id:'Become a core maintainer of a project', emoji:'👑' },
      { id:'Build a strong developer portfolio', emoji:'📁' },
      { id:'Learn a new language through contributions', emoji:'📚' },
    ];
    return (
      <div style={{flex:1,background:'#080909',overflowY:'auto'}}>
        <div style={{maxWidth:580,margin:'0 auto',padding:'60px 48px 80px',textAlign:'center'}}>
          <div style={{width:56,height:56,borderRadius:16,background:'linear-gradient(135deg,rgba(170,130,220,0.15),rgba(100,200,130,0.1))',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}><Sparkles size={28} color="rgba(170,130,220,0.8)"/></div>
          <h1 style={{fontSize:28,fontWeight:800,color:'#fff',letterSpacing:'-0.03em',marginBottom:8}}>AI-Powered Roadmap</h1>
          <p style={{color:'rgba(255,255,255,0.35)',fontSize:14,marginBottom:8,lineHeight:1.7}}>{profile?`${profile.name||profile.username}, we'll`:'We\'ll'} analyze your entire GitHub history and generate a personalized week-by-week plan.</p>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginBottom:32}}><Shield size={12} color="rgba(100,200,130,0.6)"/><span style={{fontSize:11,fontWeight:700,color:'rgba(100,200,130,0.5)'}}>Progress auto-verified from GitHub</span></div>

          <div style={{textAlign:'left',marginBottom:28}}>
            <div style={{fontSize:11,fontWeight:800,color:'rgba(255,255,255,0.25)',letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:12}}>What&apos;s your goal?</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {goals.map(g=>(
                <button key={g.id} onClick={()=>setGoal(g.id)} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 18px',borderRadius:14,cursor:'pointer',transition:'all 0.2s',textAlign:'left',background:goal===g.id?'rgba(170,130,220,0.1)':'rgba(255,255,255,0.02)',border:goal===g.id?'1px solid rgba(170,130,220,0.3)':'1px solid rgba(255,255,255,0.05)',color:goal===g.id?'#fff':'rgba(255,255,255,0.5)'}}>
                  <span style={{fontSize:20}}>{g.emoji}</span><span style={{fontSize:13,fontWeight:700}}>{g.id}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{textAlign:'left',marginBottom:32}}>
            <div style={{fontSize:11,fontWeight:800,color:'rgba(255,255,255,0.25)',letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:12}}>Hours per week?</div>
            <div style={{display:'flex',gap:8}}>
              {['2','5','10','15+'].map(h=>(
                <button key={h} onClick={()=>setHours(h)} style={{flex:1,padding:'12px',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer',background:hours===h?'rgba(100,200,130,0.1)':'rgba(255,255,255,0.02)',border:hours===h?'1px solid rgba(100,200,130,0.3)':'1px solid rgba(255,255,255,0.05)',color:hours===h?'rgba(100,200,130,0.9)':'rgba(255,255,255,0.4)'}}>{h}h</button>
              ))}
            </div>
          </div>

          {error&&<div style={{marginBottom:16,padding:'10px 14px',borderRadius:10,background:'rgba(220,80,80,0.08)',border:'1px solid rgba(220,80,80,0.15)',color:'rgba(220,80,80,0.8)',fontSize:12,fontWeight:600}}>{error}</div>}

          <button onClick={()=>generate()} disabled={!goal||!profile} style={{width:'100%',padding:'16px',borderRadius:14,border:'none',cursor:goal&&profile?'pointer':'not-allowed',background:goal&&profile?'#fff':'rgba(255,255,255,0.05)',color:goal&&profile?'#000':'rgba(255,255,255,0.2)',fontSize:14,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            <Sparkles size={16}/>Generate My Roadmap
          </button>
        </div>
      </div>
    );
  }

  // ── LOADING ──
  if (step === 'loading') return (
    <div style={{flex:1,background:'#080909',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center'}}>
        <Loader2 size={36} color="rgba(170,130,220,0.6)" style={{animation:'spin 1s linear infinite',margin:'0 auto 20px'}}/>
        <h2 style={{fontSize:20,fontWeight:800,color:'#fff',marginBottom:8}}>Analyzing your GitHub...</h2>
        <p style={{color:'rgba(255,255,255,0.3)',fontSize:13,lineHeight:1.7,maxWidth:360}}>Reading your PRs, repos, languages, and contribution patterns to build your personalized roadmap.</p>
      </div>
      <style jsx global>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!roadmap) return null;

  // ── MAIN VIEW ──
  return (
    <div style={{flex:1,background:'#080909',overflowY:'auto'}}>
      <div style={{maxWidth:800,margin:'0 auto',padding:'32px 48px 80px'}}>
        {/* Top */}
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
          <button onClick={()=>router.push('/dashboard')} style={{display:'flex',alignItems:'center',gap:6,background:'none',border:'none',color:'rgba(255,255,255,0.4)',fontSize:13,fontWeight:600,cursor:'pointer'}}><ArrowLeft size={16}/>Back</button>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            <button onClick={regenerate} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 14px',borderRadius:8,cursor:'pointer',background:'rgba(170,130,220,0.08)',border:'1px solid rgba(170,130,220,0.15)',color:'rgba(170,130,220,0.8)',fontSize:11,fontWeight:700,transition:'all 0.2s'}}>
              <Sparkles size={12}/>Adapt Roadmap
            </button>
            <button onClick={reset} style={{fontSize:10,fontWeight:700,color:'rgba(220,100,100,0.3)',background:'none',border:'none',cursor:'pointer'}}>Start Over</button>
          </div>
        </div>

        {/* Header */}
        <div style={{background:'linear-gradient(135deg,rgba(170,130,220,0.08),rgba(100,200,130,0.04))',border:'1px solid rgba(255,255,255,0.06)',borderRadius:24,padding:'24px 28px',marginBottom:20}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <div>
              <div style={{fontSize:9,fontWeight:800,color:'rgba(170,130,220,0.6)',letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:4}}>{roadmap.levelLabel} · {roadmap.totalWeeks}-week plan</div>
              <div style={{fontSize:18,fontWeight:800,color:'#fff'}}>{goal}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:22,fontWeight:900,color:'#fff'}}>{earnedXp}<span style={{fontSize:11,color:'rgba(255,255,255,0.25)'}}> / {totalXp} XP</span></div>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.2)'}}>{doneCount}/{allTasks.length} tasks</div>
            </div>
          </div>
          <div style={{height:6,borderRadius:3,background:'rgba(255,255,255,0.05)',overflow:'hidden',marginBottom:10}}>
            <div style={{height:'100%',borderRadius:3,background:'linear-gradient(90deg,rgba(170,130,220,0.7),rgba(100,200,130,0.7))',width:`${totalXp?Math.round((earnedXp/totalXp)*100):0}%`,transition:'width 0.5s ease'}}/>
          </div>
          <p style={{fontSize:12,color:'rgba(255,255,255,0.35)',lineHeight:1.6,margin:0}}>{roadmap.summary}</p>
        </div>

        {/* Controls */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <div style={{display:'flex',gap:4}}>
            {([['list','List',List],['calendar','Calendar',Calendar],['kanban','Board',LayoutGrid]] as const).map(([v,l,I])=>(
              <button key={v} onClick={()=>setView(v as View)} style={{display:'flex',alignItems:'center',gap:4,padding:'6px 12px',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',background:view===v?'rgba(170,130,220,0.1)':'transparent',border:view===v?'1px solid rgba(170,130,220,0.2)':'1px solid transparent',color:view===v?'rgba(170,130,220,0.8)':'rgba(255,255,255,0.3)'}}><I size={12}/>{l}</button>
            ))}
          </div>
          <button onClick={verify} disabled={verifying} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 14px',borderRadius:8,cursor:verifying?'not-allowed':'pointer',background:'rgba(100,200,130,0.08)',border:'1px solid rgba(100,200,130,0.15)',color:'rgba(100,200,130,0.8)',fontSize:11,fontWeight:700}}>
            {verifying?<Loader2 size={12} style={{animation:'spin 1s linear infinite'}}/>:<RefreshCw size={12}/>}{verifying?'Verifying...':'Sync GitHub'}
          </button>
        </div>

        {/* LIST VIEW */}
        {view === 'list' && roadmap.phases.map(phase=>(
          <div key={phase.id} style={{marginBottom:28}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
              <span style={{fontSize:14,fontWeight:800,color:'#fff'}}>{phase.name}</span>
              <span style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.2)'}}>Weeks {phase.weeks}</span>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {phase.tasks.map(task=>{
                const done = verified[task.id];
                const isManual = task.verifyType==='manual';
                return (
                  <div key={task.id} onClick={isManual?()=>manualVerify(task.id):undefined} style={{
                    padding:'16px 20px',borderRadius:16,cursor:isManual?'pointer':'default',transition:'all 0.2s',
                    background:done?'rgba(100,200,130,0.03)':'#0d0e0f',
                    border:done?'1px solid rgba(100,200,130,0.12)':'1px solid rgba(255,255,255,0.05)',
                  }}>
                    <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
                      <div style={{width:22,height:22,borderRadius:6,flexShrink:0,marginTop:1,display:'flex',alignItems:'center',justifyContent:'center',background:done?'rgba(100,200,130,0.15)':'rgba(255,255,255,0.04)',border:done?'1.5px solid rgba(100,200,130,0.4)':'1.5px solid rgba(255,255,255,0.08)'}}>
                        {done&&<CheckCircle2 size={14} color="rgba(100,200,130,0.8)"/>}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                          <span style={{fontSize:14,fontWeight:700,color:done?'rgba(100,200,130,0.5)':'rgba(255,255,255,0.8)',textDecoration:done?'line-through':'none'}}>{task.title}</span>
                          <div style={{display:'flex',gap:6,alignItems:'center'}}>
                            <span style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:4,background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.25)'}}>W{task.week} {task.day}</span>
                            <span style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:4,background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.25)'}}>{task.timeEstimate}</span>
                            <span style={{fontSize:9,fontWeight:800,padding:'2px 6px',borderRadius:4,background:done?'rgba(100,200,130,0.08)':'rgba(170,130,220,0.08)',color:done?'rgba(100,200,130,0.5)':'rgba(170,130,220,0.6)'}}>+{task.xp}XP</span>
                          </div>
                        </div>
                        <p style={{fontSize:12,color:'rgba(255,255,255,0.3)',margin:'0 0 6px',lineHeight:1.5}}>{task.description}</p>
                        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                          <span style={{fontSize:10,color:'rgba(255,255,255,0.15)',display:'flex',alignItems:'center',gap:3}}>
                            {done?<Shield size={10} color="rgba(100,200,130,0.5)"/>:<Shield size={10}/>}{task.verifyType==='manual'?'Manual confirm':task.verifyDescription}
                          </span>
                          {task.suggestedRepo&&<a href={`https://github.com/${task.suggestedRepo}`} target="_blank" rel="noopener noreferrer" style={{fontSize:10,fontWeight:600,color:'rgba(100,140,220,0.5)',textDecoration:'none',display:'flex',alignItems:'center',gap:3}} onClick={e=>e.stopPropagation()}><GitPullRequest size={9}/>{task.suggestedRepo}<ExternalLink size={8}/></a>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* CALENDAR VIEW */}
        {view === 'calendar' && (()=>{
          const weeks = new Map<number,Task[]>();
          allTasks.forEach(t=>{ if(!weeks.has(t.week))weeks.set(t.week,[]); weeks.get(t.week)!.push(t); });
          return Array.from(weeks.entries()).map(([w,tasks])=>(
            <div key={w} style={{marginBottom:20}}>
              <div style={{fontSize:12,fontWeight:800,color:'rgba(255,255,255,0.3)',marginBottom:10}}>Week {w}</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:8}}>
                {tasks.map(t=>{const done=verified[t.id];return(
                  <div key={t.id} onClick={t.verifyType==='manual'?()=>manualVerify(t.id):undefined} style={{padding:'14px',borderRadius:14,background:done?'rgba(100,200,130,0.03)':'#0d0e0f',border:done?'1px solid rgba(100,200,130,0.12)':'1px solid rgba(255,255,255,0.05)',cursor:t.verifyType==='manual'?'pointer':'default'}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                      <span style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.2)'}}>{t.day}</span>
                      <span style={{fontSize:9,fontWeight:800,color:done?'rgba(100,200,130,0.5)':'rgba(170,130,220,0.5)'}}>+{t.xp}XP</span>
                    </div>
                    <div style={{fontSize:12,fontWeight:700,color:done?'rgba(100,200,130,0.5)':'rgba(255,255,255,0.7)',textDecoration:done?'line-through':'none',marginBottom:4}}>{t.title}</div>
                    <div style={{fontSize:10,color:'rgba(255,255,255,0.2)'}}>{t.timeEstimate}</div>
                    {done&&<div style={{marginTop:6}}><CheckCircle2 size={14} color="rgba(100,200,130,0.6)"/></div>}
                  </div>
                );})}
              </div>
            </div>
          ));
        })()}

        {/* KANBAN VIEW */}
        {view === 'kanban' && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            {[{label:'To Do',items:allTasks.filter(t=>!verified[t.id]),c:'rgba(255,255,255,0.3)'},{label:'Done',items:allTasks.filter(t=>verified[t.id]),c:'rgba(100,200,130,0.6)'}].map(col=>(
              <div key={col.label}>
                <div style={{fontSize:12,fontWeight:800,color:col.c,marginBottom:12,display:'flex',alignItems:'center',gap:6}}>{col.label}<span style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.15)'}}>{col.items.length}</span></div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {col.items.map(t=>(
                    <div key={t.id} onClick={t.verifyType==='manual'?()=>manualVerify(t.id):undefined} style={{padding:'12px 14px',borderRadius:12,background:'#0d0e0f',border:'1px solid rgba(255,255,255,0.05)',cursor:t.verifyType==='manual'?'pointer':'default'}}>
                      <div style={{fontSize:12,fontWeight:700,color:verified[t.id]?'rgba(100,200,130,0.5)':'rgba(255,255,255,0.7)',textDecoration:verified[t.id]?'line-through':'none',marginBottom:4}}>{t.title}</div>
                      <div style={{display:'flex',gap:6}}><span style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.2)'}}>W{t.week}</span><span style={{fontSize:9,fontWeight:700,color:'rgba(170,130,220,0.5)'}}>+{t.xp}XP</span></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Suggested Repos */}
        {roadmap.suggestedRepos?.length>0&&(
          <div style={{marginTop:32}}>
            <div style={{fontSize:10,fontWeight:800,color:'rgba(255,255,255,0.2)',letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:12}}>AI-Recommended Repos for You</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:10}}>
              {roadmap.suggestedRepos.map(r=>(
                <a key={r.name} href={`https://github.com/${r.name}`} target="_blank" rel="noopener noreferrer" style={{display:'block',padding:'14px 18px',borderRadius:14,background:'#0d0e0f',border:'1px solid rgba(255,255,255,0.05)',textDecoration:'none',transition:'border-color 0.2s'}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(100,140,220,0.2)'}
                  onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(255,255,255,0.05)'}
                >
                  <div style={{fontSize:13,fontWeight:700,color:'rgba(100,140,220,0.7)',marginBottom:4,display:'flex',alignItems:'center',gap:4}}><GitPullRequest size={12}/>{r.name}<ExternalLink size={10} style={{opacity:0.4}}/></div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.3)',lineHeight:1.5}}>{r.why}</div>
                  <div style={{display:'flex',gap:6,marginTop:8}}>
                    <span style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:4,background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.3)'}}>{r.difficulty}</span>
                    {r.goodFirstIssues&&<span style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:4,background:'rgba(100,200,130,0.08)',color:'rgba(100,200,130,0.6)'}}>good first issues</span>}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Milestones */}
        {roadmap.milestones?.length>0&&(
          <div style={{marginTop:28}}>
            <div style={{fontSize:10,fontWeight:800,color:'rgba(255,255,255,0.2)',letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:12}}>Milestones</div>
            <div style={{display:'flex',gap:10,overflowX:'auto',paddingBottom:8}}>
              {roadmap.milestones.map((m,i)=>(
                <div key={i} style={{padding:'14px 18px',borderRadius:14,background:'rgba(220,180,80,0.03)',border:'1px solid rgba(220,180,80,0.08)',minWidth:180,flexShrink:0}}>
                  <div style={{fontSize:16,marginBottom:4}}>{m.badge}</div>
                  <div style={{fontSize:12,fontWeight:700,color:'#fff',marginBottom:2}}>{m.title}</div>
                  <div style={{fontSize:10,color:'rgba(255,255,255,0.25)'}}>Week {m.week} · {m.requirement}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <style jsx global>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

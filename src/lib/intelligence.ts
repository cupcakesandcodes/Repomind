export type Difficulty = 'Easy' | 'Medium' | 'Hard';

interface DifficultySignals {
  repoStars: number;
  fileCount?: number;
  issueLabels: string[];
  repoLanguage: string;
}

export function estimateDifficulty(signals: DifficultySignals): Difficulty {
  const { repoStars, fileCount, issueLabels, repoLanguage } = signals;
  
  let score = 0;

  // 1. Label Signals (Strongest)
  const easyLabels = ['good first issue', 'easy', 'beginner', 'documentation', 'low hanging fruit'];
  const hardLabels = ['complex', 'architecture', 'performance', 'security', 'critical'];
  
  if (issueLabels.some(l => easyLabels.includes(l.toLowerCase()))) return 'Easy';
  if (issueLabels.some(l => hardLabels.includes(l.toLowerCase()))) return 'Hard';

  // 2. Repo Scale
  if (repoStars > 10000) score += 2; // Large repos are usually more complex
  else if (repoStars > 1000) score += 1;

  if (fileCount && fileCount > 500) score += 2;
  else if (fileCount && fileCount > 100) score += 1;

  // 3. Language complexity (Subjective but useful)
  const complexLangs = ['C++', 'Rust', 'C', 'Assembly', 'Go'];
  if (complexLangs.includes(repoLanguage)) score += 1;

  if (score <= 1) return 'Easy';
  if (score <= 3) return 'Medium';
  return 'Hard';
}

export function calculateMatchScore(userStack: string[], issueLabels: string[], repoLanguage: string): number {
  let score = 50; // Base score

  // Language match
  if (userStack.includes(repoLanguage)) score += 30;

  // Keyword match in labels
  const labelMatches = issueLabels.filter(label => 
    userStack.some(skill => label.toLowerCase().includes(skill.toLowerCase()))
  );
  score += labelMatches.length * 5;

  return Math.min(score, 100);
}

/**
 * Scoring rubrics for session evaluation.
 * Ported from mcp-server/src/scoring.ts
 */

export interface ScoreResult {
  score: number
  grade: string
  breakdown: Record<string, { value: number; weight: number; contribution: number }>
  explanation: string
}

export interface SessionData {
  goals?: string[]
  accomplishments?: string[]
  blockers?: string[]
  moodStart?: string
  moodEnd?: string
  durationMinutes?: number
  thoughtCount?: number
  decisionCount?: number
  insightCount?: number
  errorCount?: number
  successRate?: number
}

const GRADE_THRESHOLDS = { excellent: 80, good: 60, fair: 40, poor: 0 }

function getGrade(score: number): string {
  if (score >= GRADE_THRESHOLDS.excellent) return 'excellent'
  if (score >= GRADE_THRESHOLDS.good) return 'good'
  if (score >= GRADE_THRESHOLDS.fair) return 'fair'
  return 'poor'
}

export function scoreProductivity(data: SessionData): ScoreResult {
  const breakdown: ScoreResult['breakdown'] = {}
  const goalsSet = data.goals?.length || 0
  const goalsAchieved = data.accomplishments?.length || 0
  const goalsValue = goalsSet > 0 ? Math.min((goalsAchieved / goalsSet) * 100, 100) : 50
  breakdown.goals_achieved = { value: goalsValue, weight: 0.4, contribution: goalsValue * 0.4 }

  const decisionsValue = Math.min((data.decisionCount || 0) / 2, 1) * 100
  breakdown.decisions_made = { value: decisionsValue, weight: 0.2, contribution: decisionsValue * 0.2 }

  const insightsValue = Math.min((data.insightCount || 0) / 1, 1) * 100
  breakdown.insights_generated = { value: insightsValue, weight: 0.2, contribution: insightsValue * 0.2 }

  const blockersCount = data.blockers?.length || 0
  const blockersValue = blockersCount === 0 ? 80 :
    goalsAchieved > blockersCount ? 100 :
    Math.max(0, (1 - blockersCount / Math.max(goalsSet, 1)) * 100)
  breakdown.blockers_resolved = { value: blockersValue, weight: 0.2, contribution: blockersValue * 0.2 }

  const score = Math.round(Object.values(breakdown).reduce((sum, b) => sum + b.contribution, 0))
  return {
    score, grade: getGrade(score), breakdown,
    explanation: `Productivity ${score}/100: ${goalsAchieved}/${goalsSet} goals achieved, ${data.decisionCount || 0} decisions, ${data.insightCount || 0} insights, ${blockersCount} blockers`,
  }
}

export function scoreSentiment(data: SessionData): ScoreResult {
  const breakdown: ScoreResult['breakdown'] = {}
  const moodValues: Record<string, number> = {
    excited: 5, productive: 5, successful: 5,
    focused: 4, exploratory: 4, satisfied: 4,
    neutral: 3, partial: 3,
    confused: 2, debugging: 2, urgent: 2,
    blocked: 1, frustrated: 1,
  }

  const startMood = moodValues[data.moodStart || 'neutral'] || 3
  const endMood = moodValues[data.moodEnd || 'neutral'] || 3
  const moodDelta = endMood - startMood
  const moodValue = moodDelta > 0 ? 100 : moodDelta === 0 ? 60 : 20
  breakdown.mood_improvement = { value: moodValue, weight: 0.3, contribution: moodValue * 0.3 }

  const endMoodValue = endMood >= 4 ? 100 : endMood >= 3 ? 60 : 20
  breakdown.positive_end_mood = { value: endMoodValue, weight: 0.3, contribution: endMoodValue * 0.3 }

  const frustrationValue = (data.errorCount || 0) === 0 ? 100 : Math.max(0, 100 - (data.errorCount || 0) * 20)
  breakdown.frustration_absence = { value: frustrationValue, weight: 0.2, contribution: frustrationValue * 0.2 }

  const dur = data.durationMinutes || 30
  const durationValue = dur >= 15 && dur <= 120 ? 100 : dur < 15 ? (dur / 15) * 100 : Math.max(0, 100 - (dur - 120) / 2)
  breakdown.duration_satisfaction = { value: Math.round(durationValue), weight: 0.2, contribution: Math.round(durationValue) * 0.2 }

  const score = Math.round(Object.values(breakdown).reduce((sum, b) => sum + b.contribution, 0))
  return {
    score, grade: getGrade(score), breakdown,
    explanation: `Sentiment ${score}/100: mood ${data.moodStart || '?'} → ${data.moodEnd || '?'}, ${data.errorCount || 0} errors, ${dur}min duration`,
  }
}

export function scoreFlow(data: SessionData): ScoreResult {
  const breakdown: ScoreResult['breakdown'] = {}

  const successValue = (data.successRate ?? 0.8) * 100
  breakdown.success_rate = { value: Math.round(successValue), weight: 0.3, contribution: Math.round(successValue) * 0.3 }

  const errorValue = (data.errorCount || 0) === 0 ? 100 : Math.max(0, 100 - (data.errorCount || 0) * 15)
  breakdown.error_absence = { value: errorValue, weight: 0.2, contribution: errorValue * 0.2 }

  const blockerCount = data.blockers?.length || 0
  const blockerValue = blockerCount === 0 ? 100 : Math.max(0, 100 - blockerCount * 25)
  breakdown.blocker_absence = { value: blockerValue, weight: 0.2, contribution: blockerValue * 0.2 }

  const dur = data.durationMinutes || 30
  const flowDuration = dur >= 30 && dur <= 90 ? 100 : dur < 30 ? (dur / 30) * 100 : Math.max(0, 100 - (dur - 90) / 3)
  breakdown.session_duration = { value: Math.round(flowDuration), weight: 0.15, contribution: Math.round(flowDuration) * 0.15 }

  const thoughtRate = dur > 0 ? ((data.thoughtCount || 0) / (dur / 30)) : 0
  const focusValue = thoughtRate >= 1 ? 100 : thoughtRate * 100
  breakdown.focus_continuity = { value: Math.round(focusValue), weight: 0.15, contribution: Math.round(focusValue) * 0.15 }

  const score = Math.round(Object.values(breakdown).reduce((sum, b) => sum + b.contribution, 0))
  return {
    score, grade: getGrade(score), breakdown,
    explanation: `Flow ${score}/100: ${Math.round((data.successRate ?? 0.8) * 100)}% success, ${data.errorCount || 0} errors, ${blockerCount} blockers, ${dur}min duration`,
  }
}

export function scoreSession(data: SessionData) {
  const productivity = scoreProductivity(data)
  const sentiment = scoreSentiment(data)
  const flow = scoreFlow(data)
  const overall = Math.round(productivity.score * 0.4 + sentiment.score * 0.3 + flow.score * 0.3)
  return { overall, overallGrade: getGrade(overall), productivity, sentiment, flow }
}

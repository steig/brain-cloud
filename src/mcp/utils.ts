/**
 * Time period parser and date formatting utilities.
 * Ported from mcp-server/src/utils.ts
 */

export function parsePeriod(period: string): { fromDate: Date; toDate: Date; periodLabel: string } {
  const now = new Date()
  const toDate = new Date(now)
  let fromDate = new Date(now)
  let periodLabel = period

  const periodLower = period.toLowerCase().trim()

  const numericMatch = periodLower.match(/^(\d+)$/)
  if (numericMatch) {
    const days = parseInt(numericMatch[1], 10)
    fromDate.setDate(fromDate.getDate() - days)
    periodLabel = `Last ${days} days`
    return { fromDate, toDate, periodLabel }
  }

  const daysMatch = periodLower.match(/(\d+)\s*days?/)
  if (daysMatch) {
    const days = parseInt(daysMatch[1], 10)
    fromDate.setDate(fromDate.getDate() - days)
    periodLabel = `Last ${days} days`
    return { fromDate, toDate, periodLabel }
  }

  const weeksMatch = periodLower.match(/(\d+)\s*weeks?/)
  if (weeksMatch) {
    const weeks = parseInt(weeksMatch[1], 10)
    fromDate.setDate(fromDate.getDate() - weeks * 7)
    periodLabel = `Last ${weeks} week${weeks > 1 ? 's' : ''}`
    return { fromDate, toDate, periodLabel }
  }

  const monthsMatch = periodLower.match(/(\d+)\s*months?/)
  if (monthsMatch) {
    const months = parseInt(monthsMatch[1], 10)
    fromDate.setMonth(fromDate.getMonth() - months)
    periodLabel = `Last ${months} month${months > 1 ? 's' : ''}`
    return { fromDate, toDate, periodLabel }
  }

  if (periodLower.includes('today')) {
    fromDate.setHours(0, 0, 0, 0)
    periodLabel = 'Today'
  } else if (periodLower.includes('yesterday')) {
    fromDate.setDate(fromDate.getDate() - 1)
    fromDate.setHours(0, 0, 0, 0)
    toDate.setDate(toDate.getDate() - 1)
    toDate.setHours(23, 59, 59, 999)
    periodLabel = 'Yesterday'
  } else if (periodLower.includes('this week')) {
    const dayOfWeek = fromDate.getDay()
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    fromDate.setDate(fromDate.getDate() - diff)
    fromDate.setHours(0, 0, 0, 0)
    periodLabel = 'This week'
  } else if (periodLower.includes('last week')) {
    const dayOfWeek = fromDate.getDay()
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    fromDate.setDate(fromDate.getDate() - diff - 7)
    fromDate.setHours(0, 0, 0, 0)
    toDate.setDate(toDate.getDate() - diff - 1)
    toDate.setHours(23, 59, 59, 999)
    periodLabel = 'Last week'
  } else if (periodLower.includes('this month')) {
    fromDate.setDate(1)
    fromDate.setHours(0, 0, 0, 0)
    periodLabel = 'This month'
  } else if (periodLower.includes('last month')) {
    fromDate.setMonth(fromDate.getMonth() - 1)
    fromDate.setDate(1)
    fromDate.setHours(0, 0, 0, 0)
    toDate.setDate(0)
    toDate.setHours(23, 59, 59, 999)
    periodLabel = 'Last month'
  } else if (periodLower.includes('this year')) {
    fromDate.setMonth(0, 1)
    fromDate.setHours(0, 0, 0, 0)
    periodLabel = 'This year'
  } else if (periodLower.includes('last year')) {
    fromDate.setFullYear(fromDate.getFullYear() - 1, 0, 1)
    fromDate.setHours(0, 0, 0, 0)
    toDate.setFullYear(toDate.getFullYear() - 1, 11, 31)
    toDate.setHours(23, 59, 59, 999)
    periodLabel = 'Last year'
  } else if (periodLower.includes('all time') || periodLower.includes('all')) {
    fromDate = new Date(0)
    periodLabel = 'All time'
  } else {
    fromDate.setDate(fromDate.getDate() - 30)
    periodLabel = 'Last 30 days'
  }

  return { fromDate, toDate, periodLabel }
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

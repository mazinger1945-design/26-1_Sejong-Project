import type { TimetableItem } from '@/types'

export const ANALYSIS_DAYS = ['월', '화', '수', '목', '금'] as const
export type AnalysisDay = (typeof ANALYSIS_DAYS)[number]

export const SLOT_MINUTES = 30
export const SLOT_START_HOUR = 9
export const SLOT_END_HOUR = 18
export const SLOTS_PER_DAY = ((SLOT_END_HOUR - SLOT_START_HOUR) * 60) / SLOT_MINUTES

export interface CommonFreeTime {
  day: AnalysisDay
  start: string
  end: string
  durationMinutes: number
  type: 'team' | 'lunch' | 'free' | 'short'
  label: string
}

const FREE_TYPE_PRIORITY: Record<CommonFreeTime['type'], number> = {
  team: 0,
  lunch: 1,
  free: 2,
  short: 3,
}

const TYPE_LABEL: Record<CommonFreeTime['type'], string> = {
  team: '팀플 가능',
  lunch: '점심 가능',
  free: '같이 공강',
  short: '짧은 빈 시간',
}

export function parseTime(time: string): number {
  if (!time) return 0
  const [h, m = 0] = time.split(':').map((v) => Number(v))
  return h * 60 + m
}

export function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function slotIndex(minutes: number): number {
  return Math.floor((minutes - SLOT_START_HOUR * 60) / SLOT_MINUTES)
}

export function buildBusyMask(items: TimetableItem[] | undefined | null): boolean[][] {
  const mask: boolean[][] = ANALYSIS_DAYS.map(() => new Array(SLOTS_PER_DAY).fill(false))
  if (!items) return mask
  for (const item of items) {
    const dayIdx = ANALYSIS_DAYS.indexOf(item.day as AnalysisDay)
    if (dayIdx === -1) continue
    const startMin = parseTime(item.start)
    const endMin = parseTime(item.end)
    if (!(endMin > startMin)) continue
    const startSlot = Math.max(0, slotIndex(startMin))
    const endSlot = Math.min(SLOTS_PER_DAY, Math.ceil((endMin - SLOT_START_HOUR * 60) / SLOT_MINUTES))
    for (let s = startSlot; s < endSlot; s++) mask[dayIdx][s] = true
  }
  return mask
}

export function intersectMasks(masks: boolean[][][]): boolean[][] {
  const result: boolean[][] = ANALYSIS_DAYS.map(() => new Array(SLOTS_PER_DAY).fill(true))
  if (masks.length === 0) {
    return ANALYSIS_DAYS.map(() => new Array(SLOTS_PER_DAY).fill(false))
  }
  for (let d = 0; d < ANALYSIS_DAYS.length; d++) {
    for (let s = 0; s < SLOTS_PER_DAY; s++) {
      let allFree = true
      for (const mask of masks) {
        if (mask[d][s]) {
          allFree = false
          break
        }
      }
      result[d][s] = allFree
    }
  }
  return result
}

function classify(durationMinutes: number, startMin: number, endMin: number): CommonFreeTime['type'] {
  if (durationMinutes >= 120) return 'free'
  if (durationMinutes >= 90) return 'team'
  const lunchStart = 11 * 60 + 30
  const lunchEnd = 14 * 60
  const overlapsLunch = endMin > lunchStart && startMin < lunchEnd
  if (overlapsLunch && durationMinutes >= 30) return 'lunch'
  if (durationMinutes >= 30) return 'short'
  return 'short'
}

export function findCommonFreeTimes(freeMask: boolean[][]): CommonFreeTime[] {
  const result: CommonFreeTime[] = []
  for (let d = 0; d < ANALYSIS_DAYS.length; d++) {
    let s = 0
    while (s < SLOTS_PER_DAY) {
      if (!freeMask[d][s]) {
        s++
        continue
      }
      let e = s
      while (e < SLOTS_PER_DAY && freeMask[d][e]) e++
      const startMin = SLOT_START_HOUR * 60 + s * SLOT_MINUTES
      const endMin = SLOT_START_HOUR * 60 + e * SLOT_MINUTES
      const duration = endMin - startMin
      const type = classify(duration, startMin, endMin)
      result.push({
        day: ANALYSIS_DAYS[d],
        start: minutesToTimeString(startMin),
        end: minutesToTimeString(endMin),
        durationMinutes: duration,
        type,
        label: TYPE_LABEL[type],
      })
      s = e
    }
  }
  return result
}

export function sortFreeTimes(items: CommonFreeTime[]): CommonFreeTime[] {
  const dayOrder = (d: AnalysisDay) => ANALYSIS_DAYS.indexOf(d)
  return [...items].sort((a, b) => {
    const pa = FREE_TYPE_PRIORITY[a.type]
    const pb = FREE_TYPE_PRIORITY[b.type]
    if (pa !== pb) return pa - pb
    if (a.day !== b.day) return dayOrder(a.day) - dayOrder(b.day)
    return parseTime(a.start) - parseTime(b.start)
  })
}

export function hasConflict(
  busyMask: boolean[][],
  day: string,
  start: string,
  end: string
): boolean {
  const dayIdx = ANALYSIS_DAYS.indexOf(day as AnalysisDay)
  if (dayIdx === -1) return false
  const startMin = parseTime(start)
  const endMin = parseTime(end)
  if (!(endMin > startMin)) return false
  const startSlot = Math.max(0, slotIndex(startMin))
  const endSlot = Math.min(SLOTS_PER_DAY, Math.ceil((endMin - SLOT_START_HOUR * 60) / SLOT_MINUTES))
  for (let s = startSlot; s < endSlot; s++) {
    if (busyMask[dayIdx][s]) return true
  }
  return false
}

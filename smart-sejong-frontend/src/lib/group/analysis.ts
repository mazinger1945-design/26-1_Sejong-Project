import type { GroupMember, TimetableItem } from '@/types'
import {
  ANALYSIS_DAYS,
  SLOT_MINUTES,
  SLOTS_PER_DAY,
  buildAvailabilitySlots,
  buildBusyMask,
  findCommonFreeTimes,
  hasConflict,
  intersectMasks,
  sortFreeTimes,
  type CommonAvailabilitySlot,
  type CommonFreeTime,
} from './time'

export interface MemberShareInfo {
  member: GroupMember
  hasShared: boolean
  busyMask: boolean[][]
  sectionItems: TimetableItem[]
}

export interface SharedCourse {
  key: string
  courseId?: number
  courseCode?: string
  name: string
  members: { userId: number; nickname: string; sectionNumber?: string; professor?: string }[]
}

export interface MemberMatch {
  userId: number
  nickname: string
  hasShared: boolean
  score: number
  sameSectionCount: number
  sameCourseDifferentSectionCount: number
  commonFreeMinutes: number
  busyOverlapSlots: number
}

export interface RecommendableCourse {
  sectionId: number
  courseId?: number
  courseCode?: string
  name: string
  day: string
  start: string
  end: string
  professor?: string
  sectionNumber?: string
  ownerNickname: string
}

export interface GroupAnalysis {
  members: MemberShareInfo[]
  sharedMembers: MemberShareInfo[]
  unsharedMembers: GroupMember[]
  commonFree: CommonFreeTime[]
  availabilitySlots: CommonAvailabilitySlot[][]
  sharedCourses: SharedCourse[]
  sameCourseDifferentSection: SharedCourse[]
  recommendableCourses: RecommendableCourse[]
  memberMatches: MemberMatch[]
  groupScore: number | null
  canAnalyze: boolean
}

function sectionKey(item: TimetableItem): string | null {
  if (item.type !== 'section') return null
  if (item.course_id != null) return `course:${item.course_id}`
  if (item.course_code) return `code:${item.course_code}`
  return `name:${item.name}`
}

function exactSectionKey(item: TimetableItem): string | null {
  if (item.type !== 'section') return null
  if (item.section_id != null) return `section:${item.section_id}`
  return null
}

function countOverlapSlots(a: boolean[][], b: boolean[][]): number {
  let count = 0
  for (let d = 0; d < ANALYSIS_DAYS.length; d++) {
    for (let s = 0; s < SLOTS_PER_DAY; s++) {
      if (a[d][s] && b[d][s]) count++
    }
  }
  return count
}

function pairCommonFreeMinutes(a: boolean[][], b: boolean[][]): number {
  const intersect = intersectMasks([a, b])
  let free = 0
  for (let d = 0; d < ANALYSIS_DAYS.length; d++) {
    for (let s = 0; s < SLOTS_PER_DAY; s++) {
      if (intersect[d][s]) free += SLOT_MINUTES
    }
  }
  return free
}

function computePairwiseMatch(
  a: MemberShareInfo,
  b: MemberShareInfo,
): { sameSection: number; sameCourseDifferent: number; commonFree: number; busyOverlap: number } {
  const aSections = new Map<string, TimetableItem>()
  const bSections = new Map<string, TimetableItem>()
  for (const it of a.sectionItems) {
    const ex = exactSectionKey(it)
    if (ex) aSections.set(ex, it)
  }
  for (const it of b.sectionItems) {
    const ex = exactSectionKey(it)
    if (ex) bSections.set(ex, it)
  }
  let sameSection = 0
  for (const k of aSections.keys()) if (bSections.has(k)) sameSection++

  const aCourse = new Set<string>()
  const bCourse = new Set<string>()
  for (const it of a.sectionItems) {
    const k = sectionKey(it)
    if (k) aCourse.add(k)
  }
  for (const it of b.sectionItems) {
    const k = sectionKey(it)
    if (k) bCourse.add(k)
  }
  let courseShared = 0
  for (const k of aCourse) if (bCourse.has(k)) courseShared++
  const sameCourseDifferent = Math.max(0, courseShared - sameSection)

  const commonFree = pairCommonFreeMinutes(a.busyMask, b.busyMask)
  const busyOverlap = countOverlapSlots(a.busyMask, b.busyMask)
  return { sameSection, sameCourseDifferent, commonFree, busyOverlap }
}

function computeMatchScore(
  pair: { sameSection: number; sameCourseDifferent: number; commonFree: number; busyOverlap: number },
  pairFree: CommonFreeTime[],
): number {
  const sameSectionScore = Math.min(30, pair.sameSection * 10)
  const sameCourseDifferentScore = Math.min(15, pair.sameCourseDifferent * 5)
  const commonFreeScore = Math.min(30, (pair.commonFree / 30) * 2)
  const busyOverlapScore = Math.max(0, 15 - pair.busyOverlap * 1)
  const lunchCount = pairFree.filter((f) => f.type === 'lunch').length
  const teamCount = pairFree.filter((f) => f.type === 'team').length
  const specialBonus = Math.min(10, lunchCount * 3 + teamCount * 5)
  const total = sameSectionScore + sameCourseDifferentScore + commonFreeScore + busyOverlapScore + specialBonus
  return Math.round(Math.max(0, Math.min(100, total)))
}

function findPairFree(a: boolean[][], b: boolean[][]): CommonFreeTime[] {
  const intersect = intersectMasks([a, b])
  return findCommonFreeTimes(intersect)
}

function buildSharedCourseGroups(shared: MemberShareInfo[]): {
  exactlyShared: SharedCourse[]
  sameCourseDifferentSection: SharedCourse[]
} {
  type Bucket = {
    key: string
    courseId?: number
    courseCode?: string
    name: string
    bySection: Map<string, { sectionId?: number; sectionNumber?: string; professor?: string; members: SharedCourse['members'] }>
  }
  const buckets = new Map<string, Bucket>()

  for (const info of shared) {
    for (const it of info.sectionItems) {
      const courseKey = sectionKey(it)
      if (!courseKey) continue
      let bucket = buckets.get(courseKey)
      if (!bucket) {
        bucket = {
          key: courseKey,
          courseId: it.course_id,
          courseCode: it.course_code,
          name: it.name,
          bySection: new Map(),
        }
        buckets.set(courseKey, bucket)
      }
      const sectionId = it.section_id != null ? `s:${it.section_id}` : `n:${it.section_number ?? it.professor ?? 'unknown'}`
      let group = bucket.bySection.get(sectionId)
      if (!group) {
        group = {
          sectionId: it.section_id,
          sectionNumber: it.section_number,
          professor: it.professor,
          members: [],
        }
        bucket.bySection.set(sectionId, group)
      }
      if (!group.members.some((m) => m.userId === info.member.user_id)) {
        group.members.push({
          userId: info.member.user_id,
          nickname: info.member.nickname,
          sectionNumber: it.section_number,
          professor: it.professor,
        })
      }
    }
  }

  const exactlyShared: SharedCourse[] = []
  const sameCourseDifferentSection: SharedCourse[] = []

  for (const bucket of buckets.values()) {
    const sectionGroups = Array.from(bucket.bySection.values())
    const totalMembers = new Set<number>()
    for (const sg of sectionGroups) for (const m of sg.members) totalMembers.add(m.userId)
    if (totalMembers.size < 2) continue

    const fullyShared = sectionGroups.find((sg) => sg.members.length === totalMembers.size && totalMembers.size >= 2)
    if (fullyShared && sectionGroups.length === 1) {
      exactlyShared.push({
        key: bucket.key,
        courseId: bucket.courseId,
        courseCode: bucket.courseCode,
        name: bucket.name,
        members: fullyShared.members,
      })
      continue
    }
    const merged: SharedCourse['members'] = []
    for (const sg of sectionGroups) {
      for (const m of sg.members) {
        if (!merged.some((x) => x.userId === m.userId)) merged.push(m)
      }
    }
    sameCourseDifferentSection.push({
      key: bucket.key,
      courseId: bucket.courseId,
      courseCode: bucket.courseCode,
      name: bucket.name,
      members: merged,
    })
  }

  return { exactlyShared, sameCourseDifferentSection }
}

function buildRecommendable(
  meBusyMask: boolean[][],
  meSectionKeys: Set<string>,
  shared: MemberShareInfo[],
  meUserId?: number,
): RecommendableCourse[] {
  const seenSectionId = new Set<number>()
  const result: RecommendableCourse[] = []
  for (const info of shared) {
    if (meUserId != null && info.member.user_id === meUserId) continue
    for (const it of info.sectionItems) {
      if (it.section_id == null) continue
      const courseKey = sectionKey(it)
      if (courseKey && meSectionKeys.has(courseKey)) continue
      if (seenSectionId.has(it.section_id)) continue
      if (hasConflict(meBusyMask, it.day, it.start, it.end)) continue
      seenSectionId.add(it.section_id)
      result.push({
        sectionId: it.section_id,
        courseId: it.course_id,
        courseCode: it.course_code,
        name: it.name,
        day: it.day,
        start: it.start,
        end: it.end,
        professor: it.professor,
        sectionNumber: it.section_number,
        ownerNickname: info.member.nickname,
      })
    }
  }
  return result
}

export function analyzeGroup(members: GroupMember[], meUserId?: number): GroupAnalysis {
  const memberInfos: MemberShareInfo[] = members.map((m) => {
    const items = m.timetable ?? []
    const hasShared = items.length > 0 && m.active_timetable_id != null
    const sectionItems = items.filter((it) => it.type === 'section')
    return {
      member: m,
      hasShared,
      busyMask: buildBusyMask(items),
      sectionItems,
    }
  })

  const sharedMembers = memberInfos.filter((m) => m.hasShared)
  const unsharedMembers = memberInfos.filter((m) => !m.hasShared).map((m) => m.member)

  const canAnalyze = sharedMembers.length >= 2

  const intersectFree = canAnalyze
    ? intersectMasks(sharedMembers.map((m) => m.busyMask))
    : ANALYSIS_DAYS.map(() => new Array(SLOTS_PER_DAY).fill(false))
  const commonFreeRaw = canAnalyze ? findCommonFreeTimes(intersectFree) : []
  const commonFree = sortFreeTimes(commonFreeRaw)
  const availabilitySlots = canAnalyze
    ? buildAvailabilitySlots(sharedMembers.map((info) => ({
        userId: info.member.user_id,
        nickname: info.member.nickname,
        busyMask: info.busyMask,
      })))
    : ANALYSIS_DAYS.map(() => [])

  const { exactlyShared, sameCourseDifferentSection } = buildSharedCourseGroups(sharedMembers)

  const me = memberInfos.find((m) => m.member.user_id === meUserId)
  const meSectionKeys = new Set<string>()
  if (me) {
    for (const it of me.sectionItems) {
      const k = sectionKey(it)
      if (k) meSectionKeys.add(k)
    }
  }
  const recommendableCourses = me && me.hasShared
    ? buildRecommendable(me.busyMask, meSectionKeys, sharedMembers, meUserId)
    : []

  const memberMatches: MemberMatch[] = []
  if (me && me.hasShared) {
    for (const other of sharedMembers) {
      if (other.member.user_id === me.member.user_id) continue
      const pair = computePairwiseMatch(me, other)
      const pairFree = findPairFree(me.busyMask, other.busyMask)
      const score = computeMatchScore(pair, pairFree)
      memberMatches.push({
        userId: other.member.user_id,
        nickname: other.member.nickname,
        hasShared: true,
        score,
        sameSectionCount: pair.sameSection,
        sameCourseDifferentSectionCount: pair.sameCourseDifferent,
        commonFreeMinutes: pair.commonFree,
        busyOverlapSlots: pair.busyOverlap,
      })
    }
  }
  for (const info of memberInfos) {
    if (info.member.user_id === meUserId) continue
    if (memberMatches.some((mm) => mm.userId === info.member.user_id)) continue
    memberMatches.push({
      userId: info.member.user_id,
      nickname: info.member.nickname,
      hasShared: info.hasShared,
      score: 0,
      sameSectionCount: 0,
      sameCourseDifferentSectionCount: 0,
      commonFreeMinutes: 0,
      busyOverlapSlots: 0,
    })
  }

  let groupScore: number | null = null
  if (canAnalyze) {
    const allPairs: number[] = []
    for (let i = 0; i < sharedMembers.length; i++) {
      for (let j = i + 1; j < sharedMembers.length; j++) {
        const a = sharedMembers[i]
        const b = sharedMembers[j]
        const pair = computePairwiseMatch(a, b)
        const pairFree = findPairFree(a.busyMask, b.busyMask)
        allPairs.push(computeMatchScore(pair, pairFree))
      }
    }
    if (allPairs.length > 0) {
      groupScore = Math.round(allPairs.reduce((s, v) => s + v, 0) / allPairs.length)
    }
  }

  return {
    members: memberInfos,
    sharedMembers,
    unsharedMembers,
    commonFree,
    availabilitySlots,
    sharedCourses: exactlyShared,
    sameCourseDifferentSection,
    recommendableCourses,
    memberMatches,
    groupScore,
    canAnalyze,
  }
}

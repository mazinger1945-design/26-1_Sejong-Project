/**
 * 전공 판정 로직
 *
 * [기본 원칙]
 * 1. 인공지능융합대학 / 소프트웨어융합대학 소속 전공 과목만 후보가 될 수 있음
 * 2. 사용자 학과와 동일한 전공 그룹일 때만 전공 과목으로 인정
 * 3. 다른 학과/그룹의 전공 과목은 "내 전공"으로 세지 않음
 * 4. 로그인 정보가 없으면 전공 필터를 적용하지 않음
 */

export type MajorStatus = '전공필수' | '전공선택' | '전공 아님'

type DeptGroup = {
  key: string
  aliases: readonly string[]
}

const TARGET_COLLEGES = new Set([
  normalizeAcademicUnitName('인공지능융합대학'),
  normalizeAcademicUnitName('소프트웨어융합대학'),
])

const DEPT_GROUPS: readonly DeptGroup[] = [
  {
    key: 'robotics',
    aliases: [
      'AI로봇학과',
      '국방AI로봇융합공학과',
      '글로벌AI로봇융합공학과',
      '국방AI융합시스템공학과',
      '지능기전공학과',
      '지능IoT학과',
      '스마트기기공학전공',
      '무인이동체공학과',
    ],
  },
  {
    key: 'electronics',
    aliases: [
      'AI융합전자공학과',
      '전자정보통신공학과',
      '반도체시스템공학과',
      '양자지능정보학과',
      '전자지능정보학과',
    ],
  },
  {
    key: 'ai-data',
    aliases: [
      '인공지능데이터사이언스학과',
      '인공지능학과',
      '데이터사이언스학과',
      '지능정보융합학과',
    ],
  },
  {
    key: 'software',
    aliases: [
      '소프트웨어학과',
      '콘텐츠소프트웨어학과',
      '컴퓨터공학과',
      '정보보호학과',
      '사이버국방학과',
    ],
  },
]

const CREATIVE_SOFT_GROUP_KEY = 'creative-soft'

const DEPT_TO_GROUP_KEY = new Map<string, string>()
for (const group of DEPT_GROUPS) {
  for (const alias of group.aliases) {
    for (const lookupKey of buildLookupKeys(alias)) {
      DEPT_TO_GROUP_KEY.set(lookupKey, group.key)
    }
  }
}

export function normalizeAcademicUnitName(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[()]/g, '')
}

function buildLookupKeys(value: string | null | undefined): string[] {
  const normalized = normalizeAcademicUnitName(value)
  if (!normalized) return []

  const keys = new Set<string>([normalized])
  let current = normalized

  while (true) {
    const stripped = current.replace(/(학과|전공)$/u, '')
    if (!stripped || stripped === current) {
      break
    }
    keys.add(stripped)
    current = stripped
  }

  return [...keys]
}

export function hasMajorClassificationContext(userMajor: string | null | undefined): boolean {
  return normalizeAcademicUnitName(userMajor).length > 0
}

function isTargetCollege(college: string): boolean {
  return TARGET_COLLEGES.has(normalizeAcademicUnitName(college))
}

function getDeptGroupKey(dept: string): string | null {
  const lookupKeys = buildLookupKeys(dept)
  if (lookupKeys.length === 0) return null

  for (const key of lookupKeys) {
    if (
      key === normalizeAcademicUnitName('창의소프트학부') ||
      key.startsWith(normalizeAcademicUnitName('창의소프트학부'))
    ) {
      return CREATIVE_SOFT_GROUP_KEY
    }
  }

  for (const key of lookupKeys) {
    const groupKey = DEPT_TO_GROUP_KEY.get(key)
    if (groupKey) {
      return groupKey
    }
  }

  return null
}

function isSameDepartmentOrGroup(userMajor: string, courseDept: string): boolean {
  const userKeys = buildLookupKeys(userMajor)
  const courseKeys = buildLookupKeys(courseDept)

  if (userKeys.length === 0 || courseKeys.length === 0) {
    return false
  }

  for (const userKey of userKeys) {
    if (courseKeys.includes(userKey)) {
      return true
    }
  }

  const userGroupKey = getDeptGroupKey(userMajor)
  const courseGroupKey = getDeptGroupKey(courseDept)
  return !!userGroupKey && userGroupKey === courseGroupKey
}

export function determineMajorStatus(
  courseCollege: string,
  courseDept: string,
  category: string,
  userMajor: string,
): MajorStatus {
  if (!hasMajorClassificationContext(userMajor)) return '전공 아님'
  if (!isTargetCollege(courseCollege)) return '전공 아님'
  if (!category.trim().startsWith('전공')) return '전공 아님'

  if (!isSameDepartmentOrGroup(userMajor, courseDept)) {
    return '전공 아님'
  }

  return category.includes('필수') ? '전공필수' : '전공선택'
}

export function isMajorCourseForUser(
  courseCollege: string,
  courseDept: string,
  category: string,
  userMajor: string,
): boolean {
  return determineMajorStatus(courseCollege, courseDept, category, userMajor) !== '전공 아님'
}

// ============================================================
// 추천 엔진 공통 상수
// ============================================================

/** 소프트 조건 점수 가중치 */
export const SCORE_WEIGHTS = {
  FREE_DAY: 30,
  TIME_PREFERENCE: 25,
  GAP: 20,
  LUNCH: 15,
  DELIVERY: 10,
  MAJOR: 20,
} as const

export const DAY_KEYS = ['월', '화', '수', '목', '금'] as const
export type DayKey = (typeof DAY_KEYS)[number]

// ── 15분 단위 슬롯 bitmask ──────────────────────────────────
// 범위: 08:00 ~ 22:00  →  14시간 × 4슬롯 = 56 slots
// slot 0 = 08:00, slot 55 = 21:45
export const SLOT_START_HOUR = 8
export const SLOT_END_HOUR = 22
export const SLOT_MIN = 15
export const SLOTS_PER_DAY = ((SLOT_END_HOUR - SLOT_START_HOUR) * 60) / SLOT_MIN // 56

// 시간대 슬롯 범위 (start 포함, end 미포함)
// morning  09:00~12:00 → slot 4 ~ 15
// afternoon 12:00~17:00 → slot 16 ~ 35
// evening  17:00~21:00 → slot 36 ~ 51
export const MORNING_SLOTS = { start: 4, end: 16 }
export const AFTERNOON_SLOTS = { start: 16, end: 36 }
export const EVENING_SLOTS = { start: 36, end: 52 }

// 점심 구간 12:00~14:00 = slot 16 ~ 23 (8 slots = 2시간)
export const LUNCH_SLOTS = { start: 16, end: 24 }

/** 상위 K개 결과 유지 */
export const TOP_K = 3

/** DFS 안전 최대 탐색 횟수 */
export const MAX_EVAL = 10_000

/** 검색 debounce(ms) */
export const SEARCH_DEBOUNCE_MS = 300

/** GapLevel → 허용 gap 분 */
export const GAP_LEVEL_MINUTES: Record<0 | 1 | 2 | 3, number> = {
  0: 0,
  1: 60,
  2: 120,
  3: 999_999,
}

// ============================================================
// 추천 로직 공통 상수 - 이 파일만 수정하면 전체 가중치/범위 변경 가능
// ============================================================

/** 소프트 조건 점수 가중치 (합계 = 100) */
export const SCORE_WEIGHTS = {
  FREE_DAY: 30,
  TIME_PREFERENCE: 25,
  GAP: 20,
  LUNCH: 15,
  DELIVERY: 10,
} as const

/** 요일 순서 */
export const DAY_KEYS = ['월', '화', '수', '목', '금'] as const
export type DayKey = (typeof DAY_KEYS)[number]

// ── 30분 단위 슬롯 표현 ──────────────────────────────────────
// 09:00 = slot 0, 09:30 = slot 1, …, 20:30 = slot 23
// 총 24슬롯으로 하루 시간표 표현
export const SLOT_START_HOUR = 9
export const SLOT_END_HOUR = 21
export const SLOT_MIN = 30
export const SLOTS_PER_DAY = ((SLOT_END_HOUR - SLOT_START_HOUR) * 60) / SLOT_MIN // 24

/** 시간대 슬롯 범위 (start 포함, end 미포함) */
export const MORNING = { start: 0, end: 6 }    // 09:00–12:00
export const AFTERNOON = { start: 6, end: 16 }  // 12:00–17:00
export const EVENING = { start: 16, end: 24 }   // 17:00–21:00

/** 점심시간 슬롯 범위 (12:00–14:00) */
export const LUNCH = { start: 6, end: 10 }

/** 상위 K개 결과 유지 */
export const TOP_K = 3

/** DFS 안전 한도 (탐색 초과 방지) */
export const MAX_COMBINATIONS = 8_000

/** 검색 디바운스 딜레이(ms) */
export const SEARCH_DEBOUNCE_MS = 300

/**
 * 강의 사이 공백 허용 수준 → 최대 허용 gap(분)
 * 0 = 연강 선호(gap 0), 1 = 1시간 이하, 2 = 2시간 이하, 3 = 제한 없음
 */
export const GAP_MINUTES: Record<0 | 1 | 2 | 3, number> = {
  0: 0,
  1: 60,
  2: 120,
  3: 999_999,
}

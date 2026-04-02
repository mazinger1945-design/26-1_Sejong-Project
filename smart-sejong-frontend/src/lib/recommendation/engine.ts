/**
 * engine.ts
 *
 * 규칙 기반 시간표 추천 엔진
 *
 * 알고리즘:
 *   1. 하드 조건 검증 (validate)
 *   2. 후보 풀 필터링 + 과목 그룹화 (filter)
 *   3. DFS / 백트래킹으로 조합 탐색 (branch-and-bound pruning 적용)
 *   4. 완성 시간표마다 소프트 조건 점수 계산 (score)
 *   5. 상위 K개 결과 유지 (min-heap 대신 정렬 배열 사용)
 *
 * 시간 충돌 판정: 요일별 비트마스크 AND 연산 O(days=5)
 * 탐색 복잡도:   O(prod(분반 수 per 과목)) - pruning으로 대폭 축소
 */

import { TOP_K, MAX_COMBINATIONS } from './constants'
import { buildMask, conflicts, merge } from './timeMask'
import { validateFixedItems } from './validate'
import { filterCandidates } from './filter'
import { scoreSchedule, buildReasons } from './score'
import type {
  SectionCandidate,
  RecommendationConditions,
  RecommendationResult,
  CandidateGroup,
  DayMask,
} from './types'

interface GenerateOutput {
  results: RecommendationResult[]
  errors: string[]           // 하드 조건 검증 오류 → 추천 불가
  noResultReasons: string[]  // 결과 0개일 때 안내 메시지
}

/**
 * 메인 추천 함수.
 * @param pool    추천 대상 후보 분반 목록 (전체 강의 무차별 탐색 금지)
 * @param conditions 사용자 조건 전체
 */
export function generateRecommendations(
  pool: SectionCandidate[],
  conditions: RecommendationConditions
): GenerateOutput {
  const { fixedSections, fixedCustomBlocks, creditRange } = conditions

  // ── 1단계: 하드 조건 사전 검증 ──────────────────────────────
  const validationErrors = validateFixedItems(fixedSections, fixedCustomBlocks, creditRange)
  if (validationErrors.length > 0) {
    return {
      results: [],
      errors: validationErrors.map((e) => e.message),
      noResultReasons: [],
    }
  }

  // ── 2단계: 후보 풀 필터링 & 그룹화 ─────────────────────────
  const candidateGroups = filterCandidates({
    pool,
    fixedSections,
    fixedCustomBlocks,
    excludedCourseIds: conditions.excludedCourseIds,
  })

  // 고정 분반 학점 합 + 기저 마스크 계산
  const fixedCredits = fixedSections.reduce((s, fs) => s + fs.section.credits, 0)
  let baseMask: DayMask = {}
  for (const fs of fixedSections) baseMask = merge(baseMask, fs.mask)
  for (const cb of fixedCustomBlocks) baseMask = merge(baseMask, cb.mask)

  // 그룹별 최대 학점 사전 계산 → pruning 용
  const groupMaxCredits = candidateGroups.map((g) =>
    g.sections.reduce((max, s) => Math.max(max, s.credits), 0)
  )

  // ── 3단계: DFS / 백트래킹 ──────────────────────────────────
  const topResults: RecommendationResult[] = []
  let combinationsEvaluated = 0
  let resultId = 0

  /**
   * DFS 재귀 함수.
   * @param gIdx   현재 처리할 그룹 인덱스
   * @param curMask 지금까지 쌓인 시간 마스크 (고정 항목 포함)
   * @param curCr  현재 누적 학점 (고정 학점 포함)
   * @param sel    현재 선택된 분반 목록 (고정 제외)
   */
  function dfs(
    gIdx: number,
    curMask: DayMask,
    curCr: number,
    sel: SectionCandidate[]
  ): void {
    if (combinationsEvaluated >= MAX_COMBINATIONS) return

    // ── Pruning 1: 남은 그룹 최대 학점을 모두 더해도 min에 못 미치면 중단
    const remainMax = groupMaxCredits.slice(gIdx).reduce((s, c) => s + c, 0)
    if (curCr + remainMax < creditRange.min) return

    // ── 리프 노드 판정: 그룹 소진 OR 이미 최대 학점 도달
    if (gIdx >= candidateGroups.length || curCr >= creditRange.max) {
      if (curCr < creditRange.min || curCr > creditRange.max) return

      combinationsEvaluated++

      const scoreBreakdown = scoreSchedule(sel, conditions, fixedSections, fixedCustomBlocks)

      // ── Pruning 2: 현재 top-K 최저 점수보다 낮으면 skip (branch & bound)
      if (topResults.length >= TOP_K) {
        const minScore = Math.min(...topResults.map((r) => r.scoreBreakdown.total))
        if (scoreBreakdown.total <= minScore) return
      }

      const result: RecommendationResult = {
        id: resultId++,
        sections: [...sel],
        totalCredits: curCr,
        scoreBreakdown,
        reasons: buildReasons(sel, conditions, fixedSections, fixedCustomBlocks, scoreBreakdown),
      }

      topResults.push(result)
      // 점수 내림차순 정렬 후 K개 초과 제거
      topResults.sort((a, b) => b.scoreBreakdown.total - a.scoreBreakdown.total)
      if (topResults.length > TOP_K) topResults.pop()
      return
    }

    const group: CandidateGroup = candidateGroups[gIdx]

    // 선택지 1: 이 과목 그룹을 선택하지 않음
    dfs(gIdx + 1, curMask, curCr, sel)

    // 선택지 2: 이 그룹에서 분반 1개 선택
    for (const section of group.sections) {
      const sectionMask = buildMask(section.meetingTimes)

      // ── Pruning 3: 시간 충돌 → 해당 분반 skip
      if (conflicts(curMask, sectionMask)) continue

      // ── Pruning 4: 학점 초과 → 해당 분반 skip
      if (curCr + section.credits > creditRange.max) continue

      dfs(gIdx + 1, merge(curMask, sectionMask), curCr + section.credits, [...sel, section])
    }
  }

  dfs(0, baseMask, fixedCredits, [])

  // ── 4단계: 빈 결과 안내 메시지 생성 ────────────────────────
  const noResultReasons: string[] = []
  if (topResults.length === 0) {
    if (pool.length === 0) {
      noResultReasons.push('추천 후보 강의가 없습니다. 샘플 데이터를 불러오거나 분반을 검색해보세요.')
    }
    if (fixedCredits > creditRange.max) {
      noResultReasons.push('고정 분반 학점이 최대 희망 학점을 이미 초과합니다.')
    } else if (creditRange.max - fixedCredits < 2) {
      noResultReasons.push('희망 학점 범위를 조금 넓혀보세요.')
    }
    if (conditions.excludedCourseIds.length > 0) {
      noResultReasons.push('제외 과목이 많아 후보가 부족합니다.')
    }
    if (conditions.preferredFreeDays.length >= 4) {
      noResultReasons.push('공강 희망 요일 조건이 너무 강할 수 있습니다.')
    }
    if (fixedSections.length > 0) {
      noResultReasons.push('고정한 분반/일정 때문에 가능한 조합이 거의 없습니다.')
    }
    if (noResultReasons.length === 0) {
      noResultReasons.push('조건에 맞는 시간표 조합이 없습니다. 조건을 완화해보세요.')
    }
  }

  return { results: topResults, errors: [], noResultReasons }
}

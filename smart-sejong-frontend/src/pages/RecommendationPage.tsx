/**
 * RecommendationPage.tsx
 *
 * "시간표 추천" 페이지 (규칙 기반)
 *
 * 레이아웃: 왼쪽 조건 설정 패널 | 오른쪽 시간표 미리보기 + 추천 결과
 *
 * 상태 흐름:
 *   conditions → generateRecommendations() → results → previewItems → TimetableGrid
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Filter,
  Lock,
  Plus,
  X,
  Search,
  Wand2,
  AlertTriangle,
  CalendarDays,
  Clock,
} from 'lucide-react'
import { TimetableGrid } from '@/components/timetable/TimetableGrid'
import type { TimetableItem } from '@/types'
import type { CourseMaster } from '@/types'
import { generateRecommendations } from '@/lib/recommendation/engine'
import { searchSections, searchCourses, getMockPool } from '@/lib/recommendation/search'
import { buildMask, buildSingleMask } from '@/lib/recommendation/timeMask'
import { checkNewSectionConflict, checkNewCustomBlockConflict } from '@/lib/recommendation/validate'
import { validateFixedItems } from '@/lib/recommendation/validate'
import { SEARCH_DEBOUNCE_MS, DAY_KEYS, SCORE_WEIGHTS } from '@/lib/recommendation/constants'
import type {
  SectionCandidate,
  FixedSection,
  CustomBlock,
  ExcludedCourse,
  RecommendationConditions,
  RecommendationResult,
  TimePref,
  GapLevel,
  DeliveryPreference,
} from '@/lib/recommendation/types'
import toast from 'react-hot-toast'

// ── 기본값 ──────────────────────────────────────────────────

const DEFAULT_CONDITIONS: RecommendationConditions = {
  fixedSections: [],
  fixedCustomBlocks: [],
  excludedCourseIds: [],
  creditRange: { min: 12, max: 18 },
  deliveryPreference: 'ANY',
  preferredFreeDays: [],
  timePreference: { morning: 'NEUTRAL', afternoon: 'NEUTRAL', evening: 'NEUTRAL' },
  allowedGapLevel: 2,
  needsLunchBreak: false,
}

const DEFAULT_CUSTOM_FORM = { title: '', day: '월', start: '09:00', end: '10:30' }

// ── 소형 유틸 훅 ────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [dv, setDv] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return dv
}

let _tempId = -1
function nextTempId() {
  return _tempId--
}

// ── 메인 컴포넌트 ────────────────────────────────────────────

export default function RecommendationPage() {
  // ── 핵심 상태 ──────────────────────────────────────────────
  const [conditions, setConditions] = useState<RecommendationConditions>(DEFAULT_CONDITIONS)
  const [candidatePool] = useState<SectionCandidate[]>(getMockPool)

  const [results, setResults] = useState<RecommendationResult[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateErrors, setGenerateErrors] = useState<string[]>([])
  const [noResultReasons, setNoResultReasons] = useState<string[]>([])

  // ── 분반 검색 상태 ─────────────────────────────────────────
  const [secQuery, setSecQuery] = useState('')
  const debouncedSecQuery = useDebounce(secQuery, SEARCH_DEBOUNCE_MS)
  const [secResults, setSecResults] = useState<SectionCandidate[]>([])
  const [secLoading, setSecLoading] = useState(false)
  const [secDropOpen, setSecDropOpen] = useState(false)

  // ── 제외 과목 검색 상태 ────────────────────────────────────
  const [excQuery, setExcQuery] = useState('')
  const debouncedExcQuery = useDebounce(excQuery, SEARCH_DEBOUNCE_MS)
  const [excResults, setExcResults] = useState<CourseMaster[]>([])
  const [excLoading, setExcLoading] = useState(false)
  const [excDropOpen, setExcDropOpen] = useState(false)

  // ── 사용자 정의 일정 폼 ────────────────────────────────────
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customForm, setCustomForm] = useState(DEFAULT_CUSTOM_FORM)

  // ── 실시간 검증 오류 ───────────────────────────────────────
  const realtimeErrors = useMemo(
    () =>
      validateFixedItems(
        conditions.fixedSections,
        conditions.fixedCustomBlocks,
        conditions.creditRange
      ),
    [conditions.fixedSections, conditions.fixedCustomBlocks, conditions.creditRange]
  )

  // ── 분반 검색 이펙트 ───────────────────────────────────────
  useEffect(() => {
    if (!debouncedSecQuery.trim()) {
      setSecResults([])
      setSecDropOpen(false)
      return
    }
    setSecLoading(true)
    searchSections(debouncedSecQuery)
      .then((r) => {
        setSecResults(r)
        setSecDropOpen(r.length > 0)
      })
      .finally(() => setSecLoading(false))
  }, [debouncedSecQuery])

  // ── 제외 과목 검색 이펙트 ──────────────────────────────────
  useEffect(() => {
    if (!debouncedExcQuery.trim()) {
      setExcResults([])
      setExcDropOpen(false)
      return
    }
    setExcLoading(true)
    searchCourses(debouncedExcQuery)
      .then((r) => {
        setExcResults(r)
        setExcDropOpen(r.length > 0)
      })
      .finally(() => setExcLoading(false))
  }, [debouncedExcQuery])

  // ── 핸들러: 고정 분반 추가 ────────────────────────────────
  const handleAddFixedSection = useCallback(
    (section: SectionCandidate) => {
      const mask = buildMask(section.meetingTimes)

      // 이미 추가된 분반 중복 확인
      if (conditions.fixedSections.some((fs) => fs.section.sectionId === section.sectionId)) {
        toast.error('이미 추가된 분반입니다.')
        return
      }

      // 제외 과목과 충돌 확인
      if (conditions.excludedCourseIds.includes(section.courseId)) {
        toast.error(`"${section.courseName}"은 제외 과목으로 설정되어 있습니다. 제외 목록에서 먼저 제거해주세요.`)
        return
      }

      // 시간 충돌 확인
      const conflict = checkNewSectionConflict(mask, conditions.fixedSections, conditions.fixedCustomBlocks)
      if (conflict) {
        toast.error(conflict)
        return
      }

      const newSection: FixedSection = { section, mask }
      setConditions((prev) => ({
        ...prev,
        fixedSections: [...prev.fixedSections, newSection],
      }))
      setSecQuery('')
      setSecDropOpen(false)
    },
    [conditions]
  )

  // ── 핸들러: 고정 분반 제거 ────────────────────────────────
  const handleRemoveFixedSection = useCallback((sectionId: number) => {
    setConditions((prev) => ({
      ...prev,
      fixedSections: prev.fixedSections.filter((fs) => fs.section.sectionId !== sectionId),
    }))
  }, [])

  // ── 핸들러: 사용자 정의 일정 추가 ────────────────────────
  const handleAddCustomBlock = useCallback(() => {
    const { title, day, start, end } = customForm
    if (!title.trim()) {
      toast.error('일정 제목을 입력해주세요.')
      return
    }
    if (start >= end) {
      toast.error('종료 시간이 시작 시간보다 늦어야 합니다.')
      return
    }

    const mask = buildSingleMask(day, start, end)
    const conflict = checkNewCustomBlockConflict(mask, conditions.fixedSections, conditions.fixedCustomBlocks)
    if (conflict) {
      toast.error(conflict)
      return
    }

    const block: CustomBlock = {
      id: `custom-${Date.now()}`,
      title: title.trim(),
      day,
      start,
      end,
      mask,
    }
    setConditions((prev) => ({
      ...prev,
      fixedCustomBlocks: [...prev.fixedCustomBlocks, block],
    }))
    setCustomForm(DEFAULT_CUSTOM_FORM)
    setShowCustomForm(false)
  }, [customForm, conditions])

  // ── 핸들러: 사용자 일정 제거 ──────────────────────────────
  const handleRemoveCustomBlock = useCallback((id: string) => {
    setConditions((prev) => ({
      ...prev,
      fixedCustomBlocks: prev.fixedCustomBlocks.filter((cb) => cb.id !== id),
    }))
  }, [])

  // 제외 과목 표시용 별도 상태 (courseId만 있으면 이름 표시가 안 되므로)
  const [excludedCourseList, setExcludedCourseList] = useState<ExcludedCourse[]>([])

  const handleAddExcludedCourseWithName = useCallback(
    (course: CourseMaster) => {
      if (conditions.excludedCourseIds.includes(course.id)) return
      const alreadyFixed = conditions.fixedSections.some((fs) => fs.section.courseId === course.id)
      if (alreadyFixed) {
        toast.error(`"${course.name}"은 고정 분반으로 추가되어 있습니다. 고정 분반에서 먼저 제거해주세요.`)
        return
      }
      setConditions((prev) => ({
        ...prev,
        excludedCourseIds: [...prev.excludedCourseIds, course.id],
      }))
      setExcludedCourseList((prev) => [
        ...prev,
        { courseId: course.id, courseCode: course.code, courseName: course.name },
      ])
      setExcQuery('')
      setExcDropOpen(false)
    },
    [conditions]
  )

  const handleRemoveExcludedCourse = useCallback((courseId: number) => {
    setConditions((prev) => ({
      ...prev,
      excludedCourseIds: prev.excludedCourseIds.filter((id) => id !== courseId),
    }))
    setExcludedCourseList((prev) => prev.filter((c) => c.courseId !== courseId))
  }, [])

  // ── 핸들러: 추천 생성 ─────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (realtimeErrors.length > 0) {
      toast.error('고정 항목에 충돌이 있습니다. 먼저 해결해주세요.')
      return
    }
    setIsGenerating(true)
    setGenerateErrors([])
    setNoResultReasons([])

    // 비동기처럼 보이게 처리 (UI 블로킹 방지)
    await new Promise((r) => setTimeout(r, 50))

    const output = generateRecommendations(candidatePool, conditions)
    setGenerateErrors(output.errors)
    setNoResultReasons(output.noResultReasons)
    setResults(output.results)
    setSelectedIdx(0)
    setIsGenerating(false)

    if (output.errors.length > 0) {
      toast.error('조건 오류가 있습니다. 확인해주세요.')
    } else if (output.results.length === 0) {
      toast.error('조건에 맞는 시간표가 없습니다.')
    } else {
      toast.success(`${output.results.length}개의 추천 조합을 찾았습니다!`)
    }
  }, [candidatePool, conditions, realtimeErrors])

  // ── 미리보기 아이템 계산 ───────────────────────────────────
  const previewItems = useMemo((): TimetableItem[] => {
    const items: TimetableItem[] = []

    // 고정 분반 (초록, 자물쇠)
    for (const fs of conditions.fixedSections) {
      for (const mt of fs.section.meetingTimes) {
        items.push({
          item_id: nextTempId(),
          section_id: fs.section.sectionId,
          name: `${fs.section.courseName}\n${fs.section.sectionName}`,
          day: mt.day,
          start: mt.start,
          end: mt.end,
          is_pinned: false,
          type: 'section',
          _variant: 'locked',
        })
      }
    }

    // 사용자 정의 일정 (주황, 자물쇠)
    for (const cb of conditions.fixedCustomBlocks) {
      items.push({
        item_id: nextTempId(),
        name: cb.title,
        day: cb.day,
        start: cb.start,
        end: cb.end,
        is_pinned: false,
        type: 'custom',
        _variant: 'custom-locked',
      })
    }

    // 추천 결과 분반 (파랑)
    if (results.length > 0 && selectedIdx < results.length) {
      const selectedResult = results[selectedIdx]
      for (const section of selectedResult.sections) {
        for (const mt of section.meetingTimes) {
          items.push({
            item_id: nextTempId(),
            section_id: section.sectionId,
            name: `${section.courseName}${section.professor ? `\n${section.professor}` : ''}`,
            day: mt.day,
            start: mt.start,
            end: mt.end,
            is_pinned: false,
            type: 'section',
            _variant: 'recommended',
          })
        }
      }
    }

    return items
  }, [conditions.fixedSections, conditions.fixedCustomBlocks, results, selectedIdx])

  const update = <K extends keyof RecommendationConditions>(
    key: K,
    value: RecommendationConditions[K]
  ) => setConditions((prev) => ({ ...prev, [key]: value }))

  const toggleDay = (day: string) =>
    update(
      'preferredFreeDays',
      conditions.preferredFreeDays.includes(day)
        ? conditions.preferredFreeDays.filter((d) => d !== day)
        : [...conditions.preferredFreeDays, day]
    )

  const setTimePref = (zone: 'morning' | 'afternoon' | 'evening', pref: TimePref) =>
    update('timePreference', { ...conditions.timePreference, [zone]: pref })

  // ── 렌더 ─────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">시간표 추천</h1>
        <p className="text-gray-500 text-sm">조건을 설정하여 최적의 시간표 조합을 찾아보세요</p>
      </div>

      {/* 실시간 충돌 경고 배너 */}
      {realtimeErrors.length > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <ul className="text-sm text-red-700 space-y-1">
              {realtimeErrors.map((e, i) => (
                <li key={i}>{e.message}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── 왼쪽 패널: 조건 설정 ─────────────────────────── */}
        <div className="lg:col-span-1 space-y-4">
          {/* 필수 반영 조건 섹션 헤더 */}
          <div className="flex items-center gap-2 px-1">
            <Lock className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-semibold text-gray-700">필수 반영 조건</span>
          </div>

          {/* 1. 필수 포함 분반 */}
          <div className="card space-y-3">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs flex items-center justify-center font-bold">1</span>
              필수 포함 분반
            </h3>
            {/* 분반 검색 */}
            <div className="relative">
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary-500">
                <Search className="w-4 h-4 text-gray-400 ml-3 flex-shrink-0" />
                <input
                  type="text"
                  value={secQuery}
                  onChange={(e) => setSecQuery(e.target.value)}
                  onFocus={() => secResults.length > 0 && setSecDropOpen(true)}
                  placeholder="과목명, 교수명 검색..."
                  className="flex-1 px-2 py-2 text-sm outline-none"
                />
                {secLoading && (
                  <div className="w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin mr-3" />
                )}
              </div>
              {/* 검색 결과 드롭다운 */}
              {secDropOpen && secResults.length > 0 && (
                <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                  {secResults.map((s) => (
                    <button
                      key={s.sectionId}
                      onClick={() => handleAddFixedSection(s)}
                      className="w-full text-left px-3 py-2 hover:bg-primary-50 transition-colors border-b border-gray-100 last:border-0"
                    >
                      <div className="text-sm font-medium text-gray-900">{s.courseName}</div>
                      <div className="text-xs text-gray-500">
                        {s.sectionName}
                        {s.professor ? ` · ${s.professor}` : ''}
                        {' · '}
                        {s.meetingTimes.map((m) => `${m.day} ${m.start}~${m.end}`).join(', ')}
                        {' · '}{s.credits}학점
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* 고정 분반 칩 목록 */}
            {conditions.fixedSections.length > 0 && (
              <div className="space-y-1.5">
                {conditions.fixedSections.map((fs) => (
                  <div
                    key={fs.section.sectionId}
                    className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Lock className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-emerald-900 truncate">
                          {fs.section.courseName} · {fs.section.sectionName}
                        </div>
                        <div className="text-[10px] text-emerald-700">
                          {fs.section.meetingTimes.map((m) => `${m.day} ${m.start}~${m.end}`).join(', ')} · {fs.section.credits}학점
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveFixedSection(fs.section.sectionId)}
                      className="ml-2 text-emerald-400 hover:text-red-500 flex-shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. 내 일정 추가 */}
          <div className="card space-y-3">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 text-xs flex items-center justify-center font-bold">2</span>
              내 일정 추가
            </h3>
            {/* 추가된 일정 칩 */}
            {conditions.fixedCustomBlocks.length > 0 && (
              <div className="space-y-1.5">
                {conditions.fixedCustomBlocks.map((cb) => (
                  <div
                    key={cb.id}
                    className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg px-2.5 py-1.5"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Lock className="w-3 h-3 text-orange-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-orange-900 truncate">{cb.title}</div>
                        <div className="text-[10px] text-orange-700">
                          {cb.day} {cb.start}~{cb.end}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveCustomBlock(cb.id)}
                      className="ml-2 text-orange-400 hover:text-red-500 flex-shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {/* 일정 추가 폼 */}
            {showCustomForm ? (
              <div className="space-y-2 border border-gray-200 rounded-lg p-3 bg-gray-50">
                <input
                  type="text"
                  value={customForm.title}
                  onChange={(e) => setCustomForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="일정 이름 (예: 알바, 동아리)"
                  className="input text-sm py-1.5"
                />
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={customForm.day}
                    onChange={(e) => setCustomForm((f) => ({ ...f, day: e.target.value }))}
                    className="input text-sm py-1.5"
                  >
                    {DAY_KEYS.map((d) => (
                      <option key={d} value={d}>{d}요일</option>
                    ))}
                  </select>
                  <input
                    type="time"
                    value={customForm.start}
                    onChange={(e) => setCustomForm((f) => ({ ...f, start: e.target.value }))}
                    className="input text-sm py-1.5"
                  />
                  <input
                    type="time"
                    value={customForm.end}
                    onChange={(e) => setCustomForm((f) => ({ ...f, end: e.target.value }))}
                    className="input text-sm py-1.5"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddCustomBlock} className="btn-primary text-sm py-1.5 flex-1">
                    추가
                  </button>
                  <button
                    onClick={() => { setShowCustomForm(false); setCustomForm(DEFAULT_CUSTOM_FORM) }}
                    className="btn-secondary text-sm py-1.5"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowCustomForm(true)}
                className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-orange-400 hover:text-orange-500 transition-colors"
              >
                <Plus className="w-4 h-4" />
                일정 추가 (알바, 동아리 등)
              </button>
            )}
          </div>

          {/* 3. 제외 과목 */}
          <div className="card space-y-3">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs flex items-center justify-center font-bold">3</span>
              제외 과목
            </h3>
            <div className="relative">
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary-500">
                <Search className="w-4 h-4 text-gray-400 ml-3 flex-shrink-0" />
                <input
                  type="text"
                  value={excQuery}
                  onChange={(e) => setExcQuery(e.target.value)}
                  onFocus={() => excResults.length > 0 && setExcDropOpen(true)}
                  placeholder="제외할 과목명 검색..."
                  className="flex-1 px-2 py-2 text-sm outline-none"
                />
                {excLoading && (
                  <div className="w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin mr-3" />
                )}
              </div>
              {excDropOpen && excResults.length > 0 && (
                <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {excResults.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleAddExcludedCourseWithName(c)}
                      className="w-full text-left px-3 py-2 hover:bg-red-50 text-sm border-b border-gray-100 last:border-0"
                    >
                      <span className="font-medium">{c.name}</span>
                      <span className="text-gray-400 ml-1">{c.code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {excludedCourseList.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {excludedCourseList.map((ec) => (
                  <span
                    key={ec.courseId}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 border border-red-200 rounded-full text-xs text-red-700"
                  >
                    {ec.courseName}
                    <button
                      onClick={() => handleRemoveExcludedCourse(ec.courseId)}
                      className="hover:text-red-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 4. 희망 학점 범위 */}
          <div className="card space-y-3">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">4</span>
              희망 학점 범위
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">최소</label>
                <input
                  type="number"
                  min={1}
                  max={conditions.creditRange.max}
                  value={conditions.creditRange.min}
                  onChange={(e) =>
                    update('creditRange', {
                      ...conditions.creditRange,
                      min: Math.max(1, parseInt(e.target.value) || 1),
                    })
                  }
                  className="input text-sm py-1.5 text-center"
                />
              </div>
              <span className="text-gray-400 mt-4">~</span>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">최대</label>
                <input
                  type="number"
                  min={conditions.creditRange.min}
                  max={24}
                  value={conditions.creditRange.max}
                  onChange={(e) =>
                    update('creditRange', {
                      ...conditions.creditRange,
                      max: Math.min(24, parseInt(e.target.value) || 18),
                    })
                  }
                  className="input text-sm py-1.5 text-center"
                />
              </div>
              <span className="text-gray-500 mt-4 text-sm whitespace-nowrap">학점</span>
            </div>
          </div>

          {/* 5. 온라인/오프라인 선호 */}
          <div className="card space-y-3">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-xs flex items-center justify-center font-bold">5</span>
              온라인/오프라인 선호
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { v: 'ONLINE_PREFER', label: '온라인 선호' },
                  { v: 'ANY', label: '상관없음' },
                  { v: 'OFFLINE_PREFER', label: '오프라인 선호' },
                ] as { v: DeliveryPreference; label: string }[]
              ).map(({ v, label }) => (
                <button
                  key={v}
                  onClick={() => update('deliveryPreference', v)}
                  className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    conditions.deliveryPreference === v
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 선호 조건 헤더 */}
          <div className="flex items-center gap-2 px-1 mt-2">
            <Filter className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-semibold text-gray-700">선호 조건</span>
          </div>

          {/* 6. 공강 희망 요일 */}
          <div className="card space-y-3">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-blue-500" />
              공강 희망 요일
            </h3>
            <div className="flex gap-2">
              {DAY_KEYS.map((day) => (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    conditions.preferredFreeDays.includes(day)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {/* 7. 시간대 선호 */}
          <div className="card space-y-3">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-500" />
              시간대 선호
            </h3>
            {(
              [
                { key: 'morning', label: '오전 (09~12시)' },
                { key: 'afternoon', label: '오후 (12~17시)' },
                { key: 'evening', label: '저녁 (17~21시)' },
              ] as { key: 'morning' | 'afternoon' | 'evening'; label: string }[]
            ).map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-xs text-gray-600 w-28 flex-shrink-0">{label}</span>
                <div className="flex gap-1 flex-1">
                  {(
                    [
                      { v: 'PREFER', label: '선호' },
                      { v: 'NEUTRAL', label: '보통' },
                      { v: 'DISLIKE', label: '비선호' },
                    ] as { v: TimePref; label: string }[]
                  ).map(({ v, label: pl }) => (
                    <button
                      key={v}
                      onClick={() => setTimePref(key, v)}
                      className={`flex-1 py-1 rounded text-xs font-medium transition-colors ${
                        conditions.timePreference[key] === v
                          ? v === 'PREFER'
                            ? 'bg-green-500 text-white'
                            : v === 'DISLIKE'
                            ? 'bg-red-400 text-white'
                            : 'bg-gray-400 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {pl}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 8. 강의 사이 공백 허용 */}
          <div className="card space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">강의 사이 공백 허용</h3>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { v: 0, label: '0시간 (연강 선호)' },
                  { v: 1, label: '1시간 이하' },
                  { v: 2, label: '2시간 이하' },
                  { v: 3, label: '3시간 이상 가능' },
                ] as { v: GapLevel; label: string }[]
              ).map(({ v, label }) => (
                <button
                  key={v}
                  onClick={() => update('allowedGapLevel', v)}
                  className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    conditions.allowedGapLevel === v
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 9. 점심시간 확보 */}
          <div className="card">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => update('needsLunchBreak', !conditions.needsLunchBreak)}
                className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 relative ${
                  conditions.needsLunchBreak ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    conditions.needsLunchBreak ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-800">점심시간 확보</div>
                <div className="text-xs text-gray-500">12~14시 중 1시간 이상 여유 필요</div>
              </div>
            </label>
          </div>

          {/* 생성 버튼 */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || realtimeErrors.length > 0}
            className="w-full btn-primary flex items-center justify-center gap-2 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Wand2 className="w-5 h-5" />
            <span>{isGenerating ? '조합 탐색 중...' : '최적 조합 찾기'}</span>
          </button>
        </div>

        {/* ── 오른쪽 패널: 미리보기 + 추천 결과 ─────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {/* 결과 탭 (추천 나온 경우) */}
          {results.length > 0 && (
            <div className="flex gap-2">
              {results.map((r, i) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedIdx(i)}
                  className={`flex-1 rounded-xl border p-3 text-left transition-all ${
                    selectedIdx === i
                      ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-300'
                      : 'border-gray-200 bg-white hover:border-primary-200'
                  }`}
                >
                  <div className="text-sm font-semibold text-gray-800">조합 {i + 1}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {r.totalCredits}학점 · {r.scoreBreakdown.total}점
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {r.reasons.slice(0, 2).map((reason, ri) => (
                      <span
                        key={ri}
                        className="text-[10px] px-1.5 py-0.5 bg-primary-100 text-primary-700 rounded-full"
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* 점수 세부 내역 */}
          {results.length > 0 && (
            <div className="card">
              <div className="text-sm font-semibold text-gray-700 mb-3">점수 세부 내역</div>
              <div className="grid grid-cols-5 gap-2">
                {(
                  [
                    { label: '공강 요일', score: results[selectedIdx]?.scoreBreakdown.freeDayScore, max: SCORE_WEIGHTS.FREE_DAY },
                    { label: '시간대 선호', score: results[selectedIdx]?.scoreBreakdown.timePreferenceScore, max: SCORE_WEIGHTS.TIME_PREFERENCE },
                    { label: '강의 공백', score: results[selectedIdx]?.scoreBreakdown.gapScore, max: SCORE_WEIGHTS.GAP },
                    { label: '점심시간', score: results[selectedIdx]?.scoreBreakdown.lunchScore, max: SCORE_WEIGHTS.LUNCH },
                    { label: '온/오프라인', score: results[selectedIdx]?.scoreBreakdown.deliveryScore, max: SCORE_WEIGHTS.DELIVERY },
                  ] as { label: string; score: number; max: number }[]
                ).map(({ label, score, max }) => (
                  <div key={label} className="text-center">
                    <div className="text-xs text-gray-500 mb-1">{label}</div>
                    <div
                      className={`text-sm font-bold ${
                        score >= max * 0.7
                          ? 'text-green-600'
                          : score >= max * 0.4
                          ? 'text-yellow-600'
                          : 'text-red-500'
                      }`}
                    >
                      {score}/{max}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {results[selectedIdx]?.reasons.map((r, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 범례 */}
          {(conditions.fixedSections.length > 0 ||
            conditions.fixedCustomBlocks.length > 0 ||
            results.length > 0) && (
            <div className="flex gap-4 px-1">
              {conditions.fixedSections.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <div className="w-3 h-3 rounded bg-emerald-500" />
                  고정 분반
                </div>
              )}
              {conditions.fixedCustomBlocks.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <div className="w-3 h-3 rounded bg-orange-400" />
                  내 일정
                </div>
              )}
              {results.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <div className="w-3 h-3 rounded bg-blue-400" />
                  추천 수업
                </div>
              )}
            </div>
          )}

          {/* 시간표 그리드 */}
          <div className="card">
            {isGenerating ? (
              <div className="text-center py-16">
                <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500">최적 조합을 탐색하고 있습니다...</p>
              </div>
            ) : previewItems.length > 0 ? (
              <TimetableGrid items={previewItems} editable={false} />
            ) : (
              <EmptyState errors={generateErrors} noResultReasons={noResultReasons} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 빈 상태 / 오류 표시 컴포넌트 ──────────────────────────────

function EmptyState({
  errors,
  noResultReasons,
}: {
  errors: string[]
  noResultReasons: string[]
}) {
  if (errors.length > 0) {
    return (
      <div className="py-12 text-center space-y-3">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
        <div className="text-red-600 font-medium">조건 오류</div>
        <ul className="text-sm text-red-500 space-y-1">
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      </div>
    )
  }

  if (noResultReasons.length > 0) {
    return (
      <div className="py-12 text-center space-y-3">
        <CalendarDays className="w-12 h-12 text-gray-300 mx-auto" />
        <div className="text-gray-600 font-medium">추천 결과 없음</div>
        <ul className="text-sm text-gray-500 space-y-1">
          {noResultReasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="py-16 text-center text-gray-400 space-y-3">
      <Wand2 className="w-14 h-14 mx-auto text-gray-200" />
      <div>
        <p className="font-medium text-gray-500">조건을 설정하고</p>
        <p className="text-sm">'최적 조합 찾기'를 클릭하세요</p>
      </div>
    </div>
  )
}

/**
 * RecommendationPage.tsx
 *
 * 제약조건 기반 시간표 추천 페이지
 * - 하드 조건: 필수 포함 분반, 내 일정, 제외 과목, 학점 범위
 * - 소프트 조건: 공강 요일, 시간대 선호, 공백 허용, 점심 확보, 온/오프 선호
 * - 실제 백엔드 연동 (GET /api/courses/sections/grouped-search)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Filter,
  Lock,
  Plus,
  X,
  Search,
  Wand2,
  AlertTriangle,
  ChevronDown,
  Loader2,
  BookX,
} from 'lucide-react'
import { TimetableGrid } from '@/components/timetable/TimetableGrid'
import type { TimetableItem } from '@/types'
import type { GroupedSectionRaw } from '@/types'
import { generateRecommendations } from '@/lib/recommendation/engine'
import { normalizeCourseData, normalizeSection, toRSection, normalizeCustomBlock } from '@/lib/recommendation/normalize'
import { validateFixedItems, buildInitialMask } from '@/lib/recommendation/validate'
import {
  searchGroupedSections,
  searchCoursesForExclude,
  loadAllCandidateSections,
  toExcludedCourse,
} from '@/lib/recommendation/search'
import { hasMaskConflict } from '@/lib/recommendation/timeMask'
import { SEARCH_DEBOUNCE_MS } from '@/lib/recommendation/constants'
import type {
  Day,
  PreferenceLevel,
  DeliveryPreference,
  GapLevel,
  FixedSection,
  CustomBlock,
  ExcludedCourse,
  RecommendationFilters,
  RecommendationItem,
  ValidationError,
} from '@/lib/recommendation/types'
import type { CourseSearchResult } from '@/lib/recommendation/search'
import { timeStringToMinute } from '@/lib/recommendation/timeMask'
import { loadCompletedCourseInfo, saveCompletedCourseInfo } from '@/pages/LearningPage'
import type { CompletedCourseInfo } from '@/pages/LearningPage'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import {
  hasMajorClassificationContext,
  isMajorCourseForUser,
} from '@/lib/recommendation/majorDetermination'

// ── 초기값 ───────────────────────────────────────────────────

const DEFAULT_FILTERS: RecommendationFilters = {
  fixedSections: [],
  customBlocks: [],
  excludedCourseIds: [],
  creditRange: { min: 12, max: 18 },
  preferredFreeDays: [],
  timePreference: { morning: 'NEUTRAL', afternoon: 'NEUTRAL', evening: 'NEUTRAL' },
  allowedGapLevel: 2,
  needsLunchBreak: false,
  deliveryPreference: 'ANY',
  majorMinCount: 0,
  userMajor: '',
}

const DAYS: Day[] = ['월', '화', '수', '목', '금']
const DAY_LABELS: Record<Day, string> = { 월: '월', 화: '화', 수: '수', 목: '목', 금: '금' }
const GAP_LABELS: Record<GapLevel, string> = {
  0: '0시간 (연강)',
  1: '1시간 이하',
  2: '2시간 이하',
  3: '3시간 이상 가능',
}
const DELIVERY_LABELS: Record<DeliveryPreference, string> = {
  ONLINE_PREFER: '온라인 선호',
  ANY: '상관없음',
  OFFLINE_PREFER: '오프라인 선호',
}
const PREF_LABELS: Record<PreferenceLevel, string> = {
  PREFER: '선호',
  NEUTRAL: '보통',
  DISLIKE: '비선호',
}
// 전공 과목 수 0~7개
const MAJOR_COUNT_OPTIONS: { label: string; value: number }[] = [
  { label: '상관없음', value: 0 },
  ...Array.from({ length: 7 }, (_, i) => ({ label: `${i + 1}개 이상`, value: i + 1 })),
]

let _tempId = 1
const nextTempId = () => `tmp-${_tempId++}`

// ── 이름 유사도 매칭 헬퍼 ─────────────────────────────────────

/** 이름 정규화: 공백·접속사·조사 제거 후 소문자 */
function normalizeCourseName(name: string): string {
  return name
    .replace(/[및\s·,・()[\]]/g, '')
    .replace(/과목|강의/g, '')
    .toLowerCase()
}

/**
 * 두 과목 이름이 "동일 과목 변형"으로 볼 수 있는지 판정
 * - courseCode 일치 (우선)
 * - courseCode가 없는 기이수 데이터에서만 이름 완전 일치 fallback
 */
function isSimilarCourse(
  candidateCode: string,
  candidateName: string,
  completed: CompletedCourseInfo[],
): boolean {
  const normCandidate = normalizeCourseName(candidateName)
  for (const comp of completed) {
    // 1) courseCode 일치
    if (comp.courseCode && candidateCode.toLowerCase() === comp.courseCode.toLowerCase()) {
      return true
    }
    // 2) 코드가 없는 오래된 로컬 데이터에 한해 이름 완전 일치 fallback
    if (!comp.courseCode && comp.courseName) {
      const normComp = normalizeCourseName(comp.courseName)
      if (normComp && normCandidate && normCandidate === normComp) {
        return true
      }
    }
  }
  return false
}

function dedupeCompletedCourseInfo(items: CompletedCourseInfo[]): CompletedCourseInfo[] {
  const seen = new Set<string>()
  const result: CompletedCourseInfo[] = []

  for (const item of items) {
    const key = item.courseCode?.trim() || `name:${normalizeCourseName(item.courseName)}`
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push({
      courseCode: item.courseCode?.trim() ?? '',
      courseName: item.courseName?.trim() ?? '',
    })
  }

  return result
}

// ── TimetableItem 변환 헬퍼 ──────────────────────────────────

function fixedSectionToItem(sec: FixedSection, idx: number): TimetableItem[] {
  if (!sec.meetingTimes.length) return []
  return sec.meetingTimes.map((mt, j) => ({
    item_id: -(idx * 100 + j + 1),
    section_id: undefined,
    name: `${sec.courseName} (${sec.sectionName})`,
    day: mt.day,
    start: `${String(Math.floor(mt.startMinute / 60)).padStart(2, '0')}:${String(mt.startMinute % 60).padStart(2, '0')}`,
    end: `${String(Math.floor(mt.endMinute / 60)).padStart(2, '0')}:${String(mt.endMinute % 60).padStart(2, '0')}`,
    is_pinned: false,
    type: 'section' as const,
    _variant: 'locked' as const,
  }))
}

function customBlockToItem(blk: CustomBlock, idx: number): TimetableItem {
  return {
    item_id: -(10000 + idx),
    name: blk.title,
    day: blk.day,
    start: `${String(Math.floor(blk.startMinute / 60)).padStart(2, '0')}:${String(blk.startMinute % 60).padStart(2, '0')}`,
    end: `${String(Math.floor(blk.endMinute / 60)).padStart(2, '0')}:${String(blk.endMinute % 60).padStart(2, '0')}`,
    is_pinned: false,
    type: 'custom' as const,
    _variant: 'custom-locked' as const,
  }
}

function recommendedSectionToItems(item: RecommendationItem, fixedSections: FixedSection[]): TimetableItem[] {
  const allSections = [...fixedSections, ...item.sections]
  const result: TimetableItem[] = []
  allSections.forEach((sec, i) => {
    const isFixed = i < fixedSections.length
    sec.meetingTimes.forEach((mt, j) => {
      result.push({
        item_id: -(20000 + i * 100 + j),
        name: `${sec.courseName}${sec.sectionName ? ` (${sec.sectionName})` : ''}`,
        day: mt.day,
        start: `${String(Math.floor(mt.startMinute / 60)).padStart(2, '0')}:${String(mt.startMinute % 60).padStart(2, '0')}`,
        end: `${String(Math.floor(mt.endMinute / 60)).padStart(2, '0')}:${String(mt.endMinute % 60).padStart(2, '0')}`,
        is_pinned: false,
        type: 'section' as const,
        _variant: isFixed ? 'locked' : 'recommended',
      })
    })
  })
  return result
}

// ── 컴포넌트 ─────────────────────────────────────────────────

export default function RecommendationPage() {
  const { user } = useAuthStore()

  // 필터 상태
  const [filters, setFilters] = useState<RecommendationFilters>(() => ({
    ...DEFAULT_FILTERS,
    userMajor: user?.major ?? '',
  }))

  // 커스텀 블록 폼
  const [customForm, setCustomForm] = useState({ title: '', day: '월' as Day, start: '09:00', end: '10:30' })

  // 검색 상태 (필수 포함 분반)
  const [sectionQuery, setSectionQuery] = useState('')
  const [sectionResults, setSectionResults] = useState<GroupedSectionRaw[]>([])
  const [sectionSearching, setSectionSearching] = useState(false)
  const [showSectionDrop, setShowSectionDrop] = useState(false)

  // 검색 상태 (제외 과목)
  const [courseQuery, setCourseQuery] = useState('')
  const [courseResults, setCourseResults] = useState<CourseSearchResult[]>([])
  const [courseSearching, setCourseSearching] = useState(false)
  const [showCourseDrop, setShowCourseDrop] = useState(false)

  // candidate pool
  const [candidateSections, setCandidateSections] = useState<GroupedSectionRaw[]>([])
  const [candidateLoading, setCandidateLoading] = useState(false)

  // 추천 결과
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [diagnosisMessage, setDiagnosisMessage] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])

  // 미리보기 아이템
  const [previewItems, setPreviewItems] = useState<TimetableItem[]>([])

  // excluded 과목 목록 (courseId → ExcludedCourse)
  const [excludedCourses, setExcludedCourses] = useState<ExcludedCourse[]>([])

  // 이수과목 자동 제외 (localStorage에서 로드)
  const [completedCourseInfo, setCompletedCourseInfo] = useState<CompletedCourseInfo[]>([])

  const sectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const courseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── 사용자 학과 변경 시 filters 동기화 ──────────────────────

  useEffect(() => {
    setFilters((prev) => ({ ...prev, userMajor: user?.major ?? '' }))
  }, [user?.major])

  // ── 이수과목 로드 (localStorage) ─────────────────────────

  useEffect(() => {
    setCompletedCourseInfo(loadCompletedCourseInfo())
  }, [])

  // ── candidate pool 로딩 ──────────────────────────────────

  useEffect(() => {
    setCandidateLoading(true)
    loadAllCandidateSections()
      .then(setCandidateSections)
      .finally(() => setCandidateLoading(false))
  }, [])

  // ── 미리보기 업데이트 ────────────────────────────────────

  useEffect(() => {
    if (recommendations.length > 0) {
      const rec = recommendations[selectedIdx]
      if (rec) {
        setPreviewItems([
          ...recommendedSectionToItems(rec, filters.fixedSections),
          ...filters.customBlocks.map((b, i) => customBlockToItem(b, i)),
        ])
        return
      }
    }
    // 추천 없을 때는 고정 항목만 표시
    const items: TimetableItem[] = [
      ...filters.fixedSections.flatMap((s, i) => fixedSectionToItem(s, i)),
      ...filters.customBlocks.map((b, i) => customBlockToItem(b, i)),
    ]
    setPreviewItems(items)
  }, [filters.fixedSections, filters.customBlocks, recommendations, selectedIdx])

  // ── 고정 분반 검색 (debounce) ────────────────────────────

  const handleSectionQueryChange = useCallback((q: string) => {
    setSectionQuery(q)
    if (sectionTimerRef.current) clearTimeout(sectionTimerRef.current)
    if (!q.trim()) { setSectionResults([]); setShowSectionDrop(false); return }
    sectionTimerRef.current = setTimeout(async () => {
      setSectionSearching(true)
      const res = await searchGroupedSections(q)
      setSectionResults(res)
      setShowSectionDrop(true)
      setSectionSearching(false)
    }, SEARCH_DEBOUNCE_MS)
  }, [])

  // ── 제외 과목 검색 (debounce) ────────────────────────────

  const handleCourseQueryChange = useCallback((q: string) => {
    setCourseQuery(q)
    if (courseTimerRef.current) clearTimeout(courseTimerRef.current)
    if (!q.trim()) { setCourseResults([]); setShowCourseDrop(false); return }
    courseTimerRef.current = setTimeout(async () => {
      setCourseSearching(true)
      const res = await searchCoursesForExclude(q)
      setCourseResults(res)
      setShowCourseDrop(true)
      setCourseSearching(false)
    }, SEARCH_DEBOUNCE_MS)
  }, [])

  // ── 고정 분반 추가 ───────────────────────────────────────

  const handleAddFixedSection = useCallback((raw: GroupedSectionRaw) => {
    setShowSectionDrop(false)
    setSectionQuery('')
    setSectionResults([])

    const normalized = normalizeSection(toRSection(raw)) as FixedSection

    // 제외 과목 충돌 검사
    if (filters.excludedCourseIds.includes(normalized.courseId)) {
      setValidationErrors([{
        type: 'EXCLUDED_CONFLICT',
        message: `"${normalized.courseName}"은(는) 제외 과목에 포함되어 있습니다.`,
      }])
      return
    }
    // 기존 고정 분반과 충돌 검사
    for (const fs of filters.fixedSections) {
      if (hasMaskConflict(fs.weeklyMask, normalized.weeklyMask)) {
        setValidationErrors([{
          type: 'SECTION_SECTION_CONFLICT',
          message: `"${fs.courseName}" 분반과 시간이 겹칩니다.`,
        }])
        return
      }
    }
    // 커스텀 블록과 충돌 검사
    const combinedCustomMask = buildInitialMask([], filters.customBlocks)
    if (hasMaskConflict(combinedCustomMask, normalized.weeklyMask)) {
      setValidationErrors([{
        type: 'SECTION_CUSTOM_CONFLICT',
        message: `기존 사용자 일정과 시간이 겹칩니다.`,
      }])
      return
    }

    setValidationErrors([])
    setFilters((prev) => ({
      ...prev,
      fixedSections: [...prev.fixedSections, normalized],
    }))
    setRecommendations([])
    setDiagnosisMessage(null)
  }, [filters])

  const handleRemoveFixedSection = useCallback((sectionId: string) => {
    setFilters((prev) => ({
      ...prev,
      fixedSections: prev.fixedSections.filter((s) => s.sectionId !== sectionId),
    }))
    setValidationErrors([])
    setRecommendations([])
    setDiagnosisMessage(null)
  }, [])

  // ── 커스텀 블록 추가 ─────────────────────────────────────

  const handleAddCustomBlock = useCallback(() => {
    const { title, day, start, end } = customForm
    if (!title.trim()) return

    const startMin = timeStringToMinute(start)
    const endMin = timeStringToMinute(end)
    if (endMin <= startMin) {
      setValidationErrors([{
        type: 'CUSTOM_CUSTOM_CONFLICT',
        message: '종료 시간이 시작 시간보다 늦어야 합니다.',
      }])
      return
    }

    const newBlock = normalizeCustomBlock(nextTempId(), title, day, startMin, endMin)

    // 충돌 검사
    for (const fs of filters.fixedSections) {
      if (hasMaskConflict(fs.weeklyMask, newBlock.weeklyMask)) {
        setValidationErrors([{
          type: 'SECTION_CUSTOM_CONFLICT',
          message: `"${fs.courseName}" 분반과 시간이 겹칩니다.`,
        }])
        return
      }
    }
    for (const cb of filters.customBlocks) {
      if (hasMaskConflict(cb.weeklyMask, newBlock.weeklyMask)) {
        setValidationErrors([{
          type: 'CUSTOM_CUSTOM_CONFLICT',
          message: `"${cb.title}" 일정과 시간이 겹칩니다.`,
        }])
        return
      }
    }

    setValidationErrors([])
    setFilters((prev) => ({
      ...prev,
      customBlocks: [...prev.customBlocks, newBlock],
    }))
    setCustomForm({ title: '', day: '월', start: '09:00', end: '10:30' })
    setRecommendations([])
    setDiagnosisMessage(null)
  }, [customForm, filters])

  const handleRemoveCustomBlock = useCallback((id: string) => {
    setFilters((prev) => ({
      ...prev,
      customBlocks: prev.customBlocks.filter((b) => b.id !== id),
    }))
    setValidationErrors([])
    setRecommendations([])
  }, [])

  // ── 제외 과목 추가 ───────────────────────────────────────

  const handleAddExcludedCourse = useCallback((result: CourseSearchResult) => {
    setShowCourseDrop(false)
    setCourseQuery('')
    setCourseResults([])

    const excl = toExcludedCourse(result)

    // 고정 분반 충돌 검사
    const conflict = filters.fixedSections.find((s) => s.courseId === excl.courseId)
    if (conflict) {
      setValidationErrors([{
        type: 'EXCLUDED_CONFLICT',
        message: `"${excl.courseName}"은(는) 이미 필수 포함 분반으로 고정되어 있습니다.`,
      }])
      return
    }
    if (filters.excludedCourseIds.includes(excl.courseId)) return

    setValidationErrors([])
    setExcludedCourses((prev) => [...prev, excl])
    setFilters((prev) => ({
      ...prev,
      excludedCourseIds: [...prev.excludedCourseIds, excl.courseId],
    }))
    setRecommendations([])
    setDiagnosisMessage(null)
  }, [filters])

  const handleRemoveExcludedCourse = useCallback((courseId: string) => {
    setExcludedCourses((prev) => prev.filter((e) => e.courseId !== courseId))
    setFilters((prev) => ({
      ...prev,
      excludedCourseIds: prev.excludedCourseIds.filter((id) => id !== courseId),
    }))
    setRecommendations([])
  }, [])

  // ── 추천 실행 ────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    // 하드 조건 검증
    const errors = validateFixedItems(filters)
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }
    setValidationErrors([])
    setGenerating(true)
    setRecommendations([])
    setDiagnosisMessage(null)

    try {
      const pool = normalizeCourseData(candidateSections)
      if (pool.length === 0) {
        setDiagnosisMessage('강의 데이터가 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.')
        return
      }

      let effectiveCompletedCourseInfo = completedCourseInfo
      if (user?.student_id) {
        try {
          const latestCompletedCourses = await api.getCompletedCourses()
          effectiveCompletedCourseInfo = dedupeCompletedCourseInfo(
            latestCompletedCourses.map((course) => ({
              courseCode: course.courseCode ?? '',
              courseName: course.courseName ?? '',
            })),
          )
          setCompletedCourseInfo(effectiveCompletedCourseInfo)
          saveCompletedCourseInfo(effectiveCompletedCourseInfo)
        } catch {
          // 서버 조회 실패 시 localStorage fallback 유지
        }
      }

      let filteredPool = pool
      if (effectiveCompletedCourseInfo.length > 0) {
        const completedCodes = effectiveCompletedCourseInfo.map((c) => c.courseCode).filter(Boolean)

        // 1) 백엔드 동일과목 그룹 조회 (가장 정확)
        const equivalentCodeSet = await api.resolveEquivalentCodes(completedCodes)

        filteredPool = pool.filter((s) => {
          // 동일과목 코드 기반 제외 (백엔드 데이터 우선)
          if (equivalentCodeSet.has(s.courseCode)) return false
          // 이름 유사도 기반 제외 (fallback)
          if (isSimilarCourse(s.courseCode, s.courseName, effectiveCompletedCourseInfo)) return false
          return true
        })
      }

      if (filteredPool.length === 0) {
        setDiagnosisMessage(
          effectiveCompletedCourseInfo.length > 0
            ? '기이수 과목과 동일과목을 제외한 뒤 남은 후보 강의가 없습니다. 학습 현황 업로드 내용을 확인해주세요.'
            : '추천 가능한 강의 후보를 불러오지 못했습니다.',
        )
        return
      }

      const remainingMajorCourseCount = hasMajorClassificationContext(filters.userMajor)
        ? new Set(
            filteredPool
              .filter((section) =>
                isMajorCourseForUser(
                  section.college ?? '',
                  section.department ?? '',
                  section.categoryDescription ?? '',
                  filters.userMajor,
                ),
              )
              .map((section) => section.courseId),
          ).size
        : 0

      if (
        filters.majorMinCount > 0 &&
        hasMajorClassificationContext(filters.userMajor) &&
        remainingMajorCourseCount < filters.majorMinCount
      ) {
        setDiagnosisMessage(
          `기이수/동일과목 제외 후 남은 내 전공 후보가 ${remainingMajorCourseCount}과목뿐이라 전공 ${filters.majorMinCount}개 이상 조합을 만들 수 없습니다.`,
        )
        return
      }

      const result = generateRecommendations(filteredPool, filters)

      setRecommendations(result.recommendations)
      if (!result.recommendations.length && filters.majorMinCount > 0 && remainingMajorCourseCount > 0) {
        setDiagnosisMessage(
          `남아 있는 내 전공 후보는 ${remainingMajorCourseCount}과목이지만, 현재 학점 범위와 시간표 충돌 조건을 함께 만족하는 조합을 찾지 못했습니다.`,
        )
      } else {
        setDiagnosisMessage(result.diagnosisMessage)
      }
      setSelectedIdx(0)
    } finally {
      setGenerating(false)
    }
  }, [filters, candidateSections, completedCourseInfo, user?.student_id])

  // ── 공강 요일 토글 ───────────────────────────────────────

  const toggleFreeDay = (day: Day) => {
    setFilters((prev) => {
      const has = prev.preferredFreeDays.includes(day)
      return {
        ...prev,
        preferredFreeDays: has
          ? prev.preferredFreeDays.filter((d) => d !== day)
          : [...prev.preferredFreeDays, day],
      }
    })
    setRecommendations([])
  }

  // ── 시간대 선호 변경 ─────────────────────────────────────

  const setTimePref = (band: 'morning' | 'afternoon' | 'evening', val: PreferenceLevel) => {
    setFilters((prev) => ({
      ...prev,
      timePreference: { ...prev.timePreference, [band]: val },
    }))
    setRecommendations([])
  }

  // ── 렌더링 ───────────────────────────────────────────────

  const hasErrors = validationErrors.length > 0
  const hasResults = recommendations.length > 0
  const selectedRec = recommendations[selectedIdx]

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-primary-600" />
          <h1 className="text-xl font-bold text-gray-900">시간표 추천</h1>
          {candidateLoading && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Loader2 className="w-3 h-3 animate-spin" /> 강의 데이터 로딩 중...
            </span>
          )}
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating || candidateLoading}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {generating ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> 탐색 중...</>
          ) : (
            <><Wand2 className="w-4 h-4" /> 최적 조합 찾기</>
          )}
        </button>
      </div>

      {/* 에러 배너 */}
      {hasErrors && (
        <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <ul className="text-sm text-red-700 space-y-0.5">
              {validationErrors.map((e, i) => <li key={i}>{e.message}</li>)}
            </ul>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden gap-0">
        {/* ── 왼쪽 패널 ── */}
        <div className="w-96 flex-shrink-0 overflow-y-auto border-r border-gray-200 bg-gray-50 p-4 space-y-5">

          {/* ── 필수 반영 조건 ── */}
          <SectionHeader label="필수 반영 조건" />

          {/* 1. 필수 포함 분반 */}
          <FilterCard title="필수 포함 분반">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                placeholder="과목명 또는 교수명 검색..."
                value={sectionQuery}
                onChange={(e) => handleSectionQueryChange(e.target.value)}
                onFocus={() => sectionResults.length > 0 && setShowSectionDrop(true)}
                onBlur={() => setTimeout(() => setShowSectionDrop(false), 150)}
              />
              {sectionSearching && <Loader2 className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 animate-spin" />}
              {showSectionDrop && sectionResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                  {sectionResults.map((r) => (
                    <button
                      key={`${r.sectionId}`}
                      className="w-full text-left px-3 py-2 hover:bg-primary-50 border-b border-gray-100 last:border-0"
                      onMouseDown={() => handleAddFixedSection(r)}
                    >
                      <div className="text-sm font-medium text-gray-900">{r.courseName}</div>
                      <div className="text-xs text-gray-500">
                        {r.professor ? `${r.professor} · ` : ''}분반 {r.sectionNumber} · {r.credits}학점
                        {r.times.length > 0 && ` · ${r.times.map((t) => `${t.dayOfWeekKor} ${t.startTime}~${t.endTime}`).join(', ')}`}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* 선택된 고정 분반 chips */}
            {filters.fixedSections.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {filters.fixedSections.map((s) => (
                  <Chip
                    key={s.sectionId}
                    label={`${s.courseName} (${s.sectionName})`}
                    color="emerald"
                    icon={<Lock className="w-3 h-3" />}
                    onRemove={() => handleRemoveFixedSection(s.sectionId)}
                  />
                ))}
              </div>
            )}
          </FilterCard>

          {/* 2. 내 일정 추가 */}
          <FilterCard title="내 일정 추가">
            <div className="space-y-2">
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                placeholder="일정 제목 (예: 알바, 동아리)"
                value={customForm.title}
                onChange={(e) => setCustomForm((p) => ({ ...p, title: e.target.value }))}
              />
              <div className="flex gap-2">
                <select
                  className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none"
                  value={customForm.day}
                  onChange={(e) => setCustomForm((p) => ({ ...p, day: e.target.value as Day }))}
                >
                  {DAYS.map((d) => <option key={d} value={d}>{d}요일</option>)}
                </select>
                <input
                  type="time"
                  className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none"
                  value={customForm.start}
                  onChange={(e) => setCustomForm((p) => ({ ...p, start: e.target.value }))}
                />
                <input
                  type="time"
                  className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none"
                  value={customForm.end}
                  onChange={(e) => setCustomForm((p) => ({ ...p, end: e.target.value }))}
                />
              </div>
              <button
                onClick={handleAddCustomBlock}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                <Plus className="w-4 h-4" /> 일정 추가
              </button>
            </div>
            {filters.customBlocks.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {filters.customBlocks.map((b) => (
                  <Chip
                    key={b.id}
                    label={`${b.title} (${b.day})`}
                    color="orange"
                    icon={<Lock className="w-3 h-3" />}
                    onRemove={() => handleRemoveCustomBlock(b.id)}
                  />
                ))}
              </div>
            )}
          </FilterCard>

          {/* 3. 제외 과목 */}
          <FilterCard title="제외 과목">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                placeholder="과목명 검색..."
                value={courseQuery}
                onChange={(e) => handleCourseQueryChange(e.target.value)}
                onFocus={() => courseResults.length > 0 && setShowCourseDrop(true)}
                onBlur={() => setTimeout(() => setShowCourseDrop(false), 150)}
              />
              {courseSearching && <Loader2 className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 animate-spin" />}
              {showCourseDrop && courseResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {courseResults.map((r) => (
                    <button
                      key={r.courseId}
                      className="w-full text-left px-3 py-2 hover:bg-red-50 border-b border-gray-100 last:border-0"
                      onMouseDown={() => handleAddExcludedCourse(r)}
                    >
                      <div className="text-sm font-medium text-gray-900">{r.courseName}</div>
                      <div className="text-xs text-gray-500">{r.courseCode} · {r.credits}학점</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {excludedCourses.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {excludedCourses.map((e) => (
                  <Chip
                    key={e.courseId}
                    label={e.courseName}
                    color="red"
                    onRemove={() => handleRemoveExcludedCourse(e.courseId)}
                  />
                ))}
              </div>
            )}
          </FilterCard>

          {/* 4. 희망 학점 범위 */}
          <FilterCard title="희망 학점 범위">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 w-8">최소</label>
              <input
                type="number"
                min={0}
                max={filters.creditRange.max}
                className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none"
                value={filters.creditRange.min}
                onChange={(e) =>
                  setFilters((p) => ({
                    ...p,
                    creditRange: { ...p.creditRange, min: parseInt(e.target.value) || 0 },
                  }))
                }
              />
              <span className="text-gray-400">~</span>
              <input
                type="number"
                min={filters.creditRange.min}
                max={30}
                className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none"
                value={filters.creditRange.max}
                onChange={(e) =>
                  setFilters((p) => ({
                    ...p,
                    creditRange: { ...p.creditRange, max: parseInt(e.target.value) || 0 },
                  }))
                }
              />
              <label className="text-xs text-gray-500 w-8">최대</label>
            </div>
            {/* 고정 분반 학점 힌트 */}
            {filters.fixedSections.length > 0 && (() => {
              const fixed = filters.fixedSections.reduce((s, f) => s + f.credits, 0)
              const needMin = Math.max(0, filters.creditRange.min - fixed)
              const needMax = Math.max(0, filters.creditRange.max - fixed)
              return (
                <p className="text-[11px] text-gray-400 mt-1.5">
                  필수 분반 {fixed}학점 포함 → 추가 필요: {needMin}~{needMax}학점
                </p>
              )
            })()}
          </FilterCard>

          {/* 5. 온/오프라인 선호 */}
          <FilterCard title="온라인 / 오프라인 선호">
            <div className="flex gap-2">
              {(['ONLINE_PREFER', 'ANY', 'OFFLINE_PREFER'] as DeliveryPreference[]).map((v) => (
                <button
                  key={v}
                  onClick={() => { setFilters((p) => ({ ...p, deliveryPreference: v })); setRecommendations([]) }}
                  className={`flex-1 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
                    filters.deliveryPreference === v
                      ? 'bg-primary-100 border-primary-400 text-primary-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {DELIVERY_LABELS[v]}
                </button>
              ))}
            </div>
          </FilterCard>

          {/* ── 선호 조건 ── */}
          <SectionHeader label="선호 조건" />

          {/* 6. 공강 희망 요일 */}
          <FilterCard title="공강 희망 요일">
            <div className="flex gap-1.5">
              {DAYS.map((d) => (
                <button
                  key={d}
                  onClick={() => toggleFreeDay(d)}
                  className={`flex-1 py-1.5 text-sm rounded-lg border font-medium transition-colors ${
                    filters.preferredFreeDays.includes(d)
                      ? 'bg-primary-100 border-primary-400 text-primary-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {DAY_LABELS[d]}
                </button>
              ))}
            </div>
          </FilterCard>

          {/* 7. 시간대 선호 */}
          <FilterCard title="시간대 선호">
            <div className="space-y-2">
              {([
                ['morning', '오전 (09:00~12:00)'],
                ['afternoon', '오후 (12:00~17:00)'],
                ['evening', '저녁 (17:00~21:00)'],
              ] as [keyof RecommendationFilters['timePreference'], string][]).map(([band, label]) => (
                <div key={band} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 w-28 shrink-0">{label}</span>
                  <div className="flex gap-1 flex-1">
                    {(['PREFER', 'NEUTRAL', 'DISLIKE'] as PreferenceLevel[]).map((lv) => (
                      <button
                        key={lv}
                        onClick={() => setTimePref(band, lv)}
                        className={`flex-1 py-1 text-xs rounded border transition-colors ${
                          filters.timePreference[band] === lv
                            ? lv === 'PREFER'
                              ? 'bg-green-100 border-green-400 text-green-700'
                              : lv === 'DISLIKE'
                              ? 'bg-red-100 border-red-400 text-red-700'
                              : 'bg-gray-200 border-gray-400 text-gray-700'
                            : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {PREF_LABELS[lv]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </FilterCard>

          {/* 8. 강의 사이 공백 허용 */}
          <FilterCard title="강의 사이 공백 허용 시간">
            <div className="space-y-1.5">
              {([0, 1, 2, 3] as GapLevel[]).map((lv) => (
                <label key={lv} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gapLevel"
                    checked={filters.allowedGapLevel === lv}
                    onChange={() => { setFilters((p) => ({ ...p, allowedGapLevel: lv })); setRecommendations([]) }}
                    className="text-primary-600"
                  />
                  <span className="text-sm text-gray-700">{GAP_LABELS[lv]}</span>
                </label>
              ))}
            </div>
          </FilterCard>

          {/* 9. 점심시간 확보 */}
          <FilterCard title="점심시간 확보 여부">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.needsLunchBreak}
                onChange={(e) => { setFilters((p) => ({ ...p, needsLunchBreak: e.target.checked })); setRecommendations([]) }}
                className="w-4 h-4 text-primary-600"
              />
              <span className="text-sm text-gray-700">12~14시 중 1시간 이상 여유 필요</span>
            </label>
          </FilterCard>

          {/* 10. 전공 과목 수 */}
          <FilterCard title="전공 최소 과목 수">
            <div className="flex gap-1.5 flex-wrap">
              {MAJOR_COUNT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setFilters((p) => ({ ...p, majorMinCount: opt.value })); setRecommendations([]) }}
                  className={`flex-1 py-1.5 text-xs rounded-lg border font-medium min-w-[48px] transition-colors ${
                    filters.majorMinCount === opt.value
                      ? 'bg-indigo-100 border-indigo-400 text-indigo-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">
              내 전공 그룹 기준 전공필수·전공선택·전공기초 과목 수 (하드 조건)
            </p>
            {!hasMajorClassificationContext(filters.userMajor) && (
              <p className="text-[11px] text-amber-600 mt-1">
                로그인 후 학과 정보가 있어야 전공 과목 수 조건을 정확히 적용할 수 있습니다.
              </p>
            )}
          </FilterCard>

          {/* 이수과목 자동 제외 안내 */}
          {completedCourseInfo.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
              <BookX className="w-3.5 h-3.5 shrink-0" />
              <span>이수과목 <strong>{completedCourseInfo.length}개</strong> 자동 제외 (동일과목 포함)</span>
            </div>
          )}
        </div>

        {/* ── 오른쪽 패널 ── */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* 추천 결과 카드 */}
          {hasResults && (
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="text-sm font-medium text-gray-700 mb-2">추천 결과 (상위 {recommendations.length}개)</div>
              <div className="flex gap-2">
                {recommendations.map((rec, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedIdx(i)}
                    className={`flex-1 rounded-lg border p-3 text-left transition-all ${
                      selectedIdx === i
                        ? 'border-primary-500 bg-primary-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-500">#{i + 1}</span>
                      <span className="text-sm font-bold text-primary-700">{rec.scoreBreakdown.total}점</span>
                    </div>
                    <div className="text-xs text-gray-600">{rec.totalCredits}학점</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {rec.reasons.slice(0, 2).map((r, ri) => (
                        <span key={ri} className="text-[10px] bg-primary-100 text-primary-700 rounded px-1 py-0.5">{r}</span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>

              {/* 선택된 추천 상세 */}
              {selectedRec && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs font-medium text-gray-600 mb-1.5">추천 이유</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedRec.reasons.map((r, i) => (
                      <span key={i} className="text-xs bg-white border border-gray-200 rounded px-2 py-0.5 text-gray-700">{r}</span>
                    ))}
                  </div>
                  <div className="mt-2 grid grid-cols-5 gap-1 text-[10px] text-gray-500">
                    <ScoreBar label="공강" value={selectedRec.scoreBreakdown.freeDay} max={30} />
                    <ScoreBar label="시간대" value={selectedRec.scoreBreakdown.timePreference} max={25} />
                    <ScoreBar label="공백" value={selectedRec.scoreBreakdown.gap} max={20} />
                    <ScoreBar label="점심" value={selectedRec.scoreBreakdown.lunch} max={15} />
                    <ScoreBar label="온/오프" value={selectedRec.scoreBreakdown.delivery} max={10} />
                  </div>
                  <div className="mt-2 text-xs text-gray-600 space-y-1">
                    <div>
                      선택된 분반: {[...filters.fixedSections, ...selectedRec.sections].map((s) => s.courseName).join(', ')}
                      {selectedRec.sections.length === 0 && filters.fixedSections.length > 0 && (
                        <span className="text-gray-400"> (고정 분반만으로 구성)</span>
                      )}
                    </div>
                    {(() => {
                      const all = [...filters.fixedSections, ...selectedRec.sections]
                      const total = all.reduce((s, r) => s + r.credits, 0)
                      const um = filters.userMajor
                      if (!hasMajorClassificationContext(um)) return null
                      const majorSections = all.filter((s) =>
                        isMajorCourseForUser(
                          s.college ?? '',
                          s.department ?? '',
                          s.categoryDescription ?? '',
                          um,
                        ),
                      )
                      const majorCredits = majorSections.reduce((s, r) => s + r.credits, 0)
                      if (total === 0) return null
                      return (
                        <div className="text-gray-400">
                          전공 {majorSections.length}과목 ({majorCredits}학점) / 전체 {total}학점
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 진단 메시지 */}
          {diagnosisMessage && !hasResults && (
            <div className="mx-4 mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
              <p className="text-sm text-yellow-800">{diagnosisMessage}</p>
            </div>
          )}

          {/* 시간표 그리드 */}
          <div className="flex-1 overflow-auto p-4">
            {!hasResults && !generating && !diagnosisMessage && previewItems.length === 0 && (
              <EmptyState />
            )}
            <TimetableGrid items={previewItems} editable={false} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 서브 컴포넌트 ────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <ChevronDown className="w-4 h-4 text-gray-400" />
      <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</span>
    </div>
  )
}

function FilterCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
      <div className="text-xs font-semibold text-gray-600 mb-2">{title}</div>
      {children}
    </div>
  )
}

function Chip({
  label,
  color,
  icon,
  onRemove,
}: {
  label: string
  color: 'emerald' | 'orange' | 'red'
  icon?: React.ReactNode
  onRemove: () => void
}) {
  const colorClass = {
    emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200',
    red: 'bg-red-100 text-red-800 border-red-200',
  }[color]

  return (
    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${colorClass}`}>
      {icon}
      <span className="max-w-[120px] truncate">{label}</span>
      <button onClick={onRemove} className="ml-0.5 hover:opacity-70">
        <X className="w-3 h-3" />
      </button>
    </span>
  )
}

function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span>{label}</span>
      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span>{Math.round(value)}</span>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center text-gray-400">
      <CalendarDays className="w-12 h-12 mb-3 text-gray-200" />
      <p className="text-sm font-medium text-gray-500">조건을 설정하고 최적 조합 찾기를 클릭하세요</p>
      <p className="text-xs mt-1">필수 포함 분반을 추가하면 즉시 시간표에 반영됩니다</p>
    </div>
  )
}

// CalendarDays import (lucide)
function CalendarDays(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="14" x2="8" y2="14" />
      <line x1="12" y1="14" x2="12" y2="14" />
      <line x1="16" y1="14" x2="16" y2="14" />
      <line x1="8" y1="18" x2="8" y2="18" />
      <line x1="12" y1="18" x2="12" y2="18" />
    </svg>
  )
}

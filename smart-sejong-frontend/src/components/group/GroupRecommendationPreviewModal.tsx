import { X } from 'lucide-react'
import { TimetableGrid } from '@/components/timetable/TimetableGrid'
import type { BackendCombinationDto, BackendSectionDto, TimetableItem } from '@/types'

interface Props {
  combo: BackendCombinationDto
  index: number
  activeTimetableName?: string | null
  activeTimetableItems?: TimetableItem[]
  onClose: () => void
}

function sectionToItems(
  section: BackendSectionDto,
  groupIndex: number,
  variant: TimetableItem['_variant'],
): TimetableItem[] {
  return section.times.map((time, timeIndex) => ({
    item_id: -(groupIndex * 100 + timeIndex + 1),
    section_id: section.sectionId,
    course_id: section.courseId,
    course_code: section.courseCode,
    section_number: section.sectionNumber,
    professor: section.professor,
    name: `${section.courseName}${section.sectionNumber ? ` (${section.sectionNumber})` : ''}`,
    day: time.dayOfWeekKor,
    start: time.startTime,
    end: time.endTime,
    is_pinned: false,
    type: 'section',
    _variant: variant,
  }))
}

function itemKey(item: Pick<TimetableItem, 'section_id' | 'day' | 'start' | 'end'>): string {
  return `${item.section_id ?? 'custom'}:${item.day}:${item.start}:${item.end}`
}

function markBaseItem(item: TimetableItem): TimetableItem {
  return {
    ...item,
    _variant: item.type === 'custom' ? 'custom-locked' : 'locked',
  }
}

function previewItems(
  activeTimetableItems: TimetableItem[],
  baseSections: BackendSectionDto[],
  addedSections: BackendSectionDto[],
): TimetableItem[] {
  const baseItems = activeTimetableItems.length
    ? activeTimetableItems.map(markBaseItem)
    : baseSections.flatMap((section, index) => sectionToItems(section, index + 1, 'locked'))

  const baseKeys = new Set(baseItems.map(itemKey))
  const recommendedItems = addedSections
    .flatMap((section, index) => sectionToItems(section, index + 300, 'recommended'))
    .filter((item) => !baseKeys.has(itemKey(item)))

  return [...baseItems, ...recommendedItems]
}

export function GroupRecommendationPreviewModal({
  combo,
  index,
  activeTimetableName,
  activeTimetableItems = [],
  onClose,
}: Props) {
  const baseSections = combo.baseSections ?? []
  const addedSections = combo.addedSections ?? combo.sections ?? []
  const items = previewItems(activeTimetableItems, baseSections, addedSections)
  const reasons = [...(combo.groupReasons ?? []), ...(combo.reasons ?? [])]
  const popularCount = combo.popularCourseCount ?? 0
  const wishlistAverage = combo.wishlistAverageCount ?? 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3 py-6">
      <div className="w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-4 py-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">#{index + 1} 추천안 시간표</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {activeTimetableName ?? '공유 시간표'} 기준으로 유지 수업과 추가 추천 수업을 함께 표시합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[calc(92vh-72px)] overflow-y-auto p-4 space-y-4">
          <div className="flex flex-wrap gap-2 text-xs">
            <SummaryChip label="총 학점" value={`${combo.totalCredits}학점`} />
            <SummaryChip label="기존 유지" value={`${baseSections.length}개`} />
            <SummaryChip label="추가 추천" value={`${addedSections.length}개`} />
            {wishlistAverage > 0 ? <SummaryChip label="관심 평균" value={`${wishlistAverage}명`} /> : null}
            {popularCount > 0 ? <SummaryChip label="인기 교양" value={`${popularCount}개`} /> : null}
          </div>

          <div className="rounded-lg border border-gray-100 p-2">
            <TimetableGrid items={items} />
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-emerald-500" />기존 유지 수업
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-orange-400" />개인 일정
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-blue-400" />추가 추천 수업
            </span>
          </div>

          {reasons.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {reasons.slice(0, 8).map((reason, reasonIndex) => (
                <span
                  key={`${reason}-${reasonIndex}`}
                  className="rounded border border-gray-100 bg-gray-50 px-2 py-1 text-[11px] text-gray-500"
                >
                  {reason}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-gray-600">
      {label} <strong className="text-gray-800">{value}</strong>
    </span>
  )
}

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Icon } from '@/components/ui/Icon'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { GroupRecommendationPreviewModal } from '@/components/group/GroupRecommendationPreviewModal'
import type { BackendCombinationDto, BackendSectionDto, TimetableItem } from '@/types'

const DAYS = ['월', '화', '수', '목', '금'] as const
type Day = typeof DAYS[number]
type Pref = 'PREFER' | 'NEUTRAL' | 'DISLIKE'
type GapLevel = 0 | 1 | 2 | 3

const GAP_LABELS: Record<GapLevel, string> = {
  0: '연강',
  1: '1시간 이하',
  2: '2시간 이하',
  3: '무제한',
}

const PREF_LABELS: Record<Pref, string> = { PREFER: '선호', NEUTRAL: '보통', DISLIKE: '비선호' }
const MAJOR_COUNT_OPTIONS = [
  { label: '상관없음', value: 0 },
  ...Array.from({ length: 7 }, (_, i) => ({ label: `${i + 1}개`, value: i + 1 })),
]

interface CustomBlock {
  id: string
  day: Day
  startTime: string
  endTime: string
  title: string
}

interface Props {
  groupId: number
  memberCount: number
  activeTimetableId?: number | null
  activeTimetableName?: string | null
  activeTimetableItems?: TimetableItem[]
}

export function GroupRecommendPanel({
  groupId,
  memberCount,
  activeTimetableId,
  activeTimetableName,
  activeTimetableItems = [],
}: Props) {
  const [open, setOpen] = useState(false)
  const [creditMin, setCreditMin] = useState(12)
  const [creditMax, setCreditMax] = useState(18)
  const [freeDays, setFreeDays] = useState<Day[]>([])
  const [morningPref, setMorningPref] = useState<Pref>('NEUTRAL')
  const [afternoonPref, setAfternoonPref] = useState<Pref>('NEUTRAL')
  const [eveningPref, setEveningPref] = useState<Pref>('NEUTRAL')
  const [gapLevel, setGapLevel] = useState<GapLevel>(2)
  const [needsLunch, setNeedsLunch] = useState(false)
  const [majorMinCount, setMajorMinCount] = useState(0)
  const [customBlocks, setCustomBlocks] = useState<CustomBlock[]>([])
  const [newBlock, setNewBlock] = useState<{ day: Day; startTime: string; endTime: string; title: string }>({
    day: '월',
    startTime: '09:00',
    endTime: '10:30',
    title: '',
  })
  const [showBlockForm, setShowBlockForm] = useState(false)
  const [result, setResult] = useState<BackendCombinationDto[]>([])
  const [diagnosisMessage, setDiagnosisMessage] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ combo: BackendCombinationDto; index: number } | null>(null)
  const currentUser = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  const hasActiveTimetable = activeTimetableId != null
  const canUseMajorCondition = Boolean(currentUser?.major)
  const targetCreditText = useMemo(() => `${creditMin}~${creditMax}학점`, [creditMin, creditMax])

  const { data: status } = useQuery({
    queryKey: ['group-recommend-status', groupId],
    queryFn: () => api.getGroupRecommendStatus(groupId),
    enabled: open,
    refetchInterval: 3000,
  })

  const submittedIds: number[] = status?.submittedMembers?.map((m) => m.userId) ?? []
  const iSubmitted = currentUser?.id != null && submittedIds.includes(currentUser.id)
  const submittedCount = submittedIds.length

  const toggleDay = (day: Day) =>
    setFreeDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))

  const addBlock = () => {
    if (!newBlock.startTime || !newBlock.endTime) return
    setCustomBlocks((prev) => [
      ...prev,
      { ...newBlock, id: crypto.randomUUID(), title: newBlock.title || '사전 일정' },
    ])
    setShowBlockForm(false)
    setNewBlock({ day: '월', startTime: '09:00', endTime: '10:30', title: '' })
  }

  const loadExcludedCourseCodes = async () => {
    try {
      const completed = await api.getCompletedCourses()
      const completedCodes = completed.map((course) => course.courseCode).filter(Boolean)
      if (!completedCodes.length) return []
      return [...await api.resolveEquivalentCodes(completedCodes)]
    } catch {
      return []
    }
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const excludedCourseCodes = await loadExcludedCourseCodes()
      return api.saveGroupRecommendInput(groupId, {
        fixedSectionIds: [],
        customBlocks: customBlocks.map((b) => ({
          title: b.title,
          day: b.day,
          startTime: b.startTime,
          endTime: b.endTime,
        })),
        excludedCourseIds: [],
        excludedCourseCodes,
        creditMin,
        creditMax,
        preferredFreeDays: freeDays,
        morningPreference: morningPref,
        afternoonPreference: afternoonPref,
        eveningPreference: eveningPref,
        allowedGapLevel: gapLevel,
        needsLunchBreak: needsLunch,
        majorMinCount,
        userMajor: currentUser?.major ?? '',
      })
    },
    onSuccess: () => {
      toast.success('내 조건을 저장했습니다.')
      queryClient.invalidateQueries({ queryKey: ['group-recommend-status', groupId] })
    },
    onError: () => toast.error('저장에 실패했습니다.'),
  })

  const generateMutation = useMutation({
    mutationFn: () => api.groupRecommend(groupId),
    onSuccess: (data) => {
      const combinations = data.combinations ?? []
      setResult(combinations)
      setDiagnosisMessage(data.diagnosisMessage ?? null)
      if (!combinations.length) {
        toast(data.diagnosisMessage ?? '조건에 맞는 추가 추천이 없습니다.')
      }
    },
    onError: () => toast.error('추천 요청에 실패했습니다.'),
  })

  return (
    <div className="card">
      <button className="w-full flex items-center justify-between" onClick={() => setOpen((v) => !v)}>
        <div className="flex items-center gap-2">
          <Icon name="auto_awesome" size={20} filled className="text-sky-600" />
          <h3 className="text-lg font-semibold">내 공유 시간표 보완 추천</h3>
          {submittedCount > 0 && (
            <span className="text-xs bg-sky-100 text-sky-700 rounded-full px-2 py-0.5">
              {submittedCount}/{memberCount} 저장
            </span>
          )}
        </div>
        <Icon name={open ? 'expand_less' : 'expand_more'} size={18} className="text-gray-400" />
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-gray-500">
            현재 공유한 내 시간표는 유지하고, 친구들과 맞추기 좋은 수업만 추가로 추천합니다.
          </p>

          {!hasActiveTimetable ? (
            <div className="rounded-2xl bg-amber-50 border border-amber-100 p-3 flex gap-2 text-sm text-amber-800">
              <Icon name="warning" size={16} className="mt-0.5 shrink-0 text-amber-500" />
              <span>먼저 이 그룹에 공유할 내 시간표를 선택해야 보완 추천을 받을 수 있습니다.</span>
            </div>
          ) : (
            <div className="rounded-2xl bg-gray-50 border border-gray-100 p-3 text-sm text-gray-700">
              <span className="text-gray-500">기준 시간표</span>
              <strong className="ml-2">{activeTimetableName ?? '선택한 공유 시간표'}</strong>
              <span className="ml-3 text-gray-500">목표 {targetCreditText}</span>
            </div>
          )}

          {status && (
            <div className="bg-gray-50 rounded-2xl p-3 space-y-1.5">
              <p className="text-xs font-medium text-gray-600 mb-1">조건 저장 현황</p>
              {status.submittedMembers?.map((m) => (
                <div key={m.userId} className="flex items-center gap-1.5 text-sm text-gray-700">
                  <Icon name="check_circle" size={16} filled className="text-green-500 shrink-0" /> {m.nickname}
                </div>
              ))}
              {submittedCount < memberCount && (
                <div className="flex items-center gap-1.5 text-sm text-gray-400">
                  <Icon name="radio_button_unchecked" size={16} className="text-gray-400 shrink-0" /> 미저장 ({memberCount - submittedCount}명)
                </div>
              )}
              <p className="text-[11px] text-gray-400 pt-1">
                저장하지 않은 친구는 공유 시간표만 참고합니다.
              </p>
            </div>
          )}

          <fieldset
            disabled={!hasActiveTimetable || saveMutation.isPending}
            className={`space-y-4 border-t pt-3 ${!hasActiveTimetable ? 'opacity-50' : ''}`}
          >
            <p className="text-sm font-medium text-gray-700">내 추가 추천 조건</p>

            <div>
              <p className="text-xs text-gray-500 mb-1.5">학점 범위</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={creditMin}
                  onChange={(e) => setCreditMin(Number(e.target.value))}
                  className="w-16 border rounded-xl px-2 py-1 text-sm text-center"
                />
                <span className="text-gray-400">~</span>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={creditMax}
                  onChange={(e) => setCreditMax(Number(e.target.value))}
                  className="w-16 border rounded-xl px-2 py-1 text-sm text-center"
                />
                <span className="text-sm text-gray-500">학점</span>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1.5">공강 희망 요일</p>
              <div className="flex gap-1.5">
                {DAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`w-9 h-9 rounded-full font-medium text-sm font-medium transition-colors ${
                      freeDays.includes(day)
                        ? 'bg-sky-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1.5">시간대 선호</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {([
                  ['오전', morningPref, setMorningPref],
                  ['오후', afternoonPref, setAfternoonPref],
                  ['저녁', eveningPref, setEveningPref],
                ] as [string, Pref, (value: Pref) => void][]).map(([label, value, setValue]) => (
                  <div key={label}>
                    <p className="text-center text-gray-500 mb-1">{label}</p>
                    {(['PREFER', 'NEUTRAL', 'DISLIKE'] as Pref[]).map((pref) => (
                      <button
                        key={pref}
                        type="button"
                        onClick={() => setValue(pref)}
                        className={`w-full py-0.5 rounded mb-0.5 text-[10px] border transition-colors ${
                          value === pref
                            ? 'bg-sky-600 text-white border-sky-600'
                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {PREF_LABELS[pref]}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1.5">강의 간 공백</p>
              <div className="flex gap-2 flex-wrap">
                {([0, 1, 2, 3] as GapLevel[]).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setGapLevel(level)}
                    className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                      gapLevel === level
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {GAP_LABELS[level]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1.5">전공 최소 과목 수</p>
              <div className="flex gap-2 flex-wrap">
                {MAJOR_COUNT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={!canUseMajorCondition && option.value > 0}
                    onClick={() => setMajorMinCount(option.value)}
                    className={`px-3 py-1 rounded-full text-xs border transition-colors disabled:opacity-40 ${
                      majorMinCount === option.value
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="lunch-group"
                checked={needsLunch}
                onChange={(e) => setNeedsLunch(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="lunch-group" className="text-sm text-gray-700">점심시간 확보 (12~13시 비우기)</label>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs text-gray-500">사전 일정 (해당 시간 제외)</p>
                <button
                  type="button"
                  onClick={() => setShowBlockForm((v) => !v)}
                  className="flex items-center gap-1 text-xs text-sky-600 hover:text-primary-700"
                >
                  <Icon name="add" size={14} /> 추가
                </button>
              </div>
              {customBlocks.map((block) => (
                <div key={block.id} className="flex items-center justify-between bg-gray-50 rounded px-2 py-1 mb-1 text-xs">
                  <span className="text-gray-700">{block.day} {block.startTime}~{block.endTime} {block.title}</span>
                  <button type="button" onClick={() => setCustomBlocks((prev) => prev.filter((item) => item.id !== block.id))}>
                    <Icon name="close" size={13} className="text-gray-400 hover:text-red-400" />
                  </button>
                </div>
              ))}
              {showBlockForm && (
                <div className="bg-gray-50 rounded p-2 space-y-2 mt-1">
                  <div className="flex gap-2 flex-wrap">
                    <input
                      type="text"
                      placeholder="일정 이름"
                      value={newBlock.title}
                      onChange={(e) => setNewBlock((prev) => ({ ...prev, title: e.target.value }))}
                      className="border rounded-xl px-2 py-1 text-xs flex-1 min-w-0"
                    />
                    <select
                      value={newBlock.day}
                      onChange={(e) => setNewBlock((prev) => ({ ...prev, day: e.target.value as Day }))}
                      className="border rounded-xl px-2 py-1 text-xs"
                    >
                      {DAYS.map((day) => <option key={day}>{day}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={newBlock.startTime}
                      onChange={(e) => setNewBlock((prev) => ({ ...prev, startTime: e.target.value }))}
                      className="border rounded-xl px-2 py-1 text-xs"
                    />
                    <span className="text-gray-400 text-xs">~</span>
                    <input
                      type="time"
                      value={newBlock.endTime}
                      onChange={(e) => setNewBlock((prev) => ({ ...prev, endTime: e.target.value }))}
                      className="border rounded-xl px-2 py-1 text-xs"
                    />
                    <button type="button" onClick={addBlock} className="ml-auto text-xs bg-sky-600 text-white rounded-full px-3 py-1">
                      확인
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !hasActiveTimetable}
              className={`w-full py-2 rounded-full text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                iSubmitted ? 'bg-green-50 text-green-700 border border-green-200' : 'btn-primary'
              } disabled:opacity-50`}
            >
              {saveMutation.isPending ? <Icon name="progress_activity" size={16} className="animate-spin-icon" />
                : iSubmitted ? <Icon name="check_circle" size={16} filled className="text-green-600" /> : null}
              {iSubmitted ? '조건 저장됨 (재저장)' : '내 조건 저장'}
            </button>
          </fieldset>

          <button
            type="button"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending || !hasActiveTimetable}
            className="w-full btn-primary disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {generateMutation.isPending
              ? <><Icon name="progress_activity" size={16} className="animate-spin-icon" /> 추천 중...</>
              : <><Icon name="auto_awesome" size={16} filled /> 내 시간표 보완 추천받기 ({submittedCount}명 조건 참고)</>}
          </button>

          {diagnosisMessage && result.length === 0 && (
            <div className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-3">
              {diagnosisMessage}
            </div>
          )}

          {result.length > 0 && (
            <div className="space-y-3 pt-2 border-t">
              <p className="text-sm font-medium text-gray-700">추천 결과 (상위 {Math.min(result.length, 3)}개)</p>
              {result.slice(0, 3).map((combo, index) => (
                <ResultCard
                  key={index}
                  combo={combo}
                  index={index}
                  activeTimetableName={activeTimetableName}
                  targetCreditText={targetCreditText}
                  onPreview={() => setPreview({ combo, index })}
                />
              ))}
            </div>
          )}
        </div>
      )}
      {preview ? (
        <GroupRecommendationPreviewModal
          combo={preview.combo}
          index={preview.index}
          activeTimetableName={activeTimetableName}
          activeTimetableItems={activeTimetableItems}
          onClose={() => setPreview(null)}
        />
      ) : null}
    </div>
  )
}

function ResultCard({
  combo,
  index,
  activeTimetableName,
  targetCreditText,
  onPreview,
}: {
  combo: BackendCombinationDto
  index: number
  activeTimetableName?: string | null
  targetCreditText: string
  onPreview: () => void
}) {
  const baseSections = combo.baseSections ?? []
  const addedSections = combo.addedSections ?? combo.sections ?? []
  const baseCredits = baseSections.reduce((sum, section) => sum + section.credits, 0)
  const personalScore = combo.personalScore ?? combo.scoreBreakdown?.personalScore ?? combo.scoreBreakdown?.total ?? 0
  const groupScore = combo.groupScore ?? combo.scoreBreakdown?.groupScore ?? 0
  const wishlistScore = combo.wishlistScore ?? combo.scoreBreakdown?.wishlistScore ?? 0
  const totalScore = combo.totalScore ?? combo.scoreBreakdown?.totalScore ?? combo.scoreBreakdown?.total ?? 0
  const reasons = [...(combo.groupReasons ?? []), ...(combo.reasons ?? [])]

  return (
    <div className="border border-gray-200 rounded-2xl p-3 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-sm font-semibold text-gray-700">#{index + 1}</span>
          <p className="text-xs text-gray-500 mt-0.5">
            {activeTimetableName ?? '공유 시간표'} 기준 · 기존 {baseCredits}학점 · 목표 {targetCreditText}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5 text-[11px]">
          <ScoreBadge label="개인" value={personalScore} />
          <ScoreBadge label="친구" value={groupScore} />
          <ScoreBadge label="관심" value={wishlistScore} mutedZero />
          <ScoreBadge label="총점" value={totalScore} strong />
        </div>
      </div>

      <SectionGroup title="유지되는 수업" sections={baseSections} emptyText="공유 시간표에 유지할 수업이 없습니다." muted />
      <SectionGroup title="추가 추천 수업" sections={addedSections} emptyText="추가할 수업 없이 현재 시간표가 조건을 만족합니다." />

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>총 {combo.totalCredits}학점</span>
        <button
          type="button"
          onClick={onPreview}
          className="inline-flex items-center gap-1 rounded-full border border-primary-100 bg-primary-50 px-2.5 py-1 font-medium text-primary-700 hover:bg-primary-100"
        >
          <Icon name="visibility" size={14} />
          시간표 보기
        </button>
      </div>

      {reasons.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {reasons.slice(0, 6).map((reason, reasonIndex) => (
            <span
              key={`${reason}-${reasonIndex}`}
              className="text-[10px] text-gray-500 bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5"
            >
              {reason}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function ScoreBadge({
  label,
  value,
  strong = false,
  mutedZero = false,
}: {
  label: string
  value: number
  strong?: boolean
  mutedZero?: boolean
}) {
  return (
    <span className={`rounded-full px-2 py-0.5 ${strong ? 'bg-sky-50 text-sky-700 font-bold' : 'bg-gray-50 text-gray-500'}`}>
      {label} {mutedZero && value <= 0 ? '-' : `${value}점`}
    </span>
  )
}

function SectionGroup({
  title,
  sections,
  emptyText,
  muted = false,
}: {
  title: string
  sections: BackendSectionDto[]
  emptyText: string
  muted?: boolean
}) {
  return (
    <div className={muted ? 'bg-gray-50 rounded-lg p-2' : ''}>
      <p className="text-[11px] font-medium text-gray-500 mb-1.5">{title}</p>
      {sections.length === 0 ? (
        <p className="text-xs text-gray-400">{emptyText}</p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {sections.map((section) => (
            <span
              key={`${title}-${section.sectionId}`}
              className={`text-[11px] border rounded-full px-2 py-0.5 ${
                muted ? 'bg-white border-gray-200 text-gray-500' : 'bg-white border-sky-100 text-gray-700'
              }`}
            >
              {section.courseName}{section.sectionNumber ? ` (${section.sectionNumber})` : ''}
              {section.wishlistCount && section.wishlistCount > 0 ? (
                <span className="ml-1 text-primary-600">관심 {section.wishlistCount}명</span>
              ) : null}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

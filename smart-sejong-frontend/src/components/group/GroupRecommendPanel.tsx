import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Sparkles, ChevronDown, ChevronUp, Loader2, CheckCircle2, Circle, Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import type { BackendCombinationDto } from '@/types'

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

interface CustomBlock { id: string; day: Day; startTime: string; endTime: string; title: string }

interface Props {
  groupId: number
  memberCount: number
}

export function GroupRecommendPanel({ groupId, memberCount }: Props) {
  const [open, setOpen] = useState(false)
  const [creditMin, setCreditMin] = useState(12)
  const [creditMax, setCreditMax] = useState(18)
  const [freeDays, setFreeDays] = useState<Day[]>([])
  const [morningPref, setMorningPref] = useState<Pref>('NEUTRAL')
  const [afternoonPref, setAfternoonPref] = useState<Pref>('NEUTRAL')
  const [eveningPref, setEveningPref] = useState<Pref>('NEUTRAL')
  const [gapLevel, setGapLevel] = useState<GapLevel>(2)
  const [needsLunch, setNeedsLunch] = useState(false)
  const [customBlocks, setCustomBlocks] = useState<CustomBlock[]>([])
  const [newBlock, setNewBlock] = useState<{ day: Day; startTime: string; endTime: string; title: string }>({
    day: '월', startTime: '09:00', endTime: '10:30', title: '',
  })
  const [showBlockForm, setShowBlockForm] = useState(false)
  const [result, setResult] = useState<BackendCombinationDto[]>([])
  const currentUser = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  const { data: status } = useQuery({
    queryKey: ['group-recommend-status', groupId],
    queryFn: () => api.getGroupRecommendStatus(groupId),
    enabled: open,
    refetchInterval: 3000,
  })

  const toggleDay = (day: Day) =>
    setFreeDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day])

  const addBlock = () => {
    if (!newBlock.startTime || !newBlock.endTime) return
    setCustomBlocks((prev) => [...prev, { ...newBlock, id: crypto.randomUUID(), title: newBlock.title || '사전 일정' }])
    setShowBlockForm(false)
    setNewBlock({ day: '월', startTime: '09:00', endTime: '10:30', title: '' })
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      api.saveGroupRecommendInput(groupId, {
        fixedSectionIds: [],
        customBlocks: customBlocks.map((b) => ({ title: b.title, day: b.day, startTime: b.startTime, endTime: b.endTime })),
        excludedCourseIds: [],
        excludedCourseCodes: [],
        creditMin,
        creditMax,
        preferredFreeDays: freeDays,
        morningPreference: morningPref,
        afternoonPreference: afternoonPref,
        eveningPreference: eveningPref,
        allowedGapLevel: gapLevel,
        needsLunchBreak: needsLunch,
        majorMinCount: 0,
        userMajor: '',
      }),
    onSuccess: () => {
      toast.success('내 조건을 저장했습니다.')
      queryClient.invalidateQueries({ queryKey: ['group-recommend-status', groupId] })
    },
    onError: () => toast.error('저장에 실패했습니다.'),
  })

  const generateMutation = useMutation({
    mutationFn: () => api.groupRecommend(groupId),
    onSuccess: (data) => {
      setResult(data.combinations ?? [])
      if (!data.combinations?.length) toast('조건에 맞는 시간표가 없습니다.', { icon: '⚠️' })
    },
    onError: () => toast.error('추천 요청에 실패했습니다.'),
  })

  const submittedIds: number[] = status?.submittedMembers?.map((m) => m.userId) ?? []
  const iSubmitted = currentUser?.id != null && submittedIds.includes(currentUser.id)
  const submittedCount = submittedIds.length

  return (
    <div className="card">
      <button className="w-full flex items-center justify-between" onClick={() => setOpen((v) => !v)}>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold">그룹 공동 시간표 추천</h3>
          {submittedCount > 0 && (
            <span className="text-xs bg-primary-100 text-primary-700 rounded-full px-2 py-0.5">
              {submittedCount}/{memberCount} 완료
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-gray-500">각 멤버가 조건을 저장하면, 모두를 만족하는 시간표를 추천합니다.</p>

          {/* 제출 현황 */}
          {status && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
              <p className="text-xs font-medium text-gray-600 mb-1">조건 제출 현황</p>
              {status.submittedMembers?.map((m) => (
                <div key={m.userId} className="flex items-center gap-1.5 text-sm text-gray-700">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> {m.nickname}
                </div>
              ))}
              {submittedCount < memberCount && (
                <div className="flex items-center gap-1.5 text-sm text-gray-400">
                  <Circle className="w-4 h-4 shrink-0" /> 대기 중 ({memberCount - submittedCount}명)
                </div>
              )}
            </div>
          )}

          {/* 내 조건 입력 */}
          <div className="space-y-4 border-t pt-3">
            <p className="text-sm font-medium text-gray-700">내 조건 입력</p>

            {/* 학점 */}
            <div>
              <p className="text-xs text-gray-500 mb-1.5">학점 범위</p>
              <div className="flex items-center gap-2">
                <input type="number" min={1} max={24} value={creditMin}
                  onChange={(e) => setCreditMin(Number(e.target.value))}
                  className="w-16 border rounded px-2 py-1 text-sm text-center" />
                <span className="text-gray-400">~</span>
                <input type="number" min={1} max={24} value={creditMax}
                  onChange={(e) => setCreditMax(Number(e.target.value))}
                  className="w-16 border rounded px-2 py-1 text-sm text-center" />
                <span className="text-sm text-gray-500">학점</span>
              </div>
            </div>

            {/* 공강 요일 */}
            <div>
              <p className="text-xs text-gray-500 mb-1.5">공강 희망 요일</p>
              <div className="flex gap-1.5">
                {DAYS.map((d) => (
                  <button key={d} onClick={() => toggleDay(d)}
                    className={`w-9 h-9 rounded-full text-sm font-medium transition-colors ${
                      freeDays.includes(d) ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>{d}</button>
                ))}
              </div>
            </div>

            {/* 시간대 선호 */}
            <div>
              <p className="text-xs text-gray-500 mb-1.5">시간대 선호</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {([['오전', morningPref, setMorningPref], ['오후', afternoonPref, setAfternoonPref], ['저녁', eveningPref, setEveningPref]] as [string, Pref, (v: Pref) => void][]).map(([label, val, set]) => (
                  <div key={label}>
                    <p className="text-center text-gray-500 mb-1">{label}</p>
                    {(['PREFER', 'NEUTRAL', 'DISLIKE'] as Pref[]).map((p) => (
                      <button key={p} onClick={() => set(p)}
                        className={`w-full py-0.5 rounded mb-0.5 text-[10px] border transition-colors ${
                          val === p ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                        }`}>{PREF_LABELS[p]}</button>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* 공백 수준 */}
            <div>
              <p className="text-xs text-gray-500 mb-1.5">강의 간 공백</p>
              <div className="flex gap-2 flex-wrap">
                {([0, 1, 2, 3] as GapLevel[]).map((lv) => (
                  <button key={lv} onClick={() => setGapLevel(lv)}
                    className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                      gapLevel === lv ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}>{GAP_LABELS[lv]}</button>
                ))}
              </div>
            </div>

            {/* 점심 */}
            <div className="flex items-center gap-2">
              <input type="checkbox" id="lunch-group" checked={needsLunch} onChange={(e) => setNeedsLunch(e.target.checked)} className="rounded" />
              <label htmlFor="lunch-group" className="text-sm text-gray-700">점심시간 확보 (12~13시 비우기)</label>
            </div>

            {/* 사전 일정 */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs text-gray-500">사전 일정 (해당 시간 제외)</p>
                <button onClick={() => setShowBlockForm((v) => !v)}
                  className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700">
                  <Plus className="w-3 h-3" /> 추가
                </button>
              </div>
              {customBlocks.map((b) => (
                <div key={b.id} className="flex items-center justify-between bg-gray-50 rounded px-2 py-1 mb-1 text-xs">
                  <span className="text-gray-700">{b.day} {b.startTime}~{b.endTime} {b.title}</span>
                  <button onClick={() => setCustomBlocks((prev) => prev.filter((x) => x.id !== b.id))}>
                    <X className="w-3 h-3 text-gray-400 hover:text-red-400" />
                  </button>
                </div>
              ))}
              {showBlockForm && (
                <div className="bg-gray-50 rounded p-2 space-y-2 mt-1">
                  <div className="flex gap-2 flex-wrap">
                    <input type="text" placeholder="일정 이름" value={newBlock.title}
                      onChange={(e) => setNewBlock((p) => ({ ...p, title: e.target.value }))}
                      className="border rounded px-2 py-1 text-xs flex-1 min-w-0" />
                    <select value={newBlock.day} onChange={(e) => setNewBlock((p) => ({ ...p, day: e.target.value as Day }))}
                      className="border rounded px-2 py-1 text-xs">
                      {DAYS.map((d) => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="time" value={newBlock.startTime}
                      onChange={(e) => setNewBlock((p) => ({ ...p, startTime: e.target.value }))}
                      className="border rounded px-2 py-1 text-xs" />
                    <span className="text-gray-400 text-xs">~</span>
                    <input type="time" value={newBlock.endTime}
                      onChange={(e) => setNewBlock((p) => ({ ...p, endTime: e.target.value }))}
                      className="border rounded px-2 py-1 text-xs" />
                    <button onClick={addBlock} className="ml-auto text-xs bg-primary-600 text-white rounded px-2 py-1">확인</button>
                  </div>
                </div>
              )}
            </div>

            {/* 저장 버튼 */}
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
              className={`w-full py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                iSubmitted ? 'bg-green-50 text-green-700 border border-green-200' : 'btn-primary'
              } disabled:opacity-50`}>
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" />
                : iSubmitted ? <CheckCircle2 className="w-4 h-4" /> : null}
              {iSubmitted ? '조건 저장됨 (재저장)' : '내 조건 저장'}
            </button>
          </div>

          {/* 추천 생성 */}
          <button onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending || submittedCount === 0}
            className="w-full btn-primary disabled:opacity-40 flex items-center justify-center gap-2">
            {generateMutation.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> 추천 중...</>
              : <><Sparkles className="w-4 h-4" /> 공동 시간표 추천받기 ({submittedCount}명 조건 반영)</>}
          </button>

          {/* 결과 */}
          {result.length > 0 && (
            <div className="space-y-3 pt-2 border-t">
              <p className="text-sm font-medium text-gray-700">추천 결과 (상위 {Math.min(result.length, 3)}개)</p>
              {result.slice(0, 3).map((combo, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">#{i + 1}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{combo.totalCredits}학점</span>
                      <span className="text-xs font-bold text-primary-600 bg-primary-50 rounded-full px-2 py-0.5">
                        {combo.scoreBreakdown.total}점
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {combo.sections.map((s) => (
                      <span key={s.sectionId} className="text-[11px] bg-white border border-gray-200 rounded-full px-2 py-0.5 text-gray-700">
                        {s.courseName}
                      </span>
                    ))}
                  </div>
                  {combo.reasons.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {combo.reasons.map((r, ri) => (
                        <span key={ri} className="text-[10px] text-gray-500 bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5">{r}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

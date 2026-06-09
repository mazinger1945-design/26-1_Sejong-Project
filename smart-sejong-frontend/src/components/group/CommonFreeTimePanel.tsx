import { useEffect, useMemo, useState } from 'react'
import { Clock4 } from 'lucide-react'
import {
  ANALYSIS_DAYS,
  SLOT_MINUTES,
  SLOT_START_HOUR,
  SLOTS_PER_DAY,
  buildAvailabilityRanges,
  type CommonAvailabilitySlot,
  type CommonFreeTime,
} from '@/lib/group/time'

interface CommonFreeTimePanelProps {
  items: CommonFreeTime[]
  availabilitySlots: CommonAvailabilitySlot[][]
  canAnalyze: boolean
}

const TYPE_BADGE: Record<CommonFreeTime['type'], string> = {
  team: 'bg-violet-100 text-violet-700 border-violet-200',
  lunch: 'bg-amber-100 text-amber-700 border-amber-200',
  free: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  short: 'bg-gray-100 text-gray-700 border-gray-200',
}

function slotTone(slot: CommonAvailabilitySlot | undefined, threshold: number): string {
  if (!slot || slot.availableCount < threshold) return 'bg-white'
  if (slot.isAllFree) return 'bg-emerald-500 border-emerald-500 text-white'
  if (slot.isTeamCandidate) return 'bg-violet-100 border-violet-200 text-violet-700'
  if (slot.isLunchCandidate) return 'bg-amber-100 border-amber-200 text-amber-700'
  return slot.availableCount >= threshold ? 'bg-sky-100 border-sky-200 text-sky-700' : 'bg-white'
}

function formatHour(slot: number) {
  const minutes = SLOT_START_HOUR * 60 + slot * SLOT_MINUTES
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function CommonFreeTimePanel({ items, availabilitySlots, canAnalyze }: CommonFreeTimePanelProps) {
  const totalMemberCount = availabilitySlots[0]?.[0]?.totalMemberCount ?? 0
  const [threshold, setThreshold] = useState(totalMemberCount)

  useEffect(() => {
    setThreshold(totalMemberCount)
  }, [totalMemberCount])

  const thresholdOptions = useMemo(() => {
    if (totalMemberCount < 2) return []
    const values = [totalMemberCount]
    if (totalMemberCount >= 3) values.push(totalMemberCount - 1)
    values.push(2)
    return Array.from(new Set(values))
  }, [totalMemberCount])

  const ranges = useMemo(
    () => buildAvailabilityRanges(availabilitySlots, threshold || totalMemberCount),
    [availabilitySlots, threshold, totalMemberCount],
  )
  const allFreeCount = useMemo(
    () => buildAvailabilityRanges(availabilitySlots, totalMemberCount).filter((item) => item.isAllFree).length,
    [availabilitySlots, totalMemberCount],
  )
  const teamCount = ranges.filter((item) => item.isTeamCandidate).length
  const lunchCount = ranges.filter((item) => item.isLunchCandidate).length

  return (
    <div className="card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Clock4 className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold">그룹 공강 지도</h3>
        </div>
        {canAnalyze && thresholdOptions.length > 0 ? (
          <div className="flex gap-1.5">
            {thresholdOptions.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setThreshold(value)}
                className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                  threshold === value
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {value === totalMemberCount ? '전체 가능' : `${value}명 이상`}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {!canAnalyze ? (
        <p className="text-sm text-gray-500">
          분석하려면 최소 2명 이상이 시간표를 공유해야 합니다.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <SummaryBox label="전원 가능" value={`${allFreeCount}개`} tone="emerald" />
            <SummaryBox label="팀플 가능" value={`${teamCount}개`} tone="violet" />
            <SummaryBox label="점심 가능" value={`${lunchCount}개`} tone="amber" />
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-[64px_repeat(5,minmax(0,1fr))] gap-1 mb-1">
                <div className="text-xs text-gray-500 text-center py-1">시간</div>
                {ANALYSIS_DAYS.map((day) => (
                  <div key={day} className="text-xs font-medium text-gray-600 text-center py-1">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-[64px_repeat(5,minmax(0,1fr))] gap-1">
                {Array.from({ length: SLOTS_PER_DAY }, (_, slot) => (
                  <TimeRow key={slot} slot={slot} threshold={threshold} slots={availabilitySlots} />
                ))}
              </div>
              <div className="flex flex-wrap gap-2 text-[11px] text-gray-500 mt-3">
                <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500" />전원 가능</span>
                <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-violet-100 border border-violet-200" />팀플 후보</span>
                <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-200" />점심 후보</span>
                <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-sky-100 border border-sky-200" />일부 가능</span>
              </div>
            </div>
          </div>

          {ranges.length === 0 ? (
            <p className="text-sm text-gray-500">
              현재 기준으로 표시할 공강 구간이 없습니다.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ranges.slice(0, 6).map((item, idx) => (
                <div
                  key={`${item.day}-${item.start}-${idx}`}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                    item.isAllFree ? TYPE_BADGE.free : item.isLunchCandidate ? TYPE_BADGE.lunch : TYPE_BADGE.short
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium">
                      {item.day} {item.start}~{item.end}
                    </p>
                    <p className="text-xs opacity-80 mt-0.5">
                      {item.label} · {item.availableCount}/{item.totalMemberCount}명
                    </p>
                  </div>
                  <span className="text-xs font-medium opacity-80">
                    {Math.round(item.durationMinutes)}분
                  </span>
                </div>
              ))}
            </div>
          )}

          {items.length > 0 ? (
            <div className="text-xs text-gray-400">
              전원 공강 기준: {items.slice(0, 3).map((item) => `${item.day} ${item.start}~${item.end}`).join(', ')}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

function TimeRow({
  slot,
  threshold,
  slots,
}: {
  slot: number
  threshold: number
  slots: CommonAvailabilitySlot[][]
}) {
  return (
    <>
      <div className="text-[11px] text-gray-400 text-center py-1 border-r border-gray-100">
        {formatHour(slot)}
      </div>
      {ANALYSIS_DAYS.map((day, dayIdx) => {
        const current = slots[dayIdx]?.[slot]
        const label = current ? `${current.availableCount}/${current.totalMemberCount}` : ''
        return (
          <div
            key={`${day}-${slot}`}
            className={`h-7 rounded border border-gray-100 flex items-center justify-center text-[10px] ${slotTone(current, threshold)}`}
            title={current ? `${day} ${current.start}~${current.end} ${current.availableNicknames.join(', ')}` : undefined}
          >
            {current && current.availableCount >= threshold ? label : ''}
          </div>
        )
      })}
    </>
  )
}

function SummaryBox({ label, value, tone }: { label: string; value: string; tone: 'emerald' | 'violet' | 'amber' }) {
  const className = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
  }[tone]

  return (
    <div className={`rounded-lg border px-3 py-2 ${className}`}>
      <p className="text-[11px] opacity-80">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  )
}

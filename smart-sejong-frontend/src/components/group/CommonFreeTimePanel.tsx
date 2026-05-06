import { Clock4 } from 'lucide-react'
import type { CommonFreeTime } from '@/lib/group/time'

interface CommonFreeTimePanelProps {
  items: CommonFreeTime[]
  canAnalyze: boolean
}

const TYPE_BADGE: Record<CommonFreeTime['type'], string> = {
  team: 'bg-violet-100 text-violet-700 border-violet-200',
  lunch: 'bg-amber-100 text-amber-700 border-amber-200',
  free: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  short: 'bg-gray-100 text-gray-700 border-gray-200',
}

export function CommonFreeTimePanel({ items, canAnalyze }: CommonFreeTimePanelProps) {
  return (
    <div className="card">
      <div className="flex items-center space-x-2 mb-3">
        <Clock4 className="w-5 h-5 text-primary-600" />
        <h3 className="text-lg font-semibold">공통 빈 시간</h3>
      </div>
      {!canAnalyze ? (
        <p className="text-sm text-gray-500">
          분석하려면 최소 2명 이상이 시간표를 공유해야 합니다.
        </p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-500">
          현재 공유된 시간표 기준으로 모든 멤버가 함께 비는 시간이 없습니다.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {items.map((item, idx) => (
            <div
              key={`${item.day}-${item.start}-${idx}`}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 ${TYPE_BADGE[item.type]}`}
            >
              <div>
                <p className="text-sm font-medium">
                  {item.day} {item.start}~{item.end}
                </p>
                <p className="text-xs opacity-80 mt-0.5">{item.label}</p>
              </div>
              <span className="text-xs font-medium opacity-80">
                {Math.round(item.durationMinutes)}분
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

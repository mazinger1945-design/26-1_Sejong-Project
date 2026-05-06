import { useNavigate } from 'react-router-dom'
import { Calendar, Check } from 'lucide-react'
import type { Timetable } from '@/types'

interface ActiveTimetableSelectorProps {
  timetables: Timetable[] | undefined
  isLoading: boolean
  activeTimetableId?: number | null
  onSelect: (timetableId: number) => void
  isUpdating: boolean
}

export function ActiveTimetableSelector({
  timetables,
  isLoading,
  activeTimetableId,
  onSelect,
  isUpdating,
}: ActiveTimetableSelectorProps) {
  const navigate = useNavigate()
  const hasTimetables = (timetables?.length ?? 0) > 0

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">내 공유 시간표</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            이 그룹에 공유할 내 시간표를 선택해주세요.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse h-14 bg-gray-200 rounded-lg" />
          ))}
        </div>
      ) : hasTimetables ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {timetables!.map((tt) => {
            const selected = activeTimetableId === tt.id
            return (
              <button
                key={tt.id}
                type="button"
                disabled={isUpdating || selected}
                onClick={() => onSelect(tt.id)}
                className={`flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-all text-left ${
                  selected
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                } disabled:cursor-default`}
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{tt.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(tt.created_at).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                {selected ? (
                  <span className="flex items-center space-x-1 text-primary-600 text-xs font-medium ml-2 flex-shrink-0">
                    <Check className="w-4 h-4" />
                    <span>공유 중</span>
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-6">
          <Calendar className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-700 mb-1">아직 만든 시간표가 없습니다.</p>
          <p className="text-xs text-gray-500 mb-3">
            시간표를 공유해야 친구들과 공통 빈 시간과 같이 듣는 수업을 분석할 수 있습니다.
          </p>
          <button onClick={() => navigate('/timetable')} className="btn-primary text-sm">
            내 시간표 만들기
          </button>
        </div>
      )}

      {hasTimetables && activeTimetableId == null ? (
        <p className="text-xs text-amber-600 mt-3">
          공유할 시간표를 아직 선택하지 않았습니다.
        </p>
      ) : null}
    </div>
  )
}

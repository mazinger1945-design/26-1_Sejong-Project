import { useState } from 'react'
import { X } from 'lucide-react'

const DAYS = ['월', '화', '수', '목', '금'] as const
type Day = (typeof DAYS)[number]

export interface CustomItemDraft {
  name: string
  day: Day
  start: string
  end: string
}

interface CustomItemModalProps {
  initial?: CustomItemDraft
  title?: string
  submitLabel?: string
  isSubmitting?: boolean
  onClose: () => void
  onSubmit: (draft: CustomItemDraft) => void
}

const DEFAULT_DRAFT: CustomItemDraft = {
  name: '',
  day: '월',
  start: '09:00',
  end: '10:30',
}

export function CustomItemModal({
  initial,
  title = '내 일정 추가',
  submitLabel = '추가',
  isSubmitting,
  onClose,
  onSubmit,
}: CustomItemModalProps) {
  const [draft, setDraft] = useState<CustomItemDraft>(() =>
    initial ? { ...initial, day: (initial.day as Day) ?? '월' } : DEFAULT_DRAFT,
  )
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = () => {
    if (!draft.name.trim()) {
      setError('일정 제목을 입력해주세요.')
      return
    }
    if (draft.start >= draft.end) {
      setError('종료 시간이 시작 시간보다 늦어야 합니다.')
      return
    }
    setError(null)
    onSubmit({ ...draft, name: draft.name.trim() })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">제목</span>
            <input
              autoFocus
              type="text"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="예: 알바, 동아리, 약속"
              className="input"
            />
          </label>
          <div className="grid grid-cols-3 gap-2">
            <label>
              <span className="block text-sm font-medium text-gray-700 mb-1">요일</span>
              <select
                value={draft.day}
                onChange={(e) => setDraft((d) => ({ ...d, day: e.target.value as Day }))}
                className="input"
              >
                {DAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="block text-sm font-medium text-gray-700 mb-1">시작</span>
              <input
                type="time"
                value={draft.start}
                onChange={(e) => setDraft((d) => ({ ...d, start: e.target.value }))}
                className="input"
              />
            </label>
            <label>
              <span className="block text-sm font-medium text-gray-700 mb-1">종료</span>
              <input
                type="time"
                value={draft.end}
                onChange={(e) => setDraft((d) => ({ ...d, end: e.target.value }))}
                className="input"
              />
            </label>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
          <button onClick={onClose} className="btn-secondary text-sm">
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {isSubmitting ? '저장 중...' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

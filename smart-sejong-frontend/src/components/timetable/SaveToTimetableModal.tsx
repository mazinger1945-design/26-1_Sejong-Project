import { useState } from 'react'
import { X } from 'lucide-react'
import type { Timetable } from '@/types'

interface SaveToTimetableModalProps {
  timetables: Timetable[] | undefined
  isLoading: boolean
  isSaving: boolean
  onClose: () => void
  onSave: (target: { mode: 'new'; name: string } | { mode: 'existing'; timetableId: number }) => void
}

export function SaveToTimetableModal({
  timetables,
  isLoading,
  isSaving,
  onClose,
  onSave,
}: SaveToTimetableModalProps) {
  const [mode, setMode] = useState<'new' | 'existing'>('new')
  const [name, setName] = useState('내 시간표')
  const [timetableId, setTimetableId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSave = () => {
    if (mode === 'new') {
      if (!name.trim()) {
        setError('시간표 이름을 입력해주세요.')
        return
      }
      onSave({ mode: 'new', name: name.trim() })
      return
    }
    if (timetableId == null) {
      setError('저장할 시간표를 선택해주세요.')
      return
    }
    onSave({ mode: 'existing', timetableId })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">시간표에 저장</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex bg-gray-100 rounded-lg p-1 text-sm">
            <button
              type="button"
              onClick={() => {
                setMode('new')
                setError(null)
              }}
              className={`flex-1 py-1.5 rounded-md transition-colors ${
                mode === 'new' ? 'bg-white shadow-sm font-medium text-gray-900' : 'text-gray-600'
              }`}
            >
              새 시간표
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('existing')
                setError(null)
              }}
              className={`flex-1 py-1.5 rounded-md transition-colors ${
                mode === 'existing' ? 'bg-white shadow-sm font-medium text-gray-900' : 'text-gray-600'
              }`}
            >
              기존 시간표에 추가
            </button>
          </div>

          {mode === 'new' ? (
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">시간표 이름</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                autoFocus
              />
            </label>
          ) : isLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (timetables?.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-500">
              저장된 시간표가 없습니다. "새 시간표"로 생성해주세요.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {timetables!.map((tt) => (
                <button
                  key={tt.id}
                  type="button"
                  onClick={() => setTimetableId(tt.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg border-2 transition-colors ${
                    timetableId === tt.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900">{tt.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(tt.created_at).toLocaleDateString('ko-KR')}
                  </p>
                </button>
              ))}
            </div>
          )}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
          <button onClick={onClose} className="btn-secondary text-sm">
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {isSaving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

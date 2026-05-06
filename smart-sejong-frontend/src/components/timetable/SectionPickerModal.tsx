import { useEffect, useRef, useState } from 'react'
import { Loader2, Search, X } from 'lucide-react'
import { api } from '@/lib/api'
import type { GroupedSectionRaw } from '@/types'

interface SectionPickerModalProps {
  onClose: () => void
  onPick: (section: GroupedSectionRaw) => void
  isPicking?: boolean
  title?: string
}

export function SectionPickerModal({
  onClose,
  onPick,
  isPicking,
  title = '분반 추가',
}: SectionPickerModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GroupedSectionRaw[]>([])
  const [loading, setLoading] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    timer.current = setTimeout(async () => {
      try {
        const data = await api.searchGroupedSections(trimmed)
        setResults(data)
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [query])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="과목명 또는 교수명 검색"
              className="input pl-9"
            />
            {loading ? (
              <Loader2 className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 animate-spin" />
            ) : null}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {query.trim() === '' ? (
            <p className="p-6 text-sm text-gray-500 text-center">
              과목명 또는 교수명을 입력해주세요.
            </p>
          ) : !loading && results.length === 0 ? (
            <p className="p-6 text-sm text-gray-500 text-center">
              검색 결과가 없습니다.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {results.map((r) => (
                <li key={`${r.sectionId}`}>
                  <button
                    type="button"
                    disabled={isPicking}
                    onClick={() => onPick(r)}
                    className="w-full text-left px-4 py-3 hover:bg-primary-50 transition-colors disabled:opacity-60"
                  >
                    <p className="text-sm font-medium text-gray-900">
                      {r.courseName}
                      {r.sectionNumber ? (
                        <span className="text-xs text-gray-500 ml-1">({r.sectionNumber}분반)</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {r.professor ? `${r.professor} · ` : ''}
                      {r.credits}학점
                      {r.times.length > 0
                        ? ` · ${r.times.map((t) => `${t.dayOfWeekKor} ${t.startTime}~${t.endTime}`).join(', ')}`
                        : ''}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

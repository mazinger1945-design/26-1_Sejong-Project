import { Pencil, Pin, Trash2, X } from 'lucide-react'
import type { TimetableItem } from '@/types'

interface ItemDetailModalProps {
  item: TimetableItem
  onClose: () => void
  onEdit?: () => void
  onDelete: () => void
  onTogglePin?: () => void
  isMutating?: boolean
}

export function ItemDetailModal({
  item,
  onClose,
  onEdit,
  onDelete,
  onTogglePin,
  isMutating,
}: ItemDetailModalProps) {
  const isCustom = item.type === 'custom'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold truncate pr-4">{item.name}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-2 text-sm text-gray-700">
          <p>
            <span className="font-medium text-gray-500 mr-2">시간</span>
            {item.day} {item.start}~{item.end}
          </p>
          <p>
            <span className="font-medium text-gray-500 mr-2">유형</span>
            {isCustom ? '내 일정' : '강의 분반'}
          </p>
          {!isCustom && item.professor ? (
            <p>
              <span className="font-medium text-gray-500 mr-2">교수</span>
              {item.professor}
            </p>
          ) : null}
          {!isCustom && item.section_number ? (
            <p>
              <span className="font-medium text-gray-500 mr-2">분반</span>
              {item.section_number}
            </p>
          ) : null}
          {!isCustom && item.course_code ? (
            <p>
              <span className="font-medium text-gray-500 mr-2">학수번호</span>
              {item.course_code}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap justify-end gap-2 p-4 border-t border-gray-200">
          {onTogglePin ? (
            <button
              type="button"
              onClick={onTogglePin}
              disabled={isMutating}
              className="btn-secondary text-sm flex items-center gap-1 disabled:opacity-50"
            >
              <Pin className={`w-4 h-4 ${item.is_pinned ? 'fill-current text-yellow-600' : ''}`} />
              {item.is_pinned ? '고정 해제' : '고정'}
            </button>
          ) : null}
          {isCustom && onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              disabled={isMutating}
              className="btn-secondary text-sm flex items-center gap-1 disabled:opacity-50"
            >
              <Pencil className="w-4 h-4" />
              수정
            </button>
          ) : null}
          <button
            type="button"
            onClick={onDelete}
            disabled={isMutating}
            className="text-sm flex items-center gap-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            삭제
          </button>
        </div>
      </div>
    </div>
  )
}

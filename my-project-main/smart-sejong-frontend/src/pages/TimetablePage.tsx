import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import { Plus, Save, Trash2, Edit2, Calendar } from 'lucide-react'
import { TimetableGrid } from '@/components/timetable/TimetableGrid'
import type { Timetable } from '@/types'

export default function TimetablePage() {
  const queryClient = useQueryClient()
  const [selectedTimetable, setSelectedTimetable] = useState<number | null>(null)
  const [newTimetableName, setNewTimetableName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const { data: timetables, isLoading } = useQuery({
    queryKey: ['timetables'],
    queryFn: () => api.getTimetables(),
  })

  const { data: timetableDetails } = useQuery({
    queryKey: ['timetable', selectedTimetable],
    queryFn: () => api.getTimetable(selectedTimetable!),
    enabled: !!selectedTimetable,
  })

  const createMutation = useMutation({
    mutationFn: (name: string) => api.createTimetable({ name }),
    onSuccess: (data) => {
      toast.success('시간표가 생성되었습니다!')
      queryClient.invalidateQueries({ queryKey: ['timetables'] })
      setSelectedTimetable(data.timetable_id)
      setIsCreating(false)
      setNewTimetableName('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteTimetable(id),
    onSuccess: () => {
      toast.success('시간표가 삭제되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['timetables'] })
      if (selectedTimetable) {
        setSelectedTimetable(null)
      }
    },
  })

  const updateNameMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      api.updateTimetableName(id, name),
    onSuccess: () => {
      toast.success('시간표 이름이 변경되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['timetables'] })
      queryClient.invalidateQueries({ queryKey: ['timetable', selectedTimetable] })
    },
  })

  const handleCreate = () => {
    if (!newTimetableName.trim()) {
      toast.error('시간표 이름을 입력해주세요.')
      return
    }
    createMutation.mutate(newTimetableName)
  }

  const handleDelete = (id: number) => {
    if (confirm('정말 이 시간표를 삭제하시겠습니까?')) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">내 시간표</h1>
          <p className="text-gray-600">저장된 시간표를 관리하고 편집하세요</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>새 시간표</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 시간표 목록 */}
        <div className="lg:col-span-1">
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">보관함</h2>
            {isCreating ? (
              <div className="mb-4 p-4 border-2 border-dashed border-primary-300 rounded-lg">
                <input
                  type="text"
                  value={newTimetableName}
                  onChange={(e) => setNewTimetableName(e.target.value)}
                  placeholder="시간표 이름 입력..."
                  className="input mb-2"
                  autoFocus
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleCreate}
                    disabled={createMutation.isPending}
                    className="flex-1 btn-primary text-sm disabled:opacity-50"
                  >
                    {createMutation.isPending ? '생성 중...' : '생성'}
                  </button>
                  <button
                    onClick={() => {
                      setIsCreating(false)
                      setNewTimetableName('')
                    }}
                    className="btn-secondary text-sm"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : null}

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse h-20 bg-gray-200 rounded-lg"></div>
                ))}
              </div>
            ) : timetables && timetables.length > 0 ? (
              <div className="space-y-2">
                {timetables.map((timetable) => (
                  <TimetableCard
                    key={timetable.id}
                    timetable={timetable}
                    isSelected={selectedTimetable === timetable.id}
                    onSelect={() => setSelectedTimetable(timetable.id)}
                    onDelete={() => handleDelete(timetable.id)}
                    onUpdateName={(name) =>
                      updateNameMutation.mutate({ id: timetable.id, name })
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>저장된 시간표가 없습니다</p>
              </div>
            )}
          </div>
        </div>

        {/* 시간표 상세 */}
        <div className="lg:col-span-2">
          {selectedTimetable && timetableDetails ? (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">{timetableDetails.name}</h2>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(timetableDetails.created_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              </div>
              {timetableDetails.items && timetableDetails.items.length > 0 ? (
                <TimetableGrid items={timetableDetails.items} />
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>이 시간표에는 항목이 없습니다.</p>
                  <p className="text-sm mt-2">AI 추천 페이지에서 항목을 추가하세요.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="card">
              <div className="text-center py-12 text-gray-500">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>시간표를 선택하거나 새로 생성하세요</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface TimetableCardProps {
  timetable: Timetable
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
  onUpdateName: (name: string) => void
}

function TimetableCard({
  timetable,
  isSelected,
  onSelect,
  onDelete,
  onUpdateName,
}: TimetableCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(timetable.name)

  const handleSave = () => {
    if (editName.trim()) {
      onUpdateName(editName)
      setIsEditing(false)
    }
  }

  return (
    <div
      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
        isSelected
          ? 'border-primary-500 bg-primary-50'
          : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
      onClick={onSelect}
    >
      {isEditing ? (
        <div onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="input mb-2"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleSave()
              }}
              className="flex-1 btn-primary text-xs"
            >
              저장
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsEditing(false)
                setEditName(timetable.name)
              }}
              className="btn-secondary text-xs"
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-gray-900 flex-1">{timetable.name}</h3>
            <div className="flex space-x-1" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsEditing(true)
                }}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
                className="p-1 text-gray-400 hover:text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            {new Date(timetable.created_at).toLocaleDateString('ko-KR')}
          </p>
        </>
      )}
    </div>
  )
}


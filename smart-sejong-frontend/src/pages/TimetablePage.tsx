import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Calendar, CalendarPlus, Edit2, Plus, Search, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { TimetableGrid } from '@/components/timetable/TimetableGrid'
import { SectionPickerModal } from '@/components/timetable/SectionPickerModal'
import { CustomItemModal, type CustomItemDraft } from '@/components/timetable/CustomItemModal'
import { ItemDetailModal } from '@/components/timetable/ItemDetailModal'
import type { Timetable, TimetableItem } from '@/types'

type EditorState =
  | { kind: 'idle' }
  | { kind: 'add-section' }
  | { kind: 'add-custom' }
  | { kind: 'view-item'; item: TimetableItem }
  | { kind: 'edit-custom'; item: TimetableItem }

export default function TimetablePage() {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const { data: timetables, isLoading } = useQuery({
    queryKey: ['timetables'],
    queryFn: () => api.getTimetables(),
  })

  const createMutation = useMutation({
    mutationFn: (name: string) => api.createTimetable({ name }),
    onSuccess: (data) => {
      toast.success('시간표를 만들었습니다.')
      queryClient.invalidateQueries({ queryKey: ['timetables'] })
      setSelectedId(data.timetable_id)
      setIsCreating(false)
      setNewName('')
    },
    onError: () => toast.error('시간표 생성에 실패했습니다.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteTimetable(id),
    onSuccess: () => {
      toast.success('시간표를 삭제했습니다.')
      queryClient.invalidateQueries({ queryKey: ['timetables'] })
      setSelectedId(null)
    },
    onError: () => toast.error('시간표 삭제에 실패했습니다.'),
  })

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => api.updateTimetableName(id, name),
    onSuccess: () => {
      toast.success('이름을 변경했습니다.')
      queryClient.invalidateQueries({ queryKey: ['timetables'] })
      if (selectedId != null) {
        queryClient.invalidateQueries({ queryKey: ['timetable', selectedId] })
      }
    },
    onError: () => toast.error('이름 변경에 실패했습니다.'),
  })

  const handleCreate = () => {
    if (!newName.trim()) {
      toast.error('시간표 이름을 입력해주세요.')
      return
    }
    createMutation.mutate(newName.trim())
  }

  const handleDelete = (id: number) => {
    if (!confirm('이 시간표를 삭제하시겠습니까? 관련 그룹 공유도 함께 해제됩니다.')) return
    deleteMutation.mutate(id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">내 시간표</h1>
          <p className="text-gray-600">시간표를 만들고 강의·일정을 자유롭게 추가하세요.</p>
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
        <div className="lg:col-span-1">
          <TimetableListPanel
            timetables={timetables}
            isLoading={isLoading}
            selectedId={selectedId}
            isCreating={isCreating}
            newName={newName}
            isSaving={createMutation.isPending}
            onSelect={setSelectedId}
            onStartCreate={() => setIsCreating(true)}
            onCancelCreate={() => {
              setIsCreating(false)
              setNewName('')
            }}
            onChangeNewName={setNewName}
            onSubmitCreate={handleCreate}
            onDelete={handleDelete}
            onRename={(id, name) => renameMutation.mutate({ id, name })}
          />
        </div>

        <div className="lg:col-span-2">
          {selectedId != null ? (
            <TimetableEditor timetableId={selectedId} />
          ) : (
            <EmptyEditor />
          )}
        </div>
      </div>
    </div>
  )
}

interface TimetableListPanelProps {
  timetables: Timetable[] | undefined
  isLoading: boolean
  selectedId: number | null
  isCreating: boolean
  newName: string
  isSaving: boolean
  onSelect: (id: number) => void
  onStartCreate: () => void
  onCancelCreate: () => void
  onChangeNewName: (name: string) => void
  onSubmitCreate: () => void
  onDelete: (id: number) => void
  onRename: (id: number, name: string) => void
}

function TimetableListPanel({
  timetables,
  isLoading,
  selectedId,
  isCreating,
  newName,
  isSaving,
  onSelect,
  onCancelCreate,
  onChangeNewName,
  onSubmitCreate,
  onDelete,
  onRename,
}: TimetableListPanelProps) {
  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-4">보관함</h2>
      {isCreating ? (
        <div className="mb-4 p-4 border-2 border-dashed border-primary-300 rounded-lg">
          <input
            type="text"
            value={newName}
            onChange={(e) => onChangeNewName(e.target.value)}
            placeholder="시간표 이름 입력..."
            className="input mb-2"
            autoFocus
          />
          <div className="flex space-x-2">
            <button
              onClick={onSubmitCreate}
              disabled={isSaving}
              className="flex-1 btn-primary text-sm disabled:opacity-50"
            >
              {isSaving ? '생성 중...' : '생성'}
            </button>
            <button onClick={onCancelCreate} className="btn-secondary text-sm">
              취소
            </button>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse h-20 bg-gray-200 rounded-lg" />
          ))}
        </div>
      ) : timetables && timetables.length > 0 ? (
        <div className="space-y-2">
          {timetables.map((tt) => (
            <TimetableCard
              key={tt.id}
              timetable={tt}
              isSelected={selectedId === tt.id}
              onSelect={() => onSelect(tt.id)}
              onDelete={() => onDelete(tt.id)}
              onRename={(name) => onRename(tt.id, name)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">저장된 시간표가 없습니다.</p>
          <p className="text-xs mt-1">상단의 "새 시간표"로 시작해보세요.</p>
        </div>
      )}
    </div>
  )
}

interface TimetableCardProps {
  timetable: Timetable
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
  onRename: (name: string) => void
}

function TimetableCard({ timetable, isSelected, onSelect, onDelete, onRename }: TimetableCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(timetable.name)

  const handleSave = () => {
    const trimmed = editName.trim()
    if (trimmed && trimmed !== timetable.name) {
      onRename(trimmed)
    }
    setIsEditing(false)
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
          />
          <div className="flex space-x-2">
            <button onClick={handleSave} className="flex-1 btn-primary text-xs">
              저장
            </button>
            <button
              onClick={() => {
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
            <h3 className="font-semibold text-gray-900 flex-1 truncate">{timetable.name}</h3>
            <div className="flex space-x-1" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsEditing(true)
                }}
                className="p-1 text-gray-400 hover:text-gray-600"
                aria-label="이름 수정"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
                className="p-1 text-gray-400 hover:text-red-600"
                aria-label="시간표 삭제"
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

function EmptyEditor() {
  return (
    <div className="card">
      <div className="text-center py-12 text-gray-500">
        <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <p>왼쪽에서 시간표를 선택하거나 새로 만들어주세요.</p>
      </div>
    </div>
  )
}

interface TimetableEditorProps {
  timetableId: number
}

function TimetableEditor({ timetableId }: TimetableEditorProps) {
  const queryClient = useQueryClient()
  const [editorState, setEditorState] = useState<EditorState>({ kind: 'idle' })

  const { data: detail, isLoading } = useQuery({
    queryKey: ['timetable', timetableId],
    queryFn: () => api.getTimetable(timetableId),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['timetable', timetableId] })
    queryClient.invalidateQueries({ queryKey: ['timetables'] })
  }

  const addSectionMutation = useMutation({
    mutationFn: (sectionId: number) => api.addSectionItem(timetableId, sectionId),
    onSuccess: () => {
      toast.success('강의를 추가했습니다.')
      invalidate()
      setEditorState({ kind: 'idle' })
    },
    onError: () => toast.error('강의 추가에 실패했습니다.'),
  })

  const addCustomMutation = useMutation({
    mutationFn: (draft: CustomItemDraft) => api.addCustomItem(timetableId, draft),
    onSuccess: () => {
      toast.success('일정을 추가했습니다.')
      invalidate()
      setEditorState({ kind: 'idle' })
    },
    onError: () => toast.error('일정 추가에 실패했습니다.'),
  })

  const updateCustomMutation = useMutation({
    mutationFn: ({ itemId, draft }: { itemId: number; draft: CustomItemDraft }) =>
      api.updateCustomItem(itemId, draft),
    onSuccess: () => {
      toast.success('일정을 수정했습니다.')
      invalidate()
      setEditorState({ kind: 'idle' })
    },
    onError: () => toast.error('일정 수정에 실패했습니다.'),
  })

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: number) => api.deleteItem(itemId),
    onSuccess: () => {
      toast.success('항목을 삭제했습니다.')
      invalidate()
      setEditorState({ kind: 'idle' })
    },
    onError: () => toast.error('항목 삭제에 실패했습니다.'),
  })

  const togglePinMutation = useMutation({
    mutationFn: ({ itemId, isPinned }: { itemId: number; isPinned: boolean }) =>
      api.togglePin(itemId, isPinned),
    onSuccess: () => invalidate(),
    onError: () => toast.error('고정 변경에 실패했습니다.'),
  })

  if (isLoading || !detail) {
    return <div className="card animate-pulse h-96 bg-gray-100" />
  }

  const items = detail.items ?? []

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold truncate">{detail.name}</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {new Date(detail.created_at).toLocaleDateString('ko-KR')} · 항목 {items.length}개
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEditorState({ kind: 'add-section' })}
            className="btn-secondary text-sm flex items-center gap-1"
          >
            <Search className="w-4 h-4" />
            강의 추가
          </button>
          <button
            onClick={() => setEditorState({ kind: 'add-custom' })}
            className="btn-primary text-sm flex items-center gap-1"
          >
            <CalendarPlus className="w-4 h-4" />
            내 일정 추가
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-10 text-gray-500 border border-dashed border-gray-200 rounded-lg">
          <p className="text-sm">아직 추가된 항목이 없습니다.</p>
          <p className="text-xs mt-1">
            "강의 추가"로 분반을 검색하거나 "내 일정 추가"로 알바·동아리 같은 일정을 넣어보세요.
          </p>
        </div>
      ) : (
        <TimetableGrid
          items={items}
          editable
          onItemClick={(item) => setEditorState({ kind: 'view-item', item })}
          onPinToggle={(itemId, isPinned) => togglePinMutation.mutate({ itemId, isPinned })}
        />
      )}

      {editorState.kind === 'add-section' ? (
        <SectionPickerModal
          onClose={() => setEditorState({ kind: 'idle' })}
          onPick={(section) => {
            if (hasConflict(items, section.times)) {
              if (!confirm('기존 항목과 시간이 겹칩니다. 그래도 추가할까요?')) return
            }
            addSectionMutation.mutate(section.sectionId)
          }}
          isPicking={addSectionMutation.isPending}
        />
      ) : null}

      {editorState.kind === 'add-custom' ? (
        <CustomItemModal
          onClose={() => setEditorState({ kind: 'idle' })}
          onSubmit={(draft) => {
            if (hasConflict(items, [{ dayOfWeekKor: draft.day, startTime: draft.start, endTime: draft.end }])) {
              if (!confirm('기존 항목과 시간이 겹칩니다. 그래도 추가할까요?')) return
            }
            addCustomMutation.mutate(draft)
          }}
          isSubmitting={addCustomMutation.isPending}
        />
      ) : null}

      {editorState.kind === 'edit-custom' ? (
        <CustomItemModal
          title="내 일정 수정"
          submitLabel="저장"
          initial={{
            name: editorState.item.name,
            day: editorState.item.day as CustomItemDraft['day'],
            start: editorState.item.start,
            end: editorState.item.end,
          }}
          onClose={() => setEditorState({ kind: 'idle' })}
          onSubmit={(draft) =>
            updateCustomMutation.mutate({ itemId: editorState.item.item_id, draft })
          }
          isSubmitting={updateCustomMutation.isPending}
        />
      ) : null}

      {editorState.kind === 'view-item' ? (
        <ItemDetailModal
          item={editorState.item}
          onClose={() => setEditorState({ kind: 'idle' })}
          onEdit={
            editorState.item.type === 'custom'
              ? () => setEditorState({ kind: 'edit-custom', item: editorState.item })
              : undefined
          }
          onDelete={() => {
            const isCustom = editorState.item.type === 'custom'
            const message = isCustom
              ? '이 일정을 삭제하시겠습니까?'
              : '이 강의의 모든 시간 항목이 함께 삭제됩니다. 계속할까요?'
            if (!confirm(message)) return
            deleteItemMutation.mutate(editorState.item.item_id)
          }}
          onTogglePin={() =>
            togglePinMutation.mutate({
              itemId: editorState.item.item_id,
              isPinned: !editorState.item.is_pinned,
            })
          }
          isMutating={deleteItemMutation.isPending || togglePinMutation.isPending}
        />
      ) : null}
    </div>
  )
}

function hasConflict(
  items: TimetableItem[],
  candidate: { dayOfWeekKor: string; startTime: string; endTime: string }[],
): boolean {
  const toMinute = (t: string) => {
    const [h = '0', m = '0'] = t.split(':')
    return Number(h) * 60 + Number(m)
  }
  for (const c of candidate) {
    const cs = toMinute(c.startTime)
    const ce = toMinute(c.endTime)
    for (const item of items) {
      if (item.day !== c.dayOfWeekKor) continue
      const is = toMinute(item.start)
      const ie = toMinute(item.end)
      if (cs < ie && is < ce) return true
    }
  }
  return false
}

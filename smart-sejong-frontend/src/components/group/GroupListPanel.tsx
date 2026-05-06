import { Plus, UserPlus, Users } from 'lucide-react'
import type { Group } from '@/types'

interface GroupListPanelProps {
  groups: Group[] | undefined
  isLoading: boolean
  selectedGroupId: number | null
  isCreating: boolean
  newGroupName: string
  isCreatingPending: boolean
  onSelect: (id: number) => void
  onStartCreate: () => void
  onCancelCreate: () => void
  onChangeNewName: (name: string) => void
  onSubmitCreate: () => void
  onOpenJoin: () => void
}

export function GroupListPanel({
  groups,
  isLoading,
  selectedGroupId,
  isCreating,
  newGroupName,
  isCreatingPending,
  onSelect,
  onStartCreate,
  onCancelCreate,
  onChangeNewName,
  onSubmitCreate,
  onOpenJoin,
}: GroupListPanelProps) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">내 그룹</h2>
        <div className="flex space-x-2">
          <button
            onClick={onStartCreate}
            className="btn-primary text-xs flex items-center space-x-1 px-3 py-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>생성</span>
          </button>
          <button
            onClick={onOpenJoin}
            className="btn-secondary text-xs flex items-center space-x-1 px-3 py-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>참가</span>
          </button>
        </div>
      </div>

      {isCreating ? (
        <div className="mb-4 p-4 border-2 border-dashed border-primary-300 rounded-lg">
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => onChangeNewName(e.target.value)}
            placeholder="그룹 이름 입력..."
            className="input mb-2"
            autoFocus
          />
          <div className="flex space-x-2">
            <button
              onClick={onSubmitCreate}
              disabled={isCreatingPending}
              className="flex-1 btn-primary text-sm disabled:opacity-50"
            >
              {isCreatingPending ? '생성 중...' : '생성'}
            </button>
            <button onClick={onCancelCreate} className="btn-secondary text-sm">
              취소
            </button>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse h-16 bg-gray-200 rounded-lg" />
          ))}
        </div>
      ) : groups && groups.length > 0 ? (
        <div className="space-y-2">
          {groups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => onSelect(group.id)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                selectedGroupId === group.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <h3 className="font-semibold text-gray-900">{group.name}</h3>
              <p className="text-xs text-gray-500 mt-1">멤버 {group.count}명</p>
              {selectedGroupId === group.id ? (
                <p className="text-xs text-primary-600 mt-1">선택됨</p>
              ) : null}
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium text-gray-700 mb-1">
            아직 참여 중인 그룹이 없습니다.
          </p>
          <p className="text-xs text-gray-500 leading-relaxed">
            친구들과 시간표를 맞추려면 그룹을 만들거나
            <br />
            초대코드로 참가하세요.
          </p>
        </div>
      )}
    </div>
  )
}

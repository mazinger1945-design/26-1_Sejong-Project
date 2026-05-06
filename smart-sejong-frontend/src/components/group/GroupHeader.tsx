import { Copy, LogOut, Users } from 'lucide-react'
import type { GroupDetail } from '@/types'

interface GroupHeaderProps {
  group: GroupDetail
  onCopyInviteCode: (code: string) => void
  onLeave: () => void
  isLeaving: boolean
}

export function GroupHeader({ group, onCopyInviteCode, onLeave, isLeaving }: GroupHeaderProps) {
  const inviteCode = group.invite_code
  return (
    <div className="card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-primary-600" />
            <h2 className="text-xl font-semibold truncate">{group.name}</h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            멤버 {group.count ?? group.members?.length ?? 0}명
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {inviteCode ? (
            <div className="flex items-center bg-gray-100 rounded-lg px-3 py-2 space-x-2">
              <span className="text-xs text-gray-500">초대코드</span>
              <span className="text-sm font-mono font-semibold tracking-wider text-gray-900">
                {inviteCode}
              </span>
              <button
                type="button"
                onClick={() => onCopyInviteCode(inviteCode)}
                className="p-1 text-gray-500 hover:text-primary-600 transition-colors"
                title="초대코드 복사"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          ) : null}
          <button
            type="button"
            onClick={onLeave}
            disabled={isLeaving}
            className="btn-secondary flex items-center space-x-1 text-sm disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            <span>나가기</span>
          </button>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import { Plus, Users, Copy, LogOut, UserPlus } from 'lucide-react'
import { TimetableGrid } from '@/components/timetable/TimetableGrid'
import type { Group, GroupMember } from '@/types'

export default function GroupPage() {
  const queryClient = useQueryClient()
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null)
  const [newGroupName, setNewGroupName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [createdInviteCode, setCreatedInviteCode] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [isJoinMode, setIsJoinMode] = useState(false)

  const { data: groups, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.getGroups(),
  })

  const { data: groupDetails } = useQuery({
    queryKey: ['group', selectedGroup],
    queryFn: () => api.getGroup(selectedGroup!),
    enabled: !!selectedGroup,
    refetchInterval: 5000, // 5초마다 실시간 업데이트
  })

  const createMutation = useMutation({
    mutationFn: (name: string) => api.createGroup({ group_name: name }),
    onSuccess: (data) => {
      toast.success(`그룹이 생성되었습니다! 초대 코드: ${data.invite_code}`)
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      setSelectedGroup(data.group_id)
      setCreatedInviteCode(data.invite_code)
      setIsCreating(false)
      setNewGroupName('')
      setShowInviteModal(true)
    },
  })

  const joinMutation = useMutation({
    mutationFn: (code: string) => api.joinGroup({ invite_code: code }),
    onSuccess: (data) => {
      toast.success('그룹에 참가했습니다!')
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      setSelectedGroup(data.group_id)
      setInviteCode('')
    },
  })

  const leaveMutation = useMutation({
    mutationFn: (id: number) => api.leaveGroup(id),
    onSuccess: () => {
      toast.success('그룹에서 나갔습니다.')
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      setSelectedGroup(null)
    },
  })

  const copyMutation = useMutation({
    mutationFn: ({ sectionId, targetId }: { sectionId: number; targetId: number }) =>
      api.copyRecommendation({ section_id: sectionId, target_id: targetId }),
    onSuccess: () => {
      toast.success('과목이 내 시간표로 복사되었습니다!')
    },
  })

  const handleCreate = () => {
    if (!newGroupName.trim()) {
      toast.error('그룹 이름을 입력해주세요.')
      return
    }
    createMutation.mutate(newGroupName)
  }

  const handleJoin = () => {
    if (!inviteCode.trim()) {
      toast.error('초대 코드를 입력해주세요.')
      return
    }
    joinMutation.mutate(inviteCode)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">그룹 협동</h1>
          <p className="text-gray-600">친구들과 함께 최적의 시간표를 찾아보세요</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsCreating(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>그룹 생성</span>
          </button>
          <button
            onClick={() => {
              setIsJoinMode(true)
              setShowInviteModal(true)
            }}
            className="btn-secondary flex items-center space-x-2"
          >
            <UserPlus className="w-5 h-5" />
            <span>참가하기</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 그룹 목록 */}
        <div className="lg:col-span-1">
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">내 그룹</h2>
            {isCreating ? (
              <div className="mb-4 p-4 border-2 border-dashed border-primary-300 rounded-lg">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="그룹 이름 입력..."
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
                      setNewGroupName('')
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
                {[1, 2].map((i) => (
                  <div key={i} className="animate-pulse h-16 bg-gray-200 rounded-lg"></div>
                ))}
              </div>
            ) : groups && groups.length > 0 ? (
              <div className="space-y-2">
                {groups.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    isSelected={selectedGroup === group.id}
                    onSelect={() => setSelectedGroup(group.id)}
                    onLeave={() => leaveMutation.mutate(group.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>참여 중인 그룹이 없습니다</p>
              </div>
            )}
          </div>
        </div>

        {/* 그룹 상세 */}
        <div className="lg:col-span-2">
          {selectedGroup && groupDetails ? (
            <div className="space-y-4">
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold">{groupDetails.name}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      멤버 {groupDetails.members?.length || 0}명
                    </p>
                  </div>
                  <button
                    onClick={() => leaveMutation.mutate(selectedGroup)}
                    className="btn-secondary flex items-center space-x-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>나가기</span>
                  </button>
                </div>

                {/* 멤버 목록 */}
                {groupDetails.members && groupDetails.members.length > 0 && (
                  <div className="space-y-4">
                    {groupDetails.members.map((member) => (
                      <MemberTimetable
                        key={member.user_id}
                        member={member}
                        groupId={selectedGroup}
                        onCopy={(sectionId, targetId) =>
                          copyMutation.mutate({ sectionId, targetId })
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="text-center py-12 text-gray-500">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>그룹을 선택하거나 새로 생성하세요</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 초대 코드 모달 */}
      {showInviteModal && (
        <InviteModal
          inviteCode={isJoinMode ? '' : createdInviteCode}
          isJoinMode={isJoinMode}
          onClose={() => {
            setShowInviteModal(false)
            setCreatedInviteCode('')
            setIsJoinMode(false)
            setInviteCode('')
          }}
          onJoin={handleJoin}
          inviteCodeInput={inviteCode}
          setInviteCodeInput={setInviteCode}
        />
      )}
    </div>
  )
}

interface GroupCardProps {
  group: Group
  isSelected: boolean
  onSelect: () => void
  onLeave: () => void
}

function GroupCard({ group, isSelected, onSelect, onLeave }: GroupCardProps) {
  return (
    <div
      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
        isSelected
          ? 'border-primary-500 bg-primary-50'
          : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{group.name}</h3>
          <p className="text-xs text-gray-500 mt-1">멤버 {group.count}명</p>
        </div>
      </div>
    </div>
  )
}

interface MemberTimetableProps {
  member: GroupMember
  groupId: number
  onCopy: (sectionId: number, targetId: number) => void
}

function MemberTimetable({ member, groupId, onCopy }: MemberTimetableProps) {
  const { data: timetable } = useQuery({
    queryKey: ['member-timetable', groupId, member.user_id],
    queryFn: () => api.getMemberTimetable(groupId, member.user_id),
    enabled: !!groupId && !!member.user_id,
  })
  
  const handleCopy = (sectionId: number) => {
    // TODO: 사용자가 선택한 시간표 ID를 받아야 함
    // 임시로 첫 번째 시간표 ID를 사용하거나 사용자에게 선택하게 해야 함
    onCopy(sectionId, 1)
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">{member.nickname}</h3>
      </div>
      {timetable && timetable.items && timetable.items.length > 0 ? (
        <>
          <TimetableGrid items={timetable.items} />
          <div className="mt-3 flex flex-wrap gap-2">
            {timetable.items
              .filter((item) => item.type === 'section')
              .map((item) => (
                <button
                  key={item.item_id}
                  onClick={() => {
                    if (item.section_id) {
                      handleCopy(item.section_id)
                    }
                  }}
                  className="btn-secondary text-xs flex items-center space-x-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{item.name} 복사</span>
                </button>
              ))}
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-gray-400 text-sm">
          공유된 시간표가 없습니다
        </div>
      )}
    </div>
  )
}

interface InviteModalProps {
  inviteCode: string
  isJoinMode: boolean
  onClose: () => void
  onJoin: () => void
  inviteCodeInput: string
  setInviteCodeInput: (code: string) => void
}

function InviteModal({
  inviteCode,
  isJoinMode,
  onClose,
  onJoin,
  inviteCodeInput,
  setInviteCodeInput,
}: InviteModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">
          {isJoinMode ? '그룹 참가' : '그룹 초대'}
        </h2>
        {!isJoinMode && inviteCode ? (
          <div>
            <p className="text-sm text-gray-600 mb-2">초대 코드를 공유하세요:</p>
            <div className="bg-gray-100 p-4 rounded-lg text-center mb-4">
              <p className="text-2xl font-bold text-primary-600">{inviteCode}</p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(inviteCode)
                // toast는 부모 컴포넌트에서 처리
              }}
              className="w-full btn-secondary mb-2"
            >
              코드 복사
            </button>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              초대 코드 입력
            </label>
            <input
              type="text"
              value={inviteCodeInput}
              onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
              placeholder="6자리 코드"
              maxLength={6}
              className="input mb-4 text-center text-2xl font-bold tracking-widest"
            />
            <button onClick={onJoin} className="w-full btn-primary">
              참가하기
            </button>
          </div>
        )}
        <button onClick={onClose} className="w-full mt-2 btn-secondary">
          닫기
        </button>
      </div>
    </div>
  )
}


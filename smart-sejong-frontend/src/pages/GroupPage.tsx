import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Icon } from '@/components/ui/Icon'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { GroupListPanel } from '@/components/group/GroupListPanel'
import { GroupHeader } from '@/components/group/GroupHeader'
import { ActiveTimetableSelector } from '@/components/group/ActiveTimetableSelector'
import { GroupAnalysisPanel } from '@/components/group/GroupAnalysisPanel'
import { CommonFreeTimePanel } from '@/components/group/CommonFreeTimePanel'
import { GroupRecommendPanel } from '@/components/group/GroupRecommendPanel'
import { GroupMemberCard } from '@/components/group/GroupMemberCard'
import { InviteCodeModal } from '@/components/group/InviteCodeModal'
import { analyzeGroup } from '@/lib/group/analysis'
import type { GroupMember } from '@/types'

export default function GroupPage() {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((state) => state.user)

  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [isJoinMode, setIsJoinMode] = useState(false)
  const [inviteCodeInput, setInviteCodeInput] = useState('')
  const [createdInviteCode, setCreatedInviteCode] = useState('')

  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.getGroups(),
  })

  const { data: groupDetail, isLoading: groupDetailLoading } = useQuery({
    queryKey: ['group', selectedGroupId],
    queryFn: () => api.getGroup(selectedGroupId as number),
    enabled: selectedGroupId != null,
    refetchInterval: 8000,
  })

  const { data: timetables, isLoading: timetablesLoading } = useQuery({
    queryKey: ['timetables'],
    queryFn: () => api.getTimetables(),
  })

  const meMember = useMemo<GroupMember | undefined>(() => {
    if (!groupDetail?.members) return undefined
    if (currentUser?.id != null) {
      const byId = groupDetail.members.find((m) => m.user_id === currentUser.id)
      if (byId) return byId
    }
    if (currentUser?.nickname) {
      return groupDetail.members.find((m) => m.nickname === currentUser.nickname)
    }
    return undefined
  }, [groupDetail, currentUser])

  const meActiveTimetableId = meMember?.active_timetable_id ?? null

  const analysis = useMemo(() => {
    if (!groupDetail?.members) return null
    return analyzeGroup(groupDetail.members, meMember?.user_id)
  }, [groupDetail, meMember])

  const invalidateGroup = () => {
    queryClient.invalidateQueries({ queryKey: ['groups'] })
    if (selectedGroupId != null) {
      queryClient.invalidateQueries({ queryKey: ['group', selectedGroupId] })
    }
  }

  const createMutation = useMutation({
    mutationFn: (name: string) => api.createGroup({ group_name: name }),
    onSuccess: (data) => {
      toast.success('그룹이 생성되었습니다.')
      invalidateGroup()
      setSelectedGroupId(data.group_id)
      setCreatedInviteCode(data.invite_code)
      setIsCreating(false)
      setNewGroupName('')
      setIsJoinMode(false)
      setShowInviteModal(true)
    },
    onError: () => toast.error('그룹 생성에 실패했습니다.'),
  })

  const joinMutation = useMutation({
    mutationFn: (code: string) => api.joinGroup({ invite_code: code }),
    onSuccess: (data) => {
      toast.success('그룹에 참가했습니다.')
      invalidateGroup()
      setSelectedGroupId(data.group_id)
      setInviteCodeInput('')
      setShowInviteModal(false)
    },
    onError: () => toast.error('참가에 실패했습니다. 초대코드를 확인해주세요.'),
  })

  const leaveMutation = useMutation({
    mutationFn: (id: number) => api.leaveGroup(id),
    onSuccess: () => {
      toast.success('그룹에서 나갔습니다.')
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      setSelectedGroupId(null)
    },
    onError: () => toast.error('그룹 나가기에 실패했습니다.'),
  })

  const setActiveMutation = useMutation({
    mutationFn: ({ groupId, timetableId }: { groupId: number; timetableId: number }) =>
      api.setActiveTimetable(groupId, timetableId),
    onSuccess: () => {
      toast.success('공유 시간표를 변경했습니다.')
      if (selectedGroupId != null) {
        queryClient.invalidateQueries({ queryKey: ['group', selectedGroupId] })
      }
    },
    onError: () => toast.error('공유 시간표 변경에 실패했습니다.'),
  })

  const copyMutation = useMutation({
    mutationFn: ({ sectionId, targetId }: { sectionId: number; targetId: number }) =>
      api.copyRecommendation({ section_id: sectionId, target_id: targetId }),
    onSuccess: () => {
      toast.success('과목이 내 시간표에 추가되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['timetables'] })
      if (meActiveTimetableId != null) {
        queryClient.invalidateQueries({ queryKey: ['timetable', meActiveTimetableId] })
      }
      if (selectedGroupId != null) {
        queryClient.invalidateQueries({ queryKey: ['group', selectedGroupId] })
      }
    },
    onError: () => toast.error('과목 추가에 실패했습니다.'),
  })

  const handleCreate = () => {
    if (!newGroupName.trim()) {
      toast.error('그룹 이름을 입력해주세요.')
      return
    }
    createMutation.mutate(newGroupName.trim())
  }

  const handleJoin = () => {
    if (!inviteCodeInput.trim()) {
      toast.error('초대 코드를 입력해주세요.')
      return
    }
    joinMutation.mutate(inviteCodeInput.trim())
  }

  const handleLeave = (id: number) => {
    if (!confirm('정말 이 그룹에서 나가시겠습니까?')) return
    leaveMutation.mutate(id)
  }

  const handleCopyInvite = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      toast.success('초대코드가 복사되었습니다.')
    } catch {
      toast.error('복사에 실패했습니다.')
    }
  }

  const handleCopySection = (sectionId: number) => {
    if (meActiveTimetableId == null) {
      toast.error('먼저 이 그룹에 공유할 내 시간표를 선택해주세요.')
      return
    }
    copyMutation.mutate({ sectionId, targetId: meActiveTimetableId })
  }

  const handleSetActive = (timetableId: number) => {
    if (selectedGroupId == null) return
    setActiveMutation.mutate({ groupId: selectedGroupId, timetableId })
  }

  const copyEnabled = meActiveTimetableId != null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">그룹 시간표</h1>
        <p className="text-gray-600">친구들과 함께 시간표를 맞추고 공통 빈 시간을 찾아보세요.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <GroupListPanel
            groups={groups}
            isLoading={groupsLoading}
            selectedGroupId={selectedGroupId}
            isCreating={isCreating}
            newGroupName={newGroupName}
            isCreatingPending={createMutation.isPending}
            onSelect={setSelectedGroupId}
            onStartCreate={() => setIsCreating(true)}
            onCancelCreate={() => {
              setIsCreating(false)
              setNewGroupName('')
            }}
            onChangeNewName={setNewGroupName}
            onSubmitCreate={handleCreate}
            onOpenJoin={() => {
              setIsJoinMode(true)
              setShowInviteModal(true)
            }}
          />
        </div>

        <div className="lg:col-span-2 space-y-4">
          {selectedGroupId == null ? (
            <EmptyDetail message="좌측에서 그룹을 선택하거나 새로 만들어보세요." />
          ) : groupDetailLoading || !groupDetail ? (
            <div className="card animate-pulse h-40 bg-gray-100" />
          ) : (
            <>
              <GroupHeader
                group={groupDetail}
                onCopyInviteCode={handleCopyInvite}
                onLeave={() => handleLeave(groupDetail.id)}
                isLeaving={leaveMutation.isPending}
              />

              <ActiveTimetableSelector
                timetables={timetables}
                isLoading={timetablesLoading}
                activeTimetableId={meActiveTimetableId}
                onSelect={handleSetActive}
                isUpdating={setActiveMutation.isPending}
              />

              {analysis ? (
                <>
                  <GroupAnalysisPanel
                    analysis={analysis}
                    meHasShared={!!meMember && meActiveTimetableId != null}
                    onCopyCourse={handleCopySection}
                    copyEnabled={copyEnabled}
                    isCopyPending={copyMutation.isPending}
                  />

                  <CommonFreeTimePanel
                    items={analysis.commonFree}
                    availabilitySlots={analysis.availabilitySlots}
                    canAnalyze={analysis.canAnalyze}
                  />

                  <GroupRecommendPanel
                    groupId={selectedGroupId}
                    memberCount={groupDetail.members.length}
                    activeTimetableId={meActiveTimetableId}
                    activeTimetableName={meMember?.active_timetable_name}
                    activeTimetableItems={meMember?.timetable ?? []}
                  />

                  <div className="card">
                    <h3 className="text-lg font-semibold mb-3">멤버별 시간표</h3>
                    {groupDetail.members.length === 0 ? (
                      <p className="text-sm text-gray-500">아직 멤버가 없습니다.</p>
                    ) : (
                      <div className="space-y-3">
                        {groupDetail.members.map((member) => {
                          const match = analysis.memberMatches.find((m) => m.userId === member.user_id)
                          return (
                            <GroupMemberCard
                              key={member.user_id}
                              member={member}
                              match={match}
                              isMe={member.user_id === meMember?.user_id}
                              onCopySection={handleCopySection}
                              copyEnabled={copyEnabled}
                              isCopyPending={copyMutation.isPending}
                            />
                          )
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </>
          )}
        </div>
      </div>

      {showInviteModal ? (
        <InviteCodeModal
          isJoinMode={isJoinMode}
          inviteCode={createdInviteCode}
          inviteCodeInput={inviteCodeInput}
          setInviteCodeInput={setInviteCodeInput}
          onJoin={handleJoin}
          onCopy={() => handleCopyInvite(createdInviteCode)}
          onClose={() => {
            setShowInviteModal(false)
            setIsJoinMode(false)
            setInviteCodeInput('')
            setCreatedInviteCode('')
          }}
          isJoining={joinMutation.isPending}
        />
      ) : null}
    </div>
  )
}

function EmptyDetail({ message }: { message: string }) {
  return (
    <div className="card">
      <div className="text-center py-12 text-gray-500">
        <Icon name="group" size={64} className="mx-auto mb-4 text-gray-300" />
        <p>{message}</p>
      </div>
    </div>
  )
}

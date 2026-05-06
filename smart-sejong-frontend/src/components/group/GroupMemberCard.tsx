import { Copy, Sparkles } from 'lucide-react'
import { TimetableGrid } from '@/components/timetable/TimetableGrid'
import type { GroupMember } from '@/types'
import type { MemberMatch } from '@/lib/group/analysis'

interface GroupMemberCardProps {
  member: GroupMember
  match?: MemberMatch
  isMe: boolean
  onCopySection: (sectionId: number) => void
  copyEnabled: boolean
  isCopyPending: boolean
}

export function GroupMemberCard({
  member,
  match,
  isMe,
  onCopySection,
  copyEnabled,
  isCopyPending,
}: GroupMemberCardProps) {
  const items = member.timetable ?? []
  const hasShared = items.length > 0 && member.active_timetable_id != null
  const sectionItems = items.filter((it) => it.type === 'section')

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div className="flex items-center space-x-2 min-w-0">
          <h4 className="font-semibold text-gray-900 truncate">{member.nickname}</h4>
          {isMe ? (
            <span className="text-[10px] uppercase tracking-wider bg-primary-100 text-primary-700 rounded px-1.5 py-0.5">
              나
            </span>
          ) : null}
          <span
            className={`text-[10px] tracking-wider rounded px-1.5 py-0.5 ${
              hasShared ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {hasShared ? '공유 중' : '미공유'}
          </span>
        </div>
        {match && match.hasShared && !isMe ? (
          <div className="flex items-center space-x-3 text-xs text-gray-600">
            <span className="flex items-center space-x-1 text-primary-700 font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{match.score}점</span>
            </span>
            <span>같은 수업 {match.sameSectionCount}</span>
            <span>공통 {match.commonFreeMinutes}분</span>
          </div>
        ) : null}
      </div>

      {hasShared ? (
        <div>
          <TimetableGrid items={items} />
          {!isMe && sectionItems.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {sectionItems.map((item) =>
                item.section_id != null ? (
                  <button
                    key={item.item_id}
                    type="button"
                    disabled={!copyEnabled || isCopyPending}
                    onClick={() => onCopySection(item.section_id as number)}
                    title={copyEnabled ? '내 공유 시간표에 추가합니다.' : '먼저 공유 시간표를 선택해주세요.'}
                    className="btn-secondary text-xs flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Copy className="w-3 h-3" />
                    <span>
                      {item.name}
                      {copyEnabled ? ' 추가' : ' 추가 (시간표 선택 필요)'}
                    </span>
                  </button>
                ) : null
              )}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-gray-500 text-center py-6">
          공유된 시간표가 없습니다.
        </p>
      )}
    </div>
  )
}

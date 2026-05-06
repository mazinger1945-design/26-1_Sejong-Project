import { Sparkles, BookOpen, Clock4, UserMinus, UserPlus2 } from 'lucide-react'
import type { GroupAnalysis, RecommendableCourse } from '@/lib/group/analysis'

interface GroupAnalysisPanelProps {
  analysis: GroupAnalysis
  meHasShared: boolean
  onCopyCourse: (sectionId: number) => void
  copyEnabled: boolean
  isCopyPending: boolean
}

export function GroupAnalysisPanel({
  analysis,
  meHasShared,
  onCopyCourse,
  copyEnabled,
  isCopyPending,
}: GroupAnalysisPanelProps) {
  const { groupScore, sharedCourses, sameCourseDifferentSection, recommendableCourses, unsharedMembers, canAnalyze } = analysis

  return (
    <div className="card space-y-5">
      <div className="flex items-center space-x-2">
        <Sparkles className="w-5 h-5 text-primary-600" />
        <h3 className="text-lg font-semibold">그룹 분석</h3>
      </div>

      {!canAnalyze ? (
        <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-4">
          분석하려면 최소 2명 이상이 시간표를 공유해야 합니다.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryStat
            icon={<Sparkles className="w-4 h-4" />}
            label="그룹 매칭 점수"
            value={groupScore != null ? `${groupScore}점` : '-'}
            tone="primary"
          />
          <SummaryStat
            icon={<BookOpen className="w-4 h-4" />}
            label="같이 듣는 수업"
            value={`${sharedCourses.length}개`}
          />
          <SummaryStat
            icon={<Clock4 className="w-4 h-4" />}
            label="공통 빈 시간"
            value={`${analysis.commonFree.length}개`}
          />
          <SummaryStat
            icon={<UserMinus className="w-4 h-4" />}
            label="시간표 미공유"
            value={`${unsharedMembers.length}명`}
          />
        </div>
      )}

      <SharedCoursesSection
        sharedCourses={sharedCourses}
        sameCourseDifferentSection={sameCourseDifferentSection}
      />

      {meHasShared ? (
        <RecommendableSection
          courses={recommendableCourses}
          onCopy={onCopyCourse}
          copyEnabled={copyEnabled}
          isCopyPending={isCopyPending}
        />
      ) : null}
    </div>
  )
}

function SummaryStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone?: 'primary'
}) {
  const accent = tone === 'primary' ? 'text-primary-700 bg-primary-50 border-primary-100' : 'text-gray-700 bg-gray-50 border-gray-200'
  return (
    <div className={`rounded-lg border px-3 py-2 ${accent}`}>
      <div className="flex items-center space-x-1 text-xs">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}

function SharedCoursesSection({
  sharedCourses,
  sameCourseDifferentSection,
}: {
  sharedCourses: GroupAnalysis['sharedCourses']
  sameCourseDifferentSection: GroupAnalysis['sameCourseDifferentSection']
}) {
  return (
    <div>
      <div className="flex items-center space-x-2 mb-2">
        <BookOpen className="w-4 h-4 text-gray-600" />
        <h4 className="font-medium text-gray-900">함께 듣는 수업</h4>
      </div>
      {sharedCourses.length === 0 && sameCourseDifferentSection.length === 0 ? (
        <p className="text-sm text-gray-500">
          공유된 시간표 기준으로 함께 듣는 수업이 없습니다.
        </p>
      ) : (
        <div className="space-y-2">
          {sharedCourses.map((c) => (
            <div
              key={c.key}
              className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {c.members.map((m) => m.nickname).join(', ')}
                </p>
              </div>
              <span className="text-xs font-medium text-emerald-700 ml-2 flex-shrink-0">
                같은 분반
              </span>
            </div>
          ))}
          {sameCourseDifferentSection.map((c) => (
            <div
              key={c.key}
              className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {c.members.map((m) => m.nickname).join(', ')}
                </p>
              </div>
              <span className="text-xs font-medium text-amber-700 ml-2 flex-shrink-0">
                다른 분반
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RecommendableSection({
  courses,
  onCopy,
  copyEnabled,
  isCopyPending,
}: {
  courses: RecommendableCourse[]
  onCopy: (sectionId: number) => void
  copyEnabled: boolean
  isCopyPending: boolean
}) {
  return (
    <div>
      <div className="flex items-center space-x-2 mb-2">
        <UserPlus2 className="w-4 h-4 text-gray-600" />
        <h4 className="font-medium text-gray-900">추가 가능한 친구 수업</h4>
      </div>
      {courses.length === 0 ? (
        <p className="text-sm text-gray-500">
          내 시간표에 충돌 없이 추가할 수 있는 친구 수업이 없습니다.
        </p>
      ) : (
        <div className="space-y-2">
          {courses.map((c) => (
            <div
              key={`${c.sectionId}-${c.day}-${c.start}`}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {c.name}
                  {c.sectionNumber ? <span className="text-xs text-gray-500 ml-1">({c.sectionNumber}분반)</span> : null}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {c.day} {c.start}~{c.end}
                  {c.professor ? ` · ${c.professor}` : ''}
                  {' · '}
                  {c.ownerNickname}
                </p>
              </div>
              <button
                type="button"
                disabled={!copyEnabled || isCopyPending}
                onClick={() => onCopy(c.sectionId)}
                className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ml-2"
                title={copyEnabled ? '내 공유 시간표에 추가합니다.' : '먼저 공유 시간표를 선택해주세요.'}
              >
                {copyEnabled ? '내 시간표에 추가' : '공유 시간표 선택 필요'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

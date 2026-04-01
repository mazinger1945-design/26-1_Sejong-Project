import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import { Upload, FileSpreadsheet, Award } from 'lucide-react'
import { Progress } from '@/components/ui/Progress'
import { CourseCard } from '@/components/learning/CourseCard'
import type { CompletedCourseItem, CompletedCourseSummary } from '@/types'

const GRADUATION_REQUIREMENTS = {
  total: 130,
  major: 60,
  liberal: 50,
}

export default function LearningPage() {
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)

  const { data: summary, isLoading: summaryLoading, error: summaryError } = useQuery({
    queryKey: ['completed-courses-summary'],
    queryFn: () => api.getCompletedCoursesSummary(),
    retry: false,
    refetchOnWindowFocus: false,
  })

  const { data: courses, isLoading: coursesLoading, error: coursesError } = useQuery({
    queryKey: ['completed-courses'],
    queryFn: () => api.getCompletedCourses(),
    retry: false,
    refetchOnWindowFocus: false,
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.importCompletedCourses(file),
    onSuccess: (data) => {
      toast.success(`${data.successCount}개 과목이 저장되었습니다.`)
      queryClient.invalidateQueries({ queryKey: ['completed-courses-summary'] })
      queryClient.invalidateQueries({ queryKey: ['completed-courses'] })
      setFile(null)
    },
    onError: () => {
      toast.error('파일 업로드에 실패했습니다.')
    },
  })

  const handleFileUpload = () => {
    if (!file) {
      toast.error('파일을 선택해주세요.')
      return
    }
    uploadMutation.mutate(file)
  }

  const progressData = summary
    ? {
        total: {
          current: summary.total.earnedCredits,
          max: GRADUATION_REQUIREMENTS.total,
          percentage: Math.min((summary.total.earnedCredits / GRADUATION_REQUIREMENTS.total) * 100, 100),
          avg: summary.total.averageGradePoint,
        },
        major: {
          current: summary.major.earnedCredits,
          max: GRADUATION_REQUIREMENTS.major,
          percentage: Math.min((summary.major.earnedCredits / GRADUATION_REQUIREMENTS.major) * 100, 100),
          avg: summary.major.averageGradePoint,
        },
        liberal: {
          current: summary.liberal.earnedCredits,
          max: GRADUATION_REQUIREMENTS.liberal,
          percentage: Math.min((summary.liberal.earnedCredits / GRADUATION_REQUIREMENTS.liberal) * 100, 100),
          avg: summary.liberal.averageGradePoint,
        },
        other: {
          current: summary.other.earnedCredits,
          avg: summary.other.averageGradePoint,
        },
      }
    : null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">학습 현황</h1>
        <p className="text-gray-600">이수 학점과 졸업 요건을 확인하세요</p>
      </div>

      {/* CSV 업로드 섹션 */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <FileSpreadsheet className="w-6 h-6 text-primary-600" />
          <h2 className="text-xl font-semibold">성적표 업로드</h2>
        </div>
        <div className="flex items-center space-x-4">
          <label className="flex-1">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            <div className="flex items-center space-x-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-500 transition-colors">
              <Upload className="w-5 h-5 text-gray-400" />
              <span className="text-gray-600">
                {file ? file.name : '기이수성적 Excel 파일(.xlsx)을 선택하세요'}
              </span>
            </div>
          </label>
          <button
            onClick={handleFileUpload}
            disabled={!file || uploadMutation.isPending}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploadMutation.isPending ? '업로드 중...' : '업로드'}
          </button>
        </div>
      </div>

      {/* 학점 대시보드 */}
      {summaryLoading ? (
        <div className="card">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      ) : summaryError ? (
        <div className="card">
          <div className="text-center py-8 text-gray-500">
            <p>학점 정보를 불러올 수 없습니다.</p>
            <p className="text-sm mt-2">백엔드 서버가 실행 중인지 확인해주세요.</p>
          </div>
        </div>
      ) : progressData ? (
        <div className="card">
          <div className="flex items-center space-x-3 mb-6">
            <Award className="w-6 h-6 text-primary-600" />
            <h2 className="text-xl font-semibold">이수 학점 대시보드</h2>
          </div>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">총 이수 학점</span>
                <span className="text-sm font-semibold text-gray-900">
                  {progressData.total.current} / {progressData.total.max} 학점 (평점 {progressData.total.avg.toFixed(2)})
                </span>
              </div>
              <Progress value={progressData.total.percentage} />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">전공 학점</span>
                <span className="text-sm font-semibold text-gray-900">
                  {progressData.major.current} / {progressData.major.max} 학점 (평점 {progressData.major.avg.toFixed(2)})
                </span>
              </div>
              <Progress value={progressData.major.percentage} />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">교양 학점</span>
                <span className="text-sm font-semibold text-gray-900">
                  {progressData.liberal.current} / {progressData.liberal.max} 학점 (평점 {progressData.liberal.avg.toFixed(2)})
                </span>
              </div>
              <Progress value={progressData.liberal.percentage} />
            </div>
          </div>
        </div>
      ) : null}

      {/* 기이수 과목 리스트 */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">기이수 과목 목록</h2>
        {coursesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-24 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : coursesError ? (
          <div className="text-center py-12 text-gray-500">
            <p>과목 목록을 불러올 수 없습니다.</p>
            <p className="text-sm mt-2">백엔드 서버가 실행 중인지 확인해주세요.</p>
          </div>
        ) : courses && courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course, idx) => (
              <CourseCard key={course.id ?? `course-${idx}`} course={course} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>아직 등록된 과목이 없습니다.</p>
            <p className="text-sm mt-2">위에서 성적표를 업로드해주세요.</p>
          </div>
        )}
      </div>
    </div>
  )
}


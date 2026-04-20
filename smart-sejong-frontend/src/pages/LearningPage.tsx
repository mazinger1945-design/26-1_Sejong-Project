import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import { Upload, FileSpreadsheet, Award, BookOpen } from 'lucide-react'
import { Progress } from '@/components/ui/Progress'
import { CourseCard } from '@/components/learning/CourseCard'

export const COMPLETED_COURSES_STORAGE_KEY = 'completedCourseInfo'

export interface CompletedCourseInfo {
  courseCode: string
  courseName: string
}

export function saveCompletedCourseInfo(items: CompletedCourseInfo[]) {
  localStorage.setItem(COMPLETED_COURSES_STORAGE_KEY, JSON.stringify(items))
}

export function loadCompletedCourseInfo(): CompletedCourseInfo[] {
  const raw = localStorage.getItem(COMPLETED_COURSES_STORAGE_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const GRADUATION_REQUIREMENTS = {
  total: 130,
  major: 64,
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

  useEffect(() => {
    if (!courses) return

    saveCompletedCourseInfo(
      courses.map((course) => ({
        courseCode: course.courseCode,
        courseName: course.courseName,
      })),
    )
  }, [courses])

  const uploadMutation = useMutation({
    mutationFn: (selectedFile: File) => api.importCompletedCourses(selectedFile),
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
        },
        major: {
          current: summary.major.earnedCredits,
          max: GRADUATION_REQUIREMENTS.major,
          percentage: Math.min((summary.major.earnedCredits / GRADUATION_REQUIREMENTS.major) * 100, 100),
        },
        liberal: {
          current: summary.liberal.earnedCredits,
          max: GRADUATION_REQUIREMENTS.liberal,
          percentage: Math.min((summary.liberal.earnedCredits / GRADUATION_REQUIREMENTS.liberal) * 100, 100),
        },
      }
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">학습 현황</h1>
          <p className="text-gray-600">기이수 성적표를 업로드하고 이수 학점을 확인합니다.</p>
        </div>

        <section className="card">
          <div className="flex items-center space-x-3 mb-4">
            <FileSpreadsheet className="w-6 h-6 text-primary-600" />
            <h2 className="text-xl font-semibold">기이수 성적표 업로드</h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <label className="flex-1">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <div className="flex items-center space-x-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-500 transition-colors">
                <Upload className="w-5 h-5 text-gray-400" />
                <span className="text-gray-600">
                  {file ? file.name : '기이수성적조회 Excel 파일을 선택하세요'}
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
        </section>

        {summaryLoading ? (
          <section className="card">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4" />
              <div className="h-8 bg-gray-200 rounded" />
            </div>
          </section>
        ) : summaryError ? (
          <section className="card text-center py-8 text-gray-500">
            학점 정보를 불러오지 못했습니다.
          </section>
        ) : progressData ? (
          <section className="card">
            <div className="flex items-center space-x-3 mb-6">
              <Award className="w-6 h-6 text-primary-600" />
              <h2 className="text-xl font-semibold">이수 학점 요약</h2>
            </div>
            <div className="space-y-6">
              <CreditProgress label="총 이수 학점" current={progressData.total.current} max={progressData.total.max} value={progressData.total.percentage} />
              <CreditProgress label="전공 학점" current={progressData.major.current} max={progressData.major.max} value={progressData.major.percentage} />
              <CreditProgress label="교양 학점" current={progressData.liberal.current} max={progressData.liberal.max} value={progressData.liberal.percentage} />
            </div>
          </section>
        ) : null}

        <section className="card">
          <div className="flex items-center space-x-3 mb-4">
            <BookOpen className="w-6 h-6 text-primary-600" />
            <h2 className="text-xl font-semibold">기이수 과목 목록</h2>
          </div>
          {coursesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-24 bg-gray-200 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : coursesError ? (
            <div className="text-center py-12 text-gray-500">과목 목록을 불러오지 못했습니다.</div>
          ) : courses && courses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((course, idx) => (
                <CourseCard key={course.id ?? `course-${idx}`} course={course} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              아직 등록된 과목이 없습니다. 기이수 성적표를 업로드해주세요.
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function CreditProgress({ label, current, max, value }: { label: string; current: number; max: number; value: number }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-semibold text-gray-900">
          {current} / {max} 학점
        </span>
      </div>
      <Progress value={value} />
    </div>
  )
}

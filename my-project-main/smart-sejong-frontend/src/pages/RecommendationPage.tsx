import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import { Search, Sparkles, Filter, Pin } from 'lucide-react'
import { TimetableGrid } from '@/components/timetable/TimetableGrid'
import type { RecommendationFilters, RecommendationCombination, TimetableItem } from '@/types'

const DAYS = ['월', '화', '수', '목', '금']
const TIME_RANGES = [
  { label: '오전 (09-12)', value: 'morning' },
  { label: '오후 (12-17)', value: 'afternoon' },
  { label: '저녁 (17-21)', value: 'evening' },
]

export default function RecommendationPage() {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null)
  const [selectedCombination, setSelectedCombination] = useState<RecommendationCombination | null>(null)
  const [pinnedItems, setPinnedItems] = useState<number[]>([])
  
  const [filters, setFilters] = useState<RecommendationFilters>({
    preferred_days: [],
    min_free_days: 0,
    preferred_times: [],
    required_courses: [],
  })

  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['courses-search', searchKeyword],
    queryFn: () => api.searchCourses({ name: searchKeyword }),
    enabled: searchKeyword.length > 0,
  })

  const generateMutation = useMutation({
    mutationFn: (request: { filters: RecommendationFilters; pinned_items: number[] }) =>
      api.generateRecommendations(request),
    onSuccess: (data) => {
      if (data.length > 0) {
        setSelectedCombination(data[0])
        toast.success(`${data.length}개의 추천 조합을 생성했습니다!`)
      } else {
        toast.error('조건에 맞는 조합을 찾을 수 없습니다.')
      }
    },
    onError: () => {
      toast.error('추천 생성에 실패했습니다.')
    },
  })

  const pinToggleMutation = useMutation({
    mutationFn: ({ itemId, isPinned }: { itemId: number; isPinned: boolean }) =>
      api.togglePin(itemId, isPinned),
    onSuccess: (data, variables) => {
      if (variables.isPinned) {
        setPinnedItems([...pinnedItems, variables.itemId])
      } else {
        setPinnedItems(pinnedItems.filter((id) => id !== variables.itemId))
      }
      toast.success(variables.isPinned ? '핀 고정되었습니다.' : '핀 해제되었습니다.')
    },
  })

  const handleGenerate = () => {
    generateMutation.mutate({
      filters,
      pinned_items: pinnedItems,
    })
  }

  const handleDayToggle = (day: string) => {
    setFilters((prev) => ({
      ...prev,
      preferred_days: prev.preferred_days?.includes(day)
        ? prev.preferred_days.filter((d) => d !== day)
        : [...(prev.preferred_days || []), day],
    }))
  }

  const handleTimeToggle = (time: string) => {
    setFilters((prev) => ({
      ...prev,
      preferred_times: prev.preferred_times?.includes(time)
        ? prev.preferred_times.filter((t) => t !== time)
        : [...(prev.preferred_times || []), time],
    }))
  }

  const handleAddRequiredCourse = () => {
    if (selectedCourse) {
      const courseCode = courses?.find((c) => c.id === selectedCourse)?.code || ''
      setFilters((prev) => ({
        ...prev,
        required_courses: [...(prev.required_courses || []), courseCode],
      }))
      setSelectedCourse(null)
      setSearchKeyword('')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI 시간표 추천</h1>
        <p className="text-gray-600">선호도를 설정하여 최적의 시간표를 찾아보세요</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 필터 설정 패널 */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card">
            <div className="flex items-center space-x-2 mb-4">
              <Filter className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold">필터 설정</h2>
            </div>

            {/* 공강 요일 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                공강 요일 (다중 선택)
              </label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <button
                    key={day}
                    onClick={() => handleDayToggle(day)}
                    className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                      filters.preferred_days?.includes(day)
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {/* 최소 공강 횟수 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                최소 공강 횟수: {filters.min_free_days || 0}일
              </label>
              <input
                type="range"
                min="0"
                max="5"
                value={filters.min_free_days || 0}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, min_free_days: parseInt(e.target.value) }))
                }
                className="w-full"
              />
            </div>

            {/* 시간대 선호 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                시간대 선호 (다중 선택)
              </label>
              <div className="space-y-2">
                {TIME_RANGES.map((range) => (
                  <button
                    key={range.value}
                    onClick={() => handleTimeToggle(range.value)}
                    className={`w-full px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                      filters.preferred_times?.includes(range.value)
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 필수 포함 과목 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                필수 포함 과목
              </label>
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      placeholder="과목명 검색..."
                      className="input pl-10"
                    />
                  </div>
                  <button
                    onClick={handleAddRequiredCourse}
                    disabled={!selectedCourse}
                    className="btn-primary disabled:opacity-50"
                  >
                    추가
                  </button>
                </div>
                {coursesLoading ? (
                  <div className="text-sm text-gray-500">검색 중...</div>
                ) : courses && courses.length > 0 ? (
                  <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                    {courses.map((course) => (
                      <button
                        key={course.id}
                        onClick={() => setSelectedCourse(course.id)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                          selectedCourse === course.id ? 'bg-primary-50' : ''
                        }`}
                      >
                        {course.code} - {course.name}
                      </button>
                    ))}
                  </div>
                ) : null}
                {filters.required_courses && filters.required_courses.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {filters.required_courses.map((code, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-primary-100 text-primary-800 rounded text-xs flex items-center space-x-1"
                      >
                        <span>{code}</span>
                        <button
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              required_courses: prev.required_courses?.filter((_, i) => i !== idx),
                            }))
                          }
                          className="hover:text-primary-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 생성 버튼 */}
            <button
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              className="w-full btn-primary flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Sparkles className="w-5 h-5" />
              <span>{generateMutation.isPending ? '생성 중...' : 'AI 최적 조합 찾기'}</span>
            </button>
          </div>

          {/* 핀 고정된 항목 */}
          {pinnedItems.length > 0 && (
            <div className="card">
              <div className="flex items-center space-x-2 mb-2">
                <Pin className="w-5 h-5 text-yellow-500" />
                <h3 className="font-semibold">고정된 항목</h3>
              </div>
              <p className="text-sm text-gray-600">
                {pinnedItems.length}개의 항목이 고정되어 있습니다.
              </p>
            </div>
          )}
        </div>

        {/* 추천 결과 */}
        <div className="lg:col-span-2">
          {generateMutation.isPending ? (
            <div className="card">
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p className="text-gray-600">최적의 조합을 찾고 있습니다...</p>
              </div>
            </div>
          ) : selectedCombination ? (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">추천 조합 #{selectedCombination.combination_id}</h2>
                <div className="flex space-x-2">
                  {generateMutation.data?.map((combo) => (
                    <button
                      key={combo.combination_id}
                      onClick={() => setSelectedCombination(combo)}
                      className={`px-3 py-1 rounded text-sm ${
                        selectedCombination.combination_id === combo.combination_id
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      조합 {combo.combination_id}
                    </button>
                  ))}
                </div>
              </div>
              <TimetableGrid
                items={selectedCombination.items}
                editable={true}
                onPinToggle={(itemId, isPinned) => {
                  pinToggleMutation.mutate({ itemId, isPinned })
                }}
              />
            </div>
          ) : (
            <div className="card">
              <div className="text-center py-12 text-gray-500">
                <Sparkles className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>필터를 설정하고 'AI 최적 조합 찾기'를 클릭하세요</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


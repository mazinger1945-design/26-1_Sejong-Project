import type { CompletedCourseItem } from '@/types'

interface CourseCardProps {
  course: CompletedCourseItem
}

export function CourseCard({ course }: CourseCardProps) {
  return (
    <div className="card p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-1">
        <h3 className="font-semibold text-gray-900 flex-1 leading-tight">{course.courseName}</h3>
        <span className="text-xs text-gray-400 ml-2 shrink-0">{course.credits}학점</span>
      </div>
      {course.category && (
        <span className="inline-block text-[11px] text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
          {course.category}
        </span>
      )}
    </div>
  )
}

import React from 'react'
import type { TimetableItem } from '@/types'
import { Pin } from 'lucide-react'

interface TimetableGridProps {
  items: TimetableItem[]
  onItemClick?: (item: TimetableItem) => void
  onPinToggle?: (itemId: number, isPinned: boolean) => void
  editable?: boolean
}

const DAYS = ['월', '화', '수', '목', '금']
const HOURS = Array.from({ length: 14 }, (_, i) => i + 8) // 8시부터 21시까지

export function TimetableGrid({ items, onItemClick, onPinToggle, editable = false }: TimetableGridProps) {
  const parseTime = (time: string): number => {
    const [hour, minute = 0] = time.split(':').map(Number)
    return hour + minute / 60
  }

  const getItemPosition = (item: TimetableItem) => {
    const dayIndex = DAYS.indexOf(item.day)
    if (dayIndex === -1) return null

    const startTime = parseTime(item.start)
    const endTime = parseTime(item.end)
    const startHour = Math.floor(startTime)
    const startMinute = (startTime % 1) * 60
    const duration = endTime - startTime

    // 시간 슬롯 인덱스 (8시 = 0)
    const slotIndex = startHour - 8
    const topPercent = (startMinute / 60) * 100
    const heightPercent = duration * 100

    return {
      day: dayIndex + 1, // 1-based for grid column
      slot: slotIndex,
      top: topPercent,
      height: heightPercent,
    }
  }

  const getItemColor = (item: TimetableItem) => {
    if (item.is_pinned) {
      return 'bg-primary-500 border-primary-600'
    }
    if (item.type === 'custom') {
      return 'bg-purple-500 border-purple-600'
    }
    return 'bg-blue-500 border-blue-600'
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Header */}
        <div className="grid grid-cols-6 gap-1 mb-2">
          <div className="text-sm font-medium text-gray-600 text-center py-2">시간</div>
          {DAYS.map((day) => (
            <div key={day} className="text-sm font-medium text-gray-600 text-center py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Grid Container */}
        <div className="relative border border-gray-300 rounded-lg bg-white">
          {/* Time Column and Day Columns */}
          <div className="grid grid-cols-6 gap-1">
            {HOURS.map((hour, hourIndex) => (
              <React.Fragment key={hour}>
                {/* Time Label */}
                <div className="text-xs text-gray-500 text-center py-2 border-r border-gray-200">
                  {hour}:00
                </div>
                {/* Day Columns */}
                {DAYS.map((day, dayIndex) => (
                  <div
                    key={`${day}-${hour}`}
                    className="border-r border-b border-gray-200 min-h-[80px] relative"
                  >
                    {/* Items for this time slot */}
                    {items
                      .map((item) => {
                        const pos = getItemPosition(item)
                        if (!pos || pos.day !== dayIndex + 1) return null
                        if (pos.slot !== hourIndex) return null
                        return { item, pos }
                      })
                      .filter(Boolean)
                      .map(({ item, pos }) => (
                        <div
                          key={item.item_id}
                          style={{
                            position: 'absolute',
                            top: `${pos.top}%`,
                            left: '2px',
                            right: '2px',
                            height: `${pos.height}%`,
                            minHeight: '40px',
                          }}
                          className={`${getItemColor(item)} text-white text-xs p-1.5 rounded cursor-pointer hover:opacity-90 transition-opacity border ${
                            item.is_pinned ? 'ring-2 ring-yellow-400' : ''
                          }`}
                          onClick={(e) => {
                            e.stopPropagation()
                            onItemClick?.(item)
                          }}
                        >
                          <div className="flex items-start justify-between h-full">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate text-[10px] leading-tight">
                                {item.name}
                              </div>
                              <div className="text-[9px] opacity-90 mt-0.5">
                                {item.start} - {item.end}
                              </div>
                            </div>
                            {editable && onPinToggle && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onPinToggle(item.item_id, !item.is_pinned)
                                }}
                                className={`ml-1 p-0.5 rounded flex-shrink-0 ${
                                  item.is_pinned
                                    ? 'bg-yellow-400 text-yellow-900'
                                    : 'bg-white bg-opacity-20 hover:bg-opacity-30'
                                }`}
                              >
                                <Pin className={`w-2.5 h-2.5 ${item.is_pinned ? 'fill-current' : ''}`} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

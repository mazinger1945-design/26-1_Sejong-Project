/**
 * 백엔드 미연결 시 fallback용 목데이터 (개발/테스트용)
 * 실제 서비스에서는 loadAllCandidateSections() 사용
 */
import type { GroupedSectionRaw } from '@/types'

export const MOCK_SECTIONS: GroupedSectionRaw[] = [
  {
    sectionId: 1,
    courseId: 101,
    courseCode: 'CS101',
    courseName: '데이터구조',
    credits: 3,
    sectionNumber: '01',
    professor: '김교수',
    categoryDescription: '전공필수',
    college: '소프트웨어융합대학',
    department: '소프트웨어학과',
    times: [
      { dayOfWeekKor: '월', startTime: '09:00', endTime: '10:30' },
      { dayOfWeekKor: '수', startTime: '09:00', endTime: '10:30' },
    ],
  },
  {
    sectionId: 2,
    courseId: 102,
    courseCode: 'CS102',
    courseName: '알고리즘',
    credits: 3,
    sectionNumber: '01',
    professor: '이교수',
    categoryDescription: '전공선택',
    college: '소프트웨어융합대학',
    department: '소프트웨어학과',
    times: [
      { dayOfWeekKor: '화', startTime: '10:30', endTime: '12:00' },
      { dayOfWeekKor: '목', startTime: '10:30', endTime: '12:00' },
    ],
  },
  {
    sectionId: 3,
    courseId: 103,
    courseCode: 'CS103',
    courseName: '운영체제',
    credits: 3,
    sectionNumber: '01',
    professor: '박교수',
    categoryDescription: '전공선택',
    college: '인공지능융합대학',
    department: 'AI로봇학과',
    times: [
      { dayOfWeekKor: '월', startTime: '13:30', endTime: '15:00' },
      { dayOfWeekKor: '수', startTime: '13:30', endTime: '15:00' },
    ],
  },
  {
    sectionId: 4,
    courseId: 104,
    courseCode: 'CS104',
    courseName: '컴퓨터네트워크',
    credits: 3,
    sectionNumber: '01',
    professor: '최교수',
    categoryDescription: '전공선택',
    college: '인공지능융합대학',
    department: 'AI융합전자공학과',
    times: [
      { dayOfWeekKor: '화', startTime: '13:30', endTime: '15:00' },
      { dayOfWeekKor: '목', startTime: '13:30', endTime: '15:00' },
    ],
  },
  {
    sectionId: 5,
    courseId: 105,
    courseCode: 'CS105',
    courseName: '소프트웨어공학',
    credits: 3,
    sectionNumber: '01',
    professor: '정교수',
    categoryDescription: '전공선택',
    college: '소프트웨어융합대학',
    department: '콘텐츠소프트웨어학과',
    times: [
      { dayOfWeekKor: '금', startTime: '09:00', endTime: '12:00' },
    ],
  },
  {
    sectionId: 6,
    courseId: 106,
    courseCode: 'GE101',
    courseName: '창의적사고',
    credits: 2,
    sectionNumber: '01',
    professor: '강교수',
    categoryDescription: '교양선택',
    college: '대양휴머니티칼리지',
    department: '대양휴머니티칼리지',
    times: [
      { dayOfWeekKor: '수', startTime: '15:00', endTime: '17:00' },
    ],
  },
]

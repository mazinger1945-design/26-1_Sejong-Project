/**
 * mockData.ts
 *
 * 백엔드 검색 API 미구현 시 fallback으로 사용할 샘플 강의 데이터.
 * TODO: 백엔드에 /api/courses/sections/search?q= 엔드포인트 구현 후 이 파일 대체 가능.
 */

import type { SectionCandidate } from './types'

export const MOCK_SECTIONS: SectionCandidate[] = [
  // ── 데이터구조 ─────────────────────────────────────────────
  {
    courseId: 1, courseName: '데이터구조', courseCode: 'CS201',
    sectionId: 1001, sectionName: '01분반', credits: 3,
    meetingTimes: [
      { day: '월', start: '09:00', end: '10:30' },
      { day: '수', start: '09:00', end: '10:30' },
    ],
    deliveryMode: 'OFFLINE', professor: '김태영',
  },
  {
    courseId: 1, courseName: '데이터구조', courseCode: 'CS201',
    sectionId: 1002, sectionName: '02분반', credits: 3,
    meetingTimes: [
      { day: '화', start: '13:00', end: '14:30' },
      { day: '목', start: '13:00', end: '14:30' },
    ],
    deliveryMode: 'OFFLINE', professor: '이지현',
  },
  // ── 알고리즘 ──────────────────────────────────────────────
  {
    courseId: 2, courseName: '알고리즘', courseCode: 'CS301',
    sectionId: 2001, sectionName: '01분반', credits: 3,
    meetingTimes: [
      { day: '월', start: '13:30', end: '15:00' },
      { day: '수', start: '13:30', end: '15:00' },
    ],
    deliveryMode: 'OFFLINE', professor: '박민준',
  },
  {
    courseId: 2, courseName: '알고리즘', courseCode: 'CS301',
    sectionId: 2002, sectionName: '02분반', credits: 3,
    meetingTimes: [
      { day: '화', start: '09:00', end: '10:30' },
      { day: '목', start: '09:00', end: '10:30' },
    ],
    deliveryMode: 'ONLINE', professor: '최수진',
  },
  // ── 운영체제 ──────────────────────────────────────────────
  {
    courseId: 3, courseName: '운영체제', courseCode: 'CS302',
    sectionId: 3001, sectionName: '01분반', credits: 3,
    meetingTimes: [
      { day: '화', start: '10:30', end: '12:00' },
      { day: '목', start: '10:30', end: '12:00' },
    ],
    deliveryMode: 'OFFLINE', professor: '한동우',
  },
  {
    courseId: 3, courseName: '운영체제', courseCode: 'CS302',
    sectionId: 3002, sectionName: '02분반', credits: 3,
    meetingTimes: [
      { day: '월', start: '15:00', end: '16:30' },
      { day: '수', start: '15:00', end: '16:30' },
    ],
    deliveryMode: 'OFFLINE', professor: '서연아',
  },
  // ── 컴퓨터네트워크 ──────────────────────────────────────────
  {
    courseId: 4, courseName: '컴퓨터네트워크', courseCode: 'CS401',
    sectionId: 4001, sectionName: '01분반', credits: 3,
    meetingTimes: [
      { day: '수', start: '10:30', end: '12:00' },
      { day: '금', start: '10:30', end: '12:00' },
    ],
    deliveryMode: 'OFFLINE', professor: '정우성',
  },
  {
    courseId: 4, courseName: '컴퓨터네트워크', courseCode: 'CS401',
    sectionId: 4002, sectionName: '02분반', credits: 3,
    meetingTimes: [
      { day: '화', start: '15:00', end: '16:30' },
      { day: '목', start: '15:00', end: '16:30' },
    ],
    deliveryMode: 'ONLINE', professor: '임지수',
  },
  // ── 데이터베이스 ────────────────────────────────────────────
  {
    courseId: 5, courseName: '데이터베이스', courseCode: 'CS303',
    sectionId: 5001, sectionName: '01분반', credits: 3,
    meetingTimes: [
      { day: '월', start: '10:30', end: '12:00' },
      { day: '수', start: '10:30', end: '12:00' },
    ],
    deliveryMode: 'OFFLINE', professor: '강준혁',
  },
  {
    courseId: 5, courseName: '데이터베이스', courseCode: 'CS303',
    sectionId: 5002, sectionName: '02분반', credits: 3,
    meetingTimes: [{ day: '목', start: '09:00', end: '12:00' }],
    deliveryMode: 'OFFLINE', professor: '윤서영',
  },
  // ── 소프트웨어공학 ──────────────────────────────────────────
  {
    courseId: 6, courseName: '소프트웨어공학', courseCode: 'CS402',
    sectionId: 6001, sectionName: '01분반', credits: 3,
    meetingTimes: [{ day: '월', start: '13:00', end: '16:00' }],
    deliveryMode: 'OFFLINE', professor: '조현우',
  },
  {
    courseId: 6, courseName: '소프트웨어공학', courseCode: 'CS402',
    sectionId: 6002, sectionName: '02분반', credits: 3,
    meetingTimes: [{ day: '금', start: '09:00', end: '12:00' }],
    deliveryMode: 'ONLINE', professor: '장은지',
  },
  // ── 선형대수 ──────────────────────────────────────────────
  {
    courseId: 7, courseName: '선형대수', courseCode: 'MA201',
    sectionId: 7001, sectionName: '01분반', credits: 3,
    meetingTimes: [
      { day: '화', start: '13:00', end: '14:30' },
      { day: '목', start: '13:00', end: '14:30' },
    ],
    deliveryMode: 'OFFLINE', professor: '홍길동',
  },
  // ── 확률및통계 ────────────────────────────────────────────
  {
    courseId: 8, courseName: '확률및통계', courseCode: 'MA202',
    sectionId: 8001, sectionName: '01분반', credits: 3,
    meetingTimes: [
      { day: '월', start: '16:30', end: '18:00' },
      { day: '수', start: '16:30', end: '18:00' },
    ],
    deliveryMode: 'OFFLINE', professor: '심영희',
  },
  {
    courseId: 8, courseName: '확률및통계', courseCode: 'MA202',
    sectionId: 8002, sectionName: '02분반', credits: 3,
    meetingTimes: [
      { day: '화', start: '09:00', end: '10:30' },
      { day: '금', start: '09:00', end: '10:30' },
    ],
    deliveryMode: 'ONLINE', professor: '나현수',
  },
  // ── 영어회화 ──────────────────────────────────────────────
  {
    courseId: 9, courseName: '영어회화', courseCode: 'EN101',
    sectionId: 9001, sectionName: '01분반', credits: 2,
    meetingTimes: [
      { day: '화', start: '11:00', end: '12:00' },
      { day: '목', start: '11:00', end: '12:00' },
    ],
    deliveryMode: 'OFFLINE', professor: 'Smith',
  },
  // ── 창의설계프로젝트 ────────────────────────────────────────
  {
    courseId: 10, courseName: '창의설계프로젝트', courseCode: 'CS499',
    sectionId: 10001, sectionName: '01분반', credits: 3,
    meetingTimes: [{ day: '금', start: '13:00', end: '16:00' }],
    deliveryMode: 'OFFLINE', professor: '김창의',
  },
  {
    courseId: 10, courseName: '창의설계프로젝트', courseCode: 'CS499',
    sectionId: 10002, sectionName: '02분반', credits: 3,
    meetingTimes: [{ day: '수', start: '13:00', end: '16:00' }],
    deliveryMode: 'OFFLINE', professor: '이설계',
  },
  // ── 인공지능기초 ────────────────────────────────────────────
  {
    courseId: 11, courseName: '인공지능기초', courseCode: 'CS404',
    sectionId: 11001, sectionName: '01분반', credits: 3,
    meetingTimes: [
      { day: '월', start: '09:00', end: '10:30' },
      { day: '금', start: '09:00', end: '10:30' },
    ],
    deliveryMode: 'ONLINE', professor: '박지능',
  },
  {
    courseId: 11, courseName: '인공지능기초', courseCode: 'CS404',
    sectionId: 11002, sectionName: '02분반', credits: 3,
    meetingTimes: [
      { day: '화', start: '16:30', end: '18:00' },
      { day: '목', start: '16:30', end: '18:00' },
    ],
    deliveryMode: 'ONLINE', professor: '최지능',
  },
]

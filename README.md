# Smart Sejong - Step 3 Login + Upload + Recommendation

이 브랜치는 Smart Sejong 프로젝트의 3단계 구현 상태입니다.

## 포함된 기능

- 세종대학교 계정 기반 로그인
- JWT 토큰 저장 및 인증 라우팅
- 기이수 성적표 Excel 업로드
- 기이수 과목 목록 및 학점 요약 조회
- 강의/분반 데이터 조회
- 고정 분반, 개인 일정, 제외 과목, 학점 범위, 전공 최소 과목 수를 반영한 시간표 추천
- 추천 결과 상위 3개 미리보기

## 실행 방법

백엔드:

```bash
cd smart-sejong-backend
./gradlew clean bootRun
```

프론트엔드:

```bash
cd smart-sejong-frontend
npm install
npm run dev
```

## 접속 경로

- 프론트엔드: `http://localhost:3000`
- 백엔드: `http://localhost:8080`
- 로그인: `/login`
- 학습 현황/업로드: `/learning`
- 시간표 추천: `/recommendation`

## 아직 포함하지 않은 기능

- 시간표 저장/편집 기능
- 그룹 시간표 공유 기능
- 운영 환경 배포 설정

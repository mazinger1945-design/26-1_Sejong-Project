# Smart Sejong - Step 2 Login + Upload

이 브랜치는 Smart Sejong 프로젝트의 2단계 구현 상태입니다.

## 포함된 기능

- 세종대학교 포털 계정 기반 로그인
- JWT 토큰 발급 및 프론트엔드 인증 상태 저장
- 기이수 성적표 Excel 업로드
- 기이수 과목 목록 조회
- 총 이수 학점, 전공 학점, 교양 학점 요약 표시

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

## 아직 포함되지 않은 기능

- 시간표 추천
- 시간표 저장
- 그룹 시간표 공유

# Smart Sejong - Step 1 Login

이 브랜치는 Smart Sejong 프로젝트의 1단계 구현 상태입니다.

## 포함된 기능

- 세종대학교 포털 계정 기반 로그인 화면
- 백엔드 포털 로그인 요청 및 학생 정보 파싱
- JWT Access Token / Refresh Token 발급
- 로그인 성공 후 사용자 기본 정보 표시

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

## 아직 포함되지 않은 기능

- 기이수 성적표 업로드
- 학습 현황 대시보드
- 시간표 추천
- 시간표 저장 및 그룹 기능

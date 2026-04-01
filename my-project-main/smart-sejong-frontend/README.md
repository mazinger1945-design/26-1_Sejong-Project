# Smart Sejong Frontend

세종대학교 학생을 위한 스마트 시간표 관리 시스템의 프론트엔드입니다.

## 주요 기능

- 🎓 **학습 현황**: 성적표 업로드 및 이수 학점 대시보드
- ✨ **AI 시간표 추천**: 선호도 기반 최적 시간표 조합 생성
- 📅 **내 시간표**: 시간표 저장 및 관리
- 👥 **그룹 협동**: 친구들과 함께 시간표 공유 및 최적화
- 👤 **프로필 관리**: 개인 정보 및 인증 관리

## 기술 스택

- **React 18** - UI 라이브러리
- **TypeScript** - 타입 안정성
- **Vite** - 빌드 도구
- **Tailwind CSS** - 스타일링
- **React Router** - 라우팅
- **Zustand** - 상태 관리
- **React Query** - 서버 상태 관리
- **Axios** - HTTP 클라이언트

## 시작하기

### 필수 요구사항

- Node.js 18 이상
- npm 또는 yarn

### 설치

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 미리보기
npm run preview
```

### 환경 변수

`.env` 파일을 생성하고 다음 변수를 설정하세요:

```env
VITE_API_BASE_URL=http://localhost:8080
```

## 프로젝트 구조

```
src/
├── components/          # 재사용 가능한 컴포넌트
│   ├── learning/      # 학습 현황 관련 컴포넌트
│   ├── timetable/     # 시간표 관련 컴포넌트
│   └── ui/            # 공통 UI 컴포넌트
├── lib/               # 유틸리티 및 API 클라이언트
├── pages/             # 페이지 컴포넌트
├── store/             # 상태 관리 (Zustand)
├── types/             # TypeScript 타입 정의
└── App.tsx            # 메인 앱 컴포넌트
```

## 주요 페이지

- `/login` - 로그인 및 포털 인증
- `/learning` - 학습 현황 및 성적 관리
- `/recommendation` - AI 시간표 추천
- `/timetable` - 내 시간표 보관함
- `/group` - 그룹 협동
- `/profile` - 프로필 관리

## API 연동

모든 API 호출은 `src/lib/api.ts`에서 관리됩니다. 백엔드 API(`smart-sejong-backend`)와의 통신은 Axios를 통해 이루어지며, 자동으로 인증 토큰을 헤더에 추가합니다.

백엔드는 `http://localhost:8080`에서 실행되어야 하며, Vite 개발 서버가 자동으로 프록시합니다.

## 개발 가이드

### 컴포넌트 작성

- 함수형 컴포넌트와 Hooks 사용
- TypeScript로 타입 안정성 확보
- Tailwind CSS로 스타일링
- 재사용 가능한 컴포넌트 설계

### 상태 관리

- 전역 상태: Zustand 사용 (`src/store/`)
- 서버 상태: React Query 사용
- 로컬 상태: useState Hook 사용

### 스타일링

- Tailwind CSS 유틸리티 클래스 사용
- 공통 스타일은 `src/index.css`에 정의
- 반응형 디자인 고려

## 라이선스

이 프로젝트는 학교 프로젝트용으로 개발되었습니다.


# Next.js + Supabase + GitHub + Vercel

**프로젝트 셋업 가이드** — rack-damage-maintenance 기반 · 2026-04

> 참고용 문서. 에이전트 컨텍스트 절약을 위해 `.cursorignore`에 등록됨.

---

## 0. 보안·키·절대 하지 말 것 (먼저 읽기)

| 구분 | 이름 / 예시 | 어디에 쓰나 | 주의 |
|------|-------------|-------------|------|
| 공개돼도 되는 설계 | **anon 키** (대시보드에 **Publishable key**, 예: `eyJ…` JWT 또는 `sb_publishable_…`) | 브라우저·`NEXT_PUBLIC_SUPABASE_ANON_KEY` | RLS로 막지 않으면 **누구나 API로 접근 가능**. 키 자체는 노출 전제이지만, **정책이 본인 방화벽**임. |
| 절대 프론트·GitHub·채팅에 넣지 말 것 | **service_role** (Secret / service key) | 서버 전용 스크립트·관리용만 | **RLS 우회 = DB 전권**. 이 레포(rack-damage)는 **현재 코드에서 미사용** — 없어도 동작. 넣을 때만 Vercel Server/Edge 등 **서버 env**에. |
| 절대 `NEXT_PUBLIC_` 붙이지 말 것 | service_role, DB password, 개인 토큰 | — | 빌드에 박혀 **전 세계 공개**됨. |
| Git에 올리면 안 됨 | `.env.local`, `.env` | 로컬만 | `.gitignore`에 포함되는지 확인. |
| 대화·이슈에 붙이지 말 것 | CLI 로그인 URL, `session_id`, 검증 코드, DB 비밀번호 | — | 유출 시 토큰 취소·비밀번호 변경. |
| 브라우저 쿠키 (앱 설계) | 예: `rack_selected_plant_id` | 공장 선택 등 **비민감 상태** | JWT·세션 쿠키와 혼동 금지; 민감 데이터는 쿠키에 넣지 않기. |
| Supabase **Project ref** | Settings → General → **Project ID** (복사) | CLI `link`, URL의 `xxxx.supabase.co` | 스크린샷 OCR로 복사하면 **오타** 많음. 반드시 **Copy** 버튼 사용. |

**이 프로젝트(rack-damage-maintenance) 실제 사용 env (최소)**

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- (선택) `NEXT_PUBLIC_ADMIN_EMAILS`

→ **`SUPABASE_SECRET_KEY`는 레포 코드에 없음.** 나중에 Server Actions 등으로 RLS 우회 API를 쓸 계획이 있을 때만 추가하고, **Vercel에는 Production/Preview 각각** 넣기.

---

## 1. 프로젝트 생성 (Next.js)

```bash
cd /c/
npx create-next-app@latest 프로젝트명 --typescript --tailwind --app
```

**프롬프트 예시** (버전에 따라 문구는 다를 수 있음)

- ESLint → Yes
- `src/` directory → No (레포 구조와 맞추려면)
- import alias → 취향

**자주 쓰는 패키지 (예시)**

```bash
cd 프로젝트명
npm install @supabase/supabase-js @supabase/ssr
# 필요 시: chart.js react-chartjs-2, @dnd-kit/core 등
```

---

## 2. Supabase 셋업

### 계정·프로젝트

- supabase.com → **GitHub 연동** 권장
- **Organization + Project** 생성
- **Database password**: 반드시 비밀번호 관리자에 저장 (CLI `link` / 연결 문자열에 사용)
- **Region**: 예) East US (Ohio)
- **Data API / RLS**: 프로젝트 생성 옵션은 팀 정책에 맞게; **테이블별 RLS·정책은 SQL로 명시**하는 편이 안전

### API 키 (대시보드 → Settings → API)

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon / Publishable** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role**: 클라이언트 Next 앱에 **필수 아님**. 서버 전용 기능 넣을 때만 별도 env로 관리

### `.env.local` (프로젝트 루트, Git 제외)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... 또는 sb_publishable_...
NEXT_PUBLIC_ADMIN_EMAILS=관리자@example.com
```

### Storage (이미지 등)

- Storage → New bucket
- Public 여부·용량·MIME 제한은 정책에 맞게 (예: 10MB, `image/jpeg`, `image/png`, `image/webp`)

### 스키마·RLS

- **방법 A**: SQL Editor에 마이그레이션 SQL 실행
- **방법 B (권장)**: `supabase/migrations/*.sql` 로 버전 관리 후 **`npm run db:push`** (프로젝트 `link` 후)
- 이미 Editor로 적용한 SQL을 `db:push`로 **다시** 돌리면 충돌할 수 있음 → **한 가지 경로로 통일**
- 레포 예시: `supabase/migrations/…`, `supabase/enable-rls.sql` (RLS는 테이블마다 설계)

### Auth → URL Configuration (Vercel 배포 **후** 필수)

- **Site URL**: `https://프로젝트.vercel.app`
- **Redirect URLs**: 초대·이메일 OTP용
  - 예: `https://프로젝트.vercel.app/auth/confirm`
  - (경로는 앱의 `middleware` 공개 라우트와 일치해야 함)
- **초대 이메일** 쓰려면 위 URL이 먼저 맞아야 함. 프리 플랜 **이메일 한도**·스팸함 안내 유지

### 팀원

- Users에서 직접 생성 또는 Invite
- Invite는 **Redirect / Site URL** 설정 후

### Supabase CLI (선택, 이 레포에 스크립트 있음)

- `npm run db:login` → Enter → 브라우저 로그인
- `npm run db:link` → **Project ID(ref)는 대시보드 Copy 값**으로 `package.json` 스크립트 정리
- `npm run db:push` → `supabase/migrations/` 적용
- `npm run db:schema-dump` → **Docker Desktop 필요** (없으면 실패). Docker 싫으면 **대시보드 스크린샷·SQL 복사**로 충분한 팀 많음

### 프리 플랜·비활성

- 비활성 시 프로젝트 정지 등 — Supabase Billing/문서 확인
- Billing → Usage 주기적 확인

---

## 3. 로컬 개발

```bash
npm run dev
```

- `.env.local` 수정 후 **서버 재시작**
- 포트 충돌 시(Windows 예): `cmd.exe //c "taskkill /PID <pid> /F"` 후 재실행

---

## 4. GitHub

### Git 사용자 = Vercel에 연결한 GitHub 계정

```bash
git config user.email
git config user.name
```

- **Vercel이 연동한 GitHub와 다르면** 배포/권한 이슈 가능 → 이메일 맞추기

### 최초 푸시 흐름

```bash
git init
git add .
git commit -m "initial commit"
# GitHub에서 New repository (Private 권장)
git remote add origin https://github.com/유저명/프로젝트명.git
git branch -M main
git push -u origin main
```

- **`git push`만으로 Vercel 자동 배포** (연동된 경우)

---

## 5. Vercel

- GitHub로 Import → **Environment Variables**에 **Production(및 Preview)**
  - 최소: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_ADMIN_EMAILS` (사용 시)
  - **service_role** 쓸 때만 서버 env에 추가 (이 레포는 기본 미사용)
- 배포 완료 후 **Supabase Auth URL**을 Vercel 도메인으로 수정

### Hobby 플랜

- 상업적 이용 제한 등 정책은 Vercel 문서 확인
- 대역폭·배포 수 제한 등 — Vercel 대시보드/문서 참고

---

## 6. 이 스택에서의 앱 패턴 (rack-damage 기준)

- **Middleware**: 로그인 세션 + (필요 시) **공장 선택 쿠키** 등 라우트 가드
- **다공장(plant)**: 쿠키에 선택 plant 저장 → 맵/이슈/대시보드는 그 plant의 `floor_plan` 기준으로 조회
- **PDF export** 등: **현재 필터된 이슈(= 선택 plant 범위)** 기준

(새 프로젝트에 그대로 필요 없으면 이 절은 삭제해도 됨.)

---

## 7. 고급·운영

- **동시 편집**: PostgreSQL Last-Write-Wins — RLS는 권한만; 충돌 방지는 별도 설계
- **Realtime**: 프리 플랜 한도·트래픽 — 내부 툴은 수동 새로고침도 현실적
- **배포 순서 추천**: 로컬 완성 → 스키마/RLS 확정 → `git config` 확인 → Vercel 연결·env → 배포 → **Supabase URL 설정**

---

## 8. 트러블슈팅

| 상황 | 조치 |
|------|------|
| env 수정 후 반영 안 됨 | 서버 재시작 |
| DB 데이터 안 읽힘 | RLS 정책 확인 |
| Vercel 빌드 실패 | TypeScript 오류 로컬에서 먼저 해결 후 push |
| Secret / service_role 노출 | `NEXT_PUBLIC_` 절대 금지, Git에 커밋 금지 |
| Vercel 배포 Blocked | `git config user.email` — Vercel 연결 GitHub 계정과 일치 |
| `db:link` **Not Found** | Project ID **Copy**로 재확인; `npm run db:projects`; 로그인 계정이 오너인지 |
| `db:schema-dump` **Docker 오류** | Docker Desktop 실행 또는 `pg_dump` 직접 사용·또는 대시보드 스샷 |
| CLI **command not found** | 전역 설치 없으면 **`npm run …`** 로 실행 |
| Vercel에서 DB 안 됨 | env 이름·값·Production/Preview 복사 여부 |
| 초대 링크가 로그인만 됨 | Redirect URLs·Site URL |
| 팀원 초대 이메일 미수신 | 스팸, 시간당 한도 |
| Supabase 프로젝트 정지 | 대시보드 로그인으로 재활성화 |

---

## 9. 한 줄 요약

**Next 생성 → Supabase(테이블·RLS·Storage) → `.env.local`로 로컬 → GitHub에는 코드만 → Vercel에 `NEXT_PUBLIC_*` (필요 시만 서버 시크릿) → 배포 후 Supabase Auth URL 정리**가 안전하고 흔한 패턴이고, **service_role·DB 비밀번호·CLI 토큰은 절대 공개 채널에 두지 않기.**

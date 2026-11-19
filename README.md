# Show Me

피그마 프로토타입을 Next.js + Tailwind CSS로 옮긴 모바일 우선 웹앱입니다.

## 실행

Cursor에서 이 폴더를 열고 터미널에 입력합니다.

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:3000 을 엽니다.

## 어디를 고치면 되나요?

| 바꾸고 싶은 것 | 파일 |
| --- | --- |
| 색상·글꼴 | `app/globals.css` 맨 위 |
| 상품, 브랜드, 세일 일정, 마이페이지 메뉴 | `lib/data.ts` |
| 쇼핑메이트 답변 (Claude 연결·예시 답변) | `lib/chat.ts`, `app/api/chat/route.ts` |
| 화면별 코드 | `app/` 안의 각 폴더 `page.tsx` |
| 이미지 | `public/images/` |

## 쇼핑메이트 채팅 (Claude API)

채팅은 서버 라우트 `app/api/chat/route.ts`가 Claude(`claude-sonnet-5-5`)에게 물어서 답합니다.
API 키가 없으면 `lib/chat.ts`의 미리 써둔 예시 답변으로 대신 답하니, 키 없이도 앱은 동작해요.

키를 받으면:

1. 프로젝트 맨 위 폴더(`package.json`이 있는 곳)에 `.env.local` 파일을 만들고 한 줄을 적습니다.
   ```
   ANTHROPIC_API_KEY=여기에_받은_키
   ```
2. `npm run dev`를 껐다가 다시 켭니다.

`.env.local`은 `.gitignore`에 들어 있어 GitHub에 올라가지 않아요. 키를 코드 파일에 직접 붙여 넣지 마세요.
배포(예: Vercel)할 때는 그 서비스의 환경 변수 설정에 같은 이름(`ANTHROPIC_API_KEY`)으로 넣으면 됩니다.

## 이미지·아이콘

`public/images/`와 `public/icons/`의 파일은 Figma(Show Me - 수정본)에서 내려받은 원본입니다.
남성 온보딩 사진은 `style-male-*.jpg`, 남성 아바타는 `avatar/body-male.jpg`이고, 기본 정보에서 성별을 바꾸면 자동으로 바뀝니다.

## 화면 주소

| 화면 | 주소 |
| --- | --- |
| 시작 | `/` |
| 온보딩 | `/onboarding/profile`, `/onboarding/concerns`, `/onboarding/style` |
| 하단 탭 | `/chat`, `/closet`, `/avatar`, `/taste`, `/calendar` |
| 링크 입력 | `/closet/link`, `/avatar/link` |
| 관심 브랜드 추가 | `/calendar/brands` |
| 마이페이지·장바구니 | `/mypage`, `/cart` |

입력한 내용은 브라우저에 저장됩니다. 처음 상태로 돌리려면 마이페이지 맨 아래의 `데모 데이터 초기화`를 누르세요.

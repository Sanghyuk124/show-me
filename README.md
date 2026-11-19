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
| 쇼핑메이트가 추천하는 상품 목록 | `lib/products.ts` (사진은 `public/images/products/`) |
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
취향 사진은 `public/images/taste/female/`, `male/`에 성별별 18장씩 있어요 (목록: `lib/data.ts`의 `TASTE_LIST`).
온보딩 '좋아하는 스타일' 화면은 이 중 랜덤 12장, '취향 찾기' 탭은 랜덤 9장 → 저장하면 나머지 9장을 보여 줘요.
기본 정보에서 성별을 바꾸면 그 성별의 사진으로 바뀝니다.

### 시연용 옷 사진 (사진 첨부 → 자동 누끼)

나의 옷장의 '+ 사진 첨부하기'를 누르면 휴대폰 사진 보관함이 열리고, 고른 사진은 배경을 지운(누끼) 채로 옷장에 들어가요 (`lib/cutout.ts`, 휴대폰 브라우저 안에서 계산).
시연용 사진은 `public/demo-photos/`에 있어요. 배포한 주소 뒤에 `/demo-photos/파일이름.jpg`를 붙여 휴대폰에서 열고, 길게 눌러 사진 보관함에 저장해 두면 돼요.
흰색·회색처럼 단색 배경의 상품 사진에서 가장 잘 돼요.

## 3D 아바타

아바타 탭의 3D 인체 모델은 [MakeHuman](https://github.com/makehumancommunity/makehuman)의 인체 데이터(CC0 1.0, 상업적 이용 가능)로 만들었습니다.
키·몸무게·성별과 상세 치수(팔 길이·어깨 너비·가슴·허리·엉덩이 둘레·인심)를 넣으면, MakeHuman 줄자 위치에서 잰 값이 입력값과 같아지도록 몸 모양이 바뀝니다.

| 파일 | 하는 일 |
| --- | --- |
| `public/models/avatar-female.bin`, `avatar-male.bin` | 인체 모델 파일 (팔·다리를 모은 자세, 변형 데이터 포함) |
| `scripts/avatar/build_avatar.py` | MakeHuman 데이터로 위 파일을 다시 만드는 스크립트 (파일 위 설명 참고) |
| `lib/bodyModel.ts` | 입력값 정리, 입력 안 한 치수는 키·몸무게로 추정 |
| `lib/avatarModel.ts` | 모델 파일 읽기, 치수에 맞춰 몸 모양 계산 |
| `components/Avatar3D.tsx` | 화면에 그리기, 회전, 속옷 칠하기 |

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

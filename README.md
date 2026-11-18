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
| 쇼핑메이트 답변 (지금은 예시 답변) | `lib/chat.ts` |
| 화면별 코드 | `app/` 안의 각 폴더 `page.tsx` |
| 이미지 | `public/images/` |

## 이미지 교체

지금 이미지는 녹화 영상에서 잘라낸 것이라 화질이 낮습니다.
피그마에서 원본을 내보낸 뒤 `public/images/`의 같은 파일명(.jpg)으로 덮어쓰면 바로 반영됩니다.

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

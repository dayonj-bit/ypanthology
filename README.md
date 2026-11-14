# YP ANTHOLOGY — An Invitation

정적 사이트. `index.html` 한 장에 로고(SVG)·폰트가 모두 들어 있어 따로 챙길 파일이 없습니다.

## 파일
- `index.html` — 온보딩, 픽션/카툰 카드 덱, 상세(프리뷰) 페이지
- `vercel.json`, `package.json` — Vercel 설정

## 작품 수정
`index.html` 아래쪽 `DATA` 에서 작가·제목·태그·본문(body: 문단 배열)을 고칩니다.
표지 이미지를 넣을 때는 이미지를 `index.html` 과 같은 폴더(또는 하위 폴더)에 올리고 `cover: "cover-934.jpg"` 처럼 적습니다.

## Vercel 배포
Framework Preset: **Other**, Build Command 없음, Output Directory 기본값.
GitHub에 올릴 때 `index.html` 이 저장소 맨 위(루트)에 있어야 합니다.


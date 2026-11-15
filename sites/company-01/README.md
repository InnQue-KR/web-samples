# company-01 · 도람정밀(가상) 기업 홈페이지 DELUXE 샘플

base `/company-01/`, 조립 결과 `dist/company-01/`. 시안: 기업 시안 v2 ZIP(SHA-256 `c2e86b93…6315c`, HTML 12개). 모든 상호·주소·연락처·수치·인물·글은 가상입니다.

## 확정 URL (콘텐츠 10개 + 오류 화면 1개)

시안의 12 HTML + 공지 상세 2건(=14)을 납품 표준 DELUXE 10 URL에 맞춰 조립했습니다(CTO 기술 기준). 내용·색·컴포넌트는 그대로이고, 합친 페이지는 구역 앵커로 연결합니다.

| # | URL | 틀 | 시안 파일 |
|---|---|---|---|
| 1 | `/company-01/` | Home | index.html |
| 2 | `/company-01/about/` (+`#history`, `#access`) | Page | about.html + history.html + access.html |
| 3 | `/company-01/services/` (+`#s01~03`, `#materials`, `#equipment`, `#quality`) | Page | services.html + equipment.html + quality.html |
| 4 | `/company-01/cases/` | Page | cases.html |
| 5 | `/company-01/news/` | NewsList | news.html |
| 6 | `/company-01/news/seollal-holiday/` | NewsDetail | (시안에 상세 없음 → 같은 틀로 작성) |
| 7 | `/company-01/news/5-axis-machining-center/` | NewsDetail | news-detail.html |
| 8 | `/company-01/news/quality-certification-renewal/` | NewsDetail | (시안에 상세 없음 → 같은 틀로 작성) |
| 9 | `/company-01/quote/` | Page | quote.html |
| 10 | `/company-01/privacy/` | Page | privacy.html |
| – | `/company-01/404.html` | Page | 별도 오류 화면(콘텐츠 URL에 세지 않음) |

머리말 하위 메뉴: 회사 소개 → 회사 소개·연혁·인증(`about/#history`) / 가공 서비스 → 가공 서비스·가공 사례(`cases/`)·설비(`services/#equipment`)·품질 관리(`services/#quality`) / 오시는 길 → `about/#access`.

## 구조

```text
src/
  pages/          index · about · services · cases · quote · privacy · 404 · news/index · news/[slug]
  layouts/BaseLayout.astro   공통 껍데기(SampleHead noindex·OG, 샘플 띠, 머리말, 견적 띠, 바닥글, 안내창)
  components/     시안 data-component 단위(Hero, SpecStrip, FieldCards, CaseCard, CaseList(+필터), PageHead, LocalNav, PartHead,
                  ProcessSteps, QuoteForm, SampleNotice, SiteHeader, SiteFooter, CtaBand …)
  content/news/*.md          공지(파일 하나 = 글 하나, 파일 이름 = 주소)
  content.config.ts          공지 형식(title, date, tag 공지|설비|인증, description, image?, imageAlt?)
  data/site.json             상호·연락처·주소·시간·메뉴·고지 문구·SEO
  data/cases.json            가공 사례 9건과 필터 값
  scripts/site.ts            모바일 메뉴·하위 메뉴·Escape·초점 복귀, 샘플 안내창, 등장 효과 1종
  styles/tokens.css, site.css  시안 CSS(값/컴포넌트). 구현에서 더한 규칙은 site.css 끝에 모음
public/images/   시안 SVG 그대로 + 윤곽선 로고·favicon·OG 이미지
public/fonts/plex-mono/   IBM Plex Mono 1.1.0 공식 Latin1 woff2 2개(변경 없음) + LICENSE
docs/            assets.csv(자원 목록), licenses/, operations.md(운영 안내)
scripts/         outline-logo.mjs(로고 글자 → 윤곽선, 1회), make-og.mjs(OG 이미지, 1회)
```

## 명령 (저장소 루트에서)

```bash
npm ci && npm run build && npm run check
npm run smoke:company-01      # qa-output/company-01/smoke.json, PNG
npm run preview               # http://127.0.0.1:4321/company-01/
```

## 시안에서 바꾼 곳(이유)

1. **페이지 조립**: 연혁·인증/오시는 길 → 회사 소개, 설비/품질 관리 → 가공 서비스(10 URL 기준). 원래 페이지 제목은 같은 모양의 구역 머리(`PartHead`, h2)로 옮기고 그 안의 구역 제목은 h3로 내려 페이지마다 h1이 하나가 되게 했습니다.
2. **공지 상세 3건 실제 생성**: 안내창으로 남아 있던 2건(설 연휴, 인증 갱신)의 본문을 작성. 이전/다음 글이 실제로 이동하고 끝 글은 "없습니다"로 표시.
3. **글꼴**: 시안의 Pretendard 전체 글리프 woff2 3개(약 2.3MB)를 쓰지 않고 공식 가변 dynamic-subset(화면에 쓰인 범위만 받음). IBM Plex Mono는 공식 1.1.0 파일 그대로.
4. **로고**: `<text>`(글꼴 의존) → 윤곽선 path. 모양 동일.
5. **견적 폼 안전장치**: 입력 칸·동의에서 `name` 제거, 전체를 `<fieldset disabled>`로 시작하고 스크립트가 submit 차단을 먼저 붙인 뒤 해제(공통 `sample-form`). JS 꺼짐 안내 추가. 통과 시 입력값·동의 즉시 지움. 글자 수 상한(회사명 50·이름 30·연락처 100·품목 100·요청 1,000). 칸별 `role=alert` 대신 위쪽 요약 한 곳에서 읽게 함.
6. **동의·방침 문안**: 실제 수집처럼 읽히지 않게 "샘플 시연: 저장·전송하지 않음"을 앞에 두고, 시안 문안은 "실제 납품 문안(예시)"으로 유지. 개인정보처리방침 첫머리에 같은 안내.
7. **모바일 격자**: 시안은 12단 격자가 휴대폰에서도 유지돼 오시는 길 표·안내가 화면 밖으로 넘쳤음(시안 미리보기 access-360에서도 잘림) → 1023px 이하에서 세로로 쌓음. 교통 안내 2칸도 767px 이하 1칸.
8. **사례 필터 JS 꺼짐**: 동작하지 않는 칩은 숨기고 9건 전체 표시.
9. **측정**: `data-track` 속성은 시안 그대로 남겼지만 이벤트를 연결하지 않음(기업 DELUXE 범위 밖). 외부 태그 없음.
10. 상세 화면 그림 설명이 본문 글자 크기(17px)로 커지던 CSS 우선순위를 12px로 고정.

## 남은 확인(마케팅·기획)

- 새로 쓴 공지 본문 2건(설 연휴, 인증 갱신)과 시안에서 넘어온 보조 문장(서비스 설명·일하는 원칙·검사 장비·교통 안내), 설비 최대 크기 값.
- 연혁·인증 카드에는 "2025년 갱신 심사 완료", 공지 날짜는 2026-09-02로 시안끼리 연도가 다릅니다. 둘 다 시안 값 그대로 두었습니다(공지 본문에는 연도를 쓰지 않음).
- SVG 일러스트 안의 작은 글자(±0.02, QTY 등)는 `<img>` 안이라 페이지 글꼴을 못 쓰고 브라우저 기본 고정폭 글꼴로 그려집니다(시안과 같은 방식).

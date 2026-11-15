# company-01 운영 안내 (초안)

대상: 도람정밀(가상) 샘플 사이트를 실제 고객 사이트로 바꾸거나 내용을 고치는 담당자. 공개 배포·DNS는 이 문서 범위가 아니며 별도 대표 승인 뒤 진행합니다.

## 1. 자주 바꾸는 내용

| 바꿀 것 | 위치 | 방법 |
|---|---|---|
| 상호·대표·사업자번호·주소·전화·이메일·운영 시간·설립·인원·면적 | `src/data/site.json` → `business` | 값만 고치면 머리말·바닥글·회사 개요·오시는 길·견적 안내·동의 문안에 함께 반영 |
| 메뉴 | `site.json` → `nav`, `footerNav` | `href`는 base 없이(`about/#history`). 펼침 메뉴의 초점 가두기(inert)·Esc 닫기·하위 메뉴 표시와 `aria-expanded` 맞춤은 `src/scripts/site.ts`가 자동으로 하므로 항목만 고치면 됩니다. JS가 꺼지거나 실패하면 1023px 이하에서 메뉴 버튼 대신 모든 메뉴를 펼친 목록으로 보여 줍니다(`html.js` 기준, `site.css`) |
| 바닥글 고지·샘플 띠·안내창 문구 | `site.json` → `notice` | 실제 납품 때 샘플 띠·샘플 고지는 삭제 |
| 페이지 제목·설명(SEO) | 각 `src/pages/*.astro`의 `title`, `description` / 홈은 `site.json` → `seo` | |
| 가공 사례 | `src/data/cases.json` | 필터 값(`filters`)과 각 사례의 `material/process/use`가 정확히 같아야 걸러짐. 홈 대표 사례는 `home: 1~3` |
| 공지 추가 | `src/content/news/<영문-주소>.md` | 맨 위에 `title`, `date`(YYYY-MM-DD), `tag`(공지·설비·인증), `description`, 선택 `image`(public/images 파일명)·`imageAlt`. 목록 번호·홈 최근 3건·이전/다음 글은 자동 |
| 사진 교체 | `public/images/` | 같은 비율(4:3, 1:1, 3:2, 16:9, 15:8)로 넣고 `src`·대체 텍스트·"일러스트 · 실제 사진이 아닙니다" 문구·`docs/assets.csv`를 함께 고침. 제조사 로고·회사 각인 금지, 사람은 손만. **첫 화면 그림**(홈 `Hero.astro`, 가공 서비스 첫 구역, 회사 소개 공장 그림)은 `loading="lazy"`·`data-reveal`를 붙이지 말고 `fetchpriority="high" decoding="sync"`를 유지합니다(모바일 LCP). 그 아래 그림은 `loading="lazy"` |
| 인증 연도·내용 | `src/pages/about.astro`(인증 카드) + `src/content/news/quality-certification-renewal.md`(공지 날짜) | 둘을 함께 고쳐 연도가 맞게 둡니다(지금은 둘 다 2026, 가상). 실제 인증을 확인하기 전에는 "(가상)" 표기를 지우지 않습니다 |
| 견적 폼 칸 | `src/components/QuoteForm.astro` | 칸을 더하거나 빼면 `check()`(검사·오류 문구)와 `clearFieldErrors()`(오류 지우기)에 함께 반영. 오류 요약은 제출에 실패한 뒤 칸을 고칠 때마다 자동으로 개수·문구가 바뀌고 0개면 숨습니다 |

고친 뒤 루트에서 `npm run build && npm run check && npm run smoke:company-01`.

메뉴·폼·첫 화면 그림을 고쳤다면 다음도 확인합니다(smoke에 자동 검사가 있음).

- 360·768에서 메뉴를 열고 Tab·Shift+Tab을 여러 번 눌러도 초점이 메뉴 뒤 본문으로 가지 않는지. 닫기·Esc·링크·화면 넓히기 뒤 본문을 다시 누를 수 있는지
- 1280에서 하위 메뉴를 hover·Tab으로 연 뒤 Esc로 닫히고, 밖으로 나갔다 오면 다시 열리는지
- 견적 폼 빈 제출 뒤 칸을 고칠 때 요약 개수가 줄고 0개면 사라지는지
- 속도를 다시 잴 때: Lighthouse 모바일 기본값으로 화면마다 3회 재서 중앙값을 쓰고, 압축(gzip) 여부와 측정 PC의 CPU 지수(`benchmarkIndex`)를 함께 적습니다. 같은 PC라도 부하에 따라 LCP가 1초 넘게 흔들리므로 고치기 전·후를 번갈아 재야 비교가 됩니다

## 2. 공지가 10건을 넘을 때

목록은 한 쪽만 만들어져 있습니다(쪽 이동 "1"). 10건을 넘기기 전에 `src/pages/news/`에 쪽 나눔(`paginate`)을 추가해야 합니다. 이때 콘텐츠 URL 수가 늘어나므로 상품 범위(DELUXE 10 URL)와 따로 협의합니다.

## 3. 견적 문의 폼을 실제로 받기 (샘플 → 납품 전환 체크)

샘플은 입력값을 어디에도 보내지 않습니다. 실제 납품에서는 `src/components/QuoteForm.astro` 구역을 외부 폼(예: Tally 삽입)으로 바꾸고 아래를 확인합니다.

- [ ] 같은 입력 5개(회사명·담당자 이름(선택)·연락처·품목·수량·요청 사항(선택)), 첨부 없음 유지. 도면은 이메일로 받는다는 안내 유지
- [ ] [필수] 수집·이용 동의 문안의 주체·목적·항목·보유 기간·거부권과 불이익·문의처를 실제 값으로. "샘플 시연" 문단 삭제
- [ ] [선택] 이름 동의 연동(이름 입력 시 동의 필수)
- [ ] 외부 폼 서비스의 국외 이전·처리 위탁 고지와 동의, 개인정보처리방침 5항 작성. 맨 위 "샘플 사이트에서는 수집하지 않습니다" 안내 삭제
- [ ] 접수 알림 메일 도착·삭제(보유 기간) 동작을 실제로 시험하고 기록
- [ ] 전화·이메일 링크: 지금은 샘플 안내창(`data-sample-notice`)만 엽니다. 실제 `tel:`/`mailto:`로 바꾸면 `scripts/check-dist.mjs`의 tel/mailto 금지 검사도 함께 조정
- [ ] 샘플 띠·바닥글 샘플 고지·`noindex, nofollow`는 실제 공개 전에 고객 기준으로 정리

## 4. 측정(분석)

기업 DELUXE 샘플에는 전환 측정을 넣지 않았습니다. 마크업의 `data-track`(nav_quote_click, hero_quote_click, hero_cases_click, cta_quote_click, quote_submit_click, tel_click, mail_click)은 표시만 있고 연결된 코드가 없습니다. 측정을 추가하려면 별도 견적·승인 뒤 최대 3종을 고객과 고릅니다. 실제 GA 속성 연동은 이 샘플에서 하지 않았습니다.

## 5. 글꼴·라이선스

- Pretendard 1.3.9: 빌드 때 npm 패키지에서 `public/fonts/pretendard/`로 복사(저장소에 없음). SIL OFL 1.1.
- IBM Plex Mono 1.1.0 Latin1 2개: `public/fonts/plex-mono/`에 공식 파일 그대로. SIL OFL 1.1, Reserved Font Name "Plex"라 파일을 고치거나 서브셋하면 이름을 바꿔야 합니다. 고치지 마세요.
- 아이콘: Lucide(ISC). 자원 전체 목록은 `docs/assets.csv`.

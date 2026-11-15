# company-01 운영 안내 (초안)

대상: 도람정밀(가상) 샘플 사이트를 실제 고객 사이트로 바꾸거나 내용을 고치는 담당자. 공개 배포·DNS는 이 문서 범위가 아니며 별도 대표 승인 뒤 진행합니다.

## 1. 자주 바꾸는 내용

| 바꿀 것 | 위치 | 방법 |
|---|---|---|
| 상호·대표·사업자번호·주소·전화·이메일·운영 시간·설립·인원·면적 | `src/data/site.json` → `business` | 값만 고치면 머리말·바닥글·회사 개요·오시는 길·견적 안내·동의 문안에 함께 반영 |
| 메뉴 | `site.json` → `nav`, `footerNav` | `href`는 base 없이(`about/#history`) |
| 바닥글 고지·샘플 띠·안내창 문구 | `site.json` → `notice` | 실제 납품 때 샘플 띠·샘플 고지는 삭제 |
| 페이지 제목·설명(SEO) | 각 `src/pages/*.astro`의 `title`, `description` / 홈은 `site.json` → `seo` | |
| 가공 사례 | `src/data/cases.json` | 필터 값(`filters`)과 각 사례의 `material/process/use`가 정확히 같아야 걸러짐. 홈 대표 사례는 `home: 1~3` |
| 공지 추가 | `src/content/news/<영문-주소>.md` | 맨 위에 `title`, `date`(YYYY-MM-DD), `tag`(공지·설비·인증), `description`, 선택 `image`(public/images 파일명)·`imageAlt`. 목록 번호·홈 최근 3건·이전/다음 글은 자동 |
| 사진 교체 | `public/images/` | 같은 비율(4:3, 1:1, 3:2, 16:9, 15:8)로 넣고 `src`·대체 텍스트·"일러스트 · 실제 사진이 아닙니다" 문구·`docs/assets.csv`를 함께 고침. 제조사 로고·회사 각인 금지, 사람은 손만 |

고친 뒤 루트에서 `npm run build && npm run check && npm run smoke:company-01`.

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

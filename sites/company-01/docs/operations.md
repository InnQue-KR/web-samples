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

고친 뒤 루트에서 `npm run build && npm run check && npm run smoke:company-01`. 본문·공지·메뉴·안내 문구 등에 파생 글꼴에 없는 글자가 하나라도 생기면 `npm run check`가 "파생 글꼴 Doram Sans 범위 밖 글자"로 실패합니다. 그때는 5절대로 글꼴을 다시 만들고(재생성 → `npm run build` → `npm run check` 통과) 나서 배포합니다. **`npm run check`가 실패한 상태의 dist는 배포하지 않습니다.** 재생성 없이 내보내면 그 글자는 공식 Pretendard가 아니라 기기에 있는 시스템 글꼴(Noto Sans KR·Apple SD Gothic Neo·맑은 고딕 등)로 그려져 주변 글자와 모양이 달라집니다(5절 "범위 밖 글자" 참고).

메뉴·폼·첫 화면 그림을 고쳤다면 다음도 확인합니다(smoke에 자동 검사가 있음).

- 360·768에서 메뉴를 열고 Tab·Shift+Tab을 여러 번 눌러도 초점이 메뉴 뒤 본문으로 가지 않는지. 닫기·Esc·링크·화면 넓히기 뒤 본문을 다시 누를 수 있는지
- 1280에서 하위 메뉴를 hover·Tab으로 연 뒤 Esc로 닫히고, 밖으로 나갔다 오면 다시 열리는지
- 1024·1280에서 새로 연 페이지의 [회사 소개]·[가공 서비스]를 처음 클릭·터치 탭·Enter 했을 때 바로 열리는지(hover로 보이던 상태도 '열기 전'으로 봄, INNA-653). 다시 누르면 닫히고, 메뉴 밖을 누르면 닫힘
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

- **Doram Sans(파생 글꼴, INNA-653)**: `public/fonts/doram-sans/`. Pretendard 1.3.9 가변 글꼴에서 이 사이트에 쓰인 글자(사이트 HTML·JS·CSS 문구 + 출력 가능한 ASCII 전부 + 고정 기호, 지금 501자)만 남긴 파일 하나(약 112KB). 윤곽선·굵기 축(45–930)·간격·kern·OpenType 기능은 원본 그대로이고, SIL OFL 1.1의 예약 글꼴 이름(Pretendard) 때문에 이름표만 `Doram Sans`로 바꿨습니다. 저작권·라이선스·상표 문구는 그대로이며 `LICENSE.txt`(원본과 같은 OFL 전문), `FONTLOG.txt`(수정 기록), `manifest.json`(원본 해시·도구 버전·명령·글자 범위·결과 해시)을 함께 둡니다.
  - 본문 글꼴 순서: `"Doram Sans"` → `"Pretendard Variable"`(공식 dynamic-subset) → 시스템 글꼴. Doram Sans의 `unicode-range`가 실제 글자 목록과 같아서, 화면 글자는 파생본 한 파일만 받습니다. 공식 CSS(약 55KB)는 첫 로드에 붙이지 않으므로, 파생본 범위 밖 글자는 경로에 따라 다르게 그려집니다.
    - **방문자가 폼에 치는 글자(임의 입력)**: `BaseLayout.astro`의 인라인 스크립트가 `input·textarea·select·[contenteditable]`에 처음 초점이 갈 때(`focusin`) 공식 CSS를 붙이고, 그 뒤 범위 밖 글자만 공식 조각을 받습니다. 붙기 전(초점 직후 아주 짧은 순간)에는 시스템 글꼴로 보일 수 있습니다. 이 경로는 운영자가 미리 알 수 없는 글자를 위한 것입니다.
    - **운영자가 넣는 정적 콘텐츠(새 공지·본문·메뉴·안내 문구 등)**: 공식 Pretendard로 대체되지 않습니다. JS가 켜진 보통 방문에서는 입력 칸 초점 전까지 공식 CSS가 없으므로 범위 밖 글자를 시스템 글꼴로 그립니다(JS가 꺼진 방문만 `noscript`로 공식 CSS를 바로 붙여 공식 조각을 받음). 그래서 이런 글자는 반드시 아래 "다시 만들기"로 파생본에 넣습니다. `npm run check`가 dist의 HTML·JS·CSS 글자를 모두 검사해 하나라도 빠지면 실패하며, 실패한 상태로는 배포하지 않습니다.
  - **다시 만들기(글자를 바꿔 `npm run check`가 범위 밖 글자로 멈출 때)** — 저장소 루트에서:
    ```bash
    python3 -m venv .venv-font && .venv-font/bin/pip install --require-hashes -r sites/company-01/scripts/font-requirements.txt   # 처음 한 번(fontTools 4.68.0, brotli 1.2.1)
    npm run build                                                   # 새 글자가 들어간 dist/company-01
    .venv-font/bin/python sites/company-01/scripts/make-font-subset.py   # 글자 수집 → 서브셋·이름 변경 → css·manifest 갱신
    npm run build && npm run check && npm run smoke:company-01
    ```
    생성기는 원본 해시(`9599f12f…`)나 도구 버전이 다르면 멈춥니다. 같은 입력이면 같은 바이트가 나옵니다. `FONTLOG.txt` 변경 기록에 날짜·이유 한 줄을 더하고 `docs/assets.csv`의 크기·글자 수를 고칩니다. `.venv-font/`는 저장소에 넣지 않습니다.
  - 파생본을 손으로 고치거나 다른 사이트에 복사하지 않습니다(사이트마다 글자 목록이 다름). 랜딩(landing-01)은 공식 dynamic-subset 그대로입니다.
- Pretendard 1.3.9: 빌드 때 npm 패키지에서 `public/fonts/pretendard/`로 복사(저장소에 없음). SIL OFL 1.1. 이 사이트에서는 방문자가 폼에 치는 범위 밖 글자용 대체 경로입니다(입력 칸 `focusin` 때 붙임, JS 꺼짐은 `noscript`). 정적 콘텐츠의 범위 밖 글자는 이 경로로 대체되지 않으므로 Doram Sans를 다시 만듭니다.
- IBM Plex Mono 1.1.0 Latin1 2개: `public/fonts/plex-mono/`에 공식 파일 그대로. SIL OFL 1.1, Reserved Font Name "Plex"라 파일을 고치거나 서브셋하면 이름을 바꿔야 합니다. 고치지 마세요.
- 아이콘: Lucide(ISC). 자원 전체 목록은 `docs/assets.csv`.

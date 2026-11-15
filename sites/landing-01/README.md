# landing-01 — 셈틈 수학학원(가상) 랜딩 PREMIUM

한 페이지 8구역(첫 화면 · 수업 방식 · 반 안내 · 선생님 · 상담 순서 · FAQ · 오시는 길 · 상담 신청) + 모바일 하단 고정 CTA. 디자인 원본은 디자인팀 시안 `landing-01.zip`(SHA-256 `6aea3030…8c28`)입니다.

빌드·검사 명령은 저장소 루트 `README.md`를 봅니다. 이 폴더만 따로 쓸 때: `npm run build` → `dist/` (base `/landing-01/`).

## 파일

| 경로 | 내용 |
|---|---|
| `src/data/site.json` | 상호·연락처·주소·운영 시간·메뉴·고지 문구·SEO·측정 이벤트 3종·반/교습비 |
| `src/components/*.astro` | 시안의 `data-component` 구역 하나가 파일 하나 |
| `src/layouts/BaseLayout.astro` | 공통 head(sample-kit) + 글꼴 + 샘플 띠 + 안내 toast |
| `src/scripts/landing.ts` | 등장 효과 2·3, 하단 버튼 접기, 샘플 안내, 폼 검사 |
| `src/scripts/track.ts` | 버튼 클릭 측정 시연(메모리, 3종) |
| `src/styles/tokens.css`, `site.css` | 시안 CSS. 바뀐 곳은 아래 표 |
| `docs/operations.md` | 고객용 운영 안내 초안(측정 시연 확인 방법 포함) |
| `docs/assets.csv`, `docs/licenses/` | 자원·라이선스 |

## 시안에서 바꾼 곳

| # | 시안 | 구현 | 이유 |
|---|---|---|---|
| 1 | 사용자 정의 서브셋 `Pretendard-subset.woff2` 1개(330KB) | Pretendard 1.3.9 공식 가변 dynamic-subset(변경 없음). 첫 로드 14개 파일 | OFL Reserved Font Name 조건 미확인 파일을 배포하지 않음(과제 지시) |
| 2 | 첫 화면 공책 `3x = 20 − 5`(U+2212) | `–`(U+2013) | U+2212가 Pretendard에 없어 대체 글꼴로 그려짐(글꼴 범위 검사에서 발견) |
| 3 | 완료 화면 "신청이 접수되었습니다. 운영 시간 안에 연락드리겠습니다." | "입력 확인을 마쳤습니다 (샘플)" + 미전송 설명 | 실제 접수처럼 보이는 단독 성공 문구 금지(CTO 기준 3) |
| 4 | 동의 내용: 보유 기간 30일 등 실제 수집처럼 적힘 | 샘플은 저장·전송하지 않는다는 실제 흐름 + 실제 납품 때 들어갈 항목 안내 | 실제 미저장·미전송 흐름과 일치(CTO 기준 8) |
| 5 | 폼은 JS가 없으면 GET 제출 가능, 입력 칸에 `name` | 입력·버튼 전체를 `<fieldset disabled>`로 잠그고 JS가 붙은 뒤 해제, 개인정보 칸 `name` 제거, JS 꺼짐 안내 | JS 비활성·실패 시 주소에 개인정보가 붙는 것 방지 |
| 6 | 칸별 오류 `role="alert"` + 요약 `role="alert"` | 요약만 alert, 칸 오류는 `aria-describedby`로 읽음 | 같은 오류를 두 번 읽는 것 방지 |
| 7 | 하단 고정 버튼이 접혀도 Tab으로 들어감 | 접히면 `inert` | 보이지 않는 버튼에 초점이 가지 않게 |
| 8 | `data-track` 속성만 | 메모리 측정 시연 `sampleTrack.counts()` | PREMIUM "버튼 클릭 측정 설정(3종까지)" 시연. 외부 전송 없음 |

색(종이 `#FAF8F3`·남색 `#1B2A4A`·형광 노랑 `#FFE066`), 8구역 배치, FAQ·학년/시간 칩·동의 내용 펼치기·하단 고정 CTA·움직임 3종과 reduced-motion 처리는 시안 그대로입니다.

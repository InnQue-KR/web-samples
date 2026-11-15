# web-samples

InnQue 포트폴리오용 **가상** 샘플 사이트 모음입니다. 모든 상호·주소·연락처·인물·가격은 가상이고, 모든 HTML은 `noindex, nofollow`입니다. 샘플 폼은 입력값을 전송·저장하지 않습니다.

| sample-id | 내용 | 경로 |
|---|---|---|
| `landing-01` | 셈틈 수학학원(가상) 랜딩 PREMIUM | `sites/landing-01/` → `dist/landing-01/` |

## 고정 버전

| 항목 | 버전 | 근거 |
|---|---|---|
| Node.js | 24.22.3 (LTS "Krypton") | `.nvmrc`, `package.json` engines `>=24.22.3 <25`, `.npmrc` engine-strict |
| npm | 11.19.1 | `packageManager` |
| Astro | 7.4.12 | 2026-11-15 npm 최신 안정판, exact 고정 |
| TypeScript / @astrojs/check | 6.0.3 / 0.9.12 | @astrojs/check가 TS 7을 아직 지원하지 않아 6.x |
| Pretendard | 1.3.9 | 공식 npm 패키지의 가변 dynamic-subset을 변경 없이 복사 |
| Playwright(검사용) | 1.65.1 | Chromium headless shell |

의존성은 루트 `package-lock.json` 하나로 고정합니다(npm workspaces: `packages/*`, `sites/*`).

## 명령

```bash
npm ci                 # lockfile 그대로 설치
npm run build          # 각 사이트 빌드(+ Pretendard 복사) → dist/<sample-id>/ 로 조립, dist/index.html·404.html·.nojekyll 생성
npm run check          # astro check(타입) + dist 정적 검사(noindex·샘플 띠·외부 주소·경로·폼 잠금·data-track·글꼴 범위·전송량)
npx playwright install chromium   # smoke 처음 한 번
npm run smoke          # 브라우저 smoke(72+개 항목) → qa-output/landing-01/smoke.json, PNG
npm run preview        # http://127.0.0.1:4321/landing-01/ (dist를 GitHub Pages처럼 제공)
npm run zip            # out/ 에 소스 ZIP·배포 ZIP과 SHA-256
```

Chromium 실행에 시스템 라이브러리(libglib, libnss3 등)가 없으면 `npx playwright install-deps chromium`(root 필요)을 쓰거나, root가 없으면 해당 .deb를 사용자 폴더에 풀어 `LD_LIBRARY_PATH`와 `FONTCONFIG_FILE`을 지정합니다.

## 구조

```text
package.json  package-lock.json  .nvmrc  .npmrc
packages/sample-kit/     모든 샘플 공통의 최소 틀(브랜드 없음)
  SampleHead.astro       공통 <head>: robots noindex,nofollow 고정, OG, favicon (외부 CDN·분석 없음)
  SampleStrip.astro      맨 위 샘플 띠
  sample-notice.ts       전화·메일 등은 연결 대신 안내(toast)
  sample-form.ts         미전송 샘플 폼: submit 차단을 붙인 뒤에만 fieldset 잠금 해제
  scripts/copy-pretendard.mjs   Pretendard 공식 파일을 변경 없이 public/fonts로 복사
sites/<sample-id>/       독립 Astro 앱(base=/<sample-id>/). 색·글꼴 크기·배치 토큰은 사이트마다 따로
  src/{pages,components,layouts,styles,data/site.json,scripts}  public/  docs/
scripts/                 assemble(조립) · check-dist(정적 검사) · serve-dist(미리보기) · make_zips.py
tests/                   smoke-<sample-id>.mjs
```

공통 틀에는 **실제로 반복되는 것만** 둡니다: noindex head, 샘플 띠, 연결 대신 안내, 미전송 폼 잠금, 글꼴 복사. 회사 브랜드(숯색·도면 격자 등)나 색·간격 값은 공통 기본 테마로 만들지 않습니다. 토큰은 각 사이트 `src/styles/tokens.css`에 같은 이름 체계(`--color-*`, `--text-*`, `--space-*`, `--radius-*`)로 둡니다.

## 새 샘플 추가(예: company-01)

1. `sites/company-01/` 앱 생성, `astro.config.mjs`의 `base: '/company-01/'`, `@web-samples/sample-kit` 의존.
2. 루트에서 `npm install`로 lockfile 갱신(루트 버전·스크립트는 그대로).
3. `npm run build && npm run check`가 새 사이트도 자동으로 조립·검사합니다. `scripts/check-dist.mjs`의 landing-01 전용 항목은 사이트별로 추가합니다.

## 지키는 것

- 모든 HTML `noindex, nofollow`, 상단 샘플 띠, 바닥글 가상·AI 활용 고지
- InnQue 연락처·홈페이지·SNS 링크, 외부 CDN, 분석·광고 태그 없음. `tel:`·`mailto:` 없음
- 샘플 폼: 5개 이하 입력, 첨부 없음, 네트워크·URL·콘솔·쿠키·저장소에 입력값을 남기지 않음, JS 없이도 GET 전송 불가
- 공개 배포·DNS는 별도 대표 승인 전 실행하지 않음

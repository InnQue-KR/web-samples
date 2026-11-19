# 출고(배포) 기준

`dist-manifest.txt`는 **사이트 QA를 받은 정적 배포본**의 전체 파일 목록입니다. 한 줄에 `<sha256>  <바이트>  <경로>`를 적고 경로 순으로 정렬했습니다.

- 지금 기준: INNA-819 문구 수정본. 파일 247개, 6,896,082바이트, `.nojekyll` 포함. INNA-654~657에서 QA한 배포본(INNA-653 commit `8415dda` 빌드, ZIP SHA256 `4f5688ad…7d5f`, 6,894,773바이트)과 비교해 바뀐 것은 다음뿐입니다. 기기별 재검수는 하지 않았습니다.
  - 두 사이트의 샘플 띠·바닥글 AI 활용 고지, landing-01의 제목·설명 "(샘플)"과 교습비 "(가상 예시)", company-01의 바닥글 가상 항목과 설 연휴 공지 날짜(2027-01-25 → 2026-02-09)와 그에 따른 소식 순서·이전/다음 글
  - company-01 파생 글꼴 Doram Sans에 새 글자 1개(코, U+CF54) 추가(같은 스크립트로 재생성)
  - landing-01 스크립트는 site.json 문구를 함께 묶으므로 파일 이름(해시)만 바뀜. 문구 4곳을 되돌리면 이전 파일과 내용이 같음
- 검사: `node scripts/verify-dist-manifest.mjs [폴더=dist]`. 경로나 바이트가 하나라도 다르거나, 파일이 추가·삭제되면 종료 코드 1을 냅니다.
- 배포 워크플로 `.github/workflows/pages.yml`은 수동 실행(`workflow_dispatch`)만 받습니다. `npm ci → build → check → gate` 순서로 실행하고, 업로드한 artifact를 다시 풀어 같은 gate를 한 번 더 통과해야 배포합니다. `main`에서 승인된 commit(`expected_sha`)일 때만 실행됩니다.

## 사이트 내용을 바꿀 때

1. 사이트를 수정한 뒤 `npm run build`와 `npm run check`를 통과시킵니다(새 글자가 있으면 글꼴 재생성 포함).
2. **새 배포본으로 사이트 QA를 다시 받습니다.**
3. QA를 받은 배포본으로 `node scripts/verify-dist-manifest.mjs <QA 배포본 폴더> --write`를 실행해 manifest를 갱신합니다. 그다음 같은 commit에 넣습니다.
4. 대표 승인을 받은 commit만 위 워크플로로 배포합니다.

QA를 받지 않은 빌드로 manifest를 갱신하면 이 gate는 의미가 없습니다. manifest를 바꾼 commit은 리뷰에서 QA 증빙과 함께 확인합니다.

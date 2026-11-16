# 출고(배포) 기준

`dist-manifest.txt`는 **사이트 QA를 받은 정적 배포본**의 전체 파일 목록입니다. 한 줄에 `<sha256>  <바이트>  <경로>`를 적고 경로 순으로 정렬했습니다.

- 지금 기준: 정적 배포 ZIP SHA256 `4f5688adb570fd882c4896a8c81f2856d33b7727cd2698006aba2057b55e7d5f`(INNA-653 commit `8415dda`에서 빌드, INNA-654~657 QA). 파일 247개, 6,894,773바이트, `.nojekyll` 포함.
- 검사: `node scripts/verify-dist-manifest.mjs [폴더=dist]`. 경로나 바이트가 하나라도 다르거나, 파일이 추가·삭제되면 종료 코드 1을 냅니다.
- 배포 워크플로 `.github/workflows/pages.yml`은 수동 실행(`workflow_dispatch`)만 받습니다. `npm ci → build → check → gate` 순서로 실행하고, 업로드한 artifact를 다시 풀어 같은 gate를 한 번 더 통과해야 배포합니다. `main`에서 승인된 commit(`expected_sha`)일 때만 실행됩니다.

## 사이트 내용을 바꿀 때

1. 사이트를 수정한 뒤 `npm run build`와 `npm run check`를 통과시킵니다(새 글자가 있으면 글꼴 재생성 포함).
2. **새 배포본으로 사이트 QA를 다시 받습니다.**
3. QA를 받은 배포본으로 `node scripts/verify-dist-manifest.mjs <QA 배포본 폴더> --write`를 실행해 manifest를 갱신합니다. 그다음 같은 commit에 넣습니다.
4. 대표 승인을 받은 commit만 위 워크플로로 배포합니다.

QA를 받지 않은 빌드로 manifest를 갱신하면 이 gate는 의미가 없습니다. manifest를 바꾼 commit은 리뷰에서 QA 증빙과 함께 확인합니다.

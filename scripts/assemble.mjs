// 각 샘플의 sites/<id>/dist를 루트 dist/<id>/로 모으고, 샘플 선택 화면과 404를 만든다.
// 루트 화면에는 InnQue 연락처·홈페이지·SNS 링크를 넣지 않는다.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const out = join(root, 'dist');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const samples = [];
for (const id of readdirSync(join(root, 'sites')).sort()) {
  const built = join(root, 'sites', id, 'dist');
  if (!existsSync(built)) { console.error(`빌드 결과 없음: sites/${id}/dist`); process.exit(1); }
  cpSync(built, join(out, id), { recursive: true });
  const site = JSON.parse(readFileSync(join(root, 'sites', id, 'src/data/site.json'), 'utf8'));
  samples.push({ id, name: site.business.name, title: site.seo.title });
}

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const page = (title, body) => `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)}</title>
<style>body{margin:0;font-family:system-ui,sans-serif;line-height:1.6;color:#222;background:#fff}.top-strip{background:#222;color:#fff;text-align:center;padding:.5rem 1rem;font-size:.875rem}main{max-width:40rem;margin:0 auto;padding:2rem 1.25rem}a{color:inherit}li{margin:.5rem 0}</style>
</head>
<body>
<aside class="top-strip" aria-label="샘플 안내" data-sample-strip>샘플 사이트 · 실제 업체가 아닙니다</aside>
<main>
${body}
<p><small>여기 있는 사이트는 모두 포트폴리오용으로 만든 가상 샘플입니다. 상호·주소·연락처·인물·가격은 실제가 아닙니다. 기획·문구·이미지 제작에 AI를 활용했습니다.</small></p>
</main>
</body>
</html>
`;

const sampleList = `<ul>
${samples.map((s) => `<li><a href="/${s.id}/">${esc(s.name)} (가상)</a> · <code>${s.id}</code></li>`).join('\n')}
</ul>`;
writeFileSync(join(out, 'index.html'), page('가상 샘플 사이트 모음', `<h1>가상 샘플 사이트 모음</h1>
${sampleList}`));
// GitHub Pages는 하위 경로(/company-01/없는주소)에도 이 루트 404를 보여 준다. 각 샘플 시작 화면으로 바로 갈 수 있게 목록을 둔다.
writeFileSync(join(out, '404.html'), page('페이지를 찾을 수 없습니다', `<h1>페이지를 찾을 수 없습니다</h1>
<p>주소가 바뀌었거나 없는 페이지입니다. 아래 샘플의 시작 화면으로 이동해 주세요.</p>
${sampleList}
<p><a href="/">샘플 모음으로</a></p>`));
// GitHub Pages가 _astro/ 폴더를 무시하지 않게 한다.
writeFileSync(join(out, '.nojekyll'), '');

console.log(`조립 완료: dist/ (${samples.map((s) => s.id).join(', ')})`);

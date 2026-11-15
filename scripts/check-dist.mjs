// 조립된 dist/를 브라우저 없이 검사한다. 실패하면 종료 코드 1.
//  - 모든 HTML: noindex,nofollow / 샘플 띠 / 외부 주소·tel:·mailto: 없음
//  - 내부 경로(/, ./, url())가 실제 파일로 풀림, 샘플 페이지의 경로는 /<id>/ 아래
//  - 번들 JS: 네트워크 전송·브라우저 저장소·쿠키·콘솔 코드 없음
//  - landing-01: data-track 정확히 3종, 폼 잠금(fieldset disabled)과 개인정보 칸 name 없음
//  - Pretendard dynamic-subset 범위 밖 글자(글꼴 누락) 목록, 페이지별 예상 전송량
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const dist = join(root, 'dist');
const failures = [];
const report = {};
const fail = (msg) => failures.push(msg);

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
if (!existsSync(dist)) { console.error('dist/ 없음. 먼저 npm run build'); process.exit(1); }
const files = walk(dist);
const rel = (f) => '/' + relative(dist, f);
const sampleOf = (f) => { const p = rel(f).split('/')[1]; return existsSync(join(root, 'sites', p)) ? p : null; };

// 1) 내부 경로를 파일로 푼다. 디렉터리면 index.html.
const resolveUrl = (fromFile, url) => {
  const clean = url.split('#')[0].split('?')[0];
  if (!clean) return fromFile;
  const p = clean.startsWith('/') ? join(dist, clean) : resolve(dirname(fromFile), clean);
  if (existsSync(p) && statSync(p).isDirectory()) return join(p, 'index.html');
  return p;
};
const ALLOWED_ABSOLUTE = /^http:\/\/www\.w3\.org\//; // SVG 네임스페이스

for (const f of files.filter((x) => x.endsWith('.html'))) {
  const html = readFileSync(f, 'utf8');
  const id = sampleOf(f);
  if (!/<meta name="robots" content="noindex, nofollow"\s*\/?>/.test(html)) fail(`${rel(f)}: noindex,nofollow 없음`);
  if (!html.includes('data-sample-strip')) fail(`${rel(f)}: 샘플 띠 없음`);
  if (!/AI를 활용/.test(html)) fail(`${rel(f)}: AI 활용 고지 없음`);
  if (/(href|src|action)\s*=\s*["']?(tel:|mailto:|sms:)/i.test(html)) fail(`${rel(f)}: tel/mailto 링크 있음`);
  if (/innque\.co\.kr|github\.com\/InnQue|instagram|facebook\.com|blog\.naver/i.test(html)) fail(`${rel(f)}: InnQue/SNS 링크 의심`);
  if (/googletagmanager|google-analytics|gtag\(|fbq\(/i.test(html)) fail(`${rel(f)}: 분석 태그 있음`);
  for (const m of html.matchAll(/\s(?:href|src|action|content|srcset)=["']?([^"'\s>]+)/g)) {
    const url = m[1];
    if (/^(https?:)?\/\//i.test(url)) { if (!ALLOWED_ABSOLUTE.test(url)) fail(`${rel(f)}: 외부 주소 ${url}`); continue; }
    if (!/^(\/|\.\/|\.\.\/)/.test(url) && !/\.(css|js|svg|png|webp|jpg|woff2)$/.test(url)) continue; // #앵커, 일반 content 값
    if (m[0].includes('content=') && !url.startsWith('/')) continue;
    if (id && url.startsWith('/') && !url.startsWith(`/${id}/`)) fail(`${rel(f)}: /${id}/ 밖 경로 ${url}`);
    if (!existsSync(resolveUrl(f, url))) fail(`${rel(f)}: 없는 파일 ${url}`);
  }
}
for (const f of files.filter((x) => x.endsWith('.css'))) {
  const css = readFileSync(f, 'utf8');
  for (const m of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
    const url = m[1];
    if (url.startsWith('data:')) continue;
    if (/^(https?:)?\/\//.test(url)) { fail(`${rel(f)}: 외부 주소 ${url}`); continue; }
    if (!existsSync(resolveUrl(f, url))) fail(`${rel(f)}: 없는 파일 ${url}`);
  }
}
for (const f of files.filter((x) => x.endsWith('.js'))) {
  const js = readFileSync(f, 'utf8');
  for (const bad of ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'WebSocket', 'localStorage', 'sessionStorage', 'document.cookie', 'console.', 'indexedDB']) {
    if (js.includes(bad)) fail(`${rel(f)}: ${bad} 사용`);
  }
  if (/https?:\/\/(?!www\.w3\.org)/.test(js)) fail(`${rel(f)}: JS 안 외부 주소`);
}

// 2) landing-01 전용 확인
const landing = join(dist, 'landing-01/index.html');
if (existsSync(landing)) {
  const html = readFileSync(landing, 'utf8');
  const tracks = [...html.matchAll(/data-track="([^"]+)"/g)].map((m) => m[1]);
  const set = [...new Set(tracks)].sort();
  const expected = ['cta_hero_apply', 'cta_phone', 'cta_sticky_apply'];
  if (JSON.stringify(set) !== JSON.stringify(expected)) fail(`landing-01: data-track 종류 ${set.join(',')} (기대 ${expected.join(',')})`);
  report.track = tracks.reduce((a, t) => ({ ...a, [t]: (a[t] ?? 0) + 1 }), {});
  if (!/<fieldset[^>]*data-sample-lock[^>]*disabled/.test(html)) fail('landing-01: 폼 fieldset 기본 잠금(disabled) 없음');
  for (const id of ['f-name', 'f-phone', 'f-question', 'f-consent', 'f-name-consent']) {
    const tag = html.match(new RegExp(`<(?:input|textarea)[^>]*id="${id}"[^>]*>`))?.[0];
    if (!tag) fail(`landing-01: #${id} 없음`);
    else if (/\sname=/.test(tag)) fail(`landing-01: #${id}에 name 속성 있음(제출 시 값이 붙을 수 있음)`);
  }
  const inputs = (html.match(/<(input|textarea)\b(?![^>]*type="checkbox")[^>]*>/g) ?? []).map((t) => t.match(/name="([^"]+)"|id="([^"]+)"/)?.slice(1).find(Boolean));
  report.formFields = [...new Set(inputs)];
  if (report.formFields.length > 5) fail(`landing-01: 입력 항목 ${report.formFields.length}개 (5개 이하)`);
  if (/type="file"/.test(html)) fail('landing-01: 첨부 입력 있음');
}

// 3) 글꼴 범위·전송량 (샘플별)
const parseRanges = (css) => [...css.matchAll(/src:\s*url\(([^)]+)\)[^;]*;\s*unicode-range:\s*([^;]+);/g)].map((m) => ({
  file: m[1].replace(/['"]/g, ''),
  ranges: m[2].split(',').map((r) => { const [a, b] = r.trim().replace(/^U\+/i, '').split('-'); return [parseInt(a, 16), parseInt(b ?? a, 16)]; }),
}));
const textOf = (html) => {
  const attrs = [...html.matchAll(/\s(?:alt|aria-label|title|placeholder|content)="([^"]*)"/g)].map((m) => m[1]);
  const body = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');
  return (body + ' ' + attrs.join(' ')).replace(/&[a-z]+;|&#\d+;/g, ' ');
};
for (const id of readdirSync(join(root, 'sites'))) {
  const fontCss = join(dist, id, 'fonts/pretendard/pretendardvariable-dynamic-subset.css');
  if (!existsSync(fontCss)) continue;
  const faces = parseRanges(readFileSync(fontCss, 'utf8'));
  const pages = files.filter((f) => f.endsWith('.html') && sampleOf(f) === id);
  const r = (report[id] = { fontFaces: faces.length, fontFilesOnDisk: 0, fontBytesOnDisk: 0, pages: {} });
  for (const f of walk(join(dist, id, 'fonts/pretendard/woff2-dynamic-subset'))) { r.fontFilesOnDisk++; r.fontBytesOnDisk += statSync(f).size; }
  for (const p of pages) {
    const html = readFileSync(p, 'utf8');
    const chars = [...new Set([...textOf(html)])].filter((c) => c.codePointAt(0) > 0x20);
    const used = new Set();
    const missing = [];
    for (const c of chars) {
      const cp = c.codePointAt(0);
      const face = faces.find((fc) => fc.ranges.some(([a, b]) => cp >= a && cp <= b));
      if (face) used.add(face.file); else missing.push(`${c} U+${cp.toString(16).toUpperCase()}`);
    }
    if (missing.length) fail(`${rel(p)}: Pretendard 범위 밖 글자 ${missing.join(', ')}`);
    const fontBytes = [...used].reduce((s, file) => s + statSync(resolve(dirname(fontCss), file)).size, 0);
    const assets = [...html.matchAll(/\s(?:href|src)="(\/[^"]+\.(?:css|js|svg|png|woff2))"/g)].map((m) => m[1]);
    const assetBytes = [...new Set(assets)].reduce((s, u) => s + (existsSync(resolveUrl(p, u)) ? statSync(resolveUrl(p, u)).size : 0), 0);
    const total = statSync(p).size + assetBytes + fontBytes + statSync(fontCss).size;
    r.pages[rel(p)] = { distinctChars: chars.length, fontSubsetsUsed: used.size, fontBytes, htmlBytes: statSync(p).size, linkedAssetBytes: assetBytes, estimatedTotalBytes: total };
    if (total > 1.5 * 1024 * 1024) fail(`${rel(p)}: 예상 전송량 ${total}B > 1.5MB`);
  }
}

console.log(JSON.stringify(report, null, 2));
if (failures.length) { console.error(`\n실패 ${failures.length}건\n- ` + failures.join('\n- ')); process.exit(1); }
console.log(`\n정적 검사 통과: HTML ${files.filter((x) => x.endsWith('.html')).length}개, 파일 ${files.length}개`);

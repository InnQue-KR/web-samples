// 조립된 dist/를 브라우저 없이 검사한다. 실패하면 종료 코드 1.
//  - 모든 HTML: noindex,nofollow / 샘플 띠(aside 랜드마크) / AI 고지('사람이 검토' 문구 없음) / 외부 주소·tel:·mailto: 없음
//  - OG: og:image·og:url은 예정 origin(sample-kit/origin.mjs)+자기 경로의 전체 주소. 404에는 og:url 없음
//  - 내부 경로(/, ./, url())가 실제 파일로 풀림, 샘플 페이지의 경로는 /<id>/ 아래
//  - 번들 JS: 네트워크 전송·브라우저 저장소·쿠키·콘솔 코드 없음
//  - landing-01: data-track 정확히 3종, 폼 잠금(fieldset disabled)과 개인정보 칸 name 없음
//  - company-01: 확정 URL 10개+404, URL별 title/description/OG, 견적 폼 잠금·name 없음·입력 5개 이하·첨부 없음·동의 2개, data-track 미연결
//  - Pretendard dynamic-subset 범위 밖 글자(글꼴 누락) 목록, 페이지별 예상 전송량
//  - company-01 파생 글꼴 Doram Sans: manifest 해시·크기·unicode-range 일치, 라이선스 동봉, 사이트 HTML·JS·CSS 글자가 모두 범위 안(누락 시 재생성 안내)
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { SAMPLE_ORIGIN } from '../packages/sample-kit/origin.mjs';
import { createHash } from 'node:crypto';
import { collectChars } from '../sites/company-01/scripts/font-chars.mjs';

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

// og:image·og:url만 예정 origin의 전체 주소를 쓴다. 검사한 뒤 아래 외부 주소 검사에서는 이 두 태그를 뺀다.
const OG_TAG = /<meta property="og:(image|url)" content="([^"]*)"\s*\/?>/g;
const checkOg = (f, html, id) => {
  const og = Object.fromEntries([...html.matchAll(OG_TAG)].map((m) => [m[1], m[2]]));
  const is404 = rel(f).endsWith('/404.html');
  if (!og.image?.startsWith(`${SAMPLE_ORIGIN}/${id}/`)) fail(`${rel(f)}: og:image가 ${SAMPLE_ORIGIN}/${id}/ 기준 전체 주소가 아님 (${og.image ?? '없음'})`);
  else if (!existsSync(join(dist, og.image.slice(SAMPLE_ORIGIN.length)))) fail(`${rel(f)}: og:image 파일 없음 ${og.image}`);
  const want = is404 ? undefined : SAMPLE_ORIGIN + rel(f).replace(/index\.html$/, '');
  if (og.url !== want) fail(`${rel(f)}: og:url ${og.url ?? '없음'} (기대 ${want ?? '없음(404)'})`);
  report.og ??= {};
  report.og[rel(f)] = og;
};

for (const f of files.filter((x) => x.endsWith('.html'))) {
  const raw = readFileSync(f, 'utf8');
  const id = sampleOf(f);
  if (id) checkOg(f, raw, id);
  else if (/property="og:/.test(raw)) fail(`${rel(f)}: 루트 조립 화면에 OG 태그 있음(예상 밖)`);
  const html = raw.replace(OG_TAG, '');
  if (!/<meta name="robots" content="noindex, nofollow"\s*\/?>/.test(html)) fail(`${rel(f)}: noindex,nofollow 없음`);
  if (!/<aside\b[^>]*aria-label="[^"]+"[^>]*data-sample-strip|<aside\b[^>]*data-sample-strip[^>]*aria-label="[^"]+"/.test(html)) fail(`${rel(f)}: 샘플 띠가 이름 붙은 aside 랜드마크가 아님`);
  if (!/AI를 활용/.test(html)) fail(`${rel(f)}: AI 활용 고지 없음`);
  if (/사람이 검토/.test(html)) fail(`${rel(f)}: 확인되지 않은 '사람이 검토' 문구`);
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

// 2-1) company-01 전용 확인: 확정 URL 10개 + 404, 견적 폼 잠금·입력 5개·첨부 없음, 측정 이벤트 미연결
const company = join(dist, 'company-01');
if (existsSync(company)) {
  const pages = ['', 'about/', 'services/', 'cases/', 'news/', 'news/seollal-holiday/', 'news/5-axis-machining-center/', 'news/quality-certification-renewal/', 'quote/', 'privacy/'];
  const builtPages = files.filter((f) => f.endsWith('/index.html') && sampleOf(f) === 'company-01').map((f) => rel(f).replace(/^\/company-01\//, '').replace(/index\.html$/, '')).sort();
  if (JSON.stringify(builtPages) !== JSON.stringify([...pages].sort())) fail(`company-01: 콘텐츠 URL ${builtPages.length}개 [${builtPages.join(', ')}] (기대 10개)`);
  if (!existsSync(join(company, '404.html'))) fail('company-01: 404.html 없음');
  report.companyUrls = pages.map((p) => `/company-01/${p}`);
  const titles = new Set();
  for (const p of pages) {
    const html = readFileSync(join(company, p, 'index.html'), 'utf8');
    const t = html.match(/<title>([^<]+)<\/title>/)?.[1];
    if (!t || titles.has(t)) fail(`company-01/${p}: title 없음 또는 중복`);
    titles.add(t);
    if (!/<meta name="description" content="[^"]+"/.test(html)) fail(`company-01/${p}: description 없음`);
    if (!/<meta property="og:title"/.test(html) || !html.includes(`<meta property="og:image" content="${SAMPLE_ORIGIN}/company-01/`)) fail(`company-01/${p}: OG 없음`);
    if (/data-sample-notice="[^"]*상세/.test(html)) fail(`company-01/${p}: 상세 대신 안내창으로 남은 공지 링크`);
  }
  const quote = readFileSync(join(company, 'quote/index.html'), 'utf8');
  if (!/<fieldset[^>]*data-sample-lock[^>]*disabled/.test(quote)) fail('company-01: 견적 폼 fieldset 기본 잠금(disabled) 없음');
  const formHtml = quote.match(/<form[^>]*id="quoteForm"[\s\S]*?<\/form>/)?.[0] ?? '';
  if (/\sname=/.test(formHtml.replace(/<form[^>]*>/, ''))) fail('company-01: 견적 폼 안에 name 속성 있음(제출 시 값이 붙을 수 있음)');
  if (/\saction=/.test(formHtml.match(/<form[^>]*>/)?.[0] ?? '')) fail('company-01: 견적 폼에 action 있음');
  const fields = (formHtml.match(/<(input|textarea|select)\b(?![^>]*type="checkbox")[^>]*>/g) ?? []).map((t) => t.match(/id="([^"]+)"/)?.[1]);
  report.companyFormFields = fields;
  if (fields.length > 5) fail(`company-01: 입력 항목 ${fields.length}개 (5개 이하)`);
  if (/type="file"/.test(formHtml)) fail('company-01: 첨부 입력 있음');
  const consents = formHtml.match(/type="checkbox"/g)?.length ?? 0;
  if (consents !== 2) fail(`company-01: 동의 체크 ${consents}개 (필수·선택 2개)`);
  for (const f of files.filter((x) => x.endsWith('.js') && x.startsWith(company))) {
    const js = readFileSync(f, 'utf8');
    if (/data-track|dataset\.track|\[data-track/.test(js)) fail(`${rel(f)}: data-track 이벤트 연결 코드 있음(기업 DELUXE 범위 밖)`);
  }
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
// 3-1) 파생 글꼴(company-01 Doram Sans, sites/company-01/scripts/make-font-subset.py). 없으면 null
function checkDerivedFont(id, r) {
  const dir = join(dist, id, 'fonts/doram-sans');
  if (!existsSync(join(dir, 'manifest.json'))) return null;
  const m = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
  const woff = join(dir, m.file);
  const sha = createHash('sha256').update(readFileSync(woff)).digest('hex');
  if (sha !== m.sha256 || statSync(woff).size !== m.bytes) fail(`${id}: ${m.file}가 manifest와 다름(손으로 바꾸지 말고 make-font-subset.py로 재생성)`);
  const css = readFileSync(join(dir, 'doram-sans.css'), 'utf8');
  const face = parseRanges(css);
  if (face.length !== 1 || face[0].file !== m.file || !css.includes(`unicode-range:${m.unicodeRange};`) || !css.includes(`font-family:"${m.family}"`)) fail(`${id}: doram-sans.css의 파일·이름·unicode-range가 manifest와 다름`);
  const lic = join(dir, 'LICENSE.txt');
  if (!existsSync(lic) || !readFileSync(lic, 'utf8').includes('Reserved Font Name Pretendard') || !/SIL OPEN FONT LICENSE Version 1\.1/.test(readFileSync(lic, 'utf8'))) fail(`${id}: 파생 글꼴 폴더에 Pretendard OFL 1.1 LICENSE.txt 없음`);
  if (!existsSync(join(root, 'sites', id, 'public/fonts/doram-sans/FONTLOG.txt'))) fail(`${id}: 파생 글꼴 수정 기록 FONTLOG.txt 없음`);
  const covered = (cp) => face[0]?.ranges.some(([a, b]) => cp >= a && cp <= b);
  const { chars, sources } = collectChars(join(dist, id));
  const missing = chars.filter((c) => !covered(c.codePointAt(0)) && c !== ' ');
  if (missing.length) fail(`${id}: 파생 글꼴 Doram Sans 범위 밖 글자 ${missing.length}개: ${missing.map((c) => `${c} U+${c.codePointAt(0).toString(16).toUpperCase()}(${sources[c]})`).join(', ')} → 운영 안내 5절대로 make-font-subset.py 재생성`);
  // 사이트 CSS의 본문 글꼴 순서: 파생본 → 공식 Pretendard(범위 밖 글자) → 시스템
  const siteCss = files.filter((f) => f.endsWith('.css') && f.startsWith(join(dist, id, '_astro'))).map((f) => readFileSync(f, 'utf8')).join('');
  if (!/--f-sans:\s*"Doram Sans",\s*"Pretendard Variable"/.test(siteCss)) fail(`${id}: --f-sans가 "Doram Sans","Pretendard Variable" 순서가 아님`);
  for (const p of files.filter((f) => f.endsWith('.html') && sampleOf(f) === id)) {
    const html = readFileSync(p, 'utf8');
    if (!html.includes(`href="/${id}/fonts/doram-sans/doram-sans.css"`)) fail(`${rel(p)}: doram-sans.css 연결 없음`);
    if (!/<noscript><link rel="stylesheet" href="[^"]*pretendardvariable-dynamic-subset\.css"/.test(html)) fail(`${rel(p)}: JS 꺼짐용 공식 Pretendard noscript 연결 없음`);
    if (!html.includes(`fallbackCss = "/${id}/fonts/pretendard/pretendardvariable-dynamic-subset.css"`) || !html.includes("addEventListener('focusin'")) fail(`${rel(p)}: 입력 칸 초점 때 공식 Pretendard(범위 밖 글자용)를 붙이는 인라인 스크립트 없음`);
  }
  r.derivedFont = { file: m.file, bytes: m.bytes, codepoints: m.codepoints, siteChars: chars.length, missing: missing.length };
  return m;
}
for (const id of readdirSync(join(root, 'sites'))) {
  const fontCss = join(dist, id, 'fonts/pretendard/pretendardvariable-dynamic-subset.css');
  if (!existsSync(fontCss)) continue;
  const faces = parseRanges(readFileSync(fontCss, 'utf8'));
  const pages = files.filter((f) => f.endsWith('.html') && sampleOf(f) === id);
  const r = (report[id] = { fontFaces: faces.length, fontFilesOnDisk: 0, fontBytesOnDisk: 0, pages: {} });
  const derived = checkDerivedFont(id, r);
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
    // 파생 글꼴이 있으면 화면 글자는 그 파일 하나로 받는다(공식 조각은 범위 밖 글자용, 아래 derived 검사에서 범위 확인). 링크된 woff2(preload)는 assetBytes에 들어감
    const fontBytes = derived ? 0 : [...used].reduce((s, file) => s + statSync(resolve(dirname(fontCss), file)).size, 0);
    const assets = [...html.matchAll(/\s(?:href|src)="(\/[^"]+\.(?:css|js|svg|png|woff2))"/g)].map((m) => m[1]);
    const assetBytes = [...new Set(assets)].reduce((s, u) => s + (existsSync(resolveUrl(p, u)) ? statSync(resolveUrl(p, u)).size : 0), 0);
    const total = statSync(p).size + assetBytes + fontBytes + (assets.some((u) => u.endsWith('pretendardvariable-dynamic-subset.css')) ? 0 : statSync(fontCss).size);
    r.pages[rel(p)] = { distinctChars: chars.length, fontSubsetsUsed: used.size, fontBytes, htmlBytes: statSync(p).size, linkedAssetBytes: assetBytes, estimatedTotalBytes: total };
    if (total > 1.5 * 1024 * 1024) fail(`${rel(p)}: 예상 전송량 ${total}B > 1.5MB`);
  }
}

console.log(JSON.stringify(report, null, 2));
if (failures.length) { console.error(`\n실패 ${failures.length}건\n- ` + failures.join('\n- ')); process.exit(1); }
console.log(`\n정적 검사 통과: HTML ${files.filter((x) => x.endsWith('.html')).length}개, 파일 ${files.length}개`);

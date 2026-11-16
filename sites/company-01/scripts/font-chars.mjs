// company-01 파생 글꼴(Doram Sans)이 담아야 할 글자 목록. 생성(make-font-subset.py 입력)과 검사(scripts/check-dist.mjs)가 같은 함수를 쓴다.
// 대상: dist/company-01 아래 HTML 전체(본문·속성·data-messages JSON 등, 문자 참조 풀어서) + 번들 JS 문자열(오류·완료·개수 안내 등 동적 문구)
//      + 사이트 CSS(content 문자열). fonts/ 폴더(글꼴 CSS 주석)는 뺀다.
// 항상 넣는 글자: 출력 가능한 ASCII 전부(숫자·기호·영문 입력), 아래 ALWAYS 기호. 줄바꿈·탭 같은 제어 문자는 뺀다.
// 사용: node font-chars.mjs <dist/company-01> → 표준 출력에 글자(UTF-8) 한 줄
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

export const ALWAYS = ' ·–—‘’“”…→←↑↓×※©®°±~₩%㎜';

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', middot: '·', copy: '©', hellip: '…', ndash: '–', mdash: '—', rarr: '→', times: '×' };
const decode = (s) => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&([a-z]+);/gi, (m, n) => NAMED[n.toLowerCase()] ?? m)
  .replace(/\\u\{([0-9a-f]+)\}|\\u([0-9a-f]{4})/gi, (_, a, b) => String.fromCodePoint(parseInt(a ?? b, 16)));

/** @returns {{ chars: string[], sources: Record<string, string[]> }} 코드 포인트 순 정렬 글자, 글자별 처음 나온 파일 */
export function collectChars(siteDist) {
  const set = new Map();
  const add = (c, src) => { const cp = c.codePointAt(0); if (cp < 0x20 || (cp >= 0x7f && cp < 0xa0)) return; if (!set.has(c)) set.set(c, src); };
  for (let cp = 0x20; cp <= 0x7e; cp++) add(String.fromCodePoint(cp), '(ASCII)');
  for (const c of ALWAYS) add(c, '(ALWAYS)');
  for (const f of walk(siteDist)) {
    const r = relative(siteDist, f);
    if (r.startsWith('fonts/') || !/\.(html|js|css)$/.test(f)) continue;
    for (const c of decode(readFileSync(f, 'utf8'))) add(c, r);
  }
  const chars = [...set.keys()].sort((a, b) => a.codePointAt(0) - b.codePointAt(0));
  return { chars, sources: Object.fromEntries(chars.map((c) => [c, set.get(c)])) };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const dir = process.argv[2];
  if (!dir) { console.error('사용법: node font-chars.mjs <dist/company-01>'); process.exit(1); }
  process.stdout.write(collectChars(dir).chars.join(''));
}

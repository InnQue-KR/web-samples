// 출고 gate: 배포할 폴더가 QA를 받은 배포본과 경로·바이트까지 같은지 확인한다. 다르면 종료 코드 1.
//   node scripts/verify-dist-manifest.mjs [폴더=dist]           검사
//   node scripts/verify-dist-manifest.mjs [폴더=dist] --write   새 QA를 마친 배포본으로 manifest를 다시 만들 때만
// manifest(release/dist-manifest.txt) 한 줄: "<sha256>  <바이트>  <경로>". 경로 순 정렬, '#' 줄은 설명.
import { createHash } from 'node:crypto';
import { lstatSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const manifestPath = join(root, 'release/dist-manifest.txt');
const args = process.argv.slice(2);
const dir = resolve(args.find((a) => !a.startsWith('--')) ?? join(root, 'dist'));

const walk = (d) => readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  const st = lstatSync(p);
  if (st.isSymbolicLink()) throw new Error(`링크는 배포하지 않음: ${relative(dir, p)}`);
  return st.isDirectory() ? walk(p) : [p];
});
const actual = new Map(walk(dir).map((p) => {
  const buf = readFileSync(p);
  return [relative(dir, p), `${createHash('sha256').update(buf).digest('hex')}  ${buf.length}`];
}));

if (args.includes('--write')) {
  const lines = [...actual].sort(([a], [b]) => (a < b ? -1 : 1)).map(([p, v]) => `${v}  ${p}`);
  writeFileSync(manifestPath, lines.join('\n') + '\n');
  console.log(`manifest 작성: 파일 ${lines.length}개 → ${relative(root, manifestPath)}`);
  process.exit(0);
}

const expected = new Map(readFileSync(manifestPath, 'utf8').split('\n').filter((l) => l && !l.startsWith('#')).map((l) => {
  const [sha, bytes, ...path] = l.split('  ');
  return [path.join('  '), `${sha}  ${bytes}`];
}));
const problems = [];
for (const [p, v] of expected) if (!actual.has(p)) problems.push(`없음: ${p}`); else if (actual.get(p) !== v) problems.push(`내용 다름: ${p}`);
for (const p of actual.keys()) if (!expected.has(p)) problems.push(`추가됨: ${p}`);

const bytes = [...actual.values()].reduce((s, v) => s + Number(v.split('  ')[1]), 0);
if (problems.length) {
  console.error(`출고 gate 실패: QA 배포본과 ${problems.length}건 다름 (${dir})\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`출고 gate 통과: 파일 ${actual.size}개, ${bytes}바이트가 manifest와 같음 (${dir})`);

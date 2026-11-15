// 도람정밀(가상) 로고의 <text>를 Pretendard 1.3.9 공식 OTF 윤곽선 path로 바꾼다(한 번만 실행하는 생성 스크립트).
// 사용: node outline-logo.mjs <pretendard dist/public/static 폴더> <출력 폴더>
// 의존: opentype.js 1.3.4 (프로젝트 의존성 아님, 실행할 때만 설치)
import opentype from 'opentype.js';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [fontDir, outDir] = process.argv.slice(2);
const bold = opentype.loadSync(join(fontDir, 'Pretendard-Bold.otf'));
const semi = opentype.loadSync(join(fontDir, 'Pretendard-SemiBold.otf'));

// 시안 logo.svg의 값 그대로: x, 기준선 y, 크기, letter-spacing
function textPath(font, text, x, y, size, spacing) {
  const scale = size / font.unitsPerEm;
  let cx = x;
  const parts = [];
  for (const ch of text) {
    const g = font.charToGlyph(ch);
    parts.push(g.getPath(cx, y, size).toPathData(2));
    cx += g.advanceWidth * scale + spacing;
  }
  return parts.join('');
}

const mark = `<rect x="0" y="4" width="32" height="32" fill="#12284A"/>
<path d="M9 11h8.5a9 9 0 0 1 0 18H9z M14 16v8h3.5a4 4 0 0 0 0-8z" fill="#fff" fill-rule="evenodd"/>
<rect x="24" y="26" width="6" height="6" fill="#C94A0A"/>`;

const logo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 40" role="img" aria-label="DORAM 도람정밀">
<title>DORAM 도람정밀</title>
${mark}
<path fill="#12284A" d="${textPath(bold, 'DORAM', 42, 22, 17, 2.2)}"/>
<path fill="#5B6673" d="${textPath(semi, '도람정밀', 42, 36, 11.5, 3.4)}"/>
</svg>
`;
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 4 32 32">
${mark}
</svg>
`;
writeFileSync(join(outDir, 'logo.svg'), logo);
writeFileSync(join(outDir, 'favicon.svg'), favicon);
console.log('logo.svg, favicon.svg 생성');

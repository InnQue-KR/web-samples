#!/usr/bin/env node
// Pretendard 공식 npm 패키지(package-lock.json으로 버전·무결성 고정)의
// 가변 글꼴 dynamic-subset CSS·woff2와 라이선스를 바꾸지 않고 <대상>/fonts/pretendard/로 복사한다.
// 사용: copy-pretendard <public 폴더>
import { cpSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';

const target = process.argv[2];
if (!target) { console.error('사용법: copy-pretendard <public 폴더>'); process.exit(1); }

const require = createRequire(import.meta.url);
const pkgDir = dirname(require.resolve('pretendard/package.json'));
const { version } = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
const src = join(pkgDir, 'dist/web/variable');
const out = resolve(target, 'fonts/pretendard');

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(src, 'pretendardvariable-dynamic-subset.css'), join(out, 'pretendardvariable-dynamic-subset.css'));
cpSync(join(src, 'woff2-dynamic-subset'), join(out, 'woff2-dynamic-subset'), { recursive: true });
cpSync(join(pkgDir, 'dist/LICENSE.txt'), join(out, 'LICENSE.txt'));
console.log(`Pretendard ${version} dynamic-subset 복사: ${out}`);

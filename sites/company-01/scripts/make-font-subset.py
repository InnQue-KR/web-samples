#!/usr/bin/env python3
"""company-01 전용 파생 글꼴 Doram Sans(가변 WOFF2) 생성.

원본: npm pretendard@1.3.9 dist/web/variable/woff2/PretendardVariable.woff2 (아래 SOURCE_SHA256으로 고정)
도구: fontTools 4.68.0 + brotli 1.2.1 (font-requirements.txt, 해시 고정). 다른 버전이면 멈춘다.
글자: scripts/font-chars.mjs가 dist/company-01에서 모은 글자(사이트 HTML·JS·CSS 문구 + ASCII + 고정 기호).
처리: fontTools 공식 subset으로 글리프만 줄이고(윤곽선·가변 축 45–930·간격·kern·OpenType 기능 전부 그대로),
      SIL OFL 1.1 예약 글꼴 이름(Pretendard) 대신 'Doram Sans'로 이름표(name table)를 바꾼다. 저작권·라이선스·상표 문구는 그대로.
출력: public/fonts/doram-sans/ 의 DoramSans-subset.woff2, doram-sans.css(unicode-range = 실제 cmap), manifest.json, LICENSE.txt, FONTLOG.txt

사용(저장소 루트에서): npm run build && .venv-font/bin/python sites/company-01/scripts/make-font-subset.py && npm run build && npm run check
"""
import hashlib
import json
import subprocess
import sys
from pathlib import Path

import brotli
import fontTools
from fontTools import subset
from fontTools.ttLib import TTFont

SITE = Path(__file__).resolve().parents[1]
ROOT = SITE.parents[1]
SOURCE = ROOT / 'node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2'
SOURCE_LICENSE = ROOT / 'node_modules/pretendard/dist/LICENSE.txt'
SOURCE_SHA256 = '9599f12fd42fc0bce1cd50b47a0c022e108d7aa64dd0d1bb0ed44f3282d900b4'
TOOLS = {'fontTools': '4.68.0', 'brotli': '1.2.1'}
OUT = SITE / 'public/fonts/doram-sans'
FILE = 'DoramSans-subset.woff2'
FAMILY = 'Doram Sans'
PS = 'DoramSans'
# 바꾸지 않는 이름표: 0 저작권, 7 상표, 8 제작사, 9 디자이너, 11·12 URL, 13·14 라이선스
KEEP_IDS = {0, 7, 8, 9, 11, 12, 13, 14}


def sha256(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def ranges(cps):
    out, start, prev = [], None, None
    for cp in cps:
        if start is None:
            start = prev = cp
        elif cp == prev + 1:
            prev = cp
        else:
            out.append((start, prev))
            start = prev = cp
    if start is not None:
        out.append((start, prev))
    return ','.join(f'U+{a:04X}' if a == b else f'U+{a:04X}-{b:04X}' for a, b in out)


def main():
    got = {'fontTools': fontTools.version, 'brotli': brotli.__version__}
    if got != TOOLS:
        sys.exit(f'도구 버전이 다름: {got} (필요 {TOOLS}). font-requirements.txt로 설치하세요.')
    if sha256(SOURCE) != SOURCE_SHA256:
        sys.exit(f'원본 글꼴 해시가 다름: {SOURCE}')
    dist = ROOT / 'dist/company-01'
    if not dist.is_dir():
        sys.exit('dist/company-01 없음. 먼저 npm run build')
    text = subprocess.run(['node', str(SITE / 'scripts/font-chars.mjs'), str(dist)], check=True, capture_output=True, text=True).stdout

    opts = subset.Options()
    opts.flavor = 'woff2'
    # OpenType 기능은 모두 남긴다. 기본 목록만 남기면 원 숫자(②③④) 등 일부 글자가 원본과 다르게 그려짐(INNA-653 픽셀 비교). 비용 약 +16KB
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    opts.name_languages = ['*']
    opts.name_legacy = True
    opts.notdef_outline = True
    font = TTFont(SOURCE, recalcTimestamp=False)  # head.modified를 원본 값으로 둬 같은 입력이면 같은 바이트
    sub = subset.Subsetter(opts)
    sub.populate(text=text)
    sub.subset(font)

    note = f'{PS} subset (company-01 sample): Modified Version of Pretendard Variable 1.3.9 under SIL OFL 1.1'
    for rec in font['name'].names:
        if rec.nameID in KEEP_IDS:
            continue
        s = rec.toUnicode()
        new = s.replace('Pretendard Variable', FAMILY).replace('PretendardVariable', PS).replace('Pretendard', FAMILY)
        if rec.nameID == 3:
            new = f'1.309;INNQ;{PS}-subset'
        if rec.nameID == 5:
            new = f'{s}; {note}'
        if new != s:
            rec.string = new
    font['name'].setName(
        'Glyph subset of Pretendard Variable 1.3.9 (https://github.com/orioncactus/pretendard) made with fontTools '
        f'{TOOLS["fontTools"]} for the company-01 sample site; renamed from the Reserved Font Name. See FONTLOG.txt.', 10, 3, 1, 0x409)
    # 이름으로 쓰이는 이름표(가족·스타일·PS·인스턴스 이름 등)에 예약 이름이 남으면 멈춘다. 5(버전)·10(설명)은 출처 기록이라 원본 이름을 적는다
    left = [(r.nameID, r.toUnicode()) for r in font['name'].names if r.nameID not in KEEP_IDS | {5, 10} and 'Pretendard' in r.toUnicode()]
    if left:
        sys.exit(f'예약 이름이 남음: {left}')

    OUT.mkdir(parents=True, exist_ok=True)
    out = OUT / FILE
    font.save(out)
    cps = sorted(TTFont(out).getBestCmap())
    missing = [c for c in text if ord(c) not in set(cps) and ord(c) > 0x20]
    if missing:
        sys.exit(f'원본에 없는 글자: {"".join(missing)}')
    urange = ranges(cps)
    (OUT / 'doram-sans.css').write_text(
        '/* Doram Sans = Pretendard Variable 1.3.9(SIL OFL 1.1)의 company-01 글자만 담은 파생본. 원본 윤곽선·굵기 축·간격 그대로, 이름만 바꿈.\n'
        '   unicode-range는 실제 cmap. 범위 밖 글자(새 콘텐츠·임의 입력)는 다음 글꼴 "Pretendard Variable"(공식 dynamic-subset)로 받는다.\n'
        '   생성: scripts/make-font-subset.py (손으로 고치지 않음). 라이선스: LICENSE.txt, 수정 기록: FONTLOG.txt */\n'
        f'@font-face{{font-family:"{FAMILY}";font-style:normal;font-weight:45 930;font-display:swap;'
        f'src:url("{FILE}") format("woff2-variations");unicode-range:{urange};}}\n', encoding='utf-8')
    (OUT / 'LICENSE.txt').write_bytes(SOURCE_LICENSE.read_bytes())
    manifest = {
        'family': FAMILY,
        'file': FILE,
        'sha256': sha256(out),
        'bytes': out.stat().st_size,
        'source': {'package': 'pretendard@1.3.9', 'path': 'dist/web/variable/woff2/PretendardVariable.woff2', 'sha256': SOURCE_SHA256,
                   'license': 'https://raw.githubusercontent.com/orioncactus/pretendard/v1.3.9/LICENSE'},
        'tools': {**TOOLS, 'requirements': 'sites/company-01/scripts/font-requirements.txt'},
        'command': 'npm run build && .venv-font/bin/python sites/company-01/scripts/make-font-subset.py',
        'subsetOptions': {'layout_features': opts.layout_features, 'name_IDs': '*', 'notdef_outline': True, 'flavor': 'woff2', 'axes': 'wght 45-930 (unchanged)'},
        'glyphs': len(font.getGlyphOrder()),
        'codepoints': len(cps),
        'unicodeRange': urange,
    }
    (OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'{out.relative_to(ROOT)}: {manifest["bytes"]} B, 글자 {len(cps)}, 글리프 {manifest["glyphs"]}, sha256 {manifest["sha256"]}')


if __name__ == '__main__':
    main()

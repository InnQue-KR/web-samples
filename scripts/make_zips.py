#!/usr/bin/env python3
"""소스 ZIP(git에 커밋된 파일만)과 배포 ZIP(dist/)을 out/에 만든다. 먼저 커밋과 npm run build.

- 소스 ZIP: `git ls-files` 목록만 담는다. node_modules·dist·캐시·.env는 들어가지 않는다.
- 배포 ZIP: dist/ 전체(조립본). 압축 해제한 폴더를 그대로 정적 호스팅 루트로 쓸 수 있다.
- 파일 시각은 커밋 시각으로 고정해 같은 커밋에서 같은 ZIP이 나오게 한다.
"""
import hashlib
import os
import subprocess
import sys
import time
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "out")


def git(*args):
    return subprocess.run(["git", *args], cwd=ROOT, check=True, capture_output=True, text=True).stdout


if git("status", "--porcelain").strip():
    sys.exit("커밋되지 않은 변경이 있습니다. 커밋 후 다시 실행하세요.")
sha = git("rev-parse", "--short=12", "HEAD").strip()
ts = int(git("log", "-1", "--format=%ct").strip())
dt = time.gmtime(ts)[:6]


def add(z, path, arc):
    info = zipfile.ZipInfo(arc, date_time=dt)
    info.compress_type = zipfile.ZIP_DEFLATED
    info.external_attr = 0o644 << 16
    with open(path, "rb") as f:
        z.writestr(info, f.read())


def sha256(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        h.update(f.read())
    return h.hexdigest()


os.makedirs(OUT, exist_ok=True)
src_zip = os.path.join(OUT, f"web-samples-src-{sha}.zip")
dist_zip = os.path.join(OUT, f"web-samples-dist-{sha}.zip")

files = sorted(git("ls-files", "-z").split("\0"))
with zipfile.ZipFile(src_zip, "w") as z:
    for rel in filter(None, files):
        add(z, os.path.join(ROOT, rel), f"web-samples/{rel}")

dist = os.path.join(ROOT, "dist")
if not os.path.isdir(os.path.join(dist, "landing-01")):
    sys.exit("dist/가 없습니다. npm run build 먼저.")
with zipfile.ZipFile(dist_zip, "w") as z:
    for base, _, names in sorted(os.walk(dist)):
        for n in sorted(names):
            p = os.path.join(base, n)
            add(z, p, os.path.relpath(p, dist))

with open(os.path.join(OUT, "SHA256SUMS"), "w") as f:
    for p in (src_zip, dist_zip):
        line = f"{sha256(p)}  {os.path.basename(p)}"
        f.write(line + "\n")
        print(line, os.path.getsize(p), "bytes")

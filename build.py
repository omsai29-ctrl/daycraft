#!/usr/bin/env python3
"""Builds dist/index.html from the files in src/. Needs only Python 3.

    python build.py

Open dist/index.html in a browser to try it. To put it on your phone, upload
the whole dist/ folder to any static host (see README.md).
"""
import pathlib

root = pathlib.Path(__file__).parent
src = root / "src"
style = (src / "style.css").read_text(encoding="utf-8")
script = "\n".join(p.read_text(encoding="utf-8") for p in sorted((src / "js").glob("*.js")))
html = (src / "template.html").read_text(encoding="utf-8")
html = html.replace("{{STYLE}}", style).replace("{{SCRIPT}}", script)
out = root / "dist" / "index.html"
out.write_text(html, encoding="utf-8")
print(f"Built {out} ({len(html) // 1024} KB)")

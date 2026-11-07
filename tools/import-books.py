#!/usr/bin/env python3
"""Import the individual book repositories of this shelf without writing to them.

python3 tools/import-books.py --write    # first import / safe refresh
python3 tools/import-books.py --check    # compare with the sibling repositories

Local changes in imported files are never overwritten. Resolve those changes before
refreshing a snapshot. Per-file hashes and original revisions live in migration/.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = json.loads((ROOT / "migration/books.json").read_text())
DOMAIN = MANIFEST["origin"].split("://", 1)[1]
HOST = re.escape(MANIFEST["origin"]) + "/"
FIELD = MANIFEST["field"]
# One theme key for the whole shelf, e.g. computing-books -> "computing-theme".
THEME = DOMAIN.split(".", 1)[0] + "-theme"
STATE_PATH = ROOT / "migration/import-state.json"
EXCLUDED = {".git", ".github", ".book-dist", "node_modules", "CNAME", "package.json", "package-lock.json", "pnpm-lock.yaml", ".nojekyll"}
TEXT = {".html", ".css", ".js", ".json", ".py", ".cjs", ".mjs", ".md", ".xml", ".txt", ".svg"}
BEACON = re.compile(r"<script\b(?=[^>]*\bsrc\s*=\s*['\"]https://static\.cloudflareinsights\.com/beacon\.min\.js['\"])[^>]*>\s*</script>\s*", re.I)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def transform(data, relative, book):
    if relative.suffix not in TEXT:
        return data
    text = data.decode("utf-8")
    for item in MANIFEST["books"]:
        old = item["legacyUrl"].rstrip("/")
        new = MANIFEST["origin"] + "/" + item["slug"]
        text = text.replace(old, new).replace(old.replace("https://", "http://"), new)
    for old, new in MANIFEST.get("pathAliases", {}).items():
        text = text.replace(old, new)
    # Per-book rewrites, e.g. for a course that lived inside another shelf and used its shared engine.
    for pattern, replacement in book.get("replacements", []):
        text = re.sub(pattern, replacement, text)
    # Keep local browsing and links between the books on the same host.
    text = re.sub(r'(href=["\'])' + HOST, r'\1/', text) if relative.suffix != ".html" else text
    if relative.suffix == ".html":
        # Canonical and social metadata stay absolute; only navigation links become local.
        text = re.sub(r'(<a\b[^>]*\bhref=["\'])' + HOST, r'\1/', text)
        text = BEACON.sub("", text)
        base = ROOT / book["slug"] / relative.parent
        shared = Path(os.path.relpath(ROOT / "shared", base)).as_posix()
        adapter = (f'<link rel="stylesheet" href="{shared}/css/book-shell.css">\n'
                   f'<script defer src="{shared}/js/book-shell.js" data-book="{book["slug"]}"></script>\n')
        text = text.replace("</head>", adapter + "</head>", 1)
    if relative.suffix in {".js", ".html"}:
        text = re.sub(r'(localStorage\.(?:getItem|setItem)\(\s*)(["\'])[a-zA-Z0-9-]+-theme\2',
                      lambda m: m.group(1) + '"' + THEME + '"', text)
    if str(relative) == "book.json":
        meta = json.loads(text)
        meta.update(url=MANIFEST["origin"] + "/" + book["slug"] + "/", domain=DOMAIN,
                    repo=MANIFEST["repository"], field=FIELD, basePath="/" + book["slug"] + "/")
        text = json.dumps(meta, ensure_ascii=False, indent=2) + "\n"
    return text.encode("utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true")
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--book", action="append", help="import only this slug (repeatable)")
    args = parser.parse_args()
    if not (args.write or args.check):
        parser.error("choose --write or --check")
    state = json.loads(STATE_PATH.read_text()) if STATE_PATH.exists() else {"version": 1, "books": {}}
    plan, errors, reports = [], [], []
    for book in MANIFEST["books"]:
        slug = book["slug"]
        if args.book and slug not in args.book:
            continue
        if not re.fullmatch(r"[a-z][a-z0-9-]*", slug):
            raise ValueError("unsafe or reserved destination: " + slug)
        repo = (ROOT / book["sourceDirectory"]).resolve()
        # A book may be one folder of another repository (sourceSubdirectory) and may need files from
        # outside that folder (extraFiles: destination path -> path in the source repository).
        subdirectory = book.get("sourceSubdirectory", "")
        source = repo / subdirectory if subdirectory else repo
        files = subprocess.check_output(["git", "ls-files", "-z", "--", "."], cwd=source).decode().split("\0")
        files = [Path(f) for f in files if f and not set(Path(f).parts).intersection(EXCLUDED)]
        origins = {f: source / f for f in files}
        for destination, original in book.get("extraFiles", {}).items():
            files.append(Path(destination))
            origins[Path(destination)] = repo / original
        expected = {}
        previous = state["books"].get(slug, {}).get("files", {})
        changed = 0
        fallback = None
        if not (source / "book.json").exists():
            files.append(Path("book.json"))
            fallback = json.dumps({"id": book["id"], "title": book["title"], "description": book["description"],
                "field": FIELD, "status": book.get("status", "published")}, ensure_ascii=False).encode()
        for relative in files:
            if not origins.get(relative, source / relative).is_file() and not (fallback and str(relative) == "book.json"):
                continue
            target = ROOT / slug / relative
            raw = fallback if fallback and str(relative) == "book.json" else origins[relative].read_bytes()
            incoming = transform(raw, relative, book)
            key, digest = relative.as_posix(), sha(incoming)
            expected[key] = digest
            if target.exists():
                current = sha(target.read_bytes())
                if current == digest:
                    continue
                if previous.get(key) != current:
                    errors.append(f"{slug}/{key}: local edit; refresh would overwrite it")
                    continue
            changed += 1
            plan.append((target, incoming))
        # Deleting or renaming files must be resolved deliberately, never by this importer.
        removed = set(previous) - set(expected)
        if removed:
            errors.append(f"{slug}: upstream removed files; resolve explicitly: {', '.join(sorted(removed))}")
        state["books"][slug] = {"repository": book["repository"], "legacyUrl": book["legacyUrl"],
            "sourceCommit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=repo).decode().strip(),
            "sourceDirty": bool(subprocess.check_output(["git", "status", "--porcelain", "--", *(
                [subdirectory, *book.get("extraFiles", {}).values()] if subdirectory else ["."])], cwd=repo).strip()),
            "destination": "/" + slug + "/", "files": expected}
        reports.append(f"{slug}: {len(expected)} files, {changed} update(s)")
    print("\n".join(reports))
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    if args.check:
        if plan:
            print(f"{len(plan)} file(s) need refresh; run --write", file=sys.stderr)
            return 1
        return 0
    for target, data in plan:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    STATE_PATH.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n")
    print(f"Imported {len(plan)} file(s). Individual repositories were not modified.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

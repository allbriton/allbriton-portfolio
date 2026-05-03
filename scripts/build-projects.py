#!/usr/bin/env python3
"""
Build a combined data/projects.json (and data/projects.js mirror) from the
per-file CMS source:

    data/site.json              site metadata
    data/tags.json              { "tags": [...] }
    data/projects-order.json    { "order": ["slug-1", "slug-2", ...] }
    data/projects/<slug>.json   one file per project

Sveltia CMS edits these per-file sources; this script runs at deploy time
to recombine them into the single data/projects.json that site.js consumes.

Run locally:    python3 scripts/build-projects.py
Run on deploy:  netlify.toml [build] command = "python3 scripts/build-projects.py"
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"


def load_json(path):
    with open(path) as f:
        return json.load(f)


def main():
    if not DATA.is_dir():
        print(f"error: {DATA} does not exist", file=sys.stderr)
        sys.exit(1)

    # --- site & tags & about ---
    site = load_json(DATA / "site.json")

    tags_blob = load_json(DATA / "tags.json")
    tags = tags_blob["tags"] if isinstance(tags_blob, dict) and "tags" in tags_blob else tags_blob

    about_path = DATA / "about.json"
    about = load_json(about_path) if about_path.exists() else None

    # --- order index ---
    order_blob = load_json(DATA / "projects-order.json")
    ordered_slugs = order_blob["order"] if isinstance(order_blob, dict) and "order" in order_blob else order_blob

    # --- load every project file ---
    projects_dir = DATA / "projects"
    if not projects_dir.is_dir():
        print(f"error: {projects_dir} does not exist", file=sys.stderr)
        sys.exit(1)

    all_projects = {}
    for f in sorted(projects_dir.glob("*.json")):
        slug = f.stem
        if slug.startswith("_"):  # skip _index, _meta, etc.
            continue
        try:
            p = load_json(f)
        except json.JSONDecodeError as e:
            print(f"error: invalid JSON in {f}: {e}", file=sys.stderr)
            sys.exit(1)
        # ensure slug field matches filename (filename is the canonical slug)
        p["slug"] = slug
        all_projects[slug] = p

    # --- assemble in order: first the slugs from the order index, then any
    #     extras that exist on disk but aren't in the index (alphabetical) ---
    seen = set()
    final_order = []
    for slug in ordered_slugs:
        if slug in all_projects and slug not in seen:
            final_order.append(slug)
            seen.add(slug)

    extras = sorted(slug for slug in all_projects.keys() if slug not in seen)
    if extras:
        print(f"info: appending {len(extras)} project(s) not in projects-order.json: {extras}")
        final_order.extend(extras)

    missing = [slug for slug in ordered_slugs if slug not in all_projects]
    if missing:
        print(f"warn: projects-order.json references missing project files: {missing}", file=sys.stderr)

    combined = {
        "site": site,
        "tags": tags,
        "projects": [all_projects[slug] for slug in final_order],
    }
    if about is not None:
        combined["about"] = about

    # --- write outputs ---
    out_json = DATA / "projects.json"
    out_js = DATA / "projects.js"

    json_text = json.dumps(combined, indent=2, ensure_ascii=False)
    out_json.write_text(json_text + "\n", encoding="utf-8")
    out_js.write_text(f"window.__SITE_DATA__ = {json_text};\n", encoding="utf-8")

    print(f"built {out_json.relative_to(ROOT)}: {len(combined['projects'])} projects, {len(combined['tags'])} tags")


if __name__ == "__main__":
    main()

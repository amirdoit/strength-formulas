#!/usr/bin/env python3
"""Check skills/*/SKILL.md against the Agent Skills specification (https://agentskills.io/specification).

Stdlib only. This enforces the documented frontmatter rules; it is not a replacement for the
official `skills-ref validate`, which you can also run locally.

Usage: python3 scripts/validate-skill.py [skills-dir]
"""
import pathlib, re, sys

root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else pathlib.Path(__file__).resolve().parent.parent / "skills")
errors = []

def parse_frontmatter(text):
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if not m:
        return None, text
    data, current_map = {}, None
    for raw in m.group(1).split("\n"):
        if not raw.strip():
            continue
        if raw.startswith("  ") and current_map is not None:
            k, _, v = raw.strip().partition(":")
            data[current_map][k.strip()] = v.strip().strip('"')
            continue
        k, _, v = raw.partition(":")
        k, v = k.strip(), v.strip()
        if v == "":
            data[k] = {}
            current_map = k
        else:
            data[k] = v.strip('"')
            current_map = None
    return data, text[m.end():]

skills = sorted(p for p in root.iterdir() if (p / "SKILL.md").is_file())
if not skills:
    errors.append(f"no skills found under {root}")

for d in skills:
    where = f"{d.name}/SKILL.md"
    fm, body = parse_frontmatter((d / "SKILL.md").read_text())
    if fm is None:
        errors.append(f"{where}: missing YAML frontmatter"); continue
    name, desc = fm.get("name", ""), fm.get("description", "")
    if not (1 <= len(name) <= 64): errors.append(f"{where}: name must be 1-64 chars")
    if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", name or "x_"): errors.append(f"{where}: name must be lowercase letters/numbers/single hyphens, not start or end with a hyphen")
    if name != d.name: errors.append(f"{where}: name '{name}' must match directory '{d.name}'")
    if not (1 <= len(desc) <= 1024): errors.append(f"{where}: description must be 1-1024 chars (got {len(desc)})")
    if "use when" not in desc.lower(): errors.append(f"{where}: description should say when to use the skill")
    if "compatibility" in fm and not (1 <= len(fm["compatibility"]) <= 500): errors.append(f"{where}: compatibility must be 1-500 chars")
    meta = fm.get("metadata", {})
    if not isinstance(meta, dict) or not all(isinstance(v, str) for v in meta.values()): errors.append(f"{where}: metadata must map strings to strings")
    if len(body.splitlines()) >= 500: errors.append(f"{where}: keep SKILL.md under 500 lines")
    for link in re.findall(r"\]\(([^)#]+)\)", body):
        if not link.startswith(("http://", "https://")) and not (d / link).exists():
            errors.append(f"{where}: broken relative link {link}")
    if not errors:
        print(f"ok  {where}  name={name} description={len(desc)} chars body={len(body.splitlines())} lines")

if errors:
    print("\n".join("FAIL " + e for e in errors)); sys.exit(1)

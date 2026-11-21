"""Verify Moonlight Elixirs assets, Service Worker cache paths, and handcrafted levels."""
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def verify_sw_assets():
    sw_path = os.path.join(ROOT, "sw.js")
    with open(sw_path, "r", encoding="utf-8") as f:
        text = f.read()
    entries = re.findall(r"'\./([^']*)'", text)
    missing = []
    for rel in entries:
        if not rel:
            continue
        full = os.path.join(ROOT, rel.replace("/", os.sep))
        if not os.path.exists(full):
            missing.append(rel)
    if missing:
        print(f"ERROR: Missing Service Worker assets: {missing}")
        return False
    print(f"OK: All {len([e for e in entries if e])} Service Worker assets exist.")
    return True


def verify_handcrafted_levels():
    levels_path = os.path.join(ROOT, "js", "engine", "levels.js")
    with open(levels_path, "r", encoding="utf-8") as f:
        text = f.read()

    # Extract HANDCRAFTED_LEVELS blocks
    block_match = re.search(r"export const HANDCRAFTED_LEVELS = \{(.*)\};", text, re.S)
    if not block_match:
        print("ERROR: Could not locate HANDCRAFTED_LEVELS")
        return False

    body = block_match.group(1)
    level_matches = re.findall(r"(\d+):\s*\{(.*?)\n  \},", body, re.S)
    if len(level_matches) != 10:
        print(f"ERROR: Expected 10 handcrafted levels, found {len(level_matches)}")
        return False

    for lvl_str, lvl_body in level_matches:
        colors = re.findall(r"'([a-z]+)'", re.search(r"bottles:\s*\[(.*)\]", lvl_body, re.S).group(1))
        counts = {}
        for c in colors:
            counts[c] = counts.get(c, 0) + 1
        bad = {k: v for k, v in counts.items() if v != 4}
        if bad:
            print(f"ERROR: Level {lvl_str} has unbalanced color counts: {bad}")
            return False
    print(f"OK: All {len(level_matches)} handcrafted levels have exact 4-unit balanced colors.")
    return True


if __name__ == "__main__":
    ok1 = verify_sw_assets()
    ok2 = verify_handcrafted_levels()
    sys.exit(0 if (ok1 and ok2) else 1)

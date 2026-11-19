#!/usr/bin/env python3
"""Puts every skill in skills/ where the coding agent finds it, then runs the one-time kit setup.

    python3 install.py [--dest DIR] [--voice]

The default destination is ~/.claude/skills, which both Claude Code and omp read. On macOS and Linux each skill is a
symbolic link to this folder (a git pull updates it); on Windows, where links need special permission, it is a copy,
so run install.py again after updating. Re-run it after a git pull to pick up new skills.
"""
import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--dest', default=os.environ.get('CLAUDE_SKILLS_DIR', str(Path.home() / '.claude' / 'skills')))
    ap.add_argument('--voice', action='store_true', help='also install the free voice and word timings (~1.3 GB)')
    args = ap.parse_args()
    dest = Path(args.dest).expanduser()
    dest.mkdir(parents=True, exist_ok=True)
    copy = os.name == 'nt'
    for skill in sorted(p for p in (ROOT / 'skills').iterdir() if p.is_dir()):
        target = dest / skill.name
        if target.is_symlink():
            target.unlink()
        elif target.exists():
            if not copy or not (target / '.from-claude-animation-skills').exists():
                print(f'skip {skill.name}: {target} already exists and was not installed by this repository')
                continue
            shutil.rmtree(target)
        if copy:
            shutil.copytree(skill, target)
            (target / '.from-claude-animation-skills').write_text(str(ROOT), encoding='utf-8')
        else:
            target.symlink_to(skill, target_is_directory=True)
        print(f'installed /{skill.name}')
    setup = [sys.executable, str(ROOT / 'kit' / 'setup.py')] + (['--voice'] if args.voice else [])
    subprocess.run(setup, check=True)


if __name__ == '__main__':
    main()

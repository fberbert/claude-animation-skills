#!/usr/bin/env python3
"""/breakdown: spec.json -> a 3D phone that comes apart layer by layer, every part labelled (1080x1920, 4.2 s).

    python3 build.py <spec.json> [--snap 1.0,3.6]
"""
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / 'kit'))
import anim  # noqa: E402

DEFAULTS = {
    'title': 'Celular', 'subtitle': 'Vista explodida',
    'labels': [['Vidro frontal', 'temperado · 0,6 mm'], ['Tela OLED', '6,3 pol · 120 Hz'], ['Moldura', 'titânio · 7,8 mm'],
               ['Placa-mãe', 'chip de 3 nm · 8 GB'], ['Bateria', '3.582 mAh'], ['Vidro traseiro', 'fosco · anel magnético']],
    'time': '9:41', 'date': 'sábado, 1 de novembro', 'accent': '#F08A5D',
}


def check(spec):
    lb = spec['labels']
    if not isinstance(lb, list) or len(lb) != 6 or not all(isinstance(x, list) and 1 <= len(x) <= 2 for x in lb):
        sys.exit('spec: "labels" needs 6 entries, top layer first, each ["Name", "short note"] (use ["", ""] to hide one)')
    if not re.fullmatch(r'#[0-9a-fA-F]{6}', spec['accent']):
        sys.exit('spec: "accent" must be a hex colour like "#F08A5D"')
    for name, *note in lb:
        if len(name) > 16 or (note and len(note[0]) > 22):
            print(f'note: "{name}" is long for the label column (names ~16, notes ~22 characters)')


if __name__ == '__main__':
    anim.build(HERE / 'template.html', DEFAULTS, duration=lambda s: 4.2, three=True, check=check)

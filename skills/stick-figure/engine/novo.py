"""Start a new reel folder from the engine (same on Windows, macOS and Linux).

  python novo.py <reel-folder>            explainer: the pirate reel (template/) to rewrite
  python novo.py <reel-folder> dialogo    dialogue: Beto and Duda (dialogo/), with character sheets and falas.json

Then build it with  python make.py <reel-folder>
"""
import shutil, sys
from pathlib import Path

ENGINE = Path(__file__).resolve().parent
SKIP = shutil.ignore_patterns('seg', 'stills', 'silent.mp4', '*.mp4', '__pycache__')


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    reel = Path(sys.argv[1]).expanduser().resolve()
    kind = sys.argv[2] if len(sys.argv) > 2 else 'explicador'
    if reel.exists():
        sys.exit(f'{reel} already exists: pick a new folder')
    shutil.copytree(ENGINE / 'template', reel, ignore=SKIP)
    if kind == 'dialogo':
        for f in ('script.json', 'captions.json', 'audio/vo_kokoro.wav', 'audio/words_ref.json'):
            (reel / f).unlink(missing_ok=True)     # the pirate's voice and timing do not belong to the dialogue
        shutil.copytree(ENGINE / 'dialogo', reel, dirs_exist_ok=True, ignore=SKIP)
        # a project library above the reel wins: drop the example's copy of a character the project already has
        acima = [p / 'personagens' for p in reel.parents]
        for f in list((reel / 'personagens').glob('*.json')):
            if any((pasta / f.name).exists() for pasta in acima):
                f.unlink()
        if not any((reel / 'personagens').iterdir()):
            (reel / 'personagens').rmdir()
    elif kind != 'explicador':
        sys.exit('kind must be explicador or dialogo')
    print(f'{kind}: {reel}')


if __name__ == '__main__':
    main()

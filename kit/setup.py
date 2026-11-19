#!/usr/bin/env python3
"""One-time setup for the animation skills, on macOS, Linux and Windows. Safe to run again.

    python3 kit/setup.py            # enough for every quick skill and the two engines' pictures
    python3 kit/setup.py --voice    # also kit/.venv with the free voice (Kokoro) and word timings (Parakeet v3,
                                    # 25 languages including Portuguese), about 1.3 GB of models

Checks ffmpeg, Node.js and Python, installs three.js and Playwright into kit/node_modules, fetches GSAP and
warms up HyperFrames. On Windows, run it with `py kit\\setup.py` (or `python`).
"""
import os
import shutil
import subprocess
import sys
import tarfile
import urllib.request
from pathlib import Path

KIT = Path(__file__).resolve().parent
sys.path.insert(0, str(KIT))
from anim import HYPERFRAMES, node_env  # noqa: E402

GSAP = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js'
KOKORO = 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/'
PARAKEET = 'sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8'
PARAKEET_URL = f'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/{PARAKEET}.tar.bz2'


def say(msg):
    print(f'\033[1m{msg}\033[0m', flush=True)


def need(cmd, hint):
    path = shutil.which(cmd)
    if not path:
        sys.exit(f'{cmd} is missing. {hint}')
    return path


def download(url, dest):
    if dest.exists() and dest.stat().st_size > 0:
        return
    say(f'downloading {dest.name}')
    tmp = dest.with_suffix(dest.suffix + '.part')
    with urllib.request.urlopen(url) as r, open(tmp, 'wb') as f:
        shutil.copyfileobj(r, f)
    tmp.replace(dest)


def main():
    voice = any(a in ('--voice', '--stick') for a in sys.argv[1:])
    need('ffmpeg', 'Install it first (Windows: winget install Gyan.FFmpeg; Mac: brew install ffmpeg; Linux: apt install ffmpeg).')
    npm = need('npm', 'Install Node.js 20 or newer first.')
    npx = need('npx', 'Install Node.js 20 or newer first.')
    if sys.version_info < (3, 9):
        sys.exit('Python 3.9 or newer is needed')
    env = node_env()

    say('installing three.js and Playwright into kit/node_modules')
    subprocess.run([npm, 'install', '--silent', '--no-audit', '--no-fund'], cwd=KIT, env=env, check=True)
    say("installing Playwright's Chromium (the /zach-d-films and /stick-figure engines render with it)")
    subprocess.run([npx, '--yes', 'playwright', 'install', 'chromium'], cwd=KIT, env=env, check=True,
                   stdout=subprocess.DEVNULL)

    (KIT / 'vendor').mkdir(exist_ok=True)
    download(GSAP, KIT / 'vendor' / 'gsap.min.js')

    say('warming up HyperFrames (first run downloads it)')
    r = subprocess.run([npx, '--yes', HYPERFRAMES, '--version'], cwd=KIT, env=env, capture_output=True, text=True)
    if r.returncode:
        print('warning: could not run hyperframes yet; the first render will retry')

    if voice:
        venv = KIT / '.venv'
        py = venv / ('Scripts/python.exe' if os.name == 'nt' else 'bin/python')
        if not py.exists():
            say('making kit/.venv')
            subprocess.run([sys.executable, '-m', 'venv', str(venv)], check=True)
        subprocess.run([str(py), '-m', 'pip', 'install', '-q', '--upgrade', 'pip'], check=True)
        subprocess.run([str(py), '-m', 'pip', 'install', '-q', 'numpy', 'scipy', 'soundfile', 'kokoro-onnx', 'sherpa-onnx'],
                       check=True)
        models = KIT / 'models'
        models.mkdir(exist_ok=True)
        say('downloading the voice and word-timing models (about 1.3 GB, once)')
        download(KOKORO + 'kokoro-v1.0.onnx', models / 'kokoro-v1.0.onnx')
        download(KOKORO + 'voices-v1.0.bin', models / 'voices-v1.0.bin')
        if not (models / PARAKEET).is_dir():
            for old in models.glob('sherpa-onnx-nemo-parakeet*'):   # the English-only v2 of earlier setups
                shutil.rmtree(old, ignore_errors=True)
            tar = models / 'parakeet.tar.bz2'
            download(PARAKEET_URL, tar)
            with tarfile.open(tar) as t:
                t.extractall(models)
            tar.unlink()
    say('ready')


if __name__ == '__main__':
    main()

"""Build a stick-figure reel end to end: voice -> word timings -> music + SFX -> picture -> <reel>/<name>.mp4
Runs the same on Windows, macOS and Linux (make.sh just calls this).

  python make.py <reel-folder> [kokoro | elevenlabs | falas | path/to/voiceover.mp3]
    (no voice option)  reuse audio/vo.wav (a new reel gets the free Kokoro take); a dialogue (falas.json) always rebuilds its
                       voice from the cached lines in audio/falas/, so only new or changed lines are voiced
    kokoro             new take of script.json in the free built-in voice
    elevenlabs         new ElevenLabs take of script.json (needs ELEVENLABS_API_KEY)
    falas              dialogue: every line of falas.json in the voice from its character sheet (personagens/<id>.json)
    a file             your own recording
  WORKERS=4 (default) renders that many shots at once; AUDIO_ONLY=1 remixes the sound and reuses the last picture.
"""
import os, shutil, subprocess, sys
from pathlib import Path

ENGINE = Path(__file__).resolve().parent
KIT = (ENGINE / '..' / '..' / '..' / 'kit').resolve()
PY = KIT / '.venv' / ('Scripts/python.exe' if os.name == 'nt' else 'bin/python')


def run(*cmd, **kw):
    subprocess.run([str(c) for c in cmd], check=True, **kw)


def ffmpeg(*args):
    run('ffmpeg', '-v', 'error', '-y', *args)


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    reel = Path(sys.argv[1]).expanduser().resolve()
    voice = sys.argv[2] if len(sys.argv) > 2 else 'keep'
    workers = int(os.environ.get('WORKERS', '4'))
    if not PY.exists():
        sys.exit(f'the voice tools are not set up: run  python {KIT / "setup.py"} --voice')
    os.environ['NODE_PATH'] = str(KIT / 'node_modules')
    os.chdir(reel)
    Path('audio').mkdir(exist_ok=True)
    dialogo = Path('falas.json').exists()

    print('== voice:', voice)
    if voice == 'keep' and dialogo:
        voice = 'falas'
    elif voice == 'keep' and not Path('audio/vo.wav').exists():
        voice = 'kokoro-cached'
    if voice == 'falas':
        run(PY, ENGINE / 'tools' / 'falas.py')
    elif voice in ('kokoro', 'kokoro-cached'):
        if voice == 'kokoro' or not Path('audio/vo_kokoro.wav').exists():
            run(PY, ENGINE / 'tools' / 'tts_kokoro.py')
        shutil.copy('audio/vo_kokoro.wav', 'audio/vo.wav')
    elif voice == 'elevenlabs':
        run(PY, ENGINE / 'tools' / 'tts_elevenlabs.py', 'audio/vo_el.mp3')
        ffmpeg('-i', 'audio/vo_el.mp3', '-ac', '1', '-ar', '44100', 'audio/vo.wav')
    elif voice != 'keep':
        ffmpeg('-i', Path(voice).expanduser(), '-ac', '1', '-ar', '44100', 'audio/vo.wav')
    if dialogo and voice != 'falas':
        run(PY, ENGINE / 'tools' / 'falas.py', '--elenco')   # the sheets may have changed even when the voices did not
    # trim leading/trailing silence so the hook lands on frame 1
    ffmpeg('-i', 'audio/vo.wav', '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,'
           'silenceremove=start_periods=1:start_threshold=-45dB,areverse', 'audio/vo_trim.wav')
    os.replace('audio/vo_trim.wav', 'audio/vo.wav')

    print('== aligning words to the voice')
    run(PY, ENGINE / 'tools' / 'align.py', 'audio/vo.wav')

    print('== music + sfx mix')
    run(PY, 'audio.py')

    if os.environ.get('AUDIO_ONLY') != '1' or not Path('silent.mp4').exists():
        print(f'== rendering shots with {workers} workers')
        shutil.rmtree('seg', ignore_errors=True); Path('seg').mkdir()
        n = Path('web/shots.js').read_text(encoding='utf-8').count('SHOTS.push')
        jobs = []
        for w in range(workers):
            ids = ','.join(str(i) for i in range(w, n, workers))
            if ids:
                log = open(f'seg/log{w}.txt', 'w')
                jobs.append((subprocess.Popen(['node', str(ENGINE / 'tools' / 'render.js'), 'segments', ids], stdout=log, stderr=subprocess.STDOUT), log))
        for p, log in jobs:
            p.wait(); log.close()
        shots = sorted(Path('seg').glob('shot_??.mp4'))
        if len(shots) != n:
            sys.exit(f'a shot failed to render, see {reel / "seg"}/log*.txt')
        Path('seg/list.txt').write_text(''.join(f"file '{s.resolve().as_posix()}'\n" for s in shots), encoding='utf-8')
        ffmpeg('-f', 'concat', '-safe', '0', '-i', 'seg/list.txt', '-c', 'copy', 'silent.mp4')

    print('== final mux')
    name = reel.name
    ffmpeg('-i', 'silent.mp4', '-i', 'audio/mix.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
           '-af', 'alimiter=limit=0.8:attack=2:release=60,loudnorm=I=-14:TP=-1.5:LRA=9',
           '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', f'{name}.part.mp4')
    os.replace(f'{name}.part.mp4', f'{name}.mp4')
    print(f'done: {reel / (name + ".mp4")}')


if __name__ == '__main__':
    main()

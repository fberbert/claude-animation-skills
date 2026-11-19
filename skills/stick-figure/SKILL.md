---
name: stick-figure
description: Makes a code-animated stick-figure explainer reel (9:16, 30 to 45 s) from a question or topic, or a short dialogue between reusable characters with their own look and voice. A bright cartoon world with thick outlines, stick people with big white heads and faces, constant camera motion, whip transitions, 1 to 2 word captions, a playful underscore and cartoon sound effects, all generated in code and timed to the voiceover word by word. Use when the user runs /stick-figure, asks for a stick-figure, stickman or cartoon "what if" explainer, or wants to create a stick-figure character ("personagem") or a conversation between characters.
---

# /stick-figure

```
┌──────────────────────┐
│   ☀      ☁           │  bright sky, sea, props drawn in code
│      ◯   ◯           │  stick people with big white heads, expressive faces
│     /|\ /|\          │
│     / \ / \  🛢       │
│     eye patch        │  1-2 word captions, lowercase, ~70% down
└──────────────────────┘
```

A worked example comes with it: `engine/template` is a finished 37 s reel, "What if pirate eye patches had nothing to do with missing eyes?". A second one, `engine/dialogo`, is a 15 s dialogue between two reusable characters (Beto and Duda) with their own looks and voices.

## First use
This skill's folder is the "Base directory" Claude Code shows when it loads it. Everything runs through Python, so the same commands work on Windows, macOS and Linux (on Windows write `py` for `python3`; the kit's Python is `kit/.venv/Scripts/python.exe` there).
```bash
SKILL_DIR="<base directory of this skill>"
ENGINE="$SKILL_DIR/engine"
KIT=$(python3 -c 'import os,sys;print(os.path.realpath(os.path.join(sys.argv[1],"..","..","kit")))' "$SKILL_DIR")
[ -d "$KIT/.venv" ] && [ -d "$KIT/models" ] || python3 "$KIT/setup.py" --voice   # ~1 GB of voice models, once
PY="$KIT/.venv/bin/python"; export NODE_PATH="$KIT/node_modules"
```
Needs ffmpeg, Node and Python 3.9+. To see the examples: `python3 "$ENGINE/novo.py" ~/reels/pirate && python3 "$ENGINE/make.py" ~/reels/pirate`, or `python3 "$ENGINE/novo.py" ~/reels/conversa dialogo && python3 "$ENGINE/make.py" ~/reels/conversa`.

## How it fits together
A reel is one folder:
- `script.json`: the voiceover, one sentence per entry.
- `captions.json`: optional text swaps for captions (`{"twenty five": "25"}`).
- `web/shots.js`: the shot list. Each shot is `SHOTS.push({start, end, tr, draw(ctx, lt, t)})` in seconds of the voiceover; `lt` is time inside the shot, `tr` is the transition out (`'whip'` or `'cut'`).
- `web/lib.js` (easing, keyframes `kf`, shapes, text), `web/chars.js` (the stick rig `drawStick`, hats, faces, arm IK, the eye patch), `web/env.js` (sky, clouds, sea, ships, deck, barrels, cannon, lantern, below deck), `web/main.js` (whip blur, vignette, grain, captions). Add new props to `env.js` or a new `env2.js` (list it in `web/index.html`).
- `audio.py`: music and SFX, all synthesised in code and placed in voiceover seconds.

`make.py` makes the voice, aligns every word (`audio/words_new.json`), mixes the sound, renders the shots in parallel and writes `<folder>/<folder name>.mp4` (`make.sh` just calls it).

**Timing:** `audio/words_ref.json` is the voice the shots were timed against. When the voice changes but the words don't, `make.py` warps the shots onto the new take, so a new recording needs no edits. If the script changes, delete `audio/words_ref.json` (the next take becomes the reference) and re-time `shots.js`.

## Characters and dialogue
A character is a JSON sheet, `personagens/<id>.json`, made once and reused in any reel. The sheet is looked up in the reel's own `personagens/` first, then in the nearest `personagens/` folder above the reel: keep the library at the root of the user's project (reels in subfolders find it, and it is versioned with the project). Without a project, `~/personagens/` (or the folder in `PERSONAGENS`) is the fallback. Save every new character to the library so the next video can use it.
```json
{
  "nome": "Duda",
  "jeito": "animada, fala com as mãos",
  "voz": {"kokoro": "pf_dora", "velocidade": 1.0},
  "pele": "#f6f2ea",
  "camisa": "#7a4bc4", "listras": "#f6f1e8",
  "cabelo": {"estilo": "rabo", "cor": "#3b2216"},
  "acessorios": ["oculos", {"tipo": "brinco", "cor": "#e8c04a"}],
  "rosto": {"olhos": "normal", "boca": "smile", "bochechas": true, "olhosTamanho": 1},
  "altura": 1.0
}
```
- `cabelo.estilo`: `careca`, `curto`, `espetado` (short and messy, with sideburns), `rabo` (ponytail), `coque` (bun), `longo` (shoulder length), `cacheado` (curly). `cabelo.mechas` adds lighter strands (salt and pepper) to `curto` and `espetado`.
- `acessorios`: `oculos`, `bone` (cap), `bigode`, `barba` (chin), `barba-cheia` (sideburns to chin with moustache, under the mouth; takes `mechas` too), `pinta` (mole; `x`, `y` in head radii from the centre, `tamanho`), `brinco`, `laco` (bow), `gravata` (tie), `avental` (apron), `cracha` (badge), `mangas` (short sleeves), `gola` (round collar under the chin), `jardineira` (denim overalls with shorts, bib, straps, buttons and pockets), `tenis` (dark sneakers with white soles); each takes an optional `cor`. List order is drawing order (`gola` after `jardineira`). New ones go in `ACESSORIOS` in `web/personagem.js` (`onde`: `atras`, `rosto`, `frente`, `roupa` or `pe`), new hair in `CABELOS`.
- `cabeca`: head height, 1 is round, 1.15 a taller oval (stretches everything on the head). `queixo`: only the lower half grows, 1.17 gives an egg-shaped face with a longer chin and leaves eyes, hair and cut-outs where they are.
- `voz`: `{"kokoro": "pf_dora" | "pm_alex" | "pm_santa"}` (free, offline), `{"gemini": "Kore", "estilo": "..."}` (free tier with a daily limit, `GEMINI_API_KEY`; the tool waits 21 s between requests), `{"elevenlabs": "<voice id>", "modelo": "eleven_v4", "ajustes": {"stability": 0.6, "similarity_boost": 1.0}}` (paid per character, `ELEVENLABS_API_KEY`; show the cost and ask before using; `ajustes` are the API's voice_settings). `velocidade` speeds the line up: Kokoro does it natively, Gemini and ElevenLabs are sped up afterwards with ffmpeg's atempo (pitch kept), so changing it does not pay for a new take. A line can use the user's own recording instead: `"arquivo": "gravacoes/1.m4a"`.
- `jeito` is the personality: read it before writing the character's lines and poses.
- `rosto.boca` is the resting mouth; `rosto.olhos` any eye kind of `drawFace` (`half` gives heavy lids); `rosto.iris` colours the iris; `rosto.olhosLargura` widens the eyes (1.25 for wide ovals); `rosto.olhosTamanho` scales them; `rosto.sobrancelha` makes the brows longer, arched and a bit thicker (1.5); `rosto.sobrancelhaAcima` and `rosto.bocaAbaixo` move brows up and the mouth down, in head radii.
- `imagens`: hair and beard cut from a drawing, `[{"arquivo": "fabio-cabelo.png", "camada": "frente"}, {"arquivo": "fabio-barba.png", "camada": "rosto"}]`, files next to the sheet. `frente` sits over everything, `rosto` on the skin under eyes and mouth (so the talking mouth stays visible), `atras` behind the head. Each PNG is a square centred on the head, from -2 to +2 head radii.

**From a picture:** when the user sends a drawing or photo of the character they want, read it and map it onto these fields (skin, shirt, eyes, brows, accessories, clothes), render the sheet and compare it side by side with the picture before showing it. Hair and beard drawn with real texture (strands, salt and pepper, shine) look much better cut from the drawing than rebuilt in code. When the drawing is in this engine's style (big head with a black outline, flat skin), run `"$PY" "$ENGINE/tools/recorte.py" desenho.png --centro X,Y --raio R --saida personagens/<id>` with the point between the eyes and the half-width of the head at eye level (to the middle of the outline), in pixels of the drawing; measure them from the outline, do not guess. Add `--cabelo longo` for hair that falls behind the head to the shoulders (it writes a second layer, `<id>-cabelo-atras.png`, and keeps only what is inside the character's black outline, so the sky and houses stay out), `--amostra X,Y` on the hair when it is coloured (red, blond, dyed), `--queixo Q` when the face is egg-shaped (chin distance from the centre over the radius; use the same `queixo` in the sheet), `--barba` for a beard and `--boca Y` to get the `bocaAbaixo`. It prints the `imagens` lines for the sheet. Look at each PNG over a flat colour before using it. Clothes are rebuilt with accessories, not cut out, so the arms can move over them. Keep the drawing next to the sheet as `<id>-referencia.png`. If something has no field yet (a hat, a skirt) and cannot be cut out, add it to `personagem.js` rather than faking it with the nearest one. A photo of a real person needs that person's consent.

**Check the look first:** `node "$ENGINE/tools/ficha.js" personagens/duda.json` writes `personagens/duda.png`, the character in five poses (standing, talking, happy, surprised, side view). Show it to the user and adjust colours, hair and accessories before animating.

**A dialogue reel** has `falas.json` instead of a hand-written `script.json`: `[{"quem": "beto", "texto": "Fazer vídeo com IA?", "fala": "Fazer vídeo com i á?"}]`. `texto` is the caption, `fala` (optional) the spelling for the voice, so an acronym can be spoken right and still show as "IA". `elenco.json` (optional) lists characters that appear without speaking. `make.py` (or `"$PY" "$ENGINE/tools/falas.py"`) voices each line with the speaker's sheet, joins them with short pauses into `audio/vo.wav`, writes `script.json` and `web/elenco.js`. Every generated line is cached in `audio/falas/`, so a rebuild spends no quota or credit; delete a cached file to get a new take.

In `shots.js` draw a character with `personagem(ctx, 'duda', { t, x, y, s, flip, arms, legs, face, headTilt, bob })`: the same options as `drawStick`, plus `t` (the shot's voiceover time), which makes the mouth move on the words of that character's lines and the eyes blink. `face.mouth` is the expression when they are not talking; `fala: false` keeps the mouth still. Sheets change in one place: edit the JSON and rebuild, and every reel that uses the character follows on its next build.

## Steps
1. **Script.** About 110 to 120 words for 38 to 40 seconds, one idea per sentence: a "what if" hook, the common belief, a turn on "But", examples that build, one shot that shows the mechanism, and a payoff that answers the hook. Show it to the user before animating.
2. **Facts.** Check every claim with sources. Hedge theories ("scientists think").
3. **Folder.** `python3 "$ENGINE/novo.py" <reel>` copies the pirate reel; replace `script.json` (and `captions.json`) and empty `audio/`. For a conversation, `python3 "$ENGINE/novo.py" <reel> dialogo` copies Beto and Duda: write the sheets and `falas.json` (see Characters and dialogue), delete `audio/words_ref.json` (it times the example's lines) and set `DUR` in `audio.py` to the new length. A 15 s dialogue holds 4 to 6 short lines, about 35 words.
4. **Voice.** `"$PY" "$ENGINE/tools/falas.py"` for a dialogue; otherwise in the folder `"$PY" "$ENGINE/tools/tts_kokoro.py"` (free) or the user's own recording, or ElevenLabs with `ELEVENLABS_API_KEY` (`"$PY" "$ENGINE/tools/tts_elevenlabs.py" audio/vo_el.mp3`). Put the take at `audio/vo.wav`, then `"$PY" "$ENGINE/tools/align.py" audio/vo.wav` and read the word times in `audio/words_new.json`.
5. **Shots.** Rewrite `web/shots.js`: about 10 to 12 setups, most 2 to 4 s, the explainer shot longer. A new idea gets a new setup. Start the hook in action on frame 1. Keep faces and key props out of the caption band (y about 1250 to 1420) and inside Instagram's safe area (x 100 to 980, y 220 to 1500).
6. **Stills.** From the folder: `node "$ENGINE/tools/render.js" stills 1.5,4.2,9.0` writes `stills/`. Look at the busiest moments and fix them before a full render.
7. **Sound.** Edit the cues in `audio.py` against the word times.
8. **Build.** `python3 "$ENGINE/make.py" <reel>` (keeps `audio/vo.wav`; pass `kokoro`, `elevenlabs`, `falas` or a file to replace it). `WORKERS=8` on a machine with more cores. `AUDIO_ONLY=1` remixes the sound without re-rendering.
9. **Hand over** `<reel>/<name>.mp4`.

## Style
- Captions: Poppins Bold, white with a dark outline, 1 to 2 words, lowercase, no punctuation (`capText()` in `main.js` does it; digits and `%` stay). No em dashes anywhere on screen.
- Bright saturated palette, ink outlines (`#221c22`), soft contact shadows, slow push-ins with handheld drift, whip transitions with motion blur. An impact is a burst, a shake and a flash.
- SFX sit under the voice (gain about 0.38). The music is a quiet plucked underscore, ducked under the voice, never a loud loop at the start.

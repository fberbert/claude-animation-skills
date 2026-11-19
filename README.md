# Claude animation skills

Skills for Claude Code that make animations for reels, with no footage needed. You type `/map-route home to the gym, 2.8 km` and Claude writes the spec, renders the animation on your own computer and checks it against Instagram's safe area.

> **Este fork** é usado no curso presencial "Vídeos e Animações com IA: do zero ao publicado" ([material do aluno](https://github.com/fberbert/curso-video-ia-kit)). Mudanças em relação ao [original](https://github.com/artemnovitckii/claude-animation-skills):
>
> - **Português do Brasil por padrão:** números no formato brasileiro no `/graph` (`R$ 18.750,50`; `"locale": "en-US"` volta ao americano), textos do `/map-route` em português ("Chegou", "faltam 1,2 km"; `"lang": "en"` volta ao inglês) e exemplos do `/breakdown` em português.
> - **Instalação em Python** (`install.py` e `kit/setup.py`), pensada também para o Windows; `install.sh` e `kit/setup.sh` só chamam os dois.
> - **Marcação de palavras em português:** Parakeet v3 (25 idiomas) no lugar do v2, que só entendia inglês, e comparação de palavras que respeita acentos.
> - **Voz grátis em português:** o Kokoro usa o idioma da voz (`pf_dora`, `pm_alex`, `pm_santa` falam português do Brasil).
> - **Linux com placa NVIDIA:** a instalação do HyperFrames não trava mais tentando baixar o CUDA.
> - **Personagens reutilizáveis no `/stick-figure`:** cada personagem é uma ficha (`personagens/<id>.json`: cabelo, pele, roupa, acessórios, jeito e voz), conferida numa folha de poses (`tools/ficha.js`) e guardada na pasta `personagens/` do projeto, que todo vídeo dentro dele encontra (e que vai junto no git). Pode nascer de uma descrição ou de um desenho. Diálogos (`falas.json`) saem com a voz de cada personagem (Kokoro, Gemini, ElevenLabs ou gravação própria) e a boca mexe nas palavras de quem fala. Exemplo pronto em `engine/dialogo`.
> - **`/stick-figure` sem bash:** `make.py` e `novo.py` no lugar do `make.sh`, para rodar igual no Windows.
> - Funciona também com o [omp](https://omp.sh), que lê as skills de `~/.claude/skills`.

![The six skills, one frame each](docs/skills.jpg)

| Skill | What it makes | Try it with |
|---|---|---|
| `/zach-d-films` | **A 3D cartoon "what if" explainer.** Cartoon people, props and effects built in three.js, slow-motion impacts, a red force ripple and captions timed to your voiceover. Comes with a finished 29 s example to build from. | `Could ancient armour stop an arrow?` |
| `/stick-figure` | **A stick-figure explainer reel.** A bright cartoon world, stick people with big faces, whip transitions, 1 to 2 word captions, and music and sound effects made in code. Comes with a finished 37 s example. | `Why did pirates wear eye patches?` |
| `/minimalistic-graphics` | **Black-and-white line art.** Hairline steps rise, one white dot hops up them and gets an orbit at the top, with one quiet line of text. | `Every step feels small until you look back` |
| `/map-route` | **A 3D map route.** A white city, a route that draws itself while the camera follows, a pin drop, an ETA that counts down and a destination card. | `Home to the gym, 2.8 km` |
| `/breakdown` | **A 3D exploded view.** A phone comes apart layer by layer, and every part gets a leader line and a label. | `My phone, every part labelled` |
| `/graph` | **A minimal line graph.** A smooth line draws itself, and one big number counts up with its tip. Black on white, or white on black. | `0 to 100K followers in 9 months` |

See them moving: **[novitckii.com/resources/animation-skills](https://novitckii.com/resources/animation-skills/)**

### 5 animation styles (new)

![The five styles, one frame each: low-poly, minecraft, zach-3d-films, kurzgesagt, dan-koe](docs/five-styles.jpg)

| Skill | What it makes | Try it with |
|---|---|---|
| `/low-poly` | **PS1-era low-poly 3D.** Chunky pixels, wobbly vertices, dithering and small yellow captions. The built-in scene: a dog waits on a station platform, a train comes and goes, and he is still there in the snow. | `The dog who waited at the station for 10 years` |
| `/minecraft` | **A blocky voxel build.** A cottage builds itself block by block on a grassy hill, the chimney slams in and the windows light up. Every texture is drawn in code. | `Build a tiny cottage block by block` |
| `/zach-3d-films` | **The 3D cartoon explainer.** The same engine as `/zach-d-films`, under the name from the reel. | `Could ancient armour stop an arrow?` |
| `/kurzgesagt` | **Flat-vector space.** Glowing planets with a dark crescent, twinkling stars and bright label tags. The built-in scene stacks every planet, to scale, between Earth and the Moon. | `Do all the planets fit between Earth and the Moon?` |
| `/dan-koe` | **Black-and-white line art.** One dot grows into a hairline tree that splits in two at every step, and the tips light up. | `One choice, then the next` |

See them moving: **[novitckii.com/resources/animation-styles](https://novitckii.com/resources/animation-styles/)**

## Install

You need macOS, Linux or Windows with **ffmpeg**, **Node.js 20+** and **Python 3.9+**. Windows support in this fork is new: the quick skills and `/stick-figure` build with Python and Node only, while `/zach-d-films`'s `make.sh` still needs bash.

```bash
brew install ffmpeg node        # if you don't have them (Windows: winget install Gyan.FFmpeg OpenJS.NodeJS.LTS)
git clone https://github.com/fberbert/claude-animation-skills.git ~/claude-animation-skills
cd ~/claude-animation-skills && python3 install.py        # Windows: py install.py
```

`install.py` puts every skill into `~/.claude/skills/` (so they show up as `/graph`, `/map-route` and so on, in Claude Code and in omp; `--dest` picks another folder) and runs the one-time setup. On macOS and Linux each skill is a link to this folder; on Windows it is a copy. The setup installs three.js and Playwright into `kit/node_modules`, fetches GSAP and warms up HyperFrames.

`/stick-figure` and `/zach-d-films` also need a free voice and word timings. They run on your computer, with no API key, and need about 1.3 GB of models, downloaded once:

```bash
python3 install.py --voice
```

To update later, run `git pull && python3 install.py`.

**The original is also packaged as a Claude Code plugin** (without this fork's changes). Run these inside Claude Code:
```
/plugin marketplace add artemnovitckii/claude-animation-skills
/plugin install animation-skills@claude-animation-skills
```
Plugin skills are namespaced (`/animation-skills:graph`). The git clone above is the route tested end to end.

## Use

Open Claude Code anywhere and ask:

```
/graph 0 to 100K followers in 9 months: 1.2K, 2.1K, 3.4K, 5K, 9K, 24K, 51K, 78K, 100K
/map-route home to the gym, 2.8 km, 9 minutes
/minimalistic-graphics every step feels small until you look back
/breakdown my phone, label it like a joke
/stick-figure why did pirates wear eye patches?
/zach-d-films could ancient armour stop an arrow? (my voiceover is ~/Downloads/vo.m4a)
/low-poly the dog who waited at the station for 10 years
/minecraft build a tiny cottage block by block
/kurzgesagt do all the planets fit between Earth and the Moon?
/dan-koe one choice, then the next
```

**The quick ones** (`/graph`, `/minimalistic-graphics`, `/map-route`, `/breakdown`, `/dan-koe`, `/kurzgesagt`, `/low-poly`, `/minecraft`) work from a small JSON spec. Claude writes `name.graph.json`, runs the skill's `build.py`, and you get `name.graph.mp4` (1080x1920, 30 fps) plus `name.graph.sheet.jpg`, a contact sheet with Instagram's safe area marked. The 2D ones render in about 10 seconds, the 3D ones in about 1.5 minutes.

**The two engines** (`/stick-figure`, `/zach-d-films`, also called `/zach-3d-films`) are full explainer reels. Claude copies the example project, writes the script with you, makes or takes the voiceover, times every caption to it, writes the shots in code, checks stills, and renders. Plan on a working session, not one command.

## How it's built

```
skills/<name>/SKILL.md          what Claude follows: steps, the spec, taste rules
skills/<name>/build.py          spec.json -> template.html -> HyperFrames -> mp4   (all the quick skills)
skills/<name>/template.html     the animation (GSAP, or three.js for the 3D ones)
skills/stick-figure/engine/     canvas engine, voice + timing tools, make.py, the pirate reel as the template and a two-character dialogue
skills/zach-d-films/engine/     three.js engine (people, props, effects, renderer) and the armour short as the example
kit/anim.py                     shared: fill a template, render, snapshots, contact sheet
kit/words.py                    word timings for a voiceover (Parakeet v3, on your computer)
kit/setup.py                    one-time setup (kit/setup.sh calls it)
install.py                      puts the skills where the agent finds them (install.sh calls it)
```

To add a quick skill, copy a folder like `skills/graph`, change `template.html` (read the spec from `const SPEC = __SPEC__`) and its `DEFAULTS` in `build.py`, then run `python3 install.py` again.

## Credits

- [HyperFrames](https://github.com/heygen-com/hyperframes) by HeyGen renders the quick skills.
- [three.js](https://threejs.org) draws the 3D, [GSAP](https://gsap.com) drives the 2D animation and [Playwright](https://playwright.dev) runs the engines' headless Chrome. They are installed at setup, not included here.
- The free voice is [Kokoro](https://github.com/thewh1teagle/kokoro-onnx) and the word timings come from NVIDIA's Parakeet through [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx). The models are downloaded at setup, not included here.
- The fonts are Inter, Inter Tight, Poppins, JetBrains Mono, Montserrat and Lora, all under the SIL Open Font License.
- `/zach-d-films` is named after the style of short it makes. It isn't affiliated with Zack D. Films.

Made by [Artem Novitckii](https://novitckii.com). MIT licensed.

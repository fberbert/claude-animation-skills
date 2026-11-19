"""Diálogo com personagens reutilizáveis: cada fala sai na voz da ficha de quem fala.

Rode da pasta do vídeo (o make.py chama sozinho):  python falas.py            grava a voz e monta o elenco
                                                  python falas.py --elenco   só refaz web/elenco.js (mudou a ficha, não a fala)
Lê:
  falas.json        [{"quem": "duda", "texto": "Publicado! Bora?", "fala": "grafia para a voz (opcional)", "arquivo": "gravação própria (opcional)"}]
  elenco.json       (opcional) ids de personagens que aparecem sem falar: ["rex"]
  personagens/<id>.json  a ficha; se não estiver na pasta do vídeo, vem da biblioteca (PERSONAGENS ou ~/personagens)
Escreve: audio/vo.wav (a conversa inteira), script.json (o texto de cada fala, para o alinhamento e a legenda),
         web/elenco.js (fichas e quem fala cada linha, para a boca sincronizada).
Vozes da ficha ("voz"): {"kokoro": "pf_dora", "velocidade": 1.0}  grátis, roda no computador
                        {"gemini": "Kore", "estilo": "animada"}    grátis com limite diário (GEMINI_API_KEY)
                        {"elevenlabs": "<voice_id>"}               paga por caractere (ELEVENLABS_API_KEY)
Cada fala gerada fica guardada em audio/falas/: refazer o vídeo não gasta cota nem crédito de novo.
"""
import base64, hashlib, json, os, shutil, subprocess, sys, tempfile, time, urllib.error, urllib.request
import numpy as np
import soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
KIT = os.path.realpath(os.path.join(ROOT, '..', '..', '..', 'kit'))
SR = 24000
PAUSA_MESMO, PAUSA_TROCA = 0.12, 0.28          # silêncio entre falas da mesma pessoa e na troca de quem fala


def biblioteca():
    return os.environ.get('PERSONAGENS') or os.path.join(os.path.expanduser('~'), 'personagens')


def ficha(pid):
    for pasta in ('personagens', biblioteca()):
        f = os.path.join(pasta, f'{pid}.json')
        if os.path.exists(f):
            return json.load(open(f, encoding='utf-8'))
    sys.exit(f'falta a ficha de "{pid}": crie personagens/{pid}.json (ou {os.path.join(biblioteca(), pid + ".json")})')


def chave(nome):
    if os.environ.get(nome):
        return os.environ[nome]
    for arq in ('.env', os.path.join(os.path.expanduser('~'), '.env')):
        if os.path.exists(arq):
            for linha in open(arq, encoding='utf-8'):
                k, _, v = linha.strip().removeprefix('export ').partition('=')
                if k.strip() == nome and v:
                    return v.strip().strip('"').strip("'")
    sys.exit(f'falta {nome}: coloque {nome}=... no arquivo .env da pasta do vídeo')


def para_wav(origem, destino):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', origem, '-ac', '1', '-ar', str(SR), destino], check=True)


_kokoro = None
def kokoro(texto, voz, wav):
    global _kokoro
    if _kokoro is None:
        import espeakng_loader
        from kokoro_onnx import EspeakConfig, Kokoro
        data = espeakng_loader.get_data_path()
        if len(data) > 100:                      # o espeak-ng falha com caminho longo (igual ao tts_kokoro.py)
            curto = os.path.join(tempfile.gettempdir(), 'kokoro-espeak-ng-data')
            if not os.path.exists(os.path.join(curto, 'phontab')):
                shutil.rmtree(curto, ignore_errors=True); shutil.copytree(data, curto)
            data = curto
        _kokoro = Kokoro(os.path.join(KIT, 'models/kokoro-v1.0.onnx'), os.path.join(KIT, 'models/voices-v1.0.bin'),
                         espeak_config=EspeakConfig(lib_path=espeakng_loader.get_library_path(), data_path=data))
    lang = {'a': 'en-us', 'b': 'en-gb', 'e': 'es', 'f': 'fr-fr', 'i': 'it', 'p': 'pt-br'}.get(voz['kokoro'][0], 'en-us')
    som, sr = _kokoro.create(texto, voice=voz['kokoro'], speed=float(voz.get('velocidade', 1.0)), lang=lang)
    sf.write(wav + '.tmp.wav', som, sr); para_wav(wav + '.tmp.wav', wav); os.remove(wav + '.tmp.wav')


_ultimo_gemini = 0.0
def gemini(texto, voz, wav):
    global _ultimo_gemini
    espera = 21 - (time.time() - _ultimo_gemini)  # o plano grátis aceita 3 pedidos por minuto
    if espera > 0:
        time.sleep(espera)
    estilo = voz.get('estilo', 'conversa natural')
    corpo = {'model': voz.get('modelo', 'gemini-3.8-flash-tts'),
             'input': [{'type': 'user_input', 'content': [{'type': 'text', 'text': texto, 'annotations': [
                 {'type': 'speech_metadata', 'style': f'{estilo}, em português do Brasil, com sotaque brasileiro'}]}]}],
             'response_format': {'type': 'audio'}, 'generation_config': {'speech_config': [{'voice': voz['gemini']}]}}
    req = urllib.request.Request('https://generativelanguage.googleapis.com/v1beta/interactions', data=json.dumps(corpo).encode(),
                                 headers={'x-goog-api-key': chave('GEMINI_API_KEY'), 'Content-Type': 'application/json'})
    try:
        r = json.load(urllib.request.urlopen(req, timeout=180))
    except urllib.error.HTTPError as e:
        sys.exit(f'Gemini recusou ({e.code}): {e.read().decode()[:400]}')
    _ultimo_gemini = time.time()
    audio = [c for s in r.get('steps', []) if s.get('type') == 'model_output' for c in s.get('content', []) if c.get('type') == 'audio']
    if not audio:
        sys.exit(f'Gemini não devolveu áudio: {json.dumps(r)[:400]}')
    open(wav + '.gemini', 'wb').write(base64.b64decode(audio[-1]['data']))
    para_wav(wav + '.gemini', wav); os.remove(wav + '.gemini')


def elevenlabs(texto, voz, wav):
    corpo = json.dumps({'text': texto, 'model_id': voz.get('modelo', 'eleven_multilingual_v2'),
                        'voice_settings': {'stability': 0.45, 'similarity_boost': 0.75, 'style': 0.3}}).encode()
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{voz['elevenlabs']}", data=corpo,
                                 headers={'xi-api-key': chave('ELEVENLABS_API_KEY'), 'Content-Type': 'application/json', 'Accept': 'audio/mpeg'})
    try:
        open(wav + '.mp3', 'wb').write(urllib.request.urlopen(req, timeout=180).read())
    except urllib.error.HTTPError as e:
        sys.exit(f'ElevenLabs recusou ({e.code}): {e.read().decode()[:400]}')
    para_wav(wav + '.mp3', wav); os.remove(wav + '.mp3')


MOTORES = {'kokoro': kokoro, 'gemini': gemini, 'elevenlabs': elevenlabs}


def gerar_fala(f, voz):
    """Devolve o áudio (24 kHz, mono) de uma fala, gerado uma vez e guardado em audio/falas/."""
    if f.get('arquivo'):
        wav = os.path.join('audio', 'falas', 'gravacao-' + hashlib.sha1(os.path.abspath(f['arquivo']).encode()).hexdigest()[:10] + '.wav')
        para_wav(f['arquivo'], wav)
        return wav
    motor = next((m for m in MOTORES if m in voz), None)
    if not motor:
        sys.exit(f'a ficha de "{f["quem"]}" não tem voz: use "voz": {{"kokoro": "pf_dora"}}, {{"gemini": "Kore"}} ou {{"elevenlabs": "<id>"}}')
    texto = f.get('fala', f['texto'])
    wav = os.path.join('audio', 'falas', hashlib.sha1(json.dumps([voz, texto], sort_keys=True).encode()).hexdigest()[:16] + '.wav')
    if not os.path.exists(wav):
        print(f'  voz {motor} ({f["quem"]}): {texto}')
        MOTORES[motor](texto, voz, wav)
    return wav


def main():
    falas = json.load(open('falas.json', encoding='utf-8'))
    ids = list(dict.fromkeys([f['quem'] for f in falas] + (json.load(open('elenco.json')) if os.path.exists('elenco.json') else [])))
    elenco = {pid: ficha(pid) for pid in ids}
    os.makedirs('web', exist_ok=True)
    with open(os.path.join('web', 'elenco.js'), 'w', encoding='utf-8') as out:
        out.write('// gerado por falas.py a partir de falas.json e personagens/*.json: não edite, edite a ficha\n')
        out.write('window.ELENCO = ' + json.dumps(elenco, ensure_ascii=False) + ';\n')
        out.write('window.FALAS = ' + json.dumps([f['quem'] for f in falas]) + ';\n')
    json.dump([f['texto'] for f in falas], open('script.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    if '--elenco' in sys.argv:
        return
    os.makedirs(os.path.join('audio', 'falas'), exist_ok=True)
    pedacos, t = [], 0.0
    for i, f in enumerate(falas):
        som, _ = sf.read(gerar_fala(f, elenco[f['quem']].get('voz', {})), dtype='float32')
        idx = np.where(np.abs(som) > 0.01)[0]
        som = som[max(0, idx[0] - int(0.02 * SR)): idx[-1] + int(0.06 * SR)]
        if i:
            pausa = PAUSA_TROCA if f['quem'] != falas[i - 1]['quem'] else PAUSA_MESMO
            pedacos.append(np.zeros(int(pausa * SR), dtype=np.float32)); t += pausa
        print(f'  {t:5.2f}s  {f["quem"]}: {f["texto"]}')
        pedacos.append(som); t += len(som) / SR
    sf.write(os.path.join('audio', 'vo.wav'), np.concatenate(pedacos), SR)
    print(f'conversa: {t:.2f} s')


if __name__ == '__main__':
    main()

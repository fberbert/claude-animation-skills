"""Recorta o cabelo (e a barba) de um desenho do personagem, para o boneco usar a mesma textura.

Serve para desenhos no estilo do motor (cabeça grande de contorno preto, pele lisa), como os gerados por IA a partir
da folha de poses. Rode com o Python do kit:
  python recorte.py desenho.png --centro 470,506 --raio 250 --saida personagens/fabio --barba --boca 643
  python recorte.py desenho.png --centro 466,502 --raio 192 --saida personagens/luiza --cabelo longo --amostra 330,300
    --centro   ponto entre os dois olhos, em pixels do desenho (é o centro da cabeça do boneco)
    --raio     meia largura da cabeça na altura dos olhos, até o meio do contorno preto
    --cabelo   curto (padrão: topo e costeletas, por cima de tudo) ou longo (cai atrás da cabeça até os ombros)
    --amostra  ponto no meio do cabelo, quando ele é colorido (ruivo, loiro, tingido); pode repetir
    --barba    recorta também a barba (das costeletas ao queixo)
    --boca     altura da boca no desenho (opcional): imprime o "bocaAbaixo" para a ficha
Escreve quadrados centrados na cabeça, com a cabeça ocupando 1/4 da largura (o personagem.js desenha cada um de -2 a +2
raios), e imprime as linhas de "imagens" para a ficha:
  <saida>-cabelo.png        camada frente (topo e franja)
  <saida>-cabelo-atras.png  camada atras, só no cabelo longo (as mechas dos lados e de trás)
  <saida>-barba.png         camada rosto (por baixo da boca do boneco, que continua mexendo)
O cabelo é separado pela cor: castanho, cinza, branco e preto sempre entram; com --amostra, também a cor do ponto.
A pele (laranja-clara saturada) fica de fora. No cabelo longo, só conta o que está dentro do contorno preto do
personagem, para o céu e as casas do fundo não entrarem.
"""
import argparse, json
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage


def mascara(m, filtro):
    return np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(filtro)) > 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('imagem'); ap.add_argument('--centro', required=True); ap.add_argument('--raio', type=float, required=True)
    ap.add_argument('--saida', required=True); ap.add_argument('--boca', type=float)
    ap.add_argument('--cabelo', choices=['curto', 'longo'], default='curto')
    ap.add_argument('--amostra', action='append', default=[]); ap.add_argument('--barba', action='store_true')
    ap.add_argument('--queixo', type=float, default=1.0)   # rosto de ovo: distância do queixo ao centro, em raios (igual ao "queixo" da ficha)
    a = ap.parse_args()
    cx, cy = map(float, a.centro.split(',')); R = a.raio
    rgb = np.asarray(Image.open(a.imagem).convert('RGB')).astype(np.float32) / 255
    mx, mn = rgb.max(2), rgb.min(2); L = (mx + mn) / 2
    S = np.where(mx == mn, 0, (mx - mn) / np.maximum(1e-6, 1 - np.abs(2 * L - 1)))
    H = hue(rgb)
    pele = (H > 12) & (H < 40) & (S > .55) & (L > .58)
    fio = ((S < .38) | (L < .2)) & ~pele          # castanho, cinza, branco e preto; fora: pele, céu e cores do cenário
    for p in a.amostra:                            # cabelo colorido: tudo perto da cor do ponto de amostra
        x, y = map(int, p.split(','))
        fio |= (np.linalg.norm(rgb - rgb[y - 3:y + 4, x - 3:x + 4].reshape(-1, 3).mean(0), axis=2) < .28) & ~pele
    h, w = L.shape
    ys, xs = np.mgrid[0:h, 0:w]
    dx, dy = (xs - cx) / R, (ys - cy) / R           # coordenadas da cabeça: raio 1, olhos em y = 0
    dist = np.hypot(dx, dy)
    contorno = (dist > .9) & (dist < 1.06) & (dy < .85) & (L < .3)   # o contorno da cabeça no desenho: o do boneco fica no lugar
    camadas = []
    if a.cabelo == 'curto':
        camadas.append(('cabelo', 'frente', fio & (((dy < -.56) & (dist < 1.5)) | ((np.abs(dx) > .8) & (dy < -.15) & (dist < 1.06)))))
    else:
        # o personagem é o que o contorno preto separa do fundo: tudo que não se liga à borda da imagem sem cruzar preto
        livre = ~mascara(L < .3, ImageFilter.MaxFilter(3))
        rotulos, _ = ndimage.label(livre)
        borda = np.unique(np.concatenate([rotulos[0], rotulos[-1], rotulos[:, 0], rotulos[:, -1]]))
        fundo = np.isin(rotulos, borda[borda > 0])
        cabelo = fio & ~fundo
        tronco = (np.abs(dx) < .62) & (dy > .98)   # pescoço e camisa
        # o rosto do desenho: a pele ligada ao ponto entre os olhos, com olhos, sobrancelhas e boca (os buracos dela)
        peles, _ = ndimage.label(pele)
        rosto = mascara(ndimage.binary_fill_holes(peles == peles[int(cy), int(cx)]), ImageFilter.MaxFilter(5))
        ovo = np.hypot(dx, np.where(dy > 0, dy / a.queixo, dy))   # distância até o contorno da cabeça do boneco (1 = no contorno)
        borda_rosto = (ovo > .95) & (ovo < 1.05) & (L < .3)       # o contorno do rosto no desenho: o do boneco fica no lugar
        # frente: o cabelo que cai sobre a cabeça do boneco (cobre também o contorno dele); atrás: o que fica fora dela
        camadas.append(('cabelo', 'frente', cabelo & (ovo < 1.06) & ~rosto))
        roupa = (dy > 1.0) & (S < .38) & (L > .45)   # abaixo do queixo, branco e cinza claro são a camisa do desenho
        camadas.append(('cabelo-atras', 'atras', cabelo & (ovo >= .95) & ~borda_rosto & ~tronco & ~roupa & (np.abs(dx) < 1.35) & (dy < 1.66)))
    if a.barba:
        # a boca do desenho: traço preto com pele logo acima e logo abaixo (o boneco desenha a boca dele, que mexe)
        perto = lambda m, d: np.logical_or.reduce([np.roll(m, k * d, 0) for k in range(1, 15)])
        boca = mascara((L < .16) & perto(pele, 1) & perto(pele, -1), ImageFilter.MaxFilter(9))
        gola = (dy >= .85) & (L < .13)              # abaixo do queixo, o preto é contorno e gola da camisa
        camadas.append(('barba', 'rosto', fio & ~boca & ~contorno & ~gola & (dy > .22)
                        & (((dist < 1.0) & (dy < .85)) | ((dy >= .85) & (dist < 1.1) & (np.abs(dx) < .62)))))
    imagens = []
    for nome, camada, m in camadas:
        alfa = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.7))
        cor = Image.fromarray((rgb * 255).astype(np.uint8)); cor.putalpha(alfa)
        lado = int(round(4 * R)); x0, y0 = int(round(cx - 2 * R)), int(round(cy - 2 * R))   # de -2 a +2 raios
        arq = f'{a.saida}-{nome}.png'
        cor.crop((x0, y0, x0 + lado, y0 + lado)).save(arq, optimize=True)
        print(arq, int(m.sum()), 'pixels')
        imagens.append({'arquivo': arq.replace('\\', '/').split('/')[-1], 'camada': camada})
    print('"imagens":', json.dumps(imagens, ensure_ascii=False))
    if a.boca is not None:
        print(f'"bocaAbaixo": {round((a.boca - cy) / R - .447, 3)}   (a boca do boneco fica a 0,447 raio abaixo dos olhos)')


def hue(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx, mn = rgb.max(2), rgb.min(2); d = np.maximum(mx - mn, 1e-6)
    hh = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4))
    return np.where(mx == mn, 0, hh * 60)


if __name__ == '__main__':
    main()

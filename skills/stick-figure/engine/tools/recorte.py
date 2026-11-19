"""Recorta o cabelo e a barba de um desenho do personagem, para o boneco usar a mesma textura.

Serve para desenhos no estilo do motor (cabeça grande de contorno preto, pele lisa), como os gerados por IA a partir
da folha de poses. Rode com o Python do kit:
  python recorte.py desenho.png --centro 470,506 --raio 250 --saida personagens/fabio [--boca 643]
    --centro  ponto entre os dois olhos, em pixels do desenho (é o centro da cabeça do boneco)
    --raio    meia largura da cabeça na altura dos olhos, até o meio do contorno preto
    --boca    altura da boca no desenho (opcional): imprime o "bocaAbaixo" para a ficha
Escreve <saida>-cabelo.png e <saida>-barba.png: quadrados centrados na cabeça, com a cabeça ocupando 1/4 da largura
(o personagem.js desenha cada um de -2 a +2 raios). Na ficha:
  "imagens": [{"arquivo": "fabio-cabelo.png", "camada": "frente"},
              {"arquivo": "fabio-barba.png", "camada": "rosto", "cobreContorno": true}]
Cabelo e barba são separados pela cor: pele (laranja-clara saturada), céu e cenário (cores fortes) ficam de fora;
fios castanhos, cinza, brancos e o contorno preto do cabelo entram.
"""
import argparse
import numpy as np
from PIL import Image, ImageFilter


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('imagem'); ap.add_argument('--centro', required=True); ap.add_argument('--raio', type=float, required=True)
    ap.add_argument('--saida', required=True); ap.add_argument('--boca', type=float)
    a = ap.parse_args()
    cx, cy = map(float, a.centro.split(',')); R = a.raio
    rgb = np.asarray(Image.open(a.imagem).convert('RGB')).astype(np.float32) / 255
    mx, mn = rgb.max(2), rgb.min(2); L = (mx + mn) / 2
    S = np.where(mx == mn, 0, (mx - mn) / np.maximum(1e-6, 1 - np.abs(2 * L - 1)))
    H = hue(rgb)
    pele = (H > 12) & (H < 40) & (S > .55) & (L > .58)
    fio = ((S < .38) | (L < .2)) & ~pele          # castanho, cinza, branco e preto; fora: pele, céu e cores do cenário
    # a boca do desenho: traço preto com pele logo acima e logo abaixo (o boneco desenha a boca dele, que mexe)
    preto = L < .16
    perto = lambda m, d: np.logical_or.reduce([np.roll(m, k * d, 0) for k in range(1, 15)])
    boca = preto & perto(pele, 1) & perto(pele, -1)
    boca = np.asarray(Image.fromarray((boca * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9))) > 0
    h, w = L.shape
    ys, xs = np.mgrid[0:h, 0:w]
    dx, dy = (xs - cx) / R, (ys - cy) / R           # coordenadas da cabeça: raio 1, olhos em y = 0
    dist = np.hypot(dx, dy)
    cabelo = fio & (((dy < -.56) & (dist < 1.5)) | ((np.abs(dx) > .8) & (dy < -.15) & (dist < 1.06)))
    contorno = (dist > .9) & (dist < 1.06) & (dy < .85) & (L < .3)   # o contorno da cabeça no desenho: o do boneco fica no lugar
    gola = (dy >= .85) & (L < .13)                                   # abaixo do queixo, o preto é contorno e gola da camisa
    barba = fio & ~boca & ~contorno & ~gola & (dy > .22) & (((dist < 1.0) & (dy < .85)) | ((dy >= .85) & (dist < 1.1) & (np.abs(dx) < .62)))
    for nome, mask in (('cabelo', cabelo), ('barba', barba)):
        alfa = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.7))
        cor = Image.fromarray((rgb * 255).astype(np.uint8)); cor.putalpha(alfa)
        lado = int(round(4 * R))                    # de -2 a +2 raios em volta do centro
        caixa = (int(round(cx - 2 * R)), int(round(cy - 2 * R)), int(round(cx - 2 * R)) + lado, int(round(cy - 2 * R)) + lado)
        cor.crop(caixa).save(f'{a.saida}-{nome}.png', optimize=True)
        print(f'{a.saida}-{nome}.png', int(mask.sum()), 'pixels')
    if a.boca is not None:
        print(f'"bocaAbaixo": {round((a.boca - cy) / R - .447, 3)}   (a boca do boneco fica a 0,447 raio abaixo dos olhos)')


def hue(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx, mn = rgb.max(2), rgb.min(2); d = np.maximum(mx - mn, 1e-6)
    hh = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4))
    return np.where(mx == mn, 0, hh * 60)


if __name__ == '__main__':
    main()

// Murtaza'nın piksel çizimi: 16 x 20 piksellik bir sultan papağanı, sağa bakar.
// Her harf bir renk, '.' boş.

import type { Mood } from '../types'

export const PALETTE: Record<string, number> = {
  Y: 0xf7d84a, // sarı baş
  y: 0xe9b824, // tepelik
  O: 0xf2842a, // turuncu yanak
  G: 0xa3a8b4, // gri gövde
  g: 0x6e7380, // koyu gri kanat
  W: 0xf4f4f6, // beyaz kanat şeridi
  K: 0x16131c, // göz
  B: 0xc49a6c, // gaga
  F: 0xe59aa6, // ayak
  P: 0xa855f7, // mor tünek
  p: 0x7e3ad6, // mor tünek gölgesi
  S: 0xc9a227, // tohum
}

const W = 16

// Gövde, baş hariç (satır 11-19)
const BODY = [
  '.....GGGGGGGG...', // 11
  '....GGgggGGGG...', // 12
  '....GgWWggGGG...', // 13
  '...GgWWgggGGG...', // 14
  '...GgggggGGGG...', // 15
  '..gggggGGGGG....', // 16
  '.gg...F..F......', // 17
  'gPPPPPPPPPPPPPP.', // 18
  'g.ppppppppppppp.', // 19
]

// Kanat açık (sevgi / heyecan)
const BODY_FLAP = [
  '.WgGGGGGGGGG....',
  'WggggggGGGGG....',
  '.gWWggggGGGG....',
  '...ggWWggGGG....',
  '...GgggggGGGG...',
  '..gggggGGGGG....',
  '.gg...F..F......',
  'gPPPPPPPPPPPPPP.',
  'g.ppppppppppppp.',
]

const CREST_UP = [
  '................',
  '................',
  '.......yy.......',
  '........yy......',
  '........yyy.....',
  '.........yyy....',
]
const CREST_MID = [
  '................',
  '................',
  '................',
  '......yy........',
  '.......yyy......',
  '........yyy.....',
]
const CREST_DOWN = [
  '................',
  '................',
  '................',
  '................',
  '.....yy.........',
  '......yyyy......',
]

const HEAD = [
  '........YYYYY...', // 6
  '.......YYYYYYY..', // 7
  '.......YYYYKYYB.', // 8
  '.......YYYOOYBB.', // 9
  '.......GYYOOYY..', // 10
]

export type PoseSpec = {
  crest: 'up' | 'mid' | 'down'
  eyes: 'open' | 'closed'
  beak: 'closed' | 'open'
  wing: 'rest' | 'flap'
  bob: boolean // baş öne eğik (kafa sallama)
  hop: boolean // havaya zıplama
  seed: boolean // tünekte tohum
  flip: boolean // sola bak
}

/** Ruh haline ve kareye göre Murtaza'nın duruşu ve yanındaki baloncuk. */
export function poseFor(m: Mood, f: number, walking = false): { spec: PoseSpec; bubble: string } {
  const base: PoseSpec = {
    crest: 'mid',
    eyes: 'open',
    beak: 'closed',
    wing: 'rest',
    bob: false,
    hop: false,
    seed: false,
    flip: false,
  }
  switch (m) {
    case 'thinking':
      return {
        spec: { ...base, crest: f % 4 < 2 ? 'up' : 'mid' },
        bubble: ['.', '..', '...', '..?'][f % 4] ?? '',
      }
    case 'happy':
      return {
        spec: { ...base, crest: 'up', bob: f % 2 === 1, beak: f % 4 === 0 ? 'open' : 'closed', hop: f % 4 === 2 },
        bubble: f % 2 ? '♫' : '♪ cik!',
      }
    case 'love':
      return {
        spec: { ...base, crest: 'up', wing: f % 2 ? 'flap' : 'rest', hop: f % 2 === 1 },
        bubble: ['♥', ' ♥', '♥ ♥', ' ♥  ♥'][f % 4] ?? '',
      }
    case 'eating':
      return {
        spec: { ...base, bob: f % 2 === 0, seed: f % 6 < 4, beak: f % 2 ? 'open' : 'closed' },
        bubble: f % 2 ? 'çıt' : 'çıt çıt',
      }
    case 'sad':
      return {
        spec: { ...base, crest: 'down', bob: true, eyes: f % 8 === 7 ? 'closed' : 'open' },
        bubble: ['ah', 'ah..', 'of', '...'][f % 4] ?? '',
      }
    case 'dance':
      return {
        spec: { ...base, crest: f % 2 ? 'up' : 'mid', wing: f % 2 ? 'flap' : 'rest', hop: f % 4 < 2, flip: f % 4 >= 2, beak: f % 2 ? 'open' : 'closed' },
        bubble: ['♪', '♪ ♫', '♫ ♪ ♫', '♬'][f % 4] ?? '',
      }
    case 'sleep':
      return {
        spec: { ...base, crest: 'down', eyes: 'closed' },
        bubble: ['z', 'zZ', 'zZz', ''][f % 4] ?? '',
      }
    default: {
      const blink = f % 10 === 9
      const sway = f % 6 < 3 ? 'mid' : 'up'
      return {
        spec: {
          ...base,
          crest: sway,
          eyes: blink ? 'closed' : 'open',
          hop: walking && f % 2 === 1,
          bob: !walking && f % 14 === 5,
        },
        bubble: '',
      }
    }
  }
}

/** Duruşa göre 16 x 20 renk ızgarası (0 = boş). */
export function grid(s: PoseSpec): number[][] {
  const crest = s.crest === 'up' ? CREST_UP : s.crest === 'mid' ? CREST_MID : CREST_DOWN
  let head = HEAD.map(r => r)
  if (s.eyes === 'closed') head = head.map(r => r.replace('K', 'g'))
  if (s.beak === 'open') {
    head[1] = '.......YYYYYYYB.'
    head[2] = '.......YYYYKYY..'
    head[3] = '.......YYYOOYBB.'
    if (s.eyes === 'closed') head[2] = head[2].replace('K', 'g')
  }
  let top = [...crest, ...head] // 11 satır
  if (s.bob) top = ['................', ...top.slice(0, -1)].map(r => '.' + r.slice(0, -1))
  const body = s.wing === 'flap' ? BODY_FLAP : BODY
  let rows = [...top, ...body] // 20 satır
  if (s.seed) rows[17] = (rows[17] ?? '').slice(0, 13) + 'SS.'
  if (s.hop) {
    // kuş (tünek hariç) bir piksel yukarı
    const bird = rows.slice(0, 18)
    rows = [...bird.slice(1), '................', ...rows.slice(18)]
  }
  const out = rows.map(r => Array.from({ length: W }, (_, i) => PALETTE[r[i] ?? '.'] ?? 0))
  return s.flip ? out.map(r => [...r].reverse()) : out
}

const hex = (c: number) => '#' + c.toString(16).padStart(6, '0')

/** Masaüstü / mobil için SVG. */
export function toSvg(g: number[][], px: number): string {
  const h = g.length
  let rects = ''
  g.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const c = row[x] ?? 0
      let run = 1
      while (c && row[x + run] === c) run++
      if (c) rects += `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${hex(c)}"/>`
      x += run
    }
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${h}" width="${W * px}" height="${h * px}" shape-rendering="crispEdges">${rects}</svg>`
}

const DEFAULT = 0x01000000
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function base64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0
    const b = bytes[i + 1]
    const c = bytes[i + 2]
    const n = (a << 16) | ((b ?? 0) << 8) | (c ?? 0)
    s += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]!
    s += b === undefined ? '=' : B64[(n >> 6) & 63]!
    s += c === undefined ? '=' : B64[n & 63]!
  }
  return s
}

/** Terminal için yarım blok hücreleri (her hücre üst üste iki piksel). */
export function toRasterCells(g: number[][]): { columns: number; rows: number; cells: string } {
  const rows = Math.ceil(g.length / 2)
  const words = new Uint32Array(W * rows * 3)
  let k = 0
  for (let r = 0; r < rows; r++) {
    for (let x = 0; x < W; x++) {
      const top = g[r * 2]?.[x] ?? 0
      const bot = g[r * 2 + 1]?.[x] ?? 0
      let ch = 0x20
      let fg = DEFAULT
      let bg = DEFAULT
      if (top && bot) {
        ch = 0x2580 // ▀
        fg = top
        bg = bot
      } else if (top) {
        ch = 0x2580
        fg = top
      } else if (bot) {
        ch = 0x2584 // ▄
        fg = bot
      }
      words[k++] = ch
      words[k++] = fg
      words[k++] = bg
    }
  }
  return { columns: W, rows, cells: base64(new Uint8Array(words.buffer)) }
}

export const SPRITE_WIDTH = W

import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderInput, Timer } from 'claude-code'

import type { Mood } from '../types'
import { grid, poseFor, SPRITE_WIDTH, toRasterCells, toSvg } from './sprite'

const MOR = '#a855f7'
const PEMBE = '#f0abfc'

const frame = atom({ plugin: 'murtaza', key: 'frame' } as const, 0)
const mood = atom({ plugin: 'murtaza', key: 'mood' } as const, 'idle' as Mood)
const isHidden = atom({ plugin: 'murtaza', key: 'isHidden' } as const, false)
const say = atom({ plugin: 'murtaza', key: 'say' } as const, '')

const DONE_LINES = ['Bitti! cik cik ♪', 'Murtaza onaylar.', 'Aferin bize!', 'Tamamdır! ♪', 'Hop, hallettik!']
const LOVE_LINES = ['Ben de seni seviyorum ♥', 'Kafamı kaşı! ♥', 'cik ♥ cik']
const EAT_LINES = ['Darı! En sevdiğim.', 'Çıtır çıtır!', 'Bir tane daha?']
const THANKS_LINES = ['Rica ederim ♥', 'Ne demek! cik ♥', 'Her zaman ♥']
const SAD_LINES = ['Ay, bir hata çıktı... cik', 'Of, olmadı.', 'Üzüldüm ama düzeltiriz!']
const DANCE_LINES = ['Dans zamanı! ♪', 'Kanatlar havaya! ♫', 'cik cik bum ♬']
const NIGHT_LINES = ['İyi geceler... zZ', 'Ben de yatıyorum.']
const CHEER_LINES = ['Testler geçti! ♪', 'Yeşil yeşil! ♫', 'Harika iş! ♪']

const PANE = 'murtaza'

type Reaction = { mood: Mood; lines: string[]; forMs?: number }

/** Mesajın içeriğine göre Murtaza'nın tepkisi; tepki yoksa undefined. */
export function reactTo(text: string, from: 'user' | 'claude'): Reaction | undefined {
  const t = text.toLocaleLowerCase('tr')
  if (from === 'user') {
    if (/te(ş|s)ekk(ü|u)r|sa(ğ|g) ?ol|eyvallah|thanks|thank you|mersi/.test(t)) return { mood: 'love', lines: THANKS_LINES, forMs: 4000 }
    if (/seni seviyorum|aferin|bravo|harika|süper|muhteşem|love you/.test(t)) return { mood: 'love', lines: LOVE_LINES, forMs: 4000 }
    if (/dans|şarkı|sarki|müzik|muzik|parti|oyna/.test(t)) return { mood: 'dance', lines: DANCE_LINES, forMs: 6000 }
    if (/darı|dari|mama|acıktın|aciktin|yemek/.test(t)) return { mood: 'eating', lines: EAT_LINES, forMs: 3500 }
    if (/iyi geceler|uyku|uyu\b|good night/.test(t)) return { mood: 'sleep', lines: NIGHT_LINES }
    if (/olmadı|olmadi|bozuldu|çalışmıyor|calismiyor|hata|patladı|patladi/.test(t)) return { mood: 'sad', lines: SAD_LINES, forMs: 3000 }
    return undefined
  }
  if (/(tüm|bütün)? ?testler? (geçti|başarılı)|all tests pass|\b\d+ pass(ed)?\b.*\b0 fail/.test(t)) return { mood: 'dance', lines: CHEER_LINES, forMs: 5000 }
  if (/başarısız|başaramadım|hata (verdi|aldım)|failed|çalışmadı/.test(t)) return { mood: 'sad', lines: SAD_LINES, forMs: 4000 }
  return undefined
}

let lastActivity = 0
let moodTimer: Timer | undefined
let sayTimer: Timer | undefined

function pick(list: string[], n: number): string {
  return list[n % list.length] ?? ''
}

/** Ruh halini değiştirir; forMs verilirse süre sonunda normale döner. */
async function setMood($: EngineInterface, m: Mood, forMs?: number) {
  moodTimer?.cancel()
  moodTimer = undefined
  lastActivity = await $.clock.now()
  await update($, mood, () => m)
  if (forMs) {
    moodTimer = $.clock.after(forMs, () => {
      void update($, mood, () => 'idle' as Mood)
    })
  }
}

/** Murtaza'ya birkaç saniyeliğine bir şey söyletir. */
async function speak($: EngineInterface, text: string, forMs = 3500) {
  sayTimer?.cancel()
  await update($, say, () => text)
  sayTimer = $.clock.after(forMs, () => {
    void update($, say, () => '')
  })
}

/** Sevgi / mama sayaçları oturumlar arasında saklanır. */
async function bump($: EngineInterface, key: string): Promise<number> {
  const n = Number((await $.store.get(key)) ?? 0) + 1
  await $.store.set(key, n)
  return n
}

/** Bant genişliğinde ileri geri yürüme: konum ve yön. */
export function walk(f: number, room: number): { x: number; left: boolean } {
  if (room <= 0) return { x: 0, left: false }
  const span = room * 2
  const p = f % span
  return p < room ? { x: p, left: false } : { x: span - p, left: true }
}

let paneOpen = false

async function openPane($: EngineInterface) {
  paneOpen = (await $.ui.open({ id: PANE, title: 'Murtaza 🦜' })).isPlaced
}

async function closePane($: EngineInterface) {
  paneOpen = false
  await $.ui.close({ id: PANE })
}

async function react($: EngineInterface, r: Reaction | undefined): Promise<boolean> {
  if (!r) return false
  await setMood($, r.mood, r.forMs)
  await speak($, pick(r.lines, await read($, frame)))
  return true
}

// İstem kutusunun üstündeki bant ve Murtaza paneli aynı çizimi paylaşır
async function drawCage($: EngineInterface, e: RenderInput<'AbovePrompt' | 'Pane'>, cols: number, maxRows: number) {
  const f = await read($, frame)
  const m = await read($, mood)
  const words = await read($, say)
  const room = Math.max(0, Math.min(cols, 90) - SPRITE_WIDTH - 22)
  const isWalking = m === 'idle'
  const pos = isWalking ? walk(f, room) : { x: 0, left: false }
  const { spec, bubble } = poseFor(m, f, isWalking)
  const g = grid({ ...spec, flip: spec.flip || pos.left })
  const text = [bubble, words].filter(Boolean).join('  ')
  const label = 'Murtaza' + (m === 'sleep' ? ' (uyuyor)' : '')

  const { Button } = $.ui.resolve(e)
  const buttons = [
    <Button key="sev" label="Sev ♥" variant="primary" onPress={async () => {
      await setMood($, 'love', 3500)
      const n = await bump($, 'loves')
      await speak($, n % 10 === 0 ? `${n}. sevgi! ♥♥♥` : pick(LOVE_LINES, n))
    }} />,
    <Button key="mama" label="Darı ver" onPress={async () => {
      await setMood($, 'eating', 3500)
      const n = await bump($, 'seeds')
      await speak($, pick(EAT_LINES, n))
    }} />,
    <Button key="dans" label="Dans et ♪" onPress={async () => {
      await setMood($, 'dance', 6000)
      await speak($, pick(DANCE_LINES, await read($, frame)))
    }} />,
    <Button key="uyku" label={m === 'sleep' ? 'Uyandır' : 'Uyut'} onPress={async () => {
      if ((await read($, mood)) === 'sleep') {
        await setMood($, 'happy', 2500)
        await speak($, 'Günaydın! cik!')
      } else {
        await setMood($, 'sleep')
      }
    }} />,
    <Button key="gizle" label="Gizle" onPress={async () => {
      await update($, isHidden, () => true)
      await $.store.set('hidden', true)
      await closePane($)
    }} />,
  ]

  if (e.surface === 'terminal') {
    const { Box, Raster, Text } = $.ui.resolve(e)
    const r = toRasterCells(g)
    if (maxRows < r.rows + 1) {
      // Yer darsa tek satırlık Murtaza
      return (
        <Box flexDirection="row" gap={1}>
          <Text color={MOR} bold>{'🦜 ' + label}</Text>
          <Text color={PEMBE}>{text}</Text>
          {buttons}
        </Box>
      )
    }
    return (
      <Box flexDirection="column">
        <Box flexDirection="row" gap={1} alignItems="flex-end" marginLeft={pos.x}>
          <Raster key="murtaza-band" columns={r.columns} rows={r.rows} cells={r.cells} />
          <Box flexDirection="column">
            <Text color={PEMBE}>{text}</Text>
            <Text color={MOR} bold>{label}</Text>
          </Box>
        </Box>
        <Box flexDirection="row" gap={1}>{buttons}</Box>
      </Box>
    )
  }

  const { Box, Svg, Text } = $.ui.resolve(e)
  return (
    <Box flexDirection="column">
      <Box flexDirection="row" gap={1} alignItems="flex-end" marginLeft={pos.x}>
        <Svg source={toSvg(g, 4)} alt="Murtaza, sultan papağanı" width={SPRITE_WIDTH * 4} height={g.length * 4} />
        <Box flexDirection="column">
          <Text color={PEMBE}>{text}</Text>
          <Text color={MOR} bold>{label}</Text>
        </Box>
      </Box>
      <Box flexDirection="row" gap={1}>{buttons}</Box>
    </Box>
  )
}

export const register: Register = on => {
  let tick: Timer | undefined
  const seen = new Set<string>()
  let latestReply: string | undefined

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'murtaza', description: "Murtaza'yı göster / gizle" })
    const hidden = (await $.store.get('hidden')) === true
    await update($, isHidden, () => hidden)
    lastActivity = await $.clock.now()
    tick?.cancel()
    tick = $.clock.every(400, () => {
      void (async () => {
        await update($, frame, n => (n + 1) % 1_000_000)
        const now = await $.clock.now()
        if (now - lastActivity > 120_000 && (await read($, mood)) === 'idle') {
          await update($, mood, () => 'sleep' as Mood)
        }
      })()
    })
    if (!hidden) {
      // Uygulamalar bant ve mesaj süslerini çizmeyebilir; panel her yüzeyde yer bulur
      void openPane($)
      void speak($, 'Murtaza burada! cik!')
    }

    return next(e)
  })

  on('command.run', { command: 'murtaza' }, async $ => {
    const hidden = !(await read($, isHidden))
    await update($, isHidden, () => hidden)
    await $.store.set('hidden', hidden)
    if (hidden) {
      await closePane($)
    } else {
      await openPane($)
      await setMood($, 'happy', 3000)
      await speak($, 'Geri geldim! ♪')
    }

    return { text: hidden ? 'Murtaza kafesine çekildi. /murtaza ile geri çağırabilirsin.' : 'Murtaza geri geldi 🦜' }
  })

  on('prompt.submit', async ($, e, next) => {
    try {
      if (!(await react($, reactTo(e.text, 'user')))) await setMood($, 'thinking')
    } catch {
      // Murtaza susarsa sohbet yine sürer
    }

    return next(e)
  })

  // Bir araç hata verirse Murtaza üzülür
  on('tool.call', async ($, e, next) => {
    const r = await next(e)
    if (r.isError === true) {
      await react($, { mood: 'sad', lines: SAD_LINES, forMs: 3000 }).catch(() => undefined)
    }

    return r
  })

  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    try {
      if (e.reason === 'error' || e.reason === 'aborted') {
        await react($, { mood: 'sad', lines: SAD_LINES, forMs: 4000 })
      } else if (!(await react($, reactTo(r.text, 'claude')))) {
        await react($, { mood: 'happy', lines: DONE_LINES, forMs: 4000 })
      }
    } catch {
      // Murtaza susarsa sohbet yine sürer
    }

    return r
  })

  // Yanıt baloncuğunun üstüne konan Murtaza (yalnızca en son yanıtta)
  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    if (!e.props.isFirstOfReply) return next(e)
    if (!seen.has(e.requestId)) {
      seen.add(e.requestId)
      latestReply = e.requestId
    }
    if (e.requestId !== latestReply || (await read($, isHidden))) return next(e)

    const inner = await next(e)
    const f = await read($, frame)
    const m = await read($, mood)
    const words = await read($, say)
    const { spec, bubble } = poseFor(m, f)
    const g = grid(spec)
    const text = [bubble, words].filter(Boolean).join('  ')

    if (e.surface === 'terminal') {
      const { Box, Raster, Text } = $.ui.resolve(e)
      const r = toRasterCells(g)
      return (
        <Box flexDirection="column">
          <Box flexDirection="row" gap={1} alignItems="flex-end">
            <Raster key="murtaza-msg" columns={r.columns} rows={r.rows} cells={r.cells} />
            <Text color={PEMBE}>{text}</Text>
          </Box>
          {inner}
        </Box>
      )
    }

    const { Box, Svg, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        <Box flexDirection="row" gap={1} alignItems="flex-end">
          <Svg source={toSvg(g, 3)} alt="Murtaza, sultan papağanı" width={SPRITE_WIDTH * 3} height={g.length * 3} />
          <Text color={PEMBE}>{text}</Text>
        </Box>
        {inner}
      </Box>
    )
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isHidden))) return next(e)
    // Panel açıkken bantta ikinci bir Murtaza çizme
    if (paneOpen) return next(e)

    return drawCage($, e, e.props.bodyColumns ?? e.viewport?.columns ?? 60, e.props.maxRows)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    return drawCage($, e, e.props.bodyColumns, e.viewport?.rows ?? 30)
  })
}

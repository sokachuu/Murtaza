import { expect, mock, test } from 'claude-code/testing'

import { reactTo, walk } from '../hooks/register'
import { grid, poseFor, toRasterCells, toSvg } from '../hooks/sprite'

const BAND = (maxRows: number) => ({
  component: 'AbovePrompt' as const,
  requestId: 'band',
  props: { hasSurvey: false, isWorking: false, maxRows, bodyColumns: 80, scroll: { first: 0, bodyRows: maxRows }, view: {} },
})

test('her ruh hali 16x20 bir çizim verir', () => {
  for (const m of ['idle', 'thinking', 'happy', 'love', 'eating', 'sleep', 'sad', 'dance'] as const) {
    for (let f = 0; f < 12; f++) {
      const g = grid(poseFor(m, f, f % 2 === 0).spec)
      expect(g.length).toBe(20)
      for (const row of g) expect(row.length).toBe(16)
      expect(toSvg(g, 4).startsWith('<svg')).toBe(true)
      expect(toRasterCells(g).rows).toBe(10)
    }
  }
})

test('yürürken sınır içinde kalır ve dönüşte sola bakar', () => {
  const steps = Array.from({ length: 60 }, (_, f) => walk(f, 20))
  expect(Math.max(...steps.map(s => s.x))).toBe(20)
  expect(Math.min(...steps.map(s => s.x))).toBe(0)
  expect(steps.some(s => s.left)).toBe(true)
})

test('bant her yüzeyde çizilir ve düğmeler çalışır', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ plugin: 'murtaza', surface, ...BAND(30) })
    expect(await ui.find({ type: 'Text', text: /Murtaza/ })).toBeDefined()
    await ui.press({ key: 'sev' })
    await ui.press({ key: 'mama' })
    expect(await ui.find({ type: 'Text', text: /Darı|Çıtır|Bir tane/ })).toBeDefined()
    await ui.unmount()
  }
})

test('dar terminalde tek satıra iner', async $ => {
  const ui = await $.ui.mount({ plugin: 'murtaza', surface: 'terminal', ...BAND(4) })
  expect(await ui.find({ type: 'Text', text: /🦜 Murtaza/ })).toBeDefined()
  await ui.unmount()
})

test('mesajın içeriğine göre tepki verir', () => {
  expect(reactTo('Çok teşekkürler!', 'user')?.mood).toBe('love')
  expect(reactTo('sağol murtaza', 'user')?.mood).toBe('love')
  expect(reactTo('Hadi dans et', 'user')?.mood).toBe('dance')
  expect(reactTo('Murtaza acıktın mı?', 'user')?.mood).toBe('eating')
  expect(reactTo('İyi geceler', 'user')?.mood).toBe('sleep')
  expect(reactTo('yine olmadı', 'user')?.mood).toBe('sad')
  expect(reactTo('bir dosya oku', 'user')).toBeUndefined()
  expect(reactTo('Tüm testler geçti.', 'claude')?.mood).toBe('dance')
  expect(reactTo('Derleme başarısız oldu.', 'claude')?.mood).toBe('sad')
  expect(reactTo('İşte kod.', 'claude')).toBeUndefined()
})

test('panel her yüzeyde çizilir ve dans düğmesi çalışır', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({
      plugin: 'murtaza',
      surface,
      component: 'Pane',
      requestId: 'murtaza',
      props: { title: 'Murtaza 🦜', isFocused: false, bodyColumns: 60, placement: 'inline', scroll: { first: 0, bodyRows: 30 }, view: {} },
    })
    expect(await ui.find({ type: 'Text', text: /Murtaza/ })).toBeDefined()
    await ui.press({ key: 'dans' })
    expect(await ui.find({ type: 'Text', text: /Dans|Kanatlar|bum/ })).toBeDefined()
    await ui.unmount()
  }
})

import { expect, test } from 'vitest'
import {
  getUpdatePayloadFileIds,
  mapVitePayloadForCrx,
  shouldForwardCrxPayload,
} from './fileWriter-hmr'

test('forwards path-scoped full reloads to content scripts', () => {
  const payload = mapVitePayloadForCrx({
    type: 'full-reload',
    path: '/src/header.ts',
  })

  expect(payload).toEqual({
    type: 'full-reload',
    path: '/src/header.ts',
  })
  expect(shouldForwardCrxPayload(payload)).toBe(true)
})

test('does not forward empty content script updates', () => {
  expect(
    shouldForwardCrxPayload({
      type: 'update',
      updates: [],
    }),
  ).toBe(false)
})

test('rewrites query-string modules from update payloads', () => {
  expect(
    getUpdatePayloadFileIds({
      type: 'update',
      updates: [
        {
          type: 'js-update',
          path: '/src/components/HelloWorld.vue?vue&type=style&lang.css',
          acceptedPath:
            '/src/components/HelloWorld.vue?vue&type=style&lang.css',
          timestamp: 1,
        },
      ],
    }),
  ).toEqual(['/src/components/HelloWorld.vue?vue&type=style&lang.css'])
})

test('forwards Vite wildcard full reloads to content scripts', () => {
  const payload = mapVitePayloadForCrx({
    type: 'full-reload',
    path: '*',
  })

  expect(payload).toMatchObject({
    type: 'full-reload',
  })
  expect(shouldForwardCrxPayload(payload)).toBe(true)
})

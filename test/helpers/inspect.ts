/* eslint-env jest */
/* global globalThis */

import { inspect } from '@xstate/inspect/lib/server'
import { Interpreter } from 'xstate'
import * as WebSocket from 'ws'
import { chromium } from 'playwright'

const xstateVizPort = parseInt(process.env.XSTATE_VIZ_PORT || '')
if (Number.isInteger(xstateVizPort)) {
  const server = new WebSocket.Server({
    port: 8888,
  })

  // @ts-expect-error Different @types/ws versions
  const inspector = inspect({ server })

  beforeAll(async () => {
    const browser = await chromium.launch({
      headless: false,
    })

    const page = await browser.newPage()

    await page.goto(
      `https://statecharts.io/inspect?server=localhost:${server.options.port}`,
    )
  })

  afterAll(inspector.disconnect)
}

declare global {
  // eslint-disable-next-line no-var
  var __xstate__: {
    register(): void
    onRegister(): void
    services: Set<Interpreter<any>>
  }
}

const {
  __xstate__: globalXstate = {
    register() {},
    onRegister() {},
    services: null,
  },
} = globalThis
const register = jest.spyOn(globalXstate, 'register')
const onRegister = jest.spyOn(globalXstate, 'onRegister')

export const devToolsSpy = {
  services: globalXstate.services,
  register,
  onRegister,
}

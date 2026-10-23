import type { ChromiumBrowserContext } from 'playwright-chromium'
import {
  launchFirefoxExtension,
  RdpEvaluation,
} from '@openpolyfill/firefox-addon-playwright-harness'

type TargetPacket = {
  type?: string
  target?: { url?: string; consoleActor?: string }
}

async function launchFirefoxContext(
  outDir: string,
): Promise<ChromiumBrowserContext> {
  const { context, extension, rdp, close } = await launchFirefoxExtension({
    extensionPath: outDir,
    headless: !process.env.DEBUG,
  })
  // The public handle uses RdpEvaluation at runtime; its declared variadic
  // signature differs from the evaluator's array-based argument contract.
  let background = extension.background as RdpEvaluation | undefined
  try {
    const backgroundUrl = await background?.evaluate<string>(
      () => location.href,
    )
    let ready = Promise.resolve()
    const onPacket = (packet: TargetPacket) => {
      const target = packet.target
      if (
        packet.type !== 'target-available-form' ||
        target?.url !== backgroundUrl ||
        !target?.consoleActor
      )
        return
      background?.dispose()
      const actor = rdp.actor(target.consoleActor)
      background = new RdpEvaluation(rdp, actor)
      ready = actor
        .call('startListeners', { listeners: ['evaluationResult'] })
        .then(() => undefined)
      // Surface setup errors on the next evaluation, not as unhandled rejections.
      ready.catch(() => undefined)
    }
    rdp.on('packet', onPacket)
    const worker = background && {
      evaluate: async (
        fn: Parameters<RdpEvaluation['evaluate']>[0],
        ...args: unknown[]
      ) => {
        await ready
        // Never replay an evaluation that may already have mutated the old target.
        return background!.evaluate(fn, args)
      },
      url: () => backgroundUrl,
    }
    return new Proxy(context, {
      get(target, prop) {
        if (prop === 'serviceWorkers') return () => (worker ? [worker] : [])
        if (prop === 'close')
          return async () => {
            rdp.off('packet', onPacket)
            background?.dispose()
            await close()
          }
        const value = Reflect.get(target, prop, target)
        return typeof value === 'function' ? value.bind(target) : value
      },
    }) as unknown as ChromiumBrowserContext
  } catch (error) {
    await close()
    throw error
  }
}

// Keep setup failures distinct from compatibility assertions in the CI report.
export async function launchFirefox(
  outDir: string,
): Promise<ChromiumBrowserContext> {
  try {
    return await launchFirefoxContext(outDir)
  } catch (error) {
    throw new Error(
      `Firefox setup failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
  }
}

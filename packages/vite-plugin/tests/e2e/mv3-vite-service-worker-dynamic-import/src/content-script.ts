import { voices } from './voices'
;(
  globalThis as typeof globalThis & { __contentScriptVoices?: string[] }
).__contentScriptVoices = voices

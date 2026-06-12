import { getBackgroundMarker } from './background'

export function getProgressMessage() {
  return `second ${getBackgroundMarker()}`
}

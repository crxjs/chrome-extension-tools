import { eventName } from './fastRefresh_helpers'

const event = new CustomEvent(eventName)
window.dispatchEvent(event)

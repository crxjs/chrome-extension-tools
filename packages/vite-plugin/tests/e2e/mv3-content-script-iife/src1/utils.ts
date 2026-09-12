export function createMarker(id: string, text: string): void {
  const div = document.createElement('div')
  div.id = id
  div.className = 'ok'
  div.textContent = text
  document.body.appendChild(div)
}

export function getMessage(): string {
  return 'shared-util'
}

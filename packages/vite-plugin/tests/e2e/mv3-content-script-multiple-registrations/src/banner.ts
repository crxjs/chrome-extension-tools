export function createBanner() {
  const banner = document.createElement('div')
  banner.id = 'multiple-registrations-banner'
  banner.textContent = 'content script ran'
  document.body.appendChild(banner)
}

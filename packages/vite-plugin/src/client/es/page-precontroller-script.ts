/**
 * This script only runs in development, and only if an extension page opens
 * before the service worker takes control of fetch (e.g., in the onInstalled event).
 *
 * Note: `oncontrollerchange` does not fire in this context, instead the page
 * continuously reloads until the service worker takes over.
 */
setTimeout(() => location.reload(), 100)
export {}

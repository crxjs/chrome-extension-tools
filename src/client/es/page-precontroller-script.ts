/**
 * This script only runs if a page opens before the service worker takes control
 * of fetch. We need to give the service worker time to start rerouting fetches.
 *
 * The 'oncontrollerchange' event doesn't fire, so using a quick reload instead.
 */
setTimeout(() => location.reload(), 100)
export {}

console.log('background.js')

chrome.notifications.create('test', { message: 'test' })
chrome.alarms.create('test', { delayInMinutes: 1 })

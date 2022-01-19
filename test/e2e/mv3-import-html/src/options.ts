import iframeSrc from './iframe.html'

const iframe = document.createElement('iframe')
iframe.src = iframeSrc
document.body.append(iframe)

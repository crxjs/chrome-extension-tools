/* eslint-disable @typescript-eslint/ban-ts-comment */
import { chrome } from 'jest-chrome'
import { defer } from './defer'

jest.mock('./placeholders')
// Use a virtual module for the dynamic import
jest.mock('import/path', () => {}, { virtual: true })
jest.useFakeTimers()

Object.assign(global, { chrome })

require('./importWrapper--implicit')

test('delays events before delay resolves', async () => {
  const deferred = defer()
  const listener = jest.fn(() => deferred.resolve())
  const alarm = {
    name: 'test alarm',
    scheduledTime: 123,
  }

  chrome.alarms.onAlarm.addListener(listener)

  const [listenerWrapper] = [...chrome.alarms.onAlarm.getListeners()]

  // Should return false if it does not receive 3rd arg
  const isAsyncMessage = listenerWrapper(alarm)
  expect(isAsyncMessage).toBe(false)

  expect(chrome.alarms.onAlarm.hasListener(listener)).toBe(true)
  expect(listener).not.toBeCalled()

  jest.advanceTimersToNextTimer()

  await deferred

  expect(listener).toBeCalled()
})

test('captures all events', () => {
  /* --------------- DEPRECATED EVENTS --------------- */

  // @ts-ignore
  expect(chrome.extension.onRequest.__isCapturedEvent).toBeUndefined()
  // @ts-ignore
  expect(chrome.extension.onRequestExternal.__isCapturedEvent).toBeUndefined()

  /* -------------- INCOMPATIBLE EVENTS -------------- */

  // @ts-ignore
  expect(chrome.webRequest.onAuthRequired.__isCapturedEvent).toBeUndefined()
  // @ts-ignore
  expect(chrome.webRequest.onBeforeRedirect.__isCapturedEvent).toBeUndefined()
  // @ts-ignore
  expect(chrome.webRequest.onBeforeRequest.__isCapturedEvent).toBeUndefined()
  // @ts-ignore
  expect(chrome.webRequest.onBeforeSendHeaders.__isCapturedEvent).toBeUndefined()
  // @ts-ignore
  expect(chrome.webRequest.onCompleted.__isCapturedEvent).toBeUndefined()
  // @ts-ignore
  expect(chrome.webRequest.onErrorOccurred.__isCapturedEvent).toBeUndefined()
  // @ts-ignore
  expect(chrome.webRequest.onHeadersReceived.__isCapturedEvent).toBeUndefined()
  // @ts-ignore
  expect(chrome.webRequest.onResponseStarted.__isCapturedEvent).toBeUndefined()
  // @ts-ignore
  expect(chrome.webRequest.onSendHeaders.__isCapturedEvent).toBeUndefined()

  /* ------------------ VALID EVENTS ----------------- */

  // @ts-ignore
  expect(chrome.alarms.onAlarm.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.bookmarks.onChanged.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.bookmarks.onChildrenReordered.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.bookmarks.onCreated.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.bookmarks.onImportBegan.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.bookmarks.onImportEnded.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.bookmarks.onMoved.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.bookmarks.onRemoved.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.browserAction.onClicked.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.commands.onCommand.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.contextMenus.onClicked.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.cookies.onChanged.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.debugger.onDetach.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.debugger.onEvent.__isCapturedEvent).toBe(true)
  // @ts-ignore
  // expect(chrome.declarativeContent.onPageChanged.__isCapturedEvent).toBe(true)
  // @ts-ignore
  // expect(chrome.declarativeWebRequest.onRequest.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.devtools.inspectedWindow.onResourceAdded.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.devtools.inspectedWindow.onResourceContentCommitted.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.devtools.network.onNavigated.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.devtools.network.onRequestFinished.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.downloads.onChanged.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.downloads.onCreated.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.downloads.onDeterminingFilename.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.downloads.onErased.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.fileBrowserHandler.onExecute.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.fileSystemProvider.onAbortRequested.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.fileSystemProvider.onAddWatcherRequested.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.fileSystemProvider.onCloseFileRequested.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.fileSystemProvider.onConfigureRequested.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.fileSystemProvider.onCopyEntryRequested.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.fileSystemProvider.onCreateDirectoryRequested.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.fileSystemProvider.onCreateFileRequested.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.fileSystemProvider.onDeleteEntryRequested.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.fileSystemProvider.onGetMetadataRequested.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.fileSystemProvider.onMountRequested.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.fileSystemProvider.onMoveEntryRequested.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.fileSystemProvider.onOpenFileRequested.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.fileSystemProvider.onReadDirectoryRequested.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.fileSystemProvider.onReadFileRequested.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.fileSystemProvider.onRemoveWatcherRequested.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.fileSystemProvider.onTruncateRequested.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.fileSystemProvider.onUnmountRequested.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.fileSystemProvider.onWriteFileRequested.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.fontSettings.onDefaultFixedFontSizeChanged.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.fontSettings.onDefaultFontSizeChanged.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.fontSettings.onFontChanged.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.fontSettings.onMinimumFontSizeChanged.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.gcm.onMessage.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.gcm.onMessagesDeleted.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.gcm.onSendError.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.history.onVisitRemoved.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.history.onVisited.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.identity.onSignInChanged.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.idle.onStateChanged.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.input.ime.onActivate.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.input.ime.onBlur.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.input.ime.onCandidateClicked.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.input.ime.onDeactivated.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.input.ime.onFocus.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.input.ime.onInputContextUpdate.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.input.ime.onKeyEvent.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.input.ime.onMenuItemActivated.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.input.ime.onReset.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.input.ime.onSurroundingTextChanged.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.management.onDisabled.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.management.onEnabled.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.management.onInstalled.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.management.onUninstalled.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.notifications.onButtonClicked.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.notifications.onClicked.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.notifications.onClosed.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.notifications.onPermissionLevelChanged.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.notifications.onShowSettings.__isCapturedEvent).toBe(true)
  // @ts-ignore
  // FIXME: is not implemented in jest-chrome!
  // expect(chrome.omnibox.onDeleteSuggestion.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.omnibox.onInputCancelled.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.omnibox.onInputChanged.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.omnibox.onInputEntered.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.omnibox.onInputStarted.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.pageAction.onClicked.__isCapturedEvent).toBe(true)
  // @ts-ignore
  // expect(chrome.permissions.onAdded.__isCapturedEvent).toBe(true)
  // @ts-ignore
  // expect(chrome.permissions.onRemoved.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.printerProvider.onGetCapabilityRequested.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.printerProvider.onGetPrintersRequested.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.printerProvider.onGetUsbPrinterInfoRequested.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.printerProvider.onPrintRequested.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.proxy.onProxyError.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.runtime.onBrowserUpdateAvailable.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.runtime.onConnect.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.runtime.onConnectExternal.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.runtime.onInstalled.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.runtime.onMessage.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.runtime.onMessageExternal.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.runtime.onRestartRequired.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.runtime.onStartup.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.runtime.onSuspend.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.runtime.onSuspendCanceled.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.runtime.onUpdateAvailable.__isCapturedEvent).toBe(true)
  // @ts-ignore
  // expect(chrome.scriptBadge.onClicked.__isCapturedEvent).toBe(true)
  // @ts-ignore
  // expect(chrome.serial.onReceive.__isCapturedEvent).toBe(true)
  // @ts-ignore
  // expect(chrome.serial.onReceiveError.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.sessions.onChanged.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.storage.onChanged.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.tabCapture.onStatusChanged.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.tabs.onActivated.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.tabs.onActiveChanged.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.tabs.onAttached.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.tabs.onCreated.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.tabs.onDetached.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.tabs.onHighlightChanged.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.tabs.onHighlighted.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.tabs.onMoved.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.tabs.onRemoved.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.tabs.onReplaced.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.tabs.onSelectionChanged.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.tabs.onUpdated.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.tabs.onZoomChange.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.ttsEngine.onPause.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.ttsEngine.onResume.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.ttsEngine.onSpeak.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.ttsEngine.onStop.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.vpnProvider.onConfigCreated.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.vpnProvider.onConfigRemoved.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.vpnProvider.onPacketReceived.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.vpnProvider.onPlatformMessage.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.vpnProvider.onUIEvent.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.webNavigation.onBeforeNavigate.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.webNavigation.onCommitted.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.webNavigation.onCompleted.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.webNavigation.onCreatedNavigationTarget.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.webNavigation.onDOMContentLoaded.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.webNavigation.onErrorOccurred.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.webNavigation.onHistoryStateUpdated.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.webNavigation.onReferenceFragmentUpdated.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.webNavigation.onTabReplaced.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.webstore.onDownloadProgress.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.webstore.onInstallStageChanged.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.windows.onCreated.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.windows.onFocusChanged.__isCapturedEvent).toBe(true)
  // @ts-ignore
  expect(chrome.windows.onRemoved.__isCapturedEvent).toBe(true)
})

import { k as multiFindClass, n as fromEventPattern, j as filter, e as debounceTime, S as Subject, w as withLatestFrom, d as map, o as merge, r as resetItems, p as toggleItem } from './state-b49b24c6.js';
import './commonjsHelpers-d7ac2f15.js';

const addItemId = 'add-item';
const removeItemId = 'remove-item';
// Add item context menu
const addItemMenuOptions = {
    id: addItemId,
    title: 'Add Multifind item...',
    contexts: ['selection', 'link', 'image'],
    selector: multiFindClass,
    invert: true,
};
// Remove text context menu
const removeItemMenuOptions = {
    id: removeItemId,
    title: 'Remove Multifind item...',
    contexts: ['page', 'link', 'image'],
    selector: multiFindClass,
};

/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */

function __rest(s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
}

/**
 * Use for basic Chrome Events
 *
 * @param {ChromeEvent} event Chrome Event
 *
 * @returns {Observable} RxJS Observable
 */
function fromChromeEvent(event, resultSelector) {
    if (resultSelector) {
        return fromEventPattern((handler) => {
            event.addListener(handler);
        }, (handler) => {
            event.removeListener(handler);
        }, resultSelector);
    }
    else {
        return fromEventPattern((handler) => {
            event.addListener(handler);
        }, (handler) => {
            event.removeListener(handler);
        });
    }
}

/**
 * Events for `chrome.contextMenus`
 *
 * https://developer.chrome.com/extensions/contextMenus#events
 */
const menus = {
    /**
     * Observable from `chrome.contextMenus.onClicked`
     *
     * Emits when an extension context menu is clicked.
     *
     * https://developer.chrome.com/extensions/contextMenus#event-onClicked
     */
    get clickStream() {
        return fromChromeEvent(chrome.contextMenus.onClicked);
    },
};
const contextMenus = menus;

// https://developer.chrome.com/extensions/tabs#events
const tabs = {
    // createStream, // cb :: tab -> void
    get createStream() {
        return fromChromeEvent(chrome.tabs.onCreated);
    },
    // updateStream, // cb :: (tabId, changeInfo, tab) -> void
    get updateStream() {
        return fromChromeEvent(chrome.tabs.onUpdated);
    },
    // moveStream, // cb :: (tabId, moveInfo) -> void
    get moveStream() {
        return fromChromeEvent(chrome.tabs.onMoved);
    },
    // activateStream, // cb :: activeInfo -> void
    get activateStream() {
        return fromChromeEvent(chrome.tabs.onActiveChanged);
    },
    // highlightStream, // cb :: highlightInfo -> void
    get highlightStream() {
        return fromChromeEvent(chrome.tabs.onHighlighted);
    },
    // detachStream, // cb :: (tabId, detachInfo) -> void
    get detachStream() {
        return fromChromeEvent(chrome.tabs.onDetached);
    },
    // attachStream, // cb :: (tabId, attachInfo) -> void
    get attachStream() {
        return fromChromeEvent(chrome.tabs.onAttached);
    },
    // removeStream, // cb :: (tabId, removeInfo) -> void
    get removeStream() {
        return fromChromeEvent(chrome.tabs.onRemoved);
    },
    // replaceStream, // cb :: (addedTabId, removedTabId) -> void
    get replaceStream() {
        return fromChromeEvent(chrome.tabs.onReplaced);
    },
    // zoomStream, // cb :: zoomChangeInfo -> void
    get zoomStream() {
        return fromChromeEvent(chrome.tabs.onZoomChange);
    },
};

// @bumble/menus in Base64
const domain = 'QGJ1bWJsZS9tZW51cw';

// Message types
const show = `show_menu`;
const hide = `hide_menu`;
const element = 'last_element';
const noOptionsIdError =
  'Context menu options.id must be defined.';
const contextMenuExistsError =
  'Cannot create duplicate context menu.';
const couldNotRemoveError =
  'Could not remove. Context menu id not found.';

const send = (message, target) => new Promise((resolve, reject) => {
    const coreMessage = {
        async: false,
        target: target || null,
        payload: message,
    };
    const callback = (response) => {
        if (chrome.runtime.lastError) {
            const lastError = chrome.runtime.lastError.message;
            const noResponse = 'The message port closed before a response was received';
            if (lastError && lastError.includes(noResponse)) {
                resolve();
            }
            else {
                reject({ message: lastError });
            }
        }
        else {
            if (response && !response.success) {
                reject(response.payload);
            }
            else {
                resolve();
            }
        }
    };
    if (typeof target === 'number') {
        chrome.tabs.sendMessage(target, coreMessage, callback);
    }
    else {
        chrome.runtime.sendMessage(coreMessage, callback);
    }
});
const asyncSend = (message, target) => new Promise((resolve, reject) => {
    const coreMessage = {
        async: true,
        target: target || null,
        payload: message,
    };
    const callback = (coreResponse) => {
        if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
        }
        else if (coreResponse.success === false) {
            reject(new Error(coreResponse.payload.greeting));
        }
        else {
            resolve(coreResponse.payload);
        }
    };
    if (typeof target === 'number') {
        chrome.tabs.sendMessage(target, coreMessage, callback);
    }
    else {
        chrome.runtime.sendMessage(coreMessage, callback);
    }
});

const _listeners = new Map();
const on = (listener, target) => {
    const _listener = (message, sender) => {
        if (message.async) {
            return false;
        }
        if (typeof message.target === 'number' || // is content script
            !message.target || // general message
            message.target === target // is correct target
        ) {
            try {
                listener(message.payload, sender);
            }
            catch (error) {
                // Log listener error
                console.error('Uncaught error in chrome.runtime.onMessage listener');
                console.error(error);
            }
        }
        return false;
    };
    chrome.runtime.onMessage.addListener(_listener);
    _listeners.set(listener, _listener);
};
const asyncOn = (listener, target) => {
    const _listener = ({ async, payload, target: _target }, sender, sendResponse) => {
        if (async &&
            (typeof _target === 'number' ||
                !_target ||
                _target === target)) {
            (async () => {
                try {
                    const respond = (response) => {
                        const coreResponse = {
                            success: true,
                            payload: response,
                        };
                        sendResponse(coreResponse);
                    };
                    await listener(payload, sender, respond);
                }
                catch (error) {
                    const response = {
                        success: false,
                        payload: {
                            greeting: error.message,
                        },
                    };
                    console.error(error);
                    sendResponse(response);
                }
            })();
            return true;
        }
        return false;
    };
    chrome.runtime.onMessage.addListener(_listener);
    _listeners.set(listener, _listener);
};
const off = (listener) => {
    const _listener = _listeners.get(listener);
    if (_listener) {
        _listeners.delete(listener);
        chrome.runtime.onMessage.removeListener(_listener);
    }
};
const messages = {
    asyncOn,
    asyncSend,
    off,
    on,
    send,
};

// Stream only messages with the domain
const messageStream = fromEventPattern(messages.on, messages.off).pipe(filter(([{ domain: d }]) => d === domain));
// Use in background page to receive
const showMenuStream = messageStream.pipe(filter(([{ type }]) => type === show));
// Use in background page to receive
const hideMenuStream = messageStream.pipe(filter(([{ type }]) => type === hide));
// Use in background page to receive
const lastElementStream = messageStream.pipe(filter(([{ type }]) => type === element), 
// Multiple identical messages are sent by different menus at the same time
debounceTime(25));
messageStream.subscribe(([message, sender]) => {
    console.log('messageStream', message);
});

/**
 * Map of basic context menu ids to selector context menu id arrays
 */
const optionsMap = new Map();

var code = "(function () {\n    'use strict';\n\n    /*! *****************************************************************************\r\n    Copyright (c) Microsoft Corporation. All rights reserved.\r\n    Licensed under the Apache License, Version 2.0 (the \"License\"); you may not use\r\n    this file except in compliance with the License. You may obtain a copy of the\r\n    License at http://www.apache.org/licenses/LICENSE-2.0\r\n\r\n    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY\r\n    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED\r\n    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,\r\n    MERCHANTABLITY OR NON-INFRINGEMENT.\r\n\r\n    See the Apache Version 2.0 License for specific language governing permissions\r\n    and limitations under the License.\r\n    ***************************************************************************** */\r\n    /* global Reflect, Promise */\r\n\r\n    var extendStatics = function(d, b) {\r\n        extendStatics = Object.setPrototypeOf ||\r\n            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||\r\n            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };\r\n        return extendStatics(d, b);\r\n    };\r\n\r\n    function __extends(d, b) {\r\n        extendStatics(d, b);\r\n        function __() { this.constructor = d; }\r\n        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());\r\n    }\n\n    /** PURE_IMPORTS_START  PURE_IMPORTS_END */\n    function isFunction(x) {\n        return typeof x === 'function';\n    }\n\n    /** PURE_IMPORTS_START  PURE_IMPORTS_END */\n    var _enable_super_gross_mode_that_will_cause_bad_things = false;\n    var config = {\n        Promise: undefined,\n        set useDeprecatedSynchronousErrorHandling(value) {\n            if (value) {\n                var error = /*@__PURE__*/ new Error();\n                /*@__PURE__*/ console.warn('DEPRECATED! RxJS was set to use deprecated synchronous error handling behavior by code at: \\n' + error.stack);\n            }\n            _enable_super_gross_mode_that_will_cause_bad_things = value;\n        },\n        get useDeprecatedSynchronousErrorHandling() {\n            return _enable_super_gross_mode_that_will_cause_bad_things;\n        },\n    };\n\n    /** PURE_IMPORTS_START  PURE_IMPORTS_END */\n    function hostReportError(err) {\n        setTimeout(function () { throw err; }, 0);\n    }\n\n    /** PURE_IMPORTS_START _config,_util_hostReportError PURE_IMPORTS_END */\n    var empty = {\n        closed: true,\n        next: function (value) { },\n        error: function (err) {\n            if (config.useDeprecatedSynchronousErrorHandling) {\n                throw err;\n            }\n            else {\n                hostReportError(err);\n            }\n        },\n        complete: function () { }\n    };\n\n    /** PURE_IMPORTS_START  PURE_IMPORTS_END */\n    var isArray = Array.isArray || (function (x) { return x && typeof x.length === 'number'; });\n\n    /** PURE_IMPORTS_START  PURE_IMPORTS_END */\n    function isObject(x) {\n        return x !== null && typeof x === 'object';\n    }\n\n    /** PURE_IMPORTS_START  PURE_IMPORTS_END */\n    function UnsubscriptionErrorImpl(errors) {\n        Error.call(this);\n        this.message = errors ?\n            errors.length + \" errors occurred during unsubscription:\\n\" + errors.map(function (err, i) { return i + 1 + \") \" + err.toString(); }).join('\\n  ') : '';\n        this.name = 'UnsubscriptionError';\n        this.errors = errors;\n        return this;\n    }\n    UnsubscriptionErrorImpl.prototype = /*@__PURE__*/ Object.create(Error.prototype);\n    var UnsubscriptionError = UnsubscriptionErrorImpl;\n\n    /** PURE_IMPORTS_START _util_isArray,_util_isObject,_util_isFunction,_util_UnsubscriptionError PURE_IMPORTS_END */\n    var Subscription = /*@__PURE__*/ (function () {\n        function Subscription(unsubscribe) {\n            this.closed = false;\n            this._parentOrParents = null;\n            this._subscriptions = null;\n            if (unsubscribe) {\n                this._unsubscribe = unsubscribe;\n            }\n        }\n        Subscription.prototype.unsubscribe = function () {\n            var errors;\n            if (this.closed) {\n                return;\n            }\n            var _a = this, _parentOrParents = _a._parentOrParents, _unsubscribe = _a._unsubscribe, _subscriptions = _a._subscriptions;\n            this.closed = true;\n            this._parentOrParents = null;\n            this._subscriptions = null;\n            if (_parentOrParents instanceof Subscription) {\n                _parentOrParents.remove(this);\n            }\n            else if (_parentOrParents !== null) {\n                for (var index = 0; index < _parentOrParents.length; ++index) {\n                    var parent_1 = _parentOrParents[index];\n                    parent_1.remove(this);\n                }\n            }\n            if (isFunction(_unsubscribe)) {\n                try {\n                    _unsubscribe.call(this);\n                }\n                catch (e) {\n                    errors = e instanceof UnsubscriptionError ? flattenUnsubscriptionErrors(e.errors) : [e];\n                }\n            }\n            if (isArray(_subscriptions)) {\n                var index = -1;\n                var len = _subscriptions.length;\n                while (++index < len) {\n                    var sub = _subscriptions[index];\n                    if (isObject(sub)) {\n                        try {\n                            sub.unsubscribe();\n                        }\n                        catch (e) {\n                            errors = errors || [];\n                            if (e instanceof UnsubscriptionError) {\n                                errors = errors.concat(flattenUnsubscriptionErrors(e.errors));\n                            }\n                            else {\n                                errors.push(e);\n                            }\n                        }\n                    }\n                }\n            }\n            if (errors) {\n                throw new UnsubscriptionError(errors);\n            }\n        };\n        Subscription.prototype.add = function (teardown) {\n            var subscription = teardown;\n            if (!teardown) {\n                return Subscription.EMPTY;\n            }\n            switch (typeof teardown) {\n                case 'function':\n                    subscription = new Subscription(teardown);\n                case 'object':\n                    if (subscription === this || subscription.closed || typeof subscription.unsubscribe !== 'function') {\n                        return subscription;\n                    }\n                    else if (this.closed) {\n                        subscription.unsubscribe();\n                        return subscription;\n                    }\n                    else if (!(subscription instanceof Subscription)) {\n                        var tmp = subscription;\n                        subscription = new Subscription();\n                        subscription._subscriptions = [tmp];\n                    }\n                    break;\n                default: {\n                    throw new Error('unrecognized teardown ' + teardown + ' added to Subscription.');\n                }\n            }\n            var _parentOrParents = subscription._parentOrParents;\n            if (_parentOrParents === null) {\n                subscription._parentOrParents = this;\n            }\n            else if (_parentOrParents instanceof Subscription) {\n                if (_parentOrParents === this) {\n                    return subscription;\n                }\n                subscription._parentOrParents = [_parentOrParents, this];\n            }\n            else if (_parentOrParents.indexOf(this) === -1) {\n                _parentOrParents.push(this);\n            }\n            else {\n                return subscription;\n            }\n            var subscriptions = this._subscriptions;\n            if (subscriptions === null) {\n                this._subscriptions = [subscription];\n            }\n            else {\n                subscriptions.push(subscription);\n            }\n            return subscription;\n        };\n        Subscription.prototype.remove = function (subscription) {\n            var subscriptions = this._subscriptions;\n            if (subscriptions) {\n                var subscriptionIndex = subscriptions.indexOf(subscription);\n                if (subscriptionIndex !== -1) {\n                    subscriptions.splice(subscriptionIndex, 1);\n                }\n            }\n        };\n        Subscription.EMPTY = (function (empty) {\n            empty.closed = true;\n            return empty;\n        }(new Subscription()));\n        return Subscription;\n    }());\n    function flattenUnsubscriptionErrors(errors) {\n        return errors.reduce(function (errs, err) { return errs.concat((err instanceof UnsubscriptionError) ? err.errors : err); }, []);\n    }\n\n    /** PURE_IMPORTS_START  PURE_IMPORTS_END */\n    var rxSubscriber = typeof Symbol === 'function'\n        ? /*@__PURE__*/ Symbol('rxSubscriber')\n        : '@@rxSubscriber_' + /*@__PURE__*/ Math.random();\n\n    /** PURE_IMPORTS_START tslib,_util_isFunction,_Observer,_Subscription,_internal_symbol_rxSubscriber,_config,_util_hostReportError PURE_IMPORTS_END */\n    var Subscriber = /*@__PURE__*/ (function (_super) {\n        __extends(Subscriber, _super);\n        function Subscriber(destinationOrNext, error, complete) {\n            var _this = _super.call(this) || this;\n            _this.syncErrorValue = null;\n            _this.syncErrorThrown = false;\n            _this.syncErrorThrowable = false;\n            _this.isStopped = false;\n            switch (arguments.length) {\n                case 0:\n                    _this.destination = empty;\n                    break;\n                case 1:\n                    if (!destinationOrNext) {\n                        _this.destination = empty;\n                        break;\n                    }\n                    if (typeof destinationOrNext === 'object') {\n                        if (destinationOrNext instanceof Subscriber) {\n                            _this.syncErrorThrowable = destinationOrNext.syncErrorThrowable;\n                            _this.destination = destinationOrNext;\n                            destinationOrNext.add(_this);\n                        }\n                        else {\n                            _this.syncErrorThrowable = true;\n                            _this.destination = new SafeSubscriber(_this, destinationOrNext);\n                        }\n                        break;\n                    }\n                default:\n                    _this.syncErrorThrowable = true;\n                    _this.destination = new SafeSubscriber(_this, destinationOrNext, error, complete);\n                    break;\n            }\n            return _this;\n        }\n        Subscriber.prototype[rxSubscriber] = function () { return this; };\n        Subscriber.create = function (next, error, complete) {\n            var subscriber = new Subscriber(next, error, complete);\n            subscriber.syncErrorThrowable = false;\n            return subscriber;\n        };\n        Subscriber.prototype.next = function (value) {\n            if (!this.isStopped) {\n                this._next(value);\n            }\n        };\n        Subscriber.prototype.error = function (err) {\n            if (!this.isStopped) {\n                this.isStopped = true;\n                this._error(err);\n            }\n        };\n        Subscriber.prototype.complete = function () {\n            if (!this.isStopped) {\n                this.isStopped = true;\n                this._complete();\n            }\n        };\n        Subscriber.prototype.unsubscribe = function () {\n            if (this.closed) {\n                return;\n            }\n            this.isStopped = true;\n            _super.prototype.unsubscribe.call(this);\n        };\n        Subscriber.prototype._next = function (value) {\n            this.destination.next(value);\n        };\n        Subscriber.prototype._error = function (err) {\n            this.destination.error(err);\n            this.unsubscribe();\n        };\n        Subscriber.prototype._complete = function () {\n            this.destination.complete();\n            this.unsubscribe();\n        };\n        Subscriber.prototype._unsubscribeAndRecycle = function () {\n            var _parentOrParents = this._parentOrParents;\n            this._parentOrParents = null;\n            this.unsubscribe();\n            this.closed = false;\n            this.isStopped = false;\n            this._parentOrParents = _parentOrParents;\n            return this;\n        };\n        return Subscriber;\n    }(Subscription));\n    var SafeSubscriber = /*@__PURE__*/ (function (_super) {\n        __extends(SafeSubscriber, _super);\n        function SafeSubscriber(_parentSubscriber, observerOrNext, error, complete) {\n            var _this = _super.call(this) || this;\n            _this._parentSubscriber = _parentSubscriber;\n            var next;\n            var context = _this;\n            if (isFunction(observerOrNext)) {\n                next = observerOrNext;\n            }\n            else if (observerOrNext) {\n                next = observerOrNext.next;\n                error = observerOrNext.error;\n                complete = observerOrNext.complete;\n                if (observerOrNext !== empty) {\n                    context = Object.create(observerOrNext);\n                    if (isFunction(context.unsubscribe)) {\n                        _this.add(context.unsubscribe.bind(context));\n                    }\n                    context.unsubscribe = _this.unsubscribe.bind(_this);\n                }\n            }\n            _this._context = context;\n            _this._next = next;\n            _this._error = error;\n            _this._complete = complete;\n            return _this;\n        }\n        SafeSubscriber.prototype.next = function (value) {\n            if (!this.isStopped && this._next) {\n                var _parentSubscriber = this._parentSubscriber;\n                if (!config.useDeprecatedSynchronousErrorHandling || !_parentSubscriber.syncErrorThrowable) {\n                    this.__tryOrUnsub(this._next, value);\n                }\n                else if (this.__tryOrSetError(_parentSubscriber, this._next, value)) {\n                    this.unsubscribe();\n                }\n            }\n        };\n        SafeSubscriber.prototype.error = function (err) {\n            if (!this.isStopped) {\n                var _parentSubscriber = this._parentSubscriber;\n                var useDeprecatedSynchronousErrorHandling = config.useDeprecatedSynchronousErrorHandling;\n                if (this._error) {\n                    if (!useDeprecatedSynchronousErrorHandling || !_parentSubscriber.syncErrorThrowable) {\n                        this.__tryOrUnsub(this._error, err);\n                        this.unsubscribe();\n                    }\n                    else {\n                        this.__tryOrSetError(_parentSubscriber, this._error, err);\n                        this.unsubscribe();\n                    }\n                }\n                else if (!_parentSubscriber.syncErrorThrowable) {\n                    this.unsubscribe();\n                    if (useDeprecatedSynchronousErrorHandling) {\n                        throw err;\n                    }\n                    hostReportError(err);\n                }\n                else {\n                    if (useDeprecatedSynchronousErrorHandling) {\n                        _parentSubscriber.syncErrorValue = err;\n                        _parentSubscriber.syncErrorThrown = true;\n                    }\n                    else {\n                        hostReportError(err);\n                    }\n                    this.unsubscribe();\n                }\n            }\n        };\n        SafeSubscriber.prototype.complete = function () {\n            var _this = this;\n            if (!this.isStopped) {\n                var _parentSubscriber = this._parentSubscriber;\n                if (this._complete) {\n                    var wrappedComplete = function () { return _this._complete.call(_this._context); };\n                    if (!config.useDeprecatedSynchronousErrorHandling || !_parentSubscriber.syncErrorThrowable) {\n                        this.__tryOrUnsub(wrappedComplete);\n                        this.unsubscribe();\n                    }\n                    else {\n                        this.__tryOrSetError(_parentSubscriber, wrappedComplete);\n                        this.unsubscribe();\n                    }\n                }\n                else {\n                    this.unsubscribe();\n                }\n            }\n        };\n        SafeSubscriber.prototype.__tryOrUnsub = function (fn, value) {\n            try {\n                fn.call(this._context, value);\n            }\n            catch (err) {\n                this.unsubscribe();\n                if (config.useDeprecatedSynchronousErrorHandling) {\n                    throw err;\n                }\n                else {\n                    hostReportError(err);\n                }\n            }\n        };\n        SafeSubscriber.prototype.__tryOrSetError = function (parent, fn, value) {\n            if (!config.useDeprecatedSynchronousErrorHandling) {\n                throw new Error('bad call');\n            }\n            try {\n                fn.call(this._context, value);\n            }\n            catch (err) {\n                if (config.useDeprecatedSynchronousErrorHandling) {\n                    parent.syncErrorValue = err;\n                    parent.syncErrorThrown = true;\n                    return true;\n                }\n                else {\n                    hostReportError(err);\n                    return true;\n                }\n            }\n            return false;\n        };\n        SafeSubscriber.prototype._unsubscribe = function () {\n            var _parentSubscriber = this._parentSubscriber;\n            this._context = null;\n            this._parentSubscriber = null;\n            _parentSubscriber.unsubscribe();\n        };\n        return SafeSubscriber;\n    }(Subscriber));\n\n    /** PURE_IMPORTS_START _Subscriber PURE_IMPORTS_END */\n    function canReportError(observer) {\n        while (observer) {\n            var _a = observer, closed_1 = _a.closed, destination = _a.destination, isStopped = _a.isStopped;\n            if (closed_1 || isStopped) {\n                return false;\n            }\n            else if (destination && destination instanceof Subscriber) {\n                observer = destination;\n            }\n            else {\n                observer = null;\n            }\n        }\n        return true;\n    }\n\n    /** PURE_IMPORTS_START _Subscriber,_symbol_rxSubscriber,_Observer PURE_IMPORTS_END */\n    function toSubscriber(nextOrObserver, error, complete) {\n        if (nextOrObserver) {\n            if (nextOrObserver instanceof Subscriber) {\n                return nextOrObserver;\n            }\n            if (nextOrObserver[rxSubscriber]) {\n                return nextOrObserver[rxSubscriber]();\n            }\n        }\n        if (!nextOrObserver && !error && !complete) {\n            return new Subscriber(empty);\n        }\n        return new Subscriber(nextOrObserver, error, complete);\n    }\n\n    /** PURE_IMPORTS_START  PURE_IMPORTS_END */\n    var observable = typeof Symbol === 'function' && Symbol.observable || '@@observable';\n\n    /** PURE_IMPORTS_START  PURE_IMPORTS_END */\n    function noop() { }\n\n    /** PURE_IMPORTS_START _noop PURE_IMPORTS_END */\n    function pipeFromArray(fns) {\n        if (!fns) {\n            return noop;\n        }\n        if (fns.length === 1) {\n            return fns[0];\n        }\n        return function piped(input) {\n            return fns.reduce(function (prev, fn) { return fn(prev); }, input);\n        };\n    }\n\n    /** PURE_IMPORTS_START _util_canReportError,_util_toSubscriber,_symbol_observable,_util_pipe,_config PURE_IMPORTS_END */\n    var Observable = /*@__PURE__*/ (function () {\n        function Observable(subscribe) {\n            this._isScalar = false;\n            if (subscribe) {\n                this._subscribe = subscribe;\n            }\n        }\n        Observable.prototype.lift = function (operator) {\n            var observable = new Observable();\n            observable.source = this;\n            observable.operator = operator;\n            return observable;\n        };\n        Observable.prototype.subscribe = function (observerOrNext, error, complete) {\n            var operator = this.operator;\n            var sink = toSubscriber(observerOrNext, error, complete);\n            if (operator) {\n                sink.add(operator.call(sink, this.source));\n            }\n            else {\n                sink.add(this.source || (config.useDeprecatedSynchronousErrorHandling && !sink.syncErrorThrowable) ?\n                    this._subscribe(sink) :\n                    this._trySubscribe(sink));\n            }\n            if (config.useDeprecatedSynchronousErrorHandling) {\n                if (sink.syncErrorThrowable) {\n                    sink.syncErrorThrowable = false;\n                    if (sink.syncErrorThrown) {\n                        throw sink.syncErrorValue;\n                    }\n                }\n            }\n            return sink;\n        };\n        Observable.prototype._trySubscribe = function (sink) {\n            try {\n                return this._subscribe(sink);\n            }\n            catch (err) {\n                if (config.useDeprecatedSynchronousErrorHandling) {\n                    sink.syncErrorThrown = true;\n                    sink.syncErrorValue = err;\n                }\n                if (canReportError(sink)) {\n                    sink.error(err);\n                }\n                else {\n                    console.warn(err);\n                }\n            }\n        };\n        Observable.prototype.forEach = function (next, promiseCtor) {\n            var _this = this;\n            promiseCtor = getPromiseCtor(promiseCtor);\n            return new promiseCtor(function (resolve, reject) {\n                var subscription;\n                subscription = _this.subscribe(function (value) {\n                    try {\n                        next(value);\n                    }\n                    catch (err) {\n                        reject(err);\n                        if (subscription) {\n                            subscription.unsubscribe();\n                        }\n                    }\n                }, reject, resolve);\n            });\n        };\n        Observable.prototype._subscribe = function (subscriber) {\n            var source = this.source;\n            return source && source.subscribe(subscriber);\n        };\n        Observable.prototype[observable] = function () {\n            return this;\n        };\n        Observable.prototype.pipe = function () {\n            var operations = [];\n            for (var _i = 0; _i < arguments.length; _i++) {\n                operations[_i] = arguments[_i];\n            }\n            if (operations.length === 0) {\n                return this;\n            }\n            return pipeFromArray(operations)(this);\n        };\n        Observable.prototype.toPromise = function (promiseCtor) {\n            var _this = this;\n            promiseCtor = getPromiseCtor(promiseCtor);\n            return new promiseCtor(function (resolve, reject) {\n                var value;\n                _this.subscribe(function (x) { return value = x; }, function (err) { return reject(err); }, function () { return resolve(value); });\n            });\n        };\n        Observable.create = function (subscribe) {\n            return new Observable(subscribe);\n        };\n        return Observable;\n    }());\n    function getPromiseCtor(promiseCtor) {\n        if (!promiseCtor) {\n            promiseCtor =  Promise;\n        }\n        if (!promiseCtor) {\n            throw new Error('no Promise impl found');\n        }\n        return promiseCtor;\n    }\n\n    /** PURE_IMPORTS_START  PURE_IMPORTS_END */\n    function ObjectUnsubscribedErrorImpl() {\n        Error.call(this);\n        this.message = 'object unsubscribed';\n        this.name = 'ObjectUnsubscribedError';\n        return this;\n    }\n    ObjectUnsubscribedErrorImpl.prototype = /*@__PURE__*/ Object.create(Error.prototype);\n    var ObjectUnsubscribedError = ObjectUnsubscribedErrorImpl;\n\n    /** PURE_IMPORTS_START tslib,_Subscription PURE_IMPORTS_END */\n    var SubjectSubscription = /*@__PURE__*/ (function (_super) {\n        __extends(SubjectSubscription, _super);\n        function SubjectSubscription(subject, subscriber) {\n            var _this = _super.call(this) || this;\n            _this.subject = subject;\n            _this.subscriber = subscriber;\n            _this.closed = false;\n            return _this;\n        }\n        SubjectSubscription.prototype.unsubscribe = function () {\n            if (this.closed) {\n                return;\n            }\n            this.closed = true;\n            var subject = this.subject;\n            var observers = subject.observers;\n            this.subject = null;\n            if (!observers || observers.length === 0 || subject.isStopped || subject.closed) {\n                return;\n            }\n            var subscriberIndex = observers.indexOf(this.subscriber);\n            if (subscriberIndex !== -1) {\n                observers.splice(subscriberIndex, 1);\n            }\n        };\n        return SubjectSubscription;\n    }(Subscription));\n\n    /** PURE_IMPORTS_START tslib,_Observable,_Subscriber,_Subscription,_util_ObjectUnsubscribedError,_SubjectSubscription,_internal_symbol_rxSubscriber PURE_IMPORTS_END */\n    var SubjectSubscriber = /*@__PURE__*/ (function (_super) {\n        __extends(SubjectSubscriber, _super);\n        function SubjectSubscriber(destination) {\n            var _this = _super.call(this, destination) || this;\n            _this.destination = destination;\n            return _this;\n        }\n        return SubjectSubscriber;\n    }(Subscriber));\n    var Subject = /*@__PURE__*/ (function (_super) {\n        __extends(Subject, _super);\n        function Subject() {\n            var _this = _super.call(this) || this;\n            _this.observers = [];\n            _this.closed = false;\n            _this.isStopped = false;\n            _this.hasError = false;\n            _this.thrownError = null;\n            return _this;\n        }\n        Subject.prototype[rxSubscriber] = function () {\n            return new SubjectSubscriber(this);\n        };\n        Subject.prototype.lift = function (operator) {\n            var subject = new AnonymousSubject(this, this);\n            subject.operator = operator;\n            return subject;\n        };\n        Subject.prototype.next = function (value) {\n            if (this.closed) {\n                throw new ObjectUnsubscribedError();\n            }\n            if (!this.isStopped) {\n                var observers = this.observers;\n                var len = observers.length;\n                var copy = observers.slice();\n                for (var i = 0; i < len; i++) {\n                    copy[i].next(value);\n                }\n            }\n        };\n        Subject.prototype.error = function (err) {\n            if (this.closed) {\n                throw new ObjectUnsubscribedError();\n            }\n            this.hasError = true;\n            this.thrownError = err;\n            this.isStopped = true;\n            var observers = this.observers;\n            var len = observers.length;\n            var copy = observers.slice();\n            for (var i = 0; i < len; i++) {\n                copy[i].error(err);\n            }\n            this.observers.length = 0;\n        };\n        Subject.prototype.complete = function () {\n            if (this.closed) {\n                throw new ObjectUnsubscribedError();\n            }\n            this.isStopped = true;\n            var observers = this.observers;\n            var len = observers.length;\n            var copy = observers.slice();\n            for (var i = 0; i < len; i++) {\n                copy[i].complete();\n            }\n            this.observers.length = 0;\n        };\n        Subject.prototype.unsubscribe = function () {\n            this.isStopped = true;\n            this.closed = true;\n            this.observers = null;\n        };\n        Subject.prototype._trySubscribe = function (subscriber) {\n            if (this.closed) {\n                throw new ObjectUnsubscribedError();\n            }\n            else {\n                return _super.prototype._trySubscribe.call(this, subscriber);\n            }\n        };\n        Subject.prototype._subscribe = function (subscriber) {\n            if (this.closed) {\n                throw new ObjectUnsubscribedError();\n            }\n            else if (this.hasError) {\n                subscriber.error(this.thrownError);\n                return Subscription.EMPTY;\n            }\n            else if (this.isStopped) {\n                subscriber.complete();\n                return Subscription.EMPTY;\n            }\n            else {\n                this.observers.push(subscriber);\n                return new SubjectSubscription(this, subscriber);\n            }\n        };\n        Subject.prototype.asObservable = function () {\n            var observable = new Observable();\n            observable.source = this;\n            return observable;\n        };\n        Subject.create = function (destination, source) {\n            return new AnonymousSubject(destination, source);\n        };\n        return Subject;\n    }(Observable));\n    var AnonymousSubject = /*@__PURE__*/ (function (_super) {\n        __extends(AnonymousSubject, _super);\n        function AnonymousSubject(destination, source) {\n            var _this = _super.call(this) || this;\n            _this.destination = destination;\n            _this.source = source;\n            return _this;\n        }\n        AnonymousSubject.prototype.next = function (value) {\n            var destination = this.destination;\n            if (destination && destination.next) {\n                destination.next(value);\n            }\n        };\n        AnonymousSubject.prototype.error = function (err) {\n            var destination = this.destination;\n            if (destination && destination.error) {\n                this.destination.error(err);\n            }\n        };\n        AnonymousSubject.prototype.complete = function () {\n            var destination = this.destination;\n            if (destination && destination.complete) {\n                this.destination.complete();\n            }\n        };\n        AnonymousSubject.prototype._subscribe = function (subscriber) {\n            var source = this.source;\n            if (source) {\n                return this.source.subscribe(subscriber);\n            }\n            else {\n                return Subscription.EMPTY;\n            }\n        };\n        return AnonymousSubject;\n    }(Subject));\n\n    /** PURE_IMPORTS_START tslib,_Subscriber PURE_IMPORTS_END */\n    function refCount() {\n        return function refCountOperatorFunction(source) {\n            return source.lift(new RefCountOperator(source));\n        };\n    }\n    var RefCountOperator = /*@__PURE__*/ (function () {\n        function RefCountOperator(connectable) {\n            this.connectable = connectable;\n        }\n        RefCountOperator.prototype.call = function (subscriber, source) {\n            var connectable = this.connectable;\n            connectable._refCount++;\n            var refCounter = new RefCountSubscriber(subscriber, connectable);\n            var subscription = source.subscribe(refCounter);\n            if (!refCounter.closed) {\n                refCounter.connection = connectable.connect();\n            }\n            return subscription;\n        };\n        return RefCountOperator;\n    }());\n    var RefCountSubscriber = /*@__PURE__*/ (function (_super) {\n        __extends(RefCountSubscriber, _super);\n        function RefCountSubscriber(destination, connectable) {\n            var _this = _super.call(this, destination) || this;\n            _this.connectable = connectable;\n            return _this;\n        }\n        RefCountSubscriber.prototype._unsubscribe = function () {\n            var connectable = this.connectable;\n            if (!connectable) {\n                this.connection = null;\n                return;\n            }\n            this.connectable = null;\n            var refCount = connectable._refCount;\n            if (refCount <= 0) {\n                this.connection = null;\n                return;\n            }\n            connectable._refCount = refCount - 1;\n            if (refCount > 1) {\n                this.connection = null;\n                return;\n            }\n            var connection = this.connection;\n            var sharedConnection = connectable._connection;\n            this.connection = null;\n            if (sharedConnection && (!connection || sharedConnection === connection)) {\n                sharedConnection.unsubscribe();\n            }\n        };\n        return RefCountSubscriber;\n    }(Subscriber));\n\n    /** PURE_IMPORTS_START tslib,_Subject,_Observable,_Subscriber,_Subscription,_operators_refCount PURE_IMPORTS_END */\n    var ConnectableObservable = /*@__PURE__*/ (function (_super) {\n        __extends(ConnectableObservable, _super);\n        function ConnectableObservable(source, subjectFactory) {\n            var _this = _super.call(this) || this;\n            _this.source = source;\n            _this.subjectFactory = subjectFactory;\n            _this._refCount = 0;\n            _this._isComplete = false;\n            return _this;\n        }\n        ConnectableObservable.prototype._subscribe = function (subscriber) {\n            return this.getSubject().subscribe(subscriber);\n        };\n        ConnectableObservable.prototype.getSubject = function () {\n            var subject = this._subject;\n            if (!subject || subject.isStopped) {\n                this._subject = this.subjectFactory();\n            }\n            return this._subject;\n        };\n        ConnectableObservable.prototype.connect = function () {\n            var connection = this._connection;\n            if (!connection) {\n                this._isComplete = false;\n                connection = this._connection = new Subscription();\n                connection.add(this.source\n                    .subscribe(new ConnectableSubscriber(this.getSubject(), this)));\n                if (connection.closed) {\n                    this._connection = null;\n                    connection = Subscription.EMPTY;\n                }\n            }\n            return connection;\n        };\n        ConnectableObservable.prototype.refCount = function () {\n            return refCount()(this);\n        };\n        return ConnectableObservable;\n    }(Observable));\n    var connectableProto = ConnectableObservable.prototype;\n    var connectableObservableDescriptor = {\n        operator: { value: null },\n        _refCount: { value: 0, writable: true },\n        _subject: { value: null, writable: true },\n        _connection: { value: null, writable: true },\n        _subscribe: { value: connectableProto._subscribe },\n        _isComplete: { value: connectableProto._isComplete, writable: true },\n        getSubject: { value: connectableProto.getSubject },\n        connect: { value: connectableProto.connect },\n        refCount: { value: connectableProto.refCount }\n    };\n    var ConnectableSubscriber = /*@__PURE__*/ (function (_super) {\n        __extends(ConnectableSubscriber, _super);\n        function ConnectableSubscriber(destination, connectable) {\n            var _this = _super.call(this, destination) || this;\n            _this.connectable = connectable;\n            return _this;\n        }\n        ConnectableSubscriber.prototype._error = function (err) {\n            this._unsubscribe();\n            _super.prototype._error.call(this, err);\n        };\n        ConnectableSubscriber.prototype._complete = function () {\n            this.connectable._isComplete = true;\n            this._unsubscribe();\n            _super.prototype._complete.call(this);\n        };\n        ConnectableSubscriber.prototype._unsubscribe = function () {\n            var connectable = this.connectable;\n            if (connectable) {\n                this.connectable = null;\n                var connection = connectable._connection;\n                connectable._refCount = 0;\n                connectable._subject = null;\n                connectable._connection = null;\n                if (connection) {\n                    connection.unsubscribe();\n                }\n            }\n        };\n        return ConnectableSubscriber;\n    }(SubjectSubscriber));\n\n    // TODO: make this a proper observable\n    const _selectorRemovedStream = new Subject();\n    const selectorRemovedStream = _selectorRemovedStream.asObservable();\n\n    /**\n     * Streams all current and future Elements that match the selector.\n     *\n     * @param {Element} element A DOM Element, for example `document.body`\n     * @param {string} selector A CSS selector\n     * @returns {Observable<Element>} Elements that match the selector\n     */\n    const querySelectorStream = (element, selector) =>\n      new Observable((subscriber) => {\n        // Initialize results with current nodes\n        element\n          .querySelectorAll(selector)\n          .forEach((el) => subscriber.next(el));\n\n        // Create observer instance\n        const observer = new MutationObserver(function(mutations) {\n          mutations.forEach(function(mutation) {\n            if (mutation.type === 'childList') {\n              Array.from(mutation.addedNodes)\n                // Node is Element\n                .filter(\n                  (node) => node.nodeType === Node.ELEMENT_NODE,\n                )\n                // Element matches CSS selector\n                .filter((el) => el.matches(selector))\n                // Emit from Observable\n                .forEach((el) => {\n                  // console.log('match added', el)\n                  return subscriber.next(el)\n                });\n            } else if (mutation.type === 'attributes') {\n              const { target, oldValue } = mutation;\n              const className = selector.slice(1);\n              const matched =\n                oldValue && oldValue.includes(className);\n              const matches = target.matches(selector);\n\n              if (matches && !matched) {\n                console.log('class added', mutation);\n                subscriber.next(target);\n              } else if (matched && !matches) {\n                console.log('class removed', mutation);\n                _selectorRemovedStream.next(target);\n              }\n            }\n          });\n        });\n\n        // Set up observer\n        observer.observe(element, {\n          childList: true,\n          subtree: true,\n          attributes: true,\n          attributeFilter: ['class'],\n          attributeOldValue: true,\n        });\n\n        // Return teardown function\n        return () => observer.disconnect()\n      });\n\n    const send = (message, target) => new Promise((resolve, reject) => {\n        const coreMessage = {\n            async: false,\n            target: target || null,\n            payload: message,\n        };\n        const callback = (response) => {\n            if (chrome.runtime.lastError) {\n                const lastError = chrome.runtime.lastError.message;\n                const noResponse = 'The message port closed before a response was received';\n                if (lastError && lastError.includes(noResponse)) {\n                    resolve();\n                }\n                else {\n                    reject({ message: lastError });\n                }\n            }\n            else {\n                if (response && !response.success) {\n                    reject(response.payload);\n                }\n                else {\n                    resolve();\n                }\n            }\n        };\n        if (typeof target === 'number') {\n            chrome.tabs.sendMessage(target, coreMessage, callback);\n        }\n        else {\n            chrome.runtime.sendMessage(coreMessage, callback);\n        }\n    });\n    const asyncSend = (message, target) => new Promise((resolve, reject) => {\n        const coreMessage = {\n            async: true,\n            target: target || null,\n            payload: message,\n        };\n        const callback = (coreResponse) => {\n            if (chrome.runtime.lastError) {\n                reject(chrome.runtime.lastError);\n            }\n            else if (coreResponse.success === false) {\n                reject(new Error(coreResponse.payload.greeting));\n            }\n            else {\n                resolve(coreResponse.payload);\n            }\n        };\n        if (typeof target === 'number') {\n            chrome.tabs.sendMessage(target, coreMessage, callback);\n        }\n        else {\n            chrome.runtime.sendMessage(coreMessage, callback);\n        }\n    });\n\n    const _listeners = new Map();\n    const on = (listener, target) => {\n        const _listener = (message, sender) => {\n            if (message.async) {\n                return false;\n            }\n            if (typeof message.target === 'number' || // is content script\n                !message.target || // general message\n                message.target === target // is correct target\n            ) {\n                try {\n                    listener(message.payload, sender);\n                }\n                catch (error) {\n                    // Log listener error\n                    console.error('Uncaught error in chrome.runtime.onMessage listener');\n                    console.error(error);\n                }\n            }\n            return false;\n        };\n        chrome.runtime.onMessage.addListener(_listener);\n        _listeners.set(listener, _listener);\n    };\n    const asyncOn = (listener, target) => {\n        const _listener = ({ async, payload, target: _target }, sender, sendResponse) => {\n            if (async &&\n                (typeof _target === 'number' ||\n                    !_target ||\n                    _target === target)) {\n                (async () => {\n                    try {\n                        const respond = (response) => {\n                            const coreResponse = {\n                                success: true,\n                                payload: response,\n                            };\n                            sendResponse(coreResponse);\n                        };\n                        await listener(payload, sender, respond);\n                    }\n                    catch (error) {\n                        const response = {\n                            success: false,\n                            payload: {\n                                greeting: error.message,\n                            },\n                        };\n                        console.error(error);\n                        sendResponse(response);\n                    }\n                })();\n                return true;\n            }\n            return false;\n        };\n        chrome.runtime.onMessage.addListener(_listener);\n        _listeners.set(listener, _listener);\n    };\n    const off = (listener) => {\n        const _listener = _listeners.get(listener);\n        if (_listener) {\n            _listeners.delete(listener);\n            chrome.runtime.onMessage.removeListener(_listener);\n        }\n    };\n    const messages = {\n        asyncOn,\n        asyncSend,\n        off,\n        on,\n        send,\n    };\n\n    // @bumble/menus in Base64\n    const domain = 'QGJ1bWJsZS9tZW51cw';\n\n    // Message types\n    const show = `show_menu`;\n    const hide = `hide_menu`;\n    const element = 'last_element';\n\n    // Selector placeholder\n    const selector = '%SELECTOR%';\n    const id = '%OPTIONS_ID%';\n    const invert = '%INVERT_SELECTOR%'.length > 0;\n\n    // Use in content script to send command\n    const showMenu = () => {\n      console.log('showMenu');\n\n      return messages.send({ type: show, domain, id })\n    };\n\n    // Use in content script to send command\n    const hideMenu = () => {\n      console.log('hideMenu');\n\n      return messages.send({ type: hide, domain, id })\n    };\n\n    const lastElement = ({ innerText }) => {\n      console.log('lastElement', innerText);\n\n      messages.send({\n        type: element,\n        domain,\n        id,\n        // Update contextMenuClickStream here\n        element: {\n          innerText,\n        },\n      });\n    };\n\n    const handleMouseOut = invert ? showMenu : hideMenu;\n    const handleMouseOver = invert ? hideMenu : showMenu;\n    function handleContextMenu({ target }) {\n      lastElement(target);\n    }\n\n    // Get items that match, new items, and items changed to match\n    querySelectorStream(document.body, selector).subscribe((el) => {\n      // console.log('querySelectorStream', selector, el)\n\n      el.addEventListener('mouseout', handleMouseOut);\n      el.addEventListener('mouseover', handleMouseOver);\n    });\n\n    selectorRemovedStream.subscribe((el) => {\n      // console.log('selectorRemovedStream', selector, el)\n\n      el.removeEventListener('mouseout', handleMouseOut);\n      el.removeEventListener('mouseover', handleMouseOver);\n    });\n\n    console.log('script.code.js', selector);\n    document.body.addEventListener('contextmenu', handleContextMenu);\n\n}());\n";

/**
 * The old Chrome API with Promises
 * @param options ContextMenuOptions
 * @param key contextMenuMap key
 */
const _createContextMenu = (options) => new Promise((resolve, reject) => {
    chrome.contextMenus.create(options, () => {
        const { message = '' } = chrome.runtime.lastError || {};
        if (message && !message.includes('duplicate id')) {
            reject(new Error(message));
        }
        else {
            resolve();
        }
    });
});
/**
 * The old Chrome API with Promises
 * @param options ContextMenuOptions
 * @param key contextMenuMap key
 */
const _updateContextMenu = (id, options) => new Promise((resolve, reject) => {
    chrome.contextMenus.update(id, options, () => {
        if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
        }
        else {
            resolve();
        }
    });
});
/**
 * Use key to manage contextMenuMap<key, ContextMenuOptions[]>
 * @param id contextMenuMap key
 */
const _removeContextMenu = (id) => new Promise((resolve, reject) => {
    chrome.contextMenus.remove(id, () => {
        if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
        }
        else {
            resolve();
        }
    });
});
const _executeScriptInTab = (tabId, options) => new Promise((resolve, reject) => {
    chrome.tabs.executeScript(tabId, options, (result) => {
        if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
        }
        else {
            resolve(result);
        }
    });
});

/**
 * Observable of created context menu ids
 */
const createContextMenuStream = new Subject();
async function createContextMenu(_a) {
    /* ------------- VALIDATE OPTIONS ------------- */
    var { selector, invert = false } = _a, options = __rest(_a, ["selector", "invert"]);
    if (!options.id) {
        throw new TypeError(noOptionsIdError);
    }
    if (optionsMap.has(options.id)) {
        throw new Error(contextMenuExistsError);
    }
    let subscription;
    if (selector) {
        subscription = await createDynamicMenu(options, selector, invert);
    }
    else {
        await _createContextMenu(options);
        subscription = null;
    }
    /* ------------ UPDATE OPTIONS MAP ------------ */
    // TODO: adapt map to take unsubscribe
    optionsMap.set(options.id, [options, subscription]);
    /* ----------- PUSH TO CREATE STREAM ---------- */
    createContextMenuStream.next(options.id);
}
async function createDynamicMenu(options, selector, invert) {
    /* ---------- SHOW OR HIDE MENU ITEM ---------- */
    showMenuStream.subscribe(([{ id }]) => {
        if (id === options.id) {
            _createContextMenu(options).catch((error) => {
                console.error(error);
            });
        }
    });
    hideMenuStream.subscribe(([{ id }]) => {
        if (id === options.id) {
            _removeContextMenu(options.id).catch((error) => {
                console.error(error);
            });
        }
    });
    /* - INJECT CONTENT SCRIPT AS EACH PAGE LOADS - */
    // TODO: debounce/gather updates into groups and compose a single injection
    // TODO: teardown when menu is destroyed?
    //  - return unsubscribe from createDynamicMenu
    //  - add to optionsMap as [options, unsubscribe]
    const unsubscribe = tabs.updateStream.subscribe(([tabId, changes, tab]) => {
        if (changes.status === 'loading') {
            _executeScriptInTab(tabId, {
                code: code
                    .replace('%SELECTOR%', selector)
                    .replace('%OPTIONS_ID%', options.id)
                    .replace('%INVERT_SELECTOR%', invert ? 'invert' : ''),
            }).catch(({ message }) => {
                console.error(message);
                // if (message !== cannotAccessError) {
                //   console.error(message)
                // } else {
                //   // nobody cares
                // }
            });
        }
    });
    if (invert) {
        // TODO: use private create
        await createContextMenu(options).catch((error) => {
            console.error(error);
        });
    }
    return unsubscribe;
}

/**
 * Observable of updated ContextMenuOptions
 */
const updateContextMenuStream = new Subject();
async function updateContextMenu(options) {
    /* ------------- VALIDATE OPTIONS ------------- */
    const { id, selector } = options, _options = __rest(options, ["id", "selector"]);
    if (selector) {
        throw new TypeError('Cannot update context menu selector.');
    }
    if (!id) {
        throw new TypeError(noOptionsIdError);
    }
    /* -------------- GET OLD OPTIONS ------------- */
    const [oldOptions, subscription] = optionsMap.get(id) || [
        {},
        null,
    ];
    const newOptions = Object.assign({}, oldOptions, options);
    /* ------------ UPDATE CONTEXT MENU ----------- */
    await _updateContextMenu(id, _options);
    /* ------------ UPDATE OPTIONS MAP ------------ */
    optionsMap.set(id, [newOptions, subscription]);
    /* ----------- PUSH TO UPDATE STREAM ---------- */
    updateContextMenuStream.next(newOptions);
}

const removeContextMenuStream = new Subject();
const removeContextMenu = async (id) => {
    /* ---------------- VALIDATE ID --------------- */
    const [options, subscription] = optionsMap.get(id) || [
        null,
        null,
    ];
    if (!options) {
        throw new Error(couldNotRemoveError);
    }
    /* ----------- TEARDOWN DYNAMIC MENU ---------- */
    if (subscription) {
        subscription.unsubscribe();
    }
    /* ------------ REMOVE CONTEXT MENU ----------- */
    await _removeContextMenu(id).catch(() => {
        // supress cannot remove error
    });
    /* ------------ UPDATE OPTIONS MAP ------------ */
    optionsMap.delete(id);
    /* ----------- PUSH TO REMOVE STREAM ---------- */
    removeContextMenuStream.next(id);
};

const contextMenuClickStream = contextMenus.clickStream.pipe(withLatestFrom(lastElementStream), map(([[clickData, tab], [message]]) => [
    Object.assign({}, clickData, { element: message.element }),
    tab,
]));
contextMenus.clickStream.subscribe((args) => {
    console.log('contextMenus.clickStream', args);
});
lastElementStream.subscribe((args) => {
    console.log('lastElementStream', args);
});

const menus$1 = {
    create: createContextMenu,
    update: updateContextMenu,
    remove: removeContextMenu,
    // removeAll: removeAllContextMenus,
    createStream: createContextMenuStream.asObservable(),
    updateStream: updateContextMenuStream.asObservable(),
    removeStream: removeContextMenuStream.asObservable(),
    // removeAllStream: removeAllContextMenusStream.asObservable(),
    clickStream: contextMenuClickStream,
};

function isTrueString(data) {
    return typeof data === 'string' && data.length > 0;
}
/* -------------------------------------------- */
/*             CREATE CONTEXT MENUS             */
/* -------------------------------------------- */
menus$1.create(addItemMenuOptions).catch((error) => {
    console.error(error);
});
menus$1.create(removeItemMenuOptions).catch((error) => {
    console.error(error);
});
/* -------------------------------------------- */
/*                 CLICK STREAMS                */
/* -------------------------------------------- */
const addItemStream = menus$1.clickStream.pipe(filter(([{ menuItemId }]) => menuItemId === addItemId));
const removeItemStream = menus$1.clickStream.pipe(filter(([{ menuItemId }]) => menuItemId === removeItemId));
// Highlight images that match the src
const imageStream = merge(addItemStream, removeItemStream).pipe(map(([{ srcUrl }]) => srcUrl), filter(isTrueString));
// Highlight links that match the href
// TODO: do not emit both link/image combos as link
const linkStream = merge(addItemStream, removeItemStream).pipe(filter(([{ srcUrl }]) => !srcUrl), map(([{ linkUrl }]) => linkUrl), filter(isTrueString));
// Mark text that matches the selection
const textStream = merge(addItemStream, removeItemStream).pipe(filter(([{ linkUrl }]) => !linkUrl), map(([{ selectionText, element }]) => selectionText || (element && element.innerText)), filter(isTrueString));
// menus.clickStream.subscribe(([clickData]) => {
//   console.log('menus.clickStream', clickData)
// })
// addItemStream.subscribe((args) => {
//   console.log('addItemStream', args)
// })
// removeItemStream.subscribe((args) => {
//   console.log('removeItemStream', args)
// })
// imageStream.subscribe((args) => {
//   console.log('imageStream', args)
// })
// linkStream.subscribe((args) => {
//   console.log('linkStream', args)
// })
// textStream.subscribe((args) => {
//   console.log('textStream', args)
// })

/* -------------------------------------------- */
/*             RESET ON ACTION CLICK            */
/* -------------------------------------------- */
chrome.browserAction.onClicked.addListener(resetItems);
chrome.runtime.onInstalled.addListener(resetItems);
/* -------------------------------------------- */
/*                 DATA STREAMS                 */
/* -------------------------------------------- */
// TODO: addItem and removeItem streams are combined,
//   so toggles may behave unexpectedly
textStream.subscribe(toggleItem('text'));
linkStream.subscribe(toggleItem('link'));
imageStream.subscribe(toggleItem('image'));

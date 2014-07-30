'use strict';

var filter = {
    urls: ['*://*.baidu.com:*/*']
};

var KEY_URL = 'http://fedev.baidu.com/~tieba/bingo-log-key.php';

var cache = {};

function _getKeyFromCache() {
    var value = cache.key;
    if (value === '') {
        return false;
    } else {
        var time = cache.time;
        if ((new Date(Number(time))).toDateString() === (new Date()).toDateString()) {
            return value;
        } else {
            return false;
        }
    }
    return false;
}

function _updateKeyCacheFromServer(callback) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function handleStateChange(xhrpe) {
        if (xhrpe.srcElement.readyState !== 4) {
            return;
        }
        var response = xhrpe.srcElement.response;
        cache.key = response;
        cache.time = Date.now();
        console.log('key updated: ' + cache.key);
        if (typeof callback === 'function') {
            callback(response);
        }
    };
    xhr.open('GET', KEY_URL, true);
    xhr.send();
}

var Cache = {
    getKey: function() {
        var key = _getKeyFromCache();
        if (key) {
            return key;
        } else {
            _updateKeyCacheFromServer();
            return '';
        }
    },
    get: function(key, defaultValue) {
        var value = localStorage.getItem(key);
        if (value === null) {
            return defaultValue;
        }
        return value;
    },
    set: function(key, value) {
        localStorage.setItem(key, value);
    }
};
_updateKeyCacheFromServer();


function beforeSendHeadersHandler(details) {
    //console.log('req: ', details);
    var key = Cache.getKey();
    details.requestHeaders.push({
        'name': 'X-Bingo-Export-Log',
        'value': key
    });
    return {
        requestHeaders: details.requestHeaders
    };
}
//暂存区
var staging = {};

function headersReceivedHandler(details) {
    //console.log('res: ', details);
    var tabId = details.tabId;
    var sendMessageToContent = function(message) {
        chrome.tabs.sendMessage(tabId, message, function(response) {
            //console.log(response);
            if (response === undefined) {
                //response不存在，则content script还未初始化，缓存之。
                if (staging[tabId]) {
                    staging[tabId].push(message);
                } else {
                    staging[tabId] = [message];
                }
            }
        });
    };
    for (var i = 0, length = details.responseHeaders.length; i < length; i++) {
        if (details.responseHeaders[i].name === 'X-Bingo-Log') {
            console.log(details.responseHeaders[i].value);
            sendMessageToContent(details.responseHeaders[i].value);
            break;
        }
    }
}

function messageHandler(request, sender) {
    var tabId = sender.tab.id;
    console.log('tab ' + tabId + ' ready. sending staged messages');
    if (staging[tabId]) {
        for (var i = 0, length = staging[tabId].length; i < length; i++) {
            chrome.tabs.sendMessage(tabId, staging[tabId][i]);
        }
        delete staging[tabId];
    }
}

function switchMode(isDisabled) {
    if (isDisabled) {
        chrome.webRequest.onBeforeSendHeaders.removeListener(beforeSendHeadersHandler);
        chrome.webRequest.onHeadersReceived.removeListener(headersReceivedHandler);
        chrome.extension.onMessage.removeListener(messageHandler);
    } else {
        chrome.webRequest.onBeforeSendHeaders.addListener(beforeSendHeadersHandler, filter, ['blocking', 'requestHeaders']);
        chrome.webRequest.onHeadersReceived.addListener(headersReceivedHandler, filter, ['responseHeaders']);
        chrome.extension.onMessage.addListener(messageHandler);
    }
    chrome.browserAction.setIcon({
        'path': isDisabled ? {
            '19': 'images/icon-disabled-19.png',
            '38': 'images/icon-disabled-38.png'
        } : {
            '19': 'images/icon-19.png',
            '38': 'images/icon-38.png'
        }
    });
}


function initListeners() {
    var isDisabled = (Cache.get('disabled', 'false') === 'false' ? false : true);

    chrome.browserAction.onClicked.addListener(function() {
        isDisabled = !isDisabled;
        switchMode(isDisabled);
        Cache.set('disabled', isDisabled);
    });

    switchMode(isDisabled);
}

initListeners();

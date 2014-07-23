'use strict';

var filter = {
    urls: ['*://*.baidu.com:*/*']
};

var KEY_URL = 'http://fedev.baidu.com/~tieba/bingo-log-key.php';

function _getKeyFromCache() {
    var value = localStorage.getItem('key');
    if (value === '') {
        return false;
    } else {
        var time = localStorage.getItem('time');
        if ((new Date(Number(time))).toDateString() === (new Date()).toDateString()) {
            return value;
        } else {
            return false;
        }
    }
    return false;
}

function _cacheKeyFromServer(callback) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function handleStateChange(xhrpe) {
        if (xhrpe.srcElement.readyState !== 4) {
            return;
        }
        var response = xhrpe.srcElement.response;
        localStorage.setItem('key', response);
        localStorage.setItem('time', Date.now());
        if (typeof callback === 'function') {
            callback(response);
        }
    };
    xhr.open('GET', KEY_URL, true);
    xhr.send();
}

var Cache = {
    getKey: function(callback) {
        var key = _getKeyFromCache();
        if (key) {
            callback(key);
        } else {
            _cacheKeyFromServer(callback);
        }
    }
};

function initListeners(key) {
    chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {
        //console.log('req: ', details);
        details.requestHeaders.push({
            'name': 'X-Bingo-Export-Log',
            'value': key
        });
        return {
            requestHeaders: details.requestHeaders
        };
    }, filter, ['blocking', 'requestHeaders']);

    //暂存区
    var staging = {};

    chrome.webRequest.onHeadersReceived.addListener(function(details) {
        //console.log('res: ', details);
        var tabId = details.tabId;
        var sendMessageToContent = function(message) {
            chrome.tabs.sendMessage(tabId, message, function(response) {
                console.log(response);
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
        for (var i = 0; i < details.responseHeaders.length; ++i) {
            if (details.responseHeaders[i].name === 'X-Bingo-Log') {
                console.log(details.responseHeaders[i].value);
                sendMessageToContent(details.responseHeaders[i].value);
                break;
            }
        }
    }, filter, ['responseHeaders']);

    chrome.extension.onMessage.addListener(function(request, sender) {
        var tabId = sender.tab.id;
        console.log('tab ' + tabId + ' ready. sending staged messages');
        if (staging[tabId]) {
            for (var i = 0, length = staging[tabId].length; i < length; i++) {
                chrome.tabs.sendMessage(tabId, staging[tabId][i]);
            }
            delete staging[tabId];
        }
    });
}

Cache.getKey(initListeners);

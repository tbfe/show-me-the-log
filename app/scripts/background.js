'use strict';

var filter = {
    urls: ['*://*.baidu.com:*/*']
};

chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {
    //console.log('req: ', details);
    details.requestHeaders.push({
        'name': 'X-Bingo-Dump-Log',
        'value': '1'
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
        if (details.responseHeaders[i].name === 'Content-Type') {
            console.log(details.responseHeaders[i]);
            sendMessageToContent(details.responseHeaders[i]);
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

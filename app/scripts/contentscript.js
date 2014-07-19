'use strict';

chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
    console.log(request);
    if (sendResponse) {
        sendResponse(true);
    }
});

console.log('Show Me the LOG initialized.');

chrome.extension.sendMessage('ready');

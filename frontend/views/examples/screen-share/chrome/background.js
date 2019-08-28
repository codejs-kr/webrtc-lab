/*!
 *
 * WebRTC Lab
 * @author dodortus (codejs.co.kr / dodortus@gmail.com)
 *
 */

/* background page, responsible for actually choosing media */
chrome.runtime.onConnect.addListener(function(channel) {
  channel.onMessage.addListener(function(message) {
    switch (message.type) {
      case 'getScreen':
        var pending = chrome.desktopCapture.chooseDesktopMedia(
          message.options || ['screen', 'window'],
          channel.sender.tab,
          function(streamid) {
            // communicate this string to the app so it can call getUserMedia with it
            message.type = 'gotScreen';
            message.sourceId = streamid;
            channel.postMessage(message);
          }
        );
        // let the app know that it can cancel the timeout
        message.type = 'getScreenPending';
        message.request = pending;
        channel.postMessage(message);
        break;
      case 'cancelGetScreen':
        chrome.desktopCapture.cancelChooseDesktopMedia(message.request);
        message.type = 'canceledGetScreen';
        channel.postMessage(message);
        break;
    }
  });
});

/*!
 *
 * Copyright (c) 2012 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 *
 * To make sure we can uniquely identify each screenshot tab, add an id as a
 * query param to the url that displays the screenshot.
 * Note: It's OK that this is a global variable (and not in localStorage),
 * because the event page will stay open as long as any screenshot tabs are open.
 *
 */
chrome.runtime.onMessageExternal.addListener(function(request, sender, sendResponse) {
  chrome.tabs.captureVisibleTab(null, {}, function(dataUrl) {
    //console.log('dataUrl', dataUrl);
    sendResponse(dataUrl);
  });

  /*
   * REF - http://stackoverflow.com/questions/18257021/bug-with-chrome-tabs-capturevisibletab
   * captureVisibleTab 콜백으로 sendResponse를 호출하기 위해서는 return true; 필수
   */
  return true;
});

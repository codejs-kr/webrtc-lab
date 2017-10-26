/*!
 *
 * RemoteMeeting - webrtc screen.js
 *
 * IMPORTANT NOTE: This file is licensed only for use in providing the RSUPPORT services,
 *
 * @license Copyright (c) RSUPPORT CO., LTD. (http://www.rsupport.com/)
 * @author Front-End Team | Park Jeong Shik (jspark@rsupport.com)
 * @fileOverview 스크린쉐어 컨트롤러
 *
 */

// parent main.js
function ScreenShare(parent) {
  console.log('Loaded ScreenShare', arguments);

  var that = this;
  var localScreenStream = null;
  var idCount = 1;
  var successCallback = null;
  var isScreenEnded = false;

  /**
  * getUserMedia
  */
  function getUserMedia(sourceId, callback) {
    console.log('ScreenShare getUserMedia', arguments);

    navigator.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: sourceId,
          maxWidth: screen.width, // screen.width,
          maxHeight: screen.height, // screen.height,
          maxFrameRate: 3,
        },
        optional: [
          {googLeakyBucket: true},
          {googTemporalLayeredScreencast: true}
        ]
      }
    }, function(stream) {
      callback(stream);
      localScreenStream = stream;

      // 브라우저밖 하단의 공유중지 박스로 종료하는경우 처리
      localScreenStream.getVideoTracks()[0].onended = function() {
        // 정상 종료시 이중으로 emit되는걸 막기 위한 처리.
        if (!isScreenEnded) {
          //parent.emit('endScreenShare');
        }
      };
    }, function(error) {
      console.error('Error getUserMedia', error);
    });
  }

  /**
  * start
  */
  function start(callback) {
    successCallback = callback;

    // isChrome
    window.postMessage({ type: 'getScreen', id: idCount }, '*');
    idCount++;
    isScreenEnded = false;
  }

  /**
  * end
  */
  function end(callback) {
    isScreenEnded = true;
    localScreenStream.getTracks().forEach(function(track) {
      track.stop();
    });
    callback && callback();
  }

  window.addEventListener('message', function(event) {
    console.log('window.message', event);
    if (event.origin != window.location.origin) {
      return;
    }

    var data = event.data;
    var type = data.type;

    if (type == 'gotScreen') {
      if (data.sourceId) {
        getUserMedia(data.sourceId, successCallback);
      } else {
        console.log('cancled');
        //parent.emit('endScreenShare');
      }
    } else if (type == 'getScreenPending') {
      //
    }
  });

  /*
  * interfaces
  */
  this.start = start;
  this.end = end;
}

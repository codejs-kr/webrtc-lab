/**
 * ScreenHandler
 * @param parent
 * @constructor
 */
function ScreenHandler(parent) {
  console.log('Loaded ScreenHandler', arguments);

  var that = this;
  var idCount = 1;
  var maxFrame = 5;
  var localScreenStream = null;
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
          maxWidth: screen.width,
          maxHeight: screen.height,
          maxFrameRate: maxFrame,
        },
        optional: [
          {googLeakyBucket: true},
          {googTemporalLayeredScreencast: true}
        ]
      }
    }, function(stream) {
      localScreenStream = stream;
      callback(localScreenStream);

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

  /**
   * extension message listener
   */
  window.addEventListener('message', function(event) {
    console.log('window.message', event);
    if (event.origin !== window.location.origin) {
      return;
    }

    var data = event.data;
    var type = data.type;

    if (type === 'gotScreen') {
      if (data.sourceId) {
        getUserMedia(data.sourceId, successCallback);
      } else {
        console.log('canceled');
        //parent.emit('endScreenShare');
      }
    } else if (type === 'getScreenPending') {
      //
    }
  });

  /**
   * extends
   */
  this.start = start;
  this.end = end;
}

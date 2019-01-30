/**
 * ScreenHandler
 * @param parent
 * @constructor
 */
function ScreenHandler(parent) {
  console.log('Loaded ScreenHandler', arguments);

  const that = this;
  const maxFrame = 5;
  let idCount = 1;
  let localScreenStream = null;
  let successCallback = null;
  let isScreenEnded = false;

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

  function startScreenCapture() {
    if (navigator.getDisplayMedia) {
      return navigator.getDisplayMedia({video: true});
    } else if (navigator.mediaDevices.getDisplayMedia) {
      return navigator.mediaDevices.getDisplayMedia({video: true});
    } else {
      return navigator.mediaDevices.getUserMedia({video: {mediaSource: 'screen'}});
    }
  }

  /**
   * 크롬 72버전까지 실험실 기능 활성화 해야 동작함.
   * @param callback
   */
  function getDisplayMedia(callback) {
    startScreenCapture().then(stream => {
      console.log('getDisplayMedia', stream);
      localScreenStream = stream;
      callback(localScreenStream);
    }, error => {
      console.error('Error getDisplayMedia', error);
    });
  }

  /**
  * start
  */
  function start(callback) {
    getDisplayMedia(callback);

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

    let data = event.data;
    let type = data.type;

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

/**
 * ScreenHandler
 * @constructor
 */
function ScreenHandler() {
  console.log('Loaded ScreenHandler', arguments);

  // REF https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints#Properties_of_shared_screen_tracks
  const constraints = {
    video: {
      width: 1980, // 최대 너비
      height: 1080, // 최대 높이
      frameRate: 10, // 최대 프레임
    },
  };
  let localStream = null;

  /**
   * 스크린캡쳐 API를 브라우저 호환성 맞게 리턴합니다.
   * navigator.mediaDevices.getDisplayMedia 호출 (크롬 72 이상 지원)
   * navigator.getDisplayMedia 호출 (크롬 70 ~ 71 실험실기능 활성화 or Edge)
   *
   * @returns {*}
   */
  function getCrossBrowserScreenCapture() {
    if (navigator.getDisplayMedia) {
      return navigator.getDisplayMedia(constraints);
    } else if (navigator.mediaDevices.getDisplayMedia) {
      return navigator.mediaDevices.getDisplayMedia(constraints);
    }
  }

  /**
   * 스크린캡쳐 API를 호출합니다.
   * @param callback
   */
  function start(callback) {
    getCrossBrowserScreenCapture().then(
      (stream) => {
        console.log('Success getDisplayMedia', stream);
        localStream = stream;
        callback(localStream);
      },
      (error) => {
        console.error('Error getDisplayMedia', error);
      }
    );
  }

  /**
   * 스트림의 트렉을 stop() 시켜 더이상 스트림이 전송되는것을 중지합니다.
   * @param callback
   */
  function end(callback) {
    localStream.getTracks().forEach((track) => {
      track.stop();
    });

    callback && callback();
  }

  /**
   * extends
   */
  this.start = start;
  this.end = end;
}

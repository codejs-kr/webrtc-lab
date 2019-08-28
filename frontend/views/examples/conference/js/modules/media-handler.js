/**
 * MediaHandler
 * @constructor
 */
function MediaHandler() {
  console.log('Loaded MediaHandler', arguments);

  let localStream;

  /**
   * 비디오 엘리먼트에 재생을 위해 stream 바인딩 한다
   * @param data
   */
  function setVideoStream(data) {
    const type = data.type;
    const targetEl = data.el;
    const stream = data.stream;

    targetEl.srcObject = stream;

    if (type === 'local') {
      localStream = stream;
    }
  }

  /**
   * 비디오 정지
   * @param callback
   */
  function pauseVideo(callback) {
    console.log('pauseVideo', arguments);
    localStream.getVideoTracks()[0].enabled = false;
    callback && callback();
  }

  /**
   * 비디오 정지 해제
   * @param callback
   */
  function resumeVideo(callback) {
    console.log('resumeVideo', arguments);
    localStream.getVideoTracks()[0].enabled = true;
    callback && callback();
  }

  /**
   * 오디오 정지
   * @param callback
   */
  function muteAudio(callback) {
    console.log('muteAudio', arguments);
    localStream.getAudioTracks()[0].enabled = false;
    callback && callback();
  }

  /**
   * 오디오 정지 해제
   * @param callback
   */
  function unmuteAudio(callback) {
    console.log('unmuteAudio', arguments);
    localStream.getAudioTracks()[0].enabled = true;
    callback && callback();
  }

  /**
   * IOS 11이상 비디오 컨트롤 인터페이스가 있어야 실행이 된다.
   * 속성을 추가했다 제거하는 트릭으로 자동 재생되도록 한다.
   * @param videoEl
   */
  function playForIOS(videoEl) {
    videoEl.setAttribute('playsinline', true);
    videoEl.setAttribute('controls', true);
    setTimeout(function() {
      videoEl.removeAttribute('controls');
    }, 1);
  }

  /**
   * extends
   */
  this.setVideoStream = setVideoStream;
  this.pauseVideo = pauseVideo;
  this.resumeVideo = resumeVideo;
  this.muteAudio = muteAudio;
  this.unmuteAudio = unmuteAudio;
  this.playForIOS = playForIOS;
}

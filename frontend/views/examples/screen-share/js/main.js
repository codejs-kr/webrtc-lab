/*!
 *
 * WebRTC Lab
 * @author dodortus (dodortus@gmail.com / codejs.co.kr)
 *
 */
$(function() {
  console.log('Loaded Main');

  const screenHandler = new ScreenHandler();

  /**
   * 비디오 엘리먼트에 재생을 위해 stream 바인딩
   * @param data
   */
  function setVideoStream(data) {
    const video = data.el;
    video.srcObject = data.stream;
  }

  /**
   * 로컬 스트림 핸들링
   * @param stream
   */
  function onLocalStream(stream) {
    console.log('onLocalStream', stream);

    setVideoStream({
      el: document.querySelector('#local-video'),
      stream: stream,
    });
  }

  /**
   * screenHandler를 통해 캡쳐 API를 호출합니다.
   */
  function startScreenShare() {
    screenHandler.start((stream) => {
      onLocalStream(stream);
    });
  }

  /**
   * DOM 이벤트 바인딩
   */
  function bindEvent() {
    document.querySelector('#btn-start').onclick = startScreenShare;
  }

  /**
   * 초기화
   */
  function initialize() {
    bindEvent();
  }

  initialize();
});

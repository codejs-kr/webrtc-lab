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
   * 비디오 엘리먼트에 재생을 위해 stream 바인딩 한다
   * @param data
   */
  function setVideoStream(data) {
    const type = data.type;
    const targetEl = data.el;

    targetEl.srcObject = data.stream;
  }

  /**
   * 로컬 스트림 핸들링
   * @param stream
   */
  function onLocalStream(stream) {
    console.log('onLocalStream', stream);

    const localVideo = document.querySelector('#local-video');
    setVideoStream({
      type: 'local',
      el: localVideo,
      stream: stream
    });
  }

  /**
   * 초기 설정
   */
  function initialize() {
    $('#btn-start').click(function() {
      screenHandler.start(function(stream) {
        onLocalStream(stream);
      });
    });
  }

  initialize();
});

/*!
 *
 * WebRTC Lab
 * @author dodortus (dodortus@gmail.com / codejs.co.kr)
 *
 */
$(function() {
  console.log('Loaded Main');

  const mediaHandler = new MediaHandler();
  const screenHandler = new ScreenHandler();

  /**
   * 로컬 스트림 핸들링
   * @param stream
   */
  function onLocalStream(stream) {
    const localVideo = document.querySelector('#local-video');
    mediaHandler.setVideoStream({
      type: 'local',
      el: localVideo,
      stream: stream
    });

    if (isMobile && isSafari) {
      mediaHandler.playForIOS(localVideo);
    }
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

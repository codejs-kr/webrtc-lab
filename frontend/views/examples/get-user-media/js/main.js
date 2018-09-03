$(function() {
  navigator.getUserMedia = navigator.getUserMedia ||
    navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

  /**
   * getUserMedia 성공
   * @param stream
   */
  function success(stream) {
    console.log('success', arguments);

    // For IOS safari (https://github.com/webrtc/samples/issues/929)
    if (DetectRTC.browser.isSafari) {
      video.controls = true;
    }

    // 비디오 테그에 stream 바인딩
    $('video')[0].srcObject = stream;

    // do something...
  }

  /**
   * getUserMedia 실패
   * @param error
   */
  function error(error) {
    console.log('error', arguments);

    alert('카메라와 마이크를 허용해주세요');
  }

  /**
   * 이벤트 바인딩
   */
  $('button').click(function() {
    navigator.getUserMedia({ audio: true, video: true }, success, error);
  });
});
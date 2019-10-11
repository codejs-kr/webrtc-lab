$(function() {
  navigator.getUserMedia =
    navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.mediaDevices.getUserMedia;

  const videoEl = document.getElementById('video');
  const canvasEl = document.getElementById('canvas');
  const width = 350;
  const height = 260;

  /**
   * getUserMedia 성공
   * @param stream
   */
  function success(stream) {
    videoEl.srcObject = stream;
  }

  /**
   * getUserMedia 실패
   * @param err
   */
  function error(err) {
    console.log('error', arguments);
  }

  /**
   * 비디오 이미지 캡쳐
   */
  function capture() {
    const context = canvasEl.getContext('2d');
    context.drawImage(videoEl, 0, 0, width, height);
    insertImage(canvasEl.toDataURL('image/png'));
  }

  /**
   * 캡쳐한 이미지 노출 함수
   * @param imageData
   */
  function insertImage(imageData) {
    $('#images').prepend('<img src=' + imageData + ' />');
  }

  /**
   * 초기 이벤트 바인딩
   */
  function initialize() {
    canvasEl.width = width;
    canvasEl.height = height;

    $('#btn-camera').click(function() {
      // getUserMedia(접근할 미디어, 성공 callback, 실패 callback);
      navigator.getUserMedia({ audio: false, video: true }, success, error);
    });

    $('#btn-capture').click(capture);
  }

  initialize();
});

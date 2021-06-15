/**
 * getUserMedia 성공
 * @param stream
 */
function success(stream) {
  console.log('onSuccess', arguments);
  const $video = document.querySelector('video');

  // For IOS safari (https://github.com/webrtc/samples/issues/929)
  if (DetectRTC.browser.isSafari) {
    $video.setAttribute('playsinline', true);
    $video.setAttribute('controls', true);

    setInterval(function () {
      $video.removeAttribute('controls');
    }, 0);
  }

  // video 테그에 stream 바인딩
  $video.srcObject = stream;
}

/**
 * getUserMedia 실패
 * @param error
 */
function error(err) {
  console.log('error', err);
  alert(err.message);
}

/**
 * 미디어 호출
 */
async function startMedia() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: true,
    });
    success(stream);
  } catch (err) {
    error(err);
  }
}

/**
 * 버튼 이벤트 바인딩
 */
document.querySelector('button').addEventListener('click', startMedia);

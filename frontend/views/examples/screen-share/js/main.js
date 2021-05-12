import ScreenHandler from './modules/screen-handler.js';

/*!
 *
 * WebRTC Lab
 * @author dodortus (dodortus@gmail.com / codejs.co.kr)
 *
 */
const screenHandler = new ScreenHandler();

/**
 * 로컬 스트림 핸들링
 * @param stream
 */
function onLocalStream(stream) {
  console.log('onLocalStream', stream);

  const $video = document.querySelector('#local-video');
  $video.srcObject = stream;
}

/**
 * screenHandler를 통해 스크린 API를 호출합니다.
 */
async function startScreenShare() {
  const stream = await screenHandler.start();
  onLocalStream(stream);
}

/**
 * 초기 이벤트 바인딩
 */
function initialize() {
  document.querySelector('#btn-start').addEventListener('click', startScreenShare);
}

initialize();

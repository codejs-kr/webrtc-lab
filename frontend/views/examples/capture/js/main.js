const $video = document.getElementById('video');
const $canvas = document.getElementById('canvas');
const width = 350;
const height = 260;

/**
 * 비디오 이미지 캡쳐
 */
function capture() {
  const context = $canvas.getContext('2d');
  context.drawImage($video, 0, 0, width, height);
  insertImage($canvas.toDataURL('image/png'));
}

/**
 * 캡쳐한 이미지 노출 함수
 * @param imageData
 */
function insertImage(imageData) {
  const $images = document.querySelector('#images');
  const $img = document.createElement('img');
  const $a = document.createElement('a');
  const fileName = `[WebRTC 연구실] Capture - ${new Date().getTime()}`;

  $img.src = imageData;
  $a.href = imageData;
  $a.download = fileName;
  $a.appendChild($img);

  $images.insertBefore($a, $images.childNodes[0]);
}

/**
 * getUserMedia 성공
 * @param stream
 */
function success(stream) {
  $video.srcObject = stream;
}

/**
 * getUserMedia 실패
 * @param err
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
 * 초기 이벤트 바인딩
 */
function initialize() {
  $canvas.width = width;
  $canvas.height = height;

  document.querySelector('#btn-camera').addEventListener('click', startMedia);
  document.querySelector('#btn-capture').addEventListener('click', capture);
}

initialize();

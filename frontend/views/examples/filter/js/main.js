const $video = document.querySelector('video');
const $start = document.querySelector('#btn-start');
const filters = [
  'grayscale',
  'sepia',
  'blur',
  'brightness',
  'contrast',
  'hue-rotate',
  'hue-rotate2',
  'hue-rotate3',
  'saturate',
  'invert',
  '',
];
let index = 0;

/**
 * getUserMedia 성공
 * @param stream
 */
function success(stream) {
  console.log('onSuccess', arguments);

  // video 테그에 stream 바인딩
  $video.srcObject = stream;

  // 영상 플레이 준비가 되면 시작
  $video.onloadedmetadata = (event) => {
    console.log('onloadedmetadata', event);
    $video.play();
  };
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
 * 필터가 변경될때 DOM class를 변경 합니다.
 * @param event
 */
function changeFilter(event) {
  const el = event.target;
  const effect = filters[index++ % filters.length]; // loop through filters.

  el.className = '';
  if (effect) {
    el.classList.add(effect);
  }
}

/**
 * 초기 이벤트 바인딩
 */
function initialize() {
  $video.addEventListener('click', changeFilter);
  $start.addEventListener('click', startMedia);
}

initialize();

$(function() {
  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

  const $video = $('video');
  const $start = $('#start');
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
   * 영상을 호출합니다.
   */
  function getUserMedia() {
    navigator.getUserMedia(
      {
        audio: true,
        video: true,
      },
      (stream) => {
        const videoEl = $video[0];

        // 비디오 테그에 stream 할당
        videoEl.srcObject = stream;

        // 영상 플레이 준비가 되면 시작
        videoEl.onloadedmetadata = (event) => {
          console.log('onloadedmetadata', event);
          videoEl.play();
        };
      },
      (err) => {
        console.log('getUserMedia', err);
        alert(err.message);
      }
    );
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
   * 이벤트 바인딩
   */
  $video.click(changeFilter);
  $start.click(getUserMedia);
});

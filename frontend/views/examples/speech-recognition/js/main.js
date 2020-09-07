/*!
 *
 * WebRTC Lab
 * @author dodortus (codejs.co.kr / dodortus@gmail.com)
 *
 */
$(function () {
  if (typeof webkitSpeechRecognition !== 'function') {
    alert('크롬에서만 동작 합니다.');
    return false;
  }

  const FIRST_CHAR = /\S/;
  const TWO_LINE = /\n\n/g;
  const ONE_LINE = /\n/g;

  const recognition = new webkitSpeechRecognition();
  const language = 'ko-KR';
  const $audio = document.querySelector('#audio');
  const $btnMic = document.querySelector('#btn-mic');
  const $resultWrap = document.querySelector('#result');
  const $iconMusic = document.querySelector('#icon-music');

  let isRecognizing = false;
  let ignoreEndProcess = false;
  let finalTranscript = '';

  recognition.continuous = true;
  recognition.interimResults = true;

  /**
   * 음성 인식 시작 처리
   */
  recognition.onstart = function () {
    console.log('onstart', arguments);
    isRecognizing = true;
    $btnMic.className = 'on';
  };

  /**
   * 음성 인식 종료 처리
   */
  recognition.onend = function () {
    console.log('onend', arguments);
    isRecognizing = false;

    if (ignoreEndProcess) {
      return false;
    }

    // DO end process
    $btnMic.className = 'off';
    if (!finalTranscript) {
      console.log('empty finalTranscript');
      return false;
    }
  };

  /**
   * 음성 인식 결과 처리
   */
  recognition.onresult = function (event) {
    console.log('onresult', event);

    let interimTranscript = '';
    if (typeof event.results === 'undefined') {
      recognition.onend = null;
      recognition.stop();
      return;
    }

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const transcript = event.results[i][0].transcript;

      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    finalTranscript = capitalize(finalTranscript);
    final_span.innerHTML = linebreak(finalTranscript);
    interim_span.innerHTML = linebreak(interimTranscript);

    console.log('finalTranscript', finalTranscript);
    console.log('interimTranscript', interimTranscript);
    fireCommand(interimTranscript);
  };

  /**
   * 음성 인식 에러 처리
   */
  recognition.onerror = function (event) {
    console.log('onerror', event);

    if (event.error.match(/no-speech|audio-capture|not-allowed/)) {
      ignoreEndProcess = true;
    }

    $btnMic.className = 'off';
  };

  /**
   * 명령어 처리
   * @param string
   */
  function fireCommand(string) {
    if (string.endsWith('레드')) {
      $resultWrap.className = 'red';
    } else if (string.endsWith('블루')) {
      $resultWrap.className = 'blue';
    } else if (string.endsWith('그린')) {
      $resultWrap.className = 'green';
    } else if (string.endsWith('옐로우')) {
      $resultWrap.className = 'yellow';
    } else if (string.endsWith('오렌지')) {
      $resultWrap.className = 'orange';
    } else if (string.endsWith('그레이')) {
      $resultWrap.className = 'grey';
    } else if (string.endsWith('골드')) {
      $resultWrap.className = 'gold';
    } else if (string.endsWith('화이트')) {
      $resultWrap.className = 'white';
    } else if (string.endsWith('블랙')) {
      $resultWrap.className = 'black';
    } else if (string.endsWith('알람') || string.endsWith('알 람')) {
      alert('알람');
    } else if (string.endsWith('노래 켜') || string.endsWith('음악 켜')) {
      $audio.play();
      $iconMusic.classList.add('visible');
    } else if (string.endsWith('노래 꺼') || string.endsWith('음악 꺼')) {
      $audio.pause();
      $iconMusic.classList.remove('visible');
    } else if (string.endsWith('볼륨 업') || string.endsWith('볼륨업')) {
      $audio.volume += 0.2;
    } else if (string.endsWith('볼륨 다운') || string.endsWith('볼륨다운')) {
      $audio.volume -= 0.2;
    } else if (string.endsWith('스피치') || string.endsWith('말해줘') || string.endsWith('말 해 줘')) {
      textToSpeech($('#final_span').text() || '전 음성 인식된 글자를 읽습니다.');
    }
  }

  /**
   * 개행 처리
   * @param {string} s
   */
  function linebreak(s) {
    return s.replace(TWO_LINE, '<p></p>').replace(ONE_LINE, '<br>');
  }

  /**
   * 첫문자를 대문자로 변환
   * @param {string} s
   */
  function capitalize(s) {
    return s.replace(FIRST_CHAR, function (m) {
      return m.toUpperCase();
    });
  }

  /**
   * 음성 인식 트리거
   */
  function start() {
    if (isRecognizing) {
      recognition.stop();
      return;
    }
    recognition.lang = language;
    recognition.start();
    ignoreEndProcess = false;

    finalTranscript = '';
    final_span.innerHTML = '';
    interim_span.innerHTML = '';
  }

  /**
   * 문자를 음성으로 읽어 줍니다.
   * 지원: 크롬, 사파리, 오페라, 엣지
   */
  function textToSpeech(text) {
    console.log('textToSpeech', arguments);

    // speechSynthesis options
    // const u = new SpeechSynthesisUtterance();
    // u.text = 'Hello world';
    // u.lang = 'en-US';
    // u.rate = 1.2;
    // u.onend = function(event) {
    //   log('Finished in ' + event.elapsedTime + ' seconds.');
    // };
    // speechSynthesis.speak(u);

    // simple version
    speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }

  /**
   * 초기 바인딩
   */
  function initialize() {
    const $btnTTS = document.querySelector('#btn-tts');
    const defaultMsg = '전 음성 인식된 글자를 읽습니다.';

    $btnTTS.addEventListener('click', () => {
      const text = final_span.innerText || defaultMsg;
      textToSpeech(text);
    });

    $btnMic.addEventListener('click', start);
  }

  initialize();
});

/*!
 *
 * WebRTC Lab
 * @author dodortus (dodortus@gmail.com)
 * @homepage codejs.co.kr
 */

$(function() {
  const browserVersion = DetectRTC.browser.version;
  const isFirefox = DetectRTC.browser.isFirefox;
  const isChrome = DetectRTC.browser.isChrome;
  const isOpera = DetectRTC.browser.isOpera;
  const isEdge = DetectRTC.browser.isEdge && browserVersion >= 15063;   // edge 15버전 이상
  const isSafari = DetectRTC.browser.isSafari && browserVersion >= 11;  // safari 11버전 이상
  const checkPage = (location.href.match(/conference/) || $('video').length);
  const $commentTarget = $('#content .wrap:eq(0)');

  function showNotSupportBrowserMsg() {
    $commentTarget.prepend([
      "<strong class='alert-message'>",
        "WebRTC는 현재 Chrome, Firefox, Edge 15이상, Safari 11이상, Opera 브라우저만 지원합니다.",
      "</strong>"
    ].join('\n'));
  }

  function showNeedCamMsg() {
    alert('예제는 캠이 있어야 작동합니다.');
  }

  function setHTTPS() {
    if (location.protocol === 'http:') {
      location.protocol = "https:";
    }
  }

  function init() {
    // https 설정
    if (!location.href.match('localhost')) {
      setHTTPS();
    }

    // webrtc 미지원 브라우저 체크
    if (checkPage && !isFirefox && !isChrome && !isOpera && !isEdge && !isSafari) {
      showNotSupportBrowserMsg();
      return false;
    }

    // 캠 체크, 체크 텀이 필요함
    setTimeout(function() {
      if (checkPage && !DetectRTC.hasWebcam) {
        showNeedCamMsg();
      }
    }, 300);
  }
  init();
});

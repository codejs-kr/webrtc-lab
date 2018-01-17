/*!
 *
 * WebRTC Lab
 * @author dodortus (dodortus@gmail.com / codejs.co.kr)
 *
 */

$(function() {
  var browserVersion = DetectRTC.browser.version;
  var isFirefox = DetectRTC.browser.isFirefox;
  var isChrome = DetectRTC.browser.isChrome;
  var isOpera = DetectRTC.browser.isOpera;
  var isEdge = DetectRTC.browser.isEdge && browserVersion >= 15063; // 15버전 이상
  var isSafari = DetectRTC.browser.isSafari && browserVersion >= 11; // 11버전 이상
  var checkPage = (location.href.match(/conference/) || $('video').length);
  var $commentTarget = $('#content .wrap:eq(0)');

  function addNotSupportBrowserMsg() {
    $commentTarget.prepend([
      "<strong class='alert-message'>WebRTC는 현재 Chrome, Firefox, Edge 15이상, Safari 11이상, Opera 브라우저만 지원합니다.</strong>"
    ].join('\n'));
  }

  function addNoCamMsg() {
    alert('예제는 캠이 있어야 작동합니다.');
  }

  function setHTTPS() {
    if (location.protocol == 'http:') {
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
      addNotSupportBrowserMsg();
      return false;
    }

    // 캠 체크, 체크 텀이 필요함
    setTimeout(function() {
      if (checkPage && !DetectRTC.hasWebcam) {
        addNoCamMsg();
      }
    }, 300);
  }
  init();
});

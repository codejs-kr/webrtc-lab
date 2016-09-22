/*!
 *
 * WebRTC Lab
 * @author dodortus (codejs.co.kr / dodortus@gmail.com)
 *
 */

$(function() {
  var isFirefox = DetectRTC.browser.isFirefox;
  var isChrome = DetectRTC.browser.isChrome;
  var isOpera = DetectRTC.browser.isOpera;
  var checkPage = (location.href.match(/conference/) || $('video').length);
  var $commentTarget = $('#content .wrap:eq(0)');

  function addNotSupportBrowserMsg() {
    $commentTarget.prepend([
      "<strong class='alert-message'>WebRTC는 현재 Chrome, Firefox, Opera 브라우저만 지원합니다.</strong>"
    ].join('\n'));
  }

  function addNoCamMsg() {
    alert('예제는 캠이 있어야 작동합니다.')
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
    if (checkPage && !isFirefox && !isChrome && !isOpera) {
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

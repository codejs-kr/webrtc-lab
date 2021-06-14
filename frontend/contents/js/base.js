import { isSupportedBrowser, checkHasWebCam, changeHTTPS } from './helpers/env.js';

$(function () {
  const isNeedCheckPage = location.href.match(/conference|get-user-media|filter|capture/);
  const $commentTarget = $('#content .wrap:eq(0)');

  function showMessage(message) {
    return $commentTarget.prepend("<strong class='alert-message'>" + message + '</strong>');
  }

  function showNotSupportBrowserMessage() {
    return showMessage('WebRTC는 현재 Chrome, Firefox, Edge 15이상, Safari 11이상, Opera 브라우저만 지원합니다.');
  }

  function showNeedCamMessage() {
    return showMessage('예제는 캠이 있어야 작동합니다.');
  }

  function init() {
    // https 설정
    if (!location.href.match('localhost')) {
      changeHTTPS();
    }

    // webrtc 미지원 브라우저 체크
    if (isNeedCheckPage && !isSupportedBrowser) {
      showNotSupportBrowserMessage();
      return false;
    }

    // 캠 체크, 체크 텀이 필요함
    setTimeout(function () {
      if (isNeedCheckPage && !checkHasWebCam()) {
        showNeedCamMessage();
      }
    }, 300);
  }
  init();
});

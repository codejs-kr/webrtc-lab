/*!
 *
 * WebRTC Lab
 * @author dodortus (dodortus@gmail.com / codejs.co.kr)
 *
 */

/**
 * TODO
 * peer-handler 이벤트 에미터 방식으로 변경
 */
/*!
  간략한 시나리오.
  1. offer가 SDP와 candidate전송
  2. answer는 offer가 보낸 SDP와 cadidate를 Set한다.
  3. answer는 응답할 SDP와 candidate를 얻어서 offer한테 전달한다.
  4. offer는 응답 받은 SDP와 candidate를 Set한다.
*/
$(function() {
  console.log('Loaded webrtc');

  var roomId;
  var userId;
  var remoteUserId;
  var isOffer;

  var socket = io();
  var peerHandler = new PeerHandler({
    send: send,
    onRemoteStream: onRemoteStream
  });

  // DOM
  var $body = $('body');
  var $roomList = $('#room-list');
  var $videoWrap = $('#video-wrap');
  var $tokenWrap = $('#token-wrap');
  var $uniqueToken = $('#unique-token');
  var $joinWrap = $('#join-wrap');

  /****************************** Below for signaling ************************/

  /**
   * onFoundUser
   */
  function onFoundUser() {
    console.log('onFoundUser');

    $roomList.html([
      '<div class="room-info">',
        '<p>당신을 기다리고 있어요. 참여 하실래요?</p>',
        '<button id="btn-join">Join</button>',
      '</div>'
    ].join('\n'));

    var $btnJoin = $('#btn-join');
    $btnJoin.click(function() {
      isOffer = true;
      peerHandler.getUserMedia(onLocalStream, isOffer);
      $(this).attr('disabled', true);
    });

    $joinWrap.slideUp(1000);
    $tokenWrap.slideUp(1000);
  }

  /**
   * 참석자 핸들링
   * @param roomId
   * @param userList
   */
  function onJoin(roomId, userList) {
    console.log('onJoin', arguments);

    if (Object.size(userList) > 1) {
      onFoundUser();
    }
  }

  /**
   * 이탈자 핸들링
   * @param userId
   */
  function onLeave(userId) {
    console.log('onLeave', arguments);

    if (remoteUserId === userId) {
      $('#remote-video').remove();
      $body.removeClass('connected').addClass('wait');
      remoteUserId = null;
    }
  }

  /**
   * 메세지 핸들링
   * @param data
   */
  function onMessage(data) {
    console.log('onMessage', arguments);

    if (!remoteUserId) {
      remoteUserId = data.sender;
    }

    if (data.sdp || data.candidate) {
      peerHandler.signaling(data);
    } else {
      // etc
    }
  }

  /**
   * IOS 11이상 비디오 컨트롤 인터페이스가 있어야 실행이 된다.
   * 속성을 추가했다 제거하는 트릭으로 자동 재생되도록 한다.
   * @param video
   */
  function playForIOS(video) {
    video.setAttribute("playsinline", true);
    video.setAttribute("controls", true);
    setTimeout(function() {
      video.removeAttribute("controls");
    }, 1);
  }

  /**
   * setRoomToken
   */
  function setRoomToken() {
    //console.log('setRoomToken', arguments);
    var hashValue = (Math.random() * new Date().getTime()).toString(32).toUpperCase().replace(/\./g, '-');

    if (location.hash.length > 2) {
      $uniqueToken.attr('href', location.href);
    } else {
      location.hash = '#' + hashValue;
    }
  }

  /**
   * setClipboard
   */
  function setClipboard() {
    //console.log('setClipboard', arguments);

    $uniqueToken.click(function(){
      var link = location.href;
      if (window.clipboardData){
        window.clipboardData.setData('text', link);
        alert('Copy to Clipboard successful.');
      }
      else {
        window.prompt("Copy to clipboard: Ctrl+C, Enter", link); // Copy to clipboard: Ctrl+C, Enter
      }
    });
  }

  function onLocalStream(stream) {
    $videoWrap.append('<video id="local-video" muted="muted" autoplay />');
    var localVideo = document.querySelector('#local-video');
    localVideo.srcObject = stream;
    $body.addClass('room wait');
    $tokenWrap.slideDown(1000);

    // if (isMobile && isSafari) {
    //   playForIOS(localVideo);
    // }
  }

  function onRemoteStream(stream) {
    $videoWrap.append('<video id="remote-video" autoplay />');
    var remoteVideo = document.querySelector('#remote-video');
    remoteVideo.srcObject = stream;
    $body.removeClass('wait').addClass('connected');
    //
    // if (isMobile && isSafari) {
    //   playForIOS(remoteVideo);
    // }
  }

  /**
   * send
   * @param {object} data
   */
  function send(data) {
    console.log('send', arguments);

    data.roomId = roomId;
    data.sender = userId;
    socket.send(data);
  }

  /**
   * 초기 설정
   */
  function initialize() {
    roomId = location.href.replace(/\/|:|#|%|\.|\[|\]/g, '');
    userId = Math.round(Math.random() * 99999);

    socket.emit('enter', roomId, userId);
    socket.on('join', onJoin);
    socket.on('leave', onLeave);
    socket.on('message', onMessage);

    setRoomToken();
    setClipboard();


    $('#btn-start').click(function() {
      peerHandler.getUserMedia(onLocalStream);
    });

    $('#btn-camera').click(function() {
      var $this = $(this);
      $this.toggleClass('active');

      if ($this.hasClass('active')) {
        peerHandler.pauseVideo();
      } else {
        peerHandler.resumeVideo();
      }
    });

    $('#btn-mic').click(function() {
      var $this = $(this);
      $this.toggleClass('active');

      if ($this.hasClass('active')) {
        peerHandler.muteAudio();
      } else {
        peerHandler.unmuteAudio();
      }
    });
  }
  initialize();

});

Object.size = function(obj) {
  var size = 0, key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      size++;
    }
  }
  return size;
};
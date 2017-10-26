/*!
 *
 * WebRTC Lab
 * @author dodortus (dodortus@gmail.com / codejs.co.kr)
 *
 */

/*!
  간략한 시나리오.
  1. offer가 SDP와 candidate전송
  2. answer는 offer가 보낸 SDP와 cadidate를 Set한다.
  3. answer는 응답할 SDP와 candidate를 얻어서 offer한테 전달한다.
  4. offer는 응답 받은 SDP와 candidate를 Set한다.
*/

/*
TODO
 - 파폭 처리
 - hasWebCam 분기
*/
$(function() {
  console.log('Loaded webrtc');

  // cross browsing
  navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia;
  var RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
  var RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;
  var RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate || window.webkitRTCIceCandidate;

  // for logic
  var socket = io();
  var roomId = null;
  var userId = Math.round(Math.random() * 999999) + 999999;
  var remoteUserId = null;
  var isOffer = null;
  var localStream = null;
  var peer = null; // offer or answer peer
  var iceServers = {
    'iceServers': [
      {'url': 'stun:stun1.l.google.com:19302'},
      {'url': 'stun:stun2.l.google.com:19302'},
      {'url': 'stun:stun3.l.google.com:19302'},
      {'url': 'stun:stun4.l.google.com:19302'},
      {'url': 'stun:stun.l.google.com:19302'},
      {
        'url': 'turn:107.150.19.220:3478',
        'credential': 'turnserver',
        'username': 'subrosa'
      }
    ]
  };
  var peerConnectionOptions = {
    'optional': [{
      'DtlsSrtpKeyAgreement': 'true'
    }]
  };
  var mediaConstraints = {
    'mandatory': {
      'OfferToReceiveAudio': true,
      'OfferToReceiveVideo': true
    }
  };
  var screenShare = new ScreenShare();

  // DOM
  var $body = $('body');
  var $roomList = $('#room-list');
  var $videoWrap = $('#video-wrap');
  var $tokenWrap = $('#token-wrap');
  var $uniqueToken = $('#unique-token');
  var $joinWrap = $('#join-wrap');

  /**
  * getUserMedia
  */
  function getUserMedia() {
    console.log('getUserMedia');

    navigator.getUserMedia({
      audio: true,
      video: true
    }, function(stream) {
      localStream = stream;
      $videoWrap.append('<video id="local-video" muted="muted" autoplay="true" src="' + URL.createObjectURL(localStream) + '"></video>');
      $body.addClass('room wait');
      $tokenWrap.slideDown(1000);

      if (isOffer) {
        createPeerConnection();
        createOffer();
      }
    }, function() {
      console.error('Error getUserMedia');
    });
  }

  /**
  * createOffer
  * offer SDP를 생성 한다.
  */
  function createOffer() {
    console.log('createOffer', arguments);

    peer.addStream(localStream); // addStream 제외시 recvonly로 SDP 생성됨
    peer.createOffer(function(SDP) {

      SDP.sdp = SDP.sdp.replace("96 97 98 99 100 101 102 124 127 125 123", "100 101 102 124 127 125 123 96 97 98 99"); // for h.264
      //SDP.sdp = SDP.sdp.replace("42e01f", "42e028");

      peer.setLocalDescription(SDP);
      console.log("Sending offer description", SDP);
      send({
        sender: userId,
        to: 'all',
        sdp: SDP
      });
    }, onSdpError, mediaConstraints);
  }

  /**
  * createAnswer
  * offer에 대한 응답 SDP를 생성 한다.
  * @param {object} msg offer가 보내온 signaling
  */
  function createAnswer(msg) {
    console.log('createAnswer', arguments);

    //peer.addStream(localStream);
    peer.setRemoteDescription(new RTCSessionDescription(msg.sdp), function() {
      peer.createAnswer(function(SDP) {
        peer.setLocalDescription(SDP);
        console.log("Sending answer to peer.", SDP);
        send({
          sender: userId,
          to: 'all',
          sdp: SDP
        });
      }, onSdpError, mediaConstraints);
    }, function() {
      console.error('setRemoteDescription', arguments);
    });
  }

  /**
  * createPeerConnection
  * offer, answer 공통 함수로 peer를 생성하고 관련 이벤트를 바인딩 한다.
  */
  function createPeerConnection() {
    console.log('createPeerConnection', arguments);

    peer = new RTCPeerConnection(iceServers, peerConnectionOptions);
    console.log('new Peer', peer);

    peer.onicecandidate = function(event) {
      if (event.candidate) {
        send({
          userId: userId,
          to: 'all',
          label: event.candidate.sdpMLineIndex,
          id: event.candidate.sdpMid,
          candidate: event.candidate.candidate
        });
      } else {
        console.info('Candidate denied', event.candidate);
      }
    };

    peer.onaddstream = function(event) {
      console.log("Adding remote strem", event);
      $('#remote-screen').attr('src', URL.createObjectURL(event.stream));
      //$videoWrap.append('<video id="remote-video" autoplay="true" src="' + URL.createObjectURL(event.stream) + '"></video>');
      $body.removeClass('wait').addClass('connected');
    };

    peer.onremovestream = function(event) {
      console.log("Removing remote stream", event);
    };
  }

  /**
  * onSdpError
  */
  function onSdpError() {
    console.log('onSdpError', arguments);
  }

  /****************************** Below for signaling ************************/

  /**
  * send
  * @param {object} msg data
  */
  function send(data) {
    console.log('send', data);

    data.roomId = roomId;
    socket.send(data);
  }

  /**
  * onmessage
  * @param {object} msg data
  */
  function onmessage(data) {
    console.log('onmessage', data);

    var msg = data;
    var sdp = msg.sdp || null;

    if (!remoteUserId) {
      remoteUserId = data.userId;
    }

    // 접속자가 보내온 offer처리
    if (sdp) {
      if (sdp.type  == 'offer') {
        createPeerConnection();
        console.log('Adding local stream...');
        createAnswer(msg);

      // offer에 대한 응답 처리
      } else if (sdp.type == 'answer') {
        // answer signaling
        peer.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      }

    // offer, answer cadidate처리
    } else if (msg.candidate) {
      var candidate = new RTCIceCandidate({
        sdpMLineIndex: msg.label,
        candidate: msg.candidate
      });

      peer.addIceCandidate(candidate);
    } else {
      //console.log()
    }
  }

  /**
   * setRoomToken
   */
  function setRoomToken() {
    //console.log('setRoomToken', arguments);

    if (location.hash.length > 2) {
      $uniqueToken.attr('href', location.href);
    } else {
      location.hash = '#' + (Math.random() * new Date().getTime()).toString(32).toUpperCase().replace(/\./g, '-');
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
        $.message('Copy to Clipboard successful.');
      }
      else {
        window.prompt("Copy to clipboard: Ctrl+C, Enter", link); // Copy to clipboard: Ctrl+C, Enter
      }
    });
  }

  /**
   * onFoundUser
   */
  function onFoundUser() {
    $roomList.html([
      '<div class="room-info">',
        '<p>당신을 기다리고 있어요. 참여 하실래요?</p>',
        '<button id="join">Join</button>',
      '</div>'].join('\n'));

    var $btnJoin = $('#join');
    $btnJoin.click(function() {
      isOffer = true;
      getUserMedia();
      $(this).attr('disabled', true);
    });

    $joinWrap.slideUp(1000);
    $tokenWrap.slideUp(1000);
  }

  /**
   * onLeave
   * @param {string} userId
   */
  function onLeave(userId) {
    if (remoteUserId == userId) {
      $('#remote-video').remove();
      $body.removeClass('connected').addClass('wait');
      remoteUserId = null;
    }
  }

  /**
   * initialize
   */
  function initialize() {
    setRoomToken();
    setClipboard();
    roomId = location.href.replace(/\/|:|#|%|\.|\[|\]/g, '');

    $('#start').click(function() {
      getUserMedia();
    });


    $('#btn-screen-share').click(function() {
      screenShare.start(function(stream) {
        localStream = stream;
        isOffer = true;
        $('#local-screen').attr('src', URL.createObjectURL(localStream));

        if (isOffer) {
          createPeerConnection();
          createOffer();
        }
      });
    });
  }
  initialize();

  window.getPeerStats = function() {﻿
    peer.getStats(function(res) {
      var items = [];
      res.result().forEach(function(result) {
        var item = {};
        result.names().forEach(function(name) {
          item[name] = result.stat(name);
        });
        item.id = result.id;
        item.type = result.type;
        item.timestamp = result.timestamp;
        items.push(item);
      });
      console.log(items);
    });
  }

  /**
   * socket handling
   */
  socket.emit('joinRoom', roomId, userId);
  socket.on('joinRoom', function(roomId, userList) {
    console.log('joinRoom', arguments);
    if (Object.size(userList) > 1) {
      onFoundUser();
    }
  });

  socket.on('leaveRoom', function(userId) {
    console.log('leaveRoom', arguments);
    onLeave(userId);
  });

  socket.on('message', function(data) {
    onmessage(data);
  });
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

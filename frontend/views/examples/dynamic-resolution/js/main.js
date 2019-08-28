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
  var RTCSessionDescription =
    window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;
  var RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate || window.webkitRTCIceCandidate;
  var browserVersion = DetectRTC.browser.version;
  var isEdge = DetectRTC.browser.isEdge && browserVersion >= 15063; // 15버전 이상

  // for logic
  var socket = io();
  var userId = Math.round(Math.random() * 999999) + 999999;
  var roomId;
  var remoteUserId;
  var isOffer;
  var localStream;
  var localSmallStream;
  var streams = [];
  var peer; // offer or answer peer
  var peers = [];
  var iceServers = {
    iceServers: [
      { url: 'stun:stun.l.google.com:19302' },
      { url: 'stun:stun1.l.google.com:19302' },
      { url: 'stun:stun2.l.google.com:19302' },
      {
        url: 'turn:107.150.19.220:3478',
        credential: 'turnserver',
        username: 'subrosa',
      },
    ],
  };

  var peerConnectionOptions = {
    optional: [
      {
        DtlsSrtpKeyAgreement: 'true',
      },
    ],
  };

  var mediaConstraints = {
    mandatory: {
      OfferToReceiveAudio: true,
      OfferToReceiveVideo: true,
    },
  };

  var resolution = {
    width: 1280,
    height: 720,
  };

  // edge is not supported
  if (isEdge) {
    peerConnectionOptions = {};
    mediaConstraints = {};
  }

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

    navigator.getUserMedia(
      {
        audio: true,
        video: {
          width: 1280,
          height: 720,
        },
      },
      function(stream) {
        localStream = stream;
        $videoWrap.append(
          '<video id="local-video-large" class="local-video" muted="muted" autoplay="true" title="720p"></video>'
        );
        document.querySelector('#local-video-large').srcObject = localStream;
        $body.addClass('room wait');
        $tokenWrap.slideDown(1000);

        if (isOffer) {
          var peer = createPeerConnection('large');
          createOffer('large', peer, localStream);
        }
      },
      function() {
        console.error('Error getUserMedia');
      }
    );
  }

  /**
   * createOffer
   * offer SDP를 생성 한다.
   */
  function createOffer(sessionType, peer, stream) {
    console.log('createOffer', arguments);

    peer.addStream(stream); // addStream 제외시 recvonly로 SDP 생성됨
    peer.createOffer(
      function(SDP) {
        // url parameter codec=h264
        if (location.search.substr(1).match('h264')) {
          SDP.sdp = SDP.sdp.replace('100 101 107', '107 100 101'); // for chrome < 57
          SDP.sdp = SDP.sdp.replace('96 98 100', '100 96 98'); // for chrome 57 <
        }

        peer.setLocalDescription(SDP);
        console.log('Sending offer description', SDP);
        send({
          sender: userId,
          to: 'all',
          sessionType: sessionType,
          sdp: SDP,
        });
      },
      onSdpError,
      mediaConstraints
    );
  }

  /**
   * createAnswer
   * offer에 대한 응답 SDP를 생성 한다.
   * @param {object} msg offer가 보내온 signaling
   */
  function createAnswer(sessionType, peer, msg, stream) {
    console.log('createAnswer', arguments);

    peer.addStream(stream);
    peer.setRemoteDescription(
      new RTCSessionDescription(msg.sdp),
      function() {
        peer.createAnswer(
          function(SDP) {
            peer.setLocalDescription(SDP);
            console.log('Sending answer to peer.', SDP);
            send({
              sender: userId,
              to: 'all',
              sessionType: sessionType,
              sdp: SDP,
            });
          },
          onSdpError,
          mediaConstraints
        );
      },
      function() {
        console.error('setRemoteDescription', arguments);
      }
    );
  }

  /**
   * createPeerConnection
   * offer, answer 공통 함수로 peer를 생성하고 관련 이벤트를 바인딩 한다.
   */
  function createPeerConnection(type) {
    console.log('createPeerConnection', arguments);

    var peer = {
      type: type,
      pc: null,
    };

    peer.pc = new RTCPeerConnection(iceServers, peerConnectionOptions);
    console.log('new Peer', peer);

    peer.pc.onicecandidate = function(event) {
      if (event.candidate) {
        send({
          userId: userId,
          to: 'all',
          label: event.candidate.sdpMLineIndex,
          id: event.candidate.sdpMid,
          candidate: event.candidate.candidate,
          sessionType: type,
        });
      } else {
        console.info('Candidate denied', event.candidate);
      }
    };

    peer.pc.onaddstream = function(event) {
      console.log('Adding remote strem', event);

      var id = 'remote-video-' + type;
      $videoWrap.append('<video id="' + id + '" class="remote-video" autoplay="true"></video>');
      document.querySelector('#' + id).srcObject = event.stream;
      $body.removeClass('wait').addClass('connected');
    };

    peer.pc.onremovestream = function(event) {
      console.log('Removing remote stream', event);
    };

    peer.pc.onnegotiationneeded = function(event) {
      console.log('onnegotiationneeded', event);
    };

    peer.pc.onsignalingstatechange = function(event) {
      console.log('onsignalingstatechange', event);
    };

    peer.pc.oniceconnectionstatechange = function(event) {
      console.log(
        'oniceconnectionstatechange',
        'iceGatheringState: ' + peer.iceGatheringState,
        '/ iceConnectionState: ' + peer.iceConnectionState
      );
    };

    // add peers array
    peers.push(peer);

    return peer.pc;
  }

  /**
   * getPeer
   * 다수의 Peer중 해당하는 type과 매칭되는 peer 리턴한다.
   */
  function getPeer(type) {
    console.log('getPeer', arguments, peers);
    var peer = null;

    for (var i = 0; i < peers.length; i++) {
      if (peers[i].type === type) {
        peer = peers[i].pc;
      }
    }

    return peer;
  }

  /**
   * changeResolution
   */
  function changeResolution() {
    localStream.getVideoTracks().forEach(function(track) {
      console.log('확인 track', track, track.getConstraints(), track.applyConstraints);

      if (resolution.height === 720) {
        resolution = {
          width: 160,
          height: 90,
        };
      } else {
        resolution = {
          width: 1280,
          height: 720,
        };
      }

      track.applyConstraints(resolution);
      console.log('확인 result', track.getConstraints());
    });
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
    var sessionType = data.sessionType;

    if (!remoteUserId) {
      remoteUserId = data.userId;
    }

    // 접속자가 보내온 offer처리
    if (sdp) {
      if (sdp.type == 'offer') {
        console.log('Adding local stream...');
        var peer = createPeerConnection(sessionType);

        // TODO 개선 필요
        if (sessionType === 'large') {
          createAnswer(sessionType, peer, msg, localStream);
        } else {
          createAnswer(sessionType, peer, msg, localSmallStream);
        }
        // offer에 대한 응답 처리
      } else if (sdp.type == 'answer') {
        var peer = getPeer(sessionType);
        peer.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      }

      // offer, answer cadidate처리
    } else if (msg.candidate) {
      var peer = getPeer(sessionType);
      var candidate = new RTCIceCandidate({
        sdpMid: msg.id,
        sdpMLineIndex: msg.label,
        candidate: msg.candidate,
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
      location.hash =
        '#' +
        (Math.random() * new Date().getTime())
          .toString(32)
          .toUpperCase()
          .replace(/\./g, '-');
    }
  }

  /**
   * setClipboard
   */
  function setClipboard() {
    //console.log('setClipboard', arguments);

    $uniqueToken.click(function() {
      var link = location.href;
      if (window.clipboardData) {
        window.clipboardData.setData('text', link);
        alert('Copy to Clipboard successful.');
      } else {
        window.prompt('Copy to clipboard: Ctrl+C, Enter', link); // Copy to clipboard: Ctrl+C, Enter
      }
    });
  }

  /**
   * onFoundUser
   */
  function onFoundUser() {
    $roomList.html(
      [
        '<div class="room-info">',
        '<p>당신을 기다리고 있어요. 참여 하실래요?</p>',
        '<button id="join">Join</button>',
        '</div>',
      ].join('\n')
    );

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
      $('.remote-video').remove();
      $body.removeClass('connected').addClass('wait');
      remoteUserId = null;
    }
  }

  function pauseVideo(callback) {
    console.log('pauseVideo', arguments);
    localStream.getVideoTracks()[0].enabled = false;
    callback && callback();
  }

  function resumeVideo(callback) {
    console.log('resumeVideo', arguments);
    localStream.getVideoTracks()[0].enabled = true;
    callback && callback();
  }

  function muteAudio(callback) {
    console.log('muteAudio', arguments);
    localStream.getAudioTracks()[0].enabled = false;
    callback && callback();
  }

  function unmuteAudio(callback) {
    console.log('unmuteAudio', arguments);
    localStream.getAudioTracks()[0].enabled = true;
    callback && callback();
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

    $('#btn-camera').click(function() {
      var $this = $(this);
      $this.toggleClass('active');

      if ($this.hasClass('active')) {
        pauseVideo();
      } else {
        resumeVideo();
      }
    });

    $('#btn-mic').click(function() {
      var $this = $(this);
      $this.toggleClass('active');

      if ($this.hasClass('active')) {
        muteAudio();
      } else {
        unmuteAudio();
      }
    });

    $('#btn-change-resolution').click(function() {
      changeResolution();
    });
  }
  initialize();

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
  var size = 0,
    key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      size++;
    }
  }
  return size;
};

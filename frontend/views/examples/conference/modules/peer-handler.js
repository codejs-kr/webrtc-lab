
function PeerHandler(options) {
  // cross browsing
  navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia;
  var RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
  var RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;
  var RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate || window.webkitRTCIceCandidate;

  var browserVersion = DetectRTC.browser.version;
  var isEdge = DetectRTC.browser.isEdge && browserVersion >= 15063; // 15버전 이상
  var isSafari = DetectRTC.browser.isSafari;
  var isH264 = location.href.match('h264');
  var isMobile = DetectRTC.isMobileDevice;

  var send = options.send;
  var onRemoteStream = options.onRemoteStream;
  var localStream = null;
  var peer = null; // offer or answer peer
  var iceServers = {
    // 'iceTransportPolicy': 'relay',
    'iceServers': [
      {
        'urls': [
          'stun:stun.l.google.com:19302',
          'stun:stun1.l.google.com:19302',
          'stun:stun2.l.google.com:19302'
        ]
      },
      {
        'urls': [
          'turn:107.150.19.220:3478'
        ],
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

  // edge is not supported
  if (isEdge) {
    peerConnectionOptions = {};
    mediaConstraints = {};
  }


  /**
   * getUserMedia
   */
  function getUserMedia(callback, isOffer) {
    console.log('getUserMedia');

    navigator.getUserMedia({
      audio: true,
      video: {
        mandatory: {
          // 720p와 360p 해상도 최소 최대를 잡게되면 캡쳐 영역이 가깝게 잡히는 이슈가 있다.
          // 1920 * 1080 | 1280 * 720 | 858 * 480 | 640 * 360 | 480 * 272 | 320 * 180
          maxWidth: 1920,
          maxHeight: 1080,
          maxFrameRate: 24,
          minAspectRatio: 1.777
        },
        optional: [
          {googNoiseReduction: true}, // Likely removes the noise in the captured video stream at the expense of computational effort.
          {facingMode: "user"}        // Select the front/user facing camera or the rear/environment facing camera if available (on Phone)
        ]
      }
    }, function(stream) {
      localStream = stream;
      callback && callback(localStream);

      if (isOffer) {
        createPeerConnection();
        createOffer();
      }
    }, function(error) {
      console.error('Error getUserMedia', error);
    });
  }

  /**
   * SDP 변경 함수
   * @param SDP
   * @returns {*}
   */
  function editSDP(SDP) {
    console.log('editSDP', SDP);

    SDP.sdp = SDP.sdp.replace("96 98 100", "100 96 98"); // for chrome 57 <
    SDP.sdp = SDP.sdp.replace("96 97 98 99 100 101 102", "100 101 102 96 97 98 99"); // for chrome 65 <

    console.log('return editSDP', SDP);
    return SDP;
  }

  /**
   * createOffer
   * offer SDP를 생성 한다.
   */
  function createOffer() {
    console.log('createOffer', arguments);

    peer.addStream(localStream); // addStream 제외시 recvonly로 SDP 생성됨
    peer.createOffer(function(SDP) {
      if (isH264) {
        SDP = editSDP(SDP);
      }

      peer.setLocalDescription(SDP);
      console.log("Sending offer description", SDP);
      send({
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

    peer.addStream(localStream);
    peer.setRemoteDescription(new RTCSessionDescription(msg.sdp), function() {
      peer.createAnswer(function(SDP) {
        if (isH264) {
          SDP = editSDP(SDP);
        }
        peer.setLocalDescription(SDP);
        console.log("Sending answer to peer.", SDP);

        send({
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
      onRemoteStream(event.stream);
    };

    peer.onremovestream = function(event) {
      console.log("Removing remote stream", event);
    };

    peer.onnegotiationneeded = function(event) {
      console.log("onnegotiationneeded", event);
    };

    peer.onsignalingstatechange = function(event) {
      console.log("onsignalingstatechange", event);
    };

    peer.oniceconnectionstatechange = function(event) {
      console.log("oniceconnectionstatechange",
        'iceGatheringState: ' + peer.iceGatheringState,
        '/ iceConnectionState: ' + peer.iceConnectionState);
    }
  }

  /**
   * onSdpError
   */
  function onSdpError() {
    console.log('onSdpError', arguments);
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
   * signaling
   * @param {object} data
   */
  function signaling(data) {
    console.log('onmessage', data);

    var msg = data;
    var sdp = msg.sdp || null;

    // 접속자가 보내온 offer처리
    if (sdp) {
      if (sdp.type === 'offer') {
        createPeerConnection();
        console.log('Adding local stream...');

        createAnswer(msg);

        // offer에 대한 응답 처리
      } else if (sdp.type === 'answer') {
        // answer signaling
        peer.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      }

      // offer, answer cadidate처리
    } else if (msg.candidate) {
      var candidate = new RTCIceCandidate({
        sdpMid: msg.id,
        sdpMLineIndex: msg.label,
        candidate: msg.candidate
      });

      peer.addIceCandidate(candidate);
    } else {
      //console.log()
    }
  }

  /**
   * extend interfaces
   */
  this.getUserMedia = getUserMedia;
  this.signaling = signaling;
}


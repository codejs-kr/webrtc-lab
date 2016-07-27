/*!
간략한 시나리오.
1. offer가 SDP와 candidate전송
2. answer는 offer가 보낸 SDP와 cadidate를 Set한다.
3. answer는 응답할 SDP와 candidate를 얻어서 offer한테 전달한다.
4. offer는 응답 받은 SDP와 candidate를 Set한다.
*/

$(function() {
  console.log('Loaded webrtc');

  var socket = io();
  var channel = 'K62QFPG0-DC';
  var userID = Math.round(Math.random() * 999999999) + 999999999;
  var isOffer = location.hash.match('offer');
  var myStream = null;
  var peer = null; // offer or answer peer
  var iceServers = {
    'iceServers': [{
      'url': 'stun:stun.l.google.com:19302'
    }, {
      'url': 'turn:107.150.19.220:3478',
      'credential': 'turnserver',
      'username': 'subrosa'
    }]
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

  /**
  * getUserMedia
  */
  function getUserMedia() {
    console.log('getUserMedia');

    navigator.webkitGetUserMedia({
      audio: true,
      video: true
    }, function(stream) {
      myStream = stream;
      $("body").append('<video width="320" height="240" muted="muted" autoplay="true" src="' + URL.createObjectURL(myStream) + '"></video>');

      if (isOffer) {
        alert('오퍼');
        createPeerConnection();
        createOffer();
      }
    }, function() {
      console.error('Error in my stream');
    });
  }

  /**
  * createOffer
  * offer SDP를 생성 한다.
  */
  function createOffer() {
    console.log('createOffer', arguments);

    peer.addStream(myStream); // addStream 제외시 recvonly로 SDP 생성됨
    peer.createOffer(function(SDP) {
      peer.setLocalDescription(SDP);
      console.log("Sending offer description", SDP);
      send({
        sender: userID,
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

    peer.addStream(myStream);
    peer.setRemoteDescription(new RTCSessionDescription(msg.sdp), function() {
      peer.createAnswer(function(SDP) {
        peer.setLocalDescription(SDP);
        console.log("Sending answer to peer.", SDP);
        send({
          sender: userID,
          to: 'all',
          sdp: SDP
        });
      }, onSdpError, mediaConstraints);
    });
  }

  /**
  * createPeerConnection
  * offer, answer 공통 메서드
  */
  function createPeerConnection() {
    console.log('createPeerConnection');

    peer = new webkitRTCPeerConnection(iceServers, peerConnectionOptions);
    console.log('peer', peer);

    peer.onicecandidate = function(event) {
      if (event.candidate) {
        send({
          userID: userID,
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
      $("body").append('<video id="remote-video" width="320" height="240" autoplay="true" src="' + URL.createObjectURL(event.stream) + '"></video>');
    };

    peer.onremovestream = function(event) {
      console.log("Removing remote stream", event);
    };
  }

  function send(data) {
    console.log('send', data);
    socket.send(data);
  }

  function onmessage(data) {
    console.log('onmessage', data);
    var msg = data;
    var sdp = msg.sdp || null;

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
    }
  }

  function onSdpError() {
    console.log('onSdpError', arguments);
  }

  function initialize() {
    getUserMedia();

    socket.emit('joinRoom', channel, userID);
    socket.on('message', function(data) {
      onmessage(data);
    });
  }
  initialize();
});

/**
 * PeerHandler
 * @param options
 * @constructor
 */
function PeerHandler(options) {
  console.log('Loaded PeerHandler', arguments);
  EventEmitter.call(this);

  // Cross browsing
  const RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
  const RTCSessionDescription =
    window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;
  const RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate || window.webkitRTCIceCandidate;
  const browserVersion = DetectRTC.browser.version;
  const isEdge = DetectRTC.browser.isEdge && browserVersion >= 15063; // 15버전 이상

  const that = this;
  const send = options.send;
  const iceServers = {
    iceServers: [
      {
        urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
      },
      {
        urls: ['turn:107.150.19.220:3478'],
        credential: 'turnserver',
        username: 'subrosa',
      },
    ],
  };

  let localStream = null;
  let peer = null; // offer or answer peer
  let peerConnectionOptions = {
    optional: [{ DtlsSrtpKeyAgreement: 'true' }],
  };
  let mediaConstraints = {
    mandatory: {
      OfferToReceiveAudio: true,
      OfferToReceiveVideo: true,
    },
  };

  // edge is not supported
  if (isEdge) {
    peerConnectionOptions = {};
    mediaConstraints = {};
  }

  /**
   * getUserMedia
   */
  async function getUserMedia(mediaOption, isOffer) {
    console.log('getUserMedia');

    try {
      localStream = await navigator.mediaDevices.getUserMedia(mediaOption);

      if (isOffer) {
        peer = createPeerConnection();
        createOffer(peer);
      }
    } catch (error) {
      console.error('Error getUserMedia', error);
    }

    return localStream;
  }

  /**
   * offer SDP를 생성 한다.
   */
  function createOffer(peer) {
    console.log('createOffer', arguments);

    if (localStream) {
      addTrack(peer, localStream); // addTrack 제외시 recvonly로 SDP 생성됨
    }

    peer.createOffer(
      (SDP) => {
        peer.setLocalDescription(SDP);
        console.log('Sending offer description', SDP);

        send({
          to: 'all',
          sdp: SDP,
        });
      },
      onSdpError,
      mediaConstraints
    );
  }

  /**
   * offer에 대한 응답 SDP를 생성 한다.
   * @param peer
   * @param msg offer가 보내온 signaling massage
   */
  function createAnswer(peer, msg) {
    console.log('createAnswer', arguments);

    if (localStream) {
      addTrack(peer, localStream);
    }

    peer
      .setRemoteDescription(new RTCSessionDescription(msg.sdp))
      .then(() => {
        peer
          .createAnswer()
          .then((SDP) => {
            peer.setLocalDescription(SDP);
            console.log('Sending answer to peer.', SDP);

            send({
              to: 'all',
              sdp: SDP,
            });
          })
          .catch(onSdpError);
      })
      .catch((error) => {
        console.error('Error setRemoteDescription', error);
      });
  }

  /**
   * createPeerConnection
   * offer, answer 공통 함수로 peer를 생성하고 관련 이벤트를 바인딩 한다.
   */
  function createPeerConnection() {
    console.log('createPeerConnection', arguments);

    peer = new RTCPeerConnection(iceServers, peerConnectionOptions);
    console.log('new peer', peer);

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        send({
          to: 'all',
          label: event.candidate.sdpMLineIndex,
          id: event.candidate.sdpMid,
          candidate: event.candidate.candidate,
        });
      } else {
        console.info('Candidate denied', event.candidate);
      }
    };

    /**
     * 크로스브라우징
     */
    if (peer.ontrack) {
      peer.ontrack = (event) => {
        console.log('ontrack', event);
        const stream = event.streams[0];
        that.emit('addRemoteStream', stream);
      };

      peer.onremovetrack = (event) => {
        console.log('onremovetrack', event);
        const stream = event.streams[0];
        that.emit('removeRemoteStream', stream);
      };
      // 삼성 모바일에서 필요
    } else {
      peer.onaddstream = (event) => {
        console.log('onaddstream', event);
        that.emit('addRemoteStream', event.stream);
      };

      peer.onremovestream = (event) => {
        console.log('onremovestream', event);
        that.emit('removeRemoteStream', event.stream);
      };
    }

    peer.onnegotiationneeded = (event) => {
      console.log('onnegotiationneeded', event);
    };

    peer.onsignalingstatechange = (event) => {
      console.log('onsignalingstatechange', event);
    };

    peer.oniceconnectionstatechange = (event) => {
      console.log(
        'oniceconnectionstatechange',
        `iceGatheringState: ${peer.iceGatheringState} / iceConnectionState: ${peer.iceConnectionState}`
      );

      that.emit('iceconnectionStateChange', event);
    };

    return peer;
  }

  /**
   * onSdpError
   */
  function onSdpError() {
    console.log('onSdpError', arguments);
  }

  /**
   * addStream 이후 스펙 적용 (크로스브라우징)
   * 스트림을 받아서 PeerConnection track과 stream을 추가 한다.
   * @param peer
   * @param stream
   */
  function addTrack(peer, stream) {
    if (peer.addTrack) {
      stream.getTracks().forEach((track) => {
        peer.addTrack(track, stream);
      });
    } else {
      peer.addStream(stream);
    }
  }

  /**
   * removeStream 이후 스펙 적용 (크로스브라우징)
   * @param peer
   * @param stream
   */
  function removeTrack(peer, stream) {
    if (peer.removeTrack) {
      stream.getTracks().forEach((track) => {
        const sender = peer.getSenders().find((s) => s.track === track);
        if (sender) {
          peer.removeTrack(sender);
        }
      });
    } else {
      peer.removeStream(stream);
    }
  }

  /**
   * signaling
   * @param data
   */
  function signaling(data) {
    console.log('onmessage', data);

    const msg = data;
    const sdp = msg.sdp || null;

    // 접속자가 보내온 offer처리
    if (sdp) {
      if (sdp.type === 'offer') {
        peer = createPeerConnection();
        createAnswer(peer, msg);

        // offer에 대한 응답 처리
      } else if (sdp.type === 'answer') {
        peer.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      }

      // offer or answer cadidate처리
    } else if (msg.candidate) {
      const candidate = new RTCIceCandidate({
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
   * extends
   */
  this.getUserMedia = getUserMedia;
  this.signaling = signaling;
}

inherit(EventEmitter, PeerHandler);

import EventEmitter from '/js/lib/eventemitter.js';
import inherit from '/js/lib/inherit.js';
import { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, getDefaultIceServers } from '/js/helpers/rtc.js';

/**
 * PeerHandler
 * @param options
 * @constructor
 */
function PeerHandler(options) {
  console.log('Loaded PeerHandler', arguments);
  EventEmitter.call(this);

  const that = this;
  const send = options.send;
  const peerConnectionConfig = {
    iceServers: options.iceServers || getDefaultIceServers(),
  };

  let peer = null; // peer connection instance (offer or answer peer)
  let localStream = null;
  let resolution = {
    width: 1280,
    height: 720,
  };

  /**
   * 미디어 접근 후 커넥션 요청
   */
  async function getUserMedia(constraints) {
    console.log('getUserMedia');

    try {
      localStream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      return new Promise((_, reject) => reject(error));
    }

    return localStream;
  }

  /**
   * 커넥션 오퍼 전송을 시작을 합니다.
   */
  function startRtcConnection() {
    peer = createPeerConnection();
    createOffer(peer);
  }

  /**
   * offer SDP를 생성 한다.
   */
  function createOffer(peer) {
    console.log('createOffer', arguments);

    if (localStream) {
      addTrack(peer, localStream); // addTrack 제외시 recvonly로 SDP 생성됨
    }

    peer
      .createOffer()
      .then((SDP) => {
        peer.setLocalDescription(SDP);
        console.log('Sending offer description', SDP);

        send({
          to: 'all',
          sdp: SDP,
        });
      })
      .catch((error) => {
        console.error('Error createOffer', error);
      });
  }

  /**
   * offer에 대한 응답 SDP를 생성 한다.
   * @param peer
   * @param msg offer가 보내온 signaling massage
   */
  function createAnswer(peer, offerSdp) {
    console.log('createAnswer', arguments);

    if (localStream) {
      addTrack(peer, localStream);
    }

    peer
      .setRemoteDescription(new RTCSessionDescription(offerSdp))
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
          .catch((error) => {
            console.error('Error createAnswer', error);
          });
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

    peer = new RTCPeerConnection(peerConnectionConfig);
    console.log('New peer ', peer);

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
   * 전송중인 영상 해상도를 다이나믹하게 변경합니다.
   */
  function changeResolution() {
    localStream.getVideoTracks().forEach((track) => {
      console.log('changeResolution', track, track.getConstraints(), track.applyConstraints);

      if (resolution.height > 90) {
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

      track.applyConstraints(resolution).then(() => {
        console.log('changeResolution result', track.getConstraints());
      });
    });
  }

  /**
   * signaling
   * @param data
   */
  function signaling(data) {
    console.log('signaling', data);

    const sdp = data?.sdp;
    const candidate = data?.candidate;

    // 접속자가 보내온 offer처리
    if (sdp) {
      if (sdp.type === 'offer') {
        peer = createPeerConnection();
        createAnswer(peer, sdp);

        // offer에 대한 응답 처리
      } else if (sdp.type === 'answer') {
        peer.setRemoteDescription(new RTCSessionDescription(sdp));
      }

      // offer or answer cadidate처리
    } else if (candidate) {
      const iceCandidate = new RTCIceCandidate({
        sdpMid: data.id,
        sdpMLineIndex: data.label,
        candidate: candidate,
      });

      peer.addIceCandidate(iceCandidate);
    } else {
      // do something
    }
  }

  /**
   * extends
   */
  this.getUserMedia = getUserMedia;
  this.startRtcConnection = startRtcConnection;
  this.signaling = signaling;
  this.changeResolution = changeResolution;
}

inherit(EventEmitter, PeerHandler);

export default PeerHandler;

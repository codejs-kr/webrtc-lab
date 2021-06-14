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

  const CHUNK_SIZE = 16384; // 16kb (1024 * 16)
  const BINARY_TYPE = 'arraybuffer';
  let peer = null; // peer connection instance (offer or answer peer)
  let sendChannel = null;
  let receiveChannel = null;
  let fileReader = null;

  /**
   * 커넥션 오퍼 전송을 시작을 합니다.
   */
  function startRtcConnection() {
    peer = createPeerConnection();
    createOffer(peer);
  }

  /**
   * offer SDP를 생성 후 전송합니다.
   */
  function createOffer(peer) {
    console.log('createOffer', arguments);

    peer
      .createOffer()
      .then((SDP) => {
        peer.setLocalDescription(SDP);
        console.log('Send offer sdp to peer', SDP);

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
   * offer에 대한 응답 SDP를 생성 후 전송합니다.
   * @param peer
   * @param msg offer가 보내온 signaling massage
   */
  function createAnswer(peer, offerSdp) {
    console.log('createAnswer', arguments);

    peer
      .setRemoteDescription(new RTCSessionDescription(offerSdp))
      .then(() => {
        peer
          .createAnswer()
          .then((SDP) => {
            peer.setLocalDescription(SDP);
            console.log('Send answer sdp to peer', SDP);

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
    sendChannel = peer.createDataChannel('sendDataChannel');
    sendChannel.binaryType = BINARY_TYPE;
    console.log('Created send data channel');

    sendChannel.addEventListener('open', onSendChannelStateChange);
    sendChannel.addEventListener('close', onSendChannelStateChange);
    sendChannel.addEventListener('error', onErrorDataChannel);
    peer.addEventListener('datachannel', bindReceiveChannel);

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

    peer.onnegotiationneeded = (event) => {
      console.log('onnegotiationneeded', event);
    };

    peer.onsignalingstatechange = (event) => {
      console.log('onsignalingstatechange', event);
    };

    peer.oniceconnectionstatechange = (event) => {
      console.log(
        'oniceConnectionStateChange',
        `iceGatheringState: ${peer.iceGatheringState} / iceConnectionState: ${peer.iceConnectionState}`
      );

      that.emit('iceConnectionStateChange', event);
    };

    return peer;
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
   * 파일 정보를 데이터 채널을 통해 전송합니다
   */
  function sendData(file) {
    // send file info
    sendChannel.send(
      JSON.stringify({
        fileInfo: {
          name: file.name,
          size: file.size,
          type: file.type,
        },
      })
    );

    // slice file and send file data
    let offset = 0;
    fileReader = new FileReader();
    fileReader.addEventListener('error', (error) => console.error('Error reading file:', error));
    fileReader.addEventListener('abort', (event) => console.log('File reading aborted:', event));
    fileReader.addEventListener('load', (e) => {
      console.log('FileRead.onload', e.target.result);
      sendChannel.send(e.target.result);
      offset += e.target.result.byteLength;
      that.emit('sendDataChannelProgress', offset);

      if (offset < file.size) {
        readSlice(offset);
      }
    });

    const readSlice = (offset) => {
      const slice = file.slice(offset, offset + CHUNK_SIZE);
      fileReader.readAsArrayBuffer(slice);
    };
    readSlice(0);
  }

  function bindReceiveChannel(event) {
    console.log('bindReceiveChannel', event.channel);

    receiveChannel = event.channel;
    receiveChannel.onmessage = (event) => {
      that.emit('receiveDataChannel', event);
    };
  }

  function onSendChannelStateChange(event) {
    console.log('onSendChannelStateChange ', event);
    that.emit('sendChannelStateChange', event);
  }

  function onErrorDataChannel(error) {
    console.log('onErrorDataChannel ', error);
    that.emit('errorDataChannel', error);
  }

  function getPeer() {
    console.log('getPeer', peer);
    return peer;
  }

  /**
   * extends
   */
  this.startRtcConnection = startRtcConnection;
  this.signaling = signaling;
  this.sendData = sendData;
  this.getPeer = getPeer;
}

inherit(EventEmitter, PeerHandler);

export default PeerHandler;

import EventEmitter from '/js/lib/eventemitter.js';
import inherit from '/js/lib/inherit.js';

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
  let resolution = {
    width: 1280,
    height: 720,
  };
  let peer = null; // offer or answer peer
  let peerConnectionOptions = {
    optional: [{ DtlsSrtpKeyAgreement: 'true' }],
  };

  let sendChannel = null;
  let receiveChannel = null;
  let fileReader = null;

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
        console.error('Error setLocalDescription', error);
      });
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

    sendChannel = peer.createDataChannel('sendDataChannel');
    sendChannel.binaryType = 'arraybuffer';
    console.log('Created send data channel');

    sendChannel.addEventListener('open', onSendChannelStateChange);
    sendChannel.addEventListener('close', onSendChannelStateChange);
    sendChannel.addEventListener('error', onError);

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

  function sendData() {
    const file = fileInput.files[0];
    console.log(`File is ${[file.name, file.size, file.type, file.lastModified].join(' ')}`);

    // Handle 0 size files.
    statusMessage.textContent = '';
    downloadAnchor.textContent = '';
    if (file.size === 0) {
      bitrateDiv.innerHTML = '';
      statusMessage.textContent = 'File is empty, please select a non-empty file';
      closeDataChannels();
      return;
    }
    sendProgress.max = file.size;
    receiveProgress.max = file.size;
    const chunkSize = 16384;
    fileReader = new FileReader();
    let offset = 0;
    fileReader.addEventListener('error', (error) => console.error('Error reading file:', error));
    fileReader.addEventListener('abort', (event) => console.log('File reading aborted:', event));
    fileReader.addEventListener('load', (e) => {
      console.log('FileRead.onload ', e);
      sendChannel.send(e.target.result);
      offset += e.target.result.byteLength;
      sendProgress.value = offset;
      if (offset < file.size) {
        readSlice(offset);
      }
    });

    const readSlice = (o) => {
      console.log('readSlice ', o);
      const slice = file.slice(offset, o + chunkSize);
      fileReader.readAsArrayBuffer(slice);
    };
    readSlice(0);
  }

  function closeDataChannels() {
    console.log('Closing data channels');
    sendChannel.close();
    console.log(`Closed data channel with label: ${sendChannel.label}`);
    sendChannel = null;

    if (receiveChannel) {
      receiveChannel.close();
      console.log(`Closed data channel with label: ${receiveChannel.label}`);
      receiveChannel = null;
    }
    localConnection.close();
    remoteConnection.close();
    localConnection = null;
    remoteConnection = null;
    console.log('Closed peer connections');

    // re-enable the file select
    fileInput.disabled = false;
    abortButton.disabled = true;
    sendFileButton.disabled = false;
  }

  function onSendChannelStateChange() {
    console.log('onSendChannelStateChange :>> ');
    if (sendChannel) {
      const { readyState } = sendChannel;
      console.log(`Send channel state is: ${readyState}`);
      if (readyState === 'open') {
        sendData();
      }
    }
  }

  async function onReceiveChannelStateChange() {
    console.log('onSendChannelStateChange :>> ');
    if (receiveChannel) {
      const readyState = receiveChannel.readyState;
      console.log(`Receive channel state is: ${readyState}`);
      if (readyState === 'open') {
        timestampStart = new Date().getTime();
        timestampPrev = timestampStart;
        statsInterval = setInterval(displayStats, 500);
        await displayStats();
      }
    }
  }

  function onError(error) {
    if (sendChannel) {
      console.error('Error in sendChannel:', error);
      return;
    }
    console.log('Error in sendChannel which is already closed:', error);
  }

  // display bitrate statistics.
  async function displayStats() {
    console.log('displayStats :>> ');
  }

  /**
   * extends
   */
  this.getUserMedia = getUserMedia;
  this.signaling = signaling;
  this.changeResolution = changeResolution;
}

inherit(EventEmitter, PeerHandler);

export default PeerHandler;

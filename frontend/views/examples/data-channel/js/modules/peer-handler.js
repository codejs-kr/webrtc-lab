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
  let peer = null; // offer or answer peer
  let peerConnectionOptions = {
    optional: [{ DtlsSrtpKeyAgreement: 'true' }],
  };

  let sendChannel = null;
  let receiveChannel = null;
  let fileReader = null;

  let receiveBuffer = [];
  let receivedSize = 0;
  let fileInfo = null;

  let bytesPrev = 0;
  let timestampPrev = 0;
  let timestampStart;
  let statsInterval = null;

  const bitrateDiv = document.querySelector('#bitrate');
  const downloadAnchor = document.querySelector('#download');
  const sendProgress = document.querySelector('#sendProgress');
  const receiveProgress = document.querySelector('#receiveProgress');
  const statusMessage = document.querySelector('#status');

  const $fileInput = document.querySelector('#file');

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
    peer.addEventListener('datachannel', receiveChannelCallback);

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

  function sendData(file) {
    console.log(`File is ${[file.name, file.size, file.type, file.lastModified].join(' ')}`);

    statusMessage.textContent = '';
    if (file.size === 0) {
      bitrateDiv.innerHTML = '';
      statusMessage.textContent = 'File is empty, please select a non-empty file';
      return;
    }

    // set file size
    sendProgress.max = file.size;

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
    const chunkSize = 16384; // 16kb (1024 * 16)
    let offset = 0;
    fileReader = new FileReader();
    fileReader.addEventListener('error', (error) => console.error('Error reading file:', error));
    fileReader.addEventListener('abort', (event) => console.log('File reading aborted:', event));
    fileReader.addEventListener('load', (e) => {
      console.log('FileRead.onload ', e.target.result);
      sendChannel.send(e.target.result);
      offset += e.target.result.byteLength;
      sendProgress.value = offset;

      if (offset < file.size) {
        readSlice(offset);
      }
    });

    const readSlice = (offset) => {
      console.log('readSlice ', offset);
      const slice = file.slice(offset, offset + chunkSize);
      fileReader.readAsArrayBuffer(slice);
    };
    readSlice(0);
  }

  function receiveChannelCallback(event) {
    console.log('Receive Channel Callback', event.channel);

    receiveChannel = event.channel;
    receiveChannel.onmessage = onReceiveMessageCallback;

    receivedSize = 0;
    downloadAnchor.textContent = '';
    downloadAnchor.removeAttribute('download');

    if (downloadAnchor.href) {
      URL.revokeObjectURL(downloadAnchor.href);
      downloadAnchor.removeAttribute('href');
    }
  }

  async function onReceiveMessageCallback(event) {
    console.log(`Received Message`, event);

    // 최초 전송 파일 정보 설정
    if (typeof event.data === 'string' && event.data.match('fileInfo')) {
      fileInfo = JSON.parse(event.data).fileInfo;
      console.log('fileInfo :>> ', fileInfo);

      timestampStart = new Date().getTime();
      timestampPrev = timestampStart;
      statsInterval = setInterval(displayStats, 500);
      await displayStats();
      return;
    }

    receiveBuffer.push(event.data);
    receivedSize += event.data.byteLength;

    receiveProgress.max = fileInfo.size;
    receiveProgress.value = receivedSize;

    // we are assuming that our signaling protocol told
    // about the expected file size (and name, hash, etc).
    if (receivedSize === fileInfo.size) {
      console.log('Complete received file :>> ', fileInfo);
      const received = new Blob(receiveBuffer);
      downloadAnchor.href = URL.createObjectURL(received);
      downloadAnchor.download = fileInfo.name;
      downloadAnchor.textContent = `Click to download '${fileInfo.name}' (${fileInfo.size.toLocaleString()} bytes)`;
      downloadAnchor.style.display = 'block';

      const bitrate = Math.round((receivedSize * 8) / (new Date().getTime() - timestampStart));
      bitrateDiv.innerHTML = `<strong>Average Bitrate:</strong> ${bitrate.toLocaleString()} kbits/sec`;

      if (statsInterval) {
        clearInterval(statsInterval);
        statsInterval = null;
      }

      // reset
      receiveBuffer = [];
      receivedSize = 0;
      fileInfo = null;
    }
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
  }

  function onSendChannelStateChange(event) {
    console.log('onSendChannelStateChange :>> ', event);
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
    if (peer?.iceConnectionState === 'connected') {
      const stats = await peer.getStats();
      let activeCandidatePair;

      stats.forEach((report) => {
        if (report.type === 'transport') {
          activeCandidatePair = stats.get(report.selectedCandidatePairId);
        }
      });

      if (activeCandidatePair) {
        if (timestampPrev === activeCandidatePair.timestamp) {
          return;
        }

        // calculate current bitrate
        const bytesNow = activeCandidatePair.bytesReceived;
        const bitrate = Math.round(((bytesNow - bytesPrev) * 8) / (activeCandidatePair.timestamp - timestampPrev));
        bitrateDiv.innerHTML = `<strong>Current Bitrate:</strong> ${bitrate.toLocaleString()} kbits/sec`;
        timestampPrev = activeCandidatePair.timestamp;
        bytesPrev = bytesNow;
      }
    }
  }

  /**
   * extends
   */
  this.startRtcConnection = startRtcConnection;
  this.signaling = signaling;
  this.sendData = sendData;
}

inherit(EventEmitter, PeerHandler);

export default PeerHandler;

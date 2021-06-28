import PeerHandler from './modules/peer-handler.js';
import { setRoomToken, getRoomId, getUserId } from '/js/utils.js';

/*!
 *
 * WebRTC Lab
 * @author dodortus (dodortus@gmail.com)
 * @homepage https://github.com/dodortus/webrtc-lab
 */

const socket = io();
const peerHandler = new PeerHandler({ send });

// connection info
let roomId;
let userId;
let remoteUserId;

// data info
let fileInfo = null;
let receiveBuffer = [];
let receivedSize = 0;

// analysis info
let bytesPrev = 0;
let timestampPrev = 0;
let timestampStart = 0;
let statsInterval = null;

// DOM
const $body = document.body;
const $file = document.querySelector('#file');
const $btnSend = document.querySelector('#btn-send');
const $download = document.querySelector('#download');
const $sendProgress = document.querySelector('#send-progress');
const $receiveProgress = document.querySelector('#receive-progress');
const $bitrate = document.querySelector('#bitrate');
const $status = document.querySelector('#status');

/**
 * 입장 후 다른 참여자 발견시 호출
 */
function onDetectUser() {
  console.log('onDetectUser');

  $btnSend.disabled = false;
  $body.classList.add('connected');
}

/**
 * 참석자 핸들링
 * @param roomId
 * @param userList
 */
function onJoin(roomId, { userInfo, participants }) {
  console.log('onJoin', roomId, userInfo, participants);

  if (Object.size(participants) >= 2) {
    onDetectUser();
  }

  if (userInfo?.userId !== userId) {
    peerHandler.startRtcConnection();
  }
}

/**
 * 이탈자 핸들링
 * @param userId
 */
function onLeave({ userInfo }) {
  console.log('onLeave', arguments);

  if (remoteUserId === userInfo.userId) {
    remoteUserId = null;
    $body.classList.remove('connected');
    $btnSend.disabled = true;
  }
}

/**
 * 소켓 메세지 핸들링
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
 * 소켓 메시지 전송
 * @param data
 */
function send(data) {
  console.log('send', arguments);

  data.roomId = roomId;
  data.sender = userId;
  socket.send(data);
}

/**
 * 파일 전송 요청
 * @param file
 */
function sendFile(file) {
  console.log(`File is ${[file.name, file.size, file.type, file.lastModified].join(' ')}`);

  peerHandler.sendData(file);

  // set file size
  $status.textContent = '';
  $sendProgress.max = file.size;
}

/**
 * 파일 인풋 예외처리
 */
function bindFileInputChange() {
  const file = $file.files[0];

  if (!$body.classList.contains('connected')) {
    return;
  }

  if (!file || file?.size === 0) {
    $status.textContent = 'File is empty, please select a non-empty file';
    $btnSend.disabled = true;
    return;
  } else {
    $btnSend.disabled = false;
  }
}

/**
 * 다운로드 버튼 정보 초기화
 */
function resetDownloadButton() {
  console.log('resetDownloadButton');
  $download.textContent = '';
  $download.removeAttribute('download');

  if ($download.href) {
    URL.revokeObjectURL($download.href);
    $download.removeAttribute('href');
  }
}

/**
 * 수신 데이터 핸들링
 * @param {*} event
 * @returns
 */
async function onReceiveDataChannel(event) {
  console.log('onReceiveDataChannel', event);

  // 최초 전송 파일 정보 설정
  if (typeof event.data === 'string' && event.data.match('fileInfo')) {
    fileInfo = JSON.parse(event.data).fileInfo;
    timestampStart = new Date().getTime();
    timestampPrev = timestampStart;
    receivedSize = 0;
    resetDownloadButton();
    statsInterval = setInterval(displayStats, 100);
    displayStats();
    return;
  }

  receiveBuffer.push(event.data);
  receivedSize += event.data.byteLength;

  $receiveProgress.max = fileInfo.size;
  $receiveProgress.value = receivedSize;

  // we are assuming that our signaling protocol told
  // about the expected file size (and name, hash, etc).
  if (receivedSize === fileInfo.size) {
    console.log('Complete received file', fileInfo);
    const receivedFile = new Blob(receiveBuffer);
    $download.href = URL.createObjectURL(receivedFile);
    $download.download = fileInfo.name;
    $download.textContent = `Click to download '${fileInfo.name}' (${fileInfo.size.toLocaleString()} bytes)`;
    $download.style.display = 'block';

    const bitrate = Math.round((receivedSize * 8) / (new Date().getTime() - timestampStart));
    $bitrate.innerHTML = `<strong>Average Bitrate:</strong> ${bitrate.toLocaleString()} kbits/sec`;

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

/**
 * 수신 비트레이트 측정
 */
async function displayStats() {
  const peer = peerHandler.getPeer();
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
    $bitrate.innerHTML = `<strong>Current Bitrate:</strong> ${bitrate.toLocaleString()} kbits/sec`;
    timestampPrev = activeCandidatePair.timestamp;
    bytesPrev = bytesNow;
  }
}

/**
 * 전송 진척도 표시
 */
function onSendingProgress(value) {
  $sendProgress.value = value;
}

/**
 * DOM 이벤트 바인딩
 */
function bindDomEvent() {
  $file.addEventListener('change', bindFileInputChange);
  $btnSend.addEventListener('click', () => sendFile($file.files[0]));
}

/**
 * peer 이벤트 바인딩
 */
function bindPeerEvent() {
  peerHandler.on('sendDataChannelProgress', onSendingProgress);
  peerHandler.on('receiveDataChannel', onReceiveDataChannel);
}

/**
 * 웹소켓 이벤트 바인딩
 */
function bindSocketEvent() {
  socket.emit('enter', roomId, { userId });
  socket.on('join', onJoin);
  socket.on('leave', onLeave);
  socket.on('message', onMessage);
}

/**
 * 초기 설정
 */
function initialize() {
  setRoomToken();
  roomId = getRoomId();
  userId = getUserId();

  // 이벤트 바인딩
  bindDomEvent();
  bindSocketEvent();
  bindPeerEvent();
}

initialize();

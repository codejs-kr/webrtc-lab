import PeerHandler from './modules/peer-handler.js';
import MediaHandler from './modules/media-handler.js';

/*!
 *
 * WebRTC Lab
 * @author dodortus (dodortus@gmail.com / codejs.co.kr)
 *
 */
const socket = io();
const mediaHandler = new MediaHandler();
const peerHandler = new PeerHandler({ send });
const isSafari = DetectRTC.browser.isSafari;
const isMobile = DetectRTC.isMobileDevice;

let roomId;
let userId;
let remoteUserId;

// DOM
const $body = document.body;
const $createWrap = document.querySelector('#create-wrap');
const $waitWrap = document.querySelector('#wait-wrap');
const $videoWrap = document.querySelector('#file-wrap');
const $uniqueToken = document.querySelector('#unique-token');

const bitrateDiv = document.querySelector('#bitrate');
const downloadAnchor = document.querySelector('#download');
const sendProgress = document.querySelector('#sendProgress');
const receiveProgress = document.querySelector('#receiveProgress');
const statusMessage = document.querySelector('#status');

const $fileInput = document.querySelector('#file');
const $btnSend = document.querySelector('#btn-send');

$fileInput.addEventListener('change', handleFileInputChange, false);

function handleFileInputChange() {
  const file = $fileInput.files[0];

  if (!file) {
    console.log('No file chosen');
  } else {
    $btnSend.disabled = false;
  }
}

/**
 * 입장 후 다른 참여자 발견시 호출
 */
function onDetectUser() {
  console.log('onDetectUser');

  // TODO: 연결 UI 처리

  // $waitWrap.innerHTML = `
  //   <div class="room-info">
  //     <p>당신을 기다리고 있어요. 참여 하실래요?</p>
  //     <button id="btn-join">Join</button>
  //   </div>
  // `;

  // document.querySelector('#btn-join').addEventListener('click', (e) => {
  //   e.target.disabled = true;
  //   isOffer = true;
  //   getUserMedia();
  // });
  // $createWrap.classList.add('slideup');
}

/**
 * 참석자 핸들링
 * @param roomId
 * @param userList
 */
function onJoin(roomId, { userId: joinedUserId, participants }) {
  console.log('onJoin', roomId, userId, participants);

  if (Object.size(participants) >= 2) {
    onDetectUser();
  }

  if (userId !== joinedUserId) {
    console.log('상대방 들어옴 :>> ', joinedUserId);
    peerHandler.startRtcConnection();
  }
}

/**
 * 이탈자 핸들링
 * @param userId
 */
function onLeave(userId) {
  console.log('onLeave', arguments);

  if (remoteUserId === userId) {
    document.querySelector('#remote-video').remove();
    $body.classList.remove('connected');
    $body.classList.add('wait');
    remoteUserId = null;
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
 * 방 고유 접속 토큰 생성
 */
function setRoomToken() {
  const hashValue = (Math.random() * new Date().getTime()).toString(32).toUpperCase().replace(/\./g, '-');

  if (location.hash.length > 2) {
    $uniqueToken.href = location.href;
  } else {
    location.hash = '#' + hashValue;
  }
}

/**
 * 클립보드 복사
 */
function setClipboard() {
  $uniqueToken.addEventListener('click', () => {
    const link = location.href;

    if (window.clipboardData) {
      window.clipboardData.setData('text', link);
      alert('Copy to Clipboard successful.');
    } else {
      window.prompt('Copy to clipboard: Ctrl+C, Enter', link); // Copy to clipboard: Ctrl+C, Enter
    }
  });
}

function createVideoEl(id) {
  const $video = document.createElement('video');
  $video.id = id || 'new-video';
  $video.muted = true;
  $video.autoplay = true;

  return $video;
}

/**
 * 로컬 스트림 핸들링
 * @param stream
 */
function onLocalStream(stream) {
  console.log('onLocalStream', stream);

  const $localVideo = createVideoEl('local-video');
  $videoWrap.insertBefore($localVideo, $videoWrap.childNodes[0]);

  mediaHandler.setVideoStream({
    type: 'local',
    el: $localVideo,
    stream: stream,
  });

  $body.className = 'room wait';

  if (isMobile && isSafari) {
    mediaHandler.playForIOS($localVideo);
  }
}

/**
 * 상대방 스트림 핸들링
 * @param stream
 */
function onRemoteStream(stream) {
  console.log('onRemoteStream', stream);

  const $remoteVideo = createVideoEl('remote-video');
  $videoWrap.insertBefore($remoteVideo, $videoWrap.childNodes[0]);

  mediaHandler.setVideoStream({
    type: 'remote',
    el: $remoteVideo,
    stream: stream,
  });

  $body.classList.remove('wait');
  $body.classList.add('connected');

  if (isMobile && isSafari) {
    mediaHandler.playForIOS($remoteVideo);
  }
}

/**
 * DOM 이벤트 바인딩
 */
function bindDomEvent() {
  // document.querySelector('#btn-start').addEventListener('click', getUserMedia);
  // document.querySelector('#btn-camera')?.addEventListener('click', (e) => {
  //   const $this = e.target;
  //   $this.classList.toggle('active');
  //   mediaHandler[$this.className === 'active' ? 'pauseVideo' : 'resumeVideo']();
  // });
  // document.querySelector('#btn-mic')?.addEventListener('click', (e) => {
  //   const $this = e.target;
  //   $this.classList.toggle('active');
  //   mediaHandler[$this.className === 'active' ? 'muteAudio' : 'unmuteAudio']();
  // });

  $btnSend.addEventListener('click', () => {
    peerHandler.sendData($fileInput.files[0]);
  });
}

/**
 * 초기 설정
 */
function initialize() {
  setRoomToken();
  setClipboard();
  roomId = location.href.replace(/\/|:|#|%|\.|\[|\]/g, '');
  userId = Math.round(Math.random() * 99999);

  // 소켓 관련 이벤트 바인딩
  socket.emit('enter', roomId, userId);
  socket.on('join', onJoin);
  socket.on('leave', onLeave);
  socket.on('message', onMessage);

  // Peer 관련 이벤트 바인딩
  peerHandler.on('addRemoteStream', onRemoteStream);

  // DOM 이벤트 바인딩
  bindDomEvent();
}

initialize();

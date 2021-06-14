import PeerHandler from './modules/peer-handler.js';
import MediaHandler from './modules/media-handler.js';
import { isSafari, isMobile } from '/js/helpers/env.js';
import { setRoomToken, getRoomId, getUserId } from '/js/utils.js';

/*!
 *
 * WebRTC Lab
 * @author dodortus (dodortus@gmail.com)
 * @homepage https://github.com/dodortus/webrtc-lab
 */

const socket = io();
const mediaHandler = new MediaHandler();
const peerHandler = new PeerHandler({ send });
const mediaConstraints = {
  audio: false,
  video: {
    width: {
      ideal: 1280,
      min: 640,
      max: 1920,
    },
    height: {
      ideal: 720,
      min: 360,
      max: 1080,
    },
    frameRate: {
      ideal: 25,
    },
    // Select the front/user facing camera or the rear/environment facing camera if available (on Phone)
    facingMode: 'user',
  },
};

let roomId;
let userId;
let remoteUserId;

// DOM
const $body = document.body;
const $createWrap = document.querySelector('#create-wrap');
const $waitWrap = document.querySelector('#wait-wrap');
const $videoWrap = document.querySelector('#video-wrap');
const $uniqueToken = document.querySelector('#unique-token');

/**
 * 입장 후 다른 참여자 발견시 호출
 */
function onDetectUser() {
  console.log('onDetectUser');

  $waitWrap.innerHTML = `
    <div class="room-info">
      <p>당신을 기다리고 있어요. 참여 하실래요?</p>
      <button id="btn-join">Join</button>
    </div>
  `;

  document.querySelector('#btn-join').addEventListener('click', handleJoinRoom);
  $createWrap.classList.add('slideup');
}

/**
 * 참석자 핸들링
 * @param roomId
 * @param userList
 */
function onJoin(roomId, { userId: joinedUserId, participants }) {
  console.log('onJoin', roomId, joinedUserId, participants);

  if (Object.size(participants) >= 2) {
    onDetectUser();
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

/**
 * 로컬 스트림 핸들링
 * @param stream
 */
function onLocalStream(stream) {
  console.log('onLocalStream', stream);

  const $localVideo = mediaHandler.createVideoEl('local-video');
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

  const $remoteVideo = mediaHandler.createVideoEl('remote-video');
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
 * 카메라 이벤트 처리
 */
function handleCameraButton(e) {
  const $this = e.target;
  $this.classList.toggle('active');
  mediaHandler[$this.className === 'active' ? 'pauseVideo' : 'resumeVideo']();
}

/**
 * 오디오 이벤트 처리
 */
function handleMicButton(e) {
  const $this = e.target;
  $this.classList.toggle('active');
  mediaHandler[$this.className === 'active' ? 'muteAudio' : 'unmuteAudio']();
}

/**
 * 방장 시작 처리
 */
async function handleStartRoom() {
  const stream = await peerHandler.getUserMedia(mediaConstraints);

  if (stream) {
    onLocalStream(stream);
  }
}

/**
 * 참석자 참여 처리
 */
async function handleJoinRoom() {
  const stream = await peerHandler.getUserMedia(mediaConstraints);

  if (stream) {
    onLocalStream(stream);
    peerHandler.startRtcConnection();
  }
}

/**
 * DOM 이벤트 바인딩
 */
function bindDomEvent() {
  document.querySelector('#btn-start').addEventListener('click', handleStartRoom);
  document.querySelector('#btn-camera').addEventListener('click', handleCameraButton);
  document.querySelector('#btn-mic').addEventListener('click', handleMicButton);
  document.querySelector('#btn-change-resolution')?.addEventListener('click', peerHandler.changeResolution);
}

/**
 * 웹소켓 이벤트 바인딩
 */
function bindSocketEvent() {
  socket.emit('enter', roomId, userId);
  socket.on('join', onJoin);
  socket.on('leave', onLeave);
  socket.on('message', onMessage);
}

/**
 * peer 이벤트 바인딩
 */
function bindPeerEvent() {
  peerHandler.on('addRemoteStream', onRemoteStream);
}

/**
 * 초기 설정
 */
function initialize() {
  setRoomToken();
  setClipboard();
  roomId = getRoomId();
  userId = getUserId();

  // 이벤트 바인딩
  bindDomEvent();
  bindSocketEvent();
  bindPeerEvent();
}

initialize();

import PeerHandler from './modules/peer-handler.js';

/*!
 *
 * WebRTC Lab
 * @author dodortus (dodortus@gmail.com / codejs.co.kr)
 *
 */
const socket = io();
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

  $btnSend.disabled = false;
  $body.classList.add('connected');
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
 * 방 고유 접속 토큰 생성
 */
function setRoomToken() {
  const hashValue = (Math.random() * new Date().getTime()).toString(32).toUpperCase().replace(/\./g, '-');

  if (location.hash.length < 2) {
    location.hash = '#' + hashValue;
  }
}
/**
 * DOM 이벤트 바인딩
 */
function bindDomEvent() {
  $btnSend.addEventListener('click', () => {
    peerHandler.sendData($fileInput.files[0]);
  });
}

/**
 * 초기 설정
 */
function initialize() {
  setRoomToken();
  roomId = location.href.replace(/\/|:|#|%|\.|\[|\]/g, '');
  userId = Math.round(Math.random() * 99999);

  // 소켓 관련 이벤트 바인딩
  socket.emit('enter', roomId, userId);
  socket.on('join', onJoin);
  socket.on('leave', onLeave);
  socket.on('message', onMessage);

  // DOM 이벤트 바인딩
  bindDomEvent();
}

initialize();

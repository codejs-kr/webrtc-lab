/**
 * Websocket handler
 * @param http
 */
module.exports = (http) => {
  const io = require('socket.io')(http);
  let rooms = {};

  /**
   * SocketId로 방을 탐색 합니다.
   * @param value
   * @returns {*}
   */
  function findRoomBySocketId(value) {
    const arr = Object.keys(rooms);
    let result = null;

    for (let i = 0; i < arr.length; i++) {
      if (rooms[arr[i]][value]) {
        result = arr[i];
        break;
      }
    }

    return result;
  }

  /**
   * 소켓 연결
   */
  io.on('connection', (socket) => {
    // 룸 입장 대기 (참여자 조회)
    socket.on('gate', (roomId) => {
      socket.join(roomId); // 소켓을 특정 room에  binding합니다.

      io.sockets.in(roomId).emit('gate', roomId, {
        participants: rooms[roomId] || null,
      });
    });

    // 룸접속
    socket.on('enter', (roomId, userInfo) => {
      console.log('[서버] enter', roomId, userInfo);
      socket.join(roomId); // 소켓을 특정 room에 binding합니다.

      const userData = {
        ...userInfo,
        socketId: socket.id,
      };

      // 룸에 사용자 정보 추가
      if (!rooms[roomId]) {
        rooms[roomId] = {};
      }
      rooms[roomId][socket.id] = userData;
      let thisRoom = rooms[roomId];

      // 유저 정보 추가
      io.sockets.in(roomId).emit('join', roomId, {
        userInfo: userData,
        participants: thisRoom,
      });
    });

    /**
     * 메시지 핸들링
     */
    socket.on('message', (data) => {
      console.log('[서버] message', data);

      if (data.to === 'all') {
        // for broadcasting without me
        socket.broadcast.to(data.roomId).emit('message', data);
      } else {
        // for target user
        const targetSocketId = data.to;
        if (targetSocketId) {
          io.to(targetSocketId).emit('message', data);
        }
      }
    });

    /**
     * 연결 해제 핸들링
     */
    socket.on('disconnect', () => {
      console.log('[서버] a user disconnected', socket.id);
      const roomId = findRoomBySocketId(socket.id);

      if (roomId) {
        const userInfo = rooms[roomId][socket.id];
        delete rooms[roomId][socket.id]; // 해당 유저 제거

        // 해당룸에 유저 정보 전달
        socket.broadcast.to(roomId).emit('leave', {
          userInfo,
          participants: rooms[roomId],
        });
      }
    });
  });
};

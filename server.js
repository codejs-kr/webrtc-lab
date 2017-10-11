var	express = require('express');
var	app = express();
var	config = require('./config.json');

// for socket server
var	http = require('http').Server(app);
var	io = require('socket.io')(http);
var port = process.env.PORT || config.webserver.port;

app.set('views', __dirname + '/views');
app.engine('ejs', require('ejs').renderFile);
app.use(express.static(__dirname + '/contents'));
app.use(express.static(__dirname + '/views/examples'));

/**
 * ROUTE
 */
app.get('/', function(req, res) {
	res.render('index.ejs', {
		title: ""
	});
}).get('/intro', function(req, res) {
	res.render('intro.ejs', {
    title: "- WebRTC 소개"
  });
}).get('/get-user-media', function(req, res) {
	res.render('examples/get-user-media/index.ejs', {
    title: "- 마이크 & 캠 접근하기"
  });
}).get('/filter', function(req, res) {
	res.render('examples/filter/index.ejs', {
    title: "- 비디오에 필터 적용하기"
  });
}).get('/capture', function(req, res) {
	res.render('examples/capture/index.ejs', {
    title: "- 비디오를 이미지로 캡쳐하기"
  });
}).get('/conference', function(req, res) {
	res.render('examples/conference/index.ejs', {
    title: "- 1:1 화상회의 만들기"
  });
}).get('/screen-share', function(req, res) {
	res.render('examples/screen-share/index.ejs', {
    title: "- 1:1 스크린쉐어 만들기"
	});
}).get('/data-channel', function(req, res) {
		res.render('examples/data-channel/index.ejs', {
    title: "- 파일 & 데이터 전송하기"
  });
}).get('/speech-recognition', function(req, res) {
  res.render('examples/speech-recognition/index.ejs', {
    title: "- 음성 인식"
  });
}).get('/multi-stream', function(req, res) {
	res.render('examples/multi-stream/index.ejs', {
    title: "- 멀티 스트림"
  });
})

function findRoomBySocketId(value) {
	var arr = Object.keys(rooms);
	var result = null;
	for (var i=0; i<arr.length; i++) {
		if (rooms[arr[i]][value]) {
			result = arr[i];
			break;
		}
	}

	console.log('나간 룸', result);
	return result;
}

/**
 * SOCKET
 */
var rooms = {};
var roomId = null;
var socketIds = {};
io.on('connection', function(socket) {
  // 룸접속
  socket.on('joinRoom', function(roomName, userId) {
    roomId = roomName;
		socket.join(roomId);  // 소켓을 특정 room에 binding합니다.

		// 룸에 사용자 정보 추가
		// 이미 룸이 있는경우
		if (rooms[roomId]) {
			console.log('이미 룸이 있는 경우');
			rooms[roomId][socket.id] = userId;
		// 룸 생성 후 사용자 추가
		} else {
			console.log('룸 추가');
			rooms[roomId] = {};
			rooms[roomId][socket.id] = userId;
		}
		thisRoom = rooms[roomId];
		console.log('thisRoom', thisRoom);

		// 유저 정보 추가
    io.sockets.in(roomId).emit('joinRoom', roomId, thisRoom);
    //console.log('ROOM LIST', io.sockets.adapter.rooms);
		console.log('ROOM LIST', rooms);
  });

  // 메시징
  socket.on('message', function(data) {
    //console.log('message: ' + data);

    if (data.to == 'all') {
			// for broadcasting without me
      socket.broadcast.to(data.roomId).emit('message', data);
    } else {
      // for target user
      var targetSocketId = socketIds[data.to];
      if (targetSocketId) {
        io.to(targetSocketId).emit('message', data);
      }
    }
  });

  // socket disconnect
  socket.on('disconnect', function() {
    console.log('a user disconnected', socket.id);
		var roomId = findRoomBySocketId(socket.id);
		if (roomId) {
			socket.broadcast.to(roomId).emit('leaveRoom', rooms[roomId][socket.id]); // 자신 제외 룸안의 유저ID 전달
			delete rooms[roomId][socket.id]; // 해당 유저 제거
		}
  });
});

// server listen start
http.listen(port, function() {
  console.log('WebRTC Lab server running at ' + config.webserver.host + ':' + port);
});

var	express = require('express')
	,	app = express()
	, config = require('./config.json')
	// for socket server
  , http = require('http').Server(app)
  , io = require('socket.io')(http);
	
app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);
app.use(express.static(__dirname + '/contents'));

/**
 * ROUTE 
 */
app.get('/', function(req, res) {
	res.render('index.html', {
		title: ""
	});
});

app.get('/intro', function(req, res) {
	res.render('intro.html', {
    title: "- WebRTC 소개"
  });
}).get('/get-user-media', function(req, res) {
	res.render('get-user-media.html', {
    title: "- 마이크 & 캠 접근하기"
  });
}).get('/filter', function(req, res) {
	res.render('filter.html', {
    title: "- 비디오에 필터 적용하기"
  });
}).get('/capture', function(req, res) {
	res.render('capture.html', {
    title: "- 비디오를 이미지로 캡쳐하기"
  });
}).get('/conference', function(req, res) {
	res.render('conference.html', {
    title: "- 1:1 화상회의 만들기"
  });
}).get('/speech-recognition', function(req, res) {
  res.render('speech-recognition.html', {
    title: "- 음성 인식"
  });
});

/**
 * SOCKET 
 */
var socketIds = {};
io.on('connection', function(socket) {
  // 룸접속
  socket.on('joinRoom', function(roomNum, nickName) {
    roomId = roomNum;
    socket.join(roomId);  // 소켓을 특정 room에 binding합니다.
    
    // 유저 목록
    socketIds[nickName] = socket.id;
    io.sockets.in(roomId).emit('joinRoom', roomId, nickName, Object.keys(socketIds));
    console.log('ROOM LIST', io.sockets.adapter.rooms);
  });
  
  // 메시징
  socket.on('message', function(data) {
    //console.log('message: ' + data);
    
    if (data.to == 'all') {
      socket.broadcast.to(roomId).emit('message', data); // 자신 제외 룸안의 유저
    } else {
      // 귓속말
      var targetSocketId = socketIds[data.to];
      if (targetSocketId) {
        //io.to(targetSocketId).emit('message', data);
        io.sockets.connected[targetSocketId].emit('message', data);
      }
    }
  });

  // 소켓 연결해제
  socket.on('disconnect', function() {
    console.log('a user disconnected');
  });
});

// server listen start
http.listen(config.webserver.port, function() {
  console.log('WebRTC Lab server running at ' + config.webserver.host + ':' + config.webserver.port);
}); 
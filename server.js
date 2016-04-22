var	express = require('express')
	,	app = express()
	, config = require('./config.json');
	
app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);
app.use(express.static(__dirname + '/contents'));

app.get('/', function(req, res) {
	res.render('index.html', {
		title: ""
	});
});

app.get('/intro', function(req, res) {
	res.render('intro.html', {
    title: "- WebRTC 소개"
  });
}).get('/getUserMedia', function(req, res) {
	res.render('getUserMedia.html', {
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
});

// server listen start
app.listen(config.webserver.port, function() {
  console.log('WebRTC Lab server running at ' + config.webserver.host + ':' + config.webserver.port);
}); 
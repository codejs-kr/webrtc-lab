var	express = require('express')
	,	app = express()
	, config = require('./config.json');
	
app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);
app.use(express.static(__dirname + '/contents'));

app.get('/', function(req, res) {
	res.render('index.html', {
    title: "Main"
  });
});

// server listen start
app.listen(config.webserver.port, function() {
  console.log('WebRTC Lab server running at ' + config.webserver.host + ':' + config.webserver.port);
}); 
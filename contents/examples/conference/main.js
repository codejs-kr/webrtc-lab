$(function() {
  var channel = null
    , userID = Math.round(Math.random() * 999999999) + 999999999
    , peer = null
    , $body = $('body')
    , $videoWrap = $('#video-wrap')
    , $roomList = $('#room-list')
    , $joinWrap = $('#join-wrap')
    , $uniqueToken = $('#unique-token');

  init();
  channel = location.href.replace(/\/|:|#|%|\.|\[|\]/g, '');

  console.log('channel', channel);
  console.log('userID', userID);

  /**
   * START Socket Connection Functions
   */

  var socket = io();
  socket.on('connect', function() {
    console.info('Client socket connection');
    // setup peer connection & pass socket object over the constructor!

    setPeerConnection(socket);
  });

  socket.emit('joinRoom', channel, userID);

  socket.on('disconnect', function(data) {
    //console.log('disconnect', arguments);
    //alert('서버와 연결이 끊어졌습니다. 다시 연결해 주세요.');
  });

  socket.on('joined', function(data) {
    //console.log('joined', arguments);
  });

  socket.on('leaved', function(data) {
    //console.log('leaved', data);
    //alert('상대방이 방을 떠났습니다.');
  });

  socket.send = function(message) {
    console.log('socket.send', arguments);

    socket.emit('message', {
      sender: userID,
      data: message,
      to: 'all'
    });
  };

  $.sendMessage = socket.send;


  /**
   * 웹소캣 채팅
   */
  var $message = $('#message')
    , $chatContent = $('#chat-content');

  // send
  $('form').submit(function() {
    if (!$message.val().length) return false;

    socket.emit('message', {
      sender: userID,
      name: $('#name').val(),
      message: $message.val(),
      date: new Date().toUTCString()
    });

    var output = [
      '<li class="me">',
        //'<h3 class="name">' + $('#name').val()+ '</h3>',
        '<h3 class="name">Me</h3>',
        '<p class="message">' + $message.val() + '<br><span class="date">' + new Date().toUTCString() + '</span></p>',
      '</li>'
    ].join('\n');
    $chatContent.append(output).scrollTop($chatContent[0].scrollHeight);

    $message.val('').focus();
    return false;
  });

  // receive
  socket.on('message', function(data) {
    console.log('onMessage', data);

    if (!data.message && !data.date) return false;
    var output = [
      '<li class="you">',
        //'<h3 class="name">' + data.name + '</h3>',
        '<h3 class="name">You</h3>',
        '<p class="message">' + data.message + '<br><span class="date">' + data.date + '</span></p>',
      '</li>'
    ].join('\n');

    $chatContent.append(output).scrollTop($chatContent[0].scrollHeight);

    var $chatOpener = $('#chat-opener');
    if (!$('#chat-opener').hasClass('on')) {
      $('#chat-opener').addClass('alarm');
    }
  });
  /**
   * END Socket Connection Functions
   */


  /**
   * WebRTC PeerConnection
   */
  function setPeerConnection(socket) {
    console.log('setPeerConnection', arguments);

    peer = new PeerConnection(socket, 'message', userID);
    peer.onUserFound = function(userID) {
      //console.log('onUserFound', arguments);

      $roomList.html([
        '<p class="room">',
          '[' + userID + '] 님이 기다리고 있어요. 참여 하실래요?<br/>',
          '<button id="' + userID + '">Join</button>',
        '</p>'].join('\n'));

      var $joinButton = $roomList.find('button');

      $joinButton.click(function() {
        var $this = $(this);
        getUserMedia(function(stream) {
          peer.addStream(stream);
          peer.sendParticipationRequest($this.attr('id'));
        });

        $this.attr('disabled', true);
      });

      $joinWrap.slideUp(1000);
      $('#token-wrap').slideUp(1000);
    };

    peer.onStreamAdded = function(e) {
      console.log('onStreamAdded', arguments);

      var $video = $(e.mediaElement).addClass($('video').length ? 'remote-pc' : 'local-pc');
      $videoWrap.append($video);

      $video[0].play();
      rotateVideo($video[0]);
      //scaleVideos();

      if ($('video').length == 1) {
        $body.addClass('wait');
      } else if ($('video').length >= 2) {
        $body.removeClass('wait').addClass('connected');
      }
    };

    peer.onStreamEnded = function(e) {
      var video = e.mediaElement;
      if (video) {
        video.style.opacity = 0;
        rotateVideo(video);

        setTimeout(function() {
          video.parentNode.removeChild(video);
          scaleVideos();
        }, 1000);
      }
    };

  }
  /**
   * rotateVideo
   */
  function rotateVideo(video) {
    console.log('rotateVideo', arguments);

    setTimeout(function() {
      $(video).addClass('effect');
    }, 1000);
  }

  /**
   * scaleVideos
   */
  function scaleVideos() {
    //console.log('scaleVideos', arguments);

    var videos = document.querySelectorAll('video')
      , length = videos.length
      , video;

    var minus = 130;
    var windowHeight = 700;
    var windowWidth = 600;
    var windowAspectRatio = windowWidth / windowHeight;
    var videoAspectRatio = 4 / 3;
    var blockAspectRatio;
    var tempVideoWidth = 0;
    var maxVideoWidth = 0;

    for (var i = length; i > 0; i--) {
      blockAspectRatio = i * videoAspectRatio / Math.ceil(length / i);
      if (blockAspectRatio <= windowAspectRatio) {
        tempVideoWidth = videoAspectRatio * windowHeight / Math.ceil(length / i);
      } else {
        tempVideoWidth = windowWidth / i;
      }
      if (tempVideoWidth > maxVideoWidth) {
        maxVideoWidth = tempVideoWidth;
      }
    }

    for (var j = 0; j < length; j++) {
      video = videos[j];
      if (video)
        video.width = maxVideoWidth - minus;
    }
  }

  /**
   * getUserMedia
   * you need to capture getUserMedia yourself!
   */
  function getUserMedia(callback) {
    var options = {
      audio: true,
      video: true
    };

    navigator.getUserMedia(options, function(stream) {
      var video = document.createElement('video');
      video.src = URL.createObjectURL(stream);
      video.controls = true;
      video.muted = true;

      peer.onStreamAdded({
        mediaElement: video,
        userID: 'self',
        stream: stream
      });

      callback(stream);
    });
  }

  /**
   * setRoomToken
   */
  function setRoomToken() {
    //console.log('setRoomToken', arguments);

    if (location.hash.length > 2) {
      $uniqueToken.length && $uniqueToken.attr('href', location.href);
    } else {
      location.hash = '#' + (Math.random() * new Date().getTime()).toString(32).toUpperCase().replace(/\./g, '-');
    }
  }

  function setClipboard() {
    //console.log('setClipboard', arguments);

    $uniqueToken.click(function(){
      var link = location.href;
      if (window.clipboardData){
        window.clipboardData.setData('text', link);
        $.message('Copy to Clipboard successful.');
      }
      else {
        window.prompt("Copy to clipboard: Ctrl+C, Enter", link); // Copy to clipboard: Ctrl+C, Enter
      }
    });
  }

  function setRoomEvent() {
    var $chatOpener = $('#chat-opener')
      , $chatWrap = $('#chat-wrap');

    $chatOpener.click(function() {
      var $this = $(this);
      $chatWrap.fadeToggle(200);
      $(this).toggleClass('on');

      if ($this.hasClass('on')) {
        $this.removeClass('alarm');
      }
    });

    $('.content-opener').click(function() {
      $body.addClass('blur');

      $('#' + $(this).data('target')).fadeIn(300);
    });

    $body.on('click', '.dialog button', function() {
      $body.removeClass('blur');
      $('.dialog').fadeOut(200);
    });

    $(document).keydown(function(e) {
      // console.log(e.keyCode)
      var esc = e.keyCode == 27;

      if (esc) {
        $('.dialog').hide();
        $body.removeClass('blur');
      }
    });
  }

  /**
   * init
   */
  function init() {
    window.onresize = scaleVideos;
    setRoomToken();
    setClipboard();

    $('#start-broadcasting').click(function() {
      $(this).attr('disabled', true);
      getUserMedia(function(stream) {
        peer.addStream(stream);
        peer.startBroadcasting();
      });
    });

    $('#your-name').change(function() {
      peer.userID = $(this).val();
    });

    setRoomEvent();
  }
});

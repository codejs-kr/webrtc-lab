$(function() {
  if (typeof webkitSpeechRecognition != 'function') {
    alert('크롬에서만 동작 합니다.');
    return false;
  }
  
  var recognition = new webkitSpeechRecognition();
  var isRecognizing = false;
  var ignore_onend = false;
  var final_transcript = '';
 	var audio = document.getElementById('audio');
  var $btnMic = $('#btn-mic');
 	var $result = $('#result');
 	var $iconMusic = $('#icon-music');
  
  recognition.continuous = true;
  recognition.interimResults = true;
  
  recognition.onstart = function() {
    console.log('onstart', arguments);
    isRecognizing = true;
    
    $btnMic.attr('class', 'on');
  };

  recognition.onend = function() {
    console.log('onend', arguments);
    isRecognizing = false;
    
    if (ignore_onend) {
      return false;
    }
    
    // do end process
    $btnMic.attr('class', 'off');
    if (!final_transcript) {
      console.log('empty final_transcript');
      return false;
    }
    
    if (window.getSelection) {
      window.getSelection().removeAllRanges();
      var range = document.createRange();
      range.selectNode(document.getElementById('final_span'));
      window.getSelection().addRange(range);
    }
    
  };

  recognition.onresult = function(event) {
    console.log('onresult', event);
    
    var interim_transcript = '';
    if (typeof(event.results) == 'undefined') {
      recognition.onend = null;
      recognition.stop();
      return;
    }
    
    for (var i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        final_transcript += event.results[i][0].transcript;
      } else {
        interim_transcript += event.results[i][0].transcript;
      }
    }
    
    final_transcript = capitalize(final_transcript);
    final_span.innerHTML = linebreak(final_transcript);
    interim_span.innerHTML = linebreak(interim_transcript);
    
    console.log('final_transcript', final_transcript);
    console.log('interim_transcript', interim_transcript);
    
    fireCommand(interim_transcript);
  };
  
  /**
   * changeColor
   * 
   */
  
  /*
	  .red 		{ background: red; }
		.blue 	{ background: blue; }
		.green 	{ background: green; }
		.yellow { background: yellow; }
		.orange { background: orange; }
		.grey 	{ background: grey; }
		.gold   { background: gold; }
		.white 	{ background: white; }
		.black  { background: black; }
 	*/
 	
  function fireCommand(string) {
  	if (string.endsWith('레드')) {
  		$result.attr('class', 'red');
  	} else if (string.endsWith('블루')) {
  		$result.attr('class', 'blue');
  	} else if (string.endsWith('그린')) {
  		$result.attr('class', 'green');
  	} else if (string.endsWith('옐로우')) {
  		$result.attr('class', 'yellow');
  	} else if (string.endsWith('오렌지')) {
  		$result.attr('class', 'orange');
  	} else if (string.endsWith('그레이')) {
  		$result.attr('class', 'grey');
  	} else if (string.endsWith('골드')) {
  		$result.attr('class', 'gold');
  	} else if (string.endsWith('화이트')) {
  		$result.attr('class', 'white');
  	} else if (string.endsWith('블랙')) {
  		$result.attr('class', 'black');
  	} else if (string.endsWith('알람')) {
  		alert('알람');
  	} else if (string.endsWith('노래 켜') || string.endsWith('음악 켜')) {
  		audio.play();
  		$iconMusic.addClass('visible');
  	} else if (string.endsWith('노래 꺼') || string.endsWith('음악 꺼')) {
  		audio.pause();
  		$iconMusic.removeClass('visible');
  	} else if (string.endsWith('볼륨 업') || string.endsWith('볼륨업')) {
  		audio.volume += 0.2;
  	} else if (string.endsWith('볼륨 다운') || string.endsWith('볼륨다운')) {
  		audio.volume -= 0.2;
  	}
  }

  recognition.onerror = function(event) {
    console.log('onerror', event);

    if (event.error == 'no-speech') {
      ignore_onend = true;
    } else if (event.error == 'audio-capture') {
      ignore_onend = true;
    } else if (event.error == 'not-allowed') {
      ignore_onend = true;
    }
    
    $btnMic.attr('class', 'off');
  };
  
  var two_line = /\n\n/g;
  var one_line = /\n/g;
  var first_char = /\S/;
  
  function linebreak(s) {
    return s.replace(two_line, '<p></p>').replace(one_line, '<br>');
  }
  
  function capitalize(s) {
    return s.replace(first_char, function(m) { 
      return m.toUpperCase(); 
    });
  }
  
  function start(event) {
    if (isRecognizing) {
      recognition.stop();
      return;
    }
    recognition.lang = 'ko-KR';
    recognition.start();
    ignore_onend = false;
    
    final_transcript = '';
    final_span.innerHTML = '';
    interim_span.innerHTML = '';
  }
  
  /**
   * init 
   */ 
  $btnMic.click(start);
});
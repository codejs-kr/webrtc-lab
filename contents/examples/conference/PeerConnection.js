// Muaz Khan     - https://github.com/muaz-khan
// MIT License   - https://www.webrtc-experiment.com/licence/
// Documentation - https://github.com/muaz-khan/WebRTC-Experiment/tree/master/socket.io

(function() {
  var isFirefox = !!navigator.mozGetUserMedia;
  var isChrome = !!navigator.webkitGetUserMedia;

  // 자체 셋팅 서버
  // 알서포트 / 턴, 스턴 14.63.229.166 Port : 3478, 3479
  var STUN = {
    url: 'stun:st3.remotemeeting.com'
  };

  // turn:rsupport@turn.toybox7.net:3478?transport=tcp
  var TURN = {
    url: 'turn:14.63.229.166:3478',
    credential: 'rsupport',
    username : 'rsupport'
  };

  var iceServers = {
    iceServers : [STUN, TURN]
  };

  console.log('STUN', STUN);
  console.log('TURN', TURN);

  /**
   * 1. setLocalDescription(SDP)
   * 2. onicecandidate -> send to Callee
   * 3. setRemoteDescription(SDP)
   * 4. onicecandidate -> send to Caller
   * 5. 상대 candidate 정보를 받아서 addIceCandidate() 시도
   */

  /**
   * PeerConnection
   */
  window.PeerConnection = function(socketURL, socketEvent, userID) {
    this.userID = userID;
    this.peers = { };

    if (!socketURL)
      throw 'Socket-URL is mandatory.';
    if (!socketEvent)
      socketEvent = 'message';

    new Signaler(this, socketURL, socketEvent);

    this.addStream = function(stream) {
      this.MediaStream = stream;
    };
  };

  /**
   * Signaler(window.PeerConnection, i, "message")
   */
  function Signaler(root, socketURL, socketEvent) {
    console.log('Signaler', arguments);

    var self = this; // Signaler {}

    root.startBroadcasting = function() {
      if (!root.MediaStream)
        throw 'Offerer must have media stream.';

      (function transmit() {
        socket.send({
          userID: root.userID,
          broadcasting: true
        });

        (!self.participantFound && !self.stopBroadcasting) && setTimeout(transmit, 3000);
      })();
    };

    root.sendParticipationRequest = function(userID) {
      socket.send({
        participationRequest: true,
        userID: root.userID,
        to: userID
      });
    };

    // if someone shared SDP
    this.onsdp = function(message) {
      //console.log('확인 onsdp', message);

      var sdp = message.sdp;

      if (sdp.type == 'offer') {
        root.peers[message.userID] = Answer.createAnswer(merge(options, {
          MediaStream : root.MediaStream,
          sdp : sdp
        }));
      }

      if (sdp.type == 'answer') {
        root.peers[message.userID].setRemoteDescription(sdp);
      }
    };

    root.acceptRequest = function(userID) {
      root.peers[userID] = Offer.createOffer(merge(options, {
        MediaStream: root.MediaStream
      }));
    };

    var candidates = [];
    // if someone shared ICE
    this.onice = function(message) {
      //console.log('확인 onice', message)

      var peer = root.peers[message.userID];
      if (peer) {
        peer.addIceCandidate(message.candidate);

        for (var i = 0; i < candidates.length; i++) {
          peer.addIceCandidate(candidates[i]);
        }
        candidates = [];
      } else {
        candidates.push(candidates);
      }
    };

    // it is passed over Offer/Answer objects for reusability
    var options = {
      onsdp : function(sdp) {
        socket.send({
          userID : root.userID,
          sdp : sdp,
          to : root.participant
        });
      },
      onicecandidate: function(candidate) {
        socket.send({
          userID : root.userID,
          candidate : candidate,
          to : root.participant
        });
      },
      onStreamAdded: function(stream) {
        console.debug('onStreamAdded', '>>>>>>', stream);

        stream.onended = function() {
          if (root.onStreamEnded)
            root.onStreamEnded(streamObject);
        };

        var mediaElement = document.createElement('video');
        mediaElement.id = root.participant;
        mediaElement[ isFirefox ? 'mozSrcObject' : 'src'] = isFirefox ? stream : URL.createObjectURL(stream);
        mediaElement.autoplay = true;
        mediaElement.controls = true;
        mediaElement.play();

        var streamObject = {
          mediaElement : mediaElement,
          stream : stream,
          participantid : root.participant
        };

        function afterRemoteStreamStartedFlowing() {
          if (!root.onStreamAdded)
            return;
          root.onStreamAdded(streamObject);
        }

        afterRemoteStreamStartedFlowing();
      }
    };

    function closePeerConnections() {
      self.stopBroadcasting = true;
      if (root.MediaStream)
        root.MediaStream.stop();

      for (var userID in root.peers) {
        root.peers[userID].peer.close();
      }
      root.peers = { };
    }

    root.close = function() {
      socket.send({
        userLeft : true,
        userID : root.userID,
        to : root.participant
      });
      closePeerConnections();
    };

    window.onbeforeunload = function() {
      root.close();
    };

    window.onkeyup = function(e) {
      if (e.keyCode == 116) {
        root.close();
      }
    };

    function onmessage(message) {
      console.log('onmessage', message);

      root.participant = message.userID;

      // for pretty logging
      /*
      console.debug(JSON.stringify(message, function(key, value) {
        if (value && value.sdp) {
          console.log(value.sdp.type, '---', value.sdp.sdp);
          return '';
        } else {
          return value;
        }
      }, '---'));
      */

      // if someone shared SDP
      if (message.sdp && message.to == root.userID) {
        self.onsdp(message);
      }

      // if someone shared ICE
      if (message.candidate && message.to == root.userID) {
        self.onice(message);
      }

      // if someone sent participation request
      if (message.participationRequest && message.to == root.userID) {
        self.participantFound = true;

        if (root.onParticipationRequest) {
          root.onParticipationRequest(message.userID);
        } else
          root.acceptRequest(message.userID);
      }


      // if someone is broadcasting himself!
      if (message.broadcasting && root.onUserFound) {
        root.onUserFound(message.userID);
      }

      if (message.userLeft && message.to == root.userID) {
        closePeerConnections();
      }
    }

    var socket = socketURL;
    socket.on(socketEvent, function(data) {
      onmessage(data.data);
    });
  }

  var RTCPeerConnection = window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
  var RTCSessionDescription = window.mozRTCSessionDescription || window.RTCSessionDescription;
  var RTCIceCandidate = window.mozRTCIceCandidate || window.RTCIceCandidate;

  navigator.getUserMedia = navigator.mozGetUserMedia || navigator.webkitGetUserMedia;

  var optionalArgument = {
    optional : [{
      DtlsSrtpKeyAgreement: true
    }]
  };
  console.log('optionalArgument', optionalArgument);

  var offerConstraints = {
    optional: [{
      enableDataChannels: true
    }],
    mandatory: {
      OfferToReceiveAudio: true,
      OfferToReceiveVideo: true
    }
  };

  var answerConstraints = {
    optional: [{
      enableDataChannels: true
    }],
    mandatory: {
      OfferToReceiveAudio: true,
      OfferToReceiveVideo: true
    }
  };

  function onSdpError() {
    console.log('onSdpError');
  }

  // var offer = Offer.createOffer(config);
  // offer.setRemoteDescription(sdp);
  // offer.addIceCandidate(candidate);
  var Offer = {
    createOffer : function(config) {
      console.log('createOffer', arguments);

      var peer = new RTCPeerConnection(iceServers, optionalArgument);
      //console.info('createOffer RTCPeerConnection', peer);

      if (config.MediaStream) {
        peer.addStream(config.MediaStream);
      }

      peer.onaddstream = function(event) {
        config.onStreamAdded(event.stream);
      };

      /*
       * onIceCandidate() createPeerConnection()에서 성공적으로
       * RTCPeerConnection이 생성되었을 떄 호출되는 onIceCandidate() 콜백은 candidates에 관해 '획득한' 정보를 전달합니다:
       */
      var myData;
      peer.onicecandidate = function(event) {
        console.log('onicecandidate', event.candidate);

        // RTCPeerConnection.onicecandidate() 로 정보를 받아와서 Socket Send 하기 위해서 config.onicecandidate() 로 전달
        if (event.candidate) {
          config.onicecandidate(event.candidate);
        }
      };

      var dataChannel = peer.createDataChannel("Mydata");
      dataChannel.onopen = function(event) {
        console.log('dataChannel.onopen');
        dataChannel.send('sending a message');
      };

      dataChannel.onmessage = function(event) {
        console.log('dataChannel.onmessage', event.data);
      };

      peer.createOffer(function(sdp) {
        console.info('setLocalDescription SDP', sdp);
        peer.setLocalDescription(sdp);
        config.onsdp(sdp);
      }, onSdpError, offerConstraints);

      this.peer = peer;

      return this;
    },
    setRemoteDescription : function(sdp) {
      this.peer.setRemoteDescription(new RTCSessionDescription(sdp));
      console.info('setRemoteDescription SDP', sdp);
    },
    addIceCandidate : function(candidate) {
      console.log('콜리가전달한데이터 addIceCandidate', candidate);
      //console.log('addIceCandidate this', this);

      this.peer.addIceCandidate(new RTCIceCandidate({
        sdpMLineIndex : candidate.sdpMLineIndex,
        candidate : candidate.candidate
      }));
    }
  };

  // var answer = Answer.createAnswer(config);
  // answer.setRemoteDescription(sdp);
  // answer.addIceCandidate(candidate);
  var Answer = {
    createAnswer : function(config) {
      var peer = new RTCPeerConnection(iceServers, optionalArgument);
      console.info('createAnswer RTCPeerConnection', peer);

      if (config.MediaStream) {
        peer.addStream(config.MediaStream);
      }

      peer.onaddstream = function(event) {
        config.onStreamAdded(event.stream);
      };

      peer.onicecandidate = function(event) {
        if (event.candidate) {
          config.onicecandidate(event.candidate);
        }
      };

      /*
      var dataChannel = peer.createDataChannel("Mydata");
      dataChannel.onopen = function(event) {
        console.log('dataChannel.onopen');
        dataChannel.send('sending a message');
      };

      dataChannel.onmessage = function(event) {
        console.log('데이터 채널 메시지', event.data);
      };
      */

      peer.setRemoteDescription(new RTCSessionDescription(config.sdp));
      peer.createAnswer(function(sdp) {
        console.info('createAnswer SDP', sdp);
        peer.setLocalDescription(sdp);
        config.onsdp(sdp);
      }, onSdpError, answerConstraints);

      this.peer = peer;

      return this;
    },
    addIceCandidate : function(candidate) {
      console.log('콜러가전달한데이터 addIceCandidate', candidate);
      this.peer.addIceCandidate(new RTCIceCandidate({
        sdpMLineIndex : candidate.sdpMLineIndex,
        candidate : candidate.candidate
      }));
    }
  };

  function merge(mergein, mergeto) {
    for (var t in mergeto) {
      mergein[t] = mergeto[t];
    }
    return mergein;
  }

  navigator.getMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
  navigator.getUserMedia = function(hints, onsuccess, onfailure) {
    if (!hints) {
      hints = {
        audio : true,
        video : true
      };
    }

    if (!onsuccess) {
      throw 'Second argument is mandatory. navigator.getUserMedia(hints,onsuccess,onfailure)';
    }

    navigator.getMedia(hints, _onsuccess, _onfailure);

    function _onsuccess(stream) {
      onsuccess(stream);
    }

    function _onfailure(e) {
      if (onfailure) {
        onfailure(e);
      } else {
        alert(e.name);
        throw Error('getUserMedia failed: ' + JSON.stringify(e, null, '\t'));
      }
    }
  };
})();

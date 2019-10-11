/**
 * Router
 * @param app
 */
module.exports = (app) => {
  app
    .get('/', (req, res) => {
      res.render('index.ejs', {
        title: '',
      });
    })
    .get('/intro', (req, res) => {
      res.render('intro.ejs', {
        title: '- WebRTC 소개',
      });
    })
    .get('/get-user-media', (req, res) => {
      res.render('examples/get-user-media/index.ejs', {
        title: '- 마이크 & 캠 접근하기',
      });
    })
    .get('/filter', (req, res) => {
      res.render('examples/filter/index.ejs', {
        title: '- 비디오에 필터 적용하기',
      });
    })
    .get('/capture', (req, res) => {
      res.render('examples/capture/index.ejs', {
        title: '- 비디오를 이미지로 캡쳐하기',
      });
    })
    .get('/conference', (req, res) => {
      res.render('examples/conference/index.ejs', {
        title: '- 1:1 화상회의 만들기',
      });
    })
    .get('/screen-share', (req, res) => {
      res.render('examples/screen-share/index.ejs', {
        title: '- 화면 공유',
      });
    })
    .get('/data-channel', (req, res) => {
      res.render('examples/data-channel/index.ejs', {
        title: '- 파일 & 데이터 전송하기',
      });
    })
    .get('/speech-recognition', (req, res) => {
      res.render('examples/speech-recognition/index.ejs', {
        title: '- 음성 인식',
      });
    })
    .get('/multi-stream', (req, res) => {
      res.render('examples/multi-stream/index.ejs', {
        title: '- 멀티 스트림',
      });
    })
    .get('/dynamic-resolution', (req, res) => {
      res.render('examples/dynamic-resolution/index.ejs', {
        title: '- 다이나믹 레졸루션',
      });
    });
};

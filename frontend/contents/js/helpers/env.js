export const browserVersion = DetectRTC.browser.version;
export const isMobile = DetectRTC.isMobileDevice;
export const isFirefox = DetectRTC.browser.isFirefox;
export const isChrome = DetectRTC.browser.isChrome;
export const isOpera = DetectRTC.browser.isOpera;
export const isEdge = DetectRTC.browser.isEdge && browserVersion >= 15063; // edge 15버전 이상
export const isSafari = DetectRTC.browser.isSafari && browserVersion >= 11; // safari 11버전
export const isSupportedBrowser = isFirefox || isChrome || isOpera || isEdge || isSafari;
export const checkHasWebCam = () => DetectRTC.hasWebcam;
export const changeHTTPS = () => {
  if (location.protocol === 'http:') {
    location.protocol = 'https:';
  }
};

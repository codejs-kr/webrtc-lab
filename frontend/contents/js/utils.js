export const setRoomToken = () => {
  const hashValue = (Math.random() * new Date().getTime()).toString(32).toUpperCase().replace(/\./g, '-');

  if (location.hash.length < 2) {
    location.hash = '#' + hashValue;
  }
};

export const getRoomId = () => location.href.replace(/\/|:|#|%|\.|\[|\]/g, '');

export const getUserId = () => Math.round(Math.random() * 99999);

export const bindClipboardClickEvent = ($target) => {
  $target.addEventListener('click', () => {
    const link = location.href;
    if (window.clipboardData) {
      window.clipboardData.setData('text', link);
      alert('Copy to Clipboard successful.');
    } else {
      window.prompt('Copy to clipboard: Ctrl+C, Enter', link); // Copy to clipboard: Ctrl+C, Enter
    }
  });
};

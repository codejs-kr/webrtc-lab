export const setRoomToken = () => {
  const hashValue = (Math.random() * new Date().getTime()).toString(32).toUpperCase().replace(/\./g, '-');

  if (location.hash.length < 2) {
    location.hash = '#' + hashValue;
  }
};

export const getRoomId = () => location.href.replace(/\/|:|#|%|\.|\[|\]/g, '');

export const getUserId = () => Math.round(Math.random() * 99999);

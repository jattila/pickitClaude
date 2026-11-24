// The page behind every invite link when the app did not open it: the app is
// missing, or the link was opened somewhere that does not hand links to apps.
//
// The code lives in the path (/join/CODE, or /dev/join/CODE for the
// development build), so this page reads it from there and offers both ways
// on: open the app through its own scheme, or go and get it.
(function () {
  var match = /^\/(dev\/)?join\/([A-Za-z0-9]+)\/?$/.exec(location.pathname);
  var show = function (id) {
    document.getElementById(id).hidden = false;
  };

  if (!match) {
    show('missing');
    show('get-app');
    return;
  }

  var isDev = !!match[1];
  var code = match[2].toUpperCase();
  var scheme = isDev ? 'pickit-dev' : 'pickit';

  document.getElementById('code').textContent = code;
  document.getElementById('open').href = scheme + '://join/' + code;
  show('invite');
  show('have-app');

  if (isDev) {
    // Nobody downloads the development build from a store.
    show('dev-note');
  } else {
    show('get-app');
    // Put the store for this phone first; on a computer leave both as they are.
    var ua = navigator.userAgent;
    var store = /iPhone|iPad|iPod/.test(ua) ? 'ios' : /Android/.test(ua) ? 'android' : null;
    if (store) {
      var box = document.getElementById(store);
      box.parentNode.insertBefore(box, box.parentNode.querySelector('.store'));
    }
  }

  var copy = document.getElementById('copy');
  copy.addEventListener('click', function () {
    var done = function () {
      copy.textContent = 'Kimásolva';
      setTimeout(function () {
        copy.textContent = 'Kód másolása';
      }, 2000);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(done, function () {});
    }
  });
})();

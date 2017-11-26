const Cookies = require('js-cookie');
const dmpmod = require('diff_match_patch');
const dmp = new dmpmod.diff_match_patch();
const updateEditor = require('./editor');

document.addEventListener("DOMContentLoaded", () => {
  
  // GENERATE URL && EDITOR ====================
  
  const id = getUrlParameter("id");
  if (!id) {
    location.search = location.search ? '&id=' + getUniqueId() : 'id=' + getUniqueId();
    return;
  }
  
  const editor = ace.edit("editor");
  editor.setTheme("ace/theme/monokai");
  editor.getSession().setMode("ace/mode/javascript");
  editor.$blockScrolling = Infinity;
  const editorEl = document.querySelector("#editor");
  
  // GENERATE COOKIE / CLIENT ID =================
  
  let cookie = Cookies.getJSON(id);
  let clientId;
  if (cookie) {
    clientId = cookie.clientId;
    if (cookie.text) {
      const pos = editor.session.selection.toJSON();
      editor.setValue(cookie.text);
      editor.session.selection.fromJSON(pos);
    }
  } else {
    clientId = getUniqueId();
    Cookies.set(id, {
      clientId: clientId,
      text: editor.getValue(),
    });
  }
  
  // GENERATE PUSHER CONNECTION ==================
  
  const pusher = new Pusher('1877417d412f691c6e86', {
    cluster: 'us2',
    encrypted: true
  });
  
  const channel = pusher.subscribe(id);
  
  channel.bind('client-text-edit', (data) => {
    updateEditor(data);
  });
  
  // CHANGE / CURSOR HANDLERS ===========================
  
  let oldPos = editor.session.selection.toJSON();
  let oldVal = editor.getValue();
  
  editor.getSession().on('change', () => {
    const newPos = editor.session.selection.toJSON();
    if (editor.curOp && editor.curOp.command.name) {
      setTimeout(() => {
        sendPatch();
      }, 0);
    } else if (JSON.stringify(oldPos) !== JSON.stringify(newPos)) {
      // triggers if change from incoming data causes change in pos
      setTimeout(() => {
        // BUG
        // THIS SHOULD ONLY UPDATE CURSOR BUT IS UPDATING EVERYTHING
        sendCursor();
      }, 0);
      oldPos = newPos;
    }
  });
  
  editorEl.addEventListener("click", () => {
    // TODO: THIS DOESN'T TRIGGER WHEN MOUSE RELEASED OUTSIDE OF WINDOW
    setTimeout(function () {
      sendPatch();
    }, 0);
  });
  
  document.addEventListener("keyup", (e) => {
    const newVal = editor.getValue();
    const newPos = editor.session.selection.toJSON();
    if (oldVal === newVal && JSON.stringify(oldPos) !== JSON.stringify(newPos)) {
      sendPatch();
    }
    oldPos = newPos;
  });
  
  function sendPatch() {
    const newVal = editor.getValue();
    const data = {
      clientId: clientId,
      value: editor.getValue(),
      patch: dmp.patch_make(oldVal, newVal),
      otherPos: editor.session.selection.toJSON(),
      actionType: "PATCH",
    };
    oldVal = newVal;
    channel.trigger('client-text-edit', data);
  }
  
  function sendCursor() {
    const newVal = editor.getValue();
    const data = {
      clientId: clientId,
      value: "", // if these cause an error,
      patch: "", // you're doing something wrong
      otherPos: editor.session.selection.toJSON(),
      actionType: "CURSOR",
    };
    channel.trigger('client-text-edit', data);
  }
  
  // INITIAL REQUEST ON LOAD ============================
  
  channel.bind('client-text-receive', () => {
    sendPatch();
  });
  
  channel.bind('pusher:subscription_succeeded', () => {
    setTimeout(function () {
      channel.trigger('client-text-receive', "asdf");
    }, 0);
  });
  
  // SEND CLOSE SIGNAL AND SAVE ON CLOSE =================
  
  window.addEventListener("beforeunload", () => {
    const data = {
      clientId: clientId,
      value: editor.getValue(),
      patch: dmp.patch_make(oldVal, editor.getValue()),
      otherPos: null,
      actionType: "REPLACE",
    };
    channel.trigger('client-text-edit', data);
    
    Cookies.set(id, {
      clientId: clientId,
      text: editor.getValue(),
    });
  });
  
  // WEB VIDEO ======================================
  
  var webrtc = new SimpleWebRTC({
    localVideoEl: 'localVideo',
    remoteVideosEl: 'remoteVideos',
    autoRequestMedia: true
  });
  
  webrtc.on('readyToCall', () => {
    webrtc.joinRoom(`codecollab-${id}`);
  });
});

function getUniqueId () {
  return 'private-' + Math.random().toString(36).substr(2, 9);
}

function getUrlParameter(name) {
  name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
  const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
  const results = regex.exec(location.search);
  return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

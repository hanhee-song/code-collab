const clientId = getUniqueId();
const updateEditor = require('./editor');

document.addEventListener("DOMContentLoaded",() => {
  
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
  
  // TODO: GENERATE COOKIE ========================
  
  // Cookies.set('name', 'value', { expires: 7, path: '' });
  
  // GENERATE PUSHER CONNECTION ==================
  
  const pusher = new Pusher('1877417d412f691c6e86', {
    cluster: 'us2',
    encrypted: true
  });
  
  const channel = pusher.subscribe(id);
  
  channel.bind('client-text-edit', (data) => {
    updateEditor(data);
  });
  
  // CHANGE HANDLER ==================================
  
  editor.getSession().on('change', () => {
    if (editor.curOp && editor.curOp.command.name) {
      setTimeout(() => {
        triggerChange();
      }, 0);
    }
  });
  
  // CURSOR HANDLERS - SHOULD NOT RESPOND TO VALUE CHANGES ====
  
  let oldPos = editor.session.selection.toJSON();
  let oldVal = editor.getValue();
  
  editorEl.addEventListener("click", () => {
    // TODO: THIS DOESN'T TRIGGER WHEN MOUSE RELEASED OUTSIDE OF WINDOW
    setTimeout(function () {
      triggerChange();
    }, 0);
  });
  
  document.addEventListener("keyup", (e) => {
    const newVal = editor.getValue();
    const newPos = editor.session.selection.toJSON();
    if (oldVal === newVal && JSON.stringify(oldPos) !== JSON.stringify(newPos)) {
      triggerChange();
    }
    oldPos = newPos;
    oldVal = newVal;
  });
  
  function triggerChange() {
    const data = {
      clientId: clientId,
      value: editor.getValue(),
      otherPos: editor.session.selection.toJSON(),
    };
    channel.trigger('client-text-edit', data);
  }
  
  // INITIAL REQUEST ON LOAD ============================
  
  channel.bind('client-text-receive', () => {
    triggerChange();
  });
  
  channel.bind('pusher:subscription_succeeded', () => {
    channel.trigger('client-text-receive', "asdf");
  });
  
  // SEND CLOSE SIGNAL ON CLOSE =========================
  
  window.addEventListener("beforeunload", () => {
    const data = {
      clientId: clientId,
      value: editor.getValue(),
      otherPos: null,
    };
    channel.trigger('client-text-edit', data);
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

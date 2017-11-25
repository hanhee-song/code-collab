const dmpmod = require('diff_match_patch');
const dmp = new dmpmod.diff_match_patch();
const clientId = getUniqueId();

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
  
  channel.bind('client-text-edit', ({ clientId, value, otherPos }) => {
    const currentValue = editor.getValue();
    if (currentValue !== value) {
      
      // TODO: REFACTOR OUT ======================
      
      const pos = editor.session.selection.toJSON();
      const arrValue = currentValue.split(/\n/);
      
      // get the 32 characters to the right of the start/end of selection
      // bitap alg has a 32 char limit
      const rightStart = arrValue.slice(pos.start.row);
      rightStart[0] = rightStart[0].slice(pos.start.column);
      const rightStartStr = rightStart.join("\n").slice(0, 31);
      const rightEnd = arrValue.slice(pos.end.row);
      rightEnd[0] = rightEnd[0].slice(pos.end.column);
      const rightEndStr = rightEnd.join("\n").slice(0, 31);
      
      // Find current index
      const oldStartIndex = editor.session.doc.positionToIndex(pos.start);
      const oldEndIndex = editor.session.doc.positionToIndex(pos.end);
      // find new index (via whatever's to the right of the cursor)
      const newStartIndex = dmp.match_main(value, rightStartStr, oldStartIndex);
      const newEndIndex = dmp.match_main(value, rightEndStr, oldEndIndex);
      
      // Apply patch
      const patch = dmp.patch_make(currentValue, value);
      const result = dmp.patch_apply(patch, currentValue)[0];
      editor.setValue(result);
      
      // calculate new cursor position based on index
      const newStartPos = editor.session.doc.indexToPosition(newStartIndex);
      const newEndPos = editor.session.doc.indexToPosition(newEndIndex);
      // Adjust the selection json
      pos.start = newStartPos;
      pos.end = newEndPos;
      editor.session.selection.fromJSON(pos);
    }
    
    // update cursor position
    let otherCursor = document.querySelector(`.other-cursor.${clientId}`);
    // if otherPos is null, delete cursor
    if (otherCursor && !otherPos) {
      otherCursor.parentNode.removeChild(otherCursor);
    } else if (otherPos) {
      if (!otherCursor) {
        otherCursor = document.createElement("div");
        otherCursor.className = `other-cursor ${clientId}`;
        document.querySelector(".ace_scroller").appendChild(otherCursor);
      }
      otherCursor.style.top = otherPos.end.row * 16 + 'px';
      otherCursor.style.left = otherPos.end.column * 7.2 + 4 + 'px';
    }
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
    console.log("click");
    setTimeout(function () {
      triggerChange();
    }, 0);
  });
  
  // TODO: SHOW ENTIRE SELECTION
  
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
  
  console.log(window);
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

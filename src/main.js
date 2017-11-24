let dmpmod = require('diff_match_patch');
let dmp = new dmpmod.diff_match_patch();

document.addEventListener("DOMContentLoaded",() => {
  const id = getUrlParameter("id");
  if (!id) {
    location.search = location.search ? '&id=' + getUniqueId() : 'id=' + getUniqueId();
    return;
  }
  
  const pusher = new Pusher('1877417d412f691c6e86', {
    cluster: 'us2',
    encrypted: true
  });
  
  let editor = ace.edit("editor");
  editor.setTheme("ace/theme/monokai");
  editor.getSession().setMode("ace/mode/javascript");
  editor.$blockScrolling = Infinity;
  
  
  let channel = pusher.subscribe(id);
  channel.bind('client-text-edit', (value) => {
    const currentValue = editor.getValue();
    if (currentValue !== value) {
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
  });
  
  editor.getSession().on('change', (e) => {
    if (editor.curOp && editor.curOp.command.name) {
      channel.trigger('client-text-edit', editor.getValue());
    }
  });
  
  channel.bind('client-text-receive', (e) => {
    channel.trigger('client-text-edit', editor.getValue());
  });
  
  channel.bind('pusher:subscription_succeeded', () => {
    channel.trigger('client-text-receive', "asdf");
  });
  ////////////////////
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

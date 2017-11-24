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
      // const selectedText = editor.getCopyText();
      const pos = editor.session.selection.toJSON();
      const arrValue = currentValue.split(/\n/);
      const left = arrValue.slice(0, pos.start.row + 1);
      left[left.length - 1] = left[left.length - 1].slice(0, pos.start.column);
      
      const right = arrValue.slice(pos.start.row);
      right[0] = right[0].slice(pos.start.column);
      
      const rightStr = right.join("\n");
      
      // Find current index
      const curIndex = editor.session.doc.positionToIndex(pos.start);
      // find new index (via whatever's to the right of the cursor)
      const newIndex = dmp.match_main(value, rightStr, curIndex);
      // calculate new position based on index
      
      const patch = dmp.patch_make(currentValue, value);
      const result = dmp.patch_apply(patch, currentValue)[0];
      editor.setValue(result);
      
      // Adjust the selection json
      const newPos = editor.session.doc.indexToPosition(newIndex);
      pos.start = newPos;
      pos.end = newPos;
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

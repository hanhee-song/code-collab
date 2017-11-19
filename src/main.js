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
      const patch = dmp.patch_make(currentValue, value);
      const result = dmp.patch_apply(patch, currentValue)[0];
      editor.setValue(result);
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

var dmpmod = require('diff_match_patch');
var ace = require('ace-builds');
var dmp = new dmpmod.diff_match_patch();

document.addEventListener("DOMContentLoaded",() => {
  const doc = document.querySelector('.text-editor');
  doc.contentEditable = true;
  doc.focus();
  
  const id = getUrlParameter("id");
  if (!id) {
    location.search = location.search ? '&id=' + getUniqueId() : 'id=' + getUniqueId();
    return;
  }
  
  const pusher = new Pusher('1877417d412f691c6e86', {
    cluster: 'us2',
    encrypted: true
  });
  
  //////////////////////////
  var channel = pusher.subscribe(id);
  channel.bind('client-text-edit', (html) => {
    const patch = dmp.patch_make(doc.innerHTML, html);
    const result = dmp.patch_apply(patch, doc.innerHTML)[0];
    doc.innerHTML = result;
  });
  
  doc.addEventListener('input', (e) => {
    console.log(this.selectionStart());
    channel.trigger('client-text-edit', e.target.innerHTML);
  });
  ////////////////////
  
  var editor = ace.edit("editor");
  editor.setTheme("ace/theme/monokai");
  editor.getSession().setMode("ace/mode/javascript");
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

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
    doc.innerHTML = html;
  });
  
  function triggerChange(e) {
    channel.trigger('client-text-edit', e.target.innerHTML);
  }
  
  doc.addEventListener('input', triggerChange);
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

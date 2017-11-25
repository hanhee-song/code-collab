const dmpmod = require('diff_match_patch');
const dmp = new dmpmod.diff_match_patch();

function updateEditor({ clientId, value, otherPos }) {
  const editor = ace.edit("editor");
  
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
  
  // always clear selection
  clearOtherSelection(clientId);
  if (otherPos) {
    updateOtherCursor(otherPos, clientId);
    updateOtherSelection(otherPos, clientId);
  } else {
    clearOtherCursor(clientId);
  }
}

function clearOtherSelection(clientId) {
  let selection = document.querySelector(`.other-cursor-selection.${clientId}`);
  while (selection) {
    selection.parentNode.removeChild(selection);
    selection = document.querySelector(`.other-cursor-selection.${clientId}`);
  }
}

function clearOtherCursor(clientId) {
  let otherCursor = document.querySelector(`.other-cursor.${clientId}`);
  if (otherCursor) {
    otherCursor.parentNode.removeChild(otherCursor);
  }
}

function updateOtherCursor(otherPos, clientId) {
  let otherCursor = document.querySelector(`.other-cursor.${clientId}`);
  if (!otherCursor) {
    otherCursor = document.createElement("div");
    otherCursor.className = `other-cursor ${clientId}`;
    document.querySelector(".ace_scroller").appendChild(otherCursor);
  }
  otherCursor.style.top = otherPos.end.row * 16 + 'px';
  otherCursor.style.left = otherPos.end.column * 7.2 + 4 + 'px';
}

function updateOtherSelection(otherPos, clientId) {
  if (otherPos.start.row !== otherPos.end.row || otherPos.start.column !== otherPos.end.column) {
    let topPos;
    let botPos;
    if (otherPos.start.row * 10000 + otherPos.start.column < otherPos.end.row * 10000 + otherPos.end.column) {
      topPos = otherPos.start;
      botPos = otherPos.end;
    } else {
      topPos = otherPos.end;
      botPos = otherPos.start;
    }
    
    let selection;
    for (var i = topPos.row; i <= botPos.row; i++) {
      selection = document.createElement("div");
      selection.className = `other-cursor-selection ${clientId}`;
      selection.style.top = i * 16 + 'px';
      selection.style.left = i === topPos.row ? 5 + topPos.column * 7.2 + 'px' : '4px';
      if (i === botPos.row) {
        const width = i === topPos.row ? botPos.column - topPos.column : botPos.column;
        selection.style.width = width * 7.2 + 'px';
      } else {
        selection.style.right = 0;
      }
      document.querySelector(".ace_scroller").appendChild(selection);
    }
  }
}

module.exports = updateEditor;
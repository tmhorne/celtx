/* ***** BEGIN LICENCE BLOCK *****
 * Version: MPL 2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See
 * the License for the specific language governing rights and limitations
 * under the License.
 * 
 * The Original Code is Celtx Script Manager.
 * 
 * The Initial Developer of the Original Code is 4067479 Canada Inc.
 * t/a CELTX.
 * 
 * Portions created by Celtx are Copyright (C) 4067479 Canada Inc. All
 * Rights Reserved.
 * 
 * Contributor(s):
 *
 ***** END LICENCE BLOCK ***** */

var dialog = {};

function loaded () {
  dialog.filter = window.arguments[0];
  dialog.obj    = window.arguments[1];
  dialog.proj   = window.arguments[2];
  dialog.list   = document.getElementById('list');
  dialog.frame  = document.getElementById('frame');
  dialog.menu   = document.getElementById('script-menu');
  dialog.sb     = document.getElementById('celtx-strings');
  dialog.charmap = {};

  dialog.model  = new RDFModel(dialog.proj.ds);

  if (dialog.filter == 'character') {
    populateChars();
    // return;
  }

  try {
    dialog.scripts = [];
    var types = [ 'cx:ScriptDocument', 'cx:TheatreDocument', 'cx:RadioDocument',
      'cx:AVDocument', 'cx:ComicDocument' ];
    for (var i = 0; i < types.length; ++i) {
      var scriptlist = dialog.model.sources(PROP('cx:doctype'), PROP(types[i]));
      for (var j = 0; j < scriptlist.length; ++j)
        dialog.scripts.push(scriptlist[j]);
    }
    if (dialog.scripts.length) {
      var popup = dialog.menu.firstChild;
      for (var i = 0; i < dialog.scripts.length; i++) {
        var mi = document.createElement('menuitem');
        var title = dialog.model.target(dialog.scripts[i], PROP('dc:title'));
        mi.setAttribute('label', title.value);
        mi.setAttribute('value', dialog.scripts[i].value);
        dump("--- menuitem " + i + ".value == " + mi.getAttribute("value") + "\n");
        popup.appendChild(mi);
      }
      // TODO: probably should remember most recent choice
      dialog.menu.selectedIndex = 0;

      if (dialog.scripts.length == 1) {
        // Only one choice, so hide the chooser
        var box = document.getElementById('script-box');
        box.collapsed = true;
      }
      dialog.list.focus();
    }
    else {
      // No scripts
      var deck = document.getElementById('deck');
      var msg  = document.getElementById('msg');
      var msgtext = dialog.sb.getString("NoScriptsFound");
      msg.appendChild(document.createTextNode(msgtext));
      deck.selectedIndex = 1;
    }
  }
  catch (ex) {
    dump(ex);
  }

  populate();
}


function accepted () {
  var str = dialog.obj.value;
  var kids = dialog.list.children;
  for (var i = 0; i < kids.length; i++) {
    if (kids[i].checked) {
      var lbl = kids[i].getAttribute('value');
      str = (str == '' ? lbl : str + ', ' + lbl);
    }
  }

  dialog.obj.value = str;
  return true;
}


function canceled () {
  dialog.obj.canceled = true;
  return true;
}


function populateChars () {
  var box = document.getElementById('script-box');
  box.collapsed = true;
  dialog.list.focus();
  var characters = dialog.model.sources(PROP('rdf:type'), PROP('cx:Cast'));
  for (var i = 0; i < characters.length; i++) {
    var title = dialog.model.target(characters[i], PROP('dc:title'));
    if (title && ! dialog.charmap[title.value.toUpperCase()]) {
      var item = document.createElement('picklistitem');
      item.setAttribute('value', title.value);
      dialog.list.appendChild(item);
      dialog.charmap[title.value.toUpperCase()] = 1;
    }
  }
}

var gScriptsRemaining;
var gCurrentScript;

function populate () {
  if (dialog.filter == 'character') {
    gScriptsRemaining = [];
    for (var i = 0; i < dialog.scripts.length; ++i)
      gScriptsRemaining.push(dialog.scripts[i]);
  }
  else {
    gScriptsRemaining = [ new RDFResource(dialog.menu.selectedItem.value) ];
  }
  processNextScript();
}

function processNextScript () {
  var script  = gScriptsRemaining.shift();
  gCurrentScript = script;
  // If the script is open, fetch the DOM directly
  var frame = window.opener.top.gFrameLoader.frameForDocument(script);
  if (frame) {
    this._cachedScript = frame.panel.contentWindow
      .gScriptController.editor.contentDocument;
    scriptLoaded();
    return;
  }
  else {
    this._cachedScript = null;
  }

  var file    = dialog.proj.fileForResource(getRDFService().GetResource(script));
  if (isReadableFile(file)) {
    var fileURL = fileToFileURL(file);

    dump("fileURL: " + fileURL + "\n");
    dialog.frame.setAttribute('src', fileURL);
    setTimeout(checkLoad, 100);
  }
}


function scriptLoaded () {
  var items = fetchItems();

  for (var i = 0; i < items.length; i++) {
    var item = document.createElement('picklistitem');
    item.setAttribute('value', items[i]);
    dialog.list.appendChild(item);
  }

  if (gScriptsRemaining.length > 0)
    processNextScript();
}


function clear () {
  var o = dialog.list;
  while (o.hasChildNodes()) {
    o.removeChild(o.lastChild);
  }
}


function fetchItems () {
  var rdfsvc = getRDFService();
  var ordarc = rdfsvc.GetResource(Cx.NS_CX + "ordinal");
  var items = [];

  try {

    var doc = this._cachedScript ? this._cachedScript
      : dialog.frame.contentDocument;

    var xpath = new XPathEvaluator();
    var xset, elem;

    if (dialog.filter == 'character') {
      var chars = {};
      xset  = xpath.evaluate('//p[@class="character"]',
                             doc,
                             null,
                             XPathResult.ORDERED_NODE_ITERATOR_TYPE,
                             null);
      while (elem = xset.iterateNext()) {
        var charname = stringify(elem).toUpperCase();
        if (! dialog.charmap[charname])
          chars[charname]++;
      }

      for (var char in chars) {
        items.push(char);
      }

    }
    else {
      var n = 0;
      xset  = xpath.evaluate('//p[@class="sceneheading"]',
                             doc,
                             null,
                             XPathResult.ORDERED_NODE_ITERATOR_TYPE,
                             null);
      while (elem = xset.iterateNext()) {
        ++n;
        var heading = stringify(elem).toUpperCase();
        var sceneres = resolveSceneIDToResource(elem.getAttribute("id"));
        var ord = sceneres ? getRDFString(dialog.proj.ds, sceneres, ordarc) : n;
        items.push(ord + ' ' + heading);
        // items.push(++n + ' ' + stringify(elem).toUpperCase());
      }
    }

  }
  catch (ex) {
    dump(ex);
  }

  return items;

}


function resolveSceneIDToResource (id) {
  if (! id)
    return null;

  var rdfsvc = getRDFService();
  var IRes = Components.interfaces.nsIRDFResource;

  var scriptres = rdfsvc.GetResource(gCurrentScript.value);
  var scenesarc = rdfsvc.GetResource(Cx.NS_CX + "scenes");
  var sceneidarc = rdfsvc.GetResource(Cx.NS_CX + "sceneid");
  var scenesres = dialog.proj.ds.GetTarget(scriptres, scenesarc, true);
  if (! scenesres)
    return null;
  var scenes = new RDFSeq(dialog.proj.ds, scenesres);

  var sceneid = rdfsvc.GetLiteral(id);
  var candidates = dialog.proj.ds.GetSources(sceneidarc, sceneid, true);
  var sceneres = null;
  while (candidates.hasMoreElements()) {
    var candidate = candidates.getNext().QueryInterface(IRes);
    if (scenes.indexOf(candidate) >= 0) {
      sceneres = candidate;
      break;
    }
  }
  if (! sceneres) {
    // If a scene resource already exists using the old nomenclature,
    // use it instead of minting a new resource uri.
    var candidate = rdfsvc.GetResource(scriptres.Value
      + "/" + id);
    if (scenes.indexOf(candidate) >= 0)
      sceneres = candidate;
  }

  return sceneres;
}


function scriptChanged () {
  dump("scriptChanged\n");
  clear();
  populate();
}


function checkLoad () {
  dump("checkload\n");
  if (dialog.frame.docShell.busyFlags) {
    setTimeout(checkLoad, 100);
  }
  else {
    scriptLoaded();
  }
}

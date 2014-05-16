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


var win = {
  deck: null,
  img: null,
  embed: null,
  uri: null,
  sb: null,
  printframe: null
};

var gController = {
  commands: {
    "cmd-close": 1,
    "cmd-page-setup": 1,
    "cmd-print": 1
  },

  supportsCommand: function (cmd) {
    return this.commands[cmd] == 1;
  },

  isCommandEnabled: function (cmd) {
    switch (cmd) {
      case "cmd-print":
        return win.deck.selectedIndex == 1;
      default:
        return true;
    }
  },

  doCommand: function (cmd) {
    switch (cmd) {
      case "cmd-close":
        window.controllers.removeController(this);
        window.controllers.removeController(gApp);
        window.close();
        break;
      case "cmd-page-setup":
        PrintUtils.showPageSetup();
        break;
      case "cmd-print":
        PrintUtils.print();
        break;
    }
  }
};

// Returns the content type (without subtype) for the given file suffix,
// or null if it can't be identified.
function typeForSuffix (suffix) {
  suffix = suffix.toLowerCase();
  if (suffix.match(/(jpe?g|png|gif|bmp)/))
    return 'image';
  for (var i = 0; i < navigator.plugins.length; i++) {
    var plugin = navigator.plugins[i];
    for (var j = 0; j < plugin.length; j++) {
      var mimeType = plugin[j];
      var suffixes = mimeType.suffixes.split(',');
      for (var k = 0; k < suffixes.length; k++) {
        if (suffix == suffixes[k])
          return mimeType.type.split('/').shift();
      }
    }
  }
  return null;
}

function display () {
  var suffix = win.uri.match(/.*\.(\w+)$/);
  if (!suffix) {
    dump("No suffix on " + win.uri + "\n");
    return;
  }
  suffix = suffix[1].toLowerCase();
  var type = typeForSuffix(suffix);
  if (type == 'video' || type == 'audio') {
    win.embed.src = win.uri;
    // Force a refresh
    var parent = win.embed.parentNode;
    parent.replaceChild(win.embed, win.embed);
  }
  else if (type == 'image') {
    win.deck.selectedIndex = 1;
    win.img.src = win.uri;
    win.printframe.setAttribute("src", win.uri);
  }
  else {
    var msg = gApp.getText("PluginNotFound", [ suffix ]);
    window.setTimeout("alert(\"" + msg + "\");", 200);
    return;
  }
}

function updateCommands () {
  for (var cmd in gController.commands)
    goUpdateCommand(cmd);
}

function loaded () {
  win.uri         = window.arguments[0];
  win.deck        = document.getElementById('media-deck');
  win.img         = document.getElementById('media-image');
  win.embed       = document.getElementById('media-embed');
  win.printframe  = document.getElementById('print-frame');
  display();
  window.controllers.appendController(gController);
  window.controllers.appendController(gApp);
  window.setTimeout("updateCommands()", 0);
}


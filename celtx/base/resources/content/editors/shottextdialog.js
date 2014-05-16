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

var gDialog = {};
var gDefaultFontName;
var gDefaultFontSize;


function loaded () {
  gDialog.config = window.arguments[0];

  gDialog.fontmenu = document.getElementById("fontmenu");
  gDialog.fontpopup = document.getElementById("fontpopup");
  gDialog.fontsize = document.getElementById("fontsize");
  gDialog.fontbold = document.getElementById("fontbold");
  gDialog.fontitalic = document.getElementById("fontitalic");
  gDialog.fontunderline = document.getElementById("fontunderline");
  gDialog.content = document.getElementById("content");

  var ps = getPrefService().getBranch("celtx.sketch.font.");
  try {
    gDefaultFontName = ps.getCharPref("name");
  }
  catch (ex) {
    dump("*** error getting font name: " + ex + "\n");
    gDefaultFontName = "Times";
  }
  try {
    gDefaultFontSize = ps.getIntPref("size");
  }
  catch (ex) {
    dump("*** error getting font size: " + ex + "\n");
    gDefaultFontSize = 16;
  }

  gDialog.config.font = gDialog.config.font || gDefaultFontName;
  gDialog.config.size = gDialog.config.size || gDefaultFontSize;

  gDialog.fontsize.value = gDialog.config.size;
  gDialog.fontbold.checked = gDialog.config.bold;
  gDialog.fontitalic.checked = gDialog.config.italic;
  gDialog.fontunderline.checked = gDialog.config.underline;
  gDialog.content.value = gDialog.config.text;

  gDialog.content.focus();

  populateFontMenu();
}


function populateFontMenu () {
  // From mozilla/editor/ui/composer/content/editor.js
  var fonts = [];
  try {
    var enumerator = Components.classes["@mozilla.org/gfx/fontenumerator;1"]
      .getService(Components.interfaces.nsIFontEnumerator);
    var localFontCount = { value: 0 };
    fonts = enumerator.EnumerateAllFonts(localFontCount);
  }
  catch (ex) {}
  var preferred = [
    gDialog.config.font.toLowerCase(),
    "times",
    "times new roman",
    "arial",
    "helvetica",
    "verdana"
  ];
  var found = {};
  for (var i = 0; i < preferred.length; ++i)
    found[preferred[i]] = null;

  for (var i = 0; i < fonts.length; ++i) {
    if (fonts[i] != "") {
      var item = document.createElementNS(Cx.NS_XUL, "menuitem");
      item.setAttribute("label", fonts[i]);
      item.setAttribute("value", fonts[i]);
      gDialog.fontpopup.appendChild(item);
      // The default
      var fontname = fonts[i].toLowerCase();
      if (fontname in found)
        found[fontname] = item;
    }
  }

  for (var i = 0; i < preferred.length; ++i) {
    if (found[preferred[i]]) {
      gDialog.fontmenu.selectedItem = found[preferred[i]];
      return;
    }
  }
  gDialog.fontmenu.selectedIndex = 0;
}


function accepted () {
  gDialog.config.accepted = true;

  gDialog.config.font = gDialog.fontmenu.selectedItem.value;
  gDialog.config.size = Number(gDialog.fontsize.value);
  gDialog.config.text = gDialog.content.value;
  gDialog.config.bold = gDialog.fontbold.checked;
  gDialog.config.italic = gDialog.fontitalic.checked;
  gDialog.config.underline = gDialog.fontunderline.checked;

  try {
    var ps = getPrefService().getBranch("celtx.sketch.font.");
    ps.setCharPref("name", gDialog.config.font);
    ps.setIntPref("size", gDialog.config.size);
  }
  catch (ex) {
    dump("*** error saving font prefs: " + ex + "\n");
  }

  return true;
}


function canceled () {
  gDialog.config.accepted = false;
  return true;
}

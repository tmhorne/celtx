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

var gStatsController = {
  loaded: function loaded () {
  },

  bgcolours: [
    "blue",
    "green",
    "yellow",
    "orange",
    "red",
    "gray",
    "black"
  ],
  colours: [
    "white",
    "black",
    "black",
    "black",
    "white",
    "black",
    "white"
  ],


  open: function open (project, docres) {
    this.outlineView = gController.outlineView;
    this.project = project;
    this.docres = docres;
  },


  save: function save () {
  },


  focus: function focus () {
    if (this._scriptLoaded) {
      var wordcount = document.getElementById("wordcount");
      wordcount.value = gScriptController.editor.wordCount;
    }
  },


  blur: function blur () {
  },


  commands: {
    "cmd-page-setup": 1,
    "cmd-print": 1,
    "cmd-print-preview": 1
  },


  supportsCommand: function supportsCommand (cmd) {
    return this.commands[cmd] == 1;
  },


  isCommandEnabled: function isCommandEnabled (cmd) {
    switch (cmd) {
      case "cmd-page-setup":
      case "cmd-print":
      case "cmd-print-preview":
        return true;
      default:
        return false;
    }
  },


  doCommand: function doCommand (cmd) {
    switch (cmd) {
      case "cmd-page-setup":
        PrintUtils.showPageSetup();
        break;
      case "cmd-print":
        PrintUtils.print();
        break;
      case "cmd-print-preview":
        dump("*** TODO: Implement cmd-print-preview in script cards\n");
        break;
    }
  },


  updateCommands: function updateCommands () {
    for (var cmd in this.commands)
      goUpdateCommand(cmd);
  },


  onScriptLoad: function onScriptLoad () {
    this._scriptLoaded = true;

    this.elements = [];
    this.labels = [];
    var rdfsvc = getRDFService();
    var schemads = rdfsvc.GetDataSourceBlocking(Cx.SCHEMA_URL);
    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
    var elemarc = rdfsvc.GetResource(Cx.NS_CX + "element");
    var ps = getPrefService().getBranch("celtx.scripteditor."
      + gScriptController.mode + ".");
    var formats = ps.getCharPref("formats").split(/\s*,\s*/);
    for (var i = 0; i < formats.length; ++i) {
      var res = rdfsvc.GetResource(Cx.NS_CX + "Formats/" + formats[i]);
      var element = getRDFString(schemads, res, elemarc);
      if (element)
        this.elements.push(element)
      this.labels.push(getRDFString(schemads, res, titlearc));
    }

    var xpath = new XPathEvaluator();
    var count = 0;
    var countlist = {};
    var doc = gScriptController.editor.contentDocument;
    for (var i = 0; i < this.elements.length; ++i) {
      var str = "count(/html/body/p[@class='" + this.elements[i] + "'])";
      var xres = xpath.evaluate(str, doc, null, XPathResult.NUMBER_TYPE, null);
      var elemcount = Math.floor(xres.numberValue);
      count += elemcount;
      countlist[this.elements[i]] = elemcount;
    }
    if (count == 0)
      return;
    for (var i = 0; i < this.elements.length; ++i) {
      var pct = Math.floor(countlist[this.elements[i]] * 100.0 / count);
      var node = document.createElement("label");
      var style = "background-color: "
        + this.bgcolours[i % this.bgcolours.length] + "; color: "
        + this.colours[i % this.colours.length] + ";";
      node.setAttribute("style", style);
      node.setAttribute("width", "100");
      node.setAttribute("height", pct * 4); // bad magic number
      node.setAttribute("value", this.labels[i] + " (" + pct + "%)");
      document.getElementById("statsbox").appendChild(node);
    }
  }
};

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

var gPaginator = {
  nextPageStartsAt: null,
  pageBreakOffsets: [],
  curPageBreakNum: 0,
  updateCount: 0,
  lastPaginationEnded: 0,


  resetCache: function resetCache () {
    var paginator = Components.classes["@celtx.com/scriptpaginator;1"]
      .createInstance(Components.interfaces.nsIScriptPaginator);
    paginator.init(gScriptController.editor);
    paginator.cacheExistingPageBreaks();

    this.nextPageStartsAt = null;
    this.pageBreakOffsets = [];
    this.curPageBreakNum = 0;
    this.updateCount = 0;
  },


  cacheExistingPageBreaks: function cacheExistingPageBreaks () {
    var doc = gScriptController.editor.contentDocument;
    var xpath = new XPathEvaluator();
    var str = '//div[@class="softbreak" or @class="hardbreak"]';
    var result = xpath.evaluate(str, doc, null,
                                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    this.pageBreakOffsets = new Array(result.snapshotLength);
    for (var i = 0; i < result.snapshotLength; i++) {
      var pagebreak = result.snapshotItem(i);
      this.pageBreakOffsets[i] = pagebreak.offsetTop;
    }
  },


  adjustSynchronously: function adjustSynchronously () {
    var doc = gScriptController.editor.contentDocument;
    var xpath = new XPathEvaluator();
    var str = '//div[@class="softbreak" or @class="hardbreak"]';
    var result = xpath.evaluate(str, doc, null,
                                XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    // |lastbreak| stores the last page break known to have a correct offset
    var lastbreak = null;
    var pagebreak;
    var breakNum = 0;

    // Determine where the first adjustment needs to be made
    try {
      while (pagebreak = result.iterateNext()) {
        if (breakNum >= this.pageBreakOffsets.length ||
            pagebreak.offsetTop != this.pageBreakOffsets[breakNum])
          break;
        lastbreak = pagebreak;
        ++breakNum;
      }
    }
    catch (ex) {
      dump("*** Invalid state error while iterating through page breaks\n");
      return;
    }

    this.calculateLineHeight();

    // Adjust all the way to the end
    const ELEMENT_NODE = 1;
    var node = lastbreak ? lastbreak.nextSibling : doc.body.firstChild;
    while (node && node.nodeType != ELEMENT_NODE)
      node = node.nextSibling;
    this.nextPageStartsAt = node;
    this.curPageBreakNum = breakNum;

    while (this.nextPageStartsAt) {
      gScriptController.editor.editor.beginTransaction();
      try {
        this.adjustNextPageBreak();
      }
      catch (ex) {
        dump("*** adjustNextPageBreak: " + ex + "\n");
      }
      gScriptController.editor.editor.endTransaction();
    }

    // Update the page counter
    var count = this.pageBreakOffsets.length + 1;
    var prefix = gApp.getText("PageCountPrefix");
    top.setStatusMessageRight(prefix + " " + count);

    this.lastPaginationEnded = new Date().valueOf();
  },


  adjustPageBreaks: function adjustPageBreaks () {
    // Evaluate less frequently (1/5th the time) if we aren't
    // in the middle of a pagination pass.
    if ((this.updateCount++ % 5) != 0 && ! this.nextPageStartsAt)
      return;

    // Give the user a couple seconds minimum between paginations
    if ((new Date()).valueOf() - this.lastPaginationEnded < 2000)
      return;

    var doc = gScriptController.editor.contentDocument;
    var xpath = new XPathEvaluator();
    var str = '//div[@class="softbreak" or @class="hardbreak"]';
    var result = xpath.evaluate(str, doc, null,
                                XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    // |lastbreak| stores the last page break known to have a correct offset
    var lastbreak = null;
    var pagebreak;
    var breakNum = 0;

    // Determine where the first adjustment needs to be made
    try {
      while (pagebreak = result.iterateNext()) {
        if (breakNum >= this.pageBreakOffsets.length ||
            pagebreak.offsetTop != this.pageBreakOffsets[breakNum])
          break;
        lastbreak = pagebreak;
        ++breakNum;
      }
    }
    catch (ex) {
      dump("*** Invalid state error while iterating through page breaks\n");
      return;
    }

    if (! this.nextPageStartsAt)
      this.calculateLineHeight();

    // Adjust all the way to the end, or until a couple seconds have passed
    const ELEMENT_NODE = 1;
    var node = lastbreak ? lastbreak.nextSibling : doc.body.firstChild;
    while (node && node.nodeType != ELEMENT_NODE)
      node = node.nextSibling;
    this.nextPageStartsAt = node;

    this.curPageBreakNum = breakNum;
    var startMillis = (new Date()).valueOf();
    var kMaxMillis = startMillis + 500;
    while (this.nextPageStartsAt && (new Date()).valueOf() < kMaxMillis) {
      gScriptController.editor.editor.beginTransaction();
      try {
        this.adjustNextPageBreak();
      }
      catch (ex) {
        dump("*** adjustNextPageBreak: " + ex + "\n");
      }
      gScriptController.editor.editor.endTransaction();
    }

    // Update the page counter
    var count = this.pageBreakOffsets.length + 1;
    var prefix = gApp.getText("PageCountPrefix");
    var suffix = this.nextPageStartsAt ? "..." : "";
    top.setStatusMessageRight(prefix + " " + count + suffix);

    this.lastPaginationEnded = new Date().valueOf();
  },


  canBreakBeforeNode: function canBreakBeforeNode (node) {
    const ELEMENT_NODE = 1;
    if (node.nodeType != ELEMENT_NODE) return false;

    var left = node.previousSibling;
    while (left && (left.nodeType != ELEMENT_NODE || left.tagName != "P"))
      left = left.previousSibling;
    if (! left) return false;

    if (left.className == "sceneheading" ||
        left.className == "character" ||
        left.className == "parenthetical")
      return false;
    
    return true;
  },


  // A new adjustNextPageBreak implementation
  adjustNextPageBreak: function adjustNextPageBreak () {
    var doc = gScriptController.editor.contentDocument;
    var linesPerPage = gScriptController.scriptConfig.linesPerPage;
    const pageHeight = this.lineHeight * linesPerPage;
    var node = this.nextPageStartsAt;

    // If no current starting point, start at the beginning
    if (! node) {
      node = doc.body.firstChild;
      if (! (node instanceof Components.interfaces.nsIDOMElement))
        node = nextElement(node);
      this.curPageBreakNum = 0;
      if (! node)
        return;
    }

    var pageEnd = node.offsetTop + pageHeight;
    var innerBreak = null;

    // Basic strategy:
    // 1. Get the next node
    // 2. If the next node is undefined
    // 2.1. If the page break cache extends further
    // 2.1.1. Splice the remaining page breaks
    // 2.2. Exit
    // 3. Else if the next node is a hard break (or act)
    // 3.1. Advance the page cursor
    // 3.2. Exit
    // 4. Else if the next node is a soft break
    // 4.1. If a soft break is cached as |innerBreak|
    // 4.1.1. Remove |innerBreak|
    // 4.2. Cache the node as |innerBreak|
    // 5. Else if the node does not fit the page
    // 5.1. Find the last node (inclusive) that allows a break before it
    // 5.2. If a soft break is cached as |innerBreak|
    // 5.2.1. If |innerBreak| occurs as the previous sibling to the last node
    // 5.2.1.1. Advance the page cursor
    // 5.2.1.2. Exit
    // 5.2.2. Else
    // 5.2.2.1. Remove |innerBreak|
    // 5.2.2.2. Insert a new soft page break
    // 5.2.2.3. Advance the page cursor
    // 5.2.2.4. Exit
    // 5.3. Else
    // 5.3.1. Insert a new soft page break
    // 5.3.2. Advance the page cursor
    // 5.3.3. Exit
    // 6. Else
    // 6.1. Continue
    while (node = nextElement(node)) {
      if (node.className == "act") {
        var prev = previousElement(node);
        if (prev.className != "softbreak" && prev.className != "hardbreak") {
          prev = doc.createElement("div");
          prev.className = "softbreak";
          prev.appendChild(doc.createTextNode(" "));
          node.parentNode.insertBefore(prev, node);
        }
        if (this.curPageBreakNum >= this.pageBreakOffsets.length)
          this.pageBreakOffsets.push(prev.offsetTop);
        else
          this.pageBreakOffsets[this.curPageBreakNum] = prev.offsetTop;
        this.curPageBreakNum += 1;
        this.nextPageStartsAt = node;
        return;
      }

      if (node.className == "hardbreak") {
        if (this.curPageBreakNum >= this.pageBreakOffsets.length)
          this.pageBreakOffsets.push(node.offsetTop);
        else
          this.pageBreakOffsets[this.curPageBreakNum] = node.offsetTop;
        this.curPageBreakNum += 1;
        this.nextPageStartsAt = nextElement(node);
        return;
      }

      if (node.className == "softbreak") {
        if (innerBreak) {
          innerBreak.parentNode.removeChild(innerBreak);
        }
        else {
          // Remove the softbreak's height from calculations!
          var next = nextElement(node);
          if (next) {
            var delta = next.offsetTop - node.offsetTop
            pageEnd += delta;
          }
        }
        innerBreak = node;
      }
      else if (node.offsetTop + node.clientHeight > pageEnd) {
        var curnode = node;
        while (! this.canBreakBeforeNode(node)
            && node != this.nextPageStartsAt && previousElement(node))
          node = previousElement(node);

        // Backtracking lead us all the way back to the previous page.
        // This generally happens when an element is too big to fit
        // on the page. Until we can break long elements in half, keep
        // going forward until the next opportunity to insert a break.
        if (node == this.nextPageStartsAt) {
          node = curnode;
          continue;
        }

        if (innerBreak) {
          // Move it up
          if (previousElement(node) != innerBreak) {
            node.parentNode.insertBefore(innerBreak, node);
          }
        }
        else {
          innerBreak = doc.createElement("div");
          innerBreak.className = "softbreak";
          innerBreak.appendChild(doc.createTextNode(" "));
          node.parentNode.insertBefore(innerBreak, node);
        }
        if (this.curPageBreakNum >= this.pageBreakOffsets.length)
          this.pageBreakOffsets.push(innerBreak.offsetTop);
        else
          this.pageBreakOffsets[this.curPageBreakNum] = innerBreak.offsetTop;
        this.curPageBreakNum += 1;
        this.nextPageStartsAt = node;
        return;
      }
    }

    // I'm pretty sure this is guaranteed...
    if (! node) {
      if (this.pageBreakOffsets.length > 0 &&
          this.pageBreakOffsets.length > this.curPageBreakNum + 1) {
        this.pageBreakOffsets.splice(this.curPageBreakNum + 1,
          this.pageBreakOffsets.length - (this.curPageBreakNum + 1));
      }
      if (innerBreak) {
        innerBreak.parentNode.removeChild(innerBreak);
      }
      this.nextPageStartsAt = null;
      return;
    }
  },


  calculateLineHeight: function calculateLineHeight () {
    // On Windows, lines seem to be aligned to a sub-pixel resolution grid,
    // so two seemingly identical lines can have different heights. We have
    // to use a known value instead.
    if (! isMac()) {
      this.lineHeight = gScriptController.scriptConfig.zoomed ? 17.3 : 15.3;
      return;
    }

    const ELEMENT_NODE = 1;
    var doc = gScriptController.editor.contentDocument;
    var testPara = doc.createElement("P");
    var testSpan = doc.createElement("SPAN");
    testSpan.appendChild(doc.createTextNode("x"));
    testPara.appendChild(testSpan);
    doc.body.appendChild(testPara);
    this.lineHeight = testPara.clientHeight;
    this.charWidth = testSpan.offsetWidth;
    doc.body.removeChild(testPara);
  }
};

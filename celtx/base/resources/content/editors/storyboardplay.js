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

var gWindow = new Object();

var gController = {
  supportsCommand: function (cmd) {
    return cmd == "cmd-close";
  },
  isCommandEnabled: function (cmd) {
    return cmd == "cmd-close";
  },
  doCommand: function (cmd) {
    if (cmd == "cmd-close") {
      window.controllers.removeController(gController);
      window.controllers.removeController(gApp);
      window.close();
    }
  }
};

function loaded () {
  window.controllers.appendController(gController);
  window.controllers.appendController(gApp);

  gWindow.decrbtn   = document.getElementById("decrbtn");
  gWindow.delaylbl  = document.getElementById("delaylbl");
  gWindow.incrbtn   = document.getElementById("incrbtn");
  gWindow.firstbtn  = document.getElementById("firstbtn");
  gWindow.prevbtn   = document.getElementById("prevbtn");
  gWindow.playbtn   = document.getElementById("playbtn");
  gWindow.nextbtn   = document.getElementById("nextbtn");
  gWindow.lastbtn   = document.getElementById("lastbtn");
  gWindow.seqlabel  = document.getElementById("seqlabel");
  gWindow.shotlabel = document.getElementById("shotlabel");
  gWindow.shotimg   = document.getElementById("shotimg");
  gWindow.seqpicker = document.getElementById("seqpicker");

  gWindow.storydom = window.arguments[0];
  gWindow.project = window.arguments[1];
  gWindow.playtimer = null;

  var title = gWindow.storydom.documentElement.getAttribute("title");
  document.title = title;

  var ps = getPrefService().getBranch("celtx.storyboard.slideshow.");
  var delay = ps.getIntPref("delay");
  gWindow.delaylbl.value = delay;
  if (delay == 1)
    gWindow.decrbtn.disabled = true;
  if (delay == 10)
    gWindow.incrbtn.disabled = true;

  var IElement = Components.interfaces.nsIDOMElement;
  var firstseq = gWindow.storydom.documentElement.firstChild;
  while (! ((firstseq instanceof IElement) && firstseq.childNodes.length > 0))
    firstseq = nextElement(firstseq);
  gWindow.firstshot = firstseq.firstChild;
  if (! (gWindow.firstshot instanceof IElement))
    gWindow.firstshot = nextElement(gWindow.firstshot);

  var lastseq = gWindow.storydom.documentElement.lastChild;
  while (! ((lastseq instanceof IElement) && lastseq.childNodes.length > 0))
    lastseq = previousElement(lastseq);
  gWindow.lastshot = lastseq.lastChild;
  if (! (gWindow.lastshot instanceof IElement))
    gWindow.lastshot = previousElement(gWindow.lastshot);

  gWindow.current = gWindow.firstshot;

  var curseq = firstseq;
  var seqnum = 1;
  while (curseq) {
    var menuitem = document.createElementNS(Cx.NS_XUL, "menuitem");
    menuitem.setAttribute("label", curseq.getAttribute("title"));
    menuitem.setAttribute("value", seqnum++);
    gWindow.seqpicker.firstChild.appendChild(menuitem);
    curseq = nextElement(curseq);
  }

  var startseq = window.arguments.length >= 3 ? window.arguments[2] : 1;
  jumpToSequence(startseq);
  // gWindow.seqpicker.selectedItem = gWindow.seqpicker.firstChild.firstChild;

  // refresh();
}

function jumpToSequence (seqnum) {
  var curseq = gWindow.firstshot.parentNode;
  var curnum = 1;
  while (curseq && curnum < seqnum) {
    curseq = nextElement(curseq);
    ++curnum;
  }
  if (! curseq)
    return;
  var shot = curseq.firstChild;
  while (shot && ! (shot instanceof Components.interfaces.nsIDOMElement))
    shot = nextElement(shot);
  if (shot) {
    gWindow.current = shot;
    refresh();
  }
}

function resolveImageToURL (imageresuri) {
  var rdfsvc = getRDFService();
  var localFileArc = rdfsvc.GetResource(Cx.NS_CX + "localFile");
  var imageres = rdfsvc.GetResource(imageresuri);
  var image = getRDFString(gWindow.project.ds, imageres, localFileArc);
  if (! image) {
    dump("*** no localFile for " + imageresuri + "\n");
    return null;
  }
  try {
    var imagefile = gWindow.project.projectFolder;
    imagefile.append(image);
    return fileToFileURL(imagefile);
  }
  catch (ex) {
    dump("*** resolveImageToURL: " + ex + "\n    image: " + image + "\n");
    return null;
  }
}

function refresh () {
  var seqnum = 1;
  var shotnum = 1;
  var seq = gWindow.firstshot.parentNode;
  while (seq && seq != gWindow.current.parentNode) {
    ++seqnum;
    seq = nextElement(seq);
  }
  var shot = seq.firstChild;
  if (! (shot instanceof Components.interfaces.nsIDOMElement))
    shot = nextElement(shot);
  while (shot && shot != gWindow.current) {
    ++shotnum;
    shot = nextElement(shot);
  }
  var seqtitle = gWindow.current.parentNode.getAttribute("title");
  var shottitle = gWindow.current.getAttribute("title");
  gWindow.seqlabel.value = seqnum + ". " + seqtitle;
  var desc = document.createTextNode(seqnum + "." + shotnum + ". " + shottitle);
  gWindow.shotlabel.replaceChild(desc, gWindow.shotlabel.firstChild);
  var imgfile = resolveImageToURL(gWindow.current.getAttribute("imageres"));
  if (imgfile)
    gWindow.shotimg.setAttribute("src", imgfile);

  if (gWindow.seqpicker.selectedIndex != seqnum - 1)
    gWindow.seqpicker.selectedIndex = seqnum - 1;

  gWindow.firstbtn.disabled = (gWindow.current == gWindow.firstshot);
  gWindow.prevbtn.disabled = (gWindow.current == gWindow.firstshot);
  gWindow.nextbtn.disabled = (gWindow.current == gWindow.lastshot);
  gWindow.lastbtn.disabled = (gWindow.current == gWindow.lastshot);
}

function previous () {
  var IElement = Components.interfaces.nsIDOMElement;
  var prev = previousElement(gWindow.current);
  if (! prev) {
    var prevseq = previousElement(gWindow.current.parentNode);
    while (prevseq && prevseq.childNodes.length == 0)
      prevseq = previousElement(prevseq);
    if (prevseq) {
      prev = prevseq.lastChild;
      if (prev && ! (prev instanceof IElement))
        prev = previousElement(prev);
    }
  }
  if (prev) {
    gWindow.current = prev;
    refresh();
  }
}

function next () {
  var IElement = Components.interfaces.nsIDOMElement;
  var next = nextElement(gWindow.current);
  if (! next) {
    var nextseq = nextElement(gWindow.current.parentNode);
    while (nextseq && nextseq.childNodes.length == 0)
      nextseq = nextElement(nextseq);
    if (nextseq) {
      next = nextseq.firstChild;
      if (next && ! (next instanceof IElement))
        next = nextElement(next);
    }
  }
  if (next) {
    gWindow.current = next;
    refresh();
  }
  else if (gWindow.playtimer) {
    play();
  }
}

function first () {
  gWindow.current = gWindow.firstshot;
  refresh();
}

function last () {
  gWindow.current = gWindow.lastshot;
  refresh();
}

function play () {
  if (gWindow.playtimer) {
    clearInterval(gWindow.playtimer);
    gWindow.playtimer = null;
    gWindow.playbtn.removeAttribute("playing");
    return;
  }
  if (gWindow.current == gWindow.lastshot) {
    gWindow.current = gWindow.firstshot;
    refresh();
  }
  var ps = getPrefService().getBranch("celtx.storyboard.slideshow.");
  gWindow.playtimer = setInterval("next()", ps.getIntPref("delay") * 1000);
  gWindow.playbtn.setAttribute("playing", "true");
}

function increaseDelay () {
  var ps = getPrefService().getBranch("celtx.storyboard.slideshow.");
  var delay = ps.getIntPref("delay");
  delay += 1;
  if (delay >= 10) {
    gWindow.incrbtn.disabled = true;
    delay = 10;
  }
  gWindow.decrbtn.disabled = false;
  ps.setIntPref("delay", delay);
  gWindow.delaylbl.value = delay;
}

function decreaseDelay () {
  var ps = getPrefService().getBranch("celtx.storyboard.slideshow.");
  var delay = ps.getIntPref("delay");
  delay -= 1;
  if (delay <= 1) {
    gWindow.decrbtn.disabled = true;
    delay = 1;
  }
  gWindow.incrbtn.disabled = false;
  ps.setIntPref("delay", delay);
  gWindow.delaylbl.value = delay;
}

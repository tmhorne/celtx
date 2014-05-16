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

var gScriptPane = {};

function scriptLoaded () {
  dump("    script pane loaded\n");
  gScriptPane.intpref = document.getElementById("celtx.scripteditor.intexts");
  gScriptPane.intlist = document.getElementById("intextlist");
  gScriptPane.intbox = document.getElementById("intextbox");
  gScriptPane.intadd = document.getElementById("intextadd");
  gScriptPane.intremove = document.getElementById("intextremove");
  gScriptPane.daypref = document.getElementById("celtx.scripteditor.daynights");
  gScriptPane.daylist = document.getElementById("daynightlist");
  gScriptPane.daybox = document.getElementById("daynightbox");
  gScriptPane.dayadd = document.getElementById("daynightadd");
  gScriptPane.dayremove = document.getElementById("daynightremove");
  gScriptPane.shotpref = document.getElementById("celtx.scripteditor.shots");
  gScriptPane.shotlist = document.getElementById("shotlist");
  gScriptPane.shotbox = document.getElementById("shotbox");
  gScriptPane.shotadd = document.getElementById("shotadd");
  gScriptPane.shotremove = document.getElementById("shotremove");

  var intexts = gScriptPane.intpref.value.split(",");
  for (var i = 0; i < intexts.length; ++i)
    gScriptPane.intlist.appendItem(intexts[i]);

  var daynights = gScriptPane.daypref.value.split(",");
  for (var i = 0; i < daynights.length; ++i)
    gScriptPane.daylist.appendItem(daynights[i]);

  var shots = gScriptPane.shotpref.value.split(",");
  for (var i = 0; i < shots.length; ++i)
    gScriptPane.shotlist.appendItem(shots[i]);

  validate();
}

function validate () {
  gScriptPane.intadd.disabled = (gScriptPane.intbox.value == "");
  gScriptPane.intremove.disabled = (gScriptPane.intlist.selectedIndex < 0);

  gScriptPane.dayadd.disabled = (gScriptPane.daybox.value == "");
  gScriptPane.dayremove.disabled = (gScriptPane.daylist.selectedIndex < 0);

  gScriptPane.shotadd.disabled = (gScriptPane.shotbox.value == "");
  gScriptPane.shotremove.disabled = (gScriptPane.shotlist.selectedIndex < 0);
}

function addIntExt () {
  var intexts = gScriptPane.intpref.value.split(",");
  var val = gScriptPane.intbox.value.toUpperCase();
  for (var i = 0; i < intexts.length; ++i) {
    if (val == intexts[i])
      return;
  }
  gScriptPane.intlist.appendItem(val);
  intexts.push(val);
  gScriptPane.intpref.value = intexts.join(",");
}

function removeIntExt () {
  var intexts = gScriptPane.intpref.value.split(",");
  var val = gScriptPane.intlist.selectedItem.label;
  var idx = gScriptPane.intlist.selectedIndex;
  if (intexts[idx] != val) {
    dump("*** removeIntExt: " + val + " != " + intexts[idx] + "\n");
    return;
  }
  intexts.splice(idx, 1);
  gScriptPane.intlist.removeItemAt(idx);
  gScriptPane.intpref.value = intexts.join(",");
}

function addDayNight () {
  var daynights = gScriptPane.daypref.value.split(",");
  var val = gScriptPane.daybox.value.toUpperCase();
  for (var i = 0; i < daynights.length; ++i) {
    if (val == daynights[i])
      return;
  }
  gScriptPane.daylist.appendItem(val);
  daynights.push(val);
  gScriptPane.daypref.value = daynights.join(",");
}

function removeDayNight () {
  var daynights = gScriptPane.daypref.value.split(",");
  var val = gScriptPane.daylist.selectedItem.label;
  var idx = gScriptPane.daylist.selectedIndex;
  if (daynights[idx] != val) {
    dump("*** removeDayNight: " + val + " != " + daynights[idx] + "\n");
    return;
  }
  daynights.splice(idx, 1);
  gScriptPane.daylist.removeItemAt(idx);
  gScriptPane.daypref.value = daynights.join(",");
}

function addShot () {
  var shots = gScriptPane.shotpref.value.split(",");
  var val = gScriptPane.shotbox.value.toUpperCase();
  if (! val.match(/:$/))
    val += ":";
  for (var i = 0; i < shots.length; ++i) {
    if (val == shots[i])
      return;
  }
  gScriptPane.shotlist.appendItem(val);
  shots.push(val);
  gScriptPane.shotpref.value = shots.join(",");
}

function removeShot () {
  var shots = gScriptPane.shotpref.value.split(",");
  var val = gScriptPane.shotlist.selectedItem.label;
  var idx = gScriptPane.shotlist.selectedIndex;
  if (shots[idx] != val) {
    dump("*** removeShot: " + val + " != " + shots[idx] + "\n");
    return;
  }
  shots.splice(idx, 1);
  gScriptPane.shotlist.removeItemAt(idx);
  gScriptPane.shotpref.value = shots.join(",");
}

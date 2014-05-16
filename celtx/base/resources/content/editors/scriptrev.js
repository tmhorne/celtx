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

var gDialog = new Object();


function loaded () {
  gDialog.config = window.arguments[0];
  gDialog.revname = document.getElementById("name");
  gDialog.revcolour = document.getElementById("colour");
  gDialog.lockscenes = document.getElementById("lockscenes");

  gDialog.modeCache = { "new": null, "current": null };

  if (gDialog.config.forceCreate) {
    gDialog.mode = "new";
    document.getElementById("modegroup").selectedItem
      = document.getElementById("modenew");
    document.getElementById("modecurrent").disabled = true;
  }
  else {
    gDialog.mode = "current";
  }

  if (gDialog.config.name)
    gDialog.revname.value = gDialog.config.name;

  if (gDialog.config.colour) {
    var item = getItemByValue(gDialog.revcolour, gDialog.config.colour);
    if (item)
      gDialog.revcolour.selectedItem = item;
  }
  else {
    gDialog.revcolour.selectedIndex =
      gDialog.config.revision % gDialog.revcolour.itemCount;
  }

  // If scene locking is already enabled, don't let the user disable it,
  // because that would imply resetting scene numbers. If it isn't enabled
  // and the user is already in revision mode, uncheck the option by default,
  // since that was their last choice.
  if (gDialog.config.lockscenes)
    gDialog.lockscenes.disabled = true;
  else if (gDialog.config.revision > 0)
    gDialog.lockscenes.checked = false;

  // Trigger an Accept button update
  nameChanged();
}


function setMode (mode) {
  if (gDialog.mode == mode)
    return;

  var name = gDialog.revname.value;
  var colour = gDialog.revcolour.selectedItem.value;
  var lockscenes = gDialog.lockscenes.checked;

  if (! gDialog.modeCache[gDialog.mode])
    gDialog.modeCache[gDialog.mode] = new Object();

  gDialog.modeCache[gDialog.mode].name = name;
  gDialog.modeCache[gDialog.mode].colour = colour;
  gDialog.modeCache[gDialog.mode].lockscenes = lockscenes;

  if (gDialog.modeCache[mode]) {
    var cached = gDialog.modeCache[mode];
    gDialog.revname.value = cached.name;
    var colouritem = getItemByValue(gDialog.revcolour, cached.colour);
    if (colouritem)
      gDialog.revcolour.selectedItem = colouritem;
    gDialog.lockscenes.checked = cached.lockscenes;
  }
  else {
    var revnum = gDialog.config.revision;
    // There should always be a cached "current", but just in case anything
    // is wrong here, sensible values should be used.
    if (mode == "new")
      revnum += 1;
    gDialog.revname.value = gApp.getText("RevisionNumber", [ revnum ]);
    var colouridx = gDialog.revcolour.selectedIndex;
    if (mode == "new")
      colouridx += 1;
    else
      colouridx -= 1;
    colouridx = colouridx % gDialog.revcolour.itemCount;
    gDialog.revcolour.selectedIndex = colouridx;
    gDialog.lockscenes.checked = mode == "new";
  }

  gDialog.mode = mode;
}


function nameChanged () {
  setTimeout(function () {
    var accept = document.documentElement.getButton("accept");
    accept.disabled = ! gDialog.revname.value;
  }, 0);
}


function accepted () {
  gDialog.config.name = gDialog.revname.value;
  gDialog.config.colour = gDialog.revcolour.selectedItem.value;
  gDialog.config.lockscenes = gDialog.lockscenes.checked;
  gDialog.config.create = document.getElementById("modenew").selected;

  gDialog.config.accepted = true;
}

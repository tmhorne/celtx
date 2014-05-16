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

var gDialog;

function el (id) {
  return document.getElementById(id);
}

function loaded () {
  gDialog = new Object;

  if (window.arguments) {
    gDialog.config = window.arguments[0];
    switch (gDialog.config.mode) {
      case "av":
        document.getElementById("morestab").hidden = true;
        document.getElementById("theatreformatgroup").hidden = true;
        document.getElementById("scenenumberbox").hidden = true;
        document.getElementById("scenespacingbox").hidden = true;
        break;
      case "film":
        document.getElementById("headertab").hidden = true;
        document.getElementById("formatgroupbox").hidden = true;
        document.getElementById("avshowmainheader").hidden = true;
        document.getElementById("avshowheaders").hidden = true;
        document.getElementById("scenePageBreaksBox").hidden = false;
        break;
      case "theatre":
        document.getElementById("headertab").hidden = true;
        document.getElementById("avformatgroup").hidden = true;
        document.getElementById("avshowmainheader").hidden = true;
        document.getElementById("avshowheaders").hidden = true;
        document.getElementById("showtitlepage").label
          = gApp.getText("ShowTitlePageAndCast");
        document.getElementById("scenespacingbox").hidden = true;
        break;
      case "radio":
        document.getElementById("formatgroupbox").hidden = true;
        document.getElementById("avshowmainheader").hidden = true;
        document.getElementById("avshowheaders").hidden = true;
        document.getElementById("showcharnumbers").hidden = false;
        document.getElementById("scenenumberbox").hidden = true;
        document.getElementById("showtitlepage").label
          = gApp.getText("ShowTitlePageAndCast");
        document.getElementById("scenespacingbox").hidden = true;
        document.getElementById("audioformatbox").hidden = false;
        document.getElementById("bbctab").hidden = false;
        document.getElementById("morestab").hidden = true;
        document.getElementById("headertab").hidden = true;
        break;
      case "comic":
        document.getElementById("pdftabs").collapsed = true;
        document.getElementById("formatgroupbox").hidden = true;
        document.getElementById("avshowmainheader").hidden = true;
        document.getElementById("avshowheaders").hidden = true;
        document.getElementById("scenenumberbox").hidden = true;
        document.getElementById("scenespacingbox").hidden = true;
        break;
    }

    if (gDialog.config.paperSize) {
      var paperlist = document.getElementById("paperlist");
      paperlist.selectedItem = getItemByValue(paperlist,
        gDialog.config.paperSize);
    }
    if (gDialog.config.sceneNumbers) {
      var scenelist = document.getElementById("scenenumberlist");
      scenelist.selectedItem = getItemByValue(scenelist,
        gDialog.config.sceneNumbers);
    }
    if (gDialog.config.showScenes) {
      var showscenes = document.getElementById("avshowheaders");
      showscenes.checked = true;
    }
    if (gDialog.config.showAVHeader) {
      document.getElementById("avshowmainheader").checked = true;
    }
    if (! gDialog.config.showTitle) {
      document.getElementById("showtitlepage").checked = false;
    }
    if (gDialog.config.theatreFormat) {
      var theatregroup = document.getElementById("theatreformatgroup");
      theatregroup.selectedItem = getItemByValue(theatregroup,
        gDialog.config.theatreFormat);
    }
    if (gDialog.config.avFormat) {
      var avgroup = document.getElementById("avformatgroup");
      avgroup.selectedItem = getItemByValue(avgroup, gDialog.config.avFormat);
    }
    if (gDialog.config.showCharNumbers) {
      document.getElementById("showcharnumbers").checked = true;
    }
    if (gDialog.config.avHeaders) {
      var headers = gDialog.config.avHeaders;
      for (var i = 0; i < headers.length; ++i) {
        var field = null;
        if (i & 1) {
          var row = (i + 1) / 2;
          field = document.getElementById("headerfield" + row + "B");
        }
        else {
          var row = i / 2 + 1;
          field = document.getElementById("headerfield" + row + "A");
        }
        field.value = headers[i].value;
      }
    }
  }

  gDialog.dialogBreakCheckbox    = el("dialogBreakCheckbox");
  gDialog.dialogBottomTextbox    = el("dialogBottomTextbox");
  gDialog.dialogTopTextbox       = el("dialogTopTextbox");
  gDialog.dialogTopLabel         = el("dialogTopLabel");
  gDialog.dialogBottomLabel      = el("dialogBottomLabel");

  gDialog.charContinuedsCheckbox = el("charContinuedsCheckbox");

  gDialog.sceneBreakCheckbox     = el("sceneBreakCheckbox");
  gDialog.sceneBottomTextbox     = el("sceneBottomTextbox");
  gDialog.sceneTopTextbox        = el("sceneTopTextbox");
  gDialog.sceneTopLabel          = el("sceneTopLabel");
  gDialog.sceneBottomLabel       = el("sceneBottomLabel");

  gDialog.contNumbersCheckbox    = el("continuedNumbersCheckbox");

  gDialog.avHeaderCheckbox       = el("avshowmainheader");

  gDialog.bbcShowName            = el("bbcshowname");
  gDialog.bbcSketchName          = el("bbcsketchname");
  gDialog.bbcContact             = el("bbccontact");

  gDialog.bbcShowName.value = gDialog.config.bbcShowName;
  gDialog.bbcSketchName.value = gDialog.config.bbcSketchName;
  gDialog.bbcContact.value = gDialog.config.bbcContact;

  var prefMap = {
    "dialog.breakbottom.text": "DialogBreakBottomText",
    "dialog.breaktop.text": "DialogBreakTopText",
    "scene.breakbottom.text": "SceneBreakBottomText",
    "scene.breaktop.text": "SceneBreakTopText"
  };
  try {
    var ps = getPrefService().getBranch("celtx.pdf.");
    for (var pref in prefMap) {
      if (! ps.prefHasUserValue(pref)) {
        const nsISupportsString = Components.interfaces.nsISupportsString;
        var unistring = createSupportsString(gApp.getText(prefMap[pref]));
        ps.setComplexValue(pref, nsISupportsString, unistring);
      }
    }
  }
  catch (ex) {
    dump("*** pdfoptions.loaded: " + ex + "\n");
  }

  doEnabling();
}


function doEnabling () {
  var disabled;

  disabled = ! gDialog.dialogBreakCheckbox.checked;
  gDialog.dialogTopLabel.disabled = disabled;
  gDialog.dialogTopTextbox.disabled = disabled;
  gDialog.dialogBottomLabel.disabled = disabled;
  gDialog.dialogBottomTextbox.disabled = disabled;

  disabled = ! gDialog.sceneBreakCheckbox.checked;
  gDialog.sceneTopLabel.disabled = disabled;
  gDialog.sceneTopTextbox.disabled = disabled;
  gDialog.sceneBottomLabel.disabled = disabled;
  gDialog.sceneBottomTextbox.disabled = disabled;
  gDialog.contNumbersCheckbox.disabled = disabled;

  disabled = ! gDialog.avHeaderCheckbox.checked;
  var textboxes = document.getElementById("headerrows")
    .getElementsByTagName("textbox");
  for (var i = 0; i < textboxes.length ; ++i)
    textboxes[i].disabled = disabled;
}



function accepted () {
  if (! gDialog.config)
    return true;

  gDialog.config.accepted = true;
  gDialog.config.paperSize = document.getElementById("paperlist").value;
  gDialog.config.sceneNumbers =
    document.getElementById("scenenumberlist").value;
  gDialog.config.showScenes = document.getElementById("avshowheaders").checked;
  gDialog.config.theatreFormat =
    document.getElementById("theatreformatgroup").value;
  gDialog.config.avFormat = document.getElementById("avformatgroup").value;
  gDialog.config.showTitle = document.getElementById("showtitlepage").checked;
  gDialog.config.showCharNumbers =
    document.getElementById("showcharnumbers").checked;

  gDialog.config.bbcShowName = gDialog.bbcShowName.value;
  gDialog.config.bbcSketchName = gDialog.bbcSketchName.value;
  gDialog.config.bbcContact = gDialog.bbcContact.value;

  if (gDialog.config.mode == "av") {
    gDialog.config.showAVHeader = 
      document.getElementById("avshowmainheader").checked;
    var headers = gDialog.config.avHeaders;
    var rows = document.getElementById("headerrows")
      .getElementsByTagName("row");
    for (var i = 0; i < rows.length; ++i) {
      var label = rows[i].firstChild;
      var field = label.nextSibling;
      var idx = i * 2;
      headers[idx++] = { name: label.value, value: field.value };
      label = field.nextSibling;
      field = label.nextSibling;
      headers[idx] = { name: label.value, value: field.value };
    }
  }

  return true;
}

function canceled () {
  return true;
}


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
  gDialog.presetmenu = document.getElementById("presetmenu");
  gDialog.scenelist = document.getElementById("scenelist");

  gDialog.numberFields = [];
  for (var i = 0; i < 4; ++i) {
    var idprefix = "num" + (i+1);
    gDialog.numberFields.push({
      position:   document.getElementById(idprefix + "position"),
      prefix:     document.getElementById(idprefix + "prefix"),
      numbering:  document.getElementById(idprefix + "numbering"),
      suffix:     document.getElementById(idprefix + "suffix"),
      example:    document.getElementById(idprefix + "example")
    });
  }

  gDialog.numberSvc = Components.classes["@celtx.com/scene-number-service;1"]
    .getService(Components.interfaces.nsISceneNumberService);

  var rdfsvc = getRDFService();
  gDialog.schemads = rdfsvc.GetDataSourceBlocking(Cx.SCHEMA_URL);
  var preffile = currentProfileDir();
  preffile.append(Cx.PREFS_FILE);
  gDialog.prefds = rdfsvc.GetDataSourceBlocking(fileToFileURL(preffile));

  initNumberSchemePanel();
  initSceneNumberPanel();

  window.sizeToContent();
}


function initNumberSchemePanel () {
  var rdfsvc = getRDFService();
  var schemaid = rdfsvc.GetResource(Cx.SCHEMA_URL + "#numberSchemes");
  var prefid = rdfsvc.GetResource(gDialog.prefds.URI + "#numberSchemes");

  gDialog.preset = {};
  gDialog.schemaseq = new RDFSeq(gDialog.schemads, schemaid);
  gDialog.prefseq = new RDFSeq(gDialog.prefds, prefid);

  var found = false;

  var schemalength = gDialog.schemaseq.length;
  for (var i = 0; i < schemalength; ++i) {
    var schemeres = gDialog.schemaseq.get(i).QueryInterface(
      Components.interfaces.nsIRDFResource);

    var scheme = new NumberingScheme(null, schemeres);
    var schemeval = scheme.shortname ? scheme.shortname : schemeres.Value;
    gDialog.preset[schemeval] = scheme;

    gDialog.presetmenu.insertItemAt(i, scheme.title, schemeval);

    if (! found && gDialog.config.scheme.equals(scheme)) {
      found = true;
      gDialog.presetmenu.selectedIndex = i;
      setScheme(scheme);
    }
  }

  for (var i = 0; i < gDialog.prefseq.length; ++i) {
    var schemeres = gDialog.prefseq.get(i).QueryInterface(
      Components.interfaces.nsIRDFResource);

    var scheme = new NumberingScheme(gDialog.prefds, schemeres);
    var schemeval = scheme.shortname ? scheme.shortname : schemeres.Value;
    gDialog.preset[schemeval] = scheme;

    var offset = schemalength + i;
    gDialog.presetmenu.insertItemAt(offset, scheme.title, schemeval);

    if (! found && gDialog.config.scheme.equals(scheme)) {
      found = true;
      gDialog.presetmenu.selectedIndex = offset;
      setScheme(scheme);
    }
  }

  if (found) {
    lockFields();
    toggleDetails();
  }
  else {
    setScheme(gDialog.config.scheme);
    gDialog.presetmenu.selectedItem = getItemByValue(
      gDialog.presetmenu, "custom");
  }
}


function createItemForScene (scene) {
  var scenenumber = sceneStrToNumber(scene.number);

  var leftbumper = document.createElementNS(Cx.NS_XUL, "toolbarbutton");
  leftbumper.setAttribute("class", "bumperbutton");
  leftbumper.setAttribute("action", "outdent");
  leftbumper.setAttribute("image",
    "chrome://celtx/skin/triangle_left.png");
  leftbumper.setAttribute("oncommand", "outdentSelectedScene()");

  var rightbumper = document.createElementNS(Cx.NS_XUL, "toolbarbutton");
  rightbumper.setAttribute("class", "bumperbutton");
  rightbumper.setAttribute("action", "indent");
  rightbumper.setAttribute("image",
    "chrome://celtx/skin/triangle_right.png");
  rightbumper.setAttribute("oncommand", "indentSelectedScene()");

  var numberlabel = document.createElementNS(Cx.NS_XUL, "label");
  numberlabel.setAttribute("value", sceneNumberToDisplayString(scenenumber));
  numberlabel.setAttribute("anonid", "number");

  var numberbox = document.createElementNS(Cx.NS_XUL, "hbox");
  numberbox.setAttribute("align", "center");
  numberbox.appendChild(leftbumper);
  numberbox.appendChild(numberlabel);
  numberbox.appendChild(rightbumper);

  var headinglabel = document.createElementNS(Cx.NS_XUL, "label");
  headinglabel.setAttribute("value", scene.label);
  headinglabel.setAttribute("crop", "end");

  var item = document.createElementNS(Cx.NS_XUL, "richlistitem");
  item.setAttribute("class", "sceneitem");
  item.setAttribute("value", scene.number);
  item.setAttribute("depth", scenenumber.length);
  item.appendChild(numberbox);
  item.appendChild(headinglabel);

  return item;
}


function initSceneNumberPanel () {
  for (var i = 0; i < gDialog.config.scenes.length; ++i) {
    gDialog.scenelist.appendChild(
      createItemForScene(gDialog.config.scenes[i]));
  }
  updateAllSceneBumpers();
  gDialog.scenelist.selectedIndex = 0;
}


function sceneStrToNumber (scenestr) {
  if (! scenestr)
    printStackTrace();
  // Make sure these are treated as an array of numbers,
  // not an array of characters, or confusion ensues
  var result = scenestr.split(".");
  for (var i = 0; i < result.length; ++i)
    result[i] = Number(result[i]);
  return result;
}


function toggleDetails () {
  var grid = document.getElementById("detailsgrid");
  var icon = document.getElementById("detailsbuttonimage");
  var label = document.getElementById("detailsbuttonlabel");
  if (grid.collapsed) {
    grid.collapsed = false;
    icon.src = "chrome://celtx/skin/arrow_down.gif";
  }
  else {
    grid.collapsed = true;
    icon.src = "chrome://celtx/skin/arrow_right.gif";
  }

  window.sizeToContent();
}


function presetSelected () {
  var preset = document.getElementById("presetmenu").selectedItem.value;
  switch (preset) {
    case "save_as_preset":
      saveAsPreset();
      break;
    case "custom":
      unlockFields();
      if (document.getElementById("detailsgrid").collapsed)
        toggleDetails();
      break;
    default:
      lockFields();
      setScheme(gDialog.preset[preset]);
  }
  updateExamples();
}


function setHollywoodPreset () {
  setScheme(gDialog.preset.hollywood);
  lockFields();
}


function setCeltxPreset () {
  setScheme(gDialog.preset.celtx);
  lockFields();
}


function populateSchemeFromFields (scheme) {
  for (var i = 0; i < gDialog.numberFields.length; ++i) {
    var fields = gDialog.numberFields[i];
    var item = {
      numbering: fields.numbering.selectedItem.value
    };
    if (fields.position)
      item.position = fields.position.selectedItem.value;
    if (fields.prefix)
      item.prefix = fields.prefix.value;
    if (fields.suffix)
      item.suffix = fields.suffix.value;

    scheme.setSchemeAt(i, item);
  }
}


function saveAsPreset () {
  var ps = getPromptService();
  var dlgtitle = gApp.getText("SaveAsPresetTitle");
  var dlgmsg = gApp.getText("SaveAsPresetMsg");
  var title = { value: "" };
  var checkbox = { value: false };
  if (! ps.prompt(window, dlgtitle, dlgmsg, title, null, checkbox))
    return;

  if (! title.value)
    return;

  var rdfsvc = getRDFService();
  var res = rdfsvc.GetAnonymousResource();
  var scheme = new NumberingScheme(gDialog.prefds, res);
  scheme.title = title.value;
  populateSchemeFromFields(scheme);

  var offset = gDialog.schemaseq.length + gDialog.prefseq.length;

  gDialog.prefseq.push(res);
  gDialog.preset[res.Value] = scheme;
  gDialog.presetmenu.insertItemAt(offset, title.value, res.Value);
  gDialog.presetmenu.selectedIndex = offset;

  try {
    gDialog.prefds.QueryInterface(
      Components.interfaces.nsIRDFRemoteDataSource).Flush();
  }
  catch (ex) {
    dump("*** saveAsPreset failed to write prefds: " + ex + "\n");
  }

  lockFields();
}


function setScheme (schemeobj) {
  var scheme = [];
  for (var i = 0; i < schemeobj.depth; ++i)
    scheme.push(schemeobj.getSchemeAt(i));

  gDialog.numberFields[0].numbering.selectedItem = getItemByValue(
    gDialog.numberFields[0].numbering, scheme[0].numbering);

  for (var i = 1; i < 4; ++i) {
    gDialog.numberFields[i].numbering.selectedItem = getItemByValue(
      gDialog.numberFields[i].numbering, scheme[i].numbering);
    gDialog.numberFields[i].position.selectedItem = getItemByValue(
      gDialog.numberFields[i].position, scheme[i].position);
    gDialog.numberFields[i].prefix.value = scheme[i].prefix;
    gDialog.numberFields[i].suffix.value = scheme[i].suffix;
  }

  updateExamples();
}


function fieldsChanged () {
  setTimeout(updateExamples, 0);
}


function sceneNumberToDisplayString (scenenumber) {
  var str = scenenumber[0];

  for (var i = 1; i < scenenumber.length; ++i) {
    // Sanity check
    if (i >= gDialog.numberFields.length)
      break;

    var pos = gDialog.numberFields[i].position.selectedItem.value;
    var prefix = gDialog.numberFields[i].prefix.value;
    var suffix = gDialog.numberFields[i].suffix.value;

    var numval = numberToValue(scenenumber[i],
      gDialog.numberFields[i].numbering.selectedItem.value);

    if (pos == "before")
      str = prefix + numval + suffix + str;
    else
      str += prefix + numval + suffix;
  }

  return str;
}


function updateExamples () {
  var scenenumber = [1, 2, 3, 4];

  for (var i = 0; i < scenenumber.length; ++i) {
    gDialog.numberFields[i].example.value =
      sceneNumberToDisplayString(scenenumber.slice(0, i + 1));
  }
}


function numberToValue (number, numbering) {
  if (numbering == "letter") {
    var val = "";
    while (number > 0) {
      val = String.fromCharCode("A".charCodeAt(0) + number - 1) + val;
      number = Math.floor(number / 10);
    }
    return val;
  }
  else {
    return number;
  } 
}


function lockFields () {
  setFieldsLocked(true);
}


function unlockFields () {
  setFieldsLocked(false);
}


function setFieldsLocked (locked) {
  for (var i = 0; i < gDialog.numberFields.length; ++i) {
    var field = gDialog.numberFields[i];
    if (field.position)   field.position.disabled = locked;
    if (field.numbering)  field.numbering.disabled = locked;
    if (field.prefix)     field.prefix.disabled = locked;
    if (field.suffix)     field.suffix.disabled = locked;
  }
}


function sceneSelected () {
  return;

  // This allows the indent/outdent buttons to disregard a click if it's
  // also a selection click.
  gDialog._selectingScene = true;
  setTimeout(function () { gDialog._selectingScene = false; }, 500);
}


function updateAllSceneBumpers () {
  for (var i = 0; i < gDialog.scenelist.itemCount; ++i)
    updateSceneBumpers(gDialog.scenelist.getItemAtIndex(i));
}


function updateSceneBumpers (sceneItem) {
  var index = gDialog.scenelist.getIndexOfItem(sceneItem);

  var leftbumper = null;
  var rightbumper = null;
  var bumpers = sceneItem.getElementsByTagName("toolbarbutton");
  for (var i = 0; i < bumpers.length; ++i) {
    switch (bumpers[i].getAttribute("action")) {
      case "outdent":
        leftbumper = bumpers[i];
        break;
      case "indent":
        rightbumper = bumpers[i];
        break;
    }
  }

  var allowOutdent = true;
  var allowIndent = true;

  var scenenumber = sceneStrToNumber(sceneItem.value);
  // Top-level items can't be outdented further
  if (scenenumber.length <= 1)
    allowOutdent = false;
  // We don't allow numbers beyond level 4 either
  else if (scenenumber.length >= 4)
    allowIndent = false;

  // Can't vary in depth by more than 1 from siblings

  // Test the previous item
  if (index > 0) {
    var prevItem = gDialog.scenelist.getItemAtIndex(index - 1);
    var prevNumber = sceneStrToNumber(prevItem.value);
    if (prevNumber.length > scenenumber.length)
      allowOutdent = false;
    else if (prevNumber.length < scenenumber.length)
      allowIndent = false;
  }

  // Test the next item
  if (index < gDialog.scenelist.itemCount - 1) {
    var nextItem = gDialog.scenelist.getItemAtIndex(index + 1);
    var nextNumber = sceneStrToNumber(nextItem.value);
    if (nextNumber.length > scenenumber.length)
      allowOutdent = false;
    else if (nextNumber.length < scenenumber.length)
      allowIndent = false;
  }
  else {
    // You can't indent the last item either. It doesn't make sense, and it
    // leads to weird renumbering behaviour if you allow it.
    allowIndent = false;
  }

  leftbumper.disabled = ! allowOutdent;
  rightbumper.disabled = ! allowIndent;
}


function setSceneNumber (sceneItem, number) {
  sceneItem.value = number.join(".");
  var labels = sceneItem.getElementsByTagName("label");
  for (var i = 0; i < labels.length; ++i) {
    if (labels[i].getAttribute("anonid") == "number") {
      labels[i].value = sceneNumberToDisplayString(number);
      break;
    }
  }
  sceneItem.setAttribute("depth", number.length);
}


function indentSelectedScene () {
  // Disregard selection clicks
  if (gDialog._selectingScene)
    return;

  indentScene(gDialog.scenelist.selectedItem);
}


function outdentSelectedScene () {
  // Disregard selection clicks
  if (gDialog._selectingScene)
    return;

  outdentScene(gDialog.scenelist.selectedItem);
}


function indentScene (sceneItem) {
  var index = gDialog.scenelist.getIndexOfItem(sceneItem);

  var prevItem = null;
  if (index > 0)
    prevItem = gDialog.scenelist.getItemAtIndex(index - 1);

  var nextItem = null;
  if (index < gDialog.scenelist.itemCount - 1)
    nextItem = gDialog.scenelist.getItemAtIndex(index + 1);

  // Indenting a number is the same as putting it between the
  // previous number and "itself"
  var prevNumber = prevItem ? sceneStrToNumber(prevItem.value) : [];
  var sceneNumber = sceneStrToNumber(sceneItem.value);

  var newNumber = { value: [0, 0, 0, 0] };
  var newLength = { value: newNumber.value.length };
  var dummy = { value: false };

  gDialog.numberSvc.getNumberBetweenNumbers(prevNumber, prevNumber.length,
    sceneNumber, sceneNumber.length, newNumber, newLength, dummy);

  setSceneNumber(sceneItem, newNumber.value);

  if (nextItem)
    renumberScene(nextItem);

  updateAllSceneBumpers();
}


function outdentScene (sceneItem) {
  var index = gDialog.scenelist.getIndexOfItem(sceneItem);

  var nextItem = null;
  if (index < gDialog.scenelist.itemCount - 1)
    nextItem = gDialog.scenelist.getItemAtIndex(index + 1);

  // This is a lot easier than indenting
  var sceneNumber = sceneStrToNumber(sceneItem.value);
  sceneNumber = sceneNumber.splice(0, sceneNumber.length - 1);
  ++sceneNumber[sceneNumber.length - 1];
  setSceneNumber(sceneItem, sceneNumber);

  if (nextItem)
    renumberScene(nextItem);

  updateAllSceneBumpers();
}


function renumberScene (sceneItem) {
  var index = gDialog.scenelist.getIndexOfItem(sceneItem);

  var prevItem = null;
  if (index > 0)
    prevItem = gDialog.scenelist.getItemAtIndex(index - 1);

  while (sceneItem) {
    var nextItem = null;
    if (index < gDialog.scenelist.itemCount - 1)
      nextItem = gDialog.scenelist.getItemAtIndex(index + 1);

    var prevNumber = prevItem ? sceneStrToNumber(prevItem.value) : [];
    var nextNumber = nextItem ? sceneStrToNumber(nextItem.value) : [];

    // We want to preserve the depth of any renumbered scenes
    var targetDepth = sceneStrToNumber(sceneItem.value).length;

    var newNumber = { value: [0, 0, 0, 0] };
    // Set the maximum depth to the target depth
    var newLength = { value: targetDepth };
    var dummy = { value: false };

    // getNumberBetweenNumbers will respect the target depth as a maximum
    // for the new number, but it doesn't have a sense of minimum depth,
    // so we accomplish that by taking what it returns and using that as
    // the new "next" number until we reach the target depth
    do {
      // Reset the output array after each iteration
      newNumber = { value: [0, 0, 0, 0 ] };
      newLength.value = targetDepth;
      gDialog.numberSvc.getNumberBetweenNumbers(prevNumber, prevNumber.length,
        nextNumber, nextNumber.length, newNumber, newLength, dummy);
      nextNumber = newNumber.value;
    }
    while (newLength.value < targetDepth)

    setSceneNumber(sceneItem, newNumber.value);

    prevItem = sceneItem;
    sceneItem = nextItem;
    ++index;
  }
}


function resetSceneNumbers () {
  for (var i = 0; i < gDialog.scenelist.itemCount; ++i) {
    setSceneNumber(gDialog.scenelist.getItemAtIndex(i), [i+1]);
  }

  updateAllSceneBumpers();
}


function accepted () {
  var presetname = gDialog.presetmenu.selectedItem.value;

  if (presetname in gDialog.preset &&
      gDialog.schemaseq.indexOf(gDialog.preset[presetname].scheme) >= 0) {
    gDialog.config.schemeuri = gDialog.preset[presetname].scheme.Value;
  }
  else {
    var rdfsvc = getRDFService();
    // Don't pollute one of our persistent datasources with temporary data
    var ds = getInMemoryDataSource();
    var res = rdfsvc.GetAnonymousResource();
    var scheme = new NumberingScheme(ds, res);
    populateSchemeFromFields(scheme);

    // We have to write this out with the same constraints as JSON data,
    // because we lose some of our context when the dialog closes, leading
    // to errors about Components not being defined, or mysterious RDF
    // failures.
    gDialog.config.schemeMembers = [];
    for (var i = 0; i < scheme.depth; ++i)
      gDialog.config.schemeMembers.push(scheme.getSchemeAt(i));
  }

  for (var i = 0; i < gDialog.config.scenes.length; ++i) {
    var scene = gDialog.config.scenes[i];
    var sceneitem = gDialog.scenelist.getItemAtIndex(i);
    if (scene.number != sceneitem.value) {
      scene.number = sceneitem.value;
      scene.modified = true;
    }
  }

  gDialog.config.accepted = true;
}

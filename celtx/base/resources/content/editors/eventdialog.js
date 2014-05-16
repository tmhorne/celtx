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
var gItemDuration;
var gIsScene = false;

var kDefaultTimezone = window.opener.calendarDefaultTimezone();

function onLoad() {
  gWindow.itemTitle     = document.getElementById("item-title");
  gWindow.itemDesc      = document.getElementById("item-description");
  gWindow.sceneTitle    = document.getElementById("scene-title");
  gWindow.sceneDesc     = document.getElementById("scene-description");
  gWindow.sceneLocation = document.getElementById("scene-location");
  gWindow.sceneCompleted  = document.getElementById("scene-completed");
  gWindow.startTime     = document.getElementById("event-starttime");
  gWindow.endTime       = document.getElementById("event-endtime");
  gWindow.allDay        = document.getElementById("event-all-day");
  gWindow.itemComments  = document.getElementById("item-comments");
  gWindow.brokenLabel   = document.getElementById("broken-label");
  gWindow.acceptButton  = document.documentElement.getButton("accept");

  var args = window.arguments[0];
  gWindow.onAcceptCallback = args.onOk;
  gWindow.calendarItem = args.calendarEvent;
  gWindow.calendar = args.calendar;
  gWindow.ds = args.controller.project.ds;

  if (gWindow.calendarItem.hasProperty("X-CELTX-SCENE")) {
    gIsScene = true;
    gWindow.allDay.hidden = true;
    document.getElementById("scenedeck").selectedIndex = 1;
    var rdfsvc = getRDFService();
    var sceneuri = gWindow.calendarItem.getProperty("X-CELTX-SCENE");
    var sceneres = rdfsvc.GetResource(sceneuri);
    if (! args.controller.isValidScene(sceneres))
      gWindow.brokenLabel.parentNode.hidden = false;
  }
  else if (gWindow.calendarItem.hasProperty("X-CELTX-DAYOFF") ||
           gWindow.calendarItem.hasProperty("X-CELTX-MOVING") ||
           gWindow.calendarItem.hasProperty("X-CELTX-SHOOT-START") ||
           gWindow.calendarItem.hasProperty("X-CELTX-SHOOT-END"))
    gWindow.allDay.hidden = true;

  loadDialog(gWindow.calendarItem);
  updateTitle();
  updateAccept();
  updateAllDay();

  // window.sizeToContent();

  gWindow.itemTitle.focus();
}


function onAccept() {
  var originalItem = gWindow.calendarItem;
  var item = originalItem.isMutable ? originalItem : originalItem.clone();
  var calendar = gWindow.calendar;
  saveDialog(item);
  if (gWindow.onAcceptCallback)
    gWindow.onAcceptCallback(item, calendar, originalItem);
  return true;
}


function onCancel() { return true; }


function loadDialog (item) {
  if (gIsScene) {
    // gWindow.sceneTitle.value = item.title;
    gWindow.sceneTitle.value = item.title;
    gWindow.sceneDesc.replaceChild(
      document.createTextNode(item.getProperty("DESCRIPTION")),
      gWindow.sceneDesc.firstChild);
    gWindow.sceneLocation.value = item.getProperty("LOCATION");

    var rdfsvc = getRDFService();
    var sceneuri = item.getProperty("X-CELTX-SCENE");
    var sceneres = rdfsvc.GetResource(sceneuri);
    var eighthsarc = rdfsvc.GetResource(Cx.NS_CX + "eighths");
    var scriptdayarc = rdfsvc.GetResource(Cx.NS_CX + "scriptday");
    var eighths = getRDFString(gWindow.ds, sceneres, eighthsarc);
    var scriptday = getRDFString(gWindow.ds, sceneres, scriptdayarc);
    document.getElementById("eighths").value = eighths;
    document.getElementById("scriptday").value = scriptday;
  }
  else {
    gWindow.itemTitle.value = item.title;
    gWindow.itemDesc.value = item.getProperty("DESCRIPTION");
  }
  gWindow.itemComments.value = item.getProperty("COMMENT");
  if (item.hasProperty("X-CELTX-COMPLETED"))
    gWindow.sceneCompleted.checked = true;

  var startDate = item.startDate.getInTimezone(kDefaultTimezone);
  var endDate = item.endDate.getInTimezone(kDefaultTimezone);
  gItemDuration = endDate.subtractDate(startDate);
  if (startDate.isDate) {
    gWindow.allDay.checked = true;
    endDate.day -= 1;
    gItemDuration.days -= 1;
  }
  gWindow.startTime.value = startDate.jsDate;
  gWindow.endTime.value   = endDate.jsDate;
}


function saveDialog (item) {
  if (! gIsScene) {
    item.title = gWindow.itemTitle.value;
    setItemProperty(item, "DESCRIPTION", gWindow.itemDesc.value);
  }
  setItemProperty(item, "COMMENT", gWindow.itemComments.value);
  if (gWindow.sceneCompleted.checked)
    setItemProperty(item, "X-CELTX-COMPLETED", "YES");
  else
    item.deleteProperty("X-CELTX-COMPLETED");
  var startDate = createDateTime();
  startDate.jsDate = gWindow.startTime.value;
  startDate = startDate.getInTimezone(kDefaultTimezone);
  var endDate = createDateTime();
  endDate.jsDate = gWindow.endTime.value;
  endDate = endDate.getInTimezone(kDefaultTimezone);
  var oneday = Components.classes["@mozilla.org/calendar/duration;1"]
    .createInstance(Components.interfaces.calIDuration);
  oneday.days = 1;
  if (gWindow.allDay.checked) {
    startDate.isDate = true;
    endDate.isDate = true;
    endDate.addDuration(oneday);
  }
  setItemProperty(item, "startDate", startDate);
  setItemProperty(item, "endDate", endDate);
}


function updateTitle () {
  if (gWindow.calendarItem.isMutable)
    document.title = calGetString("calendar", "newEventDialog");
  else
    document.title = calGetString("calendar", "editEventDialog");
}


function onStartTimeChange () {
  if (!gItemDuration)
    return;

  var start = jsDateToDateTime(gWindow.startTime.value);
  start.addDuration(gItemDuration);
  start = start.getInTimezone(kDefaultTimezone);
  gWindow.endTime.value = start.jsDate;
  updateAccept();
}


function onEndTimeChange () {
  var start = jsDateToDateTime(gWindow.startTime.value);
  var end = jsDateToDateTime(gWindow.endTime.value);
  gItemDuration = end.subtractDate(start);
  updateAccept();
}


function updateAccept() {
  var enableAccept = true;
  var title = gWindow.itemTitle.value;
  if (! gIsScene && title.length == 0)
    enableAccept = false;
  var startDate = jsDateToDateTime(gWindow.startTime.value);
  var endDate = jsDateToDateTime(gWindow.endTime.value);
  if (gWindow.allDay.checked) {
    startDate = startDate.getInTimezone(kDefaultTimezone);
    endDate = endDate.getInTimezone(kDefaultTimezone);
    startDate.isDate = true;
    endDate.isDate = true;
  }
  var timeWarning = document.getElementById("end-time-warning");
  if (! timeWarning.value) {
    var calbundle = getStringBundleService().createBundle(
      "chrome://calendar/locale/calendar.properties");
    timeWarning.value = calbundle.GetStringFromName("warningNegativeDuration");
  }
  if (endDate && startDate && endDate.compare(startDate) == -1) {
    enableAccept = false;
    timeWarning.removeAttribute("hidden");
  }
  else {
    timeWarning.setAttribute("hidden", "true");
  }
  gWindow.acceptButton.disabled = ! enableAccept;
}


function updateAllDay () {
  if (gWindow.allDay.checked) {
    gWindow.startTime.setAttribute("timepickerdisabled", "true");
    gWindow.endTime.setAttribute("timepickerdisabled", "true");
  }
  else {
    gWindow.startTime.removeAttribute("timepickerdisabled");
    gWindow.endTime.removeAttribute("timepickerdisabled");
  }
  updateAccept();
}


function setItemProperty(item, propertyName, value) {
  switch(propertyName) {
  case "startDate":
    if (value.isDate && !item.startDate.isDate ||
        !value.isDate && item.startDate.isDate ||
        value.timezone != item.startDate.timezone ||
        value.compare(item.startDate) != 0)
      item.startDate = value;
    break;
  case "endDate":
    if (value.isDate && !item.endDate.isDate ||
        !value.isDate && item.endDate.isDate ||
        value.timezone != item.endDate.timezone ||
        value.compare(item.endDate) != 0)
      item.endDate = value;
    break;

  case "title":
    if (value != item.title)
      item.title = value;
    break;

  default:
    if (!value || value == "")
      item.deleteProperty(propertyName);
    else if (item.getProperty(propertyName) != value)
      item.setProperty(propertyName, value);
    break;
  }
}

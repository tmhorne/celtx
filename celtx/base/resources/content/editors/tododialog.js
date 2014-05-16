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

var kDefaultTimezone = window.opener.calendarDefaultTimezone();

function onLoad () {
  var args = window.arguments[0];

  gWindow.onAcceptCallback = args.onOk;
  gWindow.calendarItem = args.calendarTodo;
  gWindow.originalItem = args.calendarTodo;
  gWindow.calendar = args.calendar;

  gWindow.title = document.getElementById("titlebox");
  gWindow.location = document.getElementById("locationbox");
  gWindow.hasentrydate = document.getElementById("hasentrydate");
  gWindow.entrydate = document.getElementById("entrydate");
  gWindow.hasduedate = document.getElementById("hasduedate");
  gWindow.duedate = document.getElementById("duedate");
  gWindow.description = document.getElementById("description");

  loadDialog(gWindow.calendarItem);
  updateTitle();
  updateAccept();

  gWindow.title.focus();
}

function onAccept () {
  var originalItem = gWindow.calendarItem;
  var item = originalItem.isMutable ? originalItem : originalItem.clone();
  var calendar = gWindow.calendar;
  saveDialog(item);
  if (gWindow.onAcceptCallback)
    gWindow.onAcceptCallback(item, calendar, originalItem);
  return true;
}

function onCancel () {
  return true;
}

function loadDialog (item) {
  gWindow.title.value = item.title;
  gWindow.location.value = item.getProperty("LOCATION");
  gWindow.description.value = item.getProperty("DESCRIPTION");

  var entryDate = item.entryDate;
  if (entryDate) {
    gWindow.hasentrydate.checked = true;
    entryDate = entryDate.getInTimezone(kDefaultTimezone);
    gWindow.entrydate.value = entryDate.jsDate;
  }

  var dueDate = item.dueDate;
  if (dueDate) {
    gWindow.hasduedate.checked = true;
    dueDate = dueDate.getInTimezone(kDefaultTimezone);
    gWindow.duedate.value = dueDate.jsDate;
  }

  if (entryDate && dueDate) {
    gItemDuration = item.dueDate.subtractDate(item.entryDate);
  }
}

function saveDialog (item) {
  // TODO: Copy & Paste!
  item.title = gWindow.title.value;
  item.setProperty("LOCATION", gWindow.location.value);
  item.setProperty("DESCRIPTION", gWindow.description.value);

  var entryDate = gWindow.hasentrydate.checked ?
    jsDateToDateTime(gWindow.entrydate.value) : null;
  if (entryDate)
    entryDate = entryDate.getInTimezone(kDefaultTimezone);
  else
    item.recurrenceInfo = null;
  item.entryDate = entryDate;

  var dueDate = gWindow.hasduedate.checked ?
    jsDateToDateTime(gWindow.duedate.value) : null;
  if (dueDate)
    dueDate = dueDate.getInTimezone(kDefaultTimezone);
  item.dueDate = dueDate;

  item.setProperty("PERCENT-COMPLETE", 0);

  item.recurrenceInfo = null;
  item.alarmOffset = null;
  item.alarmLastAck = null;
  item.alarmRelated = null;
}

function updateTitle () {
  if (gWindow.calendarItem.isMutable)
    document.title = calGetString("calendar", "newTaskDialog");
  else
    document.title = calGetString("calendar", "editTaskDialog");
}

function updateAccept () {
  var enableAccept = true;

  var title = gWindow.title.value;
  if (title.length == 0)
    enableAccept = false;

  // don't allow for end dates to be before start dates
  var startDate = gWindow.hasentrydate.checked ? 
    jsDateToDateTime(gWindow.entrydate.value) : null;
  var endDate = gWindow.hasduedate.checked ? 
    jsDateToDateTime(gWindow.duedate.value) : null;

  var timeWarning = document.getElementById("end-time-warning");
  if (endDate && startDate && endDate.compare(startDate) == -1) {
    enableAccept = false;
    timeWarning.removeAttribute("hidden");
  }
  else {
    timeWarning.setAttribute("hidden", "true");
  }

  /*
  if (! updateTaskAlarmWarnings()) {
    enableAccept = false;
  }
  */

  var acceptButton = document.documentElement.getButton("accept");
  if (enableAccept)
    acceptButton.removeAttribute("disabled");
  else
    acceptButton.setAttribute("disabled", "true");

  return;
}

function onStartTimeChange () {
  if (!gItemDuration)
    return;

  if (! gWindow.hasentrydate.checked || ! gWindow.hasduedate.checked) {
    gItemDuration = null;
    return;
  }

  var start = jsDateToDateTime(gWindow.entrydate.value);
  start.addDuration(gItemDuration);
  gWindow.duedate.value = start.getInTimezone(kDefaultTimezone).jsDate;
  updateAccept();
}

function onEndTimeChange () {
  if (! gWindow.hasentrydate.checked || ! gWindow.hasduedate.checked) {
    gItemDuration = null;
    return;
  }

  var start = jsDateToDateTime(gWindow.entrydate.value);
  var end = jsDateToDateTime(gWindow.duedate.value);
  gItemDuration = end.subtractDate(start);
  updateAccept();
}

function updateDueDate () {
  // force something to get set if there was nothing there before
  gWindow.duedate.value = gWindow.duedate.value;
  gWindow.duedate.disabled = ! gWindow.hasduedate.checked;

  if (gWindow.hasentrydate.checked && gWindow.hasduedate.checked) {
    var start = jsDateToDateTime(gWindow.entrydate.value);
    var end = jsDateToDateTime(gWindow.duedate.value);
      gItemDuration = end.subtractDate(start);
  }
  else {
    gItemDuration = null;
  }

  updateAccept();
}

function updateEntryDate () {
  // force something to get set if there was nothing there before
  gWindow.entrydate.value = gWindow.entrydate.value;
  gWindow.entrydate.disabled = ! gWindow.hasentrydate.checked;

  if (gWindow.hasentrydate.checked && gWindow.hasduedate.checked) {
    var start = jsDateToDateTime(gWindow.entrydate.value);
    var end = jsDateToDateTime(gWindow.duedate.value);
    gItemDuration = end.subtractDate(start);
  }
  else {
    gItemDuration = null;
  }

  updateAccept();
}

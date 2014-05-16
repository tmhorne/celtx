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
  gDialog.startdate = document.getElementById("startdate");
  gDialog.enddate = document.getElementById("enddate");
  gDialog.config = window.arguments[0];

  var headertitle = document.getElementById("msgheader");
  var headerdesc = document.getElementById("msgdesc");
  var title = gDialog.config.title ? gDialog.config.title : "";
  var desc = gDialog.config.message ? gDialog.config.message : "";
  headertitle.value = title;
  headerdesc.value = desc;
  if (title || desc)
    document.getElementById("msgbox").collapsed = false;

  var startdate = gDialog.config.startdate ?
    gDialog.config.startdate.clone().jsDate : new Date();
  var enddate = gDialog.config.enddate ?
    gDialog.config.enddate.clone().jsDate : new Date();
  if (enddate.valueOf() < startdate.valueOf())
    enddate = startdate;

  gDialog.startdate.value = startdate;
  gDialog.enddate.value = enddate;

  var ps = getPrefService().getBranch("calendar.week.");
  this.daysOff = [
    ps.getBoolPref("d0sundaysoff"), ps.getBoolPref("d1mondaysoff"),
    ps.getBoolPref("d2tuesdaysoff"), ps.getBoolPref("d3wednesdaysoff"),
    ps.getBoolPref("d4thursdaysoff"), ps.getBoolPref("d5fridaysoff"),
    ps.getBoolPref("d6saturdaysoff")
  ];

  gDialog.initialized = true;

  validate();
}


function startDateChanged () {
  if (! gDialog.initialized)
    return;

  // Ensure enddate = MAX(startdate, enddate)
  var startdate = gDialog.startdate.value;
  var enddate = gDialog.enddate.value;
  if (enddate.valueOf() < startdate.valueOf())
    gDialog.enddate.value = startdate;

  validate();
}


function endDateChanged () {
  if (! gDialog.initialized)
    return;

  // Ensure startdate = MIN(startdate, enddate)
  var startdate = gDialog.startdate.value;
  var enddate = gDialog.enddate.value;
  if (enddate.valueOf() < startdate.valueOf())
    gDialog.startdate.value = enddate;

  validate();
}


function validate () {
  if (! gDialog.initialized) return;

  var start = createDateTime();
  var jsstart = gDialog.startdate.value;
  start.timezone = gDialog.config.timezone;
  start.year = jsstart.getFullYear();
  start.month = jsstart.getMonth();
  start.day = jsstart.getDate();
  start.isDate = true;

  var end = createDateTime();
  var jsend = gDialog.enddate.value;
  end.timezone = gDialog.config.timezone;
  end.year = jsend.getFullYear();
  end.month = jsend.getMonth();
  end.day = jsend.getDate();
  end.isDate = true;

  var warning = document.getElementById("warninglabel");
  var daycount = document.getElementById("shootdaycount");
  var offcount = document.getElementById("daysoffcount");
  if (start.compare(end) > 0) {
    warning.value = gApp.getText("ShootStartAfterEndWarning");
    daycount.value = "";
    offcount.value = "";
    document.documentElement.getButton("accept").disabled = true;
    return;
  }

  var ndays = 0;
  var noff = 0;

  // We could make this efficient with arithmetic, but why bother?
  warning.value = "";
  var oneday = Components.classes["@mozilla.org/calendar/duration;1"]
    .createInstance(Components.interfaces.calIDuration);
  oneday.days = 1;

  while (start.compare(end) <= 0) {
    if (this.daysOff[start.weekday])
      ++noff;
    else
      ++ndays;
    start.addDuration(oneday);
  }
  daycount.value = ndays;
  offcount.value = noff;
  document.documentElement.getButton("accept").disabled = false;
}


function accepted () {
  var start = createDateTime();
  start.timezone = gDialog.config.timezone;
  start.year = gDialog.startdate.value.getFullYear();
  start.month = gDialog.startdate.value.getMonth();
  start.day = gDialog.startdate.value.getDate();
  start.isDate = true;
  gDialog.config.startdate = start;

  var end = createDateTime();
  end.timezone = gDialog.config.timezone;
  end.year = gDialog.enddate.value.getFullYear();
  end.month = gDialog.enddate.value.getMonth();
  end.day = gDialog.enddate.value.getDate();
  end.isDate = true;
  gDialog.config.enddate = end;

  gDialog.config.accepted = true;

  return true;
}


function canceled () {
  gDialog.config.accepted = false;

  return true;
}

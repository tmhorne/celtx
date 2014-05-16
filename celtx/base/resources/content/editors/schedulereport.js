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

var gReportController = {
  _focused: false,


  QueryInterface: function (aIID) {
    if (aIID.equals(Components.interfaces.nsISupports))
      return this;
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },


  loaded: function () {
    this.frame = document.getElementById("reportframe");
    this.startPicker = document.getElementById("reportstartdate");
    this.endPicker = document.getElementById("reportenddate");
    this.startShootPicker = document.getElementById("reportstartshootdate");
    this.endShootPicker = document.getElementById("reportendshootdate");
    this.singleShootPicker = document.getElementById("reportsingleshootdate");
  },


  open: function (project, docres) {
    this.project = project;
    this.docres = docres;
    // this.reportPicker = document.getElementById("reporttype");
    this.reportPicker = gScheduleController.outline.document
      .getElementById("reportlist");

    this.reportFile = tempFile("html");

    var start = new Date();
    var end = new Date(start.getFullYear(), start.getMonth() + 1,
      start.getDate());
    this.startPicker.value = start;
    this.endPicker.value = end;

    // These will be changed as soon as shoot days are picked
    this.startShootPicker.value = gApp.getText("NotSet");
    this.endShootPicker.value = gApp.getText("NotSet");
    this.singleShootPicker.value = gApp.getText("NotSet");
  },


  focus: function () {
    this._focused = true;
    this.refresh();
  },


  blur: function () {
    if (this.lastReportIsCallSheet)
      this.saveCallSheetFields();
    this._focused = false;
  },


  saveCallSheetFields: function () {
    try {
      var rdfsvc = getRDFService();
      function getFieldArc (name) {
        return rdfsvc.GetResource(Cx.NS_CX + "callsheet_" + name);
      }
      var calltimearc = getFieldArc("calltime");
      var companyarc = getFieldArc("prodocompany");
      var teamarc = getFieldArc("prodoteam");
      var contactarc = getFieldArc("contactinfo");
      var notesarc = getFieldArc("prodonotes");
      var weatherarc = getFieldArc("weather");

      var doc = this.frame.contentDocument;
      var calltime = doc.getElementById("crewCall").value;
      var company = doc.getElementById("proCompany").value;
      var team = doc.getElementById("proTeam").value;
      var contact = doc.getElementById("conInfo").value;
      var notes = doc.getElementById("proLocation").value;
      var weather = doc.getElementById("weather").value;

      setRDFString(this.project.ds, this.docres, calltimearc, calltime);
      setRDFString(this.project.ds, this.docres, companyarc, company);
      setRDFString(this.project.ds, this.docres, teamarc, team);
      setRDFString(this.project.ds, this.docres, contactarc, contact);
      setRDFString(this.project.ds, this.docres, notesarc, notes);
      setRDFString(this.project.ds, this.docres, weatherarc, weather);
    }
    catch (ex) {
      dump("*** saveCallSheetFields: " + ex + "\n");
    }
  },


  shootDaysChanged: function () {
    if (gScheduleController.startShootEvent &&
        gScheduleController.endShootEvent) {
      this.setShootDayPicker(this.startShootPicker, this.startShootPicker.date);
      this.setShootDayPicker(this.endShootPicker, this.endShootPicker.date);
      this.setShootDayPicker(this.singleShootPicker,
        this.singleShootPicker.date);
    }
    else {
      this.setShootDayPicker(this.startShootPicker, null);
      this.setShootDayPicker(this.endShootPicker, null);
      this.setShootDayPicker(this.singleShootPicker, null);
    }

    if (this._focused)
      this.refresh();
  },


  setShootDayPicker: function (picker, date) {
    if (! date) {
      picker.value = gApp.getText("NotSet");
      picker.date = null;
      return;
    }

    var jsdate = null;
    var caldate = null;
    if (date instanceof Components.interfaces.calIDateTime) { 
      caldate = date;
      jsdate = new Date(caldate.jsDate.valueOf());
    }
    else {
      jsdate = date;
      caldate = jsDateToDateTime(jsdate, calendarDefaultTimezone());
      caldate.isDate = true;
    }

    var daynum = gScheduleController.getShootDayNumber(caldate);
    if (daynum > 0) {
      var datestr = calDateToISODateString(caldate).substring(0, 10);
      picker.value = gApp.getText("DayHeaderWithDate",
        [ daynum, datestr ]);
      picker.date = jsdate;
    }
    else {
      picker.value = gApp.getText("NotSet");
      picker.date = null;
    }
  },


  editShootDayPicker: function (picker) {
    if (! (gScheduleController.startShootEvent &&
           gScheduleController.endShootEvent)) {
      dump("*** editShootDayPicker: Start or End not set\n");
      return;
    }

    var start = gScheduleController.startShootEvent.startDate;
    var end = gScheduleController.endShootEvent.startDate;

    var config = {
      accepted: false,
      dates: [],
      date: null
    };

    var seldate = null;
    if (picker.date) {
      seldate = jsDateToDateTime(picker.date, calendarDefaultTimezone());
      seldate.isDate = true;
    }

    var df = Components.classes["@mozilla.org/calendar/datetime-formatter;1"]
      .createInstance(Components.interfaces.calIDateTimeFormatter);

    var cursor = start.clone();
    var oneday = Components.classes["@mozilla.org/calendar/duration;1"]
      .createInstance(Components.interfaces.calIDuration);
    oneday.days = 1;
    var daynum = 0;
    while (cursor.compare(end) <= 0) {
      if (! gScheduleController.isDayOff(cursor)) {
        var datestr = df.formatDateLong(cursor);
        var item = {
          label: gApp.getText("DayHeaderWithDate", [ ++daynum, datestr ]),
          value: new Date(cursor.jsDate.valueOf())
        };
        if (seldate && seldate.compare(cursor) == 0)
          item.selected = true;
        config.dates.push(item);
      }
      cursor.addDuration(oneday);
    }

    openDialog(Cx.CONTENT_PATH + "editors/shootdaypicker.xul", "_blank",
      Cx.MODAL_DIALOG_FLAGS, config);

    if (config.accepted) {
      this.setShootDayPicker(picker, config.date)
      if (picker == this.startShootPicker) {
        if (! this.endShootPicker.date ||
            this.endShootPicker.date.valueOf() < config.date.valueOf())
          this.setShootDayPicker(this.endShootPicker, config.date);
      }
      else if (picker == this.endShootPicker) {
        if (! this.startShootPicker.date ||
            this.startShootPicker.date.valueOf() > config.date.valueOf())
          this.setShootDayPicker(this.startShootPicker, config.date);
      }
      this.refresh();
    }
  },


  refresh: function () {
    if (this.lastReportIsCallSheet)
      this.saveCallSheetFields();

    this.lastReportIsCallSheet = false;

    var reporttype = this.reportPicker.selectedItem.value;

    var toolbarmap = {
      month: "daterangetoolbar",
      week: "daterangetoolbar",
      strip: "shootdaystoolbar",
      shootdays: "shootdaystoolbar",
      callsheet: "singledaytoolbar",
      scenesummary: "updateonlytoolbar"
    };
    var toolbardeck = document.getElementById("reporttoolbardeck");
    toolbardeck.selectedPanel = document.getElementById(toolbarmap[reporttype]);

    if (reporttype == "month") {
      this.generateReport(
        "@mozilla.org/calendar/printformatter;1?type=monthgrid");
      return;
    }
    else if (reporttype == "week") {
      this.generateReport(
        "@mozilla.org/calendar/printformatter;1?type=weekplan");
      return;
    }
    else if (reporttype == "scenesummary") {
      var reporter = new SceneSummaryReport(this.project.ds,
        gScheduleController.source);
      var title = gApp.getText("SceneSummary") + " - " + this.project.title;
      this.generateEventlessWithFormatter(reporter, title);
      return;
    }

    var shootDaysSet = gScheduleController.startShootEvent &&
      gScheduleController.endShootEvent;
    var shootDaysBadOrder = false;
    var shootEndPointsValid = false;

    if (shootDaysSet) {
      var start = gScheduleController.startShootEvent.startDate;
      var end = gScheduleController.endShootEvent.startDate;

      shootEndPointsValid = gScheduleController.getShootDayNumber(start) > 0 &&
                            gScheduleController.getShootDayNumber(end) > 0;

      if (start.compare(end) > 0) {
        shootDaysBadOrder = true;
        shootDaysSet = false;
      }
      else {
        if (! this.startShootPicker.date)
          this.setShootDayPicker(this.startShootPicker, start);
        if (! this.endShootPicker.date)
          this.setShootDayPicker(this.endShootPicker, end);
        if (! this.singleShootPicker.date)
          this.setShootDayPicker(this.singleShootPicker, start);
      }
    }

    var reporter = null;
    var title = null;
    var start = null;
    var end = null;

    switch (reporttype) {
      case "strip":
        reporter = new StripboardPrinter(gScheduleController, this.project.ds);
        title = gApp.getText("OneLineSchedule");
        if (shootDaysSet && ! document.getElementById("allevents").selected) {
          if (this.startShootPicker.date && this.endShootPicker.date) {
            var jsdate = this.startShootPicker.date;
            start = jsDateToDateTime(jsdate, calendarDefaultTimezone());
            start.isDate = true;
            jsdate = this.endShootPicker.date;
            end = jsDateToDateTime(jsdate, calendarDefaultTimezone());
            end.isDate = true;
          }
        }
        break;
      case "shootdays":
        reporter = new ShootDayReport(gScheduleController, this.project.ds);
        title = gApp.getText("ShootingSchedule");
        if (shootDaysSet && ! document.getElementById("allevents").selected) {
          if (this.startShootPicker.date && this.endShootPicker.date) {
            var jsdate = this.startShootPicker.date;
            start = jsDateToDateTime(jsdate, calendarDefaultTimezone());
            start.isDate = true;
            jsdate = this.endShootPicker.date;
            end = jsDateToDateTime(jsdate, calendarDefaultTimezone());
            end.isDate = true;
          }
        }
        break;
      case "callsheet":
        reporter = new CallSheetReport(gScheduleController, this.project.ds);
        title = gApp.getText("CallSheet");
        this.lastReportIsCallSheet = true;
        if (shootDaysSet) {
          if (this.singleShootPicker.date) {
            var jsdate = this.singleShootPicker.date;
            start = jsDateToDateTime(jsdate, calendarDefaultTimezone());
            start.isDate = true;
            end = start;
          }
        }
        break;
      default:
        throw "Invalid report type: " + reporttype;
    }
    title += " - " + this.project.title;

    if (shootDaysSet) {
      if (! (start && end)) {
        start = gScheduleController.startShootEvent.startDate;
        end = gScheduleController.endShootEvent.startDate;
      }
      this.generateWithFormatter(reporter, title, start, end);
    }
    else if (shootDaysBadOrder) {
      this.generateEventlessWithFormatter(reporter, title,
        gScheduleController.startShootEvent.startDate,
        gScheduleController.endShootEvent.startDate);
    }
    else {
      this.generateEventlessWithFormatter(reporter, title, null, null);
    }
  },


  generateEventlessWithFormatter: function (formatter, title, start, end) {
    var bfos = getBufferedFileOutputStream(this.reportFile);
    formatter.formatToHtml(bfos, start, end, 0, [], title);
    bfos.close();
    this.frame.webNavigation.loadURI(fileToFileURL(this.reportFile),
      Components.interfaces.nsIWebNavigation.LOAD_FLAGS_BYPASS_CACHE,
      null, null, null);
    setTimeout(function () { gReportController.addEditButtonListener(); }, 0);
  },


  addEditButtonListener: function () {
    if (this.frame.docShell.busyFlags) {
      setTimeout(function () { gReportController.addEditButtonListener(); }, 0);
      return;
    }

    var editbutton = this.frame.contentDocument.getElementById("editbutton");
    if (! editbutton)
      return;

    var listener = {
      handleEvent: function (event) {
        gScheduleController.editShootDays();
      }
    };
    editbutton.addEventListener("click", listener, false);
  },


  generateWithFormatter: function (formatter, title, start, end) {
    if (! (start && end))
      throw "generateWithFormatter requires explicit start and end";

    var listener = {
      events: [],
      reportFile: this.reportFile,
      start: start,
      end: end.clone(),
      frame: this.frame,
      onOperationComplete: function (aCalendar, aStatus, aOperationType,
                                     aId, aDateTime) {
        var bfos = getBufferedFileOutputStream(this.reportFile);
        formatter.formatToHtml(bfos, this.start, this.end,
          this.events.length, this.events, title);
        bfos.close();
        this.frame.webNavigation.loadURI(fileToFileURL(this.reportFile),
          Components.interfaces.nsIWebNavigation.LOAD_FLAGS_BYPASS_CACHE,
          null, null, null);
      },
      onGetResult: function (aCalendar, aStatus, aItemType, aDetail,
                             aCount, aItems) {
        this.events = this.events.concat(aItems);
      }
    };
    var ICal = Components.interfaces.calICalendar;
    var filter = ICal.ITEM_FILTER_CLASS_OCCURRENCES |
                 ICal.ITEM_FILTER_COMPLETED_ALL     |
                 ICal.ITEM_FILTER_TYPE_EVENT        ;

    end = end.clone();
    var duration = Components.classes["@mozilla.org/calendar/duration;1"]
      .createInstance(Components.interfaces.calIDuration);
    duration.days = 1;
    end.addDuration(duration);
    gScheduleController.calendar.getItems(filter, 0, start, end, listener);
  },


  generateReport: function (formatcid) {
    var start = null;
    var end = null;
    if (! document.getElementById("alldates").selected) {
      start = jsDateToDateTime(this.startPicker.value,
        calendarDefaultTimezone());
      end = jsDateToDateTime(this.endPicker.value,
        calendarDefaultTimezone());
    }
    var listener = {
      events: [],
      reportFile: this.reportFile,
      start: start,
      end: end ? end.clone() : null,
      frame: this.frame,
      onOperationComplete: function (aCalendar, aStatus, aOperationType,
                                     aId, aDateTime) {
        if (this.events.length == 0) {
          if (! this.start) {
            this.start = today();
            this.end = this.start.clone();
          }
        }
        var formatter = Components.classes[formatcid]
          .getService(Components.interfaces.calIPrintFormatter);
        var bfos = getBufferedFileOutputStream(this.reportFile);
        formatter.formatToHtml(bfos, this.start, this.end,
          this.events.length, this.events, "Report!");
        bfos.close();
        this.frame.webNavigation.loadURI(fileToFileURL(this.reportFile),
          Components.interfaces.nsIWebNavigation.LOAD_FLAGS_BYPASS_CACHE,
          null, null, null);
      },
      onGetResult: function (aCalendar, aStatus, aItemType, aDetail,
                             aCount, aItems) {
        this.events = this.events.concat(aItems);
      }
    };
    var ICal = Components.interfaces.calICalendar;
    var filter = ICal.ITEM_FILTER_CLASS_OCCURRENCES |
                 ICal.ITEM_FILTER_COMPLETED_ALL     |
                 ICal.ITEM_FILTER_TYPE_EVENT        ;
    if (end) {
      var duration = Components.classes["@mozilla.org/calendar/duration;1"]
        .createInstance(Components.interfaces.calIDuration);
      duration.days = 1;
      end.addDuration(duration);
    }
    gScheduleController.calendar.getItems(filter, 0, start, end, listener);
  }
};

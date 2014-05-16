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

function CeltxCalendarWindow() {
  // This object only exists to keep too many things from breaking during the
  // switch to the new views

  this.viewdeck = null;
  this.views = [];
  this.viewbuttons = [];
  this.minimonth = null;
  this.unifinderTree = null;
  this.unifinderTodoTree = null;
  this.timezone = calendarDefaultTimezone();

  this._calendarViewController = null;
  this._calendar = null;
}


CeltxCalendarWindow.prototype = {
  init: function () {
    dump("--- CeltxCalendarWindow.init\n");
    var self = this;
    var daySelFn = function (event) { self.observeViewDaySelect(event); };
    for (var i = 0; i < this.views.length; ++i)
      this.views[i].addEventListener("dayselect", daySelFn, false);
    if (this.unifinderTodoTree) {
      this.unifinderTodoTree.calendar = this._calendar;
      this.unifinderTodoTree.onLoad();
    }
  },


  get currentView () {
    if (this.viewdeck)
      return this.viewdeck.selectedPanel;

    return null;
  },


  get selectedDay () {
    var curview = this.currentView;
    if (curview)
      return curview.selectedDay;

    return null;
  },


  observeViewDaySelect: function (event) {
    var date = event.detail;
    var jsDate = new Date(date.year, date.month, date.day);

    // for the month and multiweek view find the main month,
    // which is the month with the most visible days in the view;
    // note, that the main date is the first day of the main month
    var jsMainDate;
    if (!event.originalTarget.supportsDisjointDates) {
      var mainDate = null;
      var maxVisibleDays = 0;
      var startDay = this.currentView.startDay;
      var endDay = this.currentView.endDay;
      var firstMonth = startDay.startOfMonth;
      var lastMonth = endDay.startOfMonth;
      for (var month = firstMonth.clone(); month.compare(lastMonth) <= 0; month.month += 1) {
        var visibleDays = 0;
        if (month.compare(firstMonth) == 0) {
          visibleDays = startDay.endOfMonth.day - startDay.day + 1;
        } else if (month.compare(lastMonth) == 0) {
          visibleDays = endDay.day;
        } else {
          visibleDays = month.endOfMonth.day;
        }
        if (visibleDays > maxVisibleDays) {
          mainDate = month.clone();
          maxVisibleDays = visibleDays;
        }
      }
      jsMainDate = new Date(mainDate.year, mainDate.month, mainDate.day);
    }

    if (this.minimonth)
      this.minimonth.selectDate(jsDate, jsMainDate);
    this.currentView.focus();
  },


  get calendar () {
    return this._calendar;
  },


  set calendar (val) {
    this._calendar = val;

    for (var i = 0; i < this.views.length; ++i) {
      this.views[i].displayCalendar = this._calendar;
      this.views[i].timezone = this.timezone;
    }

    if (this.unifinderTree)
      prepareCalendarUnifinder(this._calendar);

    if (this.unifinderTodoTree)
      this.unifinderTodoTree.calendar = this._calendar;
  },


  get calendarViewController () {
    return this._calendarViewController;
  },


  set calendarViewController (val) {
    this._calendarViewController = val;

    for (var i = 0; i < this.views.length; ++i)
      this.views[i].controller = this._calendarViewController;
  },


  pickAndGoToDate: function () {
    if (! this.currentView)
      return;

    var initialDate = this.selectedDay.getInTimezone(floating()).jsDate;
    var self = this;
    var callback = function (pickedDate) {
      self.goToDay(pickedDate);
    };
    openDialog("chrome://calendar/content/calendar-gotodate-dialog.xul",
               "calendar-gotodate-dialog",
               "chrome,modal",
               {callback: callback, date: initialDate});
  },


  goToDay: function (newDate) {
    if (! this.currentView)
      return;

    var cdt = Components.classes["@mozilla.org/calendar/datetime;1"]
      .createInstance(Components.interfaces.calIDateTime);
    cdt.year = newDate.getFullYear();
    cdt.month = newDate.getMonth();
    cdt.day = newDate.getDate();
    cdt.isDate = true;
    cdt.timezone = this.currentView.timezone;

    this.currentView.goToDay(cdt);
  },


  switchToView: function (aViewType) {
    if (! this.viewdeck)
      return;

    var mwWeeksCommand = document.getElementById("menu-numberofweeks-inview");
    if (mwWeeksCommand) {
      if (aViewType == "multiweek") {
          mwWeeksCommand.removeAttribute("disabled");
      } else {
          mwWeeksCommand.setAttribute("disabled", true);
      }
    }

    // Set up the view commands
    var views = this.viewdeck.childNodes;
    for (var i = 0; i < views.length; i++) {
      var view = views[i];
      var commandId = "calendar_" + view.id + "_command";
      var command = document.getElementById(commandId);
      if (view.id == aViewType + "-view") {
        command.setAttribute("checked", "true");
      } else {
        command.removeAttribute("checked");
      }
    }

    // Set the labels for the context-menu
    var nextCommand = document.getElementById(
      "calendar-view-context-menu-next");
    if (nextCommand)
      nextCommand.setAttribute("label", nextCommand.getAttribute("label-"+aViewType));
    var previousCommand = document.getElementById(
      "calendar-view-context-menu-previous")
    if (previousCommand)
      previousCommand.setAttribute("label", previousCommand.getAttribute("label-"+aViewType));

    // Disable the menuitem when not in day or week view.
    var rotated = document.getElementById(
      "calendar_toggle_orientation_command");
    if (rotated) {
      if (aViewType == "day" || aViewType == "week") {
          rotated.removeAttribute("disabled");
      } else {
          rotated.setAttribute("disabled", "true");
      }
    }

    var selectedDay;
    var currentSelection = [];

    if (this.currentView) {
      try {
        selectedDay = this.currentView.selectedDay;
        currentSelection = this.currentView.getSelectedItems({});
      } catch (ex) {
        // This dies if no view has even been chosen this session, but that's
        // ok because we'll just use now() below.
      }
    }

    if (!selectedDay)
      selectedDay = now();

    // Anyone wanting to plug in a view needs to follow this naming scheme
    var view = document.getElementById(aViewType + "-view");
    this.viewdeck.selectedPanel = view;

    if (view.displayCalendar != this.calendar) {
      view.displayCalendar = this.calendar;
      view.timezone = calendarDefaultTimezone();
      view.controller = this.calendarViewController;
    }

    view.goToDay(selectedDay);
    view.setSelectedItems(currentSelection.length, currentSelection);

    var labelAttribute = "label-" + aViewType + "-view";
    var prevCommand = document.getElementById("calendar-go-menu-previous");
    if (prevCommand)
      prevCommand.setAttribute("label",
        prevCommand.getAttribute(labelAttribute));
    var nextCommand = document.getElementById("calendar-go-menu-next");
    if (nextCommand)
      nextCommand.setAttribute("label",
        nextCommand.getAttribute(labelAttribute));
  }
};

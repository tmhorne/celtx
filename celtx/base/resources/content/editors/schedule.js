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

var gWindow = {};

function loaded () {
  gWindow.scenetree     = document.getElementById("scenelist");
  gWindow.monthview     = document.getElementById("schedulemonthview");
  gWindow.weekview      = document.getElementById("scheduleweekview");
  gWindow.dayview       = document.getElementById("scheduledayview");
  // gWindow.stripview     = document.getElementById("schedulestripview");
  gWindow.scheduledeck  = document.getElementById("scheduleviewdeck");
  gWindow.tabdeck       = document.getElementById("scheduletabdeck");

  window.controllers.appendController(gScheduleController);

  gWindow.cycleObserver = new TreeHeaderCycleObserver(gWindow.scenetree);

  gReportController.loaded();

  var calpref = getPrefService().getBranch("calendar.timezone.");
  var tzsvc = Components.classes["@mozilla.org/calendar/timezone-service;1"]
    .getService(Components.interfaces.calITimezoneService);
  var tzid = tzsvc.defaultTimezone;
  var timezone = getTimezoneService().getTimezone(tzid);
  if (timezone)
    calpref.setCharPref("local", timezone.tzid);
}


function getController () {
  return gScheduleController;
}


function getBrowser () {
  return gReportController.frame;
}


function getSelectedCalendar () {
  dump("*** DEPRECATED: getSelectedCalendar called\n");
  return gScheduleController.calendar;
}


function tabSelected (event) {
  var panelid = event.target.getAttribute("value");
  gWindow.tabdeck.selectedPanel = document.getElementById(panelid);
  if (panelid == "scheduleview") {
    top.gWindow.outlineDeck.collapsed = true;
    gScheduleController.outline.showScheduleNav();
    gReportController.blur();
  }
  else {
    top.gWindow.outlineDeck.collapsed = false;
    gScheduleController.outline.showReportNav();
    gReportController.focus();
  }
  gScheduleController.updateCommands();
}


// This will update individual scene events as changes are made to the RDF
var gScheduleUpdater = {
  batchLevel: 0,

  /**
   * Holds a list of dirty scene URIs. This lets us defer updates to
   * scene-related events when we don't have focus.
   * @type string[]
   * @private
   */
  dirtyScenes: [],


  /**
   * Holds a list of dirty events. This is only used as a cache during
   * updates, because the items returned by calendar.getItems() are only
   * temporary and are replaced in the calendar's cache when they are modified.
   * @type calIEvent[]
   * @private
   */
  dirtyEvents: [],


  timer: null,


  _focused: false,


  QueryInterface: function (aIID) {
    if (aIID.equals(Components.interfaces.nsISupports) ||
        aIID.equals(Components.interfaces.nsIRDFObserver) ||
        aIID.equals(Components.interfaces.calIOperationListener))
      return this;
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },


  init: function (ds) {
    this.ds = ds;
    this.ds.AddObserver(this);
    setTimeout(function () {
      // Don't let clean-up on open affect the modification status
      var modified = gScheduleController._modified;
      gScheduleUpdater.updateAllSceneEvents();
      gScheduleController._modified = modified;
    }, 0);
  },


  shutdown: function () {
    this.ds.RemoveObserver(this);
    this.ds = null;
  },


  focus: function () {
    if (this.allScenesDirty || this.dirtyScenes.length > 0)
      this.scheduleSceneUpdate();
    this._focused = true;
  },


  blur: function () {
    this._focused = false;
  },


  updateAllSceneEvents: function () {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    // This is cleared by onOperationComplete
    this.allScenesDirty = true;
    this.dirtyEvents = [];
    var calendar = gScheduleController.calendar;
    var ICal = Components.interfaces.calICalendar;
    var filter = ICal.ITEM_FILTER_CLASS_OCCURRENCES |
                 ICal.ITEM_FILTER_COMPLETED_ALL     |
                 ICal.ITEM_FILTER_TYPE_EVENT        ;
    calendar.getItems(filter, 0, null, null, this);
  },


  updateSceneEvents: function () {
    this.timer = null;
    var calendar = gScheduleController.calendar;
    var ICal = Components.interfaces.calICalendar;
    var filter = ICal.ITEM_FILTER_CLASS_OCCURRENCES |
                 ICal.ITEM_FILTER_COMPLETED_ALL     |
                 ICal.ITEM_FILTER_TYPE_EVENT        ;
    calendar.getItems(filter, 0, null, null, this);
  },


  onOperationComplete: function (aCalendar, aStatus, aOperationType,
                                 aId, aDetail) {
    var rdfsvc = getRDFService();
    gScheduleController.calendar.startBatch();
    try {
      for (var i = 0; i < this.dirtyEvents.length; ++i) {
        var newEvent = this.dirtyEvents[i].clone();
        var sceneuri = newEvent.getProperty("X-CELTX-SCENE");
        if (! sceneuri)
          continue;
        if (! this.isSceneResource(rdfsvc.GetResource(sceneuri)))
          gScheduleController.markEventInvalid(newEvent);
        else
          gScheduleController.decorateEventForScene(newEvent, sceneuri, true);
        doTransaction("modify", newEvent, newEvent.calendar,
          this.dirtyEvents[i], null);
      }
    }
    catch (ex) {
      dump("*** onOperationComplete: " + ex + "\n");
    }
    gScheduleController.calendar.endBatch();
    this.allScenesDirty = false;
    // Clear the list when we're done.
    this.dirtyEvents = [];
  },


  onGetResult: function (aCalendar, aStatus, aItemType, aDetail,
                         aCount, aItems) {
    for (var i = 0; i < aCount; ++i) {
      var event = aItems[i];
      if (! event.hasProperty("X-CELTX-SCENE"))
        continue;
      if (this.allScenesDirty) {
        this.dirtyEvents.push(event);
        continue;
      }
      var sceneuri = event.getProperty("X-CELTX-SCENE");
      for (var j = 0; j < this.dirtyScenes.length; ++j) {
        if (sceneuri == this.dirtyScenes[j]) {
          this.dirtyEvents.push(event);
          break;
        }
      }
    }
  },


  isSceneResource: function (res) {
    return gScheduleController.isValidScene(res);
  },


  scheduleSceneUpdate: function () {
    if (this.timer)
      clearTimeout(this.timer)
    var self = this;
    this.timer = setTimeout(function () { self.updateSceneEvents() }, 100);
  },


  onBeginUpdateBatch: function (ds) {
    ++this.batchLevel;
  },


  onEndUpdateBatch: function (ds) {
    if (--this.batchLevel > 0)
      return;
    this.batchLevel = 0;
    if (this._focused)
      this.scheduleSceneUpdate();
  },


  onAssert: function (ds, src, prop, tgt) {
    if (! this.isSceneResource(src))
      return;
    for (var i = 0; i < this.dirtyScenes.length; ++i) {
      if (this.dirtyScenes[i] == src.Value)
        return;
    }
    this.dirtyScenes.push(src.Value);

    if (this.batchLevel == 0 && this._focused)
      this.scheduleSceneUpdate();
  },
  onUnassert: function (ds, src, prop, tgt) {
    if (this.batchLevel > 0 || ! this.isSceneResource(src))
      return;
    for (var i = 0; i < this.dirtyScenes.length; ++i) {
      if (this.dirtyScenes[i] == src.Value)
        return;
    }
    this.dirtyScenes.push(src.Value);

    if (this.batchLevel == 0 && this._focused)
      this.scheduleSceneUpdate();
  },
  onChange: function (ds, src, prop, oldtgt, newtgt) {
    if (this.batchLevel > 0 || ! this.isSceneResource(src))
      return;
    for (var i = 0; i < this.dirtyScenes.length; ++i) {
      if (this.dirtyScenes[i] == src.Value)
        return;
    }
    this.dirtyScenes.push(src.Value);

    if (this.batchLevel == 0 && this._focused)
      this.scheduleSceneUpdate();
  },
  onMove: function (ds, oldsrc, newsrc, prop, tgt) {
    var oldIsScene = this.isSceneResource(oldsrc);
    var newIsScene = this.isSceneResource(newsrc);
    if (! (oldIsScene || newIsScene))
      return;
    var foundOld = false;
    var foundNew = false;
    for (var i = 0; i < this.dirtyScenes.length; ++i) {
      if ((foundOld || ! oldIsScene) && (foundNew || ! newIsScene))
        return;
      if (oldIsScene && this.dirtyScenes[i] == oldsrc.Value)
        foundOld = true;
      else if (newIsScene && this.dirtyScenes[i] == newsrc.Value)
        foundNew = true;
    }
    if (oldIsScene && ! foundOld)
      this.dirtyScenes.push(oldsrc.Value);
    if (newIsScene && ! foundNew)
      this.dirtyScenes.push(newsrc.Value);

    if (this.batchLevel == 0 && this._focused)
      this.scheduleSceneUpdate();
  },


  
};


var gScheduleController = {
  __proto__: EditorController.prototype,


  QueryInterface: function(aIID) {
    if (aIID.equals(Components.interfaces.nsISupports) ||
        aIID.equals(Components.interfaces.nsIDOMEventListener) ||
        aIID.equals(Components.interfaces.nsIObserver) ||
        aIID.equals(Components.interfaces.calICalendarViewController) ||
        aIID.equals(Components.interfaces.calIObserver)) {
      return this;
    }
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },


  scenemap: {},


  /**
   * An event marking the first day of shooting.
   * @type calIEvent
   */
  startShootEvent: null,


  /**
   * An event marking the last day of shooting.
   * @type calIEvent
   */
  endShootEvent: null,


  commands: {
    "calendar_delete_event_command": 1,
    "cmd-page-setup": 1,
    "cmd-print": 1
  },


  isCommandEnabled: function isCommandEnabled (cmd) {
    switch (cmd) {
      case "calendar_delete_event_command":
        return true;
      case "cmd-page-setup":
      case "cmd-print":
        return gWindow.tabdeck.selectedPanel.id == "reportview";
      default:
        return false;
    }
  },


  doCommand: function doCommand (cmd) {
    switch (cmd) {
      case "calendar_delete_event_command":
        var view = gWindow.scheduledeck.selectedPanel;
        var items = view.getSelectedItems({});
        if (items.length == 0)
          break;
        this.deleteOccurrences(items.length, items, false, false);
        view.setSelectedItems(0, [], true);
        break;
      case "cmd-page-setup":
        PrintUtils.showPageSetup();
        break;
      case "cmd-print":
        gApp.setPrintMargins(0.25, 0, 0.25, 0);
        PrintUtils.print();
        break;
    }
  },


  reload: function () {
    if (! this.calendar.canRefresh)
      return;

    gScheduleUpdater.shutdown();
    this.loading = true;
    this.calendar.refresh();
  },


  open: function open (project, docres) {
    this.project = project;
    this.docres = docres;

    var IRes = Components.interfaces.nsIRDFResource;
    var rdfsvc = getRDFService();
    var srcarc = rdfsvc.GetResource(Cx.NS_DC + "source");
    this.source = this.project.ds.GetTarget(this.docres, srcarc, true);
    if (! this.source) {
      dump("*** gScheduleController.open: Not linked to a source script\n");
      return;
    }
    this.source = this.source.QueryInterface(IRes);
    this.ds = getInMemoryDataSource();
    gWindow.scenetree.database.AddDataSource(this.project.ds);
    gWindow.scenetree.database.AddDataSource(this.ds);
    gWindow.scenetree.ref = this.source.Value;

    this.outline.setDelegate(window);

    var ps = getPrefService().QueryInterface(
      Components.interfaces.nsIPrefBranch2);
    ps.addObserver("celtx.calendar.workdaysonly", this, false);
    ps = ps.getBranch("celtx.calendar.");
    var workdaysOnly = ps.getBoolPref("workdaysonly");
    gWindow.monthview.workdaysOnly = workdaysOnly;
    gWindow.weekview.workdaysOnly = workdaysOnly;
    gWindow.dayview.workdaysOnly = workdaysOnly;
    // gWindow.stripview.workdaysOnly = workdaysOnly;

    try {
      var forceLoad = false;
      var calfile = this.project.fileForResource(this.docres);
      if (! isReadableFile(calfile) || calfile.fileSize == 0) {
        calfile = this.project.projectFolder;
        calfile.append("schedule.ics");
        calfile.createUnique(0, 0644 & calfile.parent.permissions);
        this.project.addFileToDocument(calfile, this.docres);
        forceLoad = true;
        this._modified = true;
      }
      this.loading = true;

      // Because the calendar component writes to its calendar file after
      // every  modification, but we only want to write when a user saves,
      // we open up a separate working file and copy that over the real
      // file whenever the user saves.

      this.tempfile = copyToUnique(calfile, getTempDir(), "scratch.ics");

      var ios = getIOService();

      var calsrc = ios.newURI(fileToFileURL(this.tempfile), null, null);

      this.calendar = Components.classes[
        "@mozilla.org/calendar/calendar;1?type=ics"]
        .createInstance(Components.interfaces.calICalendar);
      this.calendar.uri = calsrc;
      this.calendar.addObserver(this);
      this.calendar.refresh();

      var cssUri = "chrome://calendar/content/calendar-view-bindings.css";
      var styleSheet = getStyleSheet(cssUri);
      updateStyleSheetForObject(this.calendar, styleSheet);

      if (! this.calendar.name)
        this.calendar.name = getRDFString(project.ds, docres,
          getRDFService().GetResource(Cx.NS_DC + "title"));
      if (forceLoad)
        this.onLoad();

      var startMinute = 8 * 60; // 8:00 am
      try {
        var pref = getPrefService().getBranch("calendar.view.");
        startMinute = pref.getIntPref("daystarthour") * 60;
      }
      catch (ex) {
        dump("*** gScheduleController.open: " + ex + "\n");
      }

      gWindow.minimonth = this.outline.document.getElementById("minimonth");
      if (gWindow.minimonth) {
        gWindow.minimonth.value = new Date();
        gWindow.minimonth.addEventListener("change", this, false);
      }

      var calviews = [ gWindow.monthview, gWindow.weekview,
        gWindow.dayview /*, gWindow.stripview */ ];
      for (var i = 0; i < calviews.length; ++i) {
        try {
        calviews[i].displayCalendar = this.calendar;
        calviews[i].timezone = calendarDefaultTimezone();
        calviews[i].controller = this;
        calviews[i].goToDay(now());
        }
        catch (ex) { dump("*** " + ex + "\n"); 2}
      }
      var innerWeek = document.getAnonymousElementByAttribute(gWindow.weekview,
        "anonid", "view-element");
      var innerDay = document.getAnonymousElementByAttribute(gWindow.dayview,
        "anonid", "view-element");
      innerWeek.scrollToMinute(startMinute);
      innerDay.scrollToMinute(startMinute);

      gWindow.scheduledeck.addEventListener("dayselect", this, false);
    }
    catch (ex) {
      dump("*** gScheduleController.open: " + ex + "\n");
    }

    // This will be called instead once initSceneMap finishes
    // setTimeout("gScheduleController.finishOpening();", 100);
  },


  finishOpening: function () {
    this.locateShootStartAndEnd();
    gScheduleUpdater.init(this.project.ds);
    gReportController.open(this.project, this.docres);
  },


  locateShootStartAndEnd: function () {
    var ICal = Components.interfaces.calICalendar;
    var filter = ICal.ITEM_FILTER_CLASS_OCCURRENCES |
                 ICal.ITEM_FILTER_COMPLETED_ALL     |
                 ICal.ITEM_FILTER_TYPE_EVENT        ;
    var self = this;
    var listener = {
      onOperationComplete: function (aCalendar, aStatus, aOperationType,
                                     aId, aDetail) {
        function comparefn (a, b) {
          return a.startDate.compare(b.startDate);
        }
        self._daysOff.sort(comparefn);
        // Fix up Day Off events without the X-CELTX-DAYOFF property
        for (var i = 0; i < self._daysOff.length; ++i) {
          if (! self._daysOff[i].hasProperty("X-CELTX-DAYOFF")) {
            var newevent = self._daysOff[i].clone();
            newevent.setProperty("X-CELTX-MOVING", "TRUE");
            doTransaction("modify", newevent, self.calendar,
              self._daysOff[i], null);
            self._daysOff[i] = newevent;
          }
        }
        self.shootDaysChanged();
      },
      onGetResult: function (aCalendar, aStatus, aItemType, aDetail,
                             aCount, aItems) {
        for (var i = 0; i < aCount; ++i) {
          var event = aItems[i];
          if (event.hasProperty("X-CELTX-SHOOT-START")) {
            if (self.startShootEvent)
              dump("*** multiple start of shoot events located\n");
            self.startShootEvent = event;
          }
          else if (event.hasProperty("X-CELTX-SHOOT-END")) {
            if (self.endShootEvent)
              dump("*** multiple end of shoot events located\n");
            self.endShootEvent = event;
          }
          else if (event.hasProperty("X-CELTX-DAYOFF") ||
                   event.title == gApp.getText("DayOff")) {
            // Unfortunately, we didn't tag Day Off and Moving events with
            // distinct properties prior to 1.0, so we have to make educated
            // guesses based on title and fix them up.
            self._daysOff.push(event);
          }
          else if (event.title == gApp.getText("Moving") &&
                  ! event.hasProperty("X-CELTX-MOVING")) {
            var newevent = event.clone();
            newevent.setProperty("X-CELTX-MOVING", "TRUE");
            doTransaction("modify", newevent, self.calendar, event, null);
          }
        }
      }
    };
    this.calendar.getItems(filter, 0, null, null, listener);
  },


  /**
   * Brings up a dialog to edit the start and end of shooting. If the user
   * accepts their changes, this will call shootDaysChanged.
   * @param title  an optional header title to show in the dialog
   * @param msg  an optional header message to show the user in the dialog
   * @see #shootDaysChanged
   */
  editShootDays: function (title, msg) {
    var config = {
      title: title,
      message: msg,
      startdate: this.startShootEvent ? this.startShootEvent.startDate : null,
      enddate: this.endShootEvent ? this.endShootEvent.startDate : null,
      timezone: calendarDefaultTimezone(),
      accepted: false
    };

    dump("--- editShootDays: Default time zone is " + config.timezone.toString() + "\n");
    window.openDialog(Cx.CONTENT_PATH + "editors/shootdays.xul", "_blank",
      Cx.MODAL_DIALOG_FLAGS, config);

    if (! config.accepted)
      return;

    // These should be assumed, actually...
    config.startdate.isDate = true;
    config.enddate.isDate = true;

    var oneday = Components.classes["@mozilla.org/calendar/duration;1"]
      .createInstance(Components.interfaces.calIDuration);
    oneday.days = 1;

    this.calendar.startBatch();

    try {
      if (this.startShootEvent) {
        // Don't modify if it's unchanged
        if (this.startShootEvent.startDate.compare(config.startdate) != 0) {
          var event = this.startShootEvent.clone();
          event.startDate = config.startdate;
          event.endDate = event.startDate.clone();
          event.endDate.addDuration(oneday);
          dump("--- moving start shoot event from "
            + this.startShootEvent.startDate.toString() + " to "
            + config.startdate.toString() + "\n");
          doTransaction('modify', event, this.calendar,
            this.startShootEvent, null);
        }
        else
          dump("--- not modifying start shoot event (date is same): "
            + this.startShootEvent.startDate.toString() + "\n");
      }
      else {
        var event = createEvent();
        event.title = gApp.getText("ShootStartTitle");
        event.setProperty("X-CELTX-SHOOT-START", "TRUE");
        event.startDate = config.startdate;
        event.endDate = event.startDate.clone();
        event.endDate.addDuration(oneday);
        dump("--- creating a new start shoot event: "
          + event.startDate.toString() + "\n");
        doTransaction('add', event, this.calendar, null, null);
      }

      if (this.endShootEvent) {
        // Don't modify if it's unchanged
        if (this.endShootEvent.startDate.compare(config.enddate) != 0) {
          var event = this.endShootEvent.clone();
          event.startDate = config.enddate;
          event.endDate = event.startDate.clone();
          event.endDate.addDuration(oneday);
          doTransaction('modify', event, this.calendar,
            this.endShootEvent, null);
        }
      }
      else {
        var event = createEvent();
        event.title = gApp.getText("ShootEndTitle");
        event.setProperty("X-CELTX-SHOOT-END", "TRUE");
        event.startDate = config.enddate;
        event.endDate = event.startDate.clone();
        event.endDate.addDuration(oneday);
        doTransaction('add', event, this.calendar, null, null);
      }
    }
    catch (ex) {
      dump("*** editShootDays: " + ex + "\n");
    }

    this.calendar.endBatch();
  },


  shootDaysChanged: function () {
    // Update the start and end labels
    var startlabel = document.getElementById("startshootlabel");
    var endlabel = document.getElementById("endshootlabel");
    if (this.startShootEvent) {
      var date = this.startShootEvent.startDate;
      startlabel.value = calDateToISODateString(date).substring(0, 10);
    }
    else
      startlabel.value = gApp.getText("NotSet");

    if (this.endShootEvent) {
      var date = this.endShootEvent.startDate;
      endlabel.value = calDateToISODateString(date).substring(0, 10);
    }
    else
      endlabel.value = gApp.getText("NotSet");

    var startdate = this.startShootEvent ? this.startShootEvent.startDate
      : null;
    // end date for the date range is exclusive
    var enddate = this.endShootEvent ? this.endShootEvent.endDate : null;
    // gWindow.stripview.setDateRange(startdate, enddate);
    gReportController.shootDaysChanged();
  },


  /**
   * Tracks Day Off events, sorted by date.
   * @private
   */
  _daysOff: [],


  isDayOff: function (aDate) {
    var ps = getPrefService().getBranch("calendar.week.");
    var daysOff = [
      ps.getBoolPref("d0sundaysoff"), ps.getBoolPref("d1mondaysoff"),
      ps.getBoolPref("d2tuesdaysoff"), ps.getBoolPref("d3wednesdaysoff"),
      ps.getBoolPref("d4thursdaysoff"), ps.getBoolPref("d5fridaysoff"),
      ps.getBoolPref("d6saturdaysoff")
    ];
    if (daysOff[aDate.weekday])
      return true;

    for (var i = 0; i < this._daysOff.length; ++i) {
      if (aDate.compare(this._daysOff[i].startDate) >= 0) {
        if (aDate.compare(this._daysOff[i].endDate) < 0)
          return true;
      }
    }
    return false;
  },


  getShootDayNumber: function (aDate) {
    if (! this.startShootEvent || ! this.endShootEvent)
      return -1;

    if (aDate.compare(this.startShootEvent.startDate) < 0 ||
        aDate.compare(this.endShootEvent.startDate) > 0)
      return -1;

    var shootday = 1;
    var cursor = this.startShootEvent.startDate.clone();
    var oneday = Components.classes["@mozilla.org/calendar/duration;1"]
      .createInstance(Components.interfaces.calIDuration);
    oneday.days = 1;
    while (cursor.compare(this.endShootEvent.endDate) < 0) {
      var isDayOff = this.isDayOff(cursor);
      if (cursor.compare(aDate) == 0) {
        if (isDayOff)
          return 0;
        else
          return shootday;
      }
      if (! isDayOff)
        ++shootday;
      cursor.addDuration(oneday);
    }

    // Should be unreachable
    return -1;
  },


  initCalendarManager: function initCalendarManager () {
    var mgr = Components.classes["@mozilla.org/calendar/manager;1"]
      .getService(Components.interfaces.calICalendarManager);

    if (mgr.getCalendars({}).length > 0)
      return;

    var homeURL = getIOService().newURI("moz-profile-calendar://", null, null);
    var homeCalendar = mgr.createCalendar("storage", homeURL);
    mgr.registerCalendar(homeCalendar);
    homeCalendar.name = "Home"; // Don't bother localizing, it's bogus anyway
  },


  close: function close () {
    window.controllers.removeController(this);
    this.calendar.removeObserver(this);

    gScheduleUpdater.shutdown();
    gWindow.scenetree.database.RemoveDataSource(this.project.ds);
    gWindow.scenetree.database.RemoveDataSource(this.ds);
    var ps = getPrefService().QueryInterface(
      Components.interfaces.nsIPrefBranch2);
    ps.removeObserver("celtx.calendar.workdaysonly", this);
    try {
      this.tempfile.remove(false);
    }
    catch (ex) {}
  },


  save: function save () {
    if (this._locked) return;

    // Overwrite the real file with the scratch file
    var calfile = this.project.fileForResource(this.docres);
    overwriteFileWithFile(calfile, this.tempfile);
    this._modified = false;
  },


  get selectedScene () {
    try {
      var idx = gWindow.scenetree.view.selection.currentIndex;
      if (idx < 0)
        return null;
      return gWindow.scenetree.view.getResourceAtIndex(idx);
    }
    catch (ex) {
      dump("*** selectedScene: " + ex + "\n");
      return null;
    }
  },


  set selectedScene (val) {
    if (! val) {
      gWindow.scenetree.view.selection.clearSelection()
      return -1;
    }
    try {
      var idx = gWindow.scenetree.view.getIndexOfResource(val);
      if (idx >= 0)
        gWindow.scenetree.view.selection.select(idx);
      return idx;
    }
    catch (ex) {
      dump("*** set selectedScene: " + ex + "\n");
      return -1;
    }
  },


  handleEvent: function handleEvent (event) {
    if (event.type == "change") {
      this.minimonthPick(event.target);
    }
    else if (event.type == "dayselect") {
      this.observeViewDaySelect(event);
    }
  },


  minimonthPick: function minimonthPick (minimonth) {
    var jsDate = minimonth.value;
    var cdt = Components.classes["@mozilla.org/calendar/datetime;1"]
      .createInstance(Components.interfaces.calIDateTime);
    cdt.year = jsDate.getFullYear();
    cdt.month = jsDate.getMonth();
    cdt.day = jsDate.getDate();
    cdt.isDate = true;
    cdt.timezone = currentView().timezone;
    currentView().goToDay(cdt);
  },


  observeViewDaySelect: function observeViewDaySelect (event) {
    var date = event.detail;
    var jsDate = new Date(date.year, date.month, date.day);

    // for the month and multiweek view find the main month,
    // which is the month with the most visible days in the view;
    // note, that the main date is the first day of the main month
    var jsMainDate;
    if (!event.originalTarget.supportsDisjointDates) {
      var mainDate = null;
      var maxVisibleDays = 0;
      var startDay = currentView().startDay;
      var endDay = currentView().endDay;
      var firstMonth = startDay.startOfMonth;
      var lastMonth = endDay.startOfMonth;
      for (var month = firstMonth.clone(); month.compare(lastMonth) <= 0;
           month.month += 1) {
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

    if (gWindow.minimonth)
      gWindow.minimonth.selectDate(jsDate, jsMainDate);
    currentView().focus();
  },


  observe: function observe (subject, topic, data) {
    var ps = getPrefService().getBranch("celtx.calendar.");
    var workdaysOnly = ps.getBoolPref("workdaysonly");
    gWindow.monthview.workdaysOnly = workdaysOnly;
    gWindow.weekview.workdaysOnly = workdaysOnly;
    gWindow.dayview.workdaysOnly = workdaysOnly;
    // gWindow.stripview.workdaysOnly = workdaysOnly;
    // Force refresh of current view
    var curview = gWindow.scheduledeck.selectedPanel;
    curview.goToDay(curview.selectedDay);
  },


  isValidScene: function isValidScene (scene) {
    var rdfsvc = getRDFService();
    var projds = this.project.ds;
    var scenesarc = rdfsvc.GetResource(Cx.NS_CX + "scenes");
    var scenesres = projds.GetTarget(this.source, scenesarc, true);
    if (! scenesres)
      return false;
    scenesres = scenesres.QueryInterface(Components.interfaces.nsIRDFResource);
    var cu = getRDFContainerUtils();
    var idx = cu.indexOf(projds, scenesres, scene);
    return cu.indexOf(projds, scenesres, scene) >= 0;
  },


  onSceneDblClick: function onSceneDblClick (event) {
    if (event.originalTarget.localName != "treechildren")
      return;
    var scene = this.selectedScene;
    if (! scene)
      return;
    var rdfsvc = getRDFService();
    // var IInt = Components.interfaces.nsIRDFInt;
    var ds = this.project.ds;
    var ordarc = rdfsvc.GetResource(Cx.NS_CX + "ordinal");
    var intextarc = rdfsvc.GetResource(Cx.NS_CX + "intext");
    var settingarc = rdfsvc.GetResource(Cx.NS_CX + "setting");
    var daynightarc = rdfsvc.GetResource(Cx.NS_CX + "daynight");
    var descarc = rdfsvc.GetResource(Cx.NS_DC + "description");
    var eighthsarc = rdfsvc.GetResource(Cx.NS_CX + "eighths");
    var scriptdayarc = rdfsvc.GetResource(Cx.NS_CX + "scriptday");

    // var ord = ds.GetTarget(scene, ordarc, true);
    // ord = ord ? ord.QueryInterface(IInt).Value : "";
    var ord = getRDFString(ds, scene, ordarc);
    var intext = getRDFString(ds, scene, intextarc);
    var setting = getRDFString(ds, scene, settingarc);
    var daynight = getRDFString(ds, scene, daynightarc);
    var desc = getRDFString(ds, scene, descarc);
    var eighths = getRDFString(ds, scene, eighthsarc);
    var scriptday = getRDFString(ds, scene, scriptdayarc);

    var scheduled = false;
    var completed = false;
    var events = this.scenemap[scene.Value];
    if (events) {
      scheduled = true;
      completed = true;
      for (var i = 0; i < events.length; ++i) {
        if (! events[i].hasProperty("X-CELTX-COMPLETED")) {
          completed = false;
          break;
        }
      }
    }

    var args = {
      accepted: false,
      ord: ord,
      intext: intext,
      setting: setting,
      daynight: daynight,
      desc: desc,
      eighths: eighths,
      scriptday: scriptday,
      scheduled: scheduled,
      completed: completed
    };
    window.openDialog(Cx.CONTENT_PATH + "editors/editscene.xul", "_blank",
      "chrome,titlebar,modal", args);
    if (! args.accepted)
      return;
    setRDFString(ds, scene, descarc, args.desc);
    setRDFString(ds, scene, eighthsarc, args.eighths);
    setRDFString(ds, scene, scriptdayarc, args.scriptday);
    if (events) {
      for (var i = 0; i < events.length; ++i)
        this.updateSceneEvent(events[i]);
    }
  },


  onOperationComplete: function (cal, status, action, itemid, detail) {
    if (status != Components.results.NS_OK)
      dump("*** onOperationComplete: " + detail + "\n");
  },


  onSceneDrag: function onSceneDrag (event) {
    if (event.originalTarget.localName == "treechildren")
      nsDragAndDrop.startDrag(event, this);
  },


  initSceneMap: function initSceneMap () {
    this.sceneMap = {};
    var listener = {
      controller: this,
      QueryInterface: function (aIID) {
        if (aIID.equals(Components.interfaces.calIOperationListener) ||
            aIID.equals(Components.interfaces.nsISupports))
          return this;
        throw Components.results.NS_ERROR_NO_INTERFACE;
      },
      onOperationComplete: function (aCalendar, aStatus, aOperationType,
                                     aId, aDetail) {
        gScheduleController.finishOpening();
      },
      onGetResult: function (aCalendar, aStatus, aItemType, aDetail,
                             aCount, aItems) {
        var IEvent = Components.interfaces.calIEvent;
        for (var i = 0; i < aCount; ++i) {
          try {
            var item = aItems[i].QueryInterface(IEvent);
            if (! item.hasProperty("X-CELTX-SCENE"))
              continue;

            var sceneid = item.getProperty("X-CELTX-SCENE");
            if (! sceneid)
              continue;

            if (! ("sceneid" in this.controller.scenemap))
              this.controller.scenemap[sceneid] = new Array();
            var mapentry = this.controller.scenemap[sceneid];
            mapentry.push(item);
          }
          catch (ex) {
            dump("*** initSceneMap: " + ex + "\n");
          }
        }


        // Update the datasource
        // var IInt = Components.interfaces.nsIRDFInt;
        var ILit = Components.interfaces.nsIRDFLiteral;
        var IRes = Components.interfaces.nsIRDFResource;
        var rdfsvc = getRDFService();
        var scenesarc = rdfsvc.GetResource(Cx.NS_CX + "scenes");
        var scheduledarc = rdfsvc.GetResource(Cx.NS_CX + "scheduled");
        var completedarc = rdfsvc.GetResource(Cx.NS_CX + "completed");
        var ds = this.controller.ds;
        var projds = this.controller.project.ds;
        var scenesres = projds.GetTarget(this.controller.source,
          scenesarc, true);
        var scenes = new RDFSeq(projds, scenesres).toArray();
        ds.beginUpdateBatch();
        for (var i = 0; i < scenes.length; ++i) {
          var scene = scenes[i].QueryInterface(IRes);
          var entry = this.controller.scenemap[scene.Value];
          if (entry) {
            setRDFString(ds, scene, scheduledarc, "true");
            var shouldBeComplete = (entry.length > 0);
            for (var j = 0; j < entry.length; ++j) {
              if (! entry[j].hasProperty("X-CELTX-COMPLETED")) {
                shouldBeComplete = false;
                break;
              }
            }
            if (shouldBeComplete)
              setRDFString(ds, scene, completedarc, "true");
            else
              setRDFString(ds, scene, completedarc, "false");
          }
          else {
            setRDFString(ds, scene, scheduledarc, "false");
            setRDFString(ds, scene, completedarc, "false");
          }
        }
        ds.endUpdateBatch();
      }
    };

    var ICal = Components.interfaces.calICalendar;
    var filter = ICal.ITEM_FILTER_CLASS_OCCURRENCES |
                 ICal.ITEM_FILTER_COMPLETED_ALL     |
                 ICal.ITEM_FILTER_TYPE_EVENT;
    this.calendar.getItems(filter, 0, null, null, listener);
  },


  /**
   * Tracks whether we are in the middle of a batch operation.
   * @private
   */
  _batchLevel: 0,


  // calIObserver methods (for caching of various things)

  onStartBatch: function () {
    // We'll assume batch operations aren't nested at this point
    this._batchLevel = 1;
  },


  onEndBatch: function () {
    this._batchLevel = 0;
    if (this._shootDaysModified) {
      // this._modified = true;
      this.shootDaysChanged();
    }
    this._shootDaysModified = false;
  },


  onLoad: function () {
    this.startShootEvent = null;
    this.endShootEvent = null;
    // Check the calendar for all existing scenes
    var self = this;
    setTimeout(function () {
      self.loading = false;
      self.initSceneMap();
    }, 0);
  },
  onModifyItem: function (item, oldItem) {
    if (! this.loading)
      this._modified = true;

    var calIEvent = Components.interfaces.calIEvent;
    if (! (item instanceof calIEvent))
      return;

    if (item.hasProperty("X-CELTX-SHOOT-START") ||
        item.hasProperty("X-CELTX-SHOOT-END")) {
      if (item.hasProperty("X-CELTX-SHOOT-START")) {
        dump("--- onModifyItem: start moved to "
          + item.startDate.toString() + "\n");
        this.startShootEvent = item;
      }
      else {
        dump("--- onModifyItem: end moved to "
          + item.startDate.toString() + "\n");
        this.endShootEvent = item;
      }
      if (this._batchLevel == 0)
        this.shootDaysChanged();
      else
        this._shootDaysModified = true;
      return;
    }
    else if (item.hasProperty("X-CELTX-DAYOFF")) {
      function comparefn (a, b) { return a.startDate.compare(b.startDate); }
      this._daysOff.sort(comparefn);
      if (this._batchLevel == 0)
        this.shootDaysChanged();
      else
        this._shootDaysModified = true;
      return;
    }

    if (! (item.hasProperty("X-CELTX-SCENE")))
      return;
    item = item.QueryInterface(calIEvent);

    // Remove the old item from our scene map
    var sceneid = oldItem.getProperty("X-CELTX-SCENE");
    if (! sceneid)
      return;

    if (! (sceneid in this.scenemap)) {
      dump("*** onModifyItem: No map entry for " + sceneid + "\n");
      printStackTrace();
      return;
    }
    var mapentry = this.scenemap[sceneid];
    var found = false;
    for (var i = 0; i < mapentry.length; ++i) {
      if (mapentry[i].id == oldItem.id) {
        mapentry.splice(i, 1);
        found = true;
        break;
      }
    }
    if (! found)
      dump("*** onModifyItem: No entry for old scene event with sceneid: "
        + sceneid + "!\n");

    // Add the new item to our scene map
    sceneid = item.getProperty("X-CELTX-SCENE");
    if (! sceneid) {
      dump("*** onModifyItem: New item has no sceneid\n");
      return;
    }

    var shouldBeComplete = true;
    if (! (sceneid in this.scenemap))
      this.scenemap[sceneid] = new Array();
    mapentry = this.scenemap[sceneid];
    mapentry.push(item);
    for (var i = 0; i < mapentry.length; ++i) {
      if (! mapentry[i].hasProperty("X-CELTX-COMPLETED"))
        shouldBeComplete = false;
    }
    var ds = this.ds;
    var rdfsvc = getRDFService();
    var completedarc = rdfsvc.GetResource(Cx.NS_CX + "completed");
    var sceneres = rdfsvc.GetResource(sceneid);
    if (shouldBeComplete)
      setRDFString(ds, sceneres, completedarc, "true");
    else
      setRDFString(ds, sceneres, completedarc, "false");
  },


  onAddItem: function (item) {
    if (! this.loading)
      this._modified = true;

    var calIEvent = Components.interfaces.calIEvent;
    if (! (item instanceof calIEvent))
      return;
    item = item.QueryInterface(calIEvent);

    if (item.hasProperty("X-CELTX-SHOOT-START") ||
        item.hasProperty("X-CELTX-SHOOT-END")) {
      if (item.hasProperty("X-CELTX-SHOOT-START"))
        this.startShootEvent = item;
      else
        this.endShootEvent = item;
      if (this._batchLevel == 0)
        this.shootDaysChanged();
      else
        this._shootDaysModified = true;
      return;
    }
    else if (item.hasProperty("X-CELTX-DAYOFF")) {
      this._daysOff.push(item);
      function comparefn (a, b) { return a.startDate.compare(b.startDate); }
      this._daysOff.sort(comparefn);
      if (this._batchLevel == 0)
        this.shootDaysChanged();
      else
        this._shootDaysModified = true;
      return;
    }

    if (! item.hasProperty("X-CELTX-SCENE"))
      return;

    var sceneid = item.getProperty("X-CELTX-SCENE");
    if (! sceneid)
      return;

    if (! this.scenemap[sceneid]) {
      this.scenemap[sceneid] = new Array();
    }
    var mapentry = this.scenemap[sceneid];
    mapentry.push(item);

    if (this.loading)
      return;

    var ds = this.ds;
    var rdfsvc = getRDFService();
    var scheduledarc = rdfsvc.GetResource(Cx.NS_CX + "scheduled");
    var completedarc = rdfsvc.GetResource(Cx.NS_CX + "completed");
    var scene = rdfsvc.GetResource(sceneid);

    var selection = this.selectedScene;
    ds.beginUpdateBatch();
    setRDFString(ds, scene, scheduledarc, "true");
    if (! item.hasProperty("X-CELTX-COMPLETED"))
      setRDFString(ds, scene, completedarc, "false");
    ds.endUpdateBatch();
    this.selectedScene = selection;
  },


  onDeleteItem: function (item) {
    if (! this.loading)
      this._modified = true;

    var calIEvent = Components.interfaces.calIEvent;
    if (! (item instanceof calIEvent))
      return;

    if (item.hasProperty("X-CELTX-SHOOT-START") ||
        item.hasProperty("X-CELTX-SHOOT-END")) {
      if (item.hasProperty("X-CELTX-SHOOT-START"))
        this.startShootEvent = null;
      else
        this.endShootEvent = null;
      if (this._batchLevel == 0)
        this.shootDaysChanged();
      else
        this._shootDaysModified = true;
      return;
    }
    else if (item.hasProperty("X-CELTX-DAYOFF")) {
      for (var i = 0; i < this._daysOff.length; ++i) {
        if (item.hasSameIds(this._daysOff[i])) {
          this._daysOff.splice(i, 1);
          break;
        }
      }
      if (this._batchLevel == 0)
        this.shootDaysChanged();
      else
        this._shootDaysModified = true;
      return;
    }

    if (! (item.hasProperty("X-CELTX-SCENE")))
      return;
    item = item.QueryInterface(calIEvent);

    var found = false;
    var sceneid = item.getProperty("X-CELTX-SCENE");
    if (! sceneid)
      return;

    var mapentry = this.scenemap[sceneid];
    if (mapentry) {
      for (var i = 0; i < mapentry.length; ++i) {
        if (mapentry[i].id == item.id) {
          mapentry.splice(i, 1);
          found = true;
          break;
        }
      }
    }
    else {
      dump("*** no map entry for scene " + sceneid + "\n");
    }

    if (! found)
      dump("*** onDeleteItem: No entry for old scene event with sceneid: "
        + sceneid + "!\n");

    if (this.loading)
      return;

    var ds = this.ds;
    var ILit = Components.interfaces.nsIRDFLiteral;
    var rdfsvc = getRDFService();
    var scheduledarc = rdfsvc.GetResource(Cx.NS_CX + "scheduled");
    var completedarc = rdfsvc.GetResource(Cx.NS_CX + "completed");
    var scene = rdfsvc.GetResource(sceneid);

    if (! mapentry || mapentry.length == 0) {
      var selection = this.selectedScene;
      ds.beginUpdateBatch();
      setRDFString(ds, scene, scheduledarc, "false");
      ds.endUpdateBatch();
      this.selectedScene = selection;
    }
    // Update completed flag. Flag is true only when at least one shoot is
    // scheduled and all scheduled shoots are complete.
    if (mapentry.length > 0) {
      var shouldBeComplete = true;
      for (var i = 0; i < mapentry.length; ++i) {
        if (! mapentry[i].hasProperty("X-CELTX-COMPLETED")) {
          shouldBeComplete = false;
          break;
        }
      }
      if (shouldBeComplete)
        setRDFString(ds, scene, completedarc, "true");
      else
        setRDFString(ds, scene, completedarc, "false");
    }
    else {
      setRDFString(ds, scene, completedarc, "false");
    }
  },


  onError: function  (aErrNo, aMessage) {
    dump("*** gScheduleController.onError: " + aErrNo + ", " + aMessage + "\n");
    printStackTrace();
  },


  onPropertyChanged: function (cal, name, value, oldvalue) {},
  onPropertyDeleting: function (cal, name) {},


  // Modified version of nsDragAndDrop.startDrag with additional |dragrect|
  // field for specifying the drag rect in the |action| parameter
  startDrag: function (aEvent) {
    const kDSIID = Components.interfaces.nsIDragService;
    var dragAction = {
      action: kDSIID.DRAGDROP_ACTION_COPY |
              kDSIID.DRAGDROP_ACTION_MOVE |
              kDSIID.DRAGDROP_ACTION_LINK,
      dragrect: null
    };
    var transferData = { data: null };
    try {
      this.onDragStart(aEvent, transferData, dragAction);
    }
    catch (ex) { return; }
    if (! transferData.data) return;
    transferData = transferData.data;

    var transArray = createSupportsArray();
    var count = 0;
    do {
      var trans = nsTransferable.set(transferData._XferID == "TransferData"
        ? transferData : transferData.dataList[count++]);
      transArray.AppendElement(trans.QueryInterface(
        Components.interfaces.nsISupports));
    }
    while (transferData.XferID == "TransferDataSet" &&
           count < transferData.dataList.length);
    try {
      nsDragAndDrop.mDragService.invokeDragSession(aEvent.target, transArray,
        dragAction.dragrect, dragAction.action);
    }
    catch (ex) {}
    aEvent.stopPropagation();
  },


  onDragStart: function (event, xferData, action) {
    if (event.originalTarget.localName == "treechildren") {
      var scene = this.selectedScene;
      if (! scene) {
        dump("*** No selected scene\n");
        return;
      }
      var data = new TransferData();
      data.addDataForFlavour("x-celtx/x-scene", scene.Value);
      xferData.data = data;
      return;
    }

    var target = event.currentTarget;
    if (target.id == "movingitem") {
      xferData.data = new TransferData();
      xferData.data.addDataForFlavour("x-celtx/x-banner", "moving");
    }
    else if (target.id == "dayoffitem") {
      xferData.data = new TransferData();
      xferData.data.addDataForFlavour("x-celtx/x-banner", "dayoff");
    }
    else {
      dump("*** invalid drag from " + event.currentTarget.localName + "\n");
      return;
    }

    if (target != event.target) {
      var region = Components.classes["@mozilla.org/gfx/region;1"]
        .createInstance(Components.interfaces.nsIScriptableRegion);
      region.init();
      var bo = target.boxObject;
      region.setToRect(bo.x, bo.y, bo.width, bo.height);
      action.dragrect = region;
    }
  },


  opened: function opened () {
  },


  updateSceneLocationNames: function () {
    var rdfsvc = getRDFService();
    var ds = this.project.ds;
    var locationarc = rdfsvc.GetResource(Cx.NS_CX + "location");
    var locationtype = rdfsvc.GetResource(Cx.NS_CX + "Location");
    var scenesarc = rdfsvc.GetResource(Cx.NS_CX + "scenes");
    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");

    var scenes = ds.GetTarget(this.source, scenesarc, true);
    if (! scenes)
      return;

    scenes = new RDFSeq(ds, scenes.QueryInterface(
      Components.interfaces.nsIRDFResource)).toArray();

    for (var i = 0; i < scenes.length; ++i) {
      var sceneres = scenes[i].QueryInterface(
        Components.interfaces.nsIRDFResource);
      var scene = new Scene(ds, sceneres);
      var locations = scene._getDeptSequence(locationtype);
      if (! locations || locations.length == 0) {
        setRDFString(ds, sceneres, locationarc, "");
        continue;
      }
      var location = locations.get(0).QueryInterface(
        Components.interfaces.nsIRDFResource);
      var locname = getRDFString(ds, location, titlearc);
      setRDFString(ds, sceneres, locationarc, locname);
    }
  },


  focus: function focus () {
    if (gWindow.tabdeck.selectedPanel.id == "scheduleview")
      top.gWindow.outlineDeck.collapsed = true;

    this.updateSceneLocationNames();

    gReportController.frame.setAttribute("type", "content-primary");

    if (this.loading) return;

    this._focused = true;

    this.calendar.startBatch();
    for (var sceneuri in this.scenemap) {
      var entries = this.scenemap[sceneuri];
      if (! entries) continue;
      for (var i = 0; i < entries.length; ++i) {
        var entry = entries[i].QueryInterface(Components.interfaces.calIEvent);
        entries[i] = this.updateSceneEvent(entry);
      }
    }
    this.calendar.endBatch();

    setTimeout(function () {
    gScheduleUpdater.focus();
    }, 0);
  },


  blur: function blur () {
    gReportController.frame.setAttribute("type", "content");
    gReportController.blur();

    gScheduleUpdater.blur();

    this._focused = false;
  },


  markEventInvalid: function (event) {
    event.title = gApp.getText("InvalidScene") + " "
      + event.startDate.toString();
  },


  decorateEventForScene: function (event, sceneuri, suppressModifyEvent) {
    var rdfsvc = getRDFService();
    var IRes = Components.interfaces.nsIRDFResource;
    var ILit = Components.interfaces.nsIRDFLiteral;
    var sceneres = rdfsvc.GetResource(sceneuri);
    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
    var descarc = rdfsvc.GetResource(Cx.NS_DC + "description");
    var intextarc = rdfsvc.GetResource(Cx.NS_CX + "intext");
    var settingarc = rdfsvc.GetResource(Cx.NS_CX + "setting");
    var daynightarc = rdfsvc.GetResource(Cx.NS_CX + "daynight");
    var ordarc = rdfsvc.GetResource(Cx.NS_CX + "ordinal");
    var eighthsarc = rdfsvc.GetResource(Cx.NS_CX + "eighths");
    var locationarc = rdfsvc.GetResource(Cx.NS_CX + "location");

    var ds = this.project.ds;
    var oldevent = event;
    if (! suppressModifyEvent)
      event = event.clone();

    var ord = getRDFString(ds, sceneres, ordarc);
    var title = getRDFString(ds, sceneres, titlearc);
    var titlestr = ord + ". " + title;
    var desc = getRDFString(ds, sceneres, descarc);
    var location = getRDFString(ds, sceneres, locationarc);
    var intext = getRDFString(ds, sceneres, intextarc);
    var setting = getRDFString(ds, sceneres, settingarc);
    var daynight = getRDFString(ds, sceneres, daynightarc);
    var eighths = getRDFString(ds, sceneres, eighthsarc);

    var eventsceneuri = event.getProperty("X-CELTX-SCENE");
    var eventintext = event.getProperty("X-CELTX-INTEXT");
    var eventdaynight = event.getProperty("X-CELTX-DAYNIGHT");
    var eventsetting = event.getProperty("X-CELTX-SETTING");
    var eventord = event.getProperty("X-CELTX-ORDINAL");
    var eventeighths = event.getProperty("X-CELTX-EIGHTHS");

    if (event.title == titlestr &&
        event.getProperty("DESCRIPTION") == desc &&
        event.getProperty("LOCATION") == location &&
        eventsceneuri == sceneuri &&
        eventintext == intext &&
        eventsetting == setting &&
        eventdaynight == daynight &&
        eventord == ord &&
        eventeighths == eighths)
      return;

    event.title = ord + ". " + title;
    event.setProperty("DESCRIPTION", desc);
    event.setProperty("LOCATION", location);
    event.setProperty("X-CELTX-SCENE", sceneuri);
    event.setProperty("X-CELTX-INTEXT", intext);
    event.setProperty("X-CELTX-SETTING", setting);
    event.setProperty("X-CELTX-DAYNIGHT", daynight);
    event.setProperty("X-CELTX-ORDINAL", ord);
    event.setProperty("X-CELTX-EIGHTHS", eighths);

    if (! suppressModifyEvent) {
      doTransaction("modify", event, event.calendar, oldevent, null);
    }
  },


  // Finds the next available slot for a given date
  nextSceneTimeForDate: function nextSceneTimeForDate (date, callback) {
    // There's no synchronous way to query for existing scenes.
    if (! callback)
      throw "nextSceneTimeForDate can only execute asynchronously";
    var daydate = date.clone();
    daydate.isDate = true;
    var listener = {
      events: [],
      QueryInterface: function (aIID) {
        if (aIID.equals(Components.interfaces.calIOperationListener) ||
            aIID.equals(Components.interfaces.nsISupports))
          return this;
        throw Components.results.NS_ERROR_NO_INTERFACE;
      },
      onOperationComplete: function (aCalendar, aStatus, aOperationType,
                                     aId, aDetail) {
        var daystart = getPrefService().getBranch("calendar.view.")
          .getIntPref("daystarthour");
        var cursor = daydate.clone();
        cursor.resetTo(cursor.year, cursor.month, cursor.day, daystart, 0, 0,
          calendarDefaultTimezone());
        for (var i = 0; i < this.events.length; ++i) {
          if (cursor.compare(this.events[i].startDate) <= 0)
            cursor = this.events[i].endDate.clone();
        }
        callback(cursor);
      },
      onGetResult: function (aCalendar, aStatus, aItmType, aDetail,
                             aCount, aItems) {
        var IEvent = Components.interfaces.calIEvent;
        for (var i = 0; i < aCount; ++i) {
          var event = aItems[i].QueryInterface(IEvent);
          if (! event.isDate)
            this.events.push(event);
        }
      }
    };
    var ICal = Components.interfaces.calICalendar;
    var filter = ICal.ITEM_FILTER_CLASS_OCCURRENCES |
                 ICal.ITEM_FILTER_COMPLETED_ALL     |
                 ICal.ITEM_FILTER_TYPE_EVENT;
    var start = date.clone();
    start.isDate = true;
    var duration = Components.classes["@mozilla.org/calendar/duration;1"]
      .createInstance(Components.interfaces.calIDuration);
    duration.days = 1;
    var end = start.clone();
    end.addDuration(duration);
    this.calendar.getItems(filter, 0, start, end, listener);
  },


  createEventForScene: function createEventForScene (sceneuri) {
    var event = Components.classes["@mozilla.org/calendar/event;1"]
      .createInstance(Components.interfaces.calIEvent);
    this.decorateEventForScene(event, sceneuri, true);
    return event;
  },


  updateSceneEvent: function updateSceneEvent (event) {
    // Create a template event so we can just compare the events
    var sceneuri = event.getProperty("X-CELTX-SCENE");
    var tmpl = this.createEventForScene(sceneuri);
    if (event.title == tmpl.title &&
        event.getProperty("DESCRIPTION") == tmpl.getProperty("DESCRIPTION") &&
        event.getProperty("LOCATION") == tmpl.getProperty("LOCATION"))
      return event;
    // Clone the original event to preserve user-specified fields
    var newevent = event.clone();
    newevent.title = tmpl.title;
    if (tmpl.hasProperty("DESRIPTION"))
      newevent.setProperty("DESCRIPTION", tmpl.getProperty("DESCRIPTION"));
    else
      newevent.deleteProperty("DESCRIPTION");
    if (tmpl.hasProperty("LOCATION"))
      newevent.setProperty("LOCATION", tmpl.getProperty("LOCATION"));
    else
      newevent.deleteProperty("LOCATION");
    doTransaction('modify', newevent, newevent.calendar, event, null);
    return newevent;
  },


  createNewEvent: function (aCalendar, aStartTime, aEndTime) {
    if (!aCalendar) {
      aCalendar = gWindow.scheduledeck.selectedPanel.displayCalendar;
      // dump("*** createNewEvent: aCalendar not specified\n");
      // return;
    }

    // if we're given both times, skip the dialog
    if (aStartTime && aEndTime && !aStartTime.isDate && !aEndTime.isDate) {
      var event = createEvent();
      event.startDate = aStartTime;
      event.endDate = aEndTime;
      var sbs = Components.classes["@mozilla.org/intl/stringbundle;1"]
        .getService(Components.interfaces.nsIStringBundleService);
      // var props = sbs.createBundle(
      //   "chrome://calendar/locale/calendar.properties");
      // event.title = props.GetStringFromName("newEvent");
      event.title = gApp.getText("NewEvent");
      setDefaultAlarmValues(event);
      doTransaction('add', event, aCalendar, null, null);
    } else if (aStartTime && aStartTime.isDate) {
      var event = createEvent();
      event.startDate = aStartTime;
      setDefaultAlarmValues(event);
      doTransaction('add', event, aCalendar, null, null);
    } else {
      // default pop up the dialog
      var date;
      if (aStartTime) {
        date = aStartTime;
      } else {
        date = gWindow.monthview.selectedDay.clone();
        date.isDate = true;
      }
      try {
        this.createEventWithDialog(aCalendar, date, null);
      }
      catch (ex) {
        dump("*** createEventWithDialog: " + ex + "\n");
      }
    }
  },


  createEventWithDialog: function (aCalendar, aStartDate, aEndDate) {
    const kDefaultTimezone = calendarDefaultTimezone();
    var curview = gWindow.scheduledeck.selectedPanel;
    if (! aCalendar)
      aCalendar = curview.displayCalendar;

    var event = createEvent();

    if (! aStartDate) {
      aStartDate = curview.selectedDay.clone();
      aStartDate.isDate = true;
    }
    if (aStartDate.isDate) {
      if (! aStartDate.isMutable) {
        aStartDate = aStartDate.clone();
      }
      aStartDate.isDate = false;
      aStartDate.hour = now().hour;
      aStartDate.minute = 0;
      aStartDate.second = 0;
    }
    event.startDate = aStartDate.clone();

    if (! aEndDate) {
      aEndDate = aStartDate.clone();
      var pref = getPrefService().getBranch("celtx.calendar.");
      aEndDate.minute += pref.getIntPref("scene.defaultlength");
    }
    event.endDate = aEndDate.clone();

    event.calendar = aCalendar;

    setDefaultAlarmValues(event);

    var args = {
      calendarEvent: event,
      calendar: aCalendar,
      controller: this,
      mode: "new",
      onOk: function (item, calendar, originalItem) {
        doTransaction('add', item, calendar, null, null);
      }
    };
    openDialog(Cx.CONTENT_PATH + "editors/eventdialog.xul", "_blank",
      "chrome,titlebar,modal,resizable", args);
  },



  modifyOccurrence: function (aOccurrence, aNewStartTime,
                              aNewEndTime, aNewTitle) {
    // if modifying this item directly (e.g. just dragged to new time),
    // then do so; otherwise pop up the dialog
    if ((aNewStartTime && aNewEndTime) || aNewTitle) {
      var instance = aOccurrence.clone();

      if (aNewTitle) {
        instance.title = aNewTitle;
      }

      if (aNewStartTime) { // we know we have aEndTime too then
        instance.startDate = aNewStartTime;
        instance.endDate = aNewEndTime;
      }
      doTransaction('modify', instance, instance.calendar, aOccurrence, null);
    } else {
      var args = {
        calendarEvent: aOccurrence,
        calendar: gWindow.monthview.displayCalendar,
        controller: this,
        mode: "modify",
        onOk: function (item, calendar, originalItem) {
          doTransaction('modify', item, item.calendar, originalItem, null);
        }
      };
      openDialog(Cx.CONTENT_PATH + "editors/eventdialog.xul", "_blank",
        "chrome,titlebar,modal,resizable", args);
    }
  },

  deleteOccurrences: function (aCount, aOccurrences, aUseParentItems,
                               aDoNotConfirm) {
    for (var i = 0; i < aCount; ++i) {
      var itemToDelete = aUseParentItems ?
        getOccurrenceOrParent(aOccurrences[i]) : aOccurrences[i];
      if (!itemToDelete) {
        return;
      }
      if (!itemToDelete.parentItem.hasSameIds(itemToDelete)) {
        var event = itemToDelete.parentItem.clone();
        event.recurrenceInfo.removeOccurrenceAt(itemToDelete.recurrenceId);
        doTransaction('modify', event, event.calendar,
          itemToDelete.parentItem, null);
      }
      else {
        doTransaction('delete', itemToDelete, itemToDelete.calendar, null,
          null);
      }
    }
  },


  switchView: function switchView (view) {
    var selectedDay = gWindow.scheduledeck.selectedPanel.selectedDay;
    switch (view) {
      case "month":
        gWindow.scheduledeck.selectedPanel = gWindow.monthview;
        gWindow.monthview.goToDay(selectedDay);
        break;
      case "week":
        gWindow.scheduledeck.selectedPanel = gWindow.weekview;
        gWindow.weekview.goToDay(selectedDay);
        break;
      case "day":
        gWindow.scheduledeck.selectedPanel = gWindow.dayview;
        gWindow.dayview.goToDay(selectedDay);
        break;
      case "stripboard":
        gWindow.scheduledeck.selectedPanel = gWindow.stripview;
        gWindow.stripview.goToDay(selectedDay);
        break;
    }
  }
};


function setOutlineView (outline) {
  gScheduleController.outline = outline;
}


function getCalStringBundle() {
    var strBundleService = 
        Components.classes["@mozilla.org/intl/stringbundle;1"]
                  .getService(Components.interfaces.nsIStringBundleService);
    return strBundleService.createBundle("chrome://calendar/locale/calendar.properties");
}


// For calPrint()
function currentView () {
  return gWindow.scheduledeck.selectedPanel;
}


// For calPrint()
function getCompositeCalendar () {
  return gScheduleController.calendar;
}


function showError(aMsg) {
  var msg = gApp.getText("CalendarImportFailedMsg");
  celtxBugAlert(msg, Components.stack.caller, aMsg); 
}


function today()
{
    var d = Components.classes['@mozilla.org/calendar/datetime;1'].createInstance(Components.interfaces.calIDateTime);
    d.jsDate = new Date();
    return d.getInTimezone(calendarDefaultTimezone());
}

// For updating calendar color


// Returns the actual style sheet object with the specified path.  Callers are
// responsible for any caching they may want to do.
function getStyleSheet(aStyleSheetPath) {
    for each (var sheet in document.styleSheets) {
        if (sheet.href == aStyleSheetPath) {
            return sheet;
        }
    }
    // Avoid the js strict "function does not always return a value" warning.
    return null;
}

/**
 * Updates the style rules for a particular object.  If the object is a
 * category (and hence doesn't have a uri), we set the category bar color.
 * If it's a calendar, we set the background color and contrasting text color.
 * @param aObject either a calendar (with a .uri), or the category color
 * pref key suffix [the non-unicode part after "calendar.category.color.",
 * equivalent to formatStringForCSSRule(categoryNameInUnicode)].
 */
function updateStyleSheetForObject(aObject, aSheet) {
    var selectorPrefix, name, ruleUpdaterFunc, classPrefix;
    if (aObject.uri) {
        // For a calendar, set background and contrasting text colors
        name = aObject.uri.spec;
        classPrefix = ".calendar-color-box";
        selectorPrefix = "item-calendar=";
        ruleUpdaterFunc = function calendarRuleFunc(aRule, aIndex) {
            var color = aObject.getProperty('color');
            if (!color) {
                color = "#A8C2E1";
            }
            aRule.style.backgroundColor = color;
            aRule.style.color = getContrastingTextColor(color);
        };
    } else {
        // For a category, set the category bar color.  Also note that
        // it uses the ~= selector, since there could be multiple categories.
        name = aObject;
        selectorPrefix = "categories~=";
        classPrefix = ".category-color-box"
        ruleUpdaterFunc = function categoryRuleFunc(aRule, aIndex) {
            var color = getPrefSafe("calendar.category.color."+name, null);
            if (color) {
                aRule.style.backgroundColor = color;
            } else {
                aSheet.deleteRule(aIndex);
            }
        };
    }

    var selector = classPrefix + '[' + selectorPrefix + '"' + name + '"]';

    // Now go find our rule
    var rule, ruleIndex;
    for (var i = 0; i < aSheet.cssRules.length; i++) {
        var maybeRule = aSheet.cssRules[i];
        if (maybeRule.selectorText && (maybeRule.selectorText == selector)) {
            rule = maybeRule;
            ruleIndex = i;
            break;
        }
    }

    if (!rule) {
        aSheet.insertRule(selector + ' { }', aSheet.cssRules.length);
        rule = aSheet.cssRules[aSheet.cssRules.length-1];
    }

    ruleUpdaterFunc(rule, ruleIndex);
}

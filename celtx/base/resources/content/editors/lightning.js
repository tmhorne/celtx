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

var gWindow;

function loaded () {
  gWindow = new Object;

  window.controllers.appendController(gController);
}


function getController () {
  return gController;
}


function setOutlineView (outline) {
  gController.outline = outline;
}


var gController = {
  QueryInterface: function (iid) {
    if (iid.equals(Components.interfaces.nsISupports) ||
        iid.equals(Components.interfaces.calIObserver))
      return this;
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },

  commands: {
    "cmd-page-setup": 1,
    "cmd-print": 1
  },
  supportsCommand: function supportsCommand (cmd) {
    return this.commands[cmd] == 1;
  },
  isCommandEnabled: function isCommandEnabled (cmd) {
    switch (cmd) {
      case "cmd-page-setup":
      case "cmd-print":
        return true;
      default:
        return false;
    }
  },
  doCommand: function doCommand (cmd) {
    switch (cmd) {
      case "cmd-page-setup":
        PrintUtils.showPageSetup();
        break;
      case "cmd-print":
        calPrint();
        break;
    }
  },

  _modified: false,
  loading: false,

  open: function open (project, docres) {
    dump("--- lightning.open\n");
    this.project = project;
    this.docres = docres;

    try {
    var outlineDoc = this.outline.document;
    gWindow.ltnMinimonth = outlineDoc.getElementById("ltnMinimonth");
    gWindow.ltnDateTextPicker = outlineDoc.getElementById("ltnDateTextPicker");
    // gWindow.calendarTree = outlineDoc.getElementById("calendarTree");
    gWindow.agendaTree = outlineDoc.getElementById("agenda-tree");
    gWindow.todoList = outlineDoc.getElementById("calendar-todo-list");
    this.outline.setDelegate(window);

    // var calManager = getCalendarManager();
    var calManager = Components.classes["@mozilla.org/calendar/manager;1"]
      .getService(Components.interfaces.calICalendarManager);
    this.initCalendarManager();

    var forceLoad = false;
    var file = project.fileForResource(docres);
    if (! file) {
      forceLoad = true;
      file = project.projectFolder;
      file.append("calendar.ics");
      file.createUnique(0, 0600);
      project.addFileToDocument(file, docres);
    }

    this.loading = true;
    var rdfsvc = getRDFService();
    var ios = getIOService();
    var caluri = ios.newURI(fileToFileURL(file), null, null);
    this.mCalendar = calManager.createCalendar("ics", caluri);
    try {
      calManager.registerCalendar(this.mCalendar);
    }
    catch (ex) {}
    this.mCalendar.addObserver(this);
    // this.mCalendar.uri = caluri;
    if (forceLoad)
      this.onLoad();

    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
    var title = project.ds.GetTarget(docres, titlearc, true);
    if (title) {
      title = title.QueryInterface(Components.interfaces.nsIRDFLiteral);
      this.mCalendar.name = title.Value;
    }

    ltnOnLoad();
    // ltnSetTreeView();
    // setAgendaTreeView();
    // initializeTodoList();

    showCalendarView("month");

    }
    catch (ex) {
      dump("*** lightning.open: " + ex + "\n");
    }
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


  focus: function focus () {
    var cals = getCalendars();
    var comp = getCompositeCalendar();
    var found = false;
    for (var i = 0 ; i < cals.length; i++) {
      if (comp.getCalendar(cals[i].uri)) {
        // need to remove it
        if (cals[i].uri.equals(this.mCalendar.uri)) {
          found = true;
          // gWindow.calendarTree.view.selection.select(i);
        }
        else
          comp.removeCalendar(cals[i].uri);
      }
    }
    if (! found) {
      comp.addCalendar(this.mCalendar);
      // gWindow.calendarTree.view.selection.select(cals.length);
    }
  },
  blur: function blur () {
  },
  close: function close () {
    window.controllers.removeController(this);
    this.mCalendar.removeObserver(this);
    ltnFinish();
  },
  save: function save () {
    this._modified = false;
  },
  modified getter: function () {
    return this._modified;
  },

  // calIObserver
  onStartBatch: function() {},
  onEndBatch: function() {},
  onLoad: function() {
    dump("--- onLoad\n");
    this.loading = false;
  },
  onAddItem: function(aItem) {
    dump("--- onAddItem (loading == " + this.loading + ")\n");
    if (! this.loading)
      this._modified = true;
  },
  onModifyItem: function(aNewItem, aOldItem) {
    dump("--- onModifyItem (loading == " + this.loading + ")\n");
    if (! this.loading)
      this._modified = true;
  },
  onDeleteItem: function(aDeletedItem) {
    dump("--- onDeleteItem (loading == " + this.loading + ")\n");
    if (! this.loading)
      this._modified = true;
  },
  onError: function(aErrNo, aMessage) {},
  onPropertyChanged: function (cal, name, value, oldvalue) {},
  onPropertyDeleting: function (cal, name) {}
};


// messenger-overlay-sidebar.js overrides

function ltnSidebarCalendarSelected(tree)
{
   getCompositeCalendar().defaultCalendar = ltnSelectedCalendar();
}

function getSelectedCalendar() {
  return ltnSelectedCalendar();
}

function ltnSelectedCalendar()
{
    /*
    var index = document.getElementById("calendarTree").currentIndex;
    */
    return gController.mCalendar;

/*
    var index = gWindow.calendarTree.currentIndex;
    return getCalendars()[index];
*/
}

function ltnDeleteSelectedCalendar()
{
    var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService); 

    var result = {}; 
    var calendarBundle = document.getElementById("bundle_calendar");
    var calendar = ltnSelectedCalendar();
    var ok = promptService.confirm(
        window,
        calendarBundle.getString("unsubscribeCalendarTitle"),
        calendarBundle.getFormattedString("unsubscribeCalendarMessage",[calendar.name]),
        result);
   
    if (ok) {
        ltnRemoveCalendar(calendar);
    }
}

function ltnEditSelectedCalendar()
{
    ltnEditCalendarProperties(ltnSelectedCalendar());
}

function today()
{
    var d = Components.classes['@mozilla.org/calendar/datetime;1'].createInstance(Components.interfaces.calIDateTime);
    d.jsDate = new Date();
    return d.getInTimezone(calendarDefaultTimezone());
}

function nextMonth(dt)
{
    var d = new Date(dt);
    d.setDate(1); // make sure we avoid "June 31" when we bump the month

    var mo = d.getMonth();
    if (mo == 11) {
        d.setMonth(0);
        d.setYear(d.getYear() + 1);
    } else {
        d.setMonth(mo + 1);
    }

    return d;
}

var gMiniMonthLoading = false;
function ltnMinimonthPick(minimonth)
{
    if (gMiniMonthLoading)
        return;

    var jsDate = minimonth.value;
    // document.getElementById("ltnDateTextPicker").value = jsDate;
    gWindow.ltnDateTextPicker.value = jsDate;
    var cdt = new CalDateTime();
    cdt.year = jsDate.getFullYear();
    cdt.month = jsDate.getMonth();
    cdt.day = jsDate.getDate();
    cdt.isDate = true;

    /*
    if (document.getElementById("displayDeck").selectedPanel != 
        document.getElementById("calendar-view-box")) {
        var view = currentView();

        // If we've never shown the view before, we need to do some special
        // things here.
        if (!view.initialized) {
            showCalendarView('month');
            view = currentView();
            cdt.timezone = view.timezone;
            view.goToDay(cdt);
            return;
        }

        // showCalendarView is going to use the value passed in to switch to
        // foo-view, so strip off the -view part of the current view.
        var viewID = view.getAttribute("id");
        viewID = viewID.substring(0, viewID.indexOf('-'));
        showCalendarView(viewID);
    }
    */

    cdt.timezone = currentView().timezone;
    currentView().goToDay(cdt);
}

function ltnGoToDate()
{
    // var goToDate = document.getElementById("ltnDateTextPicker");
    var goToDate = gWindow.ltnDateTextPicker;
    if (goToDate.value) {
        ltnMinimonthPick(goToDate);
    }
}

function ltnOnLoad(event)
{
    gMiniMonthLoading = true;

    var today = new Date();
    var nextmo = nextMonth(today);

    /*
    document.getElementById("ltnMinimonth").value = today;
    */
    gWindow.ltnMinimonth.value = today;

    gMiniMonthLoading = false;

    // nuke the onload, or we get called every time there's
    // any load that occurs
    /*
    document.removeEventListener("load", ltnOnLoad, true);
    */

    // Hide the calendar view so it doesn't push the status-bar offscreen
    /*
    collapseElement(document.getElementById("calendar-view-box"));
    */

    // Start observing preferences
    var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                            .getService(Components.interfaces.nsIPrefService);
    var rootPrefBranch = prefService.getBranch("");
    ltnPrefObserver.rootPrefBranch = rootPrefBranch;
    var pb2 = rootPrefBranch.QueryInterface(
        Components.interfaces.nsIPrefBranch2);
    pb2.addObserver("calendar.", ltnPrefObserver, false);
    ltnPrefObserver.observe(null, null, "");

    // fire up the alarm service
    var alarmSvc = Components.classes["@mozilla.org/calendar/alarm-service;1"]
                   .getService(Components.interfaces.calIAlarmService);
    alarmSvc.timezone = calendarDefaultTimezone();
    alarmSvc.startup();

    // Add an unload function to the window so we don't leak the pref observer
    /*
    document.getElementById("messengerWindow")
            .addEventListener("unload", ltnFinish, false);
    */

    document.getElementById("displayDeck")
            .addEventListener("dayselect", observeViewDaySelect, false);

    // Make sure we update ourselves if the program stays open over midnight
    scheduleMidnightUpdate(refreshUIBits);

    return;
}

/* Called at midnight to tell us to redraw date-specific widgets.  Do NOT call
 * this for normal refresh, since it also calls scheduleMidnightRefresh.
 */
function refreshUIBits() {
    agendaTreeView.refreshPeriodDates();
    document.getElementById("ltnMinimonth").refreshDisplay();

    // refresh the current view, if it has ever been shown
    var cView = currentView();
    if (cView.initialized) {
        cView.goToDay(cView.selectedDay);
    }

    // schedule our next update...
    scheduleMidnightUpdate(refreshUIBits);
}

function showCalendarView(type)
{
    // If we got this call while a mail-view is being shown, we need to
    // hide all of the mail stuff so we have room to display the calendar
    /*
    var calendarViewBox = document.getElementById("calendar-view-box");
    if (calendarViewBox.style.visibility == "collapse") {
        collapseElement(GetMessagePane());
        collapseElement(document.getElementById("threadpane-splitter"));
        var searchBox = findMailSearchBox();
        if (searchBox) {
            collapseElement(searchBox);
        }
        uncollapseElement(calendarViewBox);

        // Thunderbird is smart.  It won't reload the message list if the user
        // clicks the same folder that's already selected.  Therefore, we need
        // to not only remove the tree selection (so clicking triggers an event)
        // but also reset some of TB's internal variables.
        var treeSel = document.getElementById("folderTree").view.selection;
        treeSel.selectEventsSuppressed = true;
        treeSel.clearSelection();
        treeSel.selectEventsSuppressed = false;
        gMsgFolderSelected = null;
        msgWindow.openFolder = null;
    }
    */

    var view = document.getElementById(type+"-view");
    if (!view.initialized) {
        // Set up this view with the current view-checkbox values
        /*
        var workdaysMenu = document.getElementById("ltn-workdays-only");
        view.workdaysOnly = (workdaysMenu.getAttribute("checked") == 'true');

        var tasksMenu = document.getElementById("ltn-tasks-in-view")
        view.tasksInView = (tasksMenu.getAttribute("checked") == 'true');
        */
        view.workDaysOnly = false;
        view.tasksInView = false;
    }

    // document.getElementById("displayDeck").selectedPanel =  calendarViewBox;
    switchToView(type);

    // Set the labels for the context-menu
    var nextCommand = document.getElementById("context_next");
    nextCommand.setAttribute("label", nextCommand.getAttribute("label-"+type));
    var previousCommand = document.getElementById("context_previous")
    previousCommand.setAttribute("label", previousCommand.getAttribute("label-"+type));
}

function goToToday()
{
    // set the current date in the minimonth control;
    // note, that the current view in the calendar-view-box is automatically updated
    var currentDay = today();
    /*
    document.getElementById("ltnMinimonth").value = currentDay.jsDate;
    */
    gWindow.ltnMinimonth.value = currentDay.jsDate;
}

function selectedCalendarPane(event)
{
    var deck = document.getElementById("displayDeck");

    // If we're already showing a calendar view, don't do anything
    if (deck.selectedPanel.id == "calendar-view-box")
        return;

    deck.selectedPanel = document.getElementById("calendar-view-box");

    showCalendarView('week');
}

function LtnObserveDisplayDeckChange(event)
{
    var deck = event.target;

    // Bug 309505: The 'select' event also fires when we change the selected
    // panel of calendar-view-box.  Workaround with this check.
    if (deck.id != "displayDeck") {
        return;
    }

    var id = null;
    try { id = deck.selectedPanel.id } catch (e) { }

    // Now we're switching back to the mail view, so put everything back that
    // we collapsed in showCalendarView()
    if (id != "calendar-view-box") {
        collapseElement(document.getElementById("calendar-view-box"));
        uncollapseElement(GetMessagePane());
        uncollapseElement(document.getElementById("threadpane-splitter"));
        var searchBox = findMailSearchBox();
        if (searchBox) {
            uncollapseElement(searchBox);
        }
    }
}

function ltnPublishCalendar()
{
    publishEntireCalendar(ltnSelectedCalendar());
}

function ltnFinish() {
    var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                            .getService(Components.interfaces.nsIPrefService);
    // Remove the pref observer
    var pb2 = prefService.getBranch("");
    pb2 = pb2.QueryInterface(Components.interfaces.nsIPrefBranch2);
    pb2.removeObserver("calendar.", ltnPrefObserver);

    getCompositeCalendar().removeObserver(agendaTreeView.calendarObserver);
    getCompositeCalendar().removeObserver(ltnCompositeCalendarObserver);
    getCalendarManager().removeObserver(ltnCalendarManagerObserver);
    return;
}

function ltnEditSelectedItem() {
    var selectedItems = currentView().getSelectedItems({});
    for each (var item in selectedItems) {
        calendarViewController.modifyOccurrence(item);
    }
}

function ltnDeleteSelectedItem() {
    var selectedItems = currentView().getSelectedItems({});
    for each (var item in selectedItems) {
        calendarViewController.deleteOccurrence(item);
    }
}

function ltnCreateEvent() {
    calendarViewController.createNewEvent(ltnSelectedCalendar());
}

// Preference observer, watches for changes to any 'calendar.' pref
var ltnPrefObserver =
{
   rootPrefBranch: null,
   observe: function(aSubject, aTopic, aPrefName)
   {
   }
}

// After 1.5 was released, the search box was moved into an optional toolbar
// item, with a different ID.  This function keeps us compatible with both.
function findMailSearchBox() {
    var tb15Box = document.getElementById("searchBox");
    if (tb15Box) {
        return tb15Box;
    }

    var tb2Box = document.getElementById("searchInput");
    if (tb2Box) {
        return tb2Box;
    }

    // In later versions, it's possible that a user removed the search box from
    // the toolbar.
    return null;
}

function toggleWorkdaysOnly() {
    var deck = document.getElementById("calendar-view-box")
    for each (view in deck.childNodes) {
        view.workdaysOnly = !view.workdaysOnly;
    }

    // Refresh the current view
    currentView().goToDay(currentView().selectedDay);
}

function toggleTasksInView() {
    var deck = document.getElementById("calendar-view-box")
    for each (view in deck.childNodes) {
        view.tasksInView = !view.tasksInView;
    }

    // Refresh the current view
    currentView().goToDay(currentView().selectedDay);
}

/*
document.getElementById("displayDeck").
    addEventListener("select", LtnObserveDisplayDeckChange, true);

document.addEventListener("load", ltnOnLoad, true);
*/

// calendar-management.js overrides

var gCachedStyleSheet;
function addCalendarToTree(aCalendar)
{
    return;

    /*
    var boxobj = document.getElementById("calendarTree").treeBoxObject;
    */
    var boxobj = gWindow.calendarTree.treeBoxObject;

    // Special trick to compare interface pointers, since normal, ==
    // comparison can fail due to javascript wrapping.
    var sip = Components.classes["@mozilla.org/supports-interface-pointer;1"]
                         .createInstance(Components.interfaces.nsISupportsInterfacePointer);
    sip.data = aCalendar;
    sip.dataIID = Components.interfaces.calICalendar;

    boxobj.rowCountChanged(getCalendars().indexOf(sip.data), 1);

    if (!gCachedStyleSheet) {
        gCachedStyleSheet = getStyleSheet("chrome://calendar/content/calendar-view-bindings.css");
    }
    updateStyleSheetForObject(aCalendar, gCachedStyleSheet);
}

function removeCalendarFromTree(aCalendar)
{
    return;

    var calTree = document.getElementById("calendarTree")

    // Special trick to compare interface pointers, since normal, ==
    // comparison can fail due to javascript wrapping.
    var sip = Components.classes["@mozilla.org/supports-interface-pointer;1"]
                         .createInstance(Components.interfaces.nsISupportsInterfacePointer);
    sip.data = aCalendar;
    sip.dataIID = Components.interfaces.calICalendar;
    var index = getCalendars().indexOf(sip.data);
    calTree.boxObject.rowCountChanged(index, -1);

    // Just select the new last row, if we removed the last listed calendar
    if (index == calTree.view.rowCount-1) {
        index--;
    }

    calTree.view.selection.select(index);
}

var ltnCalendarManagerObserver = {
    QueryInterface: function(aIID) {
        if (!aIID.equals(Components.interfaces.calICalendarManagerObserver) &&
            !aIID.equals(Components.interfaces.nsISupports)) {
            throw Components.results.NS_ERROR_NO_INTERFACE;
        }

        return this;
    },

    onCalendarRegistered: function(aCalendar) {
        addCalendarToTree(aCalendar);
        getCompositeCalendar().addCalendar(aCalendar);
    },

    onCalendarUnregistering: function(aCalendar) {
        removeCalendarFromTree(aCalendar);
        getCompositeCalendar().removeCalendar(aCalendar.uri);
    },

    onCalendarDeleting: function(aCalendar) {
        removeCalendarFromTree(aCalendar); // XXX what else?
        getCompositeCalendar().removeCalendar(aCalendar.uri);
    },

    onCalendarPrefSet: function(aCalendar, aName, aValue) {
        if (!gCachedStyleSheet) {
            gCachedStyleSheet = getStyleSheet("chrome://calendar/content/calendar-view-bindings.css");
        }
        updateStyleSheetForObject(aCalendar, gCachedStyleSheet);
    },

    onCalendarPrefDeleting: function(aCalendar, aName) {
    }
};

var ltnCompositeCalendarObserver = {
    QueryInterface: function(aIID) {
        // I almost wish that calICompositeObserver did not inherit from calIObserver,
        // and that the composite calendar maintined its own observer list
        if (!aIID.equals(Components.interfaces.calIObserver) &&
            !aIID.equals(Components.interfaces.calICompositeObserver) &&
            !aIID.equals(Components.interfaces.nsISupports)) {
            throw Components.results.NS_ERROR_NO_INTERFACE;
        }

        return this;
    },

    // calICompositeObserver
    onCalendarAdded: function (aCalendar) {
        /*
        document.getElementById("calendarTree").boxObject.invalidate();
        */
    },

    onCalendarRemoved: function (aCalendar) {
        /*
        document.getElementById("calendarTree").boxObject.invalidate();
        */
    },

    onDefaultCalendarChanged: function (aNewDefaultCalendar) {
        // make the calendar bold in the tree
    },

    // calIObserver
    onStartBatch: function() {},
    onEndBatch: function() {},
    onLoad: function() {},
    onAddItem: function(aItem) {},
    onModifyItem: function(aNewItem, aOldItem) {},
    onDeleteItem: function(aDeletedItem) {},
    onError: function(aErrNo, aMessage) {},
    onPropertyChanged: function (cal, name, value, oldvalue) {},
    onPropertyDeleting: function (cal, name) {}
};

function ltnCreateInstance (classname, ifname) {
  return Components.classes[classname].createInstance(
    Components.interfaces[ifname]);
}

function ltnGetService (classname, ifname) {
  return Components.classes[classname].getService(
    Components.interfaces[ifname]);
}

var activeCompositeCalendar = null;
function getCompositeCalendar()
{
    if (activeCompositeCalendar == null) {
        activeCompositeCalendar =
            ltnCreateInstance("@mozilla.org/calendar/calendar;1?type=composite",
                              "calICompositeCalendar");
        activeCompositeCalendar.prefPrefix = "lightning-main";
        activeCompositeCalendar.addObserver(ltnCompositeCalendarObserver, 0);
    }

    return activeCompositeCalendar;
}

var activeCalendarManager;
function getCalendarManager()
{
    if (!activeCalendarManager) {
        activeCalendarManager = ltnGetService("@mozilla.org/calendar/manager;1",
                                              "calICalendarManager");
        activeCalendarManager.addObserver(ltnCalendarManagerObserver);
    }

    if (activeCalendarManager.getCalendars({}).length == 0) {
        var homeCalendar = activeCalendarManager.createCalendar("storage", 
                           makeURL("moz-profile-calendar://"));
        activeCalendarManager.registerCalendar(homeCalendar);

        homeCalendar.name = calGetString("calendar", "homeCalendarName");

        var composite = getCompositeCalendar();
        composite.addCalendar(homeCalendar);
        // XXX this doesn't make it selected, but you do add to it
    }

    return activeCalendarManager;
}

function getCalendars()
{
    try {
        return getCalendarManager().getCalendars({});
    } catch (e) {
        dump("Error getting calendars: " + e + "\n");
        return [];
    }
}

function ltnNewCalendar()
{
    openCalendarWizard(ltnSetTreeView);
}

function ltnRemoveCalendar(cal)
{
    // XXX in the future, we should ask the user if they want to delete the
    // XXX files associated with this calendar or not!
    getCalendarManager().unregisterCalendar(cal);
    getCalendarManager().deleteCalendar(cal);
}

function ltnEditCalendarProperties(cal)
{
    return openCalendarProperties(cal, function() { });
}

var ltnCalendarTreeView = {
    get rowCount()
    {
        try {
            return getCalendars().length;
        } catch (e) {
            return 0;
        }
    },

    getCellProperties: function (row, col, properties)
    {
        if (col.id == "col-calendar-Checkbox") {
            var cal = getCalendars()[row];
            // We key off this to set the images for the checkboxes
            if (getCompositeCalendar().getCalendar(cal.uri)) {
                properties.AppendElement(ltnGetAtom("checked"));
            }
            else {
                properties.AppendElement(ltnGetAtom("unchecked"));
            }
        }
    },

    cycleCell: function (row, col)
    {
        var cal = getCalendars()[row];
        if (getCompositeCalendar().getCalendar(cal.uri)) {
            // need to remove it
            getCompositeCalendar().removeCalendar(cal.uri);
        } else {
            // need to add it
            getCompositeCalendar().addCalendar(cal);
        }
        /*
        document.getElementById("calendarTree").boxObject.invalidateRow(row);
        */
        gWindow.calendarTree.boxObject.invalidateRow(row);
    },

    getCellValue: function (row, col)
    {
        if (col.id == "col-calendar-Checkbox") {
            var cal = getCalendars()[row];
            if (getCompositeCalendar().getCalendar(cal.uri))
                return "true";
            return "false";
        }

        dump ("*** Bad getCellValue (row: " + row + " col id: " + col.id + ")\n");
        return null;
    },

    setCellValue: function (row, col, value)
    {
        if (col.id == "col-calendar-Checkbox") {
            var cal = getCellValue()[row];
            if (value == "true") {
                getCompositeCalendar().addCalendar(cal);
            } else {
                getCompositeCalendar().removeCalendar(cal.uri);
            }
            return;
        }

        dump ("*** Bad setCellText (row: " + row + " col id: " + col.id + " val: " + value + ")\n");
    },

    getCellText: function (row, col)
    {
        if (col.id == "col-calendar-Checkbox") {
            return "";          // tooltip
        }

        if (col.id == "col-calendar-Calendar") {
            try {
                return getCalendars()[row].name;
            } catch (e) {
                return "<Unknown " + row + ">";
            }
        }

        dump ("*** Bad getCellText (row: " + row + " col id: " + col.id + ")\n");
        return null;
    },

    isEditable: function(row, col) { return false; },
    setTree: function(treebox) { this.treebox = treebox; },
    isContainer: function(row) { return false; },
    isSeparator: function(row) { return false; },
    isSorted: function(row) { return false; },
    getLevel: function(row) { return 0; },
    getImageSrc: function(row, col) { return null; },
    getRowProperties: function(row, props) { },
    getColumnProperties: function(colid, col, props) { },
    cycleHeader: function() { },
    onDoubleClick: function(event)
    {
        // We only care about left-clicks
        if (event.button != 0) 
            return;

        // Find the row clicked on
        /*
        var tree = document.getElementById("agenda-tree");
        */
        var tree = gWindow.agendaTree;
        var row = tree.treeBoxObject.getRowAt(event.clientX, event.clientY);

        // If we clicked on a calendar, edit it, otherwise create a new one
        var cal = getCalendars()[row];
        if (!cal) {
            ltnNewCalendar();
        } else {
            ltnEditCalendarProperties(cal);
        }
    }
};

function ltnSetTreeView()
{
    return;

    /*
    document.getElementById("calendarTree").view = ltnCalendarTreeView;

    // Ensure that a calendar is selected in calendar tree after startup.
    if (document.getElementById("calendarTree").currentIndex == -1) {
        document.getElementById("calendarTree").view.selection.select(0);
    }
    */
    gWindow.calendarTree.view = ltnCalendarTreeView;

    // Ensure that a calendar is selected in calendar tree after startup.
    if (gWindow.calendarTree.currentIndex == -1) {
      gWindow.calendarTree.view.selection.select(0);
    }
}

/*
window.addEventListener("load", ltnSetTreeView, false);
// Wire up the calendar observers.
window.addEventListener("load", getCalendarManager, false);
*/

// agenda-tree.js overrides

// Agenda tree view, to display upcoming events, tasks, and reminders
//
// We track three periods of time for a segmented view:
// - today: the current time until midnight
// - tomorrow: midnight to midnight
// - soon: end-of-tomorrow to end-of-one-week-from-today (midnight)
//
// Events (recurrences of events, really) are stored in per-period containers,
// hung off of "period" objects. In addition, we build an array of the row-
// representation we use for backing the tree display.
//
// The tree-view array (this.events) consists of the synthetic events for the time
// periods, each one followed, if tree-expanded, by its collection of events.  This
// results in a this.events array like the following, if "Today" and "Soon" are
// expanded:
// [ synthetic("Today"),
//   occurrence("Today Event 1"),
//   occurrence("Today Event 2"),
//   synthetic("Tomorrow"),
//   synthetic("Soon"),
//   occurrence("Soon Event 1"),
//   occurrence("Soon Event 2") ]
//
// At window load, we connect the view to the tree and initiate a calendar query
// to populate the event buckets.  Once the query is complete, we sort each bucket
// and then build the aggregate array described above.
//
// When calendar queries are refreshed (by a calendar being added/removed WRT the
// current view, the user selecting a different filter, or some hidden manual-
// refresh testing UI) the event buckets are emptied, and we add items as they
// arrive.
//

function Synthetic(title, open)
{
    this.title = title;
    this.open = open;
    this.events = [];
}

var agendaTreeView = {
    events: [],
    todayCount: 0,
    tomorrowCount: 0,
    soonCount: 0,
    prevRowCount: 0
};

agendaTreeView.init =
function initAgendaTree()
{
    this.today = new Synthetic(ltnGetString("lightning", "agendaToday"), true);
    this.tomorrow = new Synthetic(ltnGetString("lightning", "agendaTomorrow"), false);
    this.soon = new Synthetic(ltnGetString("lightning", "agendaSoon"), false);
    this.periods = [this.today, this.tomorrow, this.soon];
}

agendaTreeView.addEvents =
function addEvents(master)
{
    this.events.push(master);
    if (master.open)
        this.events = this.events.concat(master.events);
};

agendaTreeView.rebuildEventsArray =
function rebuildEventsArray()
{
    this.events = [];
    this.addEvents(this.today);
    this.addEvents(this.tomorrow);
    this.addEvents(this.soon);
};

agendaTreeView.forceTreeRebuild =
function forceTreeRebuild()
{
    if (this.tree) {
        this.tree.view = this;
    }
};

agendaTreeView.rebuildAgendaView =
function rebuildAgendaView(invalidate)
{
    this.rebuildEventsArray();
    this.forceTreeRebuild();
};

agendaTreeView.__defineGetter__("rowCount",
function get_rowCount()
{
    return this.events.length;
});

agendaTreeView.isContainer =
function isContainer(row)
{
    return (this.events[row] instanceof Synthetic);
};

agendaTreeView.isContainerOpen =
function isContainerOpen(row)
{
    var open = this.events[row].open;
    return open;
};

agendaTreeView.isContainerEmpty =
function isContainerEmpty(row)
{
    if (this.events[row].events.length == 0)
        return true;
    return false;
};

agendaTreeView.setTree =
function setTree(tree)
{
    this.tree = tree;
};

agendaTreeView.getCellText =
function getCellText(row, column)
{
    // title column
    var event = this.events[row];
    if (column.id == "col-agenda-item") {
        if (event instanceof Synthetic)
            return event.title;
        return event.title;
    }
    // date/time column
    var dateFormatter = Components.classes["@mozilla.org/calendar/datetime-formatter;1"]
                                  .getService(Components.interfaces.calIDateTimeFormatter);
    if (event instanceof Synthetic) {
        if (event == this.today) {
            return dateFormatter.formatDate(this.today.start);
        }
        else if (event == this.tomorrow) {
            return dateFormatter.formatDate(this.tomorrow.start);
        }
        return "";
    }
    var start = event.startDate || event.dueDate || event.entryDate;
    start = start.getInTimezone(calendarDefaultTimezone());
    if (start.compare(this.tomorrow.end) == -1) {
        // time only for events on today and tomorrow
        return  dateFormatter.formatTime(start);
    }
    else {
        return dateFormatter.formatDateTime(start);
    }
};

agendaTreeView.getLevel =
function getLevel(row)
{
    if (this.isContainer(row))
        return 0;
    return 1;
};

agendaTreeView.isSorted =
function isSorted() { return false; };

agendaTreeView.isEditable =
function isEditable(row, column) { return false; };

agendaTreeView.isSeparator =
function isSeparator(row) { return false; };

agendaTreeView.getImageSrc =
function getImageSrc(row, column) { return null; };

agendaTreeView.getCellProperties =
function getCellProperties(row, column) { return null; };

agendaTreeView.getRowProperties =
function getRowProperties(row) { return null; };

agendaTreeView.getColumnProperties =
function getColumnProperties(column) { return null; };

agendaTreeView.cycleHeader =
function cycleHeader(header)
{
    this.refreshCalendarQuery(); // temporary hackishness
    this.rebuildAgendaView();
    this.forceTreeRebuild();
};

agendaTreeView.getParentIndex =
function getParentIndex(row)
{
    if (this.isContainer(row))
        return -1;
    var i = row - 1;
    do {
        if (this.events[i] instanceof Synthetic)
            return i;
        i--;
    } while (i != -1);
    throw "no parent for row " + row + "?";
};

agendaTreeView.toggleOpenState =
function toggleOpenState(row)
{
    if (!this.isContainer(row))
        throw "toggling open state on non-container row " + row + "?";
    var header = this.events[row];
    if (!("open") in header)
        throw "no open state found on container row " + row + "?";
    header.open = !header.open;
    this.rebuildAgendaView(); // reconstruct the visible row set
    this.forceTreeRebuild();
};

agendaTreeView.hasNextSibling =
function hasNextSibling(row, afterIndex)
{
};

agendaTreeView.findPeriodForItem =
function findPeriodForItem(item)
{
    var start = item.startDate || item.entryDate || item.dueDate;
    if (!start) 
        return null;
    if (start.compare(this.today.end) == -1)
        return this.today;
        
    if (start.compare(this.tomorrow.end) == -1)
        return this.tomorrow;
    
    if (start.compare(this.soon.end) == -1)
        return this.soon;
    

    return null;
};

agendaTreeView.addItem =
function addItem(item)
{
    var when = this.findPeriodForItem(item);
    if (!when)
        return;
    when.events.push(item);
    this.calendarUpdateComplete();
};

agendaTreeView.onDoubleClick =
function agendaDoubleClick(event)
{
    // We only care about left-clicks
    if (event.button != 0) 
        return;

    // Find the row clicked on, and the corresponding event
    /*
    var tree = document.getElementById("agenda-tree");
    */
    var tree = gWindow.agendaTree;
    var row = tree.treeBoxObject.getRowAt(event.clientX, event.clientY);
    var calendar = ltnSelectedCalendar();
    var calEvent = this.events[row];

    if (!calEvent) { // Clicked in empty space, just create a new event
        createEventWithDialog(calendar, today(), today());
        return;
    }
    if (!this.isContainer(row)) { // Clicked on a task/event, edit it
        var eventToEdit = getOccurrenceOrParent(calEvent);
        modifyEventWithDialog(eventToEdit);
    } else { // Clicked on a container, create an event that day
        if (calEvent == this.today) {
            createEventWithDialog(calendar, today(), today());
        } else {
            var tom = today().clone();
            var offset = Components.classes["@mozilla.org/calendar/duration;1"]
              .createInstance(Components.interfaces.calIDuration);
            offset.days = (calEvent == this.tomorrow) ? 1 : 2;
            tom.addDuration(offset);
            createEventWithDialog(calendar, tom, tom);
        }
    }
}

agendaTreeView.deleteItem =
function deleteItem(item)
{
    var when = this.findPeriodForItem(item);
    if (!when) {
        return;
    }
    
    when.events = when.events.filter(function (e) {
                                         if (e.id != item.id)
                                             return true;
                                         if (e.recurrenceId && item.recurrenceId &&
                                             e.recurrenceId.compare(item.recurrenceId) != 0)
                                             return true;
                                         return false;
                                     });
    this.rebuildAgendaView(true);
};

agendaTreeView.calendarUpdateComplete =
function calendarUpdateComplete()
{
    [this.today, this.tomorrow, this.soon].forEach(function(when) {
        function compare(a, b) {
            // The assumption is that tasks having a dueDate should be added
            // to the agenda based on _that_, rather than entryDate, but tasks
            // with an entryDate but no dueDate shouldn't be left out.
            var ad = a.startDate || a.dueDate || a.entryDate;
            var bd = b.startDate || b.dueDate || b.entryDate;
            return ad.compare(bd);
        }
        when.events.sort(compare);
    });
    this.rebuildAgendaView(true);
};

agendaTreeView.calendarOpListener =
{
    agendaTreeView: agendaTreeView
};

agendaTreeView.calendarOpListener.onOperationComplete =
function listener_onOperationComplete(calendar, status, optype, id,
                                      detail)
{
    this.agendaTreeView.calendarUpdateComplete();  
};

agendaTreeView.calendarOpListener.onGetResult =
function listener_onGetResult(calendar, status, itemtype, detail, count, items)
{
    if (!Components.isSuccessCode(status))
        return;

    items.forEach(this.agendaTreeView.addItem, this.agendaTreeView);
};

agendaTreeView.refreshCalendarQuery =
function refreshCalendarQuery()
{
    var filter = this.calendar.ITEM_FILTER_COMPLETED_ALL |
                 this.calendar.ITEM_FILTER_CLASS_OCCURRENCES;
    if (!this.filterType)
        this.filterType = 'all';
    switch (this.filterType) {
        case 'all': 
            filter |= this.calendar.ITEM_FILTER_TYPE_EVENT |
                      this.calendar.ITEM_FILTER_TYPE_TODO;
            break;
        case 'events':
            filter |= this.calendar.ITEM_FILTER_TYPE_EVENT;
            break;
        case 'tasks':
            filter |= this.calendar.ITEM_FILTER_TYPE_TODO;
            break;
    }

    this.periods.forEach(function (p) { p.events = []; });
    this.calendar.getItems(filter, 0, this.today.start, this.soon.end,
                           this.calendarOpListener);
};

agendaTreeView.updateFilter =
function updateAgendaFilter(menulist) {
    this.filterType = menulist.selectedItem.value;
    this.refreshCalendarQuery();
    return;
};

agendaTreeView.refreshPeriodDates =
function refreshPeriodDates()
{
    var now = new Date();
    var d = Components.classes["@mozilla.org/calendar/datetime;1"]
      .createInstance(Components.interfaces.calIDateTime);
    d.jsDate = now;
    d = d.getInTimezone(calendarDefaultTimezone());

    var duration = Components.classes["@mozilla.org/calendar/duration;1"]
      .createInstance(Components.interfaces.calIDuration);
    duration.days = 1;

    // Today: now until midnight of tonight
    this.today.start = d.clone();
    d.hour = d.minute = d.second = 0;
    d.addDuration(duration);
    this.today.end = d.clone();

    // Tomorrow: midnight of next day to +24 hrs
    this.tomorrow.start = d.clone();
    d.addDuration(duration);
    this.tomorrow.end = d.clone();

    // Soon: end of tomorrow to 6 six days later (remainder of the week period)
    this.soon.start = d.clone();
    duration.days = 6;
    d.addDuration(duration);
    this.soon.end = d.clone();

    this.refreshCalendarQuery();
};

agendaTreeView.calendarObserver = {
    agendaTreeView: agendaTreeView
};

agendaTreeView.calendarObserver.QueryInterface = function agenda_QI(aIID) {
    if (!aIID.equals(Components.interfaces.calIObserver) &&
        !aIID.equals(Components.interfaces.calICompositeObserver) &&
        !aIID.equals(Components.interfaces.nsISupports)) {
        throw Components.results.NS_ERROR_NO_INTERFACE;
    }
    return this;
};

// calIObserver:
agendaTreeView.calendarObserver.onStartBatch = function agenda_onBatchStart() {
    this.mBatchCount++;
};
agendaTreeView.calendarObserver.onEndBatch = function() {
    this.mBatchCount--;
    if (this.mBatchCount == 0) {
        // Rebuild everything
        this.agendaTreeView.refreshCalendarQuery();
    }
};
agendaTreeView.calendarObserver.onLoad = function() {};

agendaTreeView.calendarObserver.onAddItem =
function observer_onAddItem(item)
{
    if (this.mBatchCount) {
        return;
    }
    var occs = item.getOccurrencesBetween(this.agendaTreeView.today.start,
                                          this.agendaTreeView.soon.end, {});
    occs.forEach(this.agendaTreeView.addItem, this.agendaTreeView);
    this.agendaTreeView.rebuildAgendaView();
};

agendaTreeView.calendarObserver.onDeleteItem =
function observer_onDeleteItem(item, rebuildFlag)
{
    if (this.mBatchCount) {
        return;
    }
    var occs = item.getOccurrencesBetween(this.agendaTreeView.today.start,
                                          this.agendaTreeView.soon.end, {});
    occs.forEach(this.agendaTreeView.deleteItem, this.agendaTreeView);
    if (rebuildFlag != "no-rebuild")
        this.agendaTreeView.rebuildAgendaView();
};

agendaTreeView.calendarObserver.onModifyItem =
function observer_onModifyItem(newItem, oldItem)
{
    if (this.mBatchCount) {
        return;
    }
    this.onDeleteItem(oldItem, "no-rebuild");
    this.onAddItem(newItem);
};

agendaTreeView.calendarObserver.onError = function(errno, msg) {};

agendaTreeView.calendarObserver.onPropertyChanged =
function(cal, name, value, oldvalue) {};

agendaTreeView.calendarObserver.onPropertyDeleted = function(cal, name) {};

agendaTreeView.calendarObserver.onCalendarAdded = 
function agenda_calAdd(aCalendar) {
    this.agendaTreeView.refreshCalendarQuery();
};

agendaTreeView.calendarObserver.onCalendarRemoved = 
function agenda_calRemove(aCalendar) {
    this.agendaTreeView.refreshCalendarQuery();
};

agendaTreeView.calendarObserver.onDefaultCalendarChanged = function(aCalendar) {
};

agendaTreeView.setCalendar =
function setCalendar(calendar)
{
    if (this.calendar)
        this.calendar.removeObserver(this.calendarObserver);
    this.calendar = calendar;
    calendar.addObserver(this.calendarObserver);

    this.init();

    // Update everything
    this.refreshPeriodDates();
};

function setAgendaTreeView()
{
    agendaTreeView.setCalendar(getCompositeCalendar());
    /*
    document.getElementById("agenda-tree").view = agendaTreeView;
    */
    gWindow.agendaTree.view = agendaTreeView;
}

/*
window.addEventListener("load", setAgendaTreeView, false);
*/

// todo-list.js overrides

function eventToTodo(event)
{
  try {
    return event.originalTarget.selectedItem.todo;
  } catch (e) {
    return null;
  }
}

function editTodoItem(event)
{
  var todo = eventToTodo(event);
  if (todo)
    modifyEventWithDialog(todo);
}

function newTodoItem(event)
{
  createTodoWithDialog(ltnSelectedCalendar());
}

function deleteTodoItem(event)
{
  var todo = eventToTodo(event);
  if (todo)
    todo.calendar.deleteItem(todo, null);
}

function initializeTodoList()
{
  /*
  var todoList = document.getElementById("calendar-todo-list");
  */
  var todoList = gWindow.todoList;
  todoList.calendar = getCompositeCalendar();
  todoList.addEventListener("todo-item-open", editTodoItem, false);
  todoList.addEventListener("todo-item-delete", deleteTodoItem, false);
  todoList.addEventListener("todo-empty-dblclick", newTodoItem, false);
}

/*
window.addEventListener("load", initializeTodoList, false);
*/

// import-export.js overrides

// File constants copied from file-utils.js
const MODE_RDONLY   = 0x01;
const MODE_WRONLY   = 0x02;
const MODE_RDWR     = 0x04;
const MODE_CREATE   = 0x08;
const MODE_APPEND   = 0x10;
const MODE_TRUNCATE = 0x20;
const MODE_SYNC     = 0x40;
const MODE_EXCL     = 0x80;

var gItems = new Array();

/**
 * loadEventsFromFile
 * shows a file dialog, reads the selected file(s) and tries to parse events from it.
 *
 * @param aCalendar  (optional) If specified, the items will be imported directly
 *                              into the calendar
 */
function loadEventsFromFile(aCalendar)
{
    const nsIFilePicker = Components.interfaces.nsIFilePicker;
  
    var fp = Components.classes["@mozilla.org/filepicker;1"]
                       .createInstance(nsIFilePicker);
    fp.init(window, getCalStringBundle().GetStringFromName("Open"),
            nsIFilePicker.modeOpen);
    fp.defaultExtension = "ics";

    // Get a list of exporters
    var contractids = new Array();
    var catman = Components.classes["@mozilla.org/categorymanager;1"]
                           .getService(Components.interfaces.nsICategoryManager);
    var catenum = catman.enumerateCategory('cal-importers');
    while (catenum.hasMoreElements()) {
        var entry = catenum.getNext();
        entry = entry.QueryInterface(Components.interfaces.nsISupportsCString);
        var contractid = catman.getCategoryEntry('cal-importers', entry);
        var exporter = Components.classes[contractid]
                                 .getService(Components.interfaces.calIImporter);
        var types = exporter.getFileTypes({});
        var type;
        for each (type in types) {
            fp.appendFilter(type.description, type.extensionFilter);
            contractids.push(contractid);
        }
    }

    fp.show();

    if (fp.file && fp.file.path && fp.file.path.length > 0) {
        var filePath = fp.file.path;
        var importer = Components.classes[contractids[fp.filterIndex]]
                                 .getService(Components.interfaces.calIImporter);

        const nsIFileInputStream = Components.interfaces.nsIFileInputStream;
        const nsIScriptableInputStream = Components.interfaces.nsIScriptableInputStream;

        var inputStream = Components.classes["@mozilla.org/network/file-input-stream;1"]
                                    .createInstance(nsIFileInputStream);

        try
        {
           inputStream.init( fp.file, MODE_RDONLY, 0444, {} );

           gItems = importer.importFromStream(inputStream, {});
           inputStream.close();
        }
        catch(ex)
        {
           showError(getCalStringBundle().GetStringFromName("unableToRead") + filePath + "\n"+ex );
        }

        if (aCalendar) {
            putItemsIntoCal(aCalendar);
            return;
        }

        var count = new Object();
        var calendars = getCalendarManager().getCalendars(count);

        if (count.value == 1) {
            // There's only one calendar, so it's silly to ask what calendar
            // the user wants to import into.
            putItemsIntoCal(calendars[0]);
        } else {
            // Ask what calendar to import into
            var args = new Object();
            args.onOk = putItemsIntoCal;
            args.promptText = getCalStringBundle().GetStringFromName("importPrompt");
            openDialog("chrome://calendar/content/chooseCalendarDialog.xul", 
                       "_blank", "chrome,titlebar,modal,resizable", args);
        }
    }
}

function putItemsIntoCal(destCal) {
    // Set batch for the undo/redo transaction manager
    startBatchTransaction();

    // And set batch mode on the calendar, to tell the views to not
    // redraw until all items are imported
    destCal.startBatch();

    // This listener is needed to find out when the last addItem really
    // finished. Using a counter to find the last item (which might not
    // be the last item added)
    var count = 0;
    var failedCount = 0;
    // Used to store the last error. Only the last error, because we don't
    // wan't to bomb the user with thousands of error messages in case
    // something went really wrong.
    // (example of something very wrong: importing the same file twice.
    //  quite easy to trigger, so we really should do this)
    var lastError;
    var listener = {
        onOperationComplete: function(aCalendar, aStatus, aOperationType, aId, aDetail) {
            count++;
            if (!Components.isSuccessCode(aStatus)) {
                failedCount++;
                lastError = aStatus;
            }
            // See if it is time to end the calendar's batch.
            if (count == gItems.length) {
                destCal.endBatch();
                if (failedCount)
                    showError(failedCount+" items failed to import. The last error was: "+lastError.toString());
            }
        }
    }

    for each (item in gItems) {
        // XXX prompt when finding a duplicate.
        try {
            destCal.addItem(item, listener);
        } catch(e) {
            failedCount++;
            lastError = e;
            // Call the listener's operationComplete, to increase the
            // counter and not miss failed items. Otherwise, endBatch might
            // never be called.
            listener.onOperationComplete(null, null, null, null, null);
            Components.utils.reportError("Import error: "+e);
        }
    }

    // End transmgr batch
    endBatchTransaction();
}

/**
 * saveEventsToFile
 *
 * Save data to a file. Create the file or overwrite an existing file.
 *
 * @param calendarEventArray (required) Array of calendar events that should
 *                                      be saved to file.
 * @param aDefaultFileName   (optional) Initial filename shown in SaveAs dialog.
 */

function saveEventsToFile(calendarEventArray, aDefaultFileName)
{
   if (!calendarEventArray)
       return;

   if (!calendarEventArray.length)
   {
      alert(getCalStringBundle().GetStringFromName("noEventsToSave"));
      return;
   }

   // Show the 'Save As' dialog and ask for a filename to save to
   const nsIFilePicker = Components.interfaces.nsIFilePicker;

   var fp = Components.classes["@mozilla.org/filepicker;1"]
                      .createInstance(nsIFilePicker);

   fp.init(window,  getCalStringBundle().GetStringFromName("SaveAs"),
           nsIFilePicker.modeSave);

   if (aDefaultFileName && aDefaultFileName.length && aDefaultFileName.length > 0) {
      fp.defaultString = aDefaultFileName;
   } else if (calendarEventArray.length == 1 && calendarEventArray[0].title) {
      fp.defaultString = calendarEventArray[0].title;
   } else {
      fp.defaultString = getCalStringBundle().GetStringFromName("defaultFileName");
   }

   fp.defaultExtension = "ics";

   // Get a list of exporters
   var contractids = new Array();
   var catman = Components.classes["@mozilla.org/categorymanager;1"]
                          .getService(Components.interfaces.nsICategoryManager);
   var catenum = catman.enumerateCategory('cal-exporters');
   while (catenum.hasMoreElements()) {
       var entry = catenum.getNext();
       entry = entry.QueryInterface(Components.interfaces.nsISupportsCString);
       var contractid = catman.getCategoryEntry('cal-exporters', entry);
       var exporter = Components.classes[contractid]
                                .getService(Components.interfaces.calIExporter);
       var types = exporter.getFileTypes({});
       var type;
       for each (type in types) {
           fp.appendFilter(type.description, type.extensionFilter);
           contractids.push(contractid);
       }
   }


   fp.show();

   // Now find out as what to save, convert the events and save to file.
   if (fp.file && fp.file.path.length > 0) 
   {
      const UTF8 = "UTF-8";
      var aDataStream;
      var extension;
      var charset;

      var exporter = Components.classes[contractids[fp.filterIndex]]
                               .getService(Components.interfaces.calIExporter);

      var filePath = fp.file.path;
      if(filePath.indexOf(".") == -1 )
          filePath += "."+exporter.getFileTypes({})[0].defaultExtension;

      const LOCALFILE_CTRID = "@mozilla.org/file/local;1";
      const FILEOUT_CTRID = "@mozilla.org/network/file-output-stream;1";
      const nsILocalFile = Components.interfaces.nsILocalFile;
      const nsIFileOutputStream = Components.interfaces.nsIFileOutputStream;

      var outputStream;

      var localFileInstance = Components.classes[LOCALFILE_CTRID]
                                        .createInstance(nsILocalFile);
      localFileInstance.initWithPath(filePath);

      outputStream = Components.classes[FILEOUT_CTRID]
                               .createInstance(nsIFileOutputStream);
      try
      {
         outputStream.init(localFileInstance, MODE_WRONLY | MODE_CREATE | MODE_TRUNCATE, 0664, 0);
         // XXX Do the right thing with unicode and stuff. Or, again, should the
         //     exporter handle that?
         exporter.exportToStream(outputStream, calendarEventArray.length, calendarEventArray, null);
         outputStream.close();
      }
      catch(ex)
      {
         showError(getCalStringBundle().GetStringFromName("unableToWrite") + filePath );
      }
   }
}

/* Exports all the events and tasks in a calendar.  If aCalendar is not specified,
 * the user will be prompted with a list of calendars to choose which one to export.
 */
function exportEntireCalendar(aCalendar) {
    var itemArray = [];
    var getListener = {
        onOperationComplete: function(aCalendar, aStatus, aOperationType, aId, aDetail)
        {
            saveEventsToFile(itemArray, aCalendar.name);
        },
        onGetResult: function(aCalendar, aStatus, aItemType, aDetail, aCount, aItems)
        {
            for each (item in aItems) {
                itemArray.push(item);   
            }
        }
    };

    function getItemsFromCal(aCal) {
        aCal.getItems(Components.interfaces.calICalendar.ITEM_FILTER_ALL_ITEMS,
                      0, null, null, getListener);
    }

    if (!aCalendar) {
        var count = new Object();
        var calendars = getCalendarManager().getCalendars(count);

        if (count.value == 1) {
            // There's only one calendar, so it's silly to ask what calendar
            // the user wants to import into.
            getItemsFromCal(calendars[0]);
        } else {
            // Ask what calendar to import into
            var args = new Object();
            args.onOk = getItemsFromCal;
            args.promptText = getCalStringBundle().GetStringFromName("exportPrompt");
            openDialog("chrome://calendar/content/chooseCalendarDialog.xul", 
                       "_blank", "chrome,titlebar,modal,resizable", args);
        }
    } else {
        getItemsFromCal(aCalendar);
    }
}

function getCalStringBundle()
{
    var strBundleService = 
        Components.classes["@mozilla.org/intl/stringbundle;1"]
                  .getService(Components.interfaces.nsIStringBundleService);
    return strBundleService.createBundle("chrome://calendar/locale/calendar.properties");
}

function showError(aMsg)
{
    /*
    var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                  .getService(Components.interfaces.nsIPromptService);
    promptService.alert(null,
                        getCalStringBundle().GetStringFromName('errorTitle'),
                        aMsg);
    */
  var msg = gApp.getText("CalendarImportFailedMsg");
  celtxBugAlert(msg, Components.stack.caller, aMsg); 
}


// calendar-views.js overrides

var calendarViewController = {
    QueryInterface: function(aIID) {
        if (!aIID.equals(Components.interfaces.calICalendarViewController) &&
            !aIID.equals(Components.interfaces.nsISupports)) {
            throw Components.results.NS_ERROR_NO_INTERFACE;
        }

        return this;
    },

    createNewEvent: function (aCalendar, aStartTime, aEndTime) {
        // XXX If we're adding an item from the view, let's make sure that
        // XXX the calendar in question is visible!
        // XXX unify these
        aCalendar = gController.mCalendar;

        if (!aCalendar) {
            dump("--- calendarViewController.createNewEvent: No calendar\n");
            if ("ltnSelectedCalendar" in window) {
                dump("--- getting ltnSelectedCalendar\n");
                aCalendar = ltnSelectedCalendar();
            } else {
                dump("--- getting getSelectedCalendarOrNull\n");
                aCalendar = getSelectedCalendarOrNull();
            }
        }

        // if we're given both times, skip the dialog
        if (aStartTime && aEndTime && !aStartTime.isDate && !aEndTime.isDate) {
            var event = createEvent();
            event.startDate = aStartTime;
            event.endDate = aEndTime;
            var sbs = Components.classes["@mozilla.org/intl/stringbundle;1"]
                                .getService(Components.interfaces.nsIStringBundleService);
            var props = sbs.createBundle("chrome://calendar/locale/calendar.properties");
            event.title = props.GetStringFromName("newEvent");
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
                date = currentView().selectedDay.clone();
                date.isDate = false;
            }
            createEventWithDialog(aCalendar, date, null);
        }
    },

    modifyOccurrence: function (aOccurrence, aNewStartTime, aNewEndTime) {
        // prompt for choice between occurrence and master for recurrent items
        var itemToEdit = getOccurrenceOrParent(aOccurrence);
        if (!itemToEdit) {
            return;  // user cancelled
        }
        // if modifying this item directly (e.g. just dragged to new time),
        // then do so; otherwise pop up the dialog
        if (aNewStartTime && aNewEndTime) {
            var instance = itemToEdit.clone();

            // if we're about to modify the parentItem, we need to account
            // for the possibility that the item passed as argument was
            // some other occurrence, but the user said she would like to
            // modify all ocurrences instead.  In that case, we need to figure
            // out how much the occurrence moved, and move the occurrence by
            // that amount.
            if (instance.parentItem.hasSameIds(instance)) {

                // Figure out how much the start has moved, and adjust 
                // aNewStartTime so that the parent moves the same amuount.
                var instanceStart = instance.startDate || instance.entryDate;
                var occStart = aOccurrence.startDate || aOccurrence.entryDate;
                var startDiff = instanceStart.subtractDate(occStart);
                aNewStartTime = aNewStartTime.clone();
                aNewStartTime.addDuration(startDiff);

                // Now do the same for end
                var instanceEnd = instance.endDate || instance.dueDate;
                var occEnd = aOccurrence.endDate || aOccurrence.dueDate;
                var endDiff = instanceEnd.subtractDate(occEnd);
                aNewEndTime = aNewEndTime.clone();
                aNewEndTime.addDuration(endDiff);
            }
            // Yay for variable names that make this next line look silly
            if (instance instanceof Components.interfaces.calIEvent) {
                instance.startDate = aNewStartTime;
                instance.endDate = aNewEndTime;
            } else {
                instance.entryDate = aNewStartTime;
                instance.dueDate = aNewEndTime;
            }
            doTransaction('modify', instance, instance.calendar, itemToEdit, null);
        } else {
            modifyEventWithDialog(itemToEdit);
        }
    },

    deleteOccurrence: function (aOccurrence) {
        var itemToDelete = getOccurrenceOrParent(aOccurrence);
        if (!itemToDelete) {
            return;
        }
        if (!itemToDelete.parentItem.hasSameIds(itemToDelete)) {
            var event = itemToDelete.parentItem.clone();
            event.recurrenceInfo.removeOccurrenceAt(itemToDelete.recurrenceId);
            doTransaction('modify', event, event.calendar, itemToDelete.parentItem, null);
        } else {
            doTransaction('delete', itemToDelete, itemToDelete.calendar, null, null);
        }
    }
};

function switchToView(aViewType) {
    var viewDeck = getViewDeck();
    var selectedDay;
    var currentSelection = [];
    try {
        selectedDay = viewDeck.selectedPanel.selectedDay;
        currentSelection = viewDeck.selectedPanel.getSelectedItems({});
    } catch(ex) {
        // This dies if no view has even been chosen this session, but that's
        // ok because we'll just use now() below.
    } 

    if (!selectedDay)
        selectedDay = now();

    // Anyone wanting to plug in a view needs to follow this naming scheme
    var view = document.getElementById(aViewType+"-view");
    viewDeck.selectedPanel = view;

    var compositeCal = getCompositeCalendar();
    if (view.displayCalendar != compositeCal) {
        view.displayCalendar = compositeCal;
        view.timezone = calendarDefaultTimezone();
        view.controller = calendarViewController;
    }

    view.goToDay(selectedDay);
    view.setSelectedItems(currentSelection.length, currentSelection);
}

function moveView(aNumber) {
    getViewDeck().selectedPanel.moveView(aNumber);
}

// Helper function to get the view deck in a neutral way, regardless of whether
// we're in Sunbird or Lightning.
function getViewDeck() {
    var sbDeck = document.getElementById("view-deck");
    var ltnDeck = document.getElementById("calendar-view-box");
    return sbDeck || ltnDeck;
}

function currentView() {
    return getViewDeck().selectedPanel;
}

/** Creates a timer that will fire after midnight.  Pass in a function as 
 * aRefreshCallback that should be called at that time.
 */
function scheduleMidnightUpdate(aRefreshCallback) {
    var jsNow = new Date();
    var tomorrow = new Date(jsNow.getFullYear(), jsNow.getMonth(), jsNow.getDate() + 1);
    var msUntilTomorrow = tomorrow.getTime() - jsNow.getTime();

    // Is an nsITimer/callback extreme overkill here? Yes, but it's necessary to
    // workaround bug 291386.  If we don't, we stand a decent chance of getting
    // stuck in an infinite loop.
    var udCallback = {
        notify: function(timer) {
            aRefreshCallback();
        }
    };

    var timer = Components.classes["@mozilla.org/timer;1"]
                          .createInstance(Components.interfaces.nsITimer);
    timer.initWithCallback(udCallback, msUntilTomorrow, timer.TYPE_ONE_SHOT);
}

// Returns the actual style sheet object with the specified path.  Callers are
// responsible for any caching they may want to do.
function getStyleSheet(aStyleSheetPath) {
    for each (var sheet in document.styleSheets) {
        if (sheet.href == aStyleSheetPath) {
            return sheet;
        }
    }
}

// Updates the style rules for a particular object.  If the object is a
// category (and hence doesn't have a uri), we set the border color.  If
// it's a calendar, we set the background color
function updateStyleSheetForObject(aObject, aSheet) {
    var selectorPrefix, name, ruleUpdaterFunc;
    if (aObject.uri) {
        // This is a calendar, so we're going to set the background color
        name = aObject.uri.spec;
        selectorPrefix = "item-calendar=";
        ruleUpdaterFunc = function calendarRuleFunc(aRule, aIndex) {
            var color = aObject.getPropery('color');
            if (!color) {
                color = "#A8C2E1";
            }
            aRule.style.backgroundColor = color;
            aRule.style.color = getContrastingTextColor(color);
        };
    } else {
        // This is a category, where we set the border.  Also note that we 
        // use the ~= selector, since there could be multiple categories
        name = aObject.replace(' ','_');
        selectorPrefix = "item-category~=";
        ruleUpdaterFunc = function categoryRuleFunc(aRule, aIndex) {
            var color = getPrefSafe("calendar.category.color."+aObject, null);
            if (color) {
                aRule.style.border = color + " solid 2px";
            } else {
                aSheet.deleteRule(aIndex);
            }
        };
    }

    var selector = '.calendar-item[' + selectorPrefix + '"' + name + '"]';

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

/** 
 *  Sets the selected day in the minimonth to the currently selected day
 *  in the embedded view.
 */
function observeViewDaySelect(event) {
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

    getMinimonth().selectDate(jsDate, jsMainDate);
    currentView().focus();
}

/** Provides a neutral way to get the minimonth, regardless of whether we're in
 * Sunbird or Lightning.
 */
function getMinimonth() {
    /*
    var sbMinimonth = document.getElementById("lefthandcalendar");
    return sbMinimonth || document.getElementById("ltnMinimonth");
    */
    return gWindow.ltnMinimonth;
}

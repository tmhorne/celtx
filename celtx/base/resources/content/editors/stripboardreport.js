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

function StripboardPrinter (controller, ds) {
  this.controller = controller;
  this.ds = ds;
}


StripboardPrinter.prototype = {
  QueryInterface: function (aIID) {
    if (aIID.equals(Components.interfaces.nsISupports) ||
        aIID.equals(Components.interfaces.calIPrintFormatter))
      return this;
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },


  get name () {
    var sbsvc = Components.classes["@mozilla.org/intl/stringbundle;1"]
      .getService(Components.interfaces.nsIStringBundleService);
    var bundle = sbsvc.createBundle("chrome://celtx/locale/celtx.properties");
    return bundle.getString("OneLineSchedule");
  },


  formatDay: function (aDate, aShootDay, aItems) {
    var df = Components.classes["@mozilla.org/calendar/datetime-formatter;1"]
      .getService(Components.interfaces.calIDateTimeFormatter);

    var rdfsvc = getRDFService();
    var descarc = rdfsvc.GetResource(Cx.NS_DC + "description");
    var intextarc = rdfsvc.GetResource(Cx.NS_CX + "intext");
    var daynightarc = rdfsvc.GetResource(Cx.NS_CX + "daynight");
    var settingarc = rdfsvc.GetResource(Cx.NS_CX + "setting");
    var ordarc = rdfsvc.GetResource(Cx.NS_CX + "ordinal");
    var eighthsarc = rdfsvc.GetResource(Cx.NS_CX + "eighths");
    var castres = rdfsvc.GetResource(Cx.NS_CX + "Cast");
    var castidarc = rdfsvc.GetResource(Cx.NS_CX + "scheduleID");

    var nodes = [];

    var daystr = null;
    var datestr = df.formatDateShort(aDate);
    if (aShootDay == 0)
      daystr = gApp.getText("DayOff") + " - " + datestr;
    else if (aShootDay < 0)
      daystr = datestr;
    else
      daystr = gApp.getText("DayHeaderWithDate", [ aShootDay, datestr ]);

    var dayrow = <tr class="day">
      <td colspan="6" style="border-top: 1px solid white;">
        <center><b>{daystr}</b></center>
      </td>
    </tr>;
    nodes.push(dayrow);

    var nbsp = "\u00A0";

    for (var i = 0; i < aItems.length; ++i) {
      var item = aItems[i];
      var sceneuri = item.getProperty("X-CELTX-SCENE");
      if (! sceneuri) {
        var title = item.title.toUpperCase();
        var desc = item.getProperty("DESCRIPTION");
        if (! desc)
          desc = nbsp;
        if (item.hasProperty("X-CELTX-MOVING")) {
          var row = <tr>
            <td>{nbsp}</td>
            <td>{nbsp}</td>
            <td>{title}<br/>{desc}</td>
            <td>{nbsp}</td>
            <td>{nbsp}</td>
            <td>{nbsp}</td>
          </tr>;
          nodes.push(row);
        }
        continue;
      }

      var sceneres = rdfsvc.GetResource(sceneuri);
      var scenenum = getRDFString(this.ds, sceneres, ordarc);
      if (! scenenum)
        scenenum = nbsp;
      var intext = getRDFString(this.ds, sceneres, intextarc);
      if (! intext)
        intext = nbsp;
      var setting = getRDFString(this.ds, sceneres, settingarc);
      if (! setting)
        setting = nbsp;
      var desc = getRDFString(this.ds, sceneres, descarc);
      if (! desc)
        desc = nbsp;
      var daynight = getRDFString(this.ds, sceneres, daynightarc);
      if (! daynight)
        daynight = nbsp;
      var eighths = getRDFString(this.ds, sceneres, eighthsarc);
      if (! eighths)
        eighths = nbsp;

      var castIDs = [];
      var scene = new Scene(this.ds, sceneres);
      var castseq = scene._getDeptSequence(castres);
      if (castseq) {
        for (var j = 0; j < castseq.length; ++j) {
          var cast = castseq.get(j).QueryInterface(
            Components.interfaces.nsIRDFResource);
          var castid = getRDFString(this.ds, cast, castidarc);
          if (castid)
            castIDs.push(castid);
        }
      }
      var caststr = castIDs.join(", ");
      if (! caststr)
        caststr = nbsp;

      var itemrow = null;
      if (desc) {
        itemrow = <tr>
          <td>{scenenum}</td>
          <td>{intext}</td>
          <td>{setting}<br/>{desc}</td>
          <td>{daynight}</td>
          <td>{eighths}</td>
          <td>{caststr}</td>
        </tr>;
      }
      else {
        itemrow = <tr>
          <td>{scenenum}</td>
          <td>{intext}</td>
          <td>{setting}</td>
          <td>{daynight}</td>
          <td>{eighths}</td>
          <td>{caststr}</td>
        </tr>;
      }

      nodes.push(itemrow);
    }

    return nodes;
  },


  formatToHtml: function (aStream, aStart, aEnd, aCount, aItems, aTitle) {
    var html = <html>
      <head>
        <title>{aTitle}</title>
        <meta http-equiv="Content-Type" content="text/html;charset=UTF-8"/>
        <style type="text/css"/>
      </head>
      <body>
        <div class="header" style="border-bottom: 3px solid black; position: relative;">
          <img class="watermark" src="chrome://celtx/skin/celtxwithtext.png"/>
          <div style="position: absolute; bottom: 4px;">{aTitle}</div>
          <br style="clear: both;"/>
        </div>
      </body>
    </html>;
    html.head.style = "html, body, div, span, applet, object, iframe,\n"
      + "h1, h2, h3, h4, h5, h6, p, blockquote, pre,\n"
      + "a, abbr, acronym, address, big, cite, code,\n"
      + "del, dfn, em, font, img, ins, kbd, q, s, samp,\n"
      + "small, strike, strong, sub, sup, tt, var,\n"
      + "dl, dt, dd, ol, ul, li,\n"
      + "fieldset, form, label, legend\n"
      + "table, caption, tbody, tfoot, thead, tr, th, td {\n"
      + "  margin: 0px; padding: 0px; border: 0px; outline: 0px;\n"
      + "  font-weight: inherit; font-style: inherit; font-size: 100%;\n"
      + "  font-family: inherit; vertical-align: baseline;\n}\n"
      + ":focus { outline: 0px; }\n"
      + "body { line-height: 1; color: black; margin: 15px; }\n"
      + "ol, ul { list-style: none; }\n"
      + "table { border-collapse: separate; border-spacing: 0px; }\n"
      + "caption, th, td { text-align: left; font-weight: normal; }\n"
      + "blockquote:before, blockquote:after, q:before, q:after {\n"
      + "  content: \"\";\n}\n"
      + "blockquote, q { quotes: \"\" \"\"; }\n"
      + "body { font-family: helvetica, arial; font-size: 10pt; }\n"
      + ".header { font-size: 12pt; font-weight: bold; }\n"
      + "table { width: 95%; font-size: 10pt; }\n"
      + "th { font-weight: bold; }\n"
      + "td, th { padding: 5px 10px; }\n"
      + "td { border-top: 1px solid black; }\n"
      + "tr.day { color: white; background-color: black; }\n"
      + ".watermark { float: right; }\n";

    if (aStart && aEnd && aStart.compare(aEnd) <= 0) {
      var table = <table>
        <tr>
          <th>{gApp.getText("Scene")}</th>
          <th>{gApp.getText("IntExtHeader")}</th>
          <th>{gApp.getText("SceneDescription")}</th>
          <th>{gApp.getText("DayNightHeader")}</th>
          <th>{gApp.getText("Eighths")}</th>
          <th>{gApp.getText("Cast")}</th>
        </tr>
      </table>;
      html.body.appendChild(table);

      var IEvent = Components.interfaces.calIEvent;
      var filteredItems = aItems.filter(
        function (item) { return item instanceof IEvent });

      function compareItems (a, b) {
        if (! (a instanceof IEvent && b instanceof IEvent))
          return 1;
        var diff = a.startDate.compare(b.startDate);
        return diff != 0 ? diff : a.endDate.compare(b.endDate);
      }
      var sortedList = filteredItems.sort(compareItems);

      var oneday = Components.classes["@mozilla.org/calendar/duration;1"]
        .createInstance(Components.interfaces.calIDuration);
      oneday.days = 1;

      var curday = aStart.clone();
      var nextday = curday.clone();
      nextday.addDuration(oneday);

      var itemindex = 0;
      while (curday.compare(aEnd) <= 0) {
        // Gather all items for this day
        var dayitems = [];
        while (itemindex < sortedList.length &&
               sortedList[itemindex].startDate.compare(curday) >= 0 &&
               sortedList[itemindex].startDate.compare(nextday) < 0) {
          dayitems.push(sortedList[itemindex++]);
        }

        var daynum = this.controller.getShootDayNumber(curday);
        var nodes = this.formatDay(curday, daynum, dayitems);
        for (var i = 0; i < nodes.length; ++i)
          table.appendChild(nodes[i]);

        curday.addDuration(oneday);
        nextday.addDuration(oneday);
      }
    }
    else if (aStart && aEnd) {
      var title = gApp.getText("ReportShootDaysWrongOrderTitle");
      var msg = gApp.getText("ReportShootDaysWrongOrderMsg");
      var editlabel = gApp.getText("EditDates");
      var div = <div style="font-size: 12pt; text-align: center;">
        <br/>
        <br/>
        <p><b>{title}</b></p>
        <p>{msg}</p>
        <br/>
        <br/>
        <button id="editbutton"
                type="button">{editlabel}</button>
      </div>;
      html.body.appendChild(div);
    }
    else {
      var title = gApp.getText("ReportShootDaysNeedToBeSetTitle");
      var msg = gApp.getText("ReportShootDaysNeedToBeSetMsg");
      var editlabel = gApp.getText("EditDates");
      var div = <div style="font-size: 12pt; text-align: center;">
        <br/>
        <br/>
        <p><b>{title}</b></p>
        <p>{msg}</p>
        <br/>
        <br/>
        <button id="editbutton"
                type="button">{editlabel}</button>
      </div>;
      html.body.appendChild(div);
    }

    // Stream out the resulting HTML
    var convStream = Components.classes[
      "@mozilla.org/intl/converter-output-stream;1"]
      .getService(Components.interfaces.nsIConverterOutputStream);
    convStream.init(aStream, 'UTF-8', 0, 0x0000);
    convStream.writeString(html.toXMLString());
  }
};

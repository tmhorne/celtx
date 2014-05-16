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

function ShootDayReport (controller, ds) {
  this.controller = controller;
  this.ds = ds;
  var rdfsvc = getRDFService();
  this.schemads = rdfsvc.GetDataSourceBlocking(Cx.SCHEMA_URL);
  var sortres = rdfsvc.GetResource(Cx.SCHEMA_URL + "#markupsortorder");
  this.sortorder = new RDFSeq(this.schemads, sortres);
}


ShootDayReport.prototype = {
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
      + "body { line-height: 1; color: black; background: white; }\n"
      + "ol, ul { list-style: none; }\n"
      + "table { border-collapse: separate; border-spacing: 0px; width: 100%; "
      +         "font-size: 0.8em; margin-top: 5px; }\n"
      + "caption, th, td { text-align: left; font-weight: normal; }\n"
      + "blockquote:before, blockquote:after, q:before, q:after {\n"
      + "  content: \"\";\n}\n"
      + "blockquote, q { quotes: \"\" \"\"; }\n"
      + "body { font-family: helvetica, arial; margin: 15px; }\n"
      + ".header { font-size: 12pt; font-weight: bold; }\n"
      + ".shootDay { border-bottom: 1px solid black; padding: 10px; }\n"
      + "h1 { font-size: 1.5em; font-weight: bold; padding-bottom: 5px; }\n"
      + "td { padding: 5px 0px; width: 200px; }\n"
      + ".date { float: right; }\n"
      + ".reportTitle { float: left; }\n"
      + ".watermark { float: right; }\n"
      + ".inverted { background-color: black; color: white; }\n"
      + ".inverted td {  padding: 0.5em; }\n"
      + ".inverted input { background-color: black; color: white; font-weight: bold; }\n";

    var df = Components.classes["@mozilla.org/calendar/datetime-formatter;1"]
      .getService(Components.interfaces.calIDateTimeFormatter);
    var curdatestr = df.formatDateLong(today());

    if (aStart && aEnd && aStart.compare(aEnd) <= 0) {
      var IEvent = Components.interfaces.calIEvent;
      var filteredItems = aItems.filter(function (item) {
        return (item instanceof IEvent) && (item.hasProperty("X-CELTX-SCENE")
          || item.hasProperty("X-CELTX-MOVING"));
      });

      function compareItems (a, b) {
        if (! (a instanceof IEvent && b instanceof IEvent))
          return 1;
        var diff = a.startDate.compare(b.startDate);
        return diff != 0 ? diff : a.endDate.compare(b.endDate);
      }
      var sortedList = filteredItems.sort(compareItems);

      var curday = aStart.clone();
      var nextday = curday.clone();
      var cursor = 0;
      var oneday = Components.classes["@mozilla.org/calendar/duration;1"]
        .createInstance(Components.interfaces.calIDuration);
      oneday.days = 1;
      nextday.addDuration(oneday);
      while (curday.compare(aEnd) <= 0) {
        var scenes = [];

        while (cursor < sortedList.length &&
               curday.compare(sortedList[cursor].startDate) > 0)
          ++cursor;

        while (cursor < sortedList.length &&
               sortedList[cursor].startDate.compare(curday) >= 0 &&
               sortedList[cursor].startDate.compare(nextday) < 0) {
          var sceneuri = sortedList[cursor].getProperty("X-CELTX-SCENE");
          if (sceneuri)
            scenes.push(sceneuri)
          else {
            var title = sortedList[cursor].title.toUpperCase();
            var desc = sortedList[cursor].getProperty("DESCRIPTION");
            if (! desc)
              desc = "";
            scenes.push("moving\n" + title + "\n" + desc);
          }
          ++cursor;
        }
        var shootdiv = this.createShootDiv(
          this.controller.getShootDayNumber(curday),
          df.formatDateLong(curday), scenes);
        html.body.appendChild(shootdiv);
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
  },


  createShootDiv: function (aDayNum, aDateStr, aScenes) {
    var shootstr = null;
    if (aDayNum > 0)
      shootstr = gApp.getText("DayHeaderWithDate", [ aDayNum, aDateStr ]);
    else if (aDayNum == 0)
      shootstr = gApp.getText("DayOff") + " - " + aDateStr;
    else
      shootstr =  aDateStr;

    var div = <div class="shootDay">
      <p>{shootstr}</p>
    </div>;

    for (var i = 0; i < aScenes.length; ++i) {
      div.appendChild(this.createSceneDiv(aScenes[i]));
    }

    return div;
  },


  createSceneDiv: function (aScene) {
    var depts = {};
    var rdfsvc = getRDFService();
    var IRes = Components.interfaces.nsIRDFResource;
    var deptarc = rdfsvc.GetResource(Cx.NS_CX + "department");
    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
    var descarc = rdfsvc.GetResource(Cx.NS_DC + "description");
    var labelarc = rdfsvc.GetResource(Cx.NS_RDFS + "label");
    var ordarc = rdfsvc.GetResource(Cx.NS_CX + "ordinal");
    var locationarc = rdfsvc.GetResource(Cx.NS_CX + "location");
    var eighthsarc = rdfsvc.GetResource(Cx.NS_CX + "eighths");

    var nbsp = "\u00A0";

    if (aScene.match(/^moving/)) {
      var movingparts = aScene.split("\n");
      movingparts.shift();
      var title = movingparts.shift();
      var desc = movingparts.join("\n");
      if (! desc || desc.length == 0)
        desc = nbsp;
      var div = <div>
        <table>
          <col width="100%"/>
          <tr class="inverted">
            <td>
              <b>{title}</b>
            </td>
          </tr>
          <tr>
            <td>{desc}</td>
          </tr>
        </table>
      </div>;

      return div;
    }

    var sceneres = rdfsvc.GetResource(aScene);

    var ord = getRDFString(this.ds, sceneres, ordarc);
    if (ord)
      ord += ". ";
    var title = ord + getRDFString(this.ds, sceneres, titlearc);
    if (! title)
      title = nbsp;
    var location = getRDFString(this.ds, sceneres, locationarc);
    if (location)
      location = gApp.getText("Location") + ": " + location;
    else
      location = nbsp;
    var eighths = getRDFString(this.ds, sceneres, eighthsarc);
    if (! eighths)
      eighths = nbsp;
    var desc = getRDFString(this.ds, sceneres, descarc);
    if (! desc)
      desc = nbsp;

    var scene = new Scene(this.ds, sceneres);
    var depts = {};
    var deptlists = scene.members.toArray();
    for (var i = 0; i < deptlists.length; ++i) {
      var deptlist = deptlists[i].QueryInterface(IRes);
      var deptres = this.ds.GetTarget(deptlist, deptarc, true);
      deptres = deptres.QueryInterface(IRes);
      // Don't include Crew or Location
      if (deptres.Value == Cx.NS_CX + "Crew" ||
          deptres.Value == Cx.NS_CX + "Location")
        continue;
      depts[deptres.Value] = (new RDFSeq(this.ds, deptlist)).toArray();
    }

    var div = <div/>;
    var scenetable = <table>
      <col width="50%"/>
      <col width="10%"/>
      <col width="40%"/>
      <tr class="inverted">
        <td>
          <b>{title}</b>
        </td>
        <td><b>{eighths}</b></td>
        <td><b>{location}</b></td>
      </tr>
      <tr>
        <td style="padding: 2px;" colspan="3">{desc}</td>
      </tr>
    </table>;
    div.appendChild(scenetable);

    if (deptlists.length == 0)
      return div;

    var insetdiv = <div style="margin-left: 2em;"/>
    var bdtable = <table/>;

    var row = null;
    var cellcount = 0;
    for (var i = 0; i < this.sortorder.length; ++i) {
      var deptres = this.sortorder.get(i).QueryInterface(IRes);
      if (! (deptres.Value in depts))
        continue;

      if (cellcount++ % 3 == 0) {
        row = <tr/>;
        bdtable.appendChild(row);
      }
      var deptname = getRDFString(this.schemads, deptres, labelarc);
      var items = depts[deptres.Value];
      var count = items.length;
      var cell = <td><b>{deptname} ({count})</b></td>;
      row.appendChild(cell);
      var list = <ul/>
      cell.appendChild(list);
      for (var j = 0; j < items.length; ++j) {
        var itemres = items[j].QueryInterface(IRes);
        var itemname = getRDFString(this.ds, itemres, titlearc);
        list.appendChild(<li>{itemname}</li>);
      }
    }

    // Don't append an empty table
    if (row) {
      insetdiv.appendChild(bdtable);
      div.appendChild(insetdiv);
    }

    return div;
  }
};

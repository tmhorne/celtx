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

function CallSheetReport (controller, ds) {
  this.controller = controller;
  this.ds = ds;

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
  this.savedFields = {
    calltime: getRDFString(ds, this.controller.docres, calltimearc),
    company: getRDFString(ds, this.controller.docres, companyarc),
    team: getRDFString(ds, this.controller.docres, teamarc),
    contact: getRDFString(ds, this.controller.docres, contactarc),
    notes: getRDFString(ds, this.controller.docres, notesarc),
    weather: getRDFString(ds, this.controller.docres, weatherarc)
  };
}


CallSheetReport.prototype = {
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
    return bundle.getString("CallSheet");
  },


  formatHeader: function (aDate, aList) {
    var df = Components.classes["@mozilla.org/calendar/datetime-formatter;1"]
      .getService(Components.interfaces.calIDateTimeFormatter);

    this.daynum = this.controller.getShootDayNumber(aDate);
    var datestr = df.formatDateShort(aDate);
    if (this.daynum > 0)
      datestr = gApp.getText("DayHeaderWithDate", [ this.daynum, datestr ]);
    else if (this.daynum == 0)
      datestr = gApp.getText("DayOff") + " - " + datestr;

    var rdfsvc = getRDFService();
    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
    var locationtype = rdfsvc.GetResource(Cx.NS_CX + "Location");

    var scenes = {};
    var locations = [];
    for (var i = 0; i < aList.length; ++i) {
      var sceneuri = aList[i].getProperty("X-CELTX-SCENE");
      if (! sceneuri) continue;
      if (sceneuri in scenes) continue;
      scenes[sceneuri] = 1;
      var sceneres = rdfsvc.GetResource(sceneuri);
      var scene = new Scene(this.ds, sceneres);
      var deptseq = scene._getDeptSequence(locationtype);
      if (! deptseq || deptseq.length == 0) continue;
      var deptres = deptseq.get(0).QueryInterface(
        Components.interfaces.nsIRDFResource);
      var location = getRDFString(this.ds, deptres, titlearc);
      if (location)
        locations.push(location);
    }
    locations = locations.join("\n");

    var headertable = <table>
      <colgroup span="3" width="33%"/>
      <tr>
        <td colspan="2">
          <span class="header inverted" style="text-transform: uppercase;">
          {gApp.getText("CrewCall") + gApp.getText("Colon")}
          <input type="text" id="crewCall" class="crewCall"
                 value={this.savedFields.calltime}/>
          </span>
        </td>
        <td name="proDate" style="text-align: right;">
          <div class="header inverted">{datestr}</div>
        </td>
      </tr>
      <tr class="noprint">
        <td>{gApp.getText("ProductionCompany") + gApp.getText("Colon")}</td>
        <td>{gApp.getText("ProductionTeam") + gApp.getText("Colon")}</td>
        <td>{gApp.getText("ContactInformation") + gApp.getText("Colon")}</td>
      </tr>
      <tr>
        <td>
          <textarea id="proCompany" rows="7">
            {this.savedFields.company}
          </textarea></td>
        <td>
          <textarea id="proTeam" rows="7">
            {this.savedFields.team}
          </textarea></td>
        <td>
          <textarea id="conInfo" rows="7">
            {this.savedFields.contact}
          </textarea>
        </td>
      </tr>
      <tr class="noprint">
        <td colspan="3">{gApp.getText("ProductionInformation")}</td>
      </tr>
      <tr>
        <td colspan="3">
          <textarea id="proLocation">
            {this.savedFields.notes}
          </textarea>
        </td>
      </tr>
    </table>;

    var locationtable = <table>
      <col width="0*"/>
      <col width="*"/>
      <tr>
        <td>{gApp.getText("Locations") + gApp.getText("Colon")}</td>
        <td>
          {locations}
        </td>
      </tr>
      <tr>
        <td>{gApp.getText("Weather")}</td>
        <td>
          <input id="weather" type="text" name="weather"
                 value={this.savedFields.weather}/>
        </td>
      </tr>
    </table>;

    var headerdiv = <div/>
    headerdiv.appendChild(headertable);
    headerdiv.appendChild(locationtable);

    return headerdiv;
  },


  formatStripboard: function (aStart, aEnd, aItems) {
    var table = <table class="stripboardtable">
      <tr>
        <th>{gApp.getText("Scene")}</th>
        <th>{gApp.getText("IntExtHeader")}</th>
        <th>{gApp.getText("SceneDescription")}</th>
        <th>{gApp.getText("DayNightHeader")}</th>
        <th>{gApp.getText("Eighths")}</th>
        <th>{gApp.getText("Cast")}</th>
      </tr>
    </table>;

    var stripboardReport = new StripboardPrinter(this.controller, this.ds);
    var daynum = this.controller.getShootDayNumber(aStart);
    var nodes = stripboardReport.formatDay(aStart, daynum, aItems);
    // Skip the day heading row, since it's already given in a call sheet
    for (var i = 1; i < nodes.length; ++i)
      table.appendChild(nodes[i]);

    return table;
  },


  formatBreakdown: function (aStart, aEnd, aList) {
    var cast = [];
    var castdetails = {};
    var extras = [];
    var extradetails = {};
    var crew = [];
    var crewdetails = {};

    // TODO: i18n of time format (e.g., 14:00 vs 14h00)
    function timeStr(aDate) {
      var hour = String(aDate.hour);
      if (hour.length == 1)
        hour = "0" + hour;
      var minute = String(aDate.minute);
      if (minute.length == 1)
        minute = "0" + minute;
      return hour + ":" + minute;
    };

    var rdfsvc = getRDFService();
    var casttype = rdfsvc.GetResource(Cx.NS_CX + "Cast");
    var extratype = rdfsvc.GetResource(Cx.NS_CX + "Extras");
    var crewtype = rdfsvc.GetResource(Cx.NS_CX + "Crew");
    var ordarc = rdfsvc.GetResource(Cx.NS_CX + "ordinal");
    var titlearc = rdfsvc.GetResource(Cx.NS_DC + "title");
    var castidarc = rdfsvc.GetResource(Cx.NS_CX + "scheduleID");
    var actorarc = rdfsvc.GetResource(Cx.NS_CX + "actor");

    for (var i = 0; i < aList.length; ++i) {
      var sceneuri = aList[i].getProperty("X-CELTX-SCENE");
      if (! sceneuri)
        continue;

      var sceneres = rdfsvc.GetResource(sceneuri);
      var time = timeStr(aList[i].startDate);
      var scenenum = getRDFString(this.ds, sceneres, ordarc);

      var scene = new Scene(this.ds, sceneres);

      var castseq = scene._getDeptSequence(casttype);
      castseq = castseq ? castseq.toArray() : [];
      for (var j = 0; j < castseq.length; ++j) {
        var castres = castseq[j].QueryInterface(
          Components.interfaces.nsIRDFResource);
        if (! castdetails[castres.Value]) {
          castdetails[castres.Value] = {
            id: getRDFString(this.ds, castres, castidarc),
            title: getRDFString(this.ds, castres, titlearc),
            scenes: []
          };
          var actor = this.ds.GetTarget(castres, actorarc, true);
          if (actor) {
            actor = actor.QueryInterface(Components.interfaces.nsIRDFResource);
            var actorname = getRDFString(this.ds, actor, titlearc);
            castdetails[castres.Value].actor = actorname;
          }
          else
            castdetails[castres.Value].actor = "";

          cast.push(castres.Value);
        }
        castdetails[castres.Value].scenes.push(scenenum + " (" + time + ")");
      }

      var extraseq = scene._getDeptSequence(extratype);
      extraseq = extraseq ? extraseq.toArray() : [];
      for (var j = 0; j < extraseq.length; ++j) {
        var extrares = extraseq[j].QueryInterface(
          Components.interfaces.nsIRDFResource);
        if (! extradetails[extrares.Value]) {
          extradetails[extrares.Value] = {
            title: getRDFString(this.ds, extrares, titlearc),
            scenes: []
          };
          extras.push(extrares.Value);
        }
        extradetails[extrares.Value].scenes.push(scenenum + " (" + time + ")");
      }

      var crewseq = scene._getDeptSequence(crewtype);
      crewseq = crewseq ? crewseq.toArray() : [];
      for (var j = 0; j < crewseq.length; ++j) {
        var crewres = crewseq[j].QueryInterface(
          Components.interfaces.nsIRDFResource);
        if (! crewdetails[crewres.Value]) {
          crewdetails[crewres.Value] = {
            title: getRDFString(this.ds, crewres, titlearc),
            scenes: []
          };
          crew.push(crewres.Value);
        }
        crewdetails[crewres.Value].scenes.push(scenenum + " (" + time + ")");
      }
    }

    var casttable = <table>
      <col width="10%"/>
      <col width="30%"/>
      <col width="30%"/>
      <col width="30%"/>
    </table>;
    casttable.appendChild(
      <tr>
        <th>{gApp.getText("ID")}</th>
        <th>{gApp.getText("Character")}</th>
        <th>{gApp.getText("Cast")}</th>
        <th>{gApp.getText("ScenesAndTimes")}</th>
      </tr>
    );
    for (var i = 0; i < cast.length; ++i) {
      var details = castdetails[cast[i]];
      var scenetimes = details.scenes.join(", ");
      var castrow = <tr>
        <td class="tight">
          {details.id}
        </td>
        <td class="tight">
          {details.title}
        </td>
        <td class="tight">
          {details.actor}
        </td>
        <td class="tight">
          {scenetimes}
        </td>
      </tr>;
      casttable.appendChild(castrow);
    }

    var extratable = <table>
      <col width="70%"/>
      <col width="30%"/>
    </table>;
    extratable.appendChild(
      <tr>
        <th>{gApp.getText("Extras")}</th>
        <th>{gApp.getText("ScenesAndTimes")}</th>
      </tr>
    );
    for (var i = 0; i < extras.length; ++i) {
      var details = extradetails[extras[i]];
      var scenetimes = details.scenes.join(", ");
      var extrarow = <tr>
        <td class="tight">
          {details.title}
        </td>
        <td class="tight">
          {scenetimes}
        </td>
      </tr>;
      extratable.appendChild(extrarow);
    }

    var crewtable = <table>
      <col width="70%"/>
      <col width="30%"/>
    </table>;
    crewtable.appendChild(
      <tr>
        <th>{gApp.getText("Crew")}</th>
        <th>{gApp.getText("ScenesAndTimes")}</th>
      </tr>
    );
    for (var i = 0; i < crew.length; ++i) {
      var details = crewdetails[crew[i]];
      var scenetimes = details.scenes.join(", ");
      var crewrow = <tr>
        <td class="tight">
          {details.title}
        </td>
        <td class="tight">
          {scenetimes}
        </td>
      </tr>;
      crewtable.appendChild(crewrow);
    }

    return [ casttable, extratable, crewtable ];
  },


  formatToHtml: function (aStream, aStart, aEnd, aCount, aItems, aTitle) {
    var html = <html>
      <head>
        <title>{aTitle}</title>
        <meta http-equiv="Content-Type" content="text/html;charset=UTF-8"/>
        <style type="text/css"/>
      </head>
      <body>
        <div class="header" style="border-bottom: 3px solid black; position: relative; font-size: 12pt;">
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
      + "table { border-collapse: separate; border-spacing: 0px; "
      +         "width: 100%; font-size: 9pt; margin-bottom: 2em; }\n"
      + "caption, th, td { text-align: left; font-weight: normal; }\n"
      + "blockquote:before, blockquote:after, q:before, q:after {\n"
      + "  content: \"\";\n}\n"
      + "blockquote, q { quotes: \"\" \"\"; }\n"
      + "body { font-family: helvetica, arial; font-size: 9pt; padding: 15px; }\n"
      + "th { font-weight: bold; border-bottom: 1px solid black; }\n"
      + "td, th { padding: 5px 10px; }\n"
      + "td.tight { padding: 1px 10px; }\n"
      + ".header { font-size: 11pt; font-weight: bold; }\n"
      + ".stripboardtable td { border-bottom: 1px solid black; }\n"
      + "tr.day { color: white; background-color: black; }\n"
      + "tr.day td { border-bottom: 1px solid white; }\n"
      + "input, textarea { width: 100%; font-family: helvetica, arial; font-size: 9pt; }\n"
      + "textarea { height: 8em; }\n"
      + "#proLocation { height: 5em; }\n"
      + ".crewCall { width: 6em; font-size: 11pt; }\n"
      + ".noprint,.screenhint { color: grey; font-weight: bold; }\n"
      + ".watermark { float: right; }\n"
      + ".inverted { background-color: black; color: white; padding: 0.5em; }\n"
      + ".inverted input { background-color: black; color: white; font-weight: bold; }\n"
      + "@media print {\n"
      + "  .screengray { color: black; }\n"
      + "  .noprint { display: none; }\n"
      + "  textarea, input { border: 0px !important; }\n"
      + "  textarea { height: 9em; }\n"
      + "}\n";

    if (aStart && aEnd && aStart.compare(aEnd) <= 0) {
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

      var headertable = this.formatHeader(aStart, sortedList);
      html.body.appendChild(headertable);

      var table = this.formatStripboard(aStart, aEnd, sortedList);
      html.body.appendChild(table);

      var bdtables = this.formatBreakdown(aStart, aEnd, sortedList);
      for (var i = 0; i < bdtables.length; ++i)
        html.body.appendChild(bdtables[i]);
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

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

function SceneSummaryReport (ds, source) {
  this.ds = ds;
  this.source = source;
}


SceneSummaryReport.prototype = {
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
    return bundle.getString("SceneSummary");
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
      + "body { line-height: 1; color: black; background: white; }\n"
      + "ol, ul { list-style: none; }\n"
      + "table { border-collapse: separate; border-spacing: 0px; }\n"
      + "caption, th, td { text-align: left; font-weight: normal; }\n"
      + "blockquote:before, blockquote:after, q:before, q:after {\n"
      + "  content: \"\";\n}\n"
      + "blockquote, q { quotes: \"\" \"\"; }\n"
      + "body { font-family: helvetica, arial; font-size: 10pt; }\n"
      + ".header { font-size: 12pt; font-weight: bold; padding: 5px; }\n"
      + "table { margin: 15px; width: 95%; font-size: 10pt; }\n"
      + "th { font-weight: bold; }\n"
      + "td, th { padding: 5px 10px; }\n"
      + "td { border-top: 1px solid black; }\n"
      + "tr.day { color: white; background-color: black; }\n"
      + ".watermark { float: right; }\n";

    var unscheduled = [];
    var scheduled = [];
    var completed = [];

    var rdfsvc = getRDFService();
    var scheduledarc = rdfsvc.GetResource(Cx.NS_CX + "scheduled");
    var completedarc = rdfsvc.GetResource(Cx.NS_CX + "completed");
    var ordarc = rdfsvc.GetResource(Cx.NS_CX + "ordinal");
    var intextarc = rdfsvc.GetResource(Cx.NS_CX + "intext");
    var settingarc = rdfsvc.GetResource(Cx.NS_CX + "setting");
    var daynightarc = rdfsvc.GetResource(Cx.NS_CX + "daynight");
    var descarc = rdfsvc.GetResource(Cx.NS_DC + "description");
    var scenesarc = rdfsvc.GetResource(Cx.NS_CX + "scenes");

    var scenes = this.ds.GetTarget(this.source, scenesarc, true);
    scenes = scenes.QueryInterface(Components.interfaces.nsIRDFResource);
    scenes = (new RDFSeq(this.ds, scenes)).toArray();

    var schedds = gScheduleController.ds;
    for (var i = 0; i < scenes.length; ++i) {
      var sceneres = scenes[i].QueryInterface(
        Components.interfaces.nsIRDFResource);
      if (getRDFString(schedds, sceneres, scheduledarc) == "true") {
        if (getRDFString(schedds, sceneres, completedarc) == "true")
          completed.push(sceneres);
        else
          scheduled.push(sceneres);
      }
      else
        unscheduled.push(sceneres);
    }

    var table = <table/>;
    html.body.appendChild(table);

    var lists = [
      { name: gApp.getText("UnscheduledScenes"), list: unscheduled },
      { name: gApp.getText("ScheduledScenes"), list: scheduled },
      { name: gApp.getText("CompletedScenes"), list: completed }
    ];

    for (var i = 0; i < lists.length; ++i) {
      var listname = lists[i].name;
      table.appendChild(
      <tr class="day">
        <th colspan="4" style="border-top: 1px solid white;">{listname}</th>
      </tr>
      );
      for (var j = 0; j < lists[i].list.length; ++j) {
        var sceneres = lists[i].list[j];
        var ord = getRDFString(this.ds, sceneres, ordarc);
        var intext = getRDFString(this.ds, sceneres, intextarc) || " "; // nbsp
        var setting = getRDFString(this.ds, sceneres, settingarc);
        var daynight = getRDFString(this.ds, sceneres, daynightarc) || " ";
        var desc = getRDFString(this.ds, sceneres, descarc);

        table.appendChild(
          <tr>
            <td>
              {ord}
            </td>
            <td>
              {intext}
            </td>
            <td>
              {setting} <br/>
              {desc}
            </td>
            <td>
              {daynight}
            </td>
          </tr>
        );
      }
    }

    // Stream out the resulting HTML
    var convStream = Components.classes[
      "@mozilla.org/intl/converter-output-stream;1"]
      .getService(Components.interfaces.nsIConverterOutputStream);
    convStream.init(aStream, 'UTF-8', 0, 0x0000);
    convStream.writeString(html.toXMLString());
  }
};

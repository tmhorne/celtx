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

function ProjectManager () {
  var rdfsrc = currentProfileDir();
  rdfsrc.append(Cx.PROJECTS_FILE);
  if (! rdfsrc.exists())
    this.initProjectsFile(rdfsrc);

  this.rdf = getRDFService();
  this.ds = this.rdf.GetDataSourceBlocking(fileToFileURL(rdfsrc));
  this.model = new RDFModel(this.ds);
}

ProjectManager.prototype = {
  initProjectsFile: function (file) {
    // Does it need to be anything besides blank?
    var ds = getInMemoryDataSource();
    serializeDataSourceToFile(ds, file);
  },


  flush: function () {
    this.ds.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource)
      .Flush();
  },


  get recentProjects () {
    var rdfsvc = getRDFService();
    var recent = rdfsvc.GetResource(Cx.NS_CX + "recentProjects");
    recent = new RDFSeq(this.ds, recent);
    return recent;
  },


  /**
   * Clean up any items in the recent projects list that were created using
   * one of the two old formats (project IDs and file URIs). The correct way
   * to store references to files is with the persistentDescriptor field on
   * nsILocalFile instances.
   * @private
   */
  fixupRecentProjects: function () {
    var IRes = Components.interfaces.nsIRDFResource;
    var ILit = Components.interfaces.nsIRDFLiteral;
    var ios = getIOService();
    var rdfsvc = getRDFService();
    var patharc = rdfsvc.GetResource(Cx.NS_CX + "localpath");
    var projects = this.recentProjects;
    for (var i = 0; i < projects.length; ++i) {
      var project = projects.get(i);
      // Look for project resources
      if (project instanceof IRes) {
        project = project.QueryInterface(IRes);
        var path = getRDFString(this.ds, project, patharc);
        if (! path) {
          projects.remove(i--);
          continue;
        }
        try {
          var file = fileURLToFile(path);
          file = file.QueryInterface(Components.interfaces.nsILocalFile);
          projects.remove(i);
          projects.insert(rdfsvc.GetLiteral(file.persistentDescriptor), i);
        }
        catch (ex) {
          dump("*** fixupRecentProjects: " + ex + "\n");
        }
      }
      // See if it's a file URI instead of a persistent descriptor
      else {
        project = project.QueryInterface(ILit).Value;
        try {
          var scheme = null;
          try {
            // extractScheme will throw if project isn't a uri
            scheme = ios.extractScheme(project);
          }
          catch (ex) {}
          if (scheme && scheme == "file") {
            var file = fileURLToFile(project);
            file = file.QueryInterface(Components.interfaces.nsILocalFile);
            projects.remove(i);
            projects.insert(rdfsvc.GetLiteral(file.persistentDescriptor), i);
          }
        }
        catch (ex) {
          dump("*** fixupRecentProjects: " + ex + "\n");
        }
      }
    }
  },


  // Also removes duplicates
  purgeMissingRecentProjects: function () {
    var ILit = Components.interfaces.nsIRDFLiteral;
    var projects = this.recentProjects;
    var seendescs = {};
    var seenpaths = {};
    for (var i = 0; i < projects.length; ++i) {
      try {
        var filedesc = projects.get(i).QueryInterface(ILit).Value;
        if (filedesc in seendescs) {
          projects.remove(i--);
          continue;
        }
        seendescs[filedesc] = 1;
        var file = Components.classes["@mozilla.org/file/local;1"]
          .createInstance(Components.interfaces.nsILocalFile);
        file.persistentDescriptor = filedesc;
        if (! file.exists())
          throw "Invalid file";
        if (file.path in seenpaths) {
          projects.remove(i--);
        }
        else
          seenpaths[file.path] = 1;
      }
      catch (ex) {
        projects.remove(i--);
      }
    }
  },


  createProject: function (projDir, title) {
    var id = Cx.PROJECTS_URL + "/" + generateID();
    var projRes = this.rdf.GetResource(id);
    var rdfTypeArc = this.rdf.GetResource(Cx.NS_RDF + "type");
    var projType = this.rdf.GetResource(Cx.NS_CX + "Project");
    var versionArc = this.rdf.GetResource(Cx.NS_CX + "fileVersion");
    var titleArc = this.rdf.GetResource(Cx.NS_DC + "title");
    var versionLit = this.rdf.GetLiteral(Cx.FILE_VERSION);
    this.ds.Assert(projRes, rdfTypeArc, projType, true);
    this.ds.Assert(projRes, versionArc, versionLit, true);
    if (title)
      this.ds.Assert(projRes, titleArc, this.rdf.GetLiteral(title), true);
    this.flush();

    if (! projDir) {
      projDir = getTempDir();
      projDir.append("temp_project");
      projDir.createUnique(1, 0700);
    }
    var projFile = projDir.clone();
    projFile.append(Cx.PROJECT_FILE);

    var projds = getInMemoryDataSource();
    projds.Assert(projRes, rdfTypeArc, projType, true);
    projds.Assert(projRes, versionArc, versionLit, true);
    if (title)
      projds.Assert(projRes, titleArc, this.rdf.GetLiteral(title), true);
    serializeDataSourceToFile(projds, projFile);

    return fileToFileURL(projFile);
  },


  getSaveLocation: function (project) {
    var pathArc = this.rdf.GetResource(Cx.NS_CX + "localpath");
    var path = this.ds.GetTarget(project.res, pathArc, true);
    if (! path)
      return null;
    return path.QueryInterface(Components.interfaces.nsIRDFLiteral).Value;
  }
};

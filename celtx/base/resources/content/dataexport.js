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

// APIs for handling data export from Celtx.


/**
 * Wrapper for grabbing data from a project datasource.
 */
function ProjectData (ds) {
  this.rdf = getRDFService();
  this.ds = ds;
  this.schemads = this.rdf.GetDataSourceBlocking(Cx.SCHEMA_URL);
  this.doctypeds = this.rdf.GetDataSourceBlocking(Cx.DOCTYPES_URL);

  var preffile = currentProfileDir();
  preffile.append(Cx.PREFS_FILE);
  this.prefds = this.rdf.GetDataSourceBlocking(fileToFileURL(preffile));
}


ProjectData.prototype = {
  /**
   * Returns an array of objects with id and title attributes,
   * representing scripts in the project.
   */
  getScripts: function () {
    var IRes = Components.interfaces.nsIRDFResource;
    var titlearc = this.rdf.GetResource(Cx.NS_DC + "title");
    var doctypearc = this.rdf.GetResource(Cx.NS_CX + "doctype");
    var scripttypes = [
      this.rdf.GetResource(Cx.NS_CX + "ScriptDocument"),
      this.rdf.GetResource(Cx.NS_CX + "TheatreDocument"),
      this.rdf.GetResource(Cx.NS_CX + "AVDocument"),
      this.rdf.GetResource(Cx.NS_CX + "RadioDocument"),
      this.rdf.GetResource(Cx.NS_CX + "ComicDocument")
    ];
    var scripts = [];
    for (var i = 0; i < scripttypes.length; ++i) {
      var scriptrsrcs = this.ds.GetSources(doctypearc, scripttypes[i], true);
      while (scriptrsrcs.hasMoreElements()) {
        var script = scriptrsrcs.getNext().QueryInterface(IRes);
        var title = getRDFString(this.ds, script, titlearc);
        scripts.push(CreateDataItem(script.Value, title, "script"));
      }
    }
    return scripts;
  },


  /**
   * Returns an array of objects with id and title attributes,
   * representing scenes in a given script.
   * @param{string} scripturi  the URI of a script
   */
  getScenesForScript: function (scripturi) {
    var IRes = Components.interfaces.nsIRDFResource;
    var script = this.rdf.GetResource(scripturi);
    var scenesarc = this.rdf.GetResource(Cx.NS_CX + "scenes");
    var sceneseq = this.ds.GetTarget(script, scenesarc, true);
    if (! (sceneseq && sceneseq instanceof IRes))
      return [];

    sceneseq = sceneseq.QueryInterface(IRes);
    sceneseq = new RDFSeq(this.ds, sceneseq);
    var scenes = sceneseq.toArray();
    var titlearc = this.rdf.GetResource(Cx.NS_DC + "title");
    for (var i = 0; i < scenes.length; ++i) {
      var sceneres = scenes[i].QueryInterface(IRes);
      var title = getRDFString(this.ds, sceneres, titlearc);
      scenes[i] = CreateDataItem(sceneres.Value, title, "scene");
    }
    return scenes;
  },


  /**
   * Returns an array of objects with id and title attributes,
   * representing characters in the project.
   */
  getCharacters: function () {
    var IRes = Components.interfaces.nsIRDFResource;
    var chartype = this.rdf.GetResource(Cx.NS_CX + "Cast");
    var rdftypearc = this.rdf.GetResource(Cx.NS_RDF + "type");
    var titlearc = this.rdf.GetResource(Cx.NS_DC + "title");
    var chars = this.rdf.GetSources(rdftypearc, chartype, true);
    var charlist = [];
    while (chars.hasMoreElements()) {
      var charres = chars.getNext().QueryInterface(IRes);
      var title = getRDFString(this.ds, charres, titlearc);
      charlist.push(CreateDataItem(charres.Value, title, "character"));
    }
    return charlist;
  },


  /**
   * Returns an array of objects with id and title attributes,
   * representing all breakdown items in the project.
   */
  getAllItems: function () {
    var IRes = Components.interfaces.nsIRDFResource;
    var rdftypearc = this.rdf.GetResource(Cx.NS_RDF + "type");
    var titlearc = this.rdf.GetResource(Cx.NS_DC + "title");
    var prefseq = this.rdf.GetResource(Cx.NS_CX + "Prefs/Categories");
    prefseq = new RDFSeq(this.prefds, prefseq);
    var categories = prefseq.toArray();
    var items = [];
    var kNSPrefixLength = Cx.NS_CX.length;
    for (var i = 0; i < categories.length; ++i) {
      var category = categories[i].QueryInterface(IRes);
      var catitems = this.ds.GetSources(rdftypearc, category, true);
      while (catitems.hasMoreElements()) {
        var catitem = catitems.getNext().QueryInterface(IRes);
        var title = getRDFString(this.ds, catitem, titlearc);
        var item = CreateDataItem(catitem.Value, title, "item");
        // If the type is, e.g., http://celtx.com/NS/v1/Actor,
        // just store "Actor" as the category
        item.data.push( {
          key: "category",
          value: category.Value.substring(kNSPrefixLength)
        } );
        items.push(item);
      }
    }
    return items;
  }
};


/**
 * Creates an object according to the node format for the JIT visualization
 * toolkit, with no children and an optional data key for type.
 * @param id{string} a unique identifier for the object
 * @param name{string} the human readable name of the object
 * @param type{string} the type of the object (script, scene, item) [optional]
 * @type JITNode
 * @return an object formatted for use with JIT
 */
function CreateDataItem (id, name, type) {
  var item = {
    id: id,
    name: name,
    data: type ? [ { key: "type", value: type } ] : [],
    children: []
  };
  return item;
}


var gLastCloneMap = {};


/**
 * Clones an object formatted for use with JIT, excluding its children.
 * @param item{JITNode} an item to clone
 * @type JITNode
 * @return a copy of the object, excluding its children
 */
function CloneDataItem (item) {
  var realid = item.realid || item.id;
  var newid = realid;
  if (newid in gLastCloneMap)
    newid = gLastCloneMap[newid];
  var matches = newid.match(/(.*_)(\d+)$/);
  if (matches)
    newid = matches[1] + (Number(matches[2]) + 1);
  else
    newid += "_0";
  gLastCloneMap[realid] = newid;
  var newitem = {
    id: newid,
    realid: realid,
    name: item.name,
    data: [],
    children: []
  };
  for (var i = 0; i < item.data.length; ++i)
    newitem.data.push( { key: item.data[i].key, value: item.data[i].value } );
  return newitem;
}


/**
 * This class is used to convert the information in a project's RDF datasource
 * into a format that can be used with the JIT visualization toolkit.
 */
function ProjectGraph () {
  this.rdf = getRDFService();
  this.scripts = [];
  this.scenes = [];
  this.chars = [];
  this.items = [];
  // If this.adjacencyMatrix[uri1][uri2] == 1, then uri1 is related to uri2,
  // and this.adjacencyMatrix[uri2][uri1] == 1 also (the relation is symmetric)
  this.adjacencyMatrix = {};
}


ProjectGraph.prototype = {
  /**
   * Initialize the project graph from a project's RDF datasource.
   * @param ds{nsIRDFDatasource} a project datasource
   */
  init: function (ds) {
    this.ds = ds;
    this.projdata = new ProjectData(ds);
    this.scripts = this.projdata.getScripts();
    /*
    for (var i = 0; i < this.scripts.length; ++i)
      this.scenes.concat(this.projdata.getScenesForScript(this.scripts[i].id));
    */

    this.items = this.projdata.getAllItems();
    // Separately cache a list of all items that are characters
    for (var i = 0; i < this.items.length; ++i) {
      for (var j = 0; j < this.items[i].data.length; ++j) {
        if (this.items[i].data[j].key == "category") {
          if (this.items[i].data[j].value == "Cast")
            this.chars.push(this.items[i]);
          break;
        }
      }
    }

    this.buildAdjacencyMatrix();
  },


  /**
   * Determines whether two nodes are related by containment. This could be
   * called a "contains or is contained by" relationship, and it is treated
   * as symmetric and transitive. This means if A contains B and B contains C,
   * then A and C are related by "contains or is contained by" and are
   * considered adjacent.
   * @param node1{JITNode} a node to test
   * @param node2{JITNode} another node to test
   * @type boolean
   * @return true if node1 is related to node2
   */
  isAdjacent: function (node1, node2) {
    var id1 = node1.realid || node1.id;
    var id2 = node2.realid || node2.id;
    if (id1 == "project" || id2 == "project")
      return true;
    if (! (id1 in this.adjacencyMatrix))
      return false;
    if (! (id2 in this.adjacencyMatrix))
      return false;
    if (! (id2 in this.adjacencyMatrix[id1]))
      return false;
    return this.adjacencyMatrix[id1][id2] == 1;
  },


  /**
   * Constructs an adjacency matrix for easily building object graphs
   * suitable for JIT.
   * @private
   */
  buildAdjacencyMatrix: function () {
    // Pre-initialize the item entries, in case some items exist in the
    // project but not in any scenes.
    for (var i = 0; i < this.items.length; ++i)
      this.adjacencyMatrix[this.items[i].id] = {};

    // Recursively build up the matrix, script by script
    for (var i = 0; i < this.scripts.length; ++i)
      this.buildAdjacencyMatrixForScript(this.scripts[i].id);
  },


  /**
   * Used to build up an adjacency matrix recursively.
   * @private
   */
  buildAdjacencyMatrixForScript: function (scripturi) {
    // This is just a shortcut to avoid long lines of code
    var scriptvector = {};
    this.adjacencyMatrix[scripturi] = scriptvector;

    var scenes = this.projdata.getScenesForScript(scripturi);
    this.scenes = this.scenes.concat(scenes);
    for (var i = 0; i < scenes.length; ++i) {
      var sceneuri = scenes[i].id;

      // Keep it symmetric
      scriptvector[sceneuri] = 1;
      if (! (sceneuri in this.adjacencyMatrix))
        this.adjacencyMatrix[sceneuri] = {};
      this.adjacencyMatrix[sceneuri][scripturi] = 1;

      // Recursively build up the matrix, scene by scene
      this.buildAdjacencyMatrixForScene(scripturi, sceneuri);
    }
  },


  /**
   * Used to build up an adjacency matrix recursively.
   * @private
   */
  buildAdjacencyMatrixForScene: function (scripturi, sceneuri) {
    var IRes = Components.interfaces.nsIRDFResource;

    // These are just shortcuts to avoid long lines of code
    var scriptvector = this.adjacencyMatrix[scripturi];
    var scenevector = this.adjacencyMatrix[sceneuri];

    var scene = new Scene(this.ds, this.rdf.GetResource(sceneuri));
    var itemseqs = scene.members.toArray();
    for (var i = 0; i < itemseqs.length; ++i) {
      var itemseq = new RDFSeq(this.ds, itemseqs[i].QueryInterface(IRes));
      var items = itemseq.toArray();
      for (var j = 0; j < items.length; ++j) {
        var itemuri = items[j].QueryInterface(IRes).Value;
        if (! (itemuri in this.adjacencyMatrix)) {
          dump("*** stale reference to " + itemuri + " in a scene markup?\n");
          continue;
        }
        var itemvector = this.adjacencyMatrix[itemuri];

        // Keep it symmetric and transitive: If an item is in a scene, and a
        // scene is in the script, then the item and the scene are mutually
        // adjacent, as are the item and the script. By this time, the script
        // and the scene are already marked as mutually adjacent.
        scriptvector[itemuri] = 1;
        itemvector[scripturi] = 1;

        scenevector[itemuri] = 1;
        itemvector[sceneuri] = 1;
      }
    }
  },


  /**
   * Extract subtrees for scripts, scenes, characters, and items and append
   * them to the node. Subtrees can be omitted by including their names as
   * properties on the |visited| argument. This is used to avoid recursion.
   * @param node{JITNode} a node for which to build subtrees
   * @param visited an object whose properties specify which subtrees to skip
   */
  extractSubtrees: function (node, visited) {
    function cloneVisited () {
      var nextVisited = {};
      if (visited) {
        for (var key in visited)
          nextVisited[key] = 1;
      }
      return nextVisited;
    }
    if (! ("characters" in visited))
      this.extractCharactersSubtree(node, cloneVisited());
    if (! ("items" in visited))
      this.extractItemsSubtree(node, cloneVisited());
    if (! ("scenes" in visited))
      this.extractScenesSubtree(node, cloneVisited());
    if (! ("scripts" in visited))
      this.extractScriptsSubtree(node, cloneVisited());
  },


  /**
   * Extract the scripts subtree and append it to the node. This method will
   * call #extractSubtrees with |visited.scripts| set to 1.
   * @param node{JITNode} a node for which to build the script subtree
   * @param visited an object whose properties specify which subtrees to skip
   */
  extractScriptsSubtree: function (node, visited) {
    if (! visited) visited = {};
    visited.scripts = 1;

    var scriptsroot = CreateDataItem("scripts", "Scripts", "scriptroot");
    // Make sure we have unique IDs
    scriptsroot = CloneDataItem(scriptsroot);
    node.children.push(scriptsroot);
    for (var i = 0; i < this.scripts.length; ++i) {
      if (! this.isAdjacent(node, this.scripts[i]))
        continue;

      var clonedscript = CloneDataItem(this.scripts[i]);
      scriptsroot.children.push(clonedscript);
      this.extractSubtrees(clonedscript, visited);
    }
  },


  /**
   * Extract the characters subtree and append it to the node. This method will
   * call #extractSubtrees with |visited.characters| set to 1.
   * @param node{JITNode} a node for which to build the characters subtree
   * @param visited an object whose properties specify which subtrees to skip
   */
  extractCharactersSubtree: function (node, visited) {
    if (! visited) visited = {};
    visited.characters = 1;
    // We don't want to list items under characters
    visited.items = 1;

    var charroot = CreateDataItem("characters", "Characters", "charactersroot");
    // Make sure we have unique IDs
    charroot = CloneDataItem(charroot);
    node.children.push(charroot);
    for (var i = 0; i < this.chars.length; ++i) {
      if (! this.isAdjacent(node, this.chars[i]))
        continue;

      var clonedchar = CloneDataItem(this.chars[i]);
      charroot.children.push(clonedchar);
      this.extractSubtrees(clonedchar, visited);
    }
  },


  /**
   * Extract the items subtree and append it to the node. This method will
   * call #extractSubtrees with |visited.items| set to 1. The items subtree
   * is broken down by category.
   * @param node{JITNode} a node for which to build the items subtree
   * @param visited an object whose properties specify which subtrees to skip
   */
  extractItemsSubtree: function (node, visited) {
    if (! visited) visited = {};
    // We don't want to list characters under items
    visited.characters = 1;
    visited.items = 1;

    var itemsroot = CreateDataItem("items", "Categories", "itemsroot");
    // Make sure we have unique IDs
    itemsroot = CloneDataItem(itemsroot);
    node.children.push(itemsroot);
    var catroots = {};
    for (var i = 0; i < this.items.length; ++i) {
      if (! this.isAdjacent(node, this.items[i]))
        continue;

      var category = null;
      for (var j = 0; j < this.items[i].data.length; ++j) {
        if (this.items[i].data[j].key == "category") {
          category = this.items[i].data[j].value;
          break;
        }
      }
      if (! category)
        continue;
      if (! (category in catroots)) {
        catroots[category] = CreateDataItem(category, category, "category");
        itemsroot.children.push(catroots[category]);
      }
      var cloneditem = CloneDataItem(this.items[i]);
      catroots[category].children.push(cloneditem);
      this.extractSubtrees(cloneditem, visited);
    }
  },


  /**
   * Extract the scenes subtree and append it to the node. This method will
   * call #extractSubtrees with |visited.scenes| set to 1.
   * @param node{JITNode} a node for which to build the scenes subtree
   * @param visited an object whose properties specify which subtrees to skip
   */
  extractScenesSubtree: function (node, visited) {
    if (! visited) visited = {};
    visited.scenes = 1;

    var scenesroot = CreateDataItem("scenes", "Scenes", "scenesroot");
    // Make sure we have unique IDs
    scenesroot = CloneDataItem(scenesroot);
    node.children.push(scenesroot);
    for (var i = 0; i < this.scenes.length; ++i) {
      if (! this.isAdjacent(node, this.scenes[i]))
        continue;

      var clonedscene = CloneDataItem(this.scenes[i]);
      scenesroot.children.push(clonedscene);
      this.extractSubtrees(clonedscene, visited);
    }
  }
};


/**
 * Extracts the entire tree associated with a project.
 * @param ds{nsIRDFDatasource} the RDF datasource for a project
 * @type JITNode
 * @return a full tree that can be used with the JIT visualization toolkit
 */
function CreateProjectTree (ds) {
  var graph = new ProjectGraph();
  graph.init(ds);
  var projectnode = CreateDataItem("project", "Project", "projectroot");
  var visited = {};
  graph.extractSubtrees(projectnode, visited);
  return projectnode;
}

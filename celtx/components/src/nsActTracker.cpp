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

#include "nsActTracker.h"
#include "CeltxRDFUtils.h"
#include "nsIRDFService.h"
#include "nsIRDFContainerUtils.h"
#include "nsUnicharUtils.h"
#include "prrng.h"
#include "prmem.h"
#include "nsTArray.h"
#include "nsHashSets.h"
#include "nsServiceManagerUtils.h"
#include "nsIDOMHTMLDocument.h"
#include "nsIDOMHTMLParagraphElement.h"
#include "nsIDOMHTMLElement.h"
#include "nsIDOMEventTarget.h"
#include "nsIDOMEvent.h"
#include "nsIDOMXPathEvaluator.h"
#include "nsIDOMXPathResult.h"
#include "nsIPrefService.h"
#include "nsISupportsPrimitives.h"
#include "stdio.h"

class Act_SceneEntry {
public:
  nsString id;
  nsString heading;
  Act_SceneEntry () {}
  Act_SceneEntry (const nsAString& aID, const nsAString& aHeading)
    : id(aID), heading(aHeading) {}
  Act_SceneEntry (const Act_SceneEntry& entry)
    : id(entry.id), heading(entry.heading) {}
  bool operator== (const Act_SceneEntry& entry) {
    return id.Equals(entry.id);
  }
};

class Act_ActEntry {
public:
  nsString id;
  nsString heading;
  nsTArray<Act_SceneEntry> scenes;
  Act_ActEntry () {}
  Act_ActEntry (const nsAString& aID, const nsAString& aHeading)
    : id(aID), heading(aHeading) {}
  Act_ActEntry (const Act_ActEntry& entry)
    : id(entry.id), heading(entry.heading), scenes(entry.scenes) {}
  bool operator== (const Act_ActEntry& entry) {
    return id.Equals(entry.id);
  }
};

NS_IMPL_ISUPPORTS2(nsActTracker, nsISceneTracker, nsITimerCallback)

nsActTracker::nsActTracker ()
: mDocres(nsnull), mDS(nsnull), mEditor(nsnull), mSuppressEvents(PR_FALSE),
  mTimerFullUpdate(PR_FALSE) {
}

nsActTracker::~nsActTracker () {
}

NS_IMETHODIMP nsActTracker::Init (nsIRDFDataSource* ds,
                                    nsIRDFResource* docres,
                                    nsIScriptEditor* editor) {
  NS_ENSURE_ARG_POINTER(ds);
  NS_ENSURE_ARG_POINTER(docres);
  NS_ENSURE_ARG_POINTER(editor);

  mDS = ds;
  mDocres = docres;
  mEditor = editor;
  nsresult rv;

  rv = mEditor->GetContentDocument(getter_AddRefs(mScript));
  if (NS_FAILED(rv))
    return rv;

  mRDFSvc = do_GetService("@mozilla.org/rdf/rdf-service;1");
  nsCOMPtr<nsIRDFContainerUtils> cu = do_GetService(
    "@mozilla.org/rdf/container-utils;1");
  nsCOMPtr<nsIRDFResource> scenesarc;
  mRDFSvc->GetResource(NS_LITERAL_CSTRING("http://celtx.com/NS/v1/scenes"),
    getter_AddRefs(scenesarc));
  nsCOMPtr<nsIRDFResource> actsarc;
  mRDFSvc->GetResource(NS_LITERAL_CSTRING("http://celtx.com/NS/v1/acts"),
    getter_AddRefs(actsarc));

  nsCOMPtr<nsIRDFResource> scenesres;
  nsIRDFNode* scenesnode;
  mDS->GetTarget(mDocres, scenesarc, PR_TRUE, &scenesnode);
  if (scenesnode) {
    scenesres = do_QueryInterface(scenesnode);
    NS_RELEASE(scenesnode);
    if (! scenesres)
      return NS_ERROR_NO_INTERFACE;
  }
  else {
    rv = mRDFSvc->GetAnonymousResource(getter_AddRefs(scenesres));
    if (NS_FAILED(rv))
      return rv;
    mDS->Assert(mDocres, scenesarc, scenesres, PR_TRUE);
  }
  rv = CeltxRDFUtils::GetRDFSeq(mDS, scenesres, getter_AddRefs(mScenes));
  if (NS_FAILED(rv))
    return rv;

  nsCOMPtr<nsIRDFResource> actsres;
  nsIRDFNode* actsnode;
  mDS->GetTarget(mDocres, actsarc, PR_TRUE, &actsnode);
  if (actsnode) {
    actsres = do_QueryInterface(actsnode);
    NS_RELEASE(actsnode);
    if (! actsres)
      return NS_ERROR_NO_INTERFACE;
  }
  else {
    rv = mRDFSvc->GetAnonymousResource(getter_AddRefs(actsres));
    if (NS_FAILED(rv))
      return rv;
    mDS->Assert(mDocres, actsarc, actsres, PR_TRUE);
  }
  rv = CeltxRDFUtils::GetRDFSeq(mDS, actsres, getter_AddRefs(mActs));
  if (NS_FAILED(rv))
    return rv;

  nsCOMPtr<nsIDOMHTMLDocument> hdoc(do_QueryInterface(mScript));
  if (! hdoc)
    return NS_ERROR_INVALID_ARG;

  nsIDOMHTMLElement* body;
  rv = hdoc->GetBody(&body);
  if (NS_FAILED(rv))
    return NS_ERROR_UNEXPECTED;

  nsCOMPtr<nsIDOMEventTarget> target(do_QueryInterface(body));
  target->AddEventListener(NS_LITERAL_STRING("DOMNodeInserted"),
    this, PR_FALSE);
  target->AddEventListener(NS_LITERAL_STRING("DOMNodeRemoved"),
    this, PR_FALSE);
  target->AddEventListener(NS_LITERAL_STRING("DOMCharacterDataModified"),
    this, PR_FALSE);

  return Update();
}

NS_IMETHODIMP nsActTracker::Shutdown () {
  nsCOMPtr<nsIDOMHTMLDocument> hdoc(do_QueryInterface(mScript));
  if (! hdoc)
    return NS_OK;

  nsIDOMHTMLElement* body;
  nsresult rv = hdoc->GetBody(&body);
  if (NS_FAILED(rv))
    return NS_OK;

  nsCOMPtr<nsIDOMEventTarget> target(do_QueryInterface(body));
  target->RemoveEventListener(NS_LITERAL_STRING("DOMNodeInserted"),
    this, PR_FALSE);
  target->RemoveEventListener(NS_LITERAL_STRING("DOMNodeRemoved"),
    this, PR_FALSE);
  target->RemoveEventListener(NS_LITERAL_STRING("DOMCharacterDataModified"),
    this, PR_FALSE);

  return NS_OK;
}

NS_IMETHODIMP
nsActTracker::GetSuppressEvents (PRBool* aSuppressEvents) {
  *aSuppressEvents = mSuppressEvents;
  return NS_OK;
}

NS_IMETHODIMP
nsActTracker::SetSuppressEvents (PRBool aSuppressEvents) {
  mSuppressEvents = aSuppressEvents;
  return NS_OK;
}

NS_IMETHODIMP
nsActTracker::AddObserver (nsISceneTrackerObserver* observer) {
  NS_ENSURE_ARG(observer);
  mObservers.AppendObject(observer);
  return NS_OK;
}

NS_IMETHODIMP
nsActTracker::RemoveObserver (nsISceneTrackerObserver* observer) {
  NS_ENSURE_ARG(observer);
  mObservers.RemoveObject(observer);
  return NS_OK;
}

// nsIDOMEventListener
NS_IMETHODIMP
nsActTracker::HandleEvent (nsIDOMEvent* anEvent) {
  if (mSuppressEvents)
    return NS_OK;

  NS_ENSURE_ARG(anEvent);
  nsString eventType;
  nsresult rv = anEvent->GetType(eventType);
  if (NS_FAILED(rv))
    return rv;

  if (eventType.Equals(NS_LITERAL_STRING("DOMCharacterDataModified"))) {
    HandleCDataEvent(anEvent);
  }
  else if (eventType.Equals(NS_LITERAL_STRING("DOMNodeInserted"))) {
    HandleInsertedEvent(anEvent);
  }
  else if (eventType.Equals(NS_LITERAL_STRING("DOMNodeRemoved"))) {
    HandleRemovedEvent(anEvent);
  }

  return NS_OK;
}

void nsActTracker::HandleCDataEvent (nsIDOMEvent* anEvent) {
  nsCOMPtr<nsIDOMEventTarget> aTarget;
  anEvent->GetTarget(getter_AddRefs(aTarget));
  nsCOMPtr<nsIDOMNode> node(do_QueryInterface(aTarget));
  if (! node)
    return;
  nsCOMPtr<nsIDOMHTMLParagraphElement> para (do_QueryInterface(node));
  nsresult rv;
  while (! para) {
    nsIDOMNode* parent;
    rv = node->GetParentNode(&parent);
    if (NS_FAILED(rv))
      return;
    if (! parent)
      return;
    node = parent;
    NS_RELEASE(parent);
    para = do_QueryInterface(node);
  }

  // Check if it's a non-scene structure element
  nsString className;
  para->GetAttribute(NS_LITERAL_STRING("class"), className);
  nsString nodeID;
  para->GetAttribute(NS_LITERAL_STRING("id"), nodeID);
  if (! (className.Equals(NS_LITERAL_STRING("sceneheading")) ||
         className.Equals(NS_LITERAL_STRING("act")))) {
    nsCOMPtr<nsIDOMElement> scene;
    mEditor->SceneContaining(node, getter_AddRefs(scene));
    if (scene) {
      scene->GetAttribute(NS_LITERAL_STRING("id"), nodeID);
      if (! nodeID.IsEmpty()) {
        nsCOMPtr<nsIRDFResource> sceneres;
        rv = SceneForSceneID(nodeID, getter_AddRefs(sceneres));
        if (NS_SUCCEEDED(rv))
          NotifySceneContentChanged(sceneres);
      }
    }
    return;
  }

  if (mSceneHeaderTimer) {
    mSceneHeaderTimer->Cancel();
    // Invoke the last timer's callback if it's a different scene ID
    if (! (mSceneID.IsEmpty() || nodeID.Equals(mSceneID)))
      SceneHeaderChanged(mSceneID);
  }

  mSceneID.Assign(nodeID);
  mSceneHeaderTimer = do_CreateInstance("@mozilla.org/timer;1");
  mSceneHeaderTimer->InitWithFuncCallback(SceneHeaderChangedFunc, (void *)this,
    1500, nsITimer::TYPE_ONE_SHOT);
}

void nsActTracker::SceneHeaderChangedFunc (nsITimer* timer, void* closure) {
  nsActTracker* tracker = (nsActTracker *) closure;
  tracker->SceneHeaderChanged(tracker->mSceneID);
  tracker->mSceneID.Truncate(0);
}

void nsActTracker::SceneHeaderChanged (const nsAString& nodeID) {
  nsCOMPtr<nsIDOMElement> node;
  nsresult rv = mScript->GetElementById(nodeID, getter_AddRefs(node));
  if (! node)
    return;
  PRBool isScene = PR_TRUE;
  nsCOMPtr<nsIRDFResource> elemres;
  rv = SceneForSceneID(nodeID, getter_AddRefs(elemres));
  if (NS_FAILED(rv) || ! elemres) {
    rv = ActForActID(nodeID, getter_AddRefs(elemres));
    isScene = PR_FALSE;
  }
  if (NS_FAILED(rv) || ! elemres)
    return;
  nsString heading;
  rv = StringifyNode(node, heading);
  if (NS_FAILED(rv))
    return;
  ToUpperCase(heading);
  nsCOMPtr<nsIRDFResource> titlearc;
  mRDFSvc->GetResource(
    NS_LITERAL_CSTRING("http://purl.org/dc/elements/1.1/title"),
    getter_AddRefs(titlearc));
  nsCOMPtr<nsIRDFLiteral> newtitle;
  mRDFSvc->GetLiteral(PromiseFlatString(heading).get(),
    getter_AddRefs(newtitle));
  // mDS->BeginUpdateBatch();
  nsCOMPtr<nsIRDFNode> target;
  rv = mDS->GetTarget(elemres, titlearc, PR_TRUE, getter_AddRefs(target));
  if (target) {
    mDS->Change(elemres, titlearc, target, newtitle);
  }
  else {
    mDS->Assert(elemres, titlearc, newtitle, PR_TRUE);
  }
  // mDS->EndUpdateBatch();
  if (isScene)
    NotifySceneChanged(elemres);
}

void nsActTracker::HandleInsertedEvent (nsIDOMEvent* anEvent) {
  nsCOMPtr<nsIDOMEventTarget> aTarget;
  anEvent->GetTarget(getter_AddRefs(aTarget));
  nsCOMPtr<nsIDOMHTMLParagraphElement> para(do_QueryInterface(aTarget));
  if (! para)
    return;

  nsString className;
  para->GetAttribute(NS_LITERAL_STRING("class"), className);
  if (className.Equals(NS_LITERAL_STRING("act")) ||
      className.Equals(NS_LITERAL_STRING("sceneheading"))) {
    Update();
    return;
  }

  // It wasn't a scene heading, so it must be a change to scene contents
  nsCOMPtr<nsIDOMElement> scene;
  nsCOMPtr<nsIDOMNode> node(do_QueryInterface(aTarget));
  mEditor->SceneContaining(node, getter_AddRefs(scene));
  if (scene) {
    nsString nodeID;
    scene->GetAttribute(NS_LITERAL_STRING("id"), nodeID);
    if (! nodeID.IsEmpty()) {
      nsCOMPtr<nsIRDFResource> sceneres;
      nsresult rv = SceneForSceneID(nodeID, getter_AddRefs(sceneres));
      if (NS_SUCCEEDED(rv))
        NotifySceneContentChanged(sceneres);
    }
  }
}

void nsActTracker::HandleRemovedEvent (nsIDOMEvent* anEvent) {
  nsCOMPtr<nsIDOMEventTarget> aTarget;
  anEvent->GetTarget(getter_AddRefs(aTarget));
  nsCOMPtr<nsIDOMHTMLParagraphElement> para(do_QueryInterface(aTarget));
  if (! para)
    return;

  // We have to react on a timer callback, otherwise the scene will not have
  // removed yet and the update will be premature.
  nsString className;
  para->GetAttribute(NS_LITERAL_STRING("class"), className);
  // Signal a full update for removed scene headings
  if (className.Equals(NS_LITERAL_STRING("sceneheading")))
    mTimerFullUpdate = PR_TRUE;
  else
    mTimerNodes.AppendObject(para);
  // No need to schedule multiple timers, we batch using mTimerNodes
  if (mTimer)
    return;
  mTimer = do_CreateInstance("@mozilla.org/timer;1");
  mTimer->InitWithCallback(this, 100, 0);
}

NS_IMETHODIMP nsActTracker::Notify (nsITimer* aTimer) {
  if (mTimerFullUpdate) {
    Update();
    mTimerFullUpdate = PR_FALSE;
  }
  else {
    for (PRInt32 i = 0; i < mTimerNodes.Count(); ++i)
      HandleRemovedEventFunc(mTimerNodes[i]);
  }
  mTimerNodes.Clear();
  mTimer = nsnull;
  return NS_OK;
}

void nsActTracker::HandleRemovedEventFunc (nsIDOMHTMLParagraphElement* para) {
  nsCOMPtr<nsIDOMElement> scene;
  nsCOMPtr<nsIDOMNode> node(do_QueryInterface(para));
  mEditor->SceneContaining(node, getter_AddRefs(scene));
  if (scene) {
    nsString nodeID;
    scene->GetAttribute(NS_LITERAL_STRING("id"), nodeID);
    if (! nodeID.IsEmpty()) {
      nsCOMPtr<nsIRDFResource> sceneres;
      nsresult rv = SceneForSceneID(nodeID, getter_AddRefs(sceneres));
      if (NS_SUCCEEDED(rv))
        NotifySceneContentChanged(sceneres);
    }
  }
}

NS_IMETHODIMP nsActTracker::Update () {
  nsCOMPtr<nsIDOMXPathEvaluator> xpe = do_CreateInstance(
    "@mozilla.org/dom/xpath-evaluator;1");
  NS_NAMED_LITERAL_STRING(str,
    "/html/body/p[@class='sceneheading' or @class='act']");
  nsCOMPtr<nsIDOMXPathResult> result;
  nsresult rv = xpe->Evaluate(str, mScript, nsnull,
    nsIDOMXPathResult::ORDERED_NODE_SNAPSHOT_TYPE,
    nsnull, getter_AddRefs(result));
  if (NS_FAILED(rv))
    return rv;
  PRUint32 length;
  rv = result->GetSnapshotLength(&length);
  if (NS_FAILED(rv))
    return rv;
  nsStringHashSet seenIDs;
  seenIDs.Init(length);

  PRBool orderModified = PR_FALSE;
  nsTArray<Act_ActEntry> acts;
  // Cache the associated resources, or everything goes screwy when
  // we move scenes around, since they are temporarily removed from
  // the scene list (causing SceneForSceneID to fail).
  nsCOMArray<nsIRDFResource> scenereslist;
  nsCOMArray<nsIRDFResource> actreslist;
  PRInt32 totalActs = 0;
  PRInt32 totalScenes = 0;
  PRInt32 actIndex = -1;

  for (PRUint32 i = 0; i < length; ++i) {
    nsIDOMNode* item;
    rv = result->SnapshotItem(i, &item);
    if (NS_FAILED(rv))
      continue;
    nsCOMPtr<nsIDOMElement> node(do_QueryInterface(item));
    if (! node)
      continue;
    NS_RELEASE(item);

    PRBool hasAttr = PR_FALSE;
    nsString nodeID;
    nsString className;
    node->GetAttribute(NS_LITERAL_STRING("class"), className);
    node->HasAttribute(NS_LITERAL_STRING("id"), &hasAttr);
    if (hasAttr)
      node->GetAttribute(NS_LITERAL_STRING("id"), nodeID);
    if (! hasAttr || nodeID.IsEmpty() || seenIDs.Contains(nodeID)) {
      nsCString genid;
      GenerateID(genid);
      CopyASCIItoUTF16(genid, nodeID);
      node->SetAttribute(NS_LITERAL_STRING("id"), nodeID);
    }
    seenIDs.Put(nodeID);
    nsString heading;
    StringifyNode(node, heading);
    ToUpperCase(heading);

    if (className.Equals(NS_LITERAL_STRING("act"))) {
      ++actIndex;
      ++totalActs;
      acts.AppendElement(Act_ActEntry(nodeID, heading));
      nsCOMPtr<nsIRDFResource> actres;
      ActForActID(nodeID, getter_AddRefs(actres));
      actreslist.AppendObject(actres);
    }
    else {
      ++totalScenes;
      if (actIndex >= 0) {
        acts[actIndex].scenes.AppendElement(Act_SceneEntry(nodeID, heading));
        nsCOMPtr<nsIRDFResource> sceneres;
        SceneForSceneID(nodeID, getter_AddRefs(sceneres));
        scenereslist.AppendObject(sceneres);
      }
    }
  }

  nsCOMPtr<nsIRDFContainerUtils> cu = do_GetService(
    "@mozilla.org/rdf/container-utils;1");
  nsCOMPtr<nsIRDFResource> titlearc;
  nsCOMPtr<nsIRDFResource> ordarc;
  nsCOMPtr<nsIRDFResource> sortordarc;
  nsCOMPtr<nsIRDFResource> sceneidarc;
  nsCOMPtr<nsIRDFResource> actidarc;
  nsCOMPtr<nsIRDFResource> intextarc;
  nsCOMPtr<nsIRDFResource> settingarc;
  nsCOMPtr<nsIRDFResource> daynightarc;
  nsCOMPtr<nsIRDFResource> locationarc;
  mRDFSvc->GetResource(
    NS_LITERAL_CSTRING("http://purl.org/dc/elements/1.1/title"),
    getter_AddRefs(titlearc));
  mRDFSvc->GetResource(
    NS_LITERAL_CSTRING("http://celtx.com/NS/v1/ordinal"),
      getter_AddRefs(ordarc));
  mRDFSvc->GetResource(
    NS_LITERAL_CSTRING("http://celtx.com/NS/v1/sortord"),
      getter_AddRefs(sortordarc));
  mRDFSvc->GetResource(
    NS_LITERAL_CSTRING("http://celtx.com/NS/v1/sceneid"),
      getter_AddRefs(sceneidarc));
  mRDFSvc->GetResource(
    NS_LITERAL_CSTRING("http://celtx.com/NS/v1/actid"),
      getter_AddRefs(actidarc));
  mRDFSvc->GetResource(
    NS_LITERAL_CSTRING("http://celtx.com/NS/v1/intext"),
      getter_AddRefs(intextarc));
  mRDFSvc->GetResource(
    NS_LITERAL_CSTRING("http://celtx.com/NS/v1/setting"),
      getter_AddRefs(settingarc));
  mRDFSvc->GetResource(
    NS_LITERAL_CSTRING("http://celtx.com/NS/v1/daynight"),
    getter_AddRefs(daynightarc));
  mRDFSvc->GetResource(
    NS_LITERAL_CSTRING("http://celtx.com/NS/v1/location"),
    getter_AddRefs(locationarc));

  nsCOMPtr<nsIRDFResource> actsRes;
  nsCOMPtr<nsIRDFResource> scenesRes;
  mActs->GetResource(getter_AddRefs(actsRes));
  mScenes->GetResource(getter_AddRefs(scenesRes));

  // mDS->BeginUpdateBatch();

  PRInt32 masterSceneIndex = 0;

  for (PRUint32 i = 0; i < acts.Length(); ++i) {
    const Act_ActEntry& actEntry = acts[i];

    // Ensure a corresponding resource exists
    nsCOMPtr<nsIRDFResource> actres;
    // rv = ActForActID(actEntry.id, getter_AddRefs(actres));
    rv = NS_OK; actres = actreslist[i];
    if (NS_FAILED(rv) || ! actres) {
      nsCString mintedURI(NS_LITERAL_CSTRING("http://celtx.com/res/"));
      nsCString genid;
      GenerateID(genid);
      mintedURI.Append(genid);
      mRDFSvc->GetResource(mintedURI, getter_AddRefs(actres));
    }

    // Put it into the correct place
    nsCOMPtr<nsIRDFResource> rdfordarc;
    cu->IndexToOrdinalResource(i + 1, getter_AddRefs(rdfordarc));
    nsIRDFNode* curact;
    mDS->GetTarget(actsRes, rdfordarc, PR_TRUE, &curact);
    if (curact) {
      PRBool equal = PR_FALSE;
      curact->EqualsNode(actres, &equal);
      if (! equal) {
        if (! orderModified) {
          orderModified = PR_TRUE;
          mDS->BeginUpdateBatch();
        }
        nsCOMPtr<nsIRDFNode> removed;
        mActs->RemoveElementAt(i + 1, PR_FALSE, getter_AddRefs(removed));
        mActs->InsertElementAt(actres, i + 1, PR_FALSE);
      }
      NS_RELEASE(curact);
    }
    else {
      if (! orderModified) {
        orderModified = PR_TRUE;
        mDS->BeginUpdateBatch();
      }
      mActs->AppendElement(actres);
    }

    // Set its fields
    SetRDFString(mDS, actres, actidarc, actEntry.id);
    SetRDFString(mDS, actres, titlearc, actEntry.heading);
    nsString ordstr;
    ordstr.AppendInt(i + 1);
    SetRDFString(mDS, actres, ordarc, ordstr);
    nsString sortordstr(ordstr);
    while (sortordstr.Length() < 4)
      sortordstr.Insert(PRUnichar('0'), 0);
    SetRDFString(mDS, actres, sortordarc, sortordstr);

    // Update the scenes within it
    nsCOMPtr<nsIRDFContainer> actScenes;
    rv = CeltxRDFUtils::GetRDFSeq(mDS, actres, getter_AddRefs(actScenes));
    if (NS_FAILED(rv))
      return rv;
    for (PRUint32 j = 0; j < actEntry.scenes.Length(); ++j) {
      const Act_SceneEntry& sceneEntry = actEntry.scenes[j];

      // Ensure a corresponding resource exists
      nsCOMPtr<nsIRDFResource> sceneres;
      // rv = SceneForSceneID(sceneEntry.id, getter_AddRefs(sceneres));
      rv = NS_OK; sceneres = scenereslist[masterSceneIndex];
      if (NS_FAILED(rv) || ! sceneres) {
        nsCString mintedURI(NS_LITERAL_CSTRING("http://celtx.com/res/"));
        nsCString genid;
        GenerateID(genid);
        mintedURI.Append(genid);
        mRDFSvc->GetResource(mintedURI, getter_AddRefs(sceneres));
      }

      // Put it into the correct place in the act scene list
      cu->IndexToOrdinalResource(j + 1, getter_AddRefs(rdfordarc));
      nsIRDFNode* curscene;
      mDS->GetTarget(actres, rdfordarc, PR_TRUE, &curscene);
      if (curscene) {
        PRBool equal = PR_FALSE;
        curscene->EqualsNode(sceneres, &equal);
        if (! equal) {
          if (! orderModified) {
            orderModified = PR_TRUE;
            mDS->BeginUpdateBatch();
          }
          nsCOMPtr<nsIRDFNode> removed;
          actScenes->RemoveElementAt(j + 1, PR_FALSE, getter_AddRefs(removed));
          actScenes->InsertElementAt(sceneres, j + 1, PR_FALSE);
        }
        NS_RELEASE(curscene);
      }
      else {
        if (! orderModified) {
          orderModified = PR_TRUE;
          mDS->BeginUpdateBatch();
        }
        actScenes->AppendElement(sceneres);
      }

      // Put it into the correct place in the master scene list
      cu->IndexToOrdinalResource(++masterSceneIndex, getter_AddRefs(rdfordarc));
      mDS->GetTarget(scenesRes, rdfordarc, PR_TRUE, &curscene);
      if (curscene) {
        PRBool equal = PR_FALSE;
        curscene->EqualsNode(sceneres, &equal);
        if (! equal) {
          if (! orderModified) {
            orderModified = PR_TRUE;
            mDS->BeginUpdateBatch();
          }
          nsCOMPtr<nsIRDFNode> removed;
          mScenes->RemoveElementAt(masterSceneIndex, PR_FALSE,
            getter_AddRefs(removed));
          mScenes->InsertElementAt(sceneres, masterSceneIndex, PR_FALSE);
        }
        NS_RELEASE(curscene);
      }
      else {
        if (! orderModified) {
          orderModified = PR_TRUE;
          mDS->BeginUpdateBatch();
        }
        mScenes->AppendElement(sceneres);
      }

      // Set its fields
      SetRDFString(mDS, sceneres, sceneidarc, sceneEntry.id);
      SetRDFString(mDS, sceneres, titlearc, sceneEntry.heading);
      nsString intext;
      nsString setting;
      nsString daynight;
      SplitHeading(sceneEntry.heading, intext, setting, daynight);
      SetRDFString(mDS, sceneres, intextarc, intext);
      SetRDFString(mDS, sceneres, settingarc, setting);
      SetRDFString(mDS, sceneres, daynightarc, daynight);
      nsString location;
      GetRDFString(mDS, sceneres, locationarc, location);
      if (location.IsEmpty())
        SetRDFString(mDS, sceneres, locationarc, NS_LITERAL_STRING(" "));
      nsString sceneordstr(ordstr);
      sceneordstr.Append(PRUnichar('.'));
      sceneordstr.AppendInt(j + 1);
      SetRDFString(mDS, sceneres, ordarc, sceneordstr);
      nsString scenesortordstr;
      scenesortordstr.AppendInt(masterSceneIndex);
      while (scenesortordstr.Length() < 4)
        scenesortordstr.Insert(PRUnichar('0'), 0);
      SetRDFString(mDS, sceneres, sortordarc, scenesortordstr);
    }
    // Truncate any superfluous items within the act scene list
    PRInt32 sceneCount = 0;
    actScenes->GetCount(&sceneCount);
    while (PRUint32(sceneCount) > actEntry.scenes.Length()) {
      if (! orderModified) {
        orderModified = PR_TRUE;
        mDS->BeginUpdateBatch();
      }
      nsCOMPtr<nsIRDFNode> removed;
      actScenes->RemoveElementAt(sceneCount--, PR_TRUE,
        getter_AddRefs(removed));
    }
  }

  // Truncate any superfluous items within the act or master scene lists
  PRInt32 actCount = 0;
  PRInt32 sceneCount = 0;
  mActs->GetCount(&actCount);
  mScenes->GetCount(&sceneCount);
  nsCOMPtr<nsIRDFNode> removed;
  while (actCount > totalActs) {
    if (! orderModified) {
      orderModified = PR_TRUE;
      mDS->BeginUpdateBatch();
    }
    mActs->RemoveElementAt(actCount--, PR_TRUE, getter_AddRefs(removed));
  }
  while (sceneCount > totalScenes) {
    if (! orderModified) {
      orderModified = PR_TRUE;
      mDS->BeginUpdateBatch();
    }
    mScenes->RemoveElementAt(sceneCount--, PR_TRUE, getter_AddRefs(removed));
  }

  if (orderModified) {
    mDS->EndUpdateBatch();
    NotifySceneListChanged();
  }

  return NS_OK;
}

void nsActTracker::NotifySceneListChanged () {
  mObservers.EnumerateForwards(nsActTracker::SceneListChangedFunc, nsnull);
}

PRBool
nsActTracker::SceneListChangedFunc (nsISceneTrackerObserver* aObserver,
                                      void* aData) {
  aObserver->SceneListChanged();
  return PR_TRUE;
}

void nsActTracker::NotifySceneChanged (nsIRDFResource* sceneres) {
  mObservers.EnumerateForwards(nsActTracker::SceneChangedFunc, sceneres);
}

PRBool
nsActTracker::SceneChangedFunc (nsISceneTrackerObserver* aObserver,
                                  void* aData) {
  nsIRDFResource* sceneres = (nsIRDFResource *) aData;
  aObserver->SceneChanged(sceneres);
  return PR_TRUE;
}

void nsActTracker::NotifySceneContentChanged (nsIRDFResource* sceneres) {
  mObservers.EnumerateForwards(nsActTracker::SceneContentChangedFunc,
    sceneres);
}

PRBool
nsActTracker::SceneContentChangedFunc (nsISceneTrackerObserver* aObserver,
                                         void* aData) {
  nsIRDFResource* sceneres = (nsIRDFResource *) aData;
  aObserver->SceneContentChanged(sceneres);
  return PR_TRUE;
}

NS_IMETHODIMP
nsActTracker::ShotForShotID (const nsAString& sceneid,
                               nsIRDFResource** result) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
nsActTracker::SceneForSceneID (const nsAString& sceneid,
                                 nsIRDFResource** result) {
  nsCOMPtr<nsIRDFResource> sceneidarc;
  mRDFSvc->GetResource(NS_LITERAL_CSTRING("http://celtx.com/NS/v1/sceneid"),
    getter_AddRefs(sceneidarc));
  nsCOMPtr<nsIRDFLiteral> idlit;
  mRDFSvc->GetLiteral(PromiseFlatString(sceneid).get(), getter_AddRefs(idlit));
  nsCOMPtr<nsISimpleEnumerator> scenes;
  nsresult rv = mDS->GetSources(sceneidarc, idlit, PR_TRUE,
    getter_AddRefs(scenes));
  if (NS_FAILED(rv))
    return rv;
  nsISupports* tmpcand;
  nsCOMPtr<nsIRDFResource> candidate;
  PRInt32 index;
  PRBool hasMore;
  rv = scenes->HasMoreElements(&hasMore);
  if (NS_FAILED(rv))
    return rv;
  while (hasMore) {
    rv = scenes->GetNext(&tmpcand);
    if (NS_FAILED(rv) || ! tmpcand) {
      *result = nsnull;
      return rv;
    }
    candidate = do_QueryInterface(tmpcand);
    if (candidate) {
      rv = mScenes->IndexOf(candidate, &index);
      if (NS_SUCCEEDED(rv) && index > 0) {
        *result = candidate;
        return NS_OK;
      }
    }
    rv = scenes->HasMoreElements(&hasMore);
    if (NS_FAILED(rv))
      hasMore = PR_FALSE;
  }

  // Even if it's not in our list, it might have been at some time in the
  // recent past, and the user wants to get their metadata back. For example,
  // by changing the format to an untracked one and back again.
  if (candidate)
    *result = candidate;
  else
    *result = nsnull;

  return NS_OK;
}

NS_IMETHODIMP
nsActTracker::ActForActID (const nsAString& actid,
                             nsIRDFResource** result) {
  nsCOMPtr<nsIRDFResource> actidarc;
  mRDFSvc->GetResource(NS_LITERAL_CSTRING("http://celtx.com/NS/v1/actid"),
    getter_AddRefs(actidarc));
  nsCOMPtr<nsIRDFLiteral> idlit;
  mRDFSvc->GetLiteral(PromiseFlatString(actid).get(), getter_AddRefs(idlit));
  nsCOMPtr<nsISimpleEnumerator> acts;
  nsresult rv = mDS->GetSources(actidarc, idlit, PR_TRUE, getter_AddRefs(acts));
  if (NS_FAILED(rv))
    return rv;
  nsISupports* tmpcand;
  nsCOMPtr<nsIRDFResource> candidate;
  PRInt32 index;
  PRBool hasMore = PR_FALSE;
  rv = acts->HasMoreElements(&hasMore);
  if (NS_FAILED(rv))
    return rv;
  while (hasMore) {
    rv = acts->GetNext(&tmpcand);
    if (NS_FAILED(rv) || ! tmpcand) {
      *result = nsnull;
      return rv;
    }
    candidate = do_QueryInterface(tmpcand);
    if (candidate) {
      rv = mActs->IndexOf(candidate, &index);
      if (NS_SUCCEEDED(rv) && index > 0) {
        *result = candidate;
        return NS_OK;
      }
    }
    rv = acts->HasMoreElements(&hasMore);
    if (NS_FAILED(rv))
      hasMore = PR_FALSE;
  }

  // Even if it's not in our list, it might have been at some time in the
  // recent past, and the user wants to get their metadata back. For example,
  // by changing the format to an untracked one and back again.
  if (candidate)
    *result = candidate;
  else
    *result = nsnull;

  return NS_OK;
}

nsresult nsActTracker::StringifyNode (nsIDOMNode* aNode, nsAString& aString) {
  NS_ENSURE_ARG(aNode);
  nsCOMPtr<nsIDOMXPathEvaluator> xpe = do_CreateInstance(
    "@mozilla.org/dom/xpath-evaluator;1");
  nsCOMPtr<nsIDOMXPathResult> result;
  nsresult rv = xpe->Evaluate(NS_LITERAL_STRING("normalize-space(string(.))"),
    aNode, nsnull, nsIDOMXPathResult::STRING_TYPE, nsnull,
    getter_AddRefs(result));
  if (NS_FAILED(rv))
    return rv;
  return result->GetStringValue(aString);
}

nsresult nsActTracker::GenerateID (nsACString& aString) {
  // Ranges: ['0' .. '9'] = [0x30, 0x39], 10 elements
  //         ['A' .. 'Z'] = [0x41, 0x5a], 26 elements
  //         ['a' .. 'z'] = [0x61, 0x7a], 26 elements
  const char map[]
    = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  char genid[9];
  genid[8] = 0;
  PR_GetRandomNoise((void *) genid, 8);
  for (PRInt32 i = 0; i < 8; ++i)
    genid[i] = map[(genid[i] & 0x7F) % 52];
  aString = genid;
  return NS_OK;
}

nsresult nsActTracker::GetRDFString (nsIRDFDataSource* aDS,
                                       nsIRDFResource* aSource,
                                       nsIRDFResource* aProp,
                                       nsAString& aString) {
  NS_ENSURE_ARG(aDS);
  NS_ENSURE_ARG(aSource);
  NS_ENSURE_ARG(aProp);
  nsIRDFNode* tmpnode;
  nsresult rv = aDS->GetTarget(aSource, aProp, PR_TRUE, &tmpnode);
  if (NS_FAILED(rv))
    return rv;

  if (! tmpnode) {
    aString = NS_LITERAL_STRING("");
    return NS_OK;
  }

  nsCOMPtr<nsIRDFLiteral> litval(do_QueryInterface(tmpnode));
  NS_RELEASE(tmpnode);
  if (! litval) {
    aString = NS_LITERAL_STRING("");
    return NS_OK;
  }

  PRUnichar* result;
  rv = litval->GetValue(&result);
  if (NS_SUCCEEDED(rv)) {
    aString = result;
    PR_Free(result);
  }
  return rv;
}

nsresult nsActTracker::SetRDFString (nsIRDFDataSource* aDS,
                                       nsIRDFResource* aSource,
                                       nsIRDFResource* aProp,
                                       const nsAString& aString) {
  NS_ENSURE_ARG(aDS);
  NS_ENSURE_ARG(aSource);
  NS_ENSURE_ARG(aProp);
  nsCOMPtr<nsIRDFNode> tmpnode;
  nsCOMPtr<nsIRDFService> rdfsvc = do_GetService(
    "@mozilla.org/rdf/rdf-service;1");
  nsCOMPtr<nsIRDFLiteral> newlit;
  rdfsvc->GetLiteral(PromiseFlatString(aString).get(), getter_AddRefs(newlit));
  nsresult rv = aDS->GetTarget(aSource, aProp, PR_TRUE,
    getter_AddRefs(tmpnode));
  if (NS_FAILED(rv))
    return rv;
  if (tmpnode) {
    // Check if no change is needed
    nsCOMPtr<nsIRDFLiteral> litval(do_QueryInterface(tmpnode));
    if (litval) {
      PRUnichar* result;
      rv = litval->GetValue(&result);
      if (NS_SUCCEEDED(rv)) {
        if (aString.Equals(result)) {
          PR_Free(result);
          return NS_OK;
        }
        PR_Free(result);
      }
    }
    rv = aDS->Change(aSource, aProp, tmpnode, newlit);
  }
  else if (! aString.IsEmpty()) {
    rv = aDS->Assert(aSource, aProp, newlit, PR_TRUE);
  }
  return rv;
}

nsresult nsActTracker::SplitHeading (const nsAString& aHeading,
                                       nsAString& aIntExt,
                                       nsAString& aSetting,
                                       nsAString& aDayNight) {
  NS_NAMED_LITERAL_STRING(kSeparatorChars, ". -");
  NS_NAMED_LITERAL_STRING(kPrefixChars, ". -0123456789");

  nsCOMPtr<nsIPrefService> ps = do_GetService(
    "@mozilla.org/preferences-service;1");
  nsCOMPtr<nsIPrefBranch> branch;

  nsresult rv = ps->GetBranch("celtx.scripteditor.", getter_AddRefs(branch));
  if (NS_FAILED(rv))
    return rv;
  nsXPIDLString strdata;

  // Get the int/ext values
  nsCOMPtr<nsISupportsString> intextstr;
  rv = branch->GetComplexValue("intexts",
    NS_GET_IID(nsISupportsString), getter_AddRefs(intextstr));
  if (NS_FAILED(rv))
    return rv;
  intextstr->ToString(getter_Copies(strdata));
  nsTArray<nsString> intexts;
  intexts.AppendElement(NS_LITERAL_STRING("INT"));
  intexts.AppendElement(NS_LITERAL_STRING("EXT"));
  nsXPIDLString::size_type startoffset = 0;
  nsXPIDLString::size_type endoffset = strdata.FindChar(PRUnichar(','));
  while (PRInt32(endoffset) > 0) {
    intexts.AppendElement(Substring(strdata, startoffset,
      endoffset - startoffset));
    startoffset = endoffset + 1;
    endoffset = strdata.FindChar(PRUnichar(','), startoffset);
  }
  if (startoffset < strdata.Length())
    intexts.AppendElement(Substring(strdata, startoffset,
      strdata.Length() - startoffset));

  // Get the day/night values
  nsCOMPtr<nsISupportsString> daynightstr;
  rv = branch->GetComplexValue("daynights",
    NS_GET_IID(nsISupportsString), getter_AddRefs(daynightstr));
  if (NS_FAILED(rv))
    return rv;
  daynightstr->ToString(getter_Copies(strdata));
  nsTArray<nsString> daynights;
  startoffset = 0;
  endoffset = strdata.FindChar(PRUnichar(','));
  while (PRInt32(endoffset) > 0) {
    daynights.AppendElement(Substring(strdata, startoffset,
      endoffset - startoffset));
    startoffset = endoffset + 1;
    endoffset = strdata.FindChar(PRUnichar(','), startoffset);
  }
  if (startoffset < strdata.Length())
    daynights.AppendElement(Substring(strdata, startoffset,
      strdata.Length() - startoffset));

  aIntExt.Truncate();
  aSetting.Truncate();
  aDayNight.Truncate();

  nsAString::const_iterator start, end;
  aHeading.BeginReading(start);
  aHeading.EndReading(end); // This is a one-past-the-end pointer!
  PRUint32 maxfindlen = 0;

  // Skip any prefix characters (e.g., scene numbers)
  while (kPrefixChars.FindChar(*start) >= 0)
    ++start;

  // Find the longest match for an int/ext string
  for (PRUint32 i = 0; i < intexts.Length(); ++i) {
    const nsAString& pattern = intexts[i];
    nsAString::const_iterator aStart = start;
    nsAString::const_iterator aEnd = end;
    if (pattern.Length() <= maxfindlen)
      continue;
    if (CaseInsensitiveFindInReadable(pattern, aStart, aEnd) &&
        aStart == start) {
      maxfindlen = pattern.Length();
      // The odds of assigning more than once should be zero for most locales
      aIntExt = pattern;
    }
  }
  start.advance(maxfindlen);

  // Skip any separator characters
  while (*start && kSeparatorChars.FindChar(*start) >= 0)
    ++start;

  // Find the longest match for a day/night string
  maxfindlen = 0;
  nsCaseInsensitiveStringComparator insensitive;
  for (PRUint32 i = 0; i < daynights.Length(); ++i) {
    const nsAString& pattern = daynights[i];
    nsAString::const_iterator aStart = start;
    nsAString::const_iterator aEnd = end;
    if (pattern.Length() <= maxfindlen)
      continue;
    if (RFindInReadable(pattern, aStart, aEnd, insensitive) && aEnd == end) {
      maxfindlen = pattern.Length();
      aDayNight = pattern;
    }
  }
  if (maxfindlen > 0)
    end.advance(- (maxfindlen + 1)); // Remember: End is one-past-the-end
  else if (end != start)
    --end;

  // Skip any separator characters
  while (*end && kSeparatorChars.FindChar(*end) >= 0)
    --end;

  aSetting = Substring(start, *end ? ++end : end);

  return NS_OK;
}

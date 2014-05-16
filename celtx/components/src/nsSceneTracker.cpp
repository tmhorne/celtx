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

#include "nsSceneTracker.h"
#include "CeltxRDFUtils.h"
#include "nsIRDFService.h"
#include "nsIRDFContainerUtils.h"
#include "nsUnicharUtils.h"
#include "nsPrintfCString.h"
#include "prrng.h"
#include "prmem.h"
#include "nsTArray.h"
#include "nsHashSets.h"
#include "nsServiceManagerUtils.h"
#include "nsIDOMHTMLDocument.h"
#include "nsIDOMHTMLElement.h"
#include "nsIDOMEventTarget.h"
#include "nsIDOMEvent.h"
#include "nsIDOMXPathEvaluator.h"
#include "nsIDOMXPathResult.h"
#include "nsIPrefService.h"
#include "nsISupportsPrimitives.h"
#include "stdio.h"

class Scene_SceneEntry {
public:
  nsString id;
  nsString heading;
  Scene_SceneEntry () {}
  Scene_SceneEntry (const nsAString& aID, const nsAString& aHeading)
    : id(aID), heading(aHeading) {}
  Scene_SceneEntry (const Scene_SceneEntry& entry)
    : id(entry.id), heading(entry.heading) {}
  bool operator== (const Scene_SceneEntry& entry) {
    return (bool) id.Equals(entry.id);
  }
};

NS_IMPL_ISUPPORTS2(nsSceneTracker, nsILockingSceneTracker, nsITimerCallback)

nsSceneTracker::nsSceneTracker ()
: mDocres(nsnull), mDS(nsnull), mEditor(nsnull), mSuppressEvents(PR_FALSE),
  mTimerFullUpdate(PR_FALSE) {
}

nsSceneTracker::~nsSceneTracker () {
  mDocres = nsnull;
  mDS = nsnull;
  mEditor = nsnull;
  mScript = nsnull;
  mRDFSvc = nsnull;
  mObservers.Clear();
  mScenes = nsnull;
  mTimer = nsnull;
  mTimerNodes.Clear();
  mSceneHeaderTimer = nsnull;
  mNumberSvc = nsnull;
}

NS_IMETHODIMP nsSceneTracker::Init (nsIRDFDataSource* ds,
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

  mNumberSvc = do_GetService("@celtx.com/scene-number-service;1");

  mRDFSvc = do_GetService("@mozilla.org/rdf/rdf-service;1");
  nsCOMPtr<nsIRDFContainerUtils> cu = do_GetService(
    "@mozilla.org/rdf/container-utils;1");
  nsCOMPtr<nsIRDFResource> scenesarc;
  mRDFSvc->GetResource(NS_LITERAL_CSTRING("http://celtx.com/NS/v1/scenes"),
    getter_AddRefs(scenesarc));

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

  nsCOMPtr<nsIDOMHTMLDocument> hdoc(do_QueryInterface(mScript));
  if (! hdoc)
    return NS_ERROR_INVALID_ARG;

  nsCOMPtr<nsIDOMHTMLElement> body;
  rv = hdoc->GetBody(getter_AddRefs(body));
  if (NS_FAILED(rv))
    return NS_ERROR_UNEXPECTED;

  nsCOMPtr<nsIDOMEventTarget> target(do_QueryInterface(body));
  target->AddEventListener(NS_LITERAL_STRING("DOMNodeInserted"),
    this, PR_FALSE);
  target->AddEventListener(NS_LITERAL_STRING("DOMNodeRemoved"),
    this, PR_FALSE);
  target->AddEventListener(NS_LITERAL_STRING("DOMCharacterDataModified"),
    this, PR_FALSE);

  rv = Update();
  if (NS_FAILED(rv))
    return rv;

  PRInt32 revision;
  rv = mEditor->GetRevisionNumber(&revision);
  if (NS_SUCCEEDED(rv) && ! revision)
    rv = ResetSceneNumbers();

  if (NS_SUCCEEDED(rv))
    // Don't let a failure to update literals cause total failure
    UpdateAllSceneNumberLiterals();

  return rv;
}

NS_IMETHODIMP nsSceneTracker::Shutdown () {
  nsCOMPtr<nsIDOMHTMLDocument> hdoc(do_QueryInterface(mScript));
  if (! hdoc)
    return NS_OK;

  nsCOMPtr<nsIDOMHTMLElement> body;
  nsresult rv = hdoc->GetBody(getter_AddRefs(body));
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
nsSceneTracker::GetSuppressEvents (PRBool* aSuppressEvents) {
  *aSuppressEvents = mSuppressEvents;
  return NS_OK;
}

NS_IMETHODIMP
nsSceneTracker::SetSuppressEvents (PRBool aSuppressEvents) {
  mSuppressEvents = aSuppressEvents;
  return NS_OK;
}

NS_IMETHODIMP
nsSceneTracker::AddObserver (nsISceneTrackerObserver* observer) {
  NS_ENSURE_ARG(observer);
  mObservers.AppendObject(observer);
  return NS_OK;
}

NS_IMETHODIMP
nsSceneTracker::RemoveObserver (nsISceneTrackerObserver* observer) {
  NS_ENSURE_ARG(observer);
  mObservers.RemoveObject(observer);
  return NS_OK;
}

// nsIDOMEventListener
NS_IMETHODIMP
nsSceneTracker::HandleEvent (nsIDOMEvent* anEvent) {
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

void nsSceneTracker::HandleCDataEvent (nsIDOMEvent* anEvent) {
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
  if (! className.Equals(NS_LITERAL_STRING("sceneheading"))) {
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

  if (nodeID.IsEmpty()) {
    printf("No ID on a scene node, triggering a full update.\n");
    Update();
    return;
  }

  mSceneID.Assign(nodeID);
  mSceneHeaderTimer = do_CreateInstance("@mozilla.org/timer;1");
  mSceneHeaderTimer->InitWithFuncCallback(SceneHeaderChangedFunc, (void *)this,
    1500, nsITimer::TYPE_ONE_SHOT);
}

void nsSceneTracker::SceneHeaderChangedFunc (nsITimer* timer, void* closure) {
  nsSceneTracker* tracker = (nsSceneTracker *) closure;
  tracker->SceneHeaderChanged(tracker->mSceneID);
  tracker->mSceneID.Truncate(0);
}

void nsSceneTracker::SceneHeaderChanged (const nsAString& nodeID) {
  nsCOMPtr<nsIDOMElement> node;
  nsresult rv = mScript->GetElementById(nodeID, getter_AddRefs(node));
  if (! node)
    return;
  nsCOMPtr<nsIRDFResource> elemres;
  rv = SceneForSceneID(nodeID, getter_AddRefs(elemres));
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
  nsCOMPtr<nsIRDFNode> target;
  rv = mDS->GetTarget(elemres, titlearc, PR_TRUE, getter_AddRefs(target));
  if (target) {
    mDS->Change(elemres, titlearc, target, newtitle);
  }
  else {
    mDS->Assert(elemres, titlearc, newtitle, PR_TRUE);
  }
  NotifySceneChanged(elemres);
}

void nsSceneTracker::HandleInsertedEvent (nsIDOMEvent* anEvent) {
  nsCOMPtr<nsIDOMEventTarget> aTarget;
  anEvent->GetTarget(getter_AddRefs(aTarget));
  nsCOMPtr<nsIDOMHTMLParagraphElement> para(do_QueryInterface(aTarget));
  if (! para)
    return;

  nsString className;
  para->GetAttribute(NS_LITERAL_STRING("class"), className);
  if (className.Equals(NS_LITERAL_STRING("sceneheading"))) {
    PRBool propagateChanges = PR_TRUE;
    while (propagateChanges && para) {
      nsresult rv = AssignDefaultSceneNumber(para, &propagateChanges);
      if (NS_FAILED(rv))
        return;

      rv = UpdateSceneNumberLiterals(para);
      if (NS_FAILED(rv))
        return;

      nsCOMPtr<nsIDOMHTMLParagraphElement> node = para;
      rv = GetNextScene(node, getter_AddRefs(para));
      if (NS_FAILED(rv))
        return;
    }

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

void nsSceneTracker::HandleRemovedEvent (nsIDOMEvent* anEvent) {
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

NS_IMETHODIMP nsSceneTracker::Notify (nsITimer* aTimer) {
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

void nsSceneTracker::HandleRemovedEventFunc (nsIDOMHTMLParagraphElement* para) {
  nsCOMPtr<nsIDOMElement> scene;
  nsCOMPtr<nsIDOMNode> node(do_QueryInterface(para));
  mEditor->SceneContaining(node, getter_AddRefs(scene));
  if (scene) {
    nsString nodeID;
    scene->GetAttribute(NS_LITERAL_STRING("id"), nodeID);
    if (! nodeID.IsEmpty()) {
      nsCOMPtr<nsIRDFResource> sceneres;
      nsresult rv = SceneForSceneID(nodeID, getter_AddRefs(sceneres));
      if (NS_SUCCEEDED(rv) && sceneres)
        NotifySceneContentChanged(sceneres);
    }
  }
}

NS_IMETHODIMP nsSceneTracker::Update () {
  nsCOMPtr<nsIDOMXPathEvaluator> xpe = do_CreateInstance(
    "@mozilla.org/dom/xpath-evaluator;1");
  NS_NAMED_LITERAL_STRING(str,
    "/html/body/p[@class='sceneheading']");
  nsCOMPtr<nsIDOMXPathResult> result;
  nsresult rv = xpe->Evaluate(str, mScript, nsnull,
    nsIDOMXPathResult::ORDERED_NODE_SNAPSHOT_TYPE,
    nsnull, getter_AddRefs(result));
  NS_ENSURE_SUCCESS(rv, rv);
  PRUint32 length;
  rv = result->GetSnapshotLength(&length);
  NS_ENSURE_SUCCESS(rv, rv);
  nsStringHashSet seenIDs;
  seenIDs.Init(length);

  rv = CheckNumberingScheme();
  NS_ENSURE_SUCCESS(rv, rv);

  PRBool orderModified = PR_FALSE;
  nsTArray<Scene_SceneEntry> scenes;
  // Cache the associated resources, or everything goes screwy when
  // we move scenes around, since they are temporarily removed from
  // the scene list (causing SceneForSceneID to fail).
  nsCOMArray<nsIRDFResource> scenereslist(length);
  PRInt32 totalScenes = 0;

  PRInt32 scriptRevision = 0;
  mEditor->GetRevisionNumber(&scriptRevision);

  for (PRUint32 i = 0; i < length; ++i) {
    nsCOMPtr<nsIDOMNode> item;
    rv = result->SnapshotItem(i, getter_AddRefs(item));
    if (NS_FAILED(rv) || ! item)
      continue;
    nsCOMPtr<nsIDOMElement> node(do_QueryInterface(item));
    if (! node)
      continue;

    PRBool hasAttr = PR_FALSE;
    nsString nodeID;
    node->HasAttribute(NS_LITERAL_STRING("id"), &hasAttr);
    if (hasAttr)
      node->GetAttribute(NS_LITERAL_STRING("id"), nodeID);

    PRBool needsNewID = nodeID.IsEmpty() || seenIDs.Contains(nodeID);
    PRBool needsNewSceneNumber = needsNewID;

    /*
     * Check if the scene number needs reassignment, based on any of the
     * following conditions being met:
     *
     *    1. The scene has an invalid ID (no ID, or a duplicate ID).
     *    2. The scene does not have a scene number.
     *    3. The scene number cannot be parsed.
     *    4. The scene number is not seamless with the prior one, as defined
     *       by nsSceneNumberService::NumbersAreSeamless.
     *
     * When a scene number is incorrect, it needs to be reassigned,
     * regardless of whether or not the scene is locked.
     */
    if (! needsNewSceneNumber) {
      nsAutoString sceneNumberStr;

      node->GetAttribute(NS_LITERAL_STRING("scenenumber"), sceneNumberStr);

      // No scene number is automatically a "wrong" scene number
      if (sceneNumberStr.IsEmpty()) {
        needsNewSceneNumber = PR_TRUE;
      }
      else {
        PRUint32 sceneNumber[DEFAULT_MAX_SCENE_DEPTH];
        PRUint32 sceneNumberLength = DEFAULT_MAX_SCENE_DEPTH;

        nsAutoString prevNumberStr;
        PRUint32 prevNumber[DEFAULT_MAX_SCENE_DEPTH];
        PRUint32 prevNumberLength = DEFAULT_MAX_SCENE_DEPTH;

        // Since this iterates through all the scenes in the script,
        // we can safely assume all prior scenes are numbered.
        nsCOMPtr<nsIDOMHTMLParagraphElement> prevScene;
        GetPriorScene(node, getter_AddRefs(prevScene));

        if (prevScene)
          prevScene->GetAttribute(NS_LITERAL_STRING("scenenumber"),
            prevNumberStr);

        if (NS_FAILED(ParseSceneNumber(sceneNumberStr, &sceneNumberLength,
          sceneNumber))) {
          needsNewSceneNumber = PR_TRUE;
        }
        else if (! prevScene) {
          if (sceneNumberLength > 1 || sceneNumber[0] != 1) {
            needsNewSceneNumber = PR_TRUE;
          }
        }
        else if (! prevNumberStr.IsEmpty() &&
          NS_SUCCEEDED(ParseSceneNumber(prevNumberStr, &prevNumberLength,
            prevNumber))) {
          PRBool seamless = PR_FALSE;
          mNumberSvc->NumbersAreSeamless(prevNumber, prevNumberLength,
            sceneNumber, sceneNumberLength, &seamless);
          if (! seamless) {
            needsNewSceneNumber = PR_TRUE;
          }
        }
      }
    }

    if (needsNewID || needsNewSceneNumber) {
      if (needsNewID) {
        nsCString genid;
        GenerateID(genid);
        CopyASCIItoUTF16(genid, nodeID);
        node->SetAttribute(NS_LITERAL_STRING("id"), nodeID);
      }

      // I believe now's a good time to try assigning it a scene number,
      // on the assumption if its ID changed, it probably doesn't have
      // a valid scene number either.
      nsCOMPtr<nsIDOMHTMLParagraphElement> scene
        = do_QueryInterface(node);

      PRBool propagateChanges = PR_TRUE;
      while (propagateChanges && scene) {
        // FIXME: If this is being called as a result of a false result
        // from SceneNumbersAreSeamless, we end up with a useless result
        // that gradually propagates errors.
        nsresult rv = AssignDefaultSceneNumber(scene, &propagateChanges);
        if (NS_FAILED(rv)) {
          printf("*** AssignDefaultSceneNumber failed: %x\n", rv);
          break;
        }
  
        nsCOMPtr<nsIDOMHTMLParagraphElement> para = scene;
        rv = GetNextScene(para, getter_AddRefs(scene));
        if (NS_FAILED(rv))
          break;
      }
    }
    seenIDs.Put(nodeID);
    nsString heading;
    StringifyNode(node, heading);
    ToUpperCase(heading);

    ++totalScenes;
    scenes.AppendElement(Scene_SceneEntry(nodeID, heading));
    nsCOMPtr<nsIRDFResource> sceneres;
    SceneForSceneID(nodeID, getter_AddRefs(sceneres));
    scenereslist.AppendObject(sceneres);
  }

  nsCOMPtr<nsIRDFContainerUtils> cu = do_GetService(
    "@mozilla.org/rdf/container-utils;1");
  nsCOMPtr<nsIRDFResource> titlearc;
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

  nsCOMPtr<nsIRDFResource> scenesRes;
  mScenes->GetResource(getter_AddRefs(scenesRes));

  for (PRUint32 i = 0; i < scenes.Length(); ++i) {
    const Scene_SceneEntry& sceneEntry = scenes[i];

    // Ensure a corresponding resource exists
    nsCOMPtr<nsIRDFResource> sceneres;
    // rv = SceneForSceneID(sceneEntry.id, getter_AddRefs(sceneres));
    rv = NS_OK; sceneres = scenereslist[i];
    if (NS_FAILED(rv) || ! sceneres) {
      nsCString mintedURI(NS_LITERAL_CSTRING("http://celtx.com/res/"));
      nsCString genid;
      GenerateID(genid);
      mintedURI.Append(genid);
      mRDFSvc->GetResource(mintedURI, getter_AddRefs(sceneres));
    }

    // Put it into the correct place in the scene list
    nsCOMPtr<nsIRDFResource> rdfordarc;
    cu->IndexToOrdinalResource(i + 1, getter_AddRefs(rdfordarc));
    nsIRDFNode* curscene;
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
        mScenes->RemoveElementAt(i + 1, PR_FALSE,
          getter_AddRefs(removed));
        mScenes->InsertElementAt(sceneres, i + 1, PR_FALSE);
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
  }

  UpdateAllSceneNumberLiterals();

  // Truncate any superfluous items within the scene list
  PRInt32 sceneCount = 0;
  mScenes->GetCount(&sceneCount);
  nsCOMPtr<nsIRDFNode> removed;
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


NS_IMETHODIMP
nsSceneTracker::ResetSceneNumbers() {
  NS_NAMED_LITERAL_STRING(kSceneNumberAttr, "scenenumber");
  NS_NAMED_LITERAL_STRING(kLockedAttr, "locked");

  nsCOMPtr<nsIDOMHTMLParagraphElement> lastScene = nsnull;
  nsCOMPtr<nsIDOMHTMLParagraphElement> scene;
  PRUint32 sceneNumber = 1;

  nsresult rv = GetNextScene(lastScene, getter_AddRefs(scene));
  while (NS_SUCCEEDED(rv) && scene) {
    nsAutoString sceneNumberStr;
    sceneNumberStr.AppendInt(sceneNumber++);
    scene->SetAttribute(kSceneNumberAttr, sceneNumberStr);
    scene->RemoveAttribute(kLockedAttr);

    lastScene = scene;
    rv = GetNextScene(lastScene, getter_AddRefs(scene));
  }

  if (NS_FAILED(rv))
    return rv;

  Update();

  return NS_OK;
}


nsresult
nsSceneTracker::AssignDefaultSceneNumber(nsIDOMHTMLParagraphElement* aScene,
                                         PRBool* outPropagateChanges) {
  NS_ENSURE_ARG(aScene);

  nsAutoString className;
  aScene->GetClassName(className);
  if (! className.Equals(NS_LITERAL_STRING("sceneheading")))
    return NS_ERROR_INVALID_ARG;

  nsresult rv;

  PRInt32 scriptRevision = 0;
  rv = mEditor->GetRevisionNumber(&scriptRevision);
  if (NS_FAILED(rv))
    return rv;

  PRUint32 sceneNumber[DEFAULT_MAX_SCENE_DEPTH];
  PRUint32 sceneNumberLength = DEFAULT_MAX_SCENE_DEPTH;

  nsCOMPtr<nsIDOMHTMLParagraphElement> prevScene;
  nsCOMPtr<nsIDOMHTMLParagraphElement> nextScene;

  rv = GetPriorNumberedScene(aScene, getter_AddRefs(prevScene));
  if (NS_FAILED(rv))
    return rv;

  rv = GetNextNumberedScene(aScene, getter_AddRefs(nextScene));
  if (NS_FAILED(rv))
    return rv;

  rv = SceneNumberBetweenScenes(prevScene, nextScene, &sceneNumberLength,
    sceneNumber, outPropagateChanges);
  if (NS_FAILED(rv))
    return rv;

  nsCAutoString sceneNumberCStr;
  sceneNumberCStr.Assign(nsPrintfCString("%u", sceneNumber[0]));
  for (PRUint32 i = 1; i < sceneNumberLength; ++i)
    sceneNumberCStr.Append(nsPrintfCString(".%u", sceneNumber[i]));
  aScene->SetAttribute(NS_LITERAL_STRING("scenenumber"),
    NS_ConvertASCIItoUTF16(sceneNumberCStr));

  return NS_OK;
}


nsresult
nsSceneTracker::SceneNumberBetweenScenes (
                                      nsIDOMHTMLParagraphElement* aLeftScene,
                                      nsIDOMHTMLParagraphElement* aRightScene,
                                      PRUint32* ioNumberLength,
                                      PRUint32* outNumber,
                                      PRBool* outPropagateChanges) {
  NS_ENSURE_ARG_POINTER(ioNumberLength);
  NS_ENSURE_ARG_POINTER(outNumber);
  NS_ENSURE_ARG_POINTER(outPropagateChanges);
  NS_ENSURE_ARG_MIN(*ioNumberLength, 1);

  nsresult rv;

  nsAutoString leftNumberStr;
  PRUint32 leftNumber[DEFAULT_MAX_SCENE_DEPTH];
  PRUint32 leftNumberLength = DEFAULT_MAX_SCENE_DEPTH;

  nsAutoString rightNumberStr;
  PRUint32 rightNumber[DEFAULT_MAX_SCENE_DEPTH];
  PRUint32 rightNumberLength = DEFAULT_MAX_SCENE_DEPTH;

  NS_NAMED_LITERAL_STRING(kNumberAttr, "scenenumber");

  if (aLeftScene) {
    rv = aLeftScene->GetAttribute(kNumberAttr, leftNumberStr);
    if (NS_FAILED(rv))
      return rv;

    rv = ParseSceneNumber(leftNumberStr, &leftNumberLength, leftNumber);
    if (NS_FAILED(rv))
      return rv;
  }

  // Skip unlocked scenes, since we are allowed to renumber them anyway
  nsCOMPtr<nsIDOMHTMLParagraphElement> nextScene(aRightScene);
  while (nextScene && ! SceneHasLockedNumber(nextScene)) {
    nsCOMPtr<nsIDOMHTMLParagraphElement> tmp(nextScene);
    rv = GetNextNumberedScene(tmp, getter_AddRefs(nextScene));
    if (NS_FAILED(rv))
      return rv;
  }

  if (nextScene) {
    rv = nextScene->GetAttribute(kNumberAttr, rightNumberStr);
    if (NS_FAILED(rv))
      return rv;

    rv = ParseSceneNumber(rightNumberStr, &rightNumberLength, rightNumber);
    if (NS_FAILED(rv))
      return rv;
  }

  rv = mNumberSvc->NumberBetweenNumbers(
    aLeftScene ? leftNumber : nsnull, leftNumberLength,
    nextScene ? rightNumber : nsnull, rightNumberLength,
    outNumber, ioNumberLength, outPropagateChanges);

  return rv;
}


nsresult
nsSceneTracker::ParseSceneNumber(nsString sceneNumber,
                                 PRUint32* ioNumberLength,
                                 PRUint32* outNumber) {
  NS_ENSURE_ARG_POINTER(ioNumberLength);
  NS_ENSURE_ARG_POINTER(outNumber);
  NS_ENSURE_ARG_MIN(*ioNumberLength, 1);

  NS_LossyConvertUTF16toASCII asciiSceneNumber(sceneNumber);
  const char* cursor = asciiSceneNumber.get();
  PRUint32 scanned = 0;
  PRUint32 number;
  int read = 0;

  // %n is not counted in the return value, but we can detect it
  // if we reset 'read' before each call, because read will not
  // be set if it fails to parse a period after the number
  while (sscanf(cursor, "%u.%n", &number, &read) > 0) {
    outNumber[scanned++] = number;
    if (read == 0 || scanned == *ioNumberLength)
      break;
    cursor += read;
    read = 0;
  }

  *ioNumberLength = scanned;

  if (scanned == 0)
    return NS_ERROR_FAILURE;
  else
    return NS_OK;
}


PRBool
nsSceneTracker::SceneHasLockedNumber(nsIDOMHTMLParagraphElement* aScene) {
  PRBool locked = PR_FALSE;
  mEditor->GetScenesLocked(&locked);
  if (locked)
    aScene->HasAttribute(NS_LITERAL_STRING("locked"), &locked);
  return locked;
}


nsresult
nsSceneTracker::GetPriorScene(nsIDOMNode* aNode,
                              nsIDOMHTMLParagraphElement** result) {
  NS_ENSURE_ARG_POINTER(result);

  nsresult rv = NS_OK;

  nsCOMPtr<nsIDOMNode> node;
  if (aNode) {
    rv = aNode->GetPreviousSibling(getter_AddRefs(node));
  }
  else {
    nsCOMPtr<nsIDOMHTMLDocument> hdoc(do_QueryInterface(mScript));
    if (! hdoc)
      return NS_ERROR_UNEXPECTED;

    nsCOMPtr<nsIDOMHTMLElement> body;
    rv = hdoc->GetBody(getter_AddRefs(body));
    if (NS_FAILED(rv))
      return rv;

    rv = body->GetLastChild(getter_AddRefs(node));
  }
  if (NS_FAILED(rv))
    return rv;

  nsCOMPtr<nsIDOMHTMLParagraphElement> scene;
  nsAutoString className;

  *result = nsnull;
  while (NS_SUCCEEDED(rv) && node) {
    scene = do_QueryInterface(node);
    if (scene) {
      scene->GetClassName(className);
      if (className.Equals(NS_LITERAL_STRING("sceneheading"))) {
        *result = scene;
        NS_ADDREF(*result);
        break;
      }
    }
    scene = nsnull;
    nsCOMPtr<nsIDOMNode> tmp = node;
    rv = tmp->GetPreviousSibling(getter_AddRefs(node));
  }
  if (NS_FAILED(rv))
    return rv;

  return NS_OK;
}


nsresult
nsSceneTracker::GetPriorNumberedScene(nsIDOMNode* aNode,
                                      nsIDOMHTMLParagraphElement** result) {
  NS_ENSURE_ARG_POINTER(result);

  // Don't use nsCOMPtr: We need to make sure the result is AddRef'd when
  // it goes out.
  nsIDOMHTMLParagraphElement* scene = nsnull;
  nsresult rv = GetPriorScene(aNode, &scene);
  while (NS_SUCCEEDED(rv) && scene) {
    PRBool hasAttr;
    rv = scene->HasAttribute(NS_LITERAL_STRING("scenenumber"), &hasAttr);
    if (NS_FAILED(rv) || hasAttr)
      break;
    nsIDOMHTMLParagraphElement* tmp = scene;
    rv = GetPriorScene(scene, &scene);
    NS_IF_RELEASE(tmp);
  }

  if (NS_SUCCEEDED(rv))
    *result = scene;
  else
    NS_IF_RELEASE(scene);

  return rv;
}


nsresult
nsSceneTracker::GetNextScene(nsIDOMNode* aNode,
                             nsIDOMHTMLParagraphElement** result) {
  NS_ENSURE_ARG_POINTER(result);

  nsresult rv = NS_OK;

  nsCOMPtr<nsIDOMNode> node;
  if (aNode) {
    rv = aNode->GetNextSibling(getter_AddRefs(node));
  }
  else {
    nsCOMPtr<nsIDOMHTMLDocument> hdoc(do_QueryInterface(mScript));
    if (! hdoc)
      return NS_ERROR_UNEXPECTED;

    nsCOMPtr<nsIDOMHTMLElement> body;
    rv = hdoc->GetBody(getter_AddRefs(body));
    if (NS_FAILED(rv))
      return rv;

    rv = body->GetFirstChild(getter_AddRefs(node));
  }
  if (NS_FAILED(rv))
    return rv;

  nsCOMPtr<nsIDOMHTMLParagraphElement> scene;
  nsAutoString className;

  *result = nsnull;
  while (NS_SUCCEEDED(rv) && node) {
    scene = do_QueryInterface(node);
    if (scene) {
      scene->GetClassName(className);
      if (className.Equals(NS_LITERAL_STRING("sceneheading"))) {
        *result = scene;
        NS_ADDREF(*result);
        break;
      }
    }
    scene = nsnull;
    nsCOMPtr<nsIDOMNode> tmp = node;
    rv = tmp->GetNextSibling(getter_AddRefs(node));
  }
  if (NS_FAILED(rv))
    return rv;

  return NS_OK;
}


nsresult
nsSceneTracker::GetNextNumberedScene(nsIDOMNode* aNode,
                                     nsIDOMHTMLParagraphElement** result) {
  NS_ENSURE_ARG_POINTER(result);

  // Don't use nsCOMPtr: We need to make sure the result is AddRef'd when
  // it goes out.
  nsIDOMHTMLParagraphElement* scene = nsnull;
  nsresult rv = GetNextScene(aNode, &scene);
  while (NS_SUCCEEDED(rv) && scene) {
    PRBool hasAttr;
    rv = scene->HasAttribute(NS_LITERAL_STRING("scenenumber"), &hasAttr);
    if (NS_FAILED(rv) || hasAttr)
      break;
    nsIDOMHTMLParagraphElement* tmp = scene;
    rv = GetNextScene(scene, &scene);
    NS_IF_RELEASE(tmp);
  }

  if (NS_SUCCEEDED(rv))
    *result = scene;
  else
    NS_IF_RELEASE(scene);

  return rv;
}


nsresult nsSceneTracker::CheckNumberingScheme () {
  nsCOMPtr<nsIRDFResource> schemearc;
  mRDFSvc->GetResource(NS_LITERAL_CSTRING(
    "http://celtx.com/NS/v1/sceneNumberScheme"), getter_AddRefs(schemearc));

  nsCOMPtr<nsIRDFNode> schemenode;
  nsCOMPtr<nsIRDFResource> schemeres;
  mDS->GetTarget(mDocres, schemearc, PR_TRUE, getter_AddRefs(schemenode));
  if (schemenode) schemeres = do_QueryInterface(schemenode);
  if (! schemeres)
    mRDFSvc->GetResource(NS_LITERAL_CSTRING(
      "http://celtx.com/NS/v1/HollywoodNumberScheme"),
      getter_AddRefs(schemeres));

  PRBool nodesEqual;
  if (mScheme.GetResource()) {
    schemeres->EqualsNode(mScheme.GetResource(), &nodesEqual);
    if (nodesEqual)
      return NS_OK;
  }

  return mScheme.Init(mDS, schemeres);

  return NS_OK;
}


nsresult nsSceneTracker::UpdateAllSceneNumberLiterals () {
  nsCOMPtr<nsIDOMHTMLParagraphElement> scene;

  nsresult rv = GetNextScene(nsnull, getter_AddRefs(scene));
  while (NS_SUCCEEDED(rv) && scene) {
    // Ignore the result
    UpdateSceneNumberLiterals(scene);
    nsCOMPtr<nsIDOMHTMLParagraphElement> tmp = scene;
    rv = GetNextScene(tmp, getter_AddRefs(scene));
  }

  return rv;
}


nsresult nsSceneTracker::UpdateSceneNumberLiterals (
                                  nsIDOMHTMLParagraphElement* aScene) {
  NS_ENSURE_ARG(aScene);

  nsAutoString className;
  nsresult rv = aScene->GetClassName(className);
  NS_ENSURE_SUCCESS(rv, rv);

  if (! className.Equals(NS_LITERAL_STRING("sceneheading")))
    return NS_ERROR_INVALID_ARG;

  nsAutoString sceneNumberStr;
  rv = aScene->GetAttribute(NS_LITERAL_STRING("scenenumber"), sceneNumberStr);
  NS_ENSURE_SUCCESS(rv, rv);

  // Durrrr... maybe this should be an error?
  if (sceneNumberStr.IsEmpty())
    return NS_OK;

  PRUint32 sceneNumber[DEFAULT_MAX_SCENE_DEPTH];
  PRUint32 sceneNumberLength = DEFAULT_MAX_SCENE_DEPTH;
  rv = ParseSceneNumber(sceneNumberStr, &sceneNumberLength, sceneNumber);
  NS_ENSURE_SUCCESS(rv, rv);

  nsAutoString displayStr;
  rv = mScheme.SceneNumberToString(sceneNumberLength, sceneNumber,
    displayStr);
  NS_ENSURE_SUCCESS(rv, rv);

  aScene->SetAttribute(NS_LITERAL_STRING("scenestr"), displayStr);

  nsAutoString sceneID;
  rv = aScene->GetAttribute(NS_LITERAL_STRING("id"), sceneID);
  NS_ENSURE_SUCCESS(rv, rv);

  if (sceneID.IsEmpty())
    return NS_ERROR_UNEXPECTED;

  nsCOMPtr<nsIRDFResource> sceneres;
  rv = SceneForSceneID(sceneID, getter_AddRefs(sceneres));
  NS_ENSURE_SUCCESS(rv, rv);

  if (! sceneres)
    return NS_ERROR_UNEXPECTED;

  nsCOMPtr<nsIRDFResource> ordarc;
  nsCOMPtr<nsIRDFResource> sortordarc;
  mRDFSvc->GetResource(NS_LITERAL_CSTRING("http://celtx.com/NS/v1/ordinal"),
    getter_AddRefs(ordarc));
  mRDFSvc->GetResource(NS_LITERAL_CSTRING("http://celtx.com/NS/v1/sortord"),
    getter_AddRefs(sortordarc));
  // TODO: Distinguish canonical string from display string
  SetRDFString(mDS, sceneres, ordarc, displayStr);

  // This is for sorting only. Each scene number component is
  // zero-padded to 4 digits, allowing alphabetical sorting.
  nsCAutoString sortStr;
  sortStr.Assign(nsPrintfCString("%04d", sceneNumber[0]));

  for (PRUint32 i = 1; i < sceneNumberLength; ++i)
    sortStr.Append(nsPrintfCString("%04d", sceneNumber[i]));

  SetRDFString(mDS, sceneres, sortordarc,
    NS_ConvertASCIItoUTF16(sortStr));

  return NS_OK;
}


NS_IMETHODIMP
nsSceneTracker::SceneOmitted (const nsAString& sceneid) {
  SceneHeaderChanged(sceneid);
  return NS_OK;
}


void nsSceneTracker::NotifySceneListChanged () {
  mObservers.EnumerateForwards(nsSceneTracker::SceneListChangedFunc, nsnull);
}

PRBool
nsSceneTracker::SceneListChangedFunc (nsISceneTrackerObserver* aObserver,
                                      void* aData) {
  aObserver->SceneListChanged();
  return PR_TRUE;
}

void nsSceneTracker::NotifySceneChanged (nsIRDFResource* sceneres) {
  mObservers.EnumerateForwards(nsSceneTracker::SceneChangedFunc, sceneres);
}

PRBool
nsSceneTracker::SceneChangedFunc (nsISceneTrackerObserver* aObserver,
                                  void* aData) {
  nsIRDFResource* sceneres = (nsIRDFResource *) aData;
  aObserver->SceneChanged(sceneres);
  return PR_TRUE;
}

void nsSceneTracker::NotifySceneContentChanged (nsIRDFResource* sceneres) {
  mObservers.EnumerateForwards(nsSceneTracker::SceneContentChangedFunc,
    sceneres);
}

PRBool
nsSceneTracker::SceneContentChangedFunc (nsISceneTrackerObserver* aObserver,
                                         void* aData) {
  nsIRDFResource* sceneres = (nsIRDFResource *) aData;
  aObserver->SceneContentChanged(sceneres);
  return PR_TRUE;
}

NS_IMETHODIMP
nsSceneTracker::ShotForShotID (const nsAString& sceneid,
                               nsIRDFResource** result) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP
nsSceneTracker::SceneForSceneID (const nsAString& sceneid,
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
nsSceneTracker::ActForActID (const nsAString& actid,
                             nsIRDFResource** result) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

nsresult nsSceneTracker::StringifyNode (nsIDOMNode* aNode, nsAString& aString) {
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

nsresult nsSceneTracker::GenerateID (nsACString& aString) {
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

nsresult nsSceneTracker::GetRDFString (nsIRDFDataSource* aDS,
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

nsresult nsSceneTracker::SetRDFString (nsIRDFDataSource* aDS,
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

nsresult nsSceneTracker::SplitHeading (const nsAString& aHeading,
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
    // Remember: End is one-past-the-end
    end.advance(- (PRInt32)(maxfindlen + 1));
  else if (end != start)
    --end;

  // Skip any separator characters
  while (*end && kSeparatorChars.FindChar(*end) >= 0)
    --end;

  aSetting = Substring(start, *end ? ++end : end);

  return NS_OK;
}

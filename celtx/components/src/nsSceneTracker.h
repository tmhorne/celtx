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

#ifndef NS_SCENE_TRACKER_H_
#define NS_SCENE_TRACKER_H_

#define NS_SCENETRACKER_CID                   \
{ /* FF7C9B63-B302-440A-A766-BD355DDB75D3 */  \
0xff7c9b63, 0xb302, 0x440a,                   \
{ 0xa7, 0x66, 0xbd, 0x35, 0x5d, 0xdb, 0x75, 0xd3 } }

#define NS_SCENETRACKER_CONTRACTID "@celtx.com/scenetracker;1"

#include "nsISceneTracker.h"
#include "nsIRDFContainer.h"
#include "nsIRDFService.h"
#include "nsIScriptEditor.h"
#include "nsITimer.h"
#include "nsCOMArray.h"
#include "nsString.h"
#include "nsIDOMHTMLParagraphElement.h"

#include "NumberingScheme.h"
#include "nsISceneNumberService.h"

class nsSceneTracker : public nsILockingSceneTracker,
                       public nsITimerCallback {
public:
  nsSceneTracker();
  virtual ~nsSceneTracker();

  NS_DECL_ISUPPORTS

  NS_IMETHOD Init (nsIRDFDataSource* ds, nsIRDFResource* docres,
    nsIScriptEditor* script);
  NS_IMETHOD Shutdown ();

  NS_IMETHOD Update ();

  NS_IMETHOD GetSuppressEvents (PRBool* aSuppressEvents);
  NS_IMETHOD SetSuppressEvents (PRBool aSuppressEvents);

  NS_IMETHOD AddObserver (nsISceneTrackerObserver* observer);
  NS_IMETHOD RemoveObserver (nsISceneTrackerObserver* observer);

  NS_IMETHOD ActForActID (const nsAString& actid,
                          nsIRDFResource** result);
  NS_IMETHOD SceneForSceneID (const nsAString& sceneid,
                              nsIRDFResource** result);
  NS_IMETHOD ShotForShotID (const nsAString& shotid,
                            nsIRDFResource** result);

  // nsIDOMEventListener
  NS_IMETHOD HandleEvent (nsIDOMEvent* anEvent);

  // nsITimerCallback
  NS_IMETHOD Notify (nsITimer* aTimer);

  NS_IMETHOD SceneOmitted (const nsAString& sceneid);

protected:
  void HandleCDataEvent (nsIDOMEvent* anEvent);
  void HandleInsertedEvent (nsIDOMEvent* anEvent);
  void HandleRemovedEvent (nsIDOMEvent* anEvent);
  void HandleRemovedEventFunc (nsIDOMHTMLParagraphElement* para);

  static void SceneHeaderChangedFunc (nsITimer* timer, void* closure);
  void SceneHeaderChanged (const nsAString& nodeID);

  /*
   * Resets all scene numbers. This can only be used in an unlocked script.
   */
  NS_IMETHOD ResetSceneNumbers ();

  /*
   * Updates all the scene number literals associated with script scenes.
   */
  nsresult UpdateAllSceneNumberLiterals ();

  /*
   * Determine what number belongs between two given (numbered) scenes.
   * Either scene (or both) can be unspecified, but they must be numbered if
   * they are specified, or this method will return an error.
   *
   * This checks if aRightScene is locked to determine whether renumbering
   * is allowed.
   */
  nsresult SceneNumberBetweenScenes (nsIDOMHTMLParagraphElement* aLeftScene,
    nsIDOMHTMLParagraphElement* aRightScene, PRUint32* ioNumberLength,
    PRUint32* outNumber, PRBool* outPropagateChanges);

  /**
   * Attempts to assign the default scene number to a scene.
   */
  nsresult AssignDefaultSceneNumber (nsIDOMHTMLParagraphElement* aScene,
    PRBool* outPropagateChanges);

  /*
   * Helper method for SceneNumberBeforeScene. Turns a string
   * representation of a canonical scene number into an array of integers
   * for ease of processing.
   *
   * ioNumberLength and outNumber are used identically to their
   * counterparts in SceneNumberBeforeScene.
   */
  nsresult ParseSceneNumber (nsString sceneNumber, PRUint32* ioNumberLength,
    PRUint32* outNumber);

  /*
   * Returns true if aScene has a locked scene number.
   */
  PRBool SceneHasLockedNumber (nsIDOMHTMLParagraphElement* aScene);

  /*
   * Finds the first scene heading prior to aNode, or null if no prior
   * scene heading is found. If aNode is null, it will find the last
   * scene in the script instead.
   */
  nsresult GetPriorScene (nsIDOMNode* aNode,
    nsIDOMHTMLParagraphElement** result);

  /*
   * Finds the first scene heading prior to aNode that has a scenenumber
   * attribute, or null if no prior scene heading with a scenenumber attribute
   * is found. If aNode is null, it will find the last scene in the script
   * with a scenenumber attribute instead.
   */
  nsresult GetPriorNumberedScene (nsIDOMNode* aNode,
    nsIDOMHTMLParagraphElement** result);

  /*
   * Finds the first scene heading after aNode, or null if no further
   * scene heading is found. If aNode is null, it will find the first
   * scene in the script instead.
   */
  nsresult GetNextScene (nsIDOMNode* aNode,
    nsIDOMHTMLParagraphElement** result);

  /*
   * Finds the first scene heading after aNode that has a scenenumber
   * attribute, or null if no further scene heading with a scenenumber
   * attribute is found. If aNode is null, it will find the first scene in
   * the script with a scenenumber attribute instead.
   */
  nsresult GetNextNumberedScene (nsIDOMNode* aNode,
    nsIDOMHTMLParagraphElement** result);


  nsresult CheckNumberingScheme ();

  nsresult UpdateSceneNumberLiterals (nsIDOMHTMLParagraphElement* aScene);

  void NotifySceneListChanged ();
  static PRBool SceneListChangedFunc (nsISceneTrackerObserver* aObserver,
    void* aData);
  void NotifySceneChanged (nsIRDFResource* sceneres);
  static PRBool SceneChangedFunc (nsISceneTrackerObserver* aObserver,
    void* aData);
  void NotifySceneContentChanged (nsIRDFResource* sceneres);
  static PRBool SceneContentChangedFunc (nsISceneTrackerObserver* aObserver,
    void* aData);

  static nsresult StringifyNode (nsIDOMNode* aNode, nsAString& aString);
  static nsresult GenerateID (nsACString& aString);
  static nsresult GetRDFString (nsIRDFDataSource* aDS, nsIRDFResource* aSource,
    nsIRDFResource* aProp, nsAString& aString);
  static nsresult SetRDFString (nsIRDFDataSource* aDS, nsIRDFResource* aSource,
    nsIRDFResource* aProp, const nsAString& aString);
  static nsresult SplitHeading (const nsAString& aHeading, nsAString& aIntExt,
    nsAString& aSetting, nsAString& aDayNight);

private:
  nsCOMPtr<nsIRDFResource> mDocres;
  nsCOMPtr<nsIRDFDataSource> mDS;
  nsCOMPtr<nsIScriptEditor> mEditor;
  nsCOMPtr<nsIDOMDocument> mScript;

  nsCOMPtr<nsIRDFService> mRDFSvc;
  nsCOMArray<nsISceneTrackerObserver> mObservers;
  nsCOMPtr<nsIRDFContainer> mScenes;
  nsCOMPtr<nsITimer> mTimer;
  nsCOMArray<nsIDOMHTMLParagraphElement> mTimerNodes;

  nsCOMPtr<nsITimer> mSceneHeaderTimer;
  nsString mSceneID;

  PRBool mSuppressEvents;
  PRBool mTimerFullUpdate;

  NumberingScheme mScheme;
  nsCOMPtr<nsISceneNumberService> mNumberSvc;
};

#endif /* NS_SCENE_TRACKER_H_ */

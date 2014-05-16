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

#ifndef NS_SHOT_TRACKER_H_
#define NS_SHOT_TRACKER_H_

#define NS_SHOTTRACKER_CID                    \
{ /* 9EE6E708-DFD5-4605-8BE5-0848C018CDDE */  \
0x9ee6e708, 0xdfd5, 0x4605,                   \
{ 0x8b, 0xe5, 0x08, 0x48, 0xc0, 0x18, 0xcd, 0xde } }

#define NS_SHOTTRACKER_CONTRACTID "@celtx.com/shottracker;1"

#include "nsISceneTracker.h"
#include "nsIRDFContainer.h"
#include "nsIRDFService.h"
#include "nsIScriptEditor.h"
#include "nsITimer.h"
#include "nsCOMArray.h"
#include "nsString.h"
#include "nsIDOMHTMLParagraphElement.h"

class nsShotTracker : public nsISceneTracker, public nsITimerCallback {
public:
  nsShotTracker();
  virtual ~nsShotTracker();

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

protected:
  void HandleCDataEvent (nsIDOMEvent* anEvent);
  void HandleInsertedEvent (nsIDOMEvent* anEvent);
  void HandleRemovedEvent (nsIDOMEvent* anEvent);
  void HandleRemovedEventFunc (nsIDOMHTMLParagraphElement* para);

  static void SceneHeaderChangedFunc (nsITimer* timer, void* closure);
  void SceneHeaderChanged (const nsAString& nodeID);

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
  nsCOMPtr<nsIRDFContainer> mShots;
  nsCOMPtr<nsITimer> mTimer;
  nsCOMArray<nsIDOMHTMLParagraphElement> mTimerNodes;

  nsCOMPtr<nsITimer> mSceneHeaderTimer;
  nsString mSceneID;

  PRBool mSuppressEvents;
  PRBool mTimerFullUpdate;
};

#endif /* NS_SHOT_TRACKER_H_ */

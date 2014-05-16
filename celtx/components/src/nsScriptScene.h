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

#ifndef SCRIPT_SCENE_H_
#define SCRIPT_SCENE_H_

#define NS_SCRIPTSCENE_CID                    \
{ /* 47DDDC7F-BE23-439F-90E6-845D0A71FD72 */  \
0x47dddc7f, 0xbe23, 0x439f,                   \
{ 0x90, 0xe6, 0x84, 0x5d, 0x0a, 0x71, 0xfd, 0x72 } }

#define NS_SCRIPTSCENE_CONTRACTID "@celtx.com/scriptscene;1"

#include "nsIScriptScene.h"
#include "nsIRDFService.h"
#include "nsIRDFContainerUtils.h"
#include "nsCOMPtr.h"
#include "nsIDOMHTMLParagraphElement.h"

class nsScriptScene : public nsIScriptScene {
public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSISCRIPTSCENE

  nsScriptScene () {}
  virtual ~nsScriptScene () {}

protected:
  NS_IMETHOD GetDeptSequence (nsIRDFResource* deptres, PRBool force, nsIRDFContainer** result);
  NS_IMETHOD UpdateSeqSize (nsIRDFContainer* seq);

private:
  nsCOMPtr<nsIRDFDataSource> mDS;
  nsCOMPtr<nsIRDFResource> mSceneres;

  nsCOMPtr<nsIRDFContainer> mMembers;
  nsCOMPtr<nsIRDFContainer> mMarkup;
};

#endif // SCRIPT_SCENE_H_

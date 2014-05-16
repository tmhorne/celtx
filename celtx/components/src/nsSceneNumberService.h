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

#include "nsISceneNumberService.h"
#include "nsString.h"


#define NS_SCENENUMBERSERVICE_CID          \
{ /* C23A68C9-15CF-4E86-8EDB-027C708DC917 */  \
0xc23a68c9, 0x15cf, 0x4e86,                   \
{ 0x8e, 0xdb, 0x02, 0x7c, 0x70, 0x8d, 0xc9, 0x17 } }

#define NS_SCENENUMBERSERVICE_CONTRACTID "@celtx.com/scene-number-service;1"


class nsSceneNumberService : public nsISceneNumberService
{
public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSISCENENUMBERSERVICE

  nsSceneNumberService();

  static NS_METHOD CreateSingleton(nsISupports* aOuter,
                                   const nsIID& aIID, void **aResult);

  static nsSceneNumberService* gSceneNumberService;

private:
  ~nsSceneNumberService();

protected:
  NS_IMETHOD NumberForGap(PRUint32 *aLeftNumber, PRUint32 aLeftNumberLength,
    PRUint32 *aRightNumber, PRUint32 aRightNumberLength,
    PRUint32 *outNumber, PRUint32 *ioNumberLength);

  void TestNumbering ();

  enum {
    REASON_UNKNOWN,
    REASON_NO_NUMBERS,
    REASON_LAST_NUMBER,
    REASON_FIRST_NUMBER,
    REASON_PRE_FIRST_NUMBER,
    REASON_EXTENDING,
    REASON_DESCENDING,
    REASON_GAP_CORRECTION,
    REASON_OVERFLOW
  };

  PRUint32 mLastNumberReason;
};

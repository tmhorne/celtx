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

#ifndef NS_SCRIPT_PAGINATOR_H_
#define NS_SCRIPT_PAGINATOR_H_

#define NS_SCRIPTPAGINATOR_CID                \
{ /* 30D624C7-6E87-4173-B199-0A8B80F5EC00 */  \
0x30d624c7, 0x6e87, 0x4173,                   \
{ 0xb1, 0x99, 0x0a, 0x8b, 0x80, 0xf5, 0xec, 0x00 } }

#define NS_SCRIPTPAGINATOR_CONTRACTID "@celtx.com/scriptpaginator;1"

#include "nsIScriptPaginator.h"
#include "nsIScriptEditor.h"
#include "nsIDOMNode.h"
#include "nsCOMPtr.h"
#include "nsTArray.h"
#include "nsString.h"
#include "nsTime.h"

class nsScriptPaginator : public nsIScriptPaginator {
public:
  nsScriptPaginator();
  virtual ~nsScriptPaginator();

  NS_DECL_ISUPPORTS

  NS_IMETHOD Init (nsIScriptEditor* aEditor);

  NS_IMETHOD GetPageCount (PRInt32* aPageCount);

  NS_IMETHOD GetLinesPerPage (PRInt32* aLinesPerPage);
  NS_IMETHOD SetLinesPerPage (PRInt32 aLinesPerPage);

  NS_IMETHOD GetFontSize (PRInt32* aFontSize);
  NS_IMETHOD SetFontSize (PRInt32 aFontSize);

  NS_IMETHOD ResetCache ();
  NS_IMETHOD CacheExistingPageBreaks ();

  NS_IMETHOD AdjustPageBreaks ();
  NS_IMETHOD AdjustSynchronously ();

protected:
  PRBool CanBreakBeforeNode (nsIDOMNode* node);
  void AdjustNextPageBreak ();
  void CalculateFontMetrics ();

private:
  nsCOMPtr<nsIScriptEditor> mEditor;
  nsCOMPtr<nsIDOMDocument> mScript;

  nsTArray<PRUint32> mPageBreakOffsets;
  nsCOMPtr<nsIDOMNode> mNextPageStartsAt;
  PRUint32 mCurPageBreakNum;
  PRInt32 mUpdateCount;
  nsTime mLastPaginationEnded;
  PRInt32 mPageCount;
  PRInt32 mLinesPerPage;

  float mLineHeight;
  PRInt32 mCharWidth;

  float mFontHeight;
  float mFontWidth;

  PRInt32 mFontSize;

  PRInt32 mModificationCount;
};

#endif /* NS_SCRIPT_PAGINATOR_H_ */

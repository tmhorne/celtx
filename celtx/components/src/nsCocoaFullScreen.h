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

#ifndef NS_COCOA_FULLSCREEN_H_
#define NS_COCOA_FULLSCREEN_H_

#include "nsICocoaFullScreen.h"
#include "nsIWidget.h"

#define NS_COCOAFULLSCREEN2_CID \
{ /* f9bef458-bc77-4f52-968a-6c0df79434f7 */ \
0xf9bef458, 0xbc77, 0x4f52, \
{ 0x96, 0x8a, 0x6c, 0x0d, 0xf7, 0x94, 0x34, 0xf7 } }

#define NS_COCOAFULLSCREEN2_CONTRACTID "@celtx.com/fullscreen;2"

class NSScreen;
class nsCocoaWindow;

class nsCocoaFullScreen2 : public nsICocoaFullScreen
{
public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSICOCOAFULLSCREEN

  nsCocoaFullScreen2();

protected:
  void HideOSChromeOnScreen(PRBool aShouldHide, NSScreen* aScreen);
  nsresult HideWindowChrome(PRBool aShouldHide, nsCocoaWindow* aWindow);

private:
  ~nsCocoaFullScreen2();
};

#endif // NS_COCOA_FULLSCREEN_H_

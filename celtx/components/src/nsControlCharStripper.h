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

#ifndef NS_CONTROL_CHAR_STRIPPER_H_
#define NS_CONTROL_CHAR_STRIPPER_H_ 1

#define NS_CONTROLCHARSTRIPPER_CID          \
{ /* DF1B8502-B069-4157-BE8D-42B6C621CF74 */  \
0xdf1b7502, 0xb069, 0x4157,                   \
{ 0xbe, 0x8d, 0x42, 0xb6, 0xc6, 0x21, 0xcf, 0x74 } }

#define NS_CONTROLCHARSTRIPPER_CONTRACTID "@celtx.com/control-char-stripper;1"

#include "nsIControlCharStripper.h"
#include "nsIConverterInputStream.h"
#include "nsIConverterOutputStream.h"
#include "nsCOMPtr.h"

class nsControlCharStripper : public nsIControlCharStripper {
public:
  nsControlCharStripper () {}
  virtual ~nsControlCharStripper () {}

  NS_DECL_ISUPPORTS

  NS_IMETHOD Init (nsIConverterInputStream* aIStream, nsIConverterOutputStream* aOStream);

  NS_IMETHOD Pump (PRUint32* aResult);

  NS_IMETHOD Close ();

private:
  nsCOMPtr<nsIConverterInputStream> mIStream;
  nsCOMPtr<nsIConverterOutputStream> mOStream;
};

#endif /* NS_CONTROL_CHAR_STRIPPER_H_ */

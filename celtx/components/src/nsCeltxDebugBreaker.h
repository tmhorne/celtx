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

#ifndef NS_CELTX_DEBUG_BREAKER_H_
#define NS_CELTX_DEBUG_BREAKER_H_

#define NS_CELTXDEBUGBREAKER_CID              \
{ /* 269ad6a9-9eb6-412e-98f4-988c1b36d85f */  \
0x269ad6a9, 0x9eb6, 0x412e,                   \
{ 0x98, 0xf4, 0x98, 0x8c, 0x1b, 0x36, 0xd8, 0x5f } }

#define NS_CELTXDEBUGBREAKER_CONTRACTID "@celtx.com/debug-breaker;1"

#include "nsICeltxDebugBreaker.h"

class nsCeltxDebugBreaker : public nsICeltxDebugBreaker
{
public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSICELTXDEBUGBREAKER

  nsCeltxDebugBreaker();

private:
  ~nsCeltxDebugBreaker();
};

#endif /* NS_CELTX_DEBUG_BREAKER_H_ */

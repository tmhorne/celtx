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

#include "nsControlCharStripper.h"

PRBool IsControlChar (PRUnichar aChar);

PRBool IsControlChar (PRUnichar aChar) {
  if (aChar > 0x1F)
    return PR_FALSE;
  if (aChar < 0x0A)
    return PR_TRUE;
  return aChar != 0x0A && aChar != 0x0D;
}

NS_IMPL_ISUPPORTS1(nsControlCharStripper, nsIControlCharStripper)

NS_IMETHODIMP nsControlCharStripper::Init (nsIConverterInputStream* aIStream,
                                         nsIConverterOutputStream* aOStream) {
  NS_ENSURE_ARG(aIStream);
  NS_ENSURE_ARG(aOStream);

  mIStream = aIStream;
  mOStream = aOStream;

  return NS_OK;
}

NS_IMETHODIMP nsControlCharStripper::Pump (PRUint32* aResult) {
  const PRUint32 kBufferSize = 4096;
  PRUnichar buffer[kBufferSize];
  PRUnichar outBuffer[kBufferSize];
  nsresult rv = mIStream->Read(buffer, kBufferSize, aResult);

  if (NS_FAILED(rv)) {
    *aResult = 0;
    return rv;
  }

  if (*aResult == 0)
    return NS_OK;

  PRUint32 written = 0;
  PRUint32 read;
  for (read = 0; read < *aResult; ++read) {
    if (! IsControlChar(buffer[read]))
      outBuffer[written++] = buffer[read];
  }

  if (written > 0) {
    PRBool worked = PR_TRUE;
    rv = mOStream->Write(written, outBuffer, &worked);

    if (NS_FAILED(rv))
      return rv;

    if (! worked)
      return NS_ERROR_FAILURE;
  }

  return NS_OK;
}

NS_IMETHODIMP nsControlCharStripper::Close () {
  mIStream = nsnull;
  mOStream = nsnull;

  return NS_OK;
}

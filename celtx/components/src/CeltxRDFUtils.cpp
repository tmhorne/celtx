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

#include "CeltxRDFUtils.h"

#include "nsIRDFService.h"
#include "nsIRDFContainerUtils.h"
#include "nsString.h"
#include "nsServiceManagerUtils.h"

nsresult
CeltxRDFUtils::GetRDFSeq (nsIRDFDataSource* aDS,
                          nsIRDFResource* aRes,
                          nsIRDFContainer** result) {

  NS_ENSURE_ARG_POINTER(aRes);
  NS_ENSURE_ARG_POINTER(result);

  nsCOMPtr<nsIRDFContainerUtils> cu;
  cu = do_GetService("@mozilla.org/rdf/container-utils;1");
  if (! cu)
    return NS_ERROR_FAILURE;

  PRBool isSeq = PR_FALSE;
  nsresult rv = cu->IsSeq(aDS, aRes, &isSeq);
  if (NS_FAILED(rv))
    return rv;

  if (isSeq) {
    nsCOMPtr<nsIRDFService> rdfsvc
      = do_GetService("@mozilla.org/rdf/rdf-service;1");
    if (! rdfsvc)
      return NS_ERROR_FAILURE;
    nsCOMPtr<nsIRDFResource> nextVal;
    rv = rdfsvc->GetResource(
      NS_LITERAL_CSTRING("http://www.w3.org/1999/02/22-rdf-syntax-ns#nextVal"),
      getter_AddRefs(nextVal));
    if (NS_FAILED(rv))
      return rv;
    nsCOMPtr<nsIRDFLiteral> one;
    rv = rdfsvc->GetLiteral(NS_LITERAL_STRING("1").get(), getter_AddRefs(one));
    if (NS_FAILED(rv))
      return rv;
    PRBool hasArc = PR_FALSE;
    rv = aDS->HasArcOut(aRes, nextVal, &hasArc);
    if (NS_FAILED(rv))
      return rv;
    if (! hasArc) {
      rv = aDS->Assert(aRes, nextVal, one, PR_TRUE);
      if (NS_FAILED(rv))
        return rv;
    }
    nsIRDFContainer* cont = nsnull;
    rv = CallCreateInstance("@mozilla.org/rdf/container;1", &cont);
    if (NS_FAILED(rv) || ! cont)
      return NS_ERROR_FAILURE;
    rv = cont->Init(aDS, aRes);
    if (NS_FAILED(rv)) {
      NS_RELEASE(cont);
      return rv;
    }
    *result = cont;
  }
  else {
    rv = cu->MakeSeq(aDS, aRes, result);
  }

  return rv;
}

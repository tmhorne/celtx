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

#include "NumberingScheme.h"

#include "nsServiceManagerUtils.h"
#include "nsPrintfCString.h"
#include "nsIRDFDataSource.h"
#include "nsIRDFCompositeDataSource.h"
#include "nsIRDFResource.h"
#include "nsIRDFContainer.h"
#include "nsIRDFContainerUtils.h"
#include "nsIRDFService.h"
#include "nsISimpleEnumerator.h"


nsresult
NumberingScheme::Init (nsIRDFDataSource* aDS, nsIRDFResource* aResource)
{
  mComponents.Clear();

  NS_ENSURE_ARG(aDS);
  NS_ENSURE_ARG(aResource);

  mResource = aResource;
  nsresult rv;

  nsCOMPtr<nsIRDFService> rdfsvc(
    do_GetService("@mozilla.org/rdf/rdf-service;1"));

  nsCOMPtr<nsIRDFDataSource> schemads;
  rdfsvc->GetDataSourceBlocking("chrome://celtx/content/schema.rdf",
    getter_AddRefs(schemads));

  nsCOMPtr<nsIRDFCompositeDataSource> compds = do_CreateInstance(
    "@mozilla.org/rdf/datasource;1?name=composite-datasource");
  compds->AddDataSource(schemads);
  compds->AddDataSource(aDS);

  nsCOMPtr<nsIRDFResource> posarc, numarc, prearc, sufarc;
  rdfsvc->GetResource(NS_LITERAL_CSTRING("http://celtx.com/NS/v1/position"),
    getter_AddRefs(posarc));
  rdfsvc->GetResource(NS_LITERAL_CSTRING("http://celtx.com/NS/v1/numbering"),
    getter_AddRefs(numarc));
  rdfsvc->GetResource(NS_LITERAL_CSTRING("http://celtx.com/NS/v1/prefix"),
    getter_AddRefs(prearc));
  rdfsvc->GetResource(NS_LITERAL_CSTRING("http://celtx.com/NS/v1/suffix"),
    getter_AddRefs(sufarc));

  nsCOMPtr<nsIRDFContainer> cont = do_CreateInstance(
    "@mozilla.org/rdf/container;1");
  rv = cont->Init(compds, aResource);
  NS_ENSURE_SUCCESS(rv, rv);

  nsCOMPtr<nsISimpleEnumerator> elements;
  rv = cont->GetElements(getter_AddRefs(elements));
  NS_ENSURE_SUCCESS(rv, rv);
  if (! elements)
    return NS_ERROR_INVALID_ARG;

  PRUint32 processed = 0;
  PRBool hasMore;
  rv = elements->HasMoreElements(&hasMore);
  while (NS_SUCCEEDED(rv) && hasMore) {
    nsCOMPtr<nsISupports> elem;
    rv = elements->GetNext(getter_AddRefs(elem));
    if (NS_FAILED(rv) || ! elem)
      break;

    nsCOMPtr<nsIRDFResource> scheme(do_QueryInterface(elem));
    if (! scheme)
      break;

    nsCOMPtr<nsIRDFNode> posnode, numnode, prenode, sufnode;
    compds->GetTarget(scheme, posarc, PR_TRUE, getter_AddRefs(posnode));
    compds->GetTarget(scheme, numarc, PR_TRUE, getter_AddRefs(numnode));
    compds->GetTarget(scheme, prearc, PR_TRUE, getter_AddRefs(prenode));
    compds->GetTarget(scheme, sufarc, PR_TRUE, getter_AddRefs(sufnode));

    nsCOMPtr<nsIRDFLiteral> numlit(do_QueryInterface(numnode)),
                            poslit(do_QueryInterface(posnode)),
                            prelit(do_QueryInterface(prenode)),
                            suflit(do_QueryInterface(sufnode));

    NumberingComponent component;
    nsXPIDLString position, numbering, prefix, suffix;

    if (numlit)
      numlit->GetValue(getter_Copies(numbering));

    if (numbering.IsEmpty())
      break;

    if (poslit)
      poslit->GetValue(getter_Copies(position));

    if (! position.IsEmpty()) {
      if (position.Equals(NS_LITERAL_STRING("before")))
        component.position = NumberingComponent::BEFORE;
      else if (position.Equals(NS_LITERAL_STRING("after")))
        component.position = NumberingComponent::AFTER;
      else
        break;
    }
    else if (processed > 0)
      break;

    if (numbering.Equals(NS_LITERAL_STRING("number")))
      component.numbering = NumberingComponent::NUMBER;
    else if (numbering.Equals(NS_LITERAL_STRING("letter")))
      component.numbering = NumberingComponent::LETTER;
    else
      break;

    if (prelit)
      prelit->GetValue(getter_Copies(prefix));

    if (! prefix.IsEmpty())
      component.prefix.Assign(prefix);

    if (suflit)
      suflit->GetValue(getter_Copies(suffix));

    if (! suffix.IsEmpty())
      component.suffix.Assign(suffix);

    mComponents.AppendElement(component);
    ++processed;

    rv = elements->HasMoreElements(&hasMore);
  }

  return mComponents.Length() ? NS_OK : NS_ERROR_FAILURE;
}


nsresult
NumberingScheme::SceneNumberToString (PRUint32 aLength,
                                      PRUint32* aSceneNumber,
                                      nsAString& result)
{
  if (mComponents.Length() == 0)
    return NS_ERROR_NOT_INITIALIZED;

  PRUint32 max = mComponents.Length();
  if (max > aLength) max = aLength;

  for (PRUint32 i = 0; i < max; ++i) {
    nsAutoString componentstr;
    if (mComponents[i].numbering == NumberingComponent::NUMBER) {
      componentstr.AppendInt(aSceneNumber[i]);
    }
    else {
      // Build up a PRUnichar* string from back to front
      PRUint32 val = aSceneNumber[i];
      // Even two character should be sufficient (676 possibilities), but
      // we'll allow up to three plus the null terminator.
      PRUnichar numstr[4] = { 0, 0, 0, 0 };
      PRUint32 pos = 3;
      while (val && pos > 0) {
        // Shift [A=1 .. Z=26] to [A=0 .. Z=25]
        PRUnichar c = (PRUnichar) ((val - 1) % 26) + 'A';
        // Skip the null terminator by pre-decrementing
        numstr[--pos] = c;
        val /= 26;
      }
      componentstr.Assign(nsDependentString(&numstr[pos]));
    }

    componentstr = mComponents[i].prefix + componentstr
      + mComponents[i].suffix;

    if (mComponents[i].position == NumberingComponent::PRIMARY)
      result.Assign(componentstr);
    else if (mComponents[i].position == NumberingComponent::BEFORE)
      result.Assign(componentstr + result);
    else
      result.Append(componentstr);
  }

  return NS_OK;
}

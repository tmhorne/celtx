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

#include "nsScriptScene.h"
#include "nsInterfaceHashtable.h"
#include "nsHashKeys.h"
#include "nsHashSets.h"
#include "nsString.h"
#include "nsPrintfCString.h"
#include "nsServiceManagerUtils.h"
#include "nsISupportsPrimitives.h"
#include "nsIDOMNodeList.h"
#include "nsIDOMRange.h"
#include "nsIDOMDocument.h"
#include "nsIDOMDocumentRange.h"
#include "celtxINodeIterator.h"

NS_IMPL_ISUPPORTS1(nsScriptScene, nsIScriptScene)

NS_IMETHODIMP nsScriptScene::Init (nsIRDFDataSource* ds,
                                 nsIRDFResource* sceneres) {
  NS_ENSURE_ARG_POINTER(ds);
  NS_ENSURE_ARG_POINTER(sceneres);

  mDS = ds;
  mSceneres = sceneres;

  nsCOMPtr<nsIRDFService> rdfsvc = do_GetService(
    "@mozilla.org/rdf/rdf-service;1");
  nsCOMPtr<nsIRDFContainerUtils> cu = do_GetService(
    "@mozilla.org/rdf/container-utils;1");

  nsCOMPtr<nsIRDFResource> membersarc;
  rdfsvc->GetResource(NS_LITERAL_CSTRING("http://celtx.com/NS/v1/members"),
    getter_AddRefs(membersarc));

  nsCOMPtr<nsIRDFResource> markuparc;
  rdfsvc->GetResource(NS_LITERAL_CSTRING("http://celtx.com/NS/v1/markup"),
    getter_AddRefs(markuparc));

  nsCOMPtr<nsIRDFNode> membersnode;
  ds->GetTarget(sceneres, membersarc, PR_TRUE, getter_AddRefs(membersnode));
  nsCOMPtr<nsIRDFResource> members(do_QueryInterface(membersnode));
  PRBool isContainer = PR_FALSE;
  if (! members) {
    rdfsvc->GetAnonymousResource(getter_AddRefs(members));
    ds->Assert(sceneres, membersarc, members, true);
  }
  else {
    cu->IsSeq(ds, members, &isContainer);
  }
  if (isContainer) {
    mMembers = do_CreateInstance("@mozilla.org/rdf/container;1");
    mMembers->Init(ds, members);
  }
  else {
    cu->MakeSeq(ds, members, getter_AddRefs(mMembers));
  }

  nsCOMPtr<nsIRDFNode> markupnode;
  ds->GetTarget(sceneres, markuparc, PR_TRUE, getter_AddRefs(markupnode));
  nsCOMPtr<nsIRDFResource> markup(do_QueryInterface(markupnode));
  isContainer = PR_FALSE;
  if (! markup) {
    rdfsvc->GetAnonymousResource(getter_AddRefs(markup));
    ds->Assert(sceneres, markuparc, markup, true);
  }
  else {
    cu->IsSeq(ds, markup, &isContainer);
  }
  if (isContainer) {
    mMarkup = do_CreateInstance("@mozilla.org/rdf/container;1");
    mMarkup->Init(ds, markup);
  }
  else {
    cu->MakeSeq(ds, markup, getter_AddRefs(mMarkup));
  }

  return NS_OK;
}

NS_IMETHODIMP nsScriptScene::ExtractBreakdownFromScene (nsIDOMElement* heading, nsIScriptMarkupValidator* validator) {
  nsCOMPtr<nsIDOMHTMLParagraphElement> para(do_QueryInterface(heading));
  if (! para)
    return NS_ERROR_FAILURE;

  nsCOMPtr<nsIDOMDocument> document;
  heading->GetOwnerDocument(getter_AddRefs(document));
  nsCOMPtr<nsIDOMDocumentRange> rangedoc(do_QueryInterface(document));
  if (! rangedoc)
    return NS_ERROR_FAILURE;

  nsCOMPtr<nsIDOMRange> range;
  rangedoc->CreateRange(getter_AddRefs(range));
  range->SetStartBefore(heading);

  // Go through, paragraph by paragraph, looking for spans and characters
  nsString className;
  do {
    nsCOMPtr<nsIDOMNode> next;
    para->GetNextSibling(getter_AddRefs(next));
    nsCOMPtr<nsIDOMHTMLParagraphElement> nextpara(do_QueryInterface(next));
    while (next && ! nextpara) {
      nsCOMPtr<nsIDOMNode> tmpnext;
      next->GetNextSibling(getter_AddRefs(tmpnext));
      next = tmpnext;
      if (next)
        nextpara = do_QueryInterface(next);
      else
        nextpara = nsnull;
    }

    para = nextpara;
    if (para)
      para->GetClassName(className);
  }
  while (para && ! className.Equals(NS_LITERAL_STRING("sceneheading")));

  if (para) {
    range->SetEndBefore(para);
  }
  else {
    nsCOMPtr<nsIDOMElement> root;
    document->GetDocumentElement(getter_AddRefs(root));
    range->SetEndAfter(root);
  }

  return ExtractBreakdownInRange(range, validator);
}


NS_IMETHODIMP nsScriptScene::ExtractBreakdownInRange (nsIDOMRange* range, nsIScriptMarkupValidator* validator) {
  NS_ENSURE_ARG(range);

  nsCOMPtr<nsIRDFService> rdfsvc = do_GetService(
    "@mozilla.org/rdf/rdf-service;1");

  nsCOMPtr<nsIRDFResource> rdftypearc;
  rdfsvc->GetResource(
    NS_LITERAL_CSTRING("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
    getter_AddRefs(rdftypearc));

  nsCOMPtr<nsIRDFResource> titlearc;
  rdfsvc->GetResource(
    NS_LITERAL_CSTRING("http://purl.org/dc/elements/1.1/title"),
    getter_AddRefs(titlearc));

  nsCOMPtr<nsIRDFResource> chartype;
  rdfsvc->GetResource(NS_LITERAL_CSTRING("http://celtx.com/NS/v1/Cast"),
    getter_AddRefs(chartype));

  // This tracks the items that are marked up in the scene
  nsTHashtable<nsISupportsHashKey> markupSet;
  markupSet.Init();

  // This tracks the characters that are present because they
  // are named in a character paragraph in the scene.
  nsTHashtable<nsISupportsHashKey> charParaSet;
  charParaSet.Init();

  // This maps character names to breakdown items
  nsInterfaceHashtable<nsStringHashKey, nsIRDFResource> charMap;
  charMap.Init();
  // Load up the character name map
  {
    nsCOMPtr<nsISimpleEnumerator> charlist;
    mDS->GetSources(rdftypearc, chartype, PR_TRUE, getter_AddRefs(charlist));
    PRBool hasMore;
    charlist->HasMoreElements(&hasMore);
    while (hasMore) {
      nsCOMPtr<nsISupports> ichar;
      charlist->GetNext(getter_AddRefs(ichar));
      charlist->HasMoreElements(&hasMore);
      nsCOMPtr<nsIRDFResource> charres(do_QueryInterface(ichar));

      nsCOMPtr<nsIRDFNode> charnamelit;
      mDS->GetTarget(charres, titlearc, PR_TRUE, getter_AddRefs(charnamelit));
      nsString charname;
      validator->GetCanonicalNameFromLit(charnamelit, charname);
      charMap.Put(charname, charres);
    }
  }

  mDS->BeginUpdateBatch();

  nsCOMPtr<nsIDOMNode> start;
  range->GetStartContainer(getter_AddRefs(start));
  PRBool hasChildren;
  start->HasChildNodes(&hasChildren);
  if (hasChildren) {
    nsCOMPtr<nsIDOMNodeList> children;
    start->GetChildNodes(getter_AddRefs(children));
    PRUint32 length;
    children->GetLength(&length);
    PRInt32 startOffset;
    range->GetStartOffset(&startOffset);
    if (startOffset < 0)
      return NS_ERROR_INVALID_ARG;
    PRUint32 startOffsetU = startOffset;
    if (startOffsetU > length)
      return NS_ERROR_INVALID_ARG;
    else if (startOffsetU < length)
      children->Item(startOffsetU, getter_AddRefs(start));
  }

  nsCOMPtr<celtxINodeIterator> iter(
    do_CreateInstance("@celtx.com/dom/iterator;1"));
  if (! iter)
    return NS_ERROR_UNEXPECTED;
  nsresult rv = iter->Init(start, range);
  NS_ENSURE_SUCCESS(rv, rv);

  // Look for character paragraphs and span elements
  nsString className;
  nsString nodeName;
  nsCOMPtr<nsIDOMNode> node;
  do {
    iter->NextNode(getter_AddRefs(node));
    nsCOMPtr<nsIDOMHTMLElement> htmlelement(do_QueryInterface(node));
    if (! htmlelement)
      continue;

    htmlelement->GetClassName(className);
    if (className.Equals(NS_LITERAL_STRING("character"))) {
      nsString charname;
      validator->GetCanonicalCharacterName(node, charname);
      nsCOMPtr<nsIRDFResource> charres;
      charMap.Get(charname, getter_AddRefs(charres));
      if (charres)
        charParaSet.PutEntry(charres);
    }

    node->GetNodeName(nodeName);
    if (nodeName.Equals(NS_LITERAL_STRING("span")) ||
        nodeName.Equals(NS_LITERAL_STRING("SPAN"))) {
      nsCOMPtr<nsIDOMElement> span(do_QueryInterface(node));
      // Ignore spans without ref attributes
      PRBool hasref;
      span->HasAttribute(NS_LITERAL_STRING("ref"), &hasref);
      if (! hasref)
        continue;

      // Ignore spans that don't mark visible text
      PRBool isWhitespaceOnly;
      validator->IsWhitespaceOnly(node, &isWhitespaceOnly);
      if (isWhitespaceOnly)
        continue;

      nsString ref;
      span->GetAttribute(NS_LITERAL_STRING("ref"), ref);
      nsCOMPtr<nsIRDFResource> itemres;
      rdfsvc->GetResource(NS_ConvertUTF16toUTF8(ref), getter_AddRefs(itemres));

      // Ignore refs that refer to non-existent breakdown items
      PRBool hastype;
      mDS->HasArcOut(itemres, rdftypearc, &hastype);
      if (! hastype)
        continue;

      // Ignore breakdown items without titles
      PRBool hastitle;
      mDS->HasArcOut(itemres, titlearc, &hastitle);
      if (! hastitle)
        continue;

      AddItem(itemres, PR_TRUE);
      AddToMarkup(itemres);
      markupSet.PutEntry(itemres);
    }
  }
  while (node);

  // Strip out any items that were previously in the markup list, but
  // are no longer marked up (or named in a character paragraph)
  nsCOMPtr<nsISimpleEnumerator> markupenum;
  mMarkup->GetElements(getter_AddRefs(markupenum));
  PRBool hasMore;
  markupenum->HasMoreElements(&hasMore);
  while (hasMore) {
    nsCOMPtr<nsISupports> iitem;
    markupenum->GetNext(getter_AddRefs(iitem));
    markupenum->HasMoreElements(&hasMore);

    nsCOMPtr<nsIRDFResource> itemres(do_QueryInterface(iitem));
    if (! markupSet.GetEntry(itemres) && ! charParaSet.GetEntry(itemres)) {
      RemoveFromMarkup(itemres);
      RemoveItem(itemres);
    }
  }

  // Update all the department sequence sizes
  nsCOMPtr<nsISimpleEnumerator> deptenum;
  mMembers->GetElements(getter_AddRefs(deptenum));
  deptenum->HasMoreElements(&hasMore);
  while (hasMore) {
    nsCOMPtr<nsISupports> idept;
    deptenum->GetNext(getter_AddRefs(idept));
    deptenum->HasMoreElements(&hasMore);

    nsCOMPtr<nsIRDFResource> deptseqres(do_QueryInterface(idept));
    nsCOMPtr<nsIRDFContainer> deptseq = do_CreateInstance("@mozilla.org/rdf/container;1");
    deptseq->Init(mDS, deptseqres);
    UpdateSeqSize(deptseq);
  }

  mDS->EndUpdateBatch();

  return NS_OK;
}

NS_IMETHODIMP nsScriptScene::AddItem (nsIRDFResource* itemres, PRBool suppressSizeUpdate) {
  NS_ENSURE_ARG(itemres);

  nsCOMPtr<nsIRDFService> rdfsvc = do_GetService(
    "@mozilla.org/rdf/rdf-service;1");

  nsCOMPtr<nsIRDFResource> typearc;
  rdfsvc->GetResource(
    NS_LITERAL_CSTRING("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
    getter_AddRefs(typearc));

  nsCOMPtr<nsIRDFNode> typenode;
  mDS->GetTarget(itemres, typearc, PR_TRUE, getter_AddRefs(typenode));
  nsCOMPtr<nsIRDFResource> type(do_QueryInterface(typenode));
  if (! type)
    return NS_ERROR_FAILURE;

  nsCOMPtr<nsIRDFContainer> deptseq;
  GetDeptSequence(type, PR_TRUE, getter_AddRefs(deptseq));
  PRInt32 index;
  deptseq->IndexOf(itemres, &index);
  if (index < 0) {
    deptseq->AppendElement(itemres);
    UpdateSeqSize(deptseq);
  }

  return NS_OK;
}

NS_IMETHODIMP nsScriptScene::RemoveItem (nsIRDFResource* itemres) {
  NS_ENSURE_ARG(itemres);

  nsCOMPtr<nsIRDFService> rdfsvc = do_GetService(
    "@mozilla.org/rdf/rdf-service;1");

  nsCOMPtr<nsIRDFResource> typearc;
  rdfsvc->GetResource(
    NS_LITERAL_CSTRING("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
    getter_AddRefs(typearc));

  nsCOMPtr<nsIRDFNode> typenode;
  mDS->GetTarget(itemres, typearc, PR_TRUE, getter_AddRefs(typenode));
  nsCOMPtr<nsIRDFResource> type(do_QueryInterface(typenode));
  if (! type)
    return NS_ERROR_FAILURE;

  nsCOMPtr<nsIRDFContainer> deptseq;
  GetDeptSequence(type, PR_FALSE, getter_AddRefs(deptseq));
  if (! deptseq)
    return NS_OK;

  deptseq->RemoveElement(itemres, PR_TRUE);
  PRInt32 count;
  deptseq->GetCount(&count);

  if (count == 0) {
    // It's empty, remove it
    nsCOMPtr<nsIRDFResource> seqres;
    deptseq->GetResource(getter_AddRefs(seqres));
    mMembers->RemoveElement(seqres, PR_TRUE);
  }
  else {
    UpdateSeqSize(deptseq);
  }

  return NS_OK;
}

NS_IMETHODIMP nsScriptScene::ContainsItem (nsIRDFResource* itemres,
                                         PRBool* result) {
  NS_ENSURE_ARG(itemres);

  nsCOMPtr<nsIRDFService> rdfsvc = do_GetService(
    "@mozilla.org/rdf/rdf-service;1");

  nsCOMPtr<nsIRDFResource> typearc;
  rdfsvc->GetResource(
    NS_LITERAL_CSTRING("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
    getter_AddRefs(typearc));

  nsCOMPtr<nsIRDFNode> typenode;
  mDS->GetTarget(itemres, typearc, PR_TRUE, getter_AddRefs(typenode));
  nsCOMPtr<nsIRDFResource> type(do_QueryInterface(typenode));
  if (! type)
    return NS_ERROR_FAILURE;

  nsCOMPtr<nsIRDFContainer> deptseq;
  GetDeptSequence(type, PR_FALSE, getter_AddRefs(deptseq));
  if (! deptseq) {
    *result = PR_FALSE;
    return NS_OK;
  }

  PRInt32 index;
  deptseq->IndexOf(itemres, &index);
  *result = index >= 0;

  return NS_OK;
}

NS_IMETHODIMP nsScriptScene::AddToMarkup (nsIRDFResource* itemres) {
  PRInt32 index;
  mMarkup->IndexOf(itemres, &index);
  if (index < 0)
    mMarkup->AppendElement(itemres);
  return NS_OK;
}

NS_IMETHODIMP nsScriptScene::RemoveFromMarkup (nsIRDFResource* itemres) {
  mMarkup->RemoveElement(itemres, PR_TRUE);
  return NS_OK;
}

NS_IMETHODIMP nsScriptScene::ContainsInMarkup (nsIRDFResource* itemres,
                                             PRBool* result) {
  PRInt32 index;
  mMarkup->IndexOf(itemres, &index);
  *result = index >= 0;
  return NS_OK;
}

NS_IMETHODIMP nsScriptScene::GetDeptSequence (nsIRDFResource* deptres,
                                            PRBool force,
                                            nsIRDFContainer** result) {
  nsCOMPtr<nsIRDFService> rdfsvc = do_GetService(
    "@mozilla.org/rdf/rdf-service;1");
  nsCOMPtr<nsIRDFContainerUtils> cu = do_GetService(
    "@mozilla.org/rdf/container-utils;1");

  nsCOMPtr<nsIRDFResource> typearc;
  rdfsvc->GetResource(
    NS_LITERAL_CSTRING("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
    getter_AddRefs(typearc));

  nsCOMPtr<nsIRDFResource> deptlisttype;
  rdfsvc->GetResource(
    NS_LITERAL_CSTRING("http://celtx.com/NS/v1/DepartmentList"),
    getter_AddRefs(deptlisttype));

  nsCOMPtr<nsIRDFResource> deptarc;
  rdfsvc->GetResource(
    NS_LITERAL_CSTRING("http://celtx.com/NS/v1/department"),
    getter_AddRefs(deptarc));

  nsCOMPtr<nsISimpleEnumerator> elems;
  mMembers->GetElements(getter_AddRefs(elems));
  PRBool hasMore;
  elems->HasMoreElements(&hasMore);
  while (hasMore) {
    nsCOMPtr<nsISupports> ilist;
    elems->GetNext(getter_AddRefs(ilist));
    nsCOMPtr<nsIRDFResource> list(do_QueryInterface(ilist));

    elems->HasMoreElements(&hasMore);

    nsCOMPtr<nsIRDFNode> dept;
    mDS->GetTarget(list, deptarc, true, getter_AddRefs(dept));
    if (! dept)
      continue;

    PRBool equals;
    deptres->EqualsNode(dept, &equals);
    if (! equals)
      continue;

    PRBool isSeq;
    cu->IsSeq(mDS, list, &isSeq);
    if (isSeq) {
      // *result = do_CreateInstance("@mozilla.org/rdf/container;1");
      // NS_NewRDFContainer(result);
      CallCreateInstance("@mozilla.org/rdf/container;1", result);
      if (*result)
        (*result)->Init(mDS, list);
    }
    else {
      cu->MakeSeq(mDS, list, result);
    }
    return NS_OK;
  }

  if (! force) {
    *result = nsnull;
    return NS_OK;
  }

  nsCOMPtr<nsIRDFResource> list;
  rdfsvc->GetAnonymousResource(getter_AddRefs(list));
  mDS->Assert(list, deptarc, deptres, PR_TRUE);
  mDS->Assert(list, typearc, deptlisttype, PR_TRUE);
  cu->MakeSeq(mDS, list, result);
  mMembers->AppendElement(list);

  return NS_OK;
}

NS_IMETHODIMP nsScriptScene::UpdateSeqSize (nsIRDFContainer* seq) {
  PRInt32 count;
  nsresult rv = seq->GetCount(&count);
  if (NS_FAILED(rv)) {
    printf("*** GetCount failed in UpdateSeqSize!\n");
    return rv;
  }
  nsPrintfCString sizestr("%d", count);
  nsAutoString countstr;
  CopyASCIItoUTF16(sizestr, countstr);

  nsCOMPtr<nsIRDFResource> seqres;
  seq->GetResource(getter_AddRefs(seqres));

  nsCOMPtr<nsIRDFService> rdfsvc = do_GetService(
    "@mozilla.org/rdf/rdf-service;1");
  nsCOMPtr<nsIRDFResource> sizearc;
  rdfsvc->GetResource(NS_LITERAL_CSTRING("http://celtx.com/NS/v1/size"),
    getter_AddRefs(sizearc));

  nsCOMPtr<nsIRDFLiteral> sizelit;
  rdfsvc->GetLiteral(PromiseFlatString(countstr).get(),
    getter_AddRefs(sizelit));

  nsCOMPtr<nsIRDFNode> oldsize;
  mDS->GetTarget(seqres, sizearc, PR_TRUE, getter_AddRefs(oldsize));
  if (oldsize)
    mDS->Change(seqres, sizearc, oldsize, sizelit);
  else
    mDS->Assert(seqres, sizearc, sizelit, PR_TRUE);

  return NS_OK;
}

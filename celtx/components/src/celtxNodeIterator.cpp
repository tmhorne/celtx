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

#include "celtxNodeIterator.h"
#include "nsDOMError.h"
#include "nsIDOMDocument.h"
#include "nsIDOMElement.h"
#include "nsIDOMNodeList.h"

NS_IMPL_ISUPPORTS1(celtxNodeIterator, celtxINodeIterator)

celtxNodeIterator::celtxNodeIterator ()
: mCurrentNode(nsnull), mRange(nsnull), mFirst(nsnull), mLast(nsnull)
{
}

/* void init (in nsIDOMNode start, in nsIDOMNode range); */
NS_IMETHODIMP celtxNodeIterator::Init(nsIDOMNode *start, nsIDOMRange* range)
{
  NS_ENSURE_FALSE(mFirst, NS_ERROR_ALREADY_INITIALIZED);
  NS_ENSURE_ARG(start);

  mContainsLast = PR_FALSE;
  mCurrentNode = start;
  mRange = range;
  if (! range) {
    // In document order traversal, the first node is the root element and
    // the last node is past the end of the right-most descendant, which we
    // mark as null
    nsCOMPtr<nsIDOMDocument> document;
    start->GetOwnerDocument(getter_AddRefs(document));
    nsCOMPtr<nsIDOMElement> root;
    document->GetDocumentElement(getter_AddRefs(root));
    mFirst = root;
    mLast = nsnull;
    return NS_OK;
  }

  PRBool collapsed;
  nsresult rv = range->GetCollapsed(&collapsed);
  NS_ENSURE_SUCCESS(rv, rv);
  NS_ENSURE_FALSE(collapsed, NS_ERROR_INVALID_ARG);

  // Get the endpoints
  nsCOMPtr<nsIDOMNode> startNode, endNode;
  PRInt32 startOffset, endOffset;
  range->GetStartContainer(getter_AddRefs(startNode));
  range->GetStartOffset(&startOffset);
  range->GetEndContainer(getter_AddRefs(endNode));
  range->GetEndOffset(&endOffset);

  if (startOffset < 0 || endOffset < 0)
    return NS_ERROR_DOM_RANGE_BAD_BOUNDARYPOINTS_ERR;

  PRBool startHasChildren, endHasChildren;
  rv = startNode->HasChildNodes(&startHasChildren);
  NS_ENSURE_SUCCESS(rv, rv);
  rv = endNode->HasChildNodes(&endHasChildren);
  NS_ENSURE_SUCCESS(rv, rv);

  /*
   * Check that the start is within the specified range.
   * If one of the end points is a text node, and it's only partially
   * selected, then the starting node won't match against it based on
   * a range end-point comparison. We don't perform a boundary point
   * comparison on the range in that case.
   */
  if ((startHasChildren || start != startNode) &&
      (endHasChildren || start != endNode)) {
    nsCOMPtr<nsIDOMRange> startRange;
    rv = range->CloneRange(getter_AddRefs(startRange));
    NS_ENSURE_SUCCESS(rv, rv);

    startRange->SetStartBefore(start);
    startRange->SetEndAfter(start);
    PRInt16 compareResult;
    rv = range->CompareBoundaryPoints(nsIDOMRange::START_TO_START, startRange,
      &compareResult);
    NS_ENSURE_SUCCESS(rv, rv);
    if (compareResult > 0)
      return NS_ERROR_DOM_RANGE_BAD_BOUNDARYPOINTS_ERR;

    rv = range->CompareBoundaryPoints(nsIDOMRange::END_TO_END, startRange,
      &compareResult);
    NS_ENSURE_SUCCESS(rv, rv);
    if (compareResult < 0)
      return NS_ERROR_DOM_RANGE_BAD_BOUNDARYPOINTS_ERR;
  }

  // Find the nodes corresponding to the actual start and end, rather than
  // their containers
  PRUint32 startOffsetU = startOffset;
  PRUint32 endOffsetU = endOffset;

  PRBool hasChildren;
  if (NS_SUCCEEDED(startNode->HasChildNodes(&hasChildren)) && hasChildren) {
    nsCOMPtr<nsIDOMNodeList> children;
    startNode->GetChildNodes(getter_AddRefs(children));
    PRUint32 length;
    children->GetLength(&length);
    if (startOffsetU > length)
      return NS_ERROR_DOM_RANGE_BAD_BOUNDARYPOINTS_ERR;
    else if (startOffsetU == length)
      mFirst = startNode;
    else
      children->Item(startOffset, getter_AddRefs(mFirst));
  }
  else {
    mFirst = startNode;
  }
  if (NS_SUCCEEDED(endNode->HasChildNodes(&hasChildren)) && hasChildren) {
    nsCOMPtr<nsIDOMNodeList> children;
    endNode->GetChildNodes(getter_AddRefs(children));
    PRUint32 length;
    children->GetLength(&length);
    if (endOffsetU > length) {
      mFirst = nsnull;
      return NS_ERROR_DOM_RANGE_BAD_BOUNDARYPOINTS_ERR;
    }
    else if (endOffsetU == length) {
      nsCOMPtr<nsIDOMNode> parent = endNode;
      mLast = nsnull;
      while (parent) {
        nsCOMPtr<nsIDOMNode> sibling;
        parent->GetNextSibling(getter_AddRefs(sibling));
        if (sibling) {
          mLast = sibling;
          break;
        }
        nsCOMPtr<nsIDOMNode> tmp = parent;
        tmp->GetParentNode(getter_AddRefs(parent));
      }
    }
    else
      children->Item(endOffset, getter_AddRefs(mLast));
  }
  else {
    mLast = endNode;
    mContainsLast = PR_TRUE;
  }

  return NS_OK;
}

/* nsIDOMNode nextNode (); */
NS_IMETHODIMP celtxNodeIterator::NextNode(nsIDOMNode **_retval)
{
  NS_ENSURE_TRUE(mFirst, NS_ERROR_NOT_INITIALIZED);
  NS_ENSURE_ARG_POINTER(_retval);

  if (! mContainsLast && mLast && mCurrentNode == mLast) {
    *_retval = nsnull;
    return NS_OK;
  }

  *_retval = mCurrentNode;
  NS_IF_ADDREF(*_retval);

  // The iterator position is always either pointing at a valid node or it
  // is pointing at the (possibly null) end node, which is considered one
  // past the end
  if (! mCurrentNode || mCurrentNode == mLast) {
    mCurrentNode = nsnull;
    return NS_OK;
  }

  /*
   * In document order (i.e., preorder) traversal, you visit the node,
   * then its child nodes. That means once you've visited all of a node's
   * child nodes, the next node to visit is the node's next sibling, and
   * this is true recursively, so we just ascending until we find an
   * ancestor with a non-null nextSibling or we hit the top of the tree.
   */
  nsCOMPtr<nsIDOMNode> node;
  nsresult rv = mCurrentNode->GetFirstChild(getter_AddRefs(node));
  NS_ENSURE_SUCCESS(rv, rv);
  if (node) {
    mCurrentNode = node;
  }
  else {
    while (mCurrentNode) {
      rv = mCurrentNode->GetNextSibling(getter_AddRefs(node));
      NS_ENSURE_SUCCESS(rv, rv);
      if (node) {
        mCurrentNode = node;
        break;
      }
      rv = mCurrentNode->GetParentNode(getter_AddRefs(node));
      NS_ENSURE_SUCCESS(rv, rv);
      mCurrentNode = node;
    }
  }

  return rv;
}

/* nsIDOMNode previousNode (); */
NS_IMETHODIMP celtxNodeIterator::PreviousNode(nsIDOMNode **_retval)
{
  NS_ENSURE_TRUE(mFirst, NS_ERROR_NOT_INITIALIZED);
  NS_ENSURE_ARG_POINTER(_retval);

  if (mCurrentNode == mFirst) {
    *_retval = nsnull;
    return NS_OK;
  }
  else if (! mCurrentNode) {
    // Special case for when range extends to the end of the document,
    // or no range was specified
    nsCOMPtr<nsIDOMDocument> document;
    mFirst->GetOwnerDocument(getter_AddRefs(document));
    nsCOMPtr<nsIDOMElement> node;
    document->GetDocumentElement(getter_AddRefs(node));
    nsCOMPtr<nsIDOMNode> child;
    mLast->GetLastChild(getter_AddRefs(child));
    while (child) {
      mLast = child;
      mLast->GetLastChild(getter_AddRefs(child));
    }
    *_retval = mCurrentNode = mLast;
    NS_ADDREF(*_retval);
    return NS_OK;
  }

  /*
   * In reverse document order (i.e., reverse preorder) traversal, you visit
   * the child nodes (from last to first) then the node itself. That means
   * once you've visited all of a node's child nodes, you visit the
   * right-most descendant of the node's previous sibling (or the sibling
   * itself if it has no child nodes). If there is no previous sibling, then
   * you visit the parent node.
   */
  nsCOMPtr<nsIDOMNode> node;
  nsresult rv = mCurrentNode->GetPreviousSibling(getter_AddRefs(node));
  NS_ENSURE_SUCCESS(rv, rv);
  if (! node) {
    rv = mCurrentNode->GetParentNode(getter_AddRefs(node));
    if (NS_SUCCEEDED(rv)) {
      *_retval = mCurrentNode = node;
      NS_IF_ADDREF(*_retval);
    }
    return rv;
  }

  mCurrentNode = node;
  rv = mCurrentNode->GetLastChild(getter_AddRefs(node));
  while (NS_SUCCEEDED(rv) && node) {
    mCurrentNode = node;
    rv = mCurrentNode->GetLastChild(getter_AddRefs(node));
  }
  if (NS_SUCCEEDED(rv)) {
    // Guaranteed non-null
    *_retval = mCurrentNode;
    NS_ADDREF(*_retval);
  }

  return rv;
}

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

#include "nsScriptPaginator.h"
#include "nsIDOMDocument.h"
#include "nsIDOMText.h"
#include "nsIDOMHTMLDocument.h"
#include "nsIDOMHTMLParagraphElement.h"
#include "nsIDOMNSHTMLElement.h"
#include "nsIDOMXPathEvaluator.h"
#include "nsIDOMXPathResult.h"
#include "nsIFontEnumerator.h"
#include "nsServiceManagerUtils.h"
#include "nsIFontMetrics.h"
#include "nsIDocShell.h"
#include "nsPresContext.h"
// #include "nsUnitConversion.h"
#include "stdio.h"

NS_IMPL_ISUPPORTS1(nsScriptPaginator, nsIScriptPaginator)

nsScriptPaginator::nsScriptPaginator ()
: mEditor(nsnull), mScript(nsnull), mNextPageStartsAt(nsnull),
  mCurPageBreakNum(0), mUpdateCount(0), mLastPaginationEnded(0),
  mPageCount(1), mLinesPerPage(52), mFontSize(10), mModificationCount(-1) {
}

nsScriptPaginator::~nsScriptPaginator () {
}

NS_IMETHODIMP nsScriptPaginator::Init (nsIScriptEditor* aEditor) {
  NS_ENSURE_ARG(aEditor);

  mEditor = aEditor;
  nsresult rv = mEditor->GetContentDocument(getter_AddRefs(mScript));
  if (! mScript)
    return NS_ERROR_UNEXPECTED;
  return rv;
}

NS_IMETHODIMP nsScriptPaginator::GetPageCount (PRInt32* aPageCount) {
  *aPageCount = mPageCount;
  return NS_OK;
}

NS_IMETHODIMP nsScriptPaginator::GetLinesPerPage (PRInt32* aLinesPerPage) {
  *aLinesPerPage = mLinesPerPage;
  return NS_OK;
}

NS_IMETHODIMP nsScriptPaginator::SetLinesPerPage (PRInt32 aLinesPerPage) {
  mLinesPerPage = aLinesPerPage;
  return NS_OK;
}

NS_IMETHODIMP nsScriptPaginator::GetFontSize (PRInt32* aFontSize) {
  *aFontSize = mFontSize;
  return NS_OK;
}

NS_IMETHODIMP nsScriptPaginator::SetFontSize (PRInt32 aFontSize) {
  mFontSize = aFontSize;
  return NS_OK;
}

NS_IMETHODIMP nsScriptPaginator::ResetCache () {
  mNextPageStartsAt = nsnull;
  mPageBreakOffsets.Clear();
  mCurPageBreakNum = 0;
  mUpdateCount = 0;
  return NS_OK;
}

NS_IMETHODIMP nsScriptPaginator::CacheExistingPageBreaks () {
  nsCOMPtr<nsIDOMXPathEvaluator> xpe = do_CreateInstance(
    "@mozilla.org/dom/xpath-evaluator;1");
  nsCOMPtr<nsIDOMXPathResult> result;
  nsresult rv = xpe->Evaluate(
    NS_LITERAL_STRING("//div[@class='softbreak' or @class='hardbreak']"),
    mScript, nsnull, nsIDOMXPathResult::ORDERED_NODE_SNAPSHOT_TYPE, nsnull,
    getter_AddRefs(result));
  if (NS_FAILED(rv))
    return rv;
  PRUint32 length = 0;
  rv = result->GetSnapshotLength(&length);
  if (NS_FAILED(rv))
    return rv;
  mPageBreakOffsets.SetLength(length);
  nsCOMPtr<nsIDOMNode> node;
  nsCOMPtr<nsIDOMNSHTMLElement> pagebreak;
  PRInt32 offset = 0;
  for (PRUint32 i = 0; i < length; ++i) {
    rv = result->SnapshotItem(i, getter_AddRefs(node));
    if (NS_FAILED(rv))
      return rv;
    pagebreak = do_QueryInterface(node);
    if (! pagebreak)
      continue;
    rv = pagebreak->GetOffsetTop(&offset);
    if (NS_FAILED(rv))
      return rv;
    mPageBreakOffsets[i] = (PRUint32) offset;
  }
  return NS_OK;
}

NS_IMETHODIMP nsScriptPaginator::AdjustPageBreaks () {
  // Update less frequently if we're not in the middle of pagination
  if ((mUpdateCount++ % 5) != 0 && ! mNextPageStartsAt)
    return NS_OK;

  PRInt32 modificationCount;
  mEditor->GetModificationCount(&modificationCount);
  if (modificationCount == mModificationCount)
    return NS_OK;

  mModificationCount = modificationCount;

  nsCOMPtr<nsIDOMXPathEvaluator> xpe = do_CreateInstance(
    "@mozilla.org/dom/xpath-evaluator;1");
  nsCOMPtr<nsIDOMXPathResult> result;
  nsresult rv = xpe->Evaluate(
    NS_LITERAL_STRING("//div[@class='softbreak' or @class='hardbreak']"),
    mScript, nsnull, nsIDOMXPathResult::ORDERED_NODE_ITERATOR_TYPE, nsnull,
    getter_AddRefs(result));
  if (NS_FAILED(rv))
    return rv;

  // |lastbreak| stores the last known correct page break
  nsCOMPtr<nsIDOMNSHTMLElement> lastbreak;
  nsCOMPtr<nsIDOMNSHTMLElement> pagebreak;
  PRUint32 breaknum = 0;

  // Determine where the first adjustment needs to be made
  nsCOMPtr<nsIDOMNode> cursor;
  rv = result->IterateNext(getter_AddRefs(cursor));
  while (NS_SUCCEEDED(rv) && cursor) {
    pagebreak = do_QueryInterface(cursor);
    if (pagebreak) {
      PRInt32 offset = 0;
      pagebreak->GetOffsetTop(&offset);
      if (breaknum >= mPageBreakOffsets.Length() || 
          PRUint32(offset) != mPageBreakOffsets[breaknum])
        break;
      lastbreak = pagebreak;
      ++breaknum;
    }
    rv = result->IterateNext(getter_AddRefs(cursor));
  }
  if (NS_FAILED(rv))
    return rv;

  // We're starting from scratch, might as well confirm font metrics
  if (! mNextPageStartsAt)
    CalculateFontMetrics();

  // Adjust all the way to the end, or until enough time has passed
  if (lastbreak) {
    nsCOMPtr<nsIDOMNode> lastbreaknode(do_QueryInterface(lastbreak));
    lastbreaknode->GetNextSibling(getter_AddRefs(cursor));
  }
  else {
    nsCOMPtr<nsIDOMHTMLDocument> hdoc(do_QueryInterface(mScript));
    nsCOMPtr<nsIDOMHTMLElement> body;
    hdoc->GetBody(getter_AddRefs(body));
    body->GetFirstChild(getter_AddRefs(cursor));
  }
  PRUint16 nodeType = 0;
  while (cursor) {
    cursor->GetNodeType(&nodeType);
    if (nodeType == nsIDOMNode::ELEMENT_NODE)
      break;
    nsCOMPtr<nsIDOMNode> tmp;
    cursor->GetNextSibling(getter_AddRefs(tmp));
    cursor = tmp;
  }
  mNextPageStartsAt = cursor;
  mCurPageBreakNum = breaknum;

  nsTime start;
  nsTime end = start + nsTime(500000);

  mEditor->BeginTransaction();
  while (mNextPageStartsAt && nsTime() < end) {
    AdjustNextPageBreak();
  }
  mEditor->EndTransaction();

  mPageCount = mPageBreakOffsets.Length() + 1;

  mLastPaginationEnded = nsTime();

  return NS_OK;
}

NS_IMETHODIMP nsScriptPaginator::AdjustSynchronously () {
  nsCOMPtr<nsIDOMXPathEvaluator> xpe = do_CreateInstance(
    "@mozilla.org/dom/xpath-evaluator;1");
  nsCOMPtr<nsIDOMXPathResult> result;
  nsresult rv = xpe->Evaluate(
    NS_LITERAL_STRING("//div[@class='softbreak' or @class='hardbreak']"),
    mScript, nsnull, nsIDOMXPathResult::ORDERED_NODE_ITERATOR_TYPE, nsnull,
    getter_AddRefs(result));
  if (NS_FAILED(rv))
    return rv;

  nsCOMPtr<nsIDOMNSHTMLElement> lastbreak;
  nsCOMPtr<nsIDOMNSHTMLElement> pagebreak;
  nsCOMPtr<nsIDOMNode> cursor;
  PRUint32 breaknum = 0;

  rv = result->IterateNext(getter_AddRefs(cursor));
  while (NS_SUCCEEDED(rv) && cursor) {
    pagebreak = do_QueryInterface(cursor);
    if (pagebreak) {
      PRInt32 offset = 0;
      pagebreak->GetOffsetTop(&offset);
      if (breaknum >= mPageBreakOffsets.Length() || 
          PRUint32(offset) != mPageBreakOffsets[breaknum])
        break;
      lastbreak = pagebreak;
      ++breaknum;
    }
    rv = result->IterateNext(getter_AddRefs(cursor));
  }
  if (NS_FAILED(rv))
    return rv;

  CalculateFontMetrics();

  // Adjust from the last valid page break (or the start) onwards
  if (lastbreak) {
    nsCOMPtr<nsIDOMNode> lastbreaknode(do_QueryInterface(lastbreak));
    lastbreaknode->GetNextSibling(getter_AddRefs(cursor));
  }
  else {
    nsCOMPtr<nsIDOMHTMLDocument> hdoc(do_QueryInterface(mScript));
    hdoc->GetFirstChild(getter_AddRefs(cursor));
  }
  PRUint16 nodeType = 0;
  while (cursor) {
    cursor->GetNodeType(&nodeType);
    if (nodeType == nsIDOMNode::ELEMENT_NODE)
      break;
    nsCOMPtr<nsIDOMNode> tmp;
    cursor->GetNextSibling(getter_AddRefs(tmp));
    cursor = tmp;
  }
  mNextPageStartsAt = cursor;
  mCurPageBreakNum = breaknum;

  mEditor->BeginTransaction();
  while (mNextPageStartsAt)
    AdjustNextPageBreak();
  mEditor->EndTransaction();

  mPageCount = mPageBreakOffsets.Length() + 1;

  mLastPaginationEnded = nsTime();

  return NS_OK;
}

PRBool nsScriptPaginator::CanBreakBeforeNode (nsIDOMNode* node) {
  PRUint16 nodeType = 0;
  nsresult rv = node->GetNodeType(&nodeType);
  if (NS_FAILED(rv) || nodeType != nsIDOMNode::ELEMENT_NODE)
    return false;

  nsCOMPtr<nsIDOMNode> left;
  nsCOMPtr<nsIDOMHTMLParagraphElement> para;
  rv = node->GetPreviousSibling(getter_AddRefs(left));
  if (NS_FAILED(rv))
    return false;

  while (left) {
    rv = left->GetNodeType(&nodeType);
    if (NS_FAILED(rv))
      return false;
    para = do_QueryInterface(left);
    if (para)
      break;
    nsCOMPtr<nsIDOMNode> tmp;
    rv = left->GetPreviousSibling(getter_AddRefs(tmp));
    if (NS_FAILED(rv))
      return false;
    left = tmp;
  }
  if (! left)
    return false;

  nsString className;
  rv = para->GetAttribute(NS_LITERAL_STRING("class"),
    className);
  if (NS_FAILED(rv))
    return false;
  if (className.Equals(NS_LITERAL_STRING("sceneheading")) ||
      className.Equals(NS_LITERAL_STRING("character")) ||
      className.Equals(NS_LITERAL_STRING("parenthetical")))
    return false;

  return true;
}

void nsScriptPaginator::AdjustNextPageBreak () {
  NS_NAMED_LITERAL_STRING(kClassStr, "class");
  NS_NAMED_LITERAL_STRING(kSoftBreakStr, "softbreak");
  NS_NAMED_LITERAL_STRING(kHardBreakStr, "hardbreak");
  NS_NAMED_LITERAL_STRING(kActStr, "act");
  NS_NAMED_LITERAL_STRING(kDivStr, "div");
  // Allow an extra line per page to accommodate bottom margins
  const PRInt32 kPageHeight = PRInt32(mLineHeight * (mLinesPerPage + 1));

  nsCOMPtr<nsIDOMNode> node = mNextPageStartsAt;
  if (! node) {
    nsCOMPtr<nsIDOMHTMLDocument> hdoc(do_QueryInterface(mScript));
    nsCOMPtr<nsIDOMHTMLElement> body;
    hdoc->GetBody(getter_AddRefs(body));
    if (! body) {
      return;
    }
    body->GetFirstChild(getter_AddRefs(node));
    mCurPageBreakNum = 0;
    if (! node) {
      return;
    }
  }

  nsCOMPtr<nsIDOMNSHTMLElement> element(do_QueryInterface(node));
  if (! element)
    return;

  PRInt32 offset = 0;
  element->GetOffsetTop(&offset);
  PRUint32 pageEnd = PRUint32(offset + kPageHeight);
  nsCOMPtr<nsIDOMNSHTMLElement> innerBreak(nsnull);

  // Adjust for height of page break if we start at one
  nsString className;
  {
    nsCOMPtr<nsIDOMElement> elemnode(do_QueryInterface(node));
    elemnode->GetAttribute(kClassStr, className);
    if (className.Equals(kSoftBreakStr) || className.Equals(kHardBreakStr)) {
      PRInt32 height;
      element->GetClientHeight(&height);
      pageEnd += height;
    }
  }

  // Basic strategy:
  // 1. Get the next node
  // 2. If the next node is undefined
  // 2.1. If the page break cache extends further
  // 2.1.1. Splice the remaining page breaks
  // 2.2. Exit
  // 3. Else if the next node is a hard break (or act)
  // 3.1. Advance the page cursor
  // 3.2. Exit
  // 4. Else if the next node is a soft break
  // 4.1. If a soft break is cached as |innerBreak|
  // 4.1.1. Remove |innerBreak|
  // 4.2. Cache the node as |innerBreak|
  // 5. Else if the node does not fit the page
  // 5.1. Find the last node (inclusive) that allows a break before it
  // 5.2. If a soft break is cached as |innerBreak|
  // 5.2.1. If |innerBreak| occurs as the previous sibling to the last node
  // 5.2.1.1. Advance the page cursor
  // 5.2.1.2. Exit
  // 5.2.2. Else
  // 5.2.2.1. Remove |innerBreak|
  // 5.2.2.2. Insert a new soft page break
  // 5.2.2.3. Advance the page cursor
  // 5.2.2.4. Exit
  // 5.3. Else
  // 5.3.1. Insert a new soft page break
  // 5.3.2. Advance the page cursor
  // 5.3.3. Exit
  // 6. Else
  // 6.1. Continue

  nsCOMPtr<nsIDOMNode> tmpnode;
  PRUint16 nodeType = 0;
  nsCOMPtr<nsIDOMNode> elemnode(do_QueryInterface(element));
  elemnode->GetNextSibling(getter_AddRefs(tmpnode));
  if (tmpnode)
    tmpnode->GetNodeType(&nodeType);
  while (tmpnode && nodeType != nsIDOMNode::ELEMENT_NODE) {
    nsCOMPtr<nsIDOMNode> tmpnode2;
    tmpnode->GetNextSibling(getter_AddRefs(tmpnode2));
    tmpnode = tmpnode2;
    if (tmpnode)
      tmpnode->GetNodeType(&nodeType);
  }

  if (tmpnode)
    element = do_QueryInterface(tmpnode);
  else
    element = nsnull;

  while (element) {
    nsCOMPtr<nsIDOMElement> elemnode(do_QueryInterface(element));
    elemnode->GetAttribute(kClassStr, className);
    element->GetOffsetTop(&offset);

    // If it's an act, make sure it's got a page break before it, unless
    // it's the first element in the script.
    if (className.Equals(kActStr)) {
      // Get the previous element to this act that isn't a page break
      elemnode->GetPreviousSibling(getter_AddRefs(tmpnode));
      /*
      if (tmpnode)
        tmpnode->GetNodeType(&nodeType);
      while (tmpnode && nodeType != nsIDOMNode::ELEMENT_NODE) {
        nsCOMPtr<nsIDOMNode> tmpnode2;
        tmpnode->GetPreviousSibling(getter_AddRefs(tmpnode2));
        tmpnode = tmpnode2;
        if (tmpnode)
          tmpnode->GetNodeType(&nodeType);
      }
      */
      while (tmpnode) {
        nsCOMPtr<nsIDOMHTMLParagraphElement> para(do_QueryInterface(tmpnode));
        if (para)
          break;
        nsCOMPtr<nsIDOMNode> tmpnode2;
        tmpnode->GetPreviousSibling(getter_AddRefs(tmpnode2));
        tmpnode = tmpnode2;
      }
      nsCOMPtr<nsIDOMElement> prev(do_QueryInterface(tmpnode));
      // If no previous element, then this isn't important
      if (prev) {
        // Otherwise, make sure the act is preceded by a page break
        prev->GetAttribute(kClassStr, className);
        if (! className.Equals(kSoftBreakStr) &&
            ! className.Equals(kHardBreakStr)) {
          // Make a break!
          nsCOMPtr<nsIDOMElement> breaknode;
          mScript->CreateElement(kDivStr, getter_AddRefs(breaknode));
          prev = do_QueryInterface(breaknode);
          prev->SetAttribute(kClassStr, kSoftBreakStr);
          nsCOMPtr<nsIDOMText> text;
          mScript->CreateTextNode(NS_LITERAL_STRING(" "), getter_AddRefs(text));
          nsCOMPtr<nsIDOMNode> dummy;
          prev->AppendChild(text, getter_AddRefs(dummy));
          nsCOMPtr<nsIDOMNode> parent;
          elemnode->GetParentNode(getter_AddRefs(parent));
          parent->InsertBefore(prev, elemnode, getter_AddRefs(dummy));
        }
        nsCOMPtr<nsIDOMNSHTMLElement> htmlprev(do_QueryInterface(prev));
        htmlprev->GetOffsetTop(&offset);
        if (mCurPageBreakNum >= mPageBreakOffsets.Length())
          mPageBreakOffsets.AppendElement((PRUint32) offset);
        else
          mPageBreakOffsets[mCurPageBreakNum] = (PRUint32) offset;
        ++mCurPageBreakNum;
        mNextPageStartsAt = do_QueryInterface(element);
        return;
      }
    }

    // Hard breaks don't move. Just record the offset and keep going.
    if (className.Equals(kHardBreakStr)) {
      element->GetOffsetTop(&offset);
      if (mCurPageBreakNum >= mPageBreakOffsets.Length())
        mPageBreakOffsets.AppendElement(offset);
      else
        mPageBreakOffsets[mCurPageBreakNum] = offset;
      ++mCurPageBreakNum;
      mNextPageStartsAt = do_QueryInterface(element);
      return;
    }

    element->GetOffsetTop(&offset);
    PRInt32 height;
    element->GetClientHeight(&height);
    if (className.Equals(kSoftBreakStr)) {
      // Soft break! Make sure it's in the right position, and eliminate
      // or move up any preceding soft break that isn't necessary.
      if (innerBreak) {
        // Remove the last inner break, and make this one the new inner
        // break. No need to adjust pageEnd, because the removed page break
        // balances the current page break.
        nsCOMPtr<nsIDOMNode> parent;
        nsCOMPtr<nsIDOMNode> innernode(do_QueryInterface(innerBreak));
        nsCOMPtr<nsIDOMNode> dummy;
        innernode->GetParentNode(getter_AddRefs(parent));
        parent->RemoveChild(innernode, getter_AddRefs(dummy));
      }
      else {
        elemnode->GetNextSibling(getter_AddRefs(tmpnode));
        if (tmpnode)
          tmpnode->GetNodeType(&nodeType);
        while (tmpnode && nodeType != nsIDOMNode::ELEMENT_NODE) {
          nsCOMPtr<nsIDOMNode> tmpnode2;
          tmpnode->GetNextSibling(getter_AddRefs(tmpnode2));
          tmpnode = tmpnode2;
          if (tmpnode)
            tmpnode->GetNodeType(&nodeType);
        }
        if (tmpnode) {
          nsCOMPtr<nsIDOMNSHTMLElement> next(do_QueryInterface(tmpnode));
          PRInt32 nextOffset = 0;
          next->GetOffsetTop(&nextOffset);
          // 
          pageEnd += PRUint32(nextOffset - offset);
        }
      }
      innerBreak = element;
    }
    else if (PRUint32(offset + height) > pageEnd) {
      // Not a soft break, but it exceeds the page length so
      // we need to paginate.

      // If we can't break here, rewind until we reach a node where we can.
      tmpnode = do_QueryInterface(element);
      while (! CanBreakBeforeNode(tmpnode) && tmpnode != mNextPageStartsAt) {
        nsCOMPtr<nsIDOMNode> prev;
        tmpnode->GetPreviousSibling(getter_AddRefs(prev));
        if (! prev)
          break;
        prev->GetNodeType(&nodeType);
        while (prev && nodeType != nsIDOMNode::ELEMENT_NODE) {
          nsCOMPtr<nsIDOMNode> tmpnode2;
          prev->GetPreviousSibling(getter_AddRefs(tmpnode2));
          if (tmpnode2)
            tmpnode2->GetNodeType(&nodeType);
          prev = tmpnode2;
        }
        tmpnode = prev;
      }

      // If |tmpnode| == |mNextPageStartsAt|, we've backtracked to the
      // previous page. This generally happens when an element is too big
      // to fit on the page. Until we can break long elements in half, keep
      // going forward until the next opportunity to insert a break.
      if (tmpnode == mNextPageStartsAt) {
        // Set |element| to the next element
        elemnode->GetNextSibling(getter_AddRefs(tmpnode));
        if (tmpnode)
          tmpnode->GetNodeType(&nodeType);
        while (tmpnode && nodeType != nsIDOMNode::ELEMENT_NODE) {
          nsCOMPtr<nsIDOMNode> tmpnode2;
          tmpnode->GetNextSibling(getter_AddRefs(tmpnode2));
          tmpnode = tmpnode2;
          if (tmpnode)
            tmpnode->GetNodeType(&nodeType);
        }
        if (tmpnode)
          element = do_QueryInterface(tmpnode);
        else
          element = nsnull;
        continue;
      }

      if (innerBreak) {
        // Move up the inner break to the current position (unless it's
        // already the previous element)
        nsCOMPtr<nsIDOMNode> prev;
        tmpnode->GetPreviousSibling(getter_AddRefs(prev));
        if (! prev)
          break;
        prev->GetNodeType(&nodeType);
        while (prev && nodeType != nsIDOMNode::ELEMENT_NODE) {
          nsCOMPtr<nsIDOMNode> tmpnode2;
          prev->GetPreviousSibling(getter_AddRefs(tmpnode2));
          if (tmpnode2)
            tmpnode2->GetNodeType(&nodeType);
          prev = tmpnode2;
        }
        nsCOMPtr<nsIDOMNode> innernode(do_QueryInterface(innerBreak));
        if (prev != innernode) {
          nsCOMPtr<nsIDOMNode> parent;
          tmpnode->GetParentNode(getter_AddRefs(parent));
          nsCOMPtr<nsIDOMNode> dummy;
          parent->InsertBefore(innernode, tmpnode, getter_AddRefs(dummy));
        }
      }
      else {
        nsCOMPtr<nsIDOMElement> pagebreak;
        mScript->CreateElement(kDivStr, getter_AddRefs(pagebreak));
        pagebreak->SetAttribute(kClassStr, kSoftBreakStr);
        nsCOMPtr<nsIDOMText> text;
        nsCOMPtr<nsIDOMNode> dummy;
        mScript->CreateTextNode(NS_LITERAL_STRING(" "), getter_AddRefs(text));
        pagebreak->AppendChild(text, getter_AddRefs(dummy));
        nsCOMPtr<nsIDOMNode> parent;
        tmpnode->GetParentNode(getter_AddRefs(parent));
        parent->InsertBefore(pagebreak, tmpnode, getter_AddRefs(dummy));
        innerBreak = do_QueryInterface(pagebreak);
      }
      innerBreak->GetOffsetTop(&offset);
      if (mCurPageBreakNum >= mPageBreakOffsets.Length())
        mPageBreakOffsets.AppendElement(offset);
      else
        mPageBreakOffsets[mCurPageBreakNum] = offset;
      ++mCurPageBreakNum;
      mNextPageStartsAt = tmpnode;
      return;
    }

    // set |element| to the next element
    // Man does XPCOM make some conventions difficult! e.g., expressing
    // while (element = element.nextSibling && element.nodeType != ...)
    elemnode->GetNextSibling(getter_AddRefs(tmpnode));
    if (tmpnode)
      tmpnode->GetNodeType(&nodeType);
    while (tmpnode && nodeType != nsIDOMNode::ELEMENT_NODE) {
      nsCOMPtr<nsIDOMNode> tmpnode2;
      tmpnode->GetNextSibling(getter_AddRefs(tmpnode2));
      tmpnode = tmpnode2;
      if (tmpnode)
        tmpnode->GetNodeType(&nodeType);
    }
    if (tmpnode)
      element = do_QueryInterface(tmpnode);
    else
      element = nsnull;
  }

  // This should be guaranteed
  if (! element) {
    // Strip away any remaining page break offsets
    if (mPageBreakOffsets.Length() > 0 &&
        mPageBreakOffsets.Length() > mCurPageBreakNum + 1) {
      mPageBreakOffsets.SetLength(mCurPageBreakNum + 1);
    }
    if (innerBreak) {
      nsCOMPtr<nsIDOMNode> parent;
      nsCOMPtr<nsIDOMNode> innernode(do_QueryInterface(innerBreak));
      nsCOMPtr<nsIDOMNode> dummy;
      innernode->GetParentNode(getter_AddRefs(parent));
      parent->RemoveChild(innernode, getter_AddRefs(dummy));
    }
    mNextPageStartsAt = nsnull;
  }
}

void nsScriptPaginator::CalculateFontMetrics () {
#ifndef XP_MACOSX
  switch (mFontSize) {
    case 10: mLineHeight = 15.3f; break;
    case 12: mLineHeight = 17.3f; break;
    case 14: mLineHeight = 19.3f; break;
  }
  return;
#endif
  nsCOMPtr<nsIDocShell> docShell;
  nsresult rv = mEditor->GetDocShell(getter_AddRefs(docShell));
  if (NS_FAILED(rv))
    return;
  nsCOMPtr<nsPresContext> presctx;
  rv = docShell->GetPresContext(getter_AddRefs(presctx));
  nsFont monospace("monospace", NS_FONT_STYLE_NORMAL, NS_FONT_VARIANT_NORMAL,
    NS_FONT_WEIGHT_NORMAL, 0, NS_POINTS_TO_TWIPS(10));
  nsCOMPtr<nsIFontMetrics> fontMetrics = presctx->GetMetricsFor(monospace);
  if (! fontMetrics)
    return;
  nscoord fontHeight, fontWidth;
  // float scale = presctx->TwipsToPixels();
  rv = fontMetrics->GetHeight(fontHeight);
  rv = fontMetrics->GetMaxAdvance(fontWidth);
  // mFontHeight = NSTwipsToFloatPixels(NSCoordToInt(fontHeight), scale);
  // mFontWidth = NSTwipsToFloatPixels(NSCoordToInt(fontWidth), scale);
  mFontHeight = NSTwipsToUnits(fontHeight, 1.0f);
  mFontWidth = NSTwipsToUnits(fontWidth, 1.0f);

  mLineHeight = mFontHeight;
}

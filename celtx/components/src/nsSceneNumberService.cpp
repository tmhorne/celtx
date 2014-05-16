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

#include "nsSceneNumberService.h"
#include "nsCOMPtr.h"
#include "nsMemory.h"


NS_IMPL_ISUPPORTS1(nsSceneNumberService, nsISceneNumberService)


nsSceneNumberService*
nsSceneNumberService::gSceneNumberService = nsnull;


NS_METHOD
nsSceneNumberService::CreateSingleton(nsISupports* aOuter,
  const nsIID& aIID, void **aResult)
{
  NS_ENSURE_NO_AGGREGATION(aOuter);

  if (gSceneNumberService) {
    NS_ERROR("Trying to create Scene Number Service twice.");
  }

  // The constructor sets gSceneNumberService
  // nsRefPtr<nsSceneNumberService> svc = new nsSceneNumberService();
  nsCOMPtr<nsSceneNumberService> svc = new nsSceneNumberService();
  if (!svc)
    return NS_ERROR_OUT_OF_MEMORY;

  return svc->QueryInterface(aIID, aResult);
}


nsSceneNumberService::nsSceneNumberService()
  : mLastNumberReason(REASON_UNKNOWN)
{
  gSceneNumberService = this;
#if 0
  TestNumbering();
#endif
}


nsSceneNumberService::~nsSceneNumberService()
{
  gSceneNumberService = nsnull;
}


/* boolean numbersAreSeamless ([array, size_is (leftNumberLength)] in unsigned long leftNumber, in PRUint32 leftNumberLength, [array, size_is (rightNumberLength)] in unsigned long rightNumber, in PRUint32 rightNumberLength); */
NS_IMETHODIMP
nsSceneNumberService::NumbersAreSeamless(
  PRUint32 *leftNumber, PRUint32 leftNumberLength,
  PRUint32 *rightNumber, PRUint32 rightNumberLength,
  PRBool *_retval)
{
  NS_ENSURE_ARG(leftNumber);
  NS_ENSURE_ARG(rightNumber);
  NS_ENSURE_ARG_MIN(leftNumberLength, 1);
  NS_ENSURE_ARG_MIN(rightNumberLength, 1);
  NS_ENSURE_ARG_POINTER(_retval);

  // There is no correct scenario where the left number is deeper than
  // the right number by more than one
  if (leftNumberLength > rightNumberLength + 1) {
    *_retval = PR_FALSE;
    return NS_OK;
  }

  // No matter what, if n is MIN(leftNumberLength, rightNumberLength),
  // then the first n-1 components of each number must match
  const PRUint32 shorter = leftNumberLength < rightNumberLength
                         ? leftNumberLength : rightNumberLength;

  if (shorter >= 2) {
    for (PRUint32 i = 0; i < shorter - 1; ++i) {
      if (leftNumber[i] != rightNumber[i]) {
        *_retval = PR_FALSE;
        return NS_OK;
      }
    }
  }

  if (leftNumberLength >= rightNumberLength) {
    // It must be the immediate successor
    *_retval = rightNumber[shorter - 1] == leftNumber[shorter - 1] + 1;
  }
  else {
    // It must be the immediate descendant, which means it has to end with
    // a 1, and the rest of the numbers have to be zero.

    // First check that the last common components also match
    if (rightNumber[shorter - 1] != leftNumber[shorter - 1]) {
      *_retval = PR_FALSE;
      return NS_OK;
    }

    for (PRUint32 i = shorter; i + 1 < rightNumberLength; ++i) {
      if (rightNumber[i] != 0) {
        *_retval = PR_FALSE;
        return NS_OK;
      }
    }

    *_retval = rightNumber[rightNumberLength - 1] == 1;
  }

  return NS_OK;
}


/* void getNumberBetweenNumbers ([array, size_is (leftNumberLength)] in unsigned long leftNumber, in unsigned long leftNumberLength, [array, size_is (rightNumberLength)] in unsigned long rightNumber, in unsigned long rightNumberLength, [array, size_is (ioNumberLength)] inout unsigned long ioNumber, inout unsigned long ioNumberLength, out boolean outPropagateChanges); */
NS_IMETHODIMP
nsSceneNumberService::GetNumberBetweenNumbers(
  PRUint32 *aLeftNumber, PRUint32 aLeftNumberLength,
  PRUint32 *aRightNumber, PRUint32 aRightNumberLength,
  PRUint32 **ioNumber, PRUint32 *ioNumberLength,
  PRBool *outPropagateChanges)
{
  PRUint32 tmpNumber[DEFAULT_MAX_SCENE_DEPTH];
  nsresult rv = NumberBetweenNumbers(aLeftNumber, aLeftNumberLength,
    aRightNumber, aRightNumberLength, tmpNumber, ioNumberLength,
    outPropagateChanges);

  if (NS_SUCCEEDED(rv)) {
    *ioNumber = (PRUint32 *) nsMemory::Clone(tmpNumber,
      *ioNumberLength * sizeof(PRUint32));
  }

  return rv;
}


/* [noscript] void numberBetweenNumbers ([array, size_is (leftNumberLength)] in unsigned long leftNumber, in unsigned long leftNumberLength, [array, size_is (rightNumberLength)] in unsigned long rightNumber, in unsigned long rightNumberLength, [array, size_is (ioNumberLength)] in unsigned long outNumber, inout unsigned long ioNumberLength, out boolean outPropagateChanges); */
NS_IMETHODIMP
nsSceneNumberService::NumberBetweenNumbers(
  PRUint32 *aLeftNumber, PRUint32 aLeftNumberLength,
  PRUint32 *aRightNumber, PRUint32 aRightNumberLength,
  PRUint32 *outNumber, PRUint32 *ioNumberLength,
  PRBool *outPropagateChanges)
{
  NS_ENSURE_ARG(outNumber);
  NS_ENSURE_ARG_POINTER(ioNumberLength);
  NS_ENSURE_ARG_POINTER(outPropagateChanges);

  *outPropagateChanges = PR_FALSE;

  // Cases 1 and 2 (REASON_NO_NUMBERS and REASON_LAST_NUMBER)
  if (! aRightNumber || aRightNumberLength == 0) {
    // In both cases, it will be a top-level number
    *ioNumberLength = 1;

    if (! aLeftNumber || aLeftNumberLength == 0) {
      // Case 1: There are no other numbers
      mLastNumberReason = REASON_NO_NUMBERS;
      outNumber[0] = 1;
    }
    else {
      // Case 2: This is the last number
      mLastNumberReason = REASON_LAST_NUMBER;
      outNumber[0] = aLeftNumber[0] + 1;
    }

    // End of cases 1 and 2
    return NS_OK;
  }

  // Cases 3 and 4 (REASON_FIRST_NUMBER and REASON_PRE_FIRST_NUMBER)
  if (! aLeftNumber || aLeftNumberLength == 0) {
    if (aRightNumber[0] > 1 ||
        aRightNumber[0] == 1 && aRightNumberLength > 1) {
      // Case 3: This is the first number
      mLastNumberReason = REASON_FIRST_NUMBER;
      *ioNumberLength = 1;
      outNumber[0] = 1;
    }
    else {
      // Case 4: This is prior to the first number
      mLastNumberReason = REASON_PRE_FIRST_NUMBER;

      // Whatever the first number is, it would match the regex (0.)*1
      // i.e., all zeroes until a single 1
      // we generate the prior nubmer by switching that 1 to a zero and
      // appending a 1

      // First, make sure it fits
      if (*ioNumberLength < aRightNumberLength + 1) {
        *outPropagateChanges = PR_TRUE;

        // No, it doesn't, so just adopt the right number
        for (PRUint32 i = 0; i < *ioNumberLength; ++i) {
          outNumber[i] = aRightNumber[i];
        }
      }
      else {
        *ioNumberLength = aRightNumberLength + 1;
        for (PRUint32 i = 0; i < aRightNumberLength - 1; ++i) {
          outNumber[i] = aRightNumber[i];
        }
        outNumber[aRightNumberLength - 1] = 0;
        outNumber[aRightNumberLength] = 1;
      }
    }

    // End of cases 3 and 4
    return NS_OK;
  }

  // Check that they're seamless
  PRBool seamless;
  NumbersAreSeamless(aLeftNumber, aLeftNumberLength,
    aRightNumber, aRightNumberLength, &seamless);
  if (! seamless) {
    mLastNumberReason = REASON_GAP_CORRECTION;
    nsresult rv = NumberForGap(aLeftNumber, aLeftNumberLength,
                               aRightNumber, aRightNumberLength,
                               outNumber, ioNumberLength);
    return rv;
  }

  // Case 5 (REASON_EXTENDING)
  if (aLeftNumberLength > aRightNumberLength) {
    mLastNumberReason = REASON_EXTENDING;

    // Make sure it fits
    if (*ioNumberLength < aRightNumberLength + 1) {
      *outPropagateChanges = PR_TRUE;
    }
    else {
      *ioNumberLength = aRightNumberLength + 1;
    }

    for (PRUint32 i = 0; i < *ioNumberLength; ++i) {
      outNumber[i] = aLeftNumber[i];
    }
    ++outNumber[*ioNumberLength - 1];

    return NS_OK;
  }

  // Case 6 (REASON_DESCENDING)
  mLastNumberReason = REASON_DESCENDING;

  // Make sure it fits
  if (*ioNumberLength < aRightNumberLength + 1) {
    *outPropagateChanges = PR_TRUE;

    // No, it doesn't, so just adopt the right number
    for (PRUint32 i = 0; i < *ioNumberLength; ++i) {
      outNumber[i] = aRightNumber[i];
    }
  }
  else {
    *ioNumberLength = aRightNumberLength + 1;

    // Copy the left number, padding it with zeroes if necessary, then
    // append a one. There shouldn't be more than one zero as padding,
    // given the numbers are supposed to be seamless.
    for (PRUint32 i = 0; i < aRightNumberLength; ++i) {
      if (i < aLeftNumberLength) {
        outNumber[i] = aLeftNumber[i];
      }
      else {
        outNumber[i] = 0;
      }
    }
    outNumber[aRightNumberLength] = 1;
  }

  return NS_OK;
}


NS_IMETHODIMP
nsSceneNumberService::NumberForGap(
  PRUint32 *aLeftNumber, PRUint32 aLeftNumberLength,
  PRUint32 *aRightNumber, PRUint32 aRightNumberLength,
  PRUint32 *outNumber, PRUint32 *ioNumberLength)
{
  NS_ENSURE_ARG(aLeftNumber);
  NS_ENSURE_ARG(aRightNumber);
  NS_ENSURE_ARG_POINTER(ioNumberLength);
  NS_ENSURE_ARG_POINTER(outNumber);

  /*
   * From what I can figure out, this boils down to this basic approach,
   * using l[i] and r[i] to represent aLeftNumber[i] and aRightNumber[i]
   * respectively, and L and R to represent aLeftNumberLength and
   * aRightNumberLength respectively:
   *
   * while (i < L && i < R && l[i] == r[i])
   *   ++i;
   *
   * Now that we've extracted what's common between them, the question is,
   * are we filling a node on the natural path from l to r, or are we
   * filling an actual gap between the two? If the former, then L < R,
   * and we should hit a point where r[i] == l[i] + 1, in which case the
   * answer is to take outNumber[i] = l[i] + 1 and we are done.
   *
   * If that's not the case, then we hit a point where r[i] > l[i] + 1, in
   * which case outNumber[i] = l[i] + 1 and we are again done.
   */

  // Use temporary storage so we don't need to complicate this with
  // adjusting for shortage of space too. Add one for overflow.
  PRUint32 tmpNumber[DEFAULT_MAX_SCENE_DEPTH + 1];
  PRUint32 tmpNumberLength = 0;
  const PRUint32 minLength = aLeftNumberLength < aRightNumberLength
                           ? aLeftNumberLength : aRightNumberLength;
  PRBool allEqual = PR_TRUE;
  PRBool allButLastEqual = PR_TRUE;


  // Copy everything that's common to both
  for (PRUint32 i = 0; i < minLength; ++i) {
    tmpNumber[tmpNumberLength++] = aLeftNumber[i];
    if (aLeftNumber[i] != aRightNumber[i]) {
      allEqual = PR_FALSE;
      if (i + 1 < minLength)
        allButLastEqual = PR_FALSE;
      break;
    }
  }

  // Special case, if they're out of order but have a common prefix,
  // such as x.y followed by x, or even x followed by itself
  if (allEqual && aLeftNumberLength >= aRightNumberLength) {
    ++tmpNumber[0];
    return NumberForGap(aLeftNumber, aLeftNumberLength,
      tmpNumber, 1, outNumber, ioNumberLength);
  }

  // If one is a complete prefix of the other, add a ".1" to it, otherwise
  // increment the last component (the first part that wasn't common).
  if (allEqual) {
    tmpNumber[tmpNumberLength++] = 1;
  }
  // Special case for when we have a gap like x.y.z -> (x+1), where
  // the next number to fill the gap would be x.(y+1), not (x+1)
  else if (allButLastEqual &&
           aRightNumber[tmpNumberLength - 1] ==
           aLeftNumber[tmpNumberLength - 1] + 1 &&
           aLeftNumberLength > aRightNumberLength) {
    tmpNumber[tmpNumberLength] = aLeftNumber[tmpNumberLength] + 1;
    ++tmpNumberLength;
  }
  else {
    ++tmpNumber[tmpNumberLength - 1];
  }

  // Copy the temporary storage to the return values
  if (*ioNumberLength < tmpNumberLength) {
    for (PRUint32 i = 0; i < *ioNumberLength; ++i) {
      outNumber[i] = tmpNumber[i];
    }
    ++outNumber[*ioNumberLength - 1];
  }
  else {
    *ioNumberLength = tmpNumberLength;
    for (PRUint32 i = 0; i < tmpNumberLength; ++i) {
      outNumber[i] = tmpNumber[i];
    }
  }

  return NS_OK;
}


void
nsSceneNumberService::TestNumbering () {
  nsresult rv;

  PRUint32 resultLength = DEFAULT_MAX_SCENE_DEPTH;
  PRUint32 resultNumber[DEFAULT_MAX_SCENE_DEPTH];
  PRUint32 leftNumber[DEFAULT_MAX_SCENE_DEPTH];
  PRUint32 rightNumber[DEFAULT_MAX_SCENE_DEPTH];
  PRBool propagateChanges;
  PRBool seamless;

  printf("--- nsSceneNumberService::TestNumbering\n");

  printf("Running equal numbers test...\n");
  leftNumber[0] = 2;
  leftNumber[1] = 3;
  rv = NumbersAreSeamless(leftNumber, 1, leftNumber, 1, &seamless);
  if (seamless)
    printf("failed: 2.3 and 2.3 reported as seamless\n");
  else
    printf("...passed\n");

  leftNumber[0] = 1;
  leftNumber[1] = 1;
  rightNumber[0] = 2;
  rightNumber[1] = 2;
  printf("Running 1.1 versus 2.2 seamless test...\n");
  rv = NumbersAreSeamless(leftNumber, 2, rightNumber, 2, &seamless);
  if (seamless)
    printf("failed: 1.1 and 2.2 reported as seamless\n");
  else
    printf("...passed\n");

  // C1C
  leftNumber[0] = 1;
  leftNumber[1] = 3;
  leftNumber[2] = 3;
  // 1B
  rightNumber[0] = 1;
  rightNumber[1] = 2;
  printf("Running 1.3.3 versus 1.2 seamless test...\n");
  rv = NumbersAreSeamless(leftNumber, 3, rightNumber, 2, &seamless);
  if (seamless)
    printf("failed: 1.3.3 and 1.2 are reported as seamless\n");
  else
    printf("...passed\n");

  // C1C
  leftNumber[0] = 1;
  leftNumber[1] = 3;
  leftNumber[2] = 3;
  // 2
  rightNumber[0] = 2;
  printf("Running 1.3.3 versus 2 seamless test...\n");
  rv = NumbersAreSeamless(leftNumber, 3, rightNumber, 1, &seamless);
  if (seamless)
    printf("failed: 1.3.3 and 2 are reported as seamless\n");
  else
    printf("...passed\n");

  printf("Checking what comes between 1.3.3 and 2...\n");
  resultLength = DEFAULT_MAX_SCENE_DEPTH;
  rv = NumberBetweenNumbers(leftNumber, 3, rightNumber, 1, resultNumber,
    &resultLength, &propagateChanges);
  if (NS_FAILED(rv)) {
    printf("NumberBetweenNumbers failed: %x\n", rv);
  }
  else if (resultLength != 2) {
    printf("resultLength (%d) != 2\n", resultLength);
  }
  else if (resultNumber[0] != 1 || resultNumber[1] != 4) {
    printf("result (%d.%d) != 1.4\n", resultNumber[0], resultNumber[1]);
  }
  else {
    printf("...passed\n");
  }

  // 1
  leftNumber[0] = 1;
  // A1
  rightNumber[0] = 1;
  rightNumber[1] = 0;
  rightNumber[2] = 1;
  printf("Running 1 versus 1.0.1 seamless test...\n");
  rv = NumbersAreSeamless(leftNumber, 1, rightNumber, 3, &seamless);
  if (! seamless)
    printf("failed: 1 and 1.0.1 are reported as NOT seamless\n");
  else
    printf("...passed\n");

  printf("Running REASON_NO_NUMBERS...\n");
  rv = NumberBetweenNumbers(nsnull, 0, nsnull, 0, resultNumber,
    &resultLength, &propagateChanges);
  if (NS_FAILED(rv)) {
    printf("NumberBetweenNumbers failed: %x\n", rv);
  }
  else if (mLastNumberReason != REASON_NO_NUMBERS) {
    printf("mLastNumberReason != REASON_NO_NUMBERS\n");
  }
  else if (resultLength != 1) {
    printf("resultLength (%d) != 1\n", resultLength);
  }
  else if (resultNumber[0] != 1) {
    printf("result (%d) != 1\n", resultNumber[0]);
  }
  else if (propagateChanges) {
    printf("propagateChanges != false\n");
  }
  else {
    printf("...passed\n");
  }

  resultLength = DEFAULT_MAX_SCENE_DEPTH;
  leftNumber[0] = 1;

  printf("Running REASON_LAST_NUMBER...\n");
  rv = NumberBetweenNumbers(leftNumber, 1, nsnull, 0, resultNumber,
    &resultLength, &propagateChanges);
  if (NS_FAILED(rv)) {
    printf("NumberBetweenNumbers failed: %x\n", rv);
  }
  else if (mLastNumberReason != REASON_LAST_NUMBER) {
    printf("mLastNumberReason != REASON_LAST_NUMBER\n");
  }
  else if (resultLength != 1) {
    printf("resultLength (%d) != 1\n", resultLength);
  }
  else if (resultNumber[0] != 2) {
    printf("result (%d) != 2\n", resultNumber[0]);
  }
  else if (propagateChanges) {
    printf("propagateChanges != false\n");
  }
  else {
    printf("...passed\n");
  }

  resultLength = DEFAULT_MAX_SCENE_DEPTH;
  rightNumber[0] = 1;
  rightNumber[1] = 1;

  printf("Running REASON_FIRST_NUMBER...\n");
  rv = NumberBetweenNumbers(nsnull, 0, rightNumber, 2, resultNumber,
    &resultLength, &propagateChanges);
  if (NS_FAILED(rv)) {
    printf("NumberBetweenNumbers failed: %x\n", rv);
  }
  else if (mLastNumberReason != REASON_FIRST_NUMBER) {
    printf("mLastNumberReason != REASON_FIRST_NUMBER\n");
  }
  else if (resultLength != 1) {
    printf("resultLength (%d) != 1\n", resultLength);
  }
  else if (resultNumber[0] != 1) {
    printf("result (%d) != 1\n", resultNumber[0]);
  }
  else if (propagateChanges) {
    printf("propagateChanges != false\n");
  }
  else {
    printf("...passed\n");
  }

  resultLength = DEFAULT_MAX_SCENE_DEPTH;

  printf("Running REASON_PRE_FIRST_NUMBER...\n");
  // rightNumber == 1 if we take its length as 1
  rv = NumberBetweenNumbers(nsnull, 0, rightNumber, 1, resultNumber,
    &resultLength, &propagateChanges);
  if (NS_FAILED(rv)) {
    printf("NumberBetweenNumbers failed: %x\n", rv);
  }
  else if (mLastNumberReason != REASON_PRE_FIRST_NUMBER) {
    printf("mLastNumberReason != REASON_PRE_FIRST_NUMBER\n");
  }
  else if (resultLength != 2) {
    printf("resultLength (%d) != 2\n", resultLength);
  }
  else if (resultNumber[0] != 0 || resultNumber[1] != 1) {
    printf("result (%d.%d) != 0.1\n", resultNumber[0], resultNumber[1]);
  }
  else if (propagateChanges) {
    printf("propagateChanges != false\n");
  }
  else {
    printf("...passed\n");
  }

  resultLength = DEFAULT_MAX_SCENE_DEPTH;
  leftNumber[0] = 1;
  leftNumber[1] = 2;
  leftNumber[2] = 2; // "B1B"
  rightNumber[0] = 1;
  rightNumber[2] = 3; // "1C"

  printf("Running REASON_EXTENDING\n");
  rv = NumberBetweenNumbers(leftNumber, 3, rightNumber, 2, resultNumber,
    &resultLength, &propagateChanges);
  if (NS_FAILED(rv)) {
    printf("NumberBetweenNumbers failed: %x\n", rv);
  }
  else if (mLastNumberReason != REASON_EXTENDING) {
    printf("mLastNumberReason (%d) != REASON_EXTENDING\n", mLastNumberReason);
  }
  else if (resultLength != 3) {
    printf("resultLength (%d) != 3\n", resultLength);
  }
  else if (resultNumber[0] != 1 || resultNumber[1] != 2 ||
           resultNumber[2] != 3) {
    printf("result (%d.%d.%d) != 1.2.3\n", resultNumber[0],
      resultNumber[1], resultNumber[2]);
  }
  else if (propagateChanges) {
    printf("propagateChanges != false\n");
  }
  else {
    printf("...passed\n");
  }

  resultLength = DEFAULT_MAX_SCENE_DEPTH;
  leftNumber[0] = 1;
  leftNumber[1] = 2; // "1B"
  rightNumber[0] = 1;
  rightNumber[1] = 3; // "1C"

  printf("Running REASON_DESCENDING\n");
  rv = NumberBetweenNumbers(leftNumber, 2, rightNumber, 2, resultNumber,
    &resultLength, &propagateChanges);
  if (NS_FAILED(rv)) {
    printf("NumberBetweenNumbers failed: %x\n", rv);
  }
  else if (mLastNumberReason != REASON_DESCENDING) {
    printf("mLastNumberReason != REASON_DESCENDING\n");
  }
  else if (resultLength != 3) {
    printf("resultLength (%d) != 3\n", resultLength);
  }
  else if (resultNumber[0] != 1 || resultNumber[1] != 2 ||
           resultNumber[2] != 1) {
    printf("result (%d.%d.%d) != 1.2.1\n", resultNumber[0],
      resultNumber[1], resultNumber[2]);
  }
  else if (propagateChanges) {
    printf("propagateChanges != false\n");
  }
  else {
    printf("...passed\n");
  }
}

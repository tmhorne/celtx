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

#ifndef NUMBERING_SCHEME_H_
#define NUMBERING_SCHEME_H_

#include "nsCOMPtr.h"
#include "nsString.h"
#include "nsTArray.h"

class nsIRDFResource;
class nsIRDFDataSource;

class NumberingComponent {
public:
  enum Position {
    PRIMARY,
    BEFORE,
    AFTER
  };

  enum Numbering {
    NUMBER,
    LETTER
  };

  Position position;
  Numbering numbering;
  nsString prefix;
  nsString suffix;


  NumberingComponent ()
    : position(PRIMARY), numbering(NUMBER) {}

  NumberingComponent (Position aPosition, Numbering aNumbering,
                      const nsAString& aPrefix,
                      const nsAString& aSuffix)
    : position(aPosition), numbering(aNumbering),
      prefix(aPrefix), suffix(aSuffix) {}

  NumberingComponent (const NumberingComponent& c)
    : position(c.position), numbering(c.numbering),
      prefix(c.prefix), suffix(c.suffix) {}
};

class NumberingScheme {
public:
  NumberingScheme () {}

  nsresult Init (nsIRDFDataSource* aDS, nsIRDFResource* aResource);

  nsresult SceneNumberToString (PRUint32 aLength, PRUint32* aSceneNumber,
    nsAString& result);

  nsIRDFResource* GetResource() { return mResource.get(); }

private:
  nsCOMPtr<nsIRDFResource> mResource;
  nsTArray<NumberingComponent> mComponents;
};

#endif /* NUMBERING_SCHEME_H_ */

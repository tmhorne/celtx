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

#include "nsIGenericFactory.h"
#include "nsControlCharStripper.h"
#include "nsScriptPaginator.h"
#include "celtxNodeIterator.h"
#include "nsSceneNumberService.h"
#include "nsActTracker.h"
#include "nsSceneTracker.h"
#include "nsShotTracker.h"
#include "nsScriptScene.h"
#include "nsCeltxDebugBreaker.h"
#ifdef XP_MACOSX
#include "nsCocoaFullScreen.h"
#endif

NS_GENERIC_FACTORY_CONSTRUCTOR(nsControlCharStripper)
NS_GENERIC_FACTORY_CONSTRUCTOR(nsScriptPaginator)
NS_GENERIC_FACTORY_CONSTRUCTOR(celtxNodeIterator)
NS_GENERIC_FACTORY_CONSTRUCTOR(nsActTracker)
NS_GENERIC_FACTORY_CONSTRUCTOR(nsSceneTracker)
NS_GENERIC_FACTORY_CONSTRUCTOR(nsShotTracker)
NS_GENERIC_FACTORY_CONSTRUCTOR(nsScriptScene)
NS_GENERIC_FACTORY_CONSTRUCTOR(nsCeltxDebugBreaker)
#ifdef XP_MACOSX
NS_GENERIC_FACTORY_CONSTRUCTOR(nsCocoaFullScreen2)
#endif

static const nsModuleComponentInfo components[] =
{
  { "Control Char Stripper",
    NS_CONTROLCHARSTRIPPER_CID,
    NS_CONTROLCHARSTRIPPER_CONTRACTID,
    nsControlCharStripperConstructor
  },
  { "Script Paginator",
    NS_SCRIPTPAGINATOR_CID,
    NS_SCRIPTPAGINATOR_CONTRACTID,
    nsScriptPaginatorConstructor
  },
  { "Celtx Node Iterator",
    CELTX_NODEITERATOR_CID,
    CELTX_NODEITERATOR_CONTRACTID,
    celtxNodeIteratorConstructor
  },
  { "Scene Number Service", 
    NS_SCENENUMBERSERVICE_CID,
    NS_SCENENUMBERSERVICE_CONTRACTID,
    nsSceneNumberService::CreateSingleton
  },
  { "Act Tracker",
    NS_ACTTRACKER_CID,
    NS_ACTTRACKER_CONTRACTID,
    nsActTrackerConstructor
  },
  { "Scene Tracker",
    NS_SCENETRACKER_CID,
    NS_SCENETRACKER_CONTRACTID,
    nsSceneTrackerConstructor
  },
  { "Shot Tracker",
    NS_SHOTTRACKER_CID,
    NS_SHOTTRACKER_CONTRACTID,
    nsShotTrackerConstructor
  },
  { "Script Scene",
    NS_SCRIPTSCENE_CID,
    NS_SCRIPTSCENE_CONTRACTID,
    nsScriptSceneConstructor
  },
  { "Celtx Debug Breaker",
    NS_CELTXDEBUGBREAKER_CID,
    NS_CELTXDEBUGBREAKER_CONTRACTID,
    nsCeltxDebugBreakerConstructor
  },
#ifdef XP_MACOSX
  { "Cocoa Full Screen 2",
    NS_COCOAFULLSCREEN2_CID,
    NS_COCOAFULLSCREEN2_CONTRACTID,
    nsCocoaFullScreen2Constructor
  },
#endif
};

static nsresult
StartupCeltxModule(nsIModule* unused)
{
  if (nsSceneNumberService::gSceneNumberService) {
    NS_ERROR("Leaked the Scene Number Service from a previous startup.");
    nsSceneNumberService::gSceneNumberService = nsnull;
  }

  return NS_OK;
}

static void
ShutdownCeltxModule(nsIModule* unused)
{
  if (nsSceneNumberService::gSceneNumberService) {
    NS_WARNING("Leaking the Scene Number Service.");
  }
}

NS_IMPL_NSGETMODULE_WITH_CTOR_DTOR(nsCeltxModule, components,
  StartupCeltxModule, ShutdownCeltxModule)

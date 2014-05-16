/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4 -*- */
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is mozilla.org code.
 *
 * The Initial Developer of the Original Code is
 * Netscape Communications Corporation.
 * Portions created by the Initial Developer are Copyright (C) 1998
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   David Epstein <depstein@netscape.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

// File Overview....
//
// header file for nsIEditingSession interface tests
//
#if !defined(AFX_NSICOMMANDMGR_H__574F7B4A_B175_11D6_9BE0_00C04FA02BE6__INCLUDED_)
#define AFX_NSICOMMANDMGR_H__574F7B4A_B175_11D6_9BE0_00C04FA02BE6__INCLUDED_

#if _MSC_VER > 1000
#pragma once
#endif // _MSC_VER > 1000
// nsICommandMgr.h : header file
//

#include "BrowserView.h"
#include "BrowserImpl.h"
#include "StdAfx.h"
#include "Tests.h"

/////////////////////////////////////////////////////////////////////////////
// nsICommandMgr window

class CnsICommandMgr// : public nsIObserver, public nsSupportsWeakReference
{
// Construction
public:
	CnsICommandMgr(nsIWebBrowser *mWebBrowser);

	nsCOMPtr<nsIWebBrowser> qaWebBrowser;
	nsCOMPtr<nsICommandManager> cmdMgrObj;
	nsCOMPtr<nsICommandParams> cmdParamObj;
	// test methods
public:
	static nsICommandManager * GetCommandMgrObject(nsIWebBrowser *aWebBrowser, PRInt16);
	static nsICommandManager * GetCommandMgrWithContractIDObject(PRInt16);
	void IsCommandSupportedTest(const char *, PRInt16);
	void IsCommandEnabledTest(const char *, PRInt16);
	void GetCommandStateTest(const char *, PRInt16);
	void DoCommandTest(const char *, const char *, PRInt16);
	void OnStartTests(UINT nMenuID);
	void RunAllTests();
// Operations
public:

// Overrides
	// ClassWizard generated virtual function overrides
	//{{AFX_VIRTUAL(CnsICommandMgr)
	//}}AFX_VIRTUAL

// Implementation
public:
	virtual ~CnsICommandMgr();

	// Generated message map functions
protected:

};

struct CommandTest
{
	const char *mCmdName;
	const char *mDoCmdState;
	const char *mCmdParamState;
	PRBool	    mBooleanValue;
	PRInt32	    mLongValue;
	double	    mDoubleValue;
	char	   *mStringValue;
	char	   *mCStringValue;
};

extern CommandTest CommandTable[];

/////////////////////////////////////////////////////////////////////////////

//{{AFX_INSERT_LOCATION}}
// Microsoft Visual C++ will insert additional declarations immediately before the previous line.

#endif // !defined(AFX_NSICOMMANDMGR_H__574F7B4A_B175_11D6_9BE0_00C04FA02BE6__INCLUDED_)

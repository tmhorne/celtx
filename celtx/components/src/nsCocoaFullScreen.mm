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

#import <Cocoa/Cocoa.h>
#import <Carbon/Carbon.h>
#import <objc/objc-runtime.h>

#include "nsCocoaFullScreen.h"
#include "nsPIDOMWindow.h"
#include "nsIBaseWindow.h"
#include "nsIWidget.h"
#include "nsIDocShell.h"
#include "nsObjCExceptions.h"
#include "nsCocoaWindow.h"

@protocol mozView

  // access the nsIWidget associated with this view. DOES NOT ADDREF.
- (nsIWidget*)widget;

  // access the native cocoa window (NSWindow) that this view
  // is in. It's necessary for a gecko NSView to keep track of the
  // window because |-window| returns nil when the view has been
  // removed from the view hierarchy (as is the case when it's hidden, 
  // since you can't just hide a view, that would make too much sense).
- (NSWindow*)nativeWindow;
- (void)setNativeWindow:(NSWindow*)aWindow;

  // return a context menu for this view
- (NSMenu*)contextMenu;

  // Allows callers to do a delayed invalidate (e.g., if an invalidate
  // happens during drawing)
- (void)setNeedsPendingDisplay;
- (void)setNeedsPendingDisplayInRect:(NSRect)invalidRect;

  // called when our corresponding Gecko view goes away
- (void)widgetDestroyed;

@end

NS_IMPL_ISUPPORTS1(nsCocoaFullScreen2, nsICocoaFullScreen)



nsCocoaFullScreen2::nsCocoaFullScreen2()
{
}

nsCocoaFullScreen2::~nsCocoaFullScreen2()
{
}

/* void init (); */
NS_IMETHODIMP nsCocoaFullScreen2::Init()
{
  return NS_OK;
}

/* void makeFullScreen (in nsIDOMWindow aWindow); */
NS_METHOD nsCocoaFullScreen2::MakeFullScreen(nsIDOMWindow* aWindow)
{
  NS_OBJC_BEGIN_TRY_ABORT_BLOCK_NSRESULT;

  nsCOMPtr<nsPIDOMWindow> piwin(do_QueryInterface(aWindow));
  if (! piwin) return NS_ERROR_INVALID_ARG;

  nsCOMPtr<nsIBaseWindow> base(do_QueryInterface(piwin->GetDocShell()));
  if (! base) return NS_ERROR_UNEXPECTED;

  nsCOMPtr<nsIWidget> widget;
  nsresult rv = base->GetMainWidget(getter_AddRefs(widget));
  NS_ENSURE_SUCCESS(rv, rv);
  if (! widget) return NS_ERROR_UNEXPECTED;
  nsCocoaWindow* window = static_cast<nsCocoaWindow *> (widget.get());

  NSDisableScreenUpdates();
  rv = HideWindowChrome(PR_TRUE, window);
  NS_ENSURE_SUCCESS(rv, rv);
  rv = widget->MakeFullScreen(PR_TRUE);
  NSEnableScreenUpdates();
  NS_ENSURE_SUCCESS(rv, rv);

  // TODO: Send observer message?
  HideOSChromeOnScreen(PR_TRUE, [window->GetCocoaWindow() screen]);

  return NS_OK;

  NS_OBJC_END_TRY_ABORT_BLOCK_NSRESULT;
}

/* void exitFullScreen (in nsIDOMWindow aWindow); */
NS_METHOD nsCocoaFullScreen2::ExitFullScreen(nsIDOMWindow* aWindow)
{
  NS_OBJC_BEGIN_TRY_ABORT_BLOCK_NSRESULT;

  nsCOMPtr<nsPIDOMWindow> win(do_QueryInterface(aWindow));
  if (! win) return NS_ERROR_INVALID_ARG;

  nsCOMPtr<nsIBaseWindow> base(do_QueryInterface(win->GetDocShell()));
  if (! base) return NS_ERROR_UNEXPECTED;

  nsCOMPtr<nsIWidget> widget;
  nsresult rv = base->GetMainWidget(getter_AddRefs(widget));
  NS_ENSURE_SUCCESS(rv, rv);
  if (! widget) return NS_ERROR_UNEXPECTED;
  nsCocoaWindow* window = static_cast<nsCocoaWindow *> (widget.get());

  NSDisableScreenUpdates();
  rv = HideWindowChrome(PR_FALSE, window);
  NS_ENSURE_SUCCESS(rv, rv);
  rv = widget->MakeFullScreen(PR_FALSE);
  NSEnableScreenUpdates();
  NS_ENSURE_SUCCESS(rv, rv);

  // TODO: Send observer message?
  // nsCocoaUtils::HideOSChromeOnScreen(aFullScreen, [mWindow screen]);
  HideOSChromeOnScreen(PR_FALSE, [NSScreen mainScreen]);

  return NS_OK;

  NS_OBJC_END_TRY_ABORT_BLOCK_NSRESULT;
}

void nsCocoaFullScreen2::HideOSChromeOnScreen(PRBool aShouldHide, NSScreen* aScreen)
{
  NS_OBJC_BEGIN_TRY_ABORT_BLOCK;

  // Keep track of how many hiding requests have been made, so that they can
  // be nested.
  static int sMenuBarHiddenCount = 0, sDockHiddenCount = 0;

  // Always hide the Dock, since it's not necessarily on the primary screen.
  sDockHiddenCount += aShouldHide ? 1 : -1;
  NS_ASSERTION(sMenuBarHiddenCount >= 0, "Unbalanced HideMenuAndDockForWindow calls");

  // Only hide the menu bar if the window is on the same screen.
  // The menu bar is always on the first screen in the screen list.
  if (aScreen == [[NSScreen screens] objectAtIndex:0]) {
    sMenuBarHiddenCount += aShouldHide ? 1 : -1;
    NS_ASSERTION(sDockHiddenCount >= 0, "Unbalanced HideMenuAndDockForWindow calls");
  }

  if (sMenuBarHiddenCount > 0) {
    ::SetSystemUIMode(kUIModeAllHidden, 0);
  } else if (sDockHiddenCount > 0) {
    ::SetSystemUIMode(kUIModeContentHidden, 0);
  } else {
    ::SetSystemUIMode(kUIModeNormal, 0);
  }

  NS_OBJC_END_TRY_ABORT_BLOCK;
}

static unsigned int WindowMaskForBorderStyle(nsBorderStyle aBorderStyle)
{
  PRBool allOrDefault = (aBorderStyle == eBorderStyle_all ||
                         aBorderStyle == eBorderStyle_default);

  /* Apple's docs on NSWindow styles say that "a window's style mask should
   * include NSTitledWindowMask if it includes any of the others [besides
   * NSBorderlessWindowMask]".  This implies that a borderless window
   * shouldn't have any other styles than NSBorderlessWindowMask.
   */
  if (!allOrDefault && !(aBorderStyle & eBorderStyle_title))
    return NSBorderlessWindowMask;

  unsigned int mask = NSTitledWindowMask | NSMiniaturizableWindowMask;
  if (allOrDefault || aBorderStyle & eBorderStyle_close)
    mask |= NSClosableWindowMask;
  if (allOrDefault || aBorderStyle & eBorderStyle_resizeh)
    mask |= NSResizableWindowMask;

  return mask;
}

static const NSString* kStateTitleKey = @"title";
/*
static const NSString* kStateActiveTitlebarColorKey = @"activeTitlebarColor";
static const NSString* kStateInactiveTitlebarColorKey = @"inactiveTitlebarColor";
*/

void importState (NSWindow* aWindow, NSDictionary* aState)
{
  [aWindow setTitle:[aState objectForKey:kStateTitleKey]];
  /*
  [aWindow setTitlebarColor:[aState objectForKey:kStateActiveTitlebarColorKey] forActiveWindow:YES];
  [aWindow setTitlebarColor:[aState objectForKey:kStateInactiveTitlebarColorKey] forActiveWindow:NO];
  */
}

NSMutableDictionary* exportState (NSWindow* aWindow)
{
  NSMutableDictionary* state = [NSMutableDictionary dictionaryWithCapacity:10];
  [state setObject:[aWindow title] forKey:kStateTitleKey];
  /*
  NSColor* activeTitlebarColor = [aWindow titlebarColorForActiveWindow:YES];
  if (activeTitlebarColor) {
    [state setObject:activeTitlebarColor forKey:kStateActiveTitlebarColorKey];
  }
  NSColor* inactiveTitlebarColor = [aWindow titlebarColorForActiveWindow:NO];
  if (inactiveTitlebarColor) {
    [state setObject:inactiveTitlebarColor forKey:kStateInactiveTitlebarColorKey];
  }
  */
  return state;
}

static void SetNativeWindowOnSubviews(NSView *aNativeView, NSWindow *aWin)
{
  if (!aNativeView)
    return;
  if ([aNativeView respondsToSelector:@selector(setNativeWindow:)])
    [(NSView<mozView>*)aNativeView setNativeWindow:aWin];
  NSArray *immediateSubviews = [aNativeView subviews];
  int count = [immediateSubviews count];
  for (int i = 0; i < count; ++i)
    SetNativeWindowOnSubviews((NSView *)[immediateSubviews objectAtIndex:i], aWin);
}

nsresult nsCocoaFullScreen2::HideWindowChrome(PRBool aShouldHide, nsCocoaWindow* aWindow)
{
  NS_OBJC_BEGIN_TRY_ABORT_BLOCK_NSRESULT;

  // This is a copy of the code in the fullscreen extension
  typedef struct {
    nsIWidget*           mParent;
    NSWindow*            mWindow;
    WindowDelegate*      mDelegate;
    nsCOMPtr<nsIMenuBar> mMenuBar;
    NSWindow*            mSheetWindowParent;
    nsChildView*         mPopupContentView;
    PRPackedBool         mIsResizing;
    PRPackedBool         mWindowMadeHere;
    PRPackedBool         mSheetNeedsShow;
    PRPackedBool         mModal;
    PRInt32              mNumModalDescendents;
  } WindowTail;
  ptrdiff_t offset = sizeof(nsCocoaWindow) - sizeof(WindowTail);
  WindowTail& tail = *reinterpret_cast<WindowTail*> (
    reinterpret_cast<char *>(aWindow) + offset);
  NS_ENSURE_TRUE(tail.mWindow == aWindow->GetCocoaWindow(), NS_ERROR_UNEXPECTED);

  BOOL isVisible = [tail.mWindow isVisible];

  // Remove child windows.
  NSArray* childWindows = [tail.mWindow childWindows];
  NSEnumerator* enumerator = [childWindows objectEnumerator];
  NSWindow* child = nil;
  while ((child = [enumerator nextObject])) {
    [tail.mWindow removeChildWindow:child];
  }

  // Remove the content view.
  NSView* contentView = [tail.mWindow contentView];
  [contentView retain];
  [contentView removeFromSuperviewWithoutNeedingDisplay];

  // Save state (like window title).
  // NSMutableDictionary* state = [tail.mWindow exportState];
  NSMutableDictionary* state = exportState(tail.mWindow);

  // Recreate the window with the right border style.
  NSRect frameRect = [tail.mWindow frame];

  // DestroyNativeWindow();
  {
    [tail.mWindow setDelegate:nil];
    [tail.mWindow close];
    [tail.mDelegate autorelease];
  }

  // nsresult rv = CreateNativeWindow(frameRect, aShouldHide ? eBorderStyle_none : mBorderStyle, PR_TRUE);
  nsresult rv;
  {
    NSRect& aRect = frameRect;
    // The window's nsBaseWidget::mBorderStyle isn't in the Firefox 3.0 branch
    // so we need to use the default for the main window instead.
    nsBorderStyle aBorderStyle = aShouldHide ? eBorderStyle_none : eBorderStyle_all;
    PRBool aRectIsFrameRect = PR_TRUE;

    unsigned int features = NSBorderlessWindowMask;

    nsWindowType windowType;
    rv = aWindow->GetWindowType(windowType);
    switch (windowType)
    {
      case eWindowType_invisible:
      case eWindowType_child:
      case eWindowType_plugin:
      case eWindowType_popup:
        break;
      case eWindowType_toplevel:
      case eWindowType_dialog:
        features = WindowMaskForBorderStyle(aBorderStyle);
        break;
      case eWindowType_sheet:
        nsWindowType parentType;
        tail.mParent->GetWindowType(parentType);
        if (parentType != eWindowType_invisible &&
            aBorderStyle & eBorderStyle_resizeh) {
          features = NSResizableWindowMask;
        }
        else {
          features = NSMiniaturizableWindowMask;
        }
        features |= NSTitledWindowMask;
        break;
      default:
        NS_ERROR("Unhandled window type!");
        return NS_ERROR_FAILURE;
    }

    NSRect contentRect;

    if (aRectIsFrameRect) {
      contentRect = [NSWindow contentRectForFrameRect:aRect styleMask:features];
    } else {
      /* 
       * We pass a content area rect to initialize the native Cocoa window. The
       * content rect we give is the same size as the size we're given by gecko.
       * The origin we're given for non-popup windows is moved down by the height
       * of the menu bar so that an origin of (0,100) from gecko puts the window
       * 100 pixels below the top of the available desktop area. We also move the
       * origin down by the height of a title bar if it exists. This is so the
       * origin that gecko gives us for the top-left of  the window turns out to
       * be the top-left of the window we create. This is how it was done in
       * Carbon. If it ought to be different we'll probably need to look at all
       * the callers.
       *
       * Note: This means that if you put a secondary screen on top of your main
       * screen and open a window in the top screen, it'll be incorrectly shifted
       * down by the height of the menu bar. Same thing would happen in Carbon.
       *
       * Note: If you pass a rect with 0,0 for an origin, the window ends up in a
       * weird place for some reason. This stops that without breaking popups.
       */
      // Compensate for difference between frame and content area height (e.g. title bar).
      NSRect newWindowFrame = [NSWindow frameRectForContentRect:aRect styleMask:features];

      contentRect = aRect;
      contentRect.origin.y -= (newWindowFrame.size.height - aRect.size.height);

      if (windowType != eWindowType_popup)
        contentRect.origin.y -= [[NSApp mainMenu] menuBarHeight];
    }

    // NSLog(@"Top-level window being created at Cocoa rect: %f, %f, %f, %f\n",
    //       rect.origin.x, rect.origin.y, rect.size.width, rect.size.height);

    Class windowClass = [NSWindow class];
    // If we have a titlebar on a top-level window, we want to be able to control the 
    // titlebar color (for unified windows), so use the special ToolbarWindow class. 
    // Note that we need to check the window type because we mark sheets as 
    // having titlebars.
    if ((windowType == eWindowType_toplevel || windowType == eWindowType_dialog) &&
        (features & NSTitledWindowMask))
      // windowClass = [ToolbarWindow class];
      windowClass = objc_getClass("ToolbarWindow");
    // If we're a popup window we need to use the PopupWindow class.
    else if (windowType == eWindowType_popup)
      // windowClass = [PopupWindow class];
      windowClass = objc_getClass("PopupWindow");
    // If we're a non-popup borderless window we need to use the
    // BorderlessWindow class.
    else if (features == NSBorderlessWindowMask)
      // windowClass = [BorderlessWindow class];
      windowClass = objc_getClass("BorderlessWindow");

    // Create the window
    tail.mWindow = [[windowClass alloc] initWithContentRect:contentRect styleMask:features 
                                   backing:NSBackingStoreBuffered defer:YES];

    // Make sure that the content rect we gave has been honored.
    NSRect wantedFrame = [tail.mWindow frameRectForContentRect:contentRect];
    if (!NSEqualRects([tail.mWindow frame], wantedFrame)) {
      // This can happen when the window is not on the primary screen.
      [tail.mWindow setFrame:wantedFrame display:NO];
    }

    if (windowType == eWindowType_invisible) {
      [tail.mWindow setLevel:kCGDesktopWindowLevelKey];
    } else if (windowType == eWindowType_popup) {
      [tail.mWindow setLevel:NSPopUpMenuWindowLevel];
      [tail.mWindow setHasShadow:YES];
    }

    [tail.mWindow setBackgroundColor:[NSColor whiteColor]];
    [tail.mWindow setContentMinSize:NSMakeSize(60, 60)];
    [tail.mWindow disableCursorRects];

    // setup our notification delegate. Note that setDelegate: does NOT retain.
    Class windowDelegate = objc_getClass("WindowDelegate");
    tail.mDelegate = [[windowDelegate alloc] initWithGeckoWindow:aWindow];
    [tail.mWindow setDelegate:tail.mDelegate];

    // [[WindowDataMap sharedWindowDataMap] ensureDataForWindow:tail.mWindow];
    tail.mWindowMadeHere = PR_TRUE;
  }
  NS_ENSURE_SUCCESS(rv, rv);

  // Re-import state.
  // [tail.mWindow importState:state];
  importState(tail.mWindow, state);

  // Reparent the content view.
  [tail.mWindow setContentView:contentView];
  [contentView release];
  SetNativeWindowOnSubviews(contentView, tail.mWindow);

  // Reparent child windows.
  enumerator = [childWindows objectEnumerator];
  while ((child = [enumerator nextObject])) {
    [tail.mWindow addChildWindow:child ordered:NSWindowAbove];
  }

  // Show the new window.
  if (isVisible) {
    rv = aWindow->Show(PR_TRUE);
    NS_ENSURE_SUCCESS(rv, rv);
  }

  return NS_OK;

  NS_OBJC_END_TRY_ABORT_BLOCK_NSRESULT;
}

#filter emptyLines

# This file is in the UTF-8 encoding

# Installer keys (don't translate strings in $$)
#define SETUP_TITLE 安裝 $ProductShortName$
#define SETUP_WELCOME 歡迎使用 %s
#define SETUP_MESSAGE0 你目前正要安裝的版本是 %s $Version$ 中文版。
#define SETUP_MESSAGE1 中文語言由林弘德 (piaip@csie.ntu.edu.tw) 所維護，並感謝臺灣 Mozilla 社群 (http://moztw.org/) 的參與和協助。
#define SETUP_MESSAGE1_UNIX 中文語言由林弘德 (piaip@csie.ntu.edu.tw) 所維護，並感謝臺灣 Mozilla 社群 (http://moztw.org/) 的參與和協助。
#define SETUP_MESSAGE2 建議先關閉其它執行中程式，並記得移除舊版 $ProductShortName$ (設定會自動保留下來)
#define SETUP_MESSAGE3 【安裝請務必先移除舊版或裝到不同目錄】

#define LICENSE_TITLE 軟體授權同意書
#define LICENSE_SUBTITLE 使用軟體的授權、保證與聲明
#define LICENSE_MESSAGE0 請仔細閱讀以下的授權同意書。如果你懶得看或看不懂英文，請起碼記得：這個軟體是免費的，不過我們不為它負任何責任，也沒有任何保證。
#define LICENSE_ACCEPT 我接受上述條款
#define LICENSE_DECLINE 我「拒絕」接受上述條款

#define SETUP_TYPE_TITLE 安裝方式
#define SETUP_TYPE_SUBTITLE 選取安裝選項
#define SETUP_TYPE_MESSAGE0 請選擇安裝方式後按「下一步」。
#define SETUP_TYPE_EXISTING 所選的目錄已安裝前一版的 Firefox。要完全刪除 %s 請按「刪除目錄」，你的 Firefox 設定會自動保留下來。 若想換目錄請選取消。

# &Ampersand is used to select a shortcut key
#define TYPE_STANDARD 標準安裝(&S)
#define TYPE_STANDARD_DESC 安裝一般常用元件。

#define TYPE_CUSTOM 自訂安裝(&C)
#define TYPE_CUSTOM_DESC 自行指定要安裝的元件，不建議新手使用。

#define SELECT_TITLE 選用元件
#define SELECT_SUBTITLE 可提升您瀏覽的體驗
# 加強 $ProductShortName$ 的其他元件。
#define SELECT_MESSAGE0 選取其它想安裝的元件後按「下一步」。

#define LOCATION_TITLE 安裝目錄
#define LOCATION_SUBTITLE $ProductShortName$ 會安裝到哪個目錄
#define LOCATION_MESSAGE0 將會安裝 $ProductShortName$ 到下面指定的目錄：

#define UPGRADE_TITLE 升級
#define UPGRADE_SUBTITLE 升級已安裝的 $ProductShortName$
#define UPGRADE_CLEANUP 在指定的目錄中找到舊版的 $ProductNameInternal$。

#define UPGRADE_CLEAN 執行超乾淨重裝
#define UPGRADE_CLEAN_MSG 所謂的「超乾淨重裝」會先完全刪除安裝目錄內的所有檔案！ 請確定這子目錄底下沒有任何其它重要的檔案！
#define UPGRADE_OVER 如果不執行「超乾淨重裝」，有時一些不同版本的元件會造成你新裝的版本出問題。
#define UPGRADE_OVER_WINDIR 無法安全升級，請選個新的安裝目錄。

#define ADD_TITLE 安裝 $ProductShortName$ - 選取其他元件
#define ADD_MESSAGE0 選取其它想安裝的元件。

#define WININT_TITLE 設定捷徑
#define WININT_SUBTITLE 建立程式圖示
#define WININT_MESSAGE0 建立 $ProductShortName$ 的程式圖示於:

#define WININT_DESKTOP 桌面上
#define WININT_START 開始功能表
#define WININT_QUICKL 快速啟動列

#define USE_AS_DEFAULT 將 %s 設為我的預設瀏覽器。

#define WININT_PFOLDER_TITLE 安裝 $ProductShortName$ - 安裝目錄
#define WININT_PFOLDER_MESSAGE0 安裝程式會把程式的捷徑加到以下的程式集目錄。你可以輸入新的目錄名稱或是從底下的列表中選擇一個已經存在的目錄，然後按「下一步」繼續。

#define ADDL_OPTIONS_TITLE 安裝 $ProductShortName$ - 額外選項
#define ADDL_OPTIONS_MSG1 如果你想把下載的安裝檔存在電腦上，請選取下列選項。如此下次重新安裝時就不用再下載一次。

#define ADV_SETTINGS_TITLE 安裝 $ProductShortName$ - 進階設定
#define ADV_SETTINGS_MSG Message0=如果你的網路連線需要設定 Proxy，請在此輸入你的伺服器名稱及 Port。如果你沒有使用 Proxy，請不要輸入任何資料。

#define START_TITLE 總結
#define START_SUBTITLE 已準備好開始安裝 $ProductShortName$ 。
#define START_INSTALL 安裝程式會安裝下列元件：
#define START_DOWNLOAD 安裝程式會下載並安裝下列元件：
#define START_MESSAGE0 按「下一步」以繼續

#define DL_TITLE 正在下載
#define DL_SUBTITLE 正在下載需要的元件...
#define DL_BLURB 安裝程式正在下載安裝 $ProductShortName$ 必要的檔案...
#define DL_FILENAME 目前下載:
#define DL_TIMELEFT 剩餘時間:

#define INSTALL_TITLE 正在安裝
#define INSTALL_SUBTITLE 正在安裝 $ProductShortName$...
#define INSTALL_BLURB 安裝程式正在安裝程式檔案。
#define INSTALL_STATUSFILE 準備檔案:
#define INSTALL_STATUSCOMP 正在安裝:

#define COMPLETE_TITLE 安裝完成
#define COMPLETE_MESSAGE0 已成功安裝 %s $Version$。
#define COMPLETE_MESSAGE1 關於中文版與其它資訊請見 Mozilla Taiwan - http://moztw.org/
#define COMPLETE_LAUNCH 馬上執行 %s $Version$ 。

#define DL2_TITLE 安裝 $ProductShortName$ - 下載
#define DL2_MESSAGE0 安裝程式正在下載必要的檔案，這需要一點時間。
#define DL2_RETRY 有些檔案的 CRC 檢查有誤，現在會重新下載這些不正確的檔案。

#define CLOSE_CHECK 下載成功。請按「確定」繼續 (自動結束所有執行中的 $ProductShortName$ 程式)，或按「取消」中止安裝程式。
#define CLOSE_CHECK2 要先關閉執行中的 $ProductShortName$ 才能繼續安裝。 請按「確定」以自動關閉執行中程式及開始安裝。
#define CLOSE_WAIT 結束 $ProductShortName$ ，請稍候...

#define XPCOM_SHORT 跨平台引擎
#define CELTX_SHORT $ProductShortName$
#define HELP_SHORT $ProductShortName$ 說明文件
#define UNINSTALL_SHORT $CompanyName$ 移除程式
#define LANGPACK_TITLE 語言套件

#define ADT_SHORT 開發者工具
#define ADT_LONG DOM 觀察器 - 網頁開發者的好夥伴

#define QFA_SHORT 錯誤回報工具
#define QFA_LONG 回報 $ProductShortName$ 的執行錯誤資訊

#define RPT_SHORT 網站回報工具
#define RPT_LONG 回報網站與 $ProductShortName$ 的相容性問題

#define CORE_PREPARING 準備安裝程序中，請稍候...
#define INST_UNINST 安裝移除工具中，請稍候...

#define MSG_UNFINISHED_DL 上一次執行安裝時沒有下載完全部的檔案。你想使用這些檔案以避免等一下又重新下載相同的檔案嗎？
#define MSG_UNFINISHED_INSTALL 上一次執行安裝時沒有安裝完全部的檔案。你想使用這些檔案以避免等一下又重新下載相同的檔案嗎？
#define MSG_CORRUPTED 安裝程式偵測到此安裝檔中的這些套件是壞的:%s請重新下載一次安裝檔再進行安裝。
#define MSG_CORRUPTED_AUTO 安裝程式偵測到此安裝檔中至少有一個套件是壞的。請重新下載一次安裝檔再進行安裝。
#define MSG_TOO_MANY_CRC 太多次下載失敗。安裝程式即將中止。已經成功下載的檔案不會被刪除掉。下次你再執行安裝程式時這些檔案會被自動載入。
#define MSG_TOO_MANY_NETWORK 下載 %s 時遇上太多網路錯誤。請稍候再試。已經成功下載的檔案不會被刪除掉。下次你再執行安裝程式時這些檔案會被自動載入。
#define MSG_VERIFYING 正在檢查安裝檔的正確性，請稍候...
#define MSG_UNDEFINED 奇怪的錯誤
#define MSG_OOM 記憶體不足！
#define MSG_STATUS_DL %s，速度:%.2f KB/秒 (%u/%u KB 已下載)
#define MSG_COMPLETED 已完成 %d%% 
#define MSG_REQUIRED (必要的)
#define MSG_CANCELING 取消安裝中，請稍候...
#define MSG_ERROR_UNCOMPRESS 無法解壓縮 %s: %d
#define MSG_USAGE Usage: %s [options]\n	[options] can be any of the following combination:\n		-h: This help.\n		-a [path]: Alternate archive search path.\n		-app [app id]: ID of application which is launching the installer (shared installs)\n		-app_path [app]: Points to (full path) representative file of application (Shared installs)\n	*	-dd [path]: Suggested install destination directory. (Shared installs)\n	*	-greLocal: Forces GRE to be installed into the application dir.\n	*	-greShared: Forces GRE to be installed into a global, shared dir (normally)\n			c:\program files\common files\mozilla.org\GRE\n		-reg_path [path]: Where to make entries in the Windows registry. (Shared installs)\n		-f: Force install of GRE installer (Shared installs), though it'll work\n			for non GRE installers too.\n		-greForce: Force 'Component GRE' to be downloaded, run, and installed.  This\n			bypasses GRE's logic of determining when to install by running its\n			installer with a '-f' flag.\n		-n [filename]: Setup's parent process filename.\n	*	-ma: Run setup in Auto mode.\n	*	-ms: Run setup in Silent mode.\n		-ira: Ignore the [RunAppX] sections\n		-ispf: Ignore the [Program FolderX] sections that show\n			the Start Menu shortcut folder at the end of installation.\n	*	-showBanner: Show the banner image in the download and install progress dialogs\n	*	-hideBanner: Hide the banner image in the download and install progress dialogs\n	*	-cleanupOnUpgrade: Tells Setup to check to see if user is upgrading (installing on top\n		of previous version of product).  If user is upgrading:\n			* NORMAL mode: prompt user on how to proceed\n			* All other modes: assume user wants to cleanup.\n	*	-noCleanupOnUpgrade: Tells Setup to not check if user is upgrading (installing on top\n		of previous version of product).  This will disable the cleanup feature.\n\n	* means it will override config.ini
#define MSG_USE_FTP 使用 FTP 下載檔案(&F)
#define MSG_USE_HTTP 使用 &HTTP 協定來下載檔案(&H)
#define MSG_SAVE_LOCALLY 在本地儲存安裝檔(&S)
#define MSG_DL_PAUSED 安裝程式偵測到網路問題。如果你的網路連線已經中斷了，請在恢復連線後按「繼續」。
#define MSG_NOT_ADMIN 安裝程式偵測到你沒有系統管理者的權限。建議你最好不要在沒有權限的情況下安裝，否則有些功能可能會出問題。要繼續安裝嗎？
#define MSG_NOT_ADMIN_AUTO 安裝程式偵測到你沒有系統管理者的權限，無法繼續安裝。

#define UNINST_RUNNING $ProductNameInternal$ 偵測到正在執行。繼續移除前請關閉 $ProductNameInternal$。按「確定」馬上關閉 $ProductNameInternal$。
#define UNINST_SHUTDOWN 關閉 $ProductNameInternal$ 中。請稍候...

#define UNINST_FONT MS Sans Serif
#define UNINST_FONTSIZE 8
#define UNINST_CHARSET 0
# Here is a partial list CHAR_SETS
#  ANSI_CHARSET = 0
#  DEFAULT_CHARSET = 1
#  SYMBOL_CHARSET = 2
#  SHIFTJIS_CHARSET = 128
#  GB2312_CHARSET = 134
#  HANGEUL_CHARSET = 129
#  CHINESEBIG5_CHARSET = 136
#  OEM_CHARSET 255

#define UNINST_TITLE $ProductName$ 移除程式
#define UNINST_MESSAGE0 你確定要完整移除 %s 和其所有元件嗎？
#define BTN_UNINST 移除(&U)
#define BTN_CANCEL 取消(&C)
#define BTN_MESSAGE1 移除程式偵測到下列的共享檔案不再被任何程式使用。但如有任何程式需要的共享檔案被移除，這些程式可能無法再執行。你確定要移除這些共享檔案嗎？
#define BTN_MESSAGE2 留下這些檔案對系統並沒有影響。如果你不確定該怎麼做，建議你不要將共享檔案移除。
#define BTN_FILENAME 檔名:
#define BTN_NO 否(&N)
#define BTN_NOTOALL 全部皆否(&O)
#define BTN_YES 是(&Y)
#define BTN_YESTOALL 全部皆是(&E)

#define ERROR_DLL_LOAD 無法載入 %s
#define ERROR_STRING_LOAD 無法載入字串資源 ID %d
#define ERROR_STRING_NULL 遇到空指標。
#define ERROR_GLOBALALLOC 記憶體定位錯誤。
#define ERROR_FAILED %s 失敗。
#define ERROR_DIALOG_CREATE 無法建立 %s 對話視窗。
#define DLGQUITTITLE 問題
#define DLGQUITMSG 你確定要取消嗎？
#define ERROR_GET_SYSTEM_DIRECTORY_FAILED GetSystemDirectory() 失敗。
#define ERROR_GET_WINDOWS_DIRECTORY_FAILED GetWindowsDirectory() 失敗。
#define ERROR_CREATE_TEMP_DIR 移除程式無法建立暫存目錄: %s
#define ERROR_SETUP_REQUIREMENT 需要 Windows95 或以上的作業系統！正在離開移除程式...
#define MB_WARNING_STR 警告
#define ERROR_UNINSTALL_LOG_FOLDER 找不到移除記錄資料夾: %s
#define MB_MESSAGE_STR 訊息
#define DLG_REMOVE_FILE_TITLE 移除檔案？
#define ERROR_GETVERSION GetVersionEx() 失敗！
#define MB_ATTENTION_STR 注意
#define MSG_FORCE_QUIT_PROCESS 移除程式偵測到 %s (%s) 正在執行中。按「確定」關閉 %s 並繼續移除程序。或是用工作管理員關閉 %s，然後按「確定」繼續。
#define MSG_FORCE_QUIT_PROCESS_FAILED 移除程式正要關閉。移除程式無法繼續因為 %s (%s) 正在執行中。請嘗試用工作管理員手動關閉 %s 然後再執行移除程式一次。
#define MSG_DELETE_INSTALLATION_PATH 此目錄的部份檔案未移除:\n\n  %s\n\n你要清空此目錄嗎？
#define MSG_INSTALLATION_PATH_WITHIN_WINDIR 移除程式偵測到 $ProductNameInternal$ 的安裝路徑位於 Windows 系統資料夾中。移除程式無法刪除檔案，因為可能會刪除到重要系統檔案。

#unfilter emptyLines

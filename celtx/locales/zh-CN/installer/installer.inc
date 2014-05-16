#filter emptyLines

# This file is in the UTF-8 encoding

# Installer keys (don't translate strings in $$)
#define SETUP_TITLE $ProductShortName$ 安装
#define SETUP_WELCOME 欢迎安装 %s。
#define SETUP_MESSAGE0 您将要安装 %s。
#define SETUP_MESSAGE1 强烈建议在运行此安装程序之前退出所有的 windows 程序。
#define SETUP_MESSAGE1_UNIX 强烈建议在运行此安装程序之前退出所有的 %s 程序。
#define SETUP_MESSAGE2 点击取消来退出安装程序然后关闭您已经运行的程序，点击下一步继续安装。
#define SETUP_MESSAGE3 点击下一步继续安装 %s。

#define LICENSE_TITLE 软件许可协议
#define LICENSE_SUBTITLE 使用本软件的条款以及条件。
#define LICENSE_MESSAGE0 请先阅读下面的许可协议。使用滚动条来查看协议的其他部分。
#define LICENSE_ACCEPT 接受该协议条款 (&A)
#define LICENSE_DECLINE 拒绝接受该协议条款 (&T)

#define SETUP_TYPE_TITLE 安装类型
#define SETUP_TYPE_SUBTITLE 选择安装的选项。
#define SETUP_TYPE_MESSAGE0 请选择您想要安装的类型，然后点击下一步。
#define SETUP_TYPE_EXISTING 所选的文件夹中已安装了 Firefox。请点击 “删除文件夹” 以完全删除 %s 。您以前的 Firefox 设置不会受到影响。或者，您也可以点击“取消”按钮并选择其他文件夹作为安装目录。

# &Ampersand is used to select a shortcut key
#define TYPE_STANDARD 标准（&S）
#define TYPE_STANDARD_DESC 浏览器将安装最通用的组件。

#define TYPE_CUSTOM 自定义（&C）
#define TYPE_CUSTOM_DESC 您可以选择您想要安装的部分。仅适用于高级用户。

#define SELECT_TITLE 选择组件
#define SELECT_SUBTITLE 其他增强 $ProductShortName$ 功能的组件。
#define SELECT_MESSAGE0 选择您想安装的其他可选安装组件，然后点击下一步。

#define LOCATION_TITLE 安装文件夹
#define LOCATION_SUBTITLE $ProductShortName$ 将被安装至的地方。
#define LOCATION_MESSAGE0 $ProductShortName$ 将被安装到如下文件夹：

#define UPGRADE_TITLE 升级
#define UPGRADE_SUBTITLE 升级一个已存在的 $ProductShortName$ 安装。
#define UPGRADE_CLEANUP 在所选文件夹中找到了 $ProductNameInternal$ 旧的安装。

#define UPGRADE_CLEAN 执行干净安装
#define UPGRADE_CLEAN_MSG 干净安装将完全移除安装文件夹中的所有内容。任何第三方的组件都会丢失。我们建议这样做以免引起兼容问题。
#define UPGRADE_OVER 如果您选择不进行干净安装，第三方的组件不会被移除，但是可能会引发程序未知的行为。
#define UPGRADE_OVER_WINDIR 无法安全升级 $ProductNameInternal$,因为它被安装在 Windows 文件夹中。建议您选择其他文件夹安装 $ProductNameInternal$。

#define ADD_TITLE $ProductShortName$ 安装 - 选择其它可选安装组件
#define ADD_MESSAGE0 选择或者清空其他可选安装组件。

#define WININT_TITLE 设置快捷方式
#define WININT_SUBTITLE 创建程序图标
#define WININT_MESSAGE0 为 $ProductShortName$ 创建图标：

#define WININT_DESKTOP 在我的桌面
#define WININT_START 在我的启动菜单程序文件夹中
#define WININT_QUICKL 在我的快速启动栏中

#define USE_AS_DEFAULT 将 %s 设为我的默认浏览器。

#define WININT_PFOLDER_TITLE $ProductShortName$ 安装 - 选择安装文件夹
#define WININT_PFOLDER_MESSAGE0 安装程序将要把程序图标添加到下面的程序文件夹列表中。您可以输入一个新文件夹名称，或者从现有的文件夹中选择。点击下一步继续。

#define ADDL_OPTIONS_TITLE $ProductShortName$ 安装 - 附加选项
#define ADDL_OPTIONS_MSG1 如果您要在本地保存已下载的安装文件，请选择下面的选项。这将允许您不需要下载这些文件即可重新运行安装程序。安装文件将保存到下面的路径中。

#define ADV_SETTINGS_TITLE $ProductShortName$ 安装 - 高级设置
#define ADV_SETTINGS_MSG 如果您需要通过代理服务器连接到因特网，请输入您的服务器名称和端口信息。如果不需要代理服务器，保留空白即可。

#define START_TITLE 汇总信息
#define START_SUBTITLE 可以开始安装 $ProductShortName$.
#define START_INSTALL 安装程序将安装下列组件：
#define START_DOWNLOAD 安装程序将下载并安装下列组件：
#define START_MESSAGE0 点击下一步继续

#define DL_TITLE 下载
#define DL_SUBTITLE 下载所需组件...
#define DL_BLURB 安装程序正在下载安装 $ProductShortName$ 所需的文件.
#define DL_FILENAME 正在下载：
#define DL_TIMELEFT 剩余时间：

#define INSTALL_TITLE 安装
#define INSTALL_SUBTITLE 正在安装 $ProductShortName$...
#define INSTALL_BLURB 安装程序正在安装应用程序文件。
#define INSTALL_STATUSFILE 准备文件：
#define INSTALL_STATUSCOMP 正在安装：

#define COMPLETE_TITLE 安装完成
#define COMPLETE_MESSAGE0 %s 已被成功安装
#define COMPLETE_MESSAGE1 点击完成结束安装。
#define COMPLETE_LAUNCH 立即执行 %s 。

#define DL2_TITLE $ProductShortName$ 安装 - 下载
#define DL2_MESSAGE0 安装程序正在下载所需文件。该过程所需时间取决于您的网络连接的速度。
#define DL2_RETRY 某些文件 CRC 校验失败，必须重新下载这些文件。

#define CLOSE_CHECK $ProductShortName$ 下载完成。必须关闭 $ProductNameInternal$ 才能继续安装。 点击确定以退出 $ProductNameInternal$ 并开始安装。
#define CLOSE_CHECK2 您必须关闭 $ProductNameInternal$ 以继续此安装。点击确定以退出 $ProductNameInternal$ 以继续。
#define CLOSE_WAIT 正在关闭 $ProductNameInternal$。请稍候...

#define XPCOM_SHORT 跨平台 COM
#define CELTX_SHORT $ProductShortName$
#define HELP_SHORT $ProductShortName$ 帮助
#define UNINSTALL_SHORT $CompanyName$ 反安装程序
#define LANGPACK_TITLE 语言包

#define ADT_SHORT 开发工具
#define ADT_LONG DOM 查看器 - 网页开发人员的工具.

#define QFA_SHORT 质量问题反馈代理
#define QFA_LONG 用于汇报 $ProductShortName$ 崩溃信息

#define RPT_SHORT 网站报告器
#define RPT_LONG 用于汇报 $ProductShortName$ 的网页兼容问题

#define CORE_PREPARING 准备安装，请稍候...
#define INST_UNINST 正在安装反安装程序，请稍候...

#define MSG_UNFINISHED_DL 上一次的安装会话还没有完全下载所有必须的文件。您要使用上一次下载的文件，以避免再次下载吗？
#define MSG_UNFINISHED_INSTALL 上一次的安装会话还没有完全安装所有必须的文件。您要使用上一次下载的文件，以避免再次下载吗？
#define MSG_CORRUPTED 安装程序检测到安装文件中的这些文件已损坏：%s 您必须去获取另一份 $ProductShortName$ 安装程序来继续完成安装。
#define MSG_CORRUPTED_AUTO 安装程序检测到安装文件中至少有一个文件有问题。您必须去获取另一份 $ProductShortName$ 安装程序来继续完成安装。
#define MSG_TOO_MANY_CRC 太多下载失败。安装程序将自动取消。任何已下载的文件将不会被删除。下次运行安装程序时，将继续使用这些文件。
#define MSG_TOO_MANY_NETWORK 下载 %s 时发生太多的网络错误。请重试。任何已下载的文件将不会被删除。下次运行安装程序时，将继续使用这些文件。
#define MSG_VERIFYING 正在验证文件，请稍候...
#define MSG_UNDEFINED 未知错误
#define MSG_OOM 内存不足！
#define MSG_STATUS_DL %s 速度 %.2f KB/秒 (%u KB of %u KB 已下载)
#define MSG_COMPLETED 已完成 %d%%
#define MSG_REQUIRED (必须)
#define MSG_CANCELING 正在取消安装，请稍候...
#define MSG_ERROR_UNCOMPRESS 解压缩文件 %s: %d 出错
#define MSG_USAGE Usage: %s [options]\n	[options] can be any of the following combination:\n		-h: This help.\n		-a [path]: Alternate archive search path.\n		-app [app id]: ID of application which is launching the installer (shared installs)\n		-app_path [app]: Points to (full path) representative file of application (Shared installs)\n	*	-dd [path]: Suggested install destination directory. (Shared installs)\n	*	-greLocal: Forces GRE to be installed into the application dir.\n	*	-greShared: Forces GRE to be installed into a global, shared dir (normally)\n			c:\program files\common files\mozilla.org\GRE\n		-reg_path [path]: Where to make entries in the Windows registry. (Shared installs)\n		-f: Force install of GRE installer (Shared installs), though it'll work\n			for non GRE installers too.\n		-greForce: Force 'Component GRE' to be downloaded, run, and installed.  This\n			bypasses GRE's logic of determining when to install by running its\n			installer with a '-f' flag.\n		-n [filename]: Setup's parent process filename.\n	*	-ma: Run setup in Auto mode.\n	*	-ms: Run setup in Silent mode.\n		-ira: Ignore the [RunAppX] sections\n		-ispf: Ignore the [Program FolderX] sections that show\n			the Start Menu shortcut folder at the end of installation.\n	*	-showBanner: Show the banner image in the download and install progress dialogs\n	*	-hideBanner: Hide the banner image in the download and install progress dialogs\n	*	-cleanupOnUpgrade: Tells Setup to check to see if user is upgrading (installing on top\n		of previous version of product).  If user is upgrading:\n			* NORMAL mode: prompt user on how to proceed\n			* All other modes: assume user wants to cleanup.\n	*	-noCleanupOnUpgrade: Tells Setup to not check if user is upgrading (installing on top\n		of previous version of product).  This will disable the cleanup feature.\n\n	* means it will override config.ini
#define MSG_USE_FTP 使用 &FTP 下载文件
#define MSG_USE_HTTP 使用 &HTTP 下载文件
#define MSG_SAVE_LOCALLY 将安装程序保存到本地(&S)
#define MSG_DL_PAUSED 安装程序遇到网络问题，该问题导致下载已被中断。如果您已经失去了网络连接，请在网络连接恢复之后点击 恢复 按钮。
#define MSG_NOT_ADMIN 安装程序检测到您没有此系统的管理员权限。我们强烈建议您不要继续安装 $ProductShortName$，否则程序将来可能无法正常工作。您要继续吗？
#define MSG_NOT_ADMIN_AUTO 安装程序检测到您没有此系统的管理员权限。安装程序无法继续完成 $ProductShortName$ 的安装

#define UNINST_RUNNING $ProductNameInternal$ 仍然在运行。请在继续前退出 $ProductNameInternal$。请点击 确定以自动退出 $ProductNameInternal$ 并继续反安装。
#define UNINST_SHUTDOWN 正在关闭 $ProductNameInternal$。请稍候...

#define UNINST_FONT MS Sans Serif
#define UNINST_FONTSIZE 8
#define UNINST_CHARSET 134
# Here is a partial list CHAR_SETS
#  ANSI_CHARSET = 0
#  DEFAULT_CHARSET = 1
#  SYMBOL_CHARSET = 2
#  SHIFTJIS_CHARSET = 128
#  GB2312_CHARSET = 134
#  HANGEUL_CHARSET = 129
#  CHINESEBIG5_CHARSET = 136
#  OEM_CHARSET 255

#define UNINST_TITLE $ProductName$ 反安装程序
#define UNINST_MESSAGE0 您确定要删除 %s 以及所有的组件吗？
#define BTN_UNINST 卸载(&U)
#define BTN_CANCEL 取消(&C)
#define BTN_MESSAGE1 反安装程序检测到如下共享文件已不再被任何程序使用。如果某些程序仍然需要使用这些文件，而您已经将其删除，那这些程序将无法工作。请问您要删除这些共享文件吗？
#define BTN_MESSAGE2 保留该文件不会对您的系统有任何危害。如果您不是非常确定，建议您保留此共享文件。
#define BTN_FILENAME 文件名：
#define BTN_NO 否(&N)
#define BTN_NOTOALL 全否(&o)
#define BTN_YES 是(&Y)
#define BTN_YESTOALL 全是(&e)

#define ERROR_DLL_LOAD 无法载入 %s
#define ERROR_STRING_LOAD 无法载入字符资源 ID %d
#define ERROR_STRING_NULL 产生了空指针。
#define ERROR_GLOBALALLOC 申请内存出错。
#define ERROR_FAILED %s 失败
#define ERROR_DIALOG_CREATE 无法创建 %s 对话框。
#define DLGQUITTITLE 问题
#define DLGQUITMSG 确定要取消吗？
#define ERROR_GET_SYSTEM_DIRECTORY_FAILED GetSystemDirectory() 失败.
#define ERROR_GET_WINDOWS_DIRECTORY_FAILED GetWindowsDirectory() 失败.
#define ERROR_CREATE_TEMP_DIR 反安装程序无法创建临时文件夹：%s
#define ERROR_SETUP_REQUIREMENT 至少需要 Windows95 或更新版本。反安装程序将退出...
#define MB_WARNING_STR 警告
#define ERROR_UNINSTALL_LOG_FOLDER 反安装日志目录不存在:%s
#define MB_MESSAGE_STR 消息
#define DLG_REMOVE_FILE_TITLE 移除文件？
#define ERROR_GETVERSION GetVersionEx() 失败.
#define MB_ATTENTION_STR 注意
#define MSG_FORCE_QUIT_PROCESS 反安装程序检测到 %s (%s) 正在运行。点击确定以退出 %s 以继续卸载。或者使用 Windows 任务管理器退出 %s，然后点击确定以继续卸载。
#define MSG_FORCE_QUIT_PROCESS_FAILED 反安装程序现在将退出。因为 %s (%s) 正在运行，反安装程序无法继续。请尝试使用 Windows 任务管理器退出 %s 然后再运行反安装程序。
#define MSG_DELETE_INSTALLATION_PATH 并非全部文件都从文件夹：\n\n  %s\n\n 中卸载了。请问您要完全删除该文件夹吗？
#define MSG_INSTALLATION_PATH_WITHIN_WINDIR 反安装程序检测到您选择的 $ProductNameInternal$ 安装目录位于 Windows 目录，反安装程序将不会删除该安装以避免删除重要的系统文件。

#unfilter emptyLines

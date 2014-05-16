#filter emptyLines

# This file is in the UTF-8 encoding

# Installer keys (don't translate strings in $$)
#define SETUP_TITLE $ProductShortName$ のセットアップ
#define SETUP_WELCOME %s へようこそ
#define SETUP_MESSAGE0 %s のインストールを開始します。
#define SETUP_MESSAGE1 このセットアップを実行する前にすべての Windows プログラムを終了させることを強くお勧めします。
#define SETUP_MESSAGE1_UNIX このセットアップを実行する前に %s のインスタンスをすべて終了させることを強くお勧めします。
#define SETUP_MESSAGE2 セットアップを中止して実行中のプログラムを終了する場合は [キャンセル] をクリックしてください。セットアップを続行するには [次へ] をクリックしてください。
#define SETUP_MESSAGE3 %s のインストールを続行するには [次へ] をクリックしてください。

#define LICENSE_TITLE ソフトウェア使用許諾書
#define LICENSE_SUBTITLE このソフトウェアを使用するための条項
#define LICENSE_MESSAGE0 スクロールバーを使用して次の使用許諾書をよくお読みください。
#define LICENSE_ACCEPT 使用許諾書に同意する(&A)
#define LICENSE_DECLINE 使用許諾書に同意しない(&T)

#define SETUP_TYPE_TITLE セットアップの種類
#define SETUP_TYPE_SUBTITLE セットアップオプションの選択
#define SETUP_TYPE_MESSAGE0 実行するセットアップの種類を選択して［次へ］をクリックしてください。
#define SETUP_TYPE_EXISTING 選択されているディレクトリにはすでに Firefox がインストールされています。 [ディレクトリを削除] ボタンを押すと %s を完全に削除します。この場合も Firefox の設定は削除されません。あるいは [キャンセル] ボタンを押して別のインストール先ディレクトリを選択してください。

# &Ampersand is used to select a shortcut key
#define TYPE_STANDARD 標準(&S)
#define TYPE_STANDARD_DESC 最も一般的な構成でインストールします。

#define TYPE_CUSTOM カスタム(&C)
#define TYPE_CUSTOM_DESC インストールする構成を選択します(上級ユーザ向け)。

#define SELECT_TITLE コンポーネントの選択
#define SELECT_SUBTITLE $ProductShortName$ を強化する追加コンポーネントです。
#define SELECT_MESSAGE0 インストールするコンポーネントを選択し [次へ] をクリックしてください。

#define LOCATION_TITLE インストール先の選択
#define LOCATION_SUBTITLE $ProductShortName$ のインストール先を選択してください
#define LOCATION_MESSAGE0 以下のプログラムフォルダに $ProductShortName$ をインストールします:

#define UPGRADE_TITLE アップグレード
#define UPGRADE_SUBTITLE 既存の $ProductShortName$ をアップグレードします。
#define UPGRADE_CLEANUP 選択したフォルダには以前の $ProductNameInternal$ がインストールされています。

#define UPGRADE_CLEAN クリーンインストールを実行する
#define UPGRADE_CLEAN_MSG クリーンインストールではインストール先フォルダのすべてのコンポーネントを完全に削除します！あなたのインストールしたサードパーティ製コンポーネントはすべて削除されます。非互換性による問題を防止するため、クリーンインストールを推奨しています。
#define UPGRADE_OVER クリーンインストールを実行しなければ、サードパーティ製のコンポーネントは削除されません。ただし、この場合は予期せぬ不具合が生じる可能性があります。
#define UPGRADE_OVER_WINDIR $ProductNameInternal$ が Windows のシステムフォルダにインストールされているため、安全にアップグレードすることができません。別のフォルダに $ProductNameInternal$ をインストールすることをお勧めします。

#define ADD_TITLE $ProductShortName$ セットアップ - 追加コンポーネント
#define ADD_MESSAGE0 インストールする追加コンポーネントを選択または削除してください。

#define WININT_TITLE ショートカットの設定
#define WININT_SUBTITLE プログラムアイコンを作成する
#define WININT_MESSAGE0 $ProductShortName$ アイコンの作成先:

#define WININT_DESKTOP デスクトップ
#define WININT_START スタートメニュー
#define WININT_QUICKL クイック起動ツールバー

#define USE_AS_DEFAULT %s を既定のブラウザに設定する。

#define WININT_PFOLDER_TITLE $ProductShortName$ セットアップ - プログラムフォルダの選択
#define WININT_PFOLDER_MESSAGE0 以下のプログラムフォルダにプログラムアイコンを作成します。新しいフォルダ名を指定したり既存のフォルダから選択することもできます。

#define ADDL_OPTIONS_TITLE $ProductShortName$ セットアップ - 追加オプション
#define ADDL_OPTIONS_MSG1 ダウンロードしたセットアップファイルをコンピュータ上に保存する場合には、次のオプションを選択してください。セットアップを再度実行するときに再度ダウンロードせずに済むようになります。セットアップファイルは次のパスに保存されます。

#define ADV_SETTINGS_TITLE $ProductShortName$ セットアップ - 詳細設定
#define ADV_SETTINGS_MSG インターネット接続にプロキシサーバが必要な場合、サーバ名とポート番号を入力してください。プロキシサーバが必要でない場合、このフィールドは空白のままにしてください。

#define START_TITLE セットアップ設定の確認
#define START_SUBTITLE $ProductShortName$ をインストールする準備ができました。
#define START_INSTALL 以下のコンポーネントがインストールされます:
#define START_DOWNLOAD 以下のコンポーネントがダウンロードしてインストールされます:
#define START_MESSAGE0 [次へ] をクリックするとインストールを開始します。

#define DL_TITLE ダウンロードしています
#define DL_SUBTITLE 必要なコンポーネントをダウンロードしています...
#define DL_BLURB $ProductShortName$ のインストールに必要なファイルをダウンロードしています...
#define DL_FILENAME ダウンロード中のファイル:
#define DL_TIMELEFT 残り時間:

#define INSTALL_TITLE インストールしています
#define INSTALL_SUBTITLE $ProductShortName$ をインストールしています...
#define INSTALL_BLURB アプリケーションファイルをインストールしています。
#define INSTALL_STATUSFILE 準備中のファイル:
#define INSTALL_STATUSCOMP インストール中のファイル:

#define COMPLETE_TITLE インストール完了
#define COMPLETE_MESSAGE0 %s が正常にインストールされました。
#define COMPLETE_MESSAGE1 [完了] をクリックするとインストールが完了します。
#define COMPLETE_LAUNCH 今すぐ %s を起動する

#define DL2_TITLE $ProductShortName$ セットアップ - ダウンロード
#define DL2_MESSAGE0 必要なファイルをダウンロードしています。ネットワーク接続の速度によっては、しばらく時間がかかることがあります。
#define DL2_RETRY 一部のファイルを再度ダウンロードしています。CRC チェックに失敗したファイルだけがダウンロードされます。

#define CLOSE_CHECK $ProductShortName$ が正常にダウンロードされました。インストールを続行するには $ProductNameInternal$ を閉じる必要があります。［OK］ボタンをクリックすると自動的に $ProductNameInternal$ を終了してインストールを開始します。
#define CLOSE_CHECK2 インストールを続行するには $ProductNameInternal$ を閉じる必要があります。［OK］ボタンをクリックすると自動的に $ProductNameInternal$ を終了してインストールを開始します。
#define CLOSE_WAIT $ProductNameInternal$ を終了しています。しばらくお待ちください...

#define XPCOM_SHORT クロスプラットフォーム COM
#define CELTX_SHORT $ProductShortName$
#define HELP_SHORT $ProductShortName$ ヘルプ
#define UNINSTALL_SHORT $CompanyName$ アンインストーラ
#define LANGPACK_TITLE 言語パック

#define ADT_SHORT 開発ツール
#define ADT_LONG DOM インスペクタ - Web 開発者のためのツール

#define QFA_SHORT 品質フィードバックエージェント
#define QFA_LONG $ProductShortName$ クラッシュ情報の報告に使用します

#define RPT_SHORT Web サイトレポータ
#define RPT_LONG $ProductShortName$ と Web サイトの非互換性の報告に使用します

#define CORE_PREPARING インストール準備中です。しばらくお待ちください...
#define INST_UNINST アンインストーラをインストール中です。しばらくお待ちください...

#define MSG_UNFINISHED_DL 前回のセットアップ実行時にすべての必要なファイルのダウンロードを完了できませんでした。前回ダウンロードしたファイルは再度ダウンロードせずにそのまま使用しますか？
#define MSG_UNFINISHED_INSTALL 前回のセットアップ実行時にすべての必要なファイルのインストールを完了できませんでした。前回ダウンロードしたファイルは再度ダウンロードせずにそのまま使用しますか？
#define MSG_CORRUPTED このセットアップ内の次のアーカイブが壊れています：%s インストール作業を続けるためには、別の $ProductShortName$ セットアップをダウンロードし直す必要があります。
#define MSG_CORRUPTED_AUTO このセットアップ内のアーカイブが一部壊れています。インストール作業を続けるためには、別の $ProductShortName$ セットアップをダウンロードし直す必要があります。
#define MSG_TOO_MANY_CRC ファイルのダウンロードに繰り返し失敗したため、セットアップをキャンセルします。すでにダウンロードされたファイルは削除されず、次回のセットアップ実行時に利用されます。
#define MSG_TOO_MANY_NETWORK %s のダウンロード中にネットワークエラーが繰り返し発生したため、セットアップを中断します。[再開] をクリックすると再度ダウンロードを試します。
#define MSG_VERIFYING アーカイブの完全性を確認しています。しばらくお待ちください...
#define MSG_UNDEFINED 未定義のエラー
#define MSG_OOM メモリが不足しています。
#define MSG_STATUS_DL %s - %.2f KB/秒 (%u KB / %u KB ダウンロード完了)
#define MSG_COMPLETED %d%% 完了
#define MSG_REQUIRED (必須)
#define MSG_CANCELING セットアップをキャンセルしています。しばらくお待ちください...
#define MSG_ERROR_UNCOMPRESS %s の解凍中にエラーが発生しました: %d
#define MSG_USAGE 使用法: %s [options]\n    [options] には以下のものを組み合わせて指定できます:\n        -h:		このヘルプを表示する\n        -a [path]:	アーカイブの代替検索パス\n        -app [app id]:	インストーラを起動しているアプリケーション ID (共有インストール)\n        -app_path [app]:  アプリケーション代表ファイル(例：firefox.exe)へのフルパス(共有インストール)\n    *  -dd [path]:	デフォルトのインストール先ディレクトリ(共有インストール)\n    *  -greLocal:	GRE をアプリケーションディレクトリにインストールする\n    *  -greShared:	GRE をグローバルな共有ディレクトリにインストールする\n		これは通常次のディレクトリになります\n		c:\program files\common files\mozilla.org\GRE\n        -reg_path [path]:  Windows レジストリで使用するエントリ(共有インストール)\n        -f:		GRE なしでインストールが可能でも、必ず GRE をインストールする\n        -greForce:	GRE コンポーネントのダウンロード、実行、インストールを必ず行う\n		このオプションでは -f オプション付きでインストールするかどうかについて GRE の\n		決定ロジックを無視します\n        -n [filename]:	セットアップの親のプロセスファイル名\n    *  -ma:		自動モードでセットアップを実行する\n    *  -ms:		サイレントモードでセットアップを実行する\n        -ira:		[RunAppX] セクションを無視する\n        -ispf:	インストールの最後にスタートメニューショートカットフォルダを表示する\n        		[Program FolderX] セクションを無視する\n    *  -showBanner:	ダウンロードとインストールの進捗ダイアログでバナーを表示する\n    *  -hideBanner:	ダウンロードとインストールの進捗ダイアログでバナーを表示しない\n    *  -cleanupOnUpgrade:  アップグレードセットアップ時(以前のバージョンと同じディレクトリに\n		インストールするとき)にユーザに確認する\n        		通常はどうするかユーザに確認します\n        		モード(-maなど)の指定時には自動的に上書きします\n    *  -noCleanupOnUpgrade:  アップグレードセットアップ時(以前のバージョンと同じディレクトリに\n		インストールするとき)にユーザに確認しない(クリーンインストールしない)\n\n    *  これらのオプションはインストーラ実行ファイルに格納された config.ini の設定よりも優先されます
#define MSG_USE_FTP ファイルのダウンロードに FTP を使用する(&F)
#define MSG_USE_HTTP ファイルのダウンロードに HTTP を使用する(&H)
#define MSG_SAVE_LOCALLY インストーラファイルをローカルに保存する(&S)
#define MSG_DL_PAUSED ネットワークに問題が見つかったためダウンロードを中断しました。ネットワーク接続が切断された場合、ネットワーク接続を再度確立してから［再開］をクリックしてください。
#define MSG_NOT_ADMIN このシステムに対する適切な管理者権限がありません。$ProductShortName$ のインストールを中止することを強くお勧めします。このままインストールを続行しても正しく機能しない可能性があります。それでも続行しますか？
#define MSG_NOT_ADMIN_AUTO このシステムに対する適切な管理者権限がありません。$ProductShortName$ のインストールを続行できません。

#define UNINST_RUNNING $ProductNameInternal$ を実行中です。操作を続行する前に $ProductNameInternal$ を終了させてください。［OK］をクリックすると自動的に $ProductNameInternal$ を終了し、アンインストールします。
#define UNINST_SHUTDOWN $ProductNameInternal$ を終了しています。しばらくお待ちください...

#define UNINST_FONT MS UI Gothic
#define UNINST_FONTSIZE 10.5
#define UNINST_CHARSET 128
# Here is a partial list CHAR_SETS
#  ANSI_CHARSET = 0
#  DEFAULT_CHARSET = 1
#  SYMBOL_CHARSET = 2
#  SHIFTJIS_CHARSET = 128
#  GB2312_CHARSET = 134
#  HANGEUL_CHARSET = 129
#  CHINESEBIG5_CHARSET = 136
#  OEM_CHARSET 255

#define UNINST_TITLE $ProductName$ アンインストーラ
#define UNINST_MESSAGE0 本当に %s とすべてのコンポーネントを削除しますか？
#define BTN_UNINST アンインストール(&U)
#define BTN_CANCEL キャンセル(&C)
# (^^; Windows 標準を確認して合わせるべきか？
#define BTN_MESSAGE1 次の共有ファイルはどのプログラムからも使用されていません。他のプログラムが共有ファイル必要としている場合、削除してしまうとプログラムを実行できなくなる可能性があります。本当にこの共有ファイルを削除しますか？
#define BTN_MESSAGE2 これらのファイルを残していてもシステムに悪影響はありません。削除してよいか分からない場合はシステムから共有ファイルを削除しないことをお勧めします。
#define BTN_FILENAME ファイル名:
#define BTN_NO いいえ(&N)
#define BTN_NOTOALL すべていいえ(&O)
#define BTN_YES はい(&Y)
#define BTN_YESTOALL すべてはい(&E)

#define ERROR_DLL_LOAD %s を読み込めませんでした
#define ERROR_STRING_LOAD 文字列リソース ID %d を読み込めませんでした
#define ERROR_STRING_NULL Null ポインタを参照しました
#define ERROR_GLOBALALLOC メモリアロケーションエラーが発生しました
#define ERROR_FAILED %s に失敗しました
#define ERROR_DIALOG_CREATE %s ダイアログを作成できませんでした
#define DLGQUITTITLE 確認
#define DLGQUITMSG キャンセルしてもよろしいですか？
#define ERROR_GET_SYSTEM_DIRECTORY_FAILED GetSystemDirectory() に失敗しました
#define ERROR_GET_WINDOWS_DIRECTORY_FAILED GetWindowsDirectory() に失敗しました
#define ERROR_CREATE_TEMP_DIR 一時ディレクトリを作成できませんでした: %s
#define ERROR_SETUP_REQUIREMENT Windows95 またはそれ以降のオペレーティングシステムが必要です！ アンインストールを終了します...
#define MB_WARNING_STR 警告
#define ERROR_UNINSTALL_LOG_FOLDER アンインストールログフォルダが見つかりません: %s
#define MB_MESSAGE_STR メッセージ
#define DLG_REMOVE_FILE_TITLE ファイルを削除しますか？
#define ERROR_GETVERSION GetVersionEx() に失敗しました！
#define MB_ATTENTION_STR 注意
#define MSG_FORCE_QUIT_PROCESS %s (%s) がまだ実行中です。[OK] をクリックすると %s を終了してアンインストールを続行します。あるいは、Windows タスクマネージャで %s を終了させてから [OK] をクリックしてください。
#define MSG_FORCE_QUIT_PROCESS_FAILED アンインストーラを終了します。%s (%s) が起動中であるためアンインストールを続行できません。Windows タスクマネージャにより手動で %s を終了させてから再度アンインストーラを起動してください。
#define MSG_DELETE_INSTALLATION_PATH インストールディレクトリからすべてのファイルをアンインストールすることができませんでした:\n\n  %s\n\nこのディレクトリを完全に削除しますか？\n(プラグインを削除したくない場合などは いいえ をクリックしてください)
#define MSG_INSTALLATION_PATH_WITHIN_WINDIR アンインストールは Windows フォルダにインストールされている $ProductNameInternal$ のインストールパスを検出しました。重要なシステムファイルを削除してしまう可能性があるため、アンインストーラではこれを削除しません。

#unfilter emptyLines

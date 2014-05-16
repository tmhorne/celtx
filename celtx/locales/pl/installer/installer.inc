#filter emptyLines

# This file is in the UTF-8 encoding

# Installer keys (don't translate strings in $$)
#define SETUP_TITLE $ProductShortName$ - Instalator
#define SETUP_WELCOME %s - Witamy!
#define SETUP_MESSAGE0 Za chwilę zostanie zainstalowany program %s.
#define SETUP_MESSAGE1 Zaleca się zamknięcie wszystkich uruchomionych programów przed rozpoczęciem instalacji. 
#define SETUP_MESSAGE1_UNIX Zaleca się zamknięcie wszystkich instancji programu %s przed rozpoczęciem instalacji. 
#define SETUP_MESSAGE2 Naciśnij Anuluj, aby zakończyć pracę Instalatora, a następnie zamknij wszystkie otwarte programy. Naciśnij Dalej, aby kontynuować instalację.
#define SETUP_MESSAGE3 Naciśnij Dalej, aby kontynuować instalację programu %s.

#define LICENSE_TITLE Warunki umowy licencyjnej
#define LICENSE_SUBTITLE Warunki użytkowania oprogramowania.
#define LICENSE_MESSAGE0 Przeczytaj poniższą umowę licencyjną. Użyj paska przewijania, aby zobaczyć pozostałą część umowy.
#define LICENSE_ACCEPT Akceptuję warunki niniejszej umowy licencyjnej
#define LICENSE_DECLINE Nie akceptuję warunków niniejszej umowy licencyjnej

#define SETUP_TYPE_TITLE Rodzaj instalacji
#define SETUP_TYPE_SUBTITLE Wybierz opcje instalacji
#define SETUP_TYPE_MESSAGE0 Wybierz preferowany rodzaj instalacji, a następnie naciśnij Dalej.
#define SETUP_TYPE_EXISTING W podanym katalogu istnieje już instalacja programu $ProductNameInternal$. Aby całkowicie usunąć zawartość katalogu %s, naciśnij przycisk 'Usuń' (Twoje ustawienia programu $ProductNameInternal$ nie zostaną naruszone). Wybierz przycisk 'Anuluj', jeśli chcesz wskazać inny katalog docelowy.

# &Ampersand is used to select a shortcut key
#define TYPE_STANDARD &Standardowa
#define TYPE_STANDARD_DESC Program zostanie zainstalowany z najczęściej używanymi opcjami.

#define TYPE_CUSTOM &Użytkownika
#define TYPE_CUSTOM_DESC Możliwe będzie dokonanie wyboru opcji przeznaczonych do instalacji. Ten rodzaj instalacji zalecany jest tylko dla zaawansowanych użytkowników.

#define SELECT_TITLE Wybór składników
#define SELECT_SUBTITLE Dodatkowe składniki poszerzające funkcjonalność programu $ProductShortName$.
#define SELECT_MESSAGE0 Zaznacz lub odznacz pole wyboru, aby dodać lub zrezygnować z instalacji wybranego składnika.

#define LOCATION_TITLE Folder programu
#define LOCATION_SUBTITLE Folder, w którym zostanie zainstalowany program $ProductShortName$.
#define LOCATION_MESSAGE0 Program $ProductShortName$ zostanie zainstalowany w następującym folderze:

#define UPGRADE_TITLE Aktualizacja
#define UPGRADE_SUBTITLE Aktualizuj poprzednią wersję programu $ProductShortName$.
#define UPGRADE_CLEANUP W wybranym katalogu instalacyjnym wykryto poprzednią wersję programu $ProductNameInternal$.

#define UPGRADE_CLEAN Wykonaj czystą instalację
#define UPGRADE_CLEAN_MSG Czysta instalacja  CAŁKOWICIE USUNIE zawartość folderu instalacyjnego! Wszystkie komponenty zewnętrzne, które zostały zainstalowane zostaną skasowane. Jest to zalecane w celu uniknięcia niekompatybilności.
#define UPGRADE_OVER Jeżeli nie zostanie wykonana czysta instalacja, zewnętrzne komponenty nie zostaną usunięte. Może to mieć nieprzewidziane skutki.
#define UPGRADE_OVER_WINDIR Bezpieczna Aktualizacja programu $ProductNameInternal$ nie może zostać wykonana ponieważ aplikacja została zainstalowana w katalogu systemowym Windows. Zalecany jest wybór innego katalogu docelowego do instalacji programu $ProductNameInternal$.

#define ADD_TITLE $ProductShortName$ - Wybór dodatkowych składników
#define ADD_MESSAGE0 Wybierz lub zrezygnuj z dodatkowych składników przeznaczonych do instalacji.

#define WININT_TITLE Utwórz skróty
#define WININT_SUBTITLE Tworzenie skrótów i ikon programu
#define WININT_MESSAGE0 Stwórz ikony dla programu $ProductShortName$:

#define WININT_DESKTOP Na Pulpicie
#define WININT_START W menu Start, w katalogu Programy
#define WININT_QUICKL Na pasku szybkiego uruchamiania

#define USE_AS_DEFAULT Ustaw program %s jako domyślną przeglądarkę.

#define WININT_PFOLDER_TITLE $ProductShortName$ - Wybór folderu programu
#define WININT_PFOLDER_MESSAGE0 Instalator doda ikony programu do podanego poniżej folderu. Można wprowadzić nową nazwę folderu lub wybrać jeden z istniejących folderów z listy. Naciśnij Dalej, aby kontynuować.

#define ADDL_OPTIONS_TITLE $ProductShortName$ - Dodatkowe opcje
#define ADDL_OPTIONS_MSG1 Zaznacz tę opcję, jeśli chcesz, aby Instalator zachował wszystkie pobrane pliki na Twoim komputerze. Pozwoli to na ponowne uruchomienie Instalatora bez konieczności ponownego pobierania plików. Wszystkie pliki zostaną zachowane w podanym poniżej katalogu.

#define ADV_SETTINGS_TITLE $ProductShortName$ - Zaawansowane
#define ADV_SETTINGS_MSG Jeżeli połączenie internetowe, którego używasz, wymaga serwera Proxy należy wprowadzić jego nazwę oraz numer portu. Pozostaw puste pola, jeżeli używasz połączenia, które nie wymaga serwera Proxy.

#define START_TITLE Podsumowanie
#define START_SUBTITLE Instalator zebrał wystarczającą ilość informacji, aby zainstalować program $ProductShortName$.
#define START_INSTALL Instalator zainstaluje następujące składniki:
#define START_DOWNLOAD Instalator pobierze i zainstaluje następujące składniki:
#define START_MESSAGE0 Naciśnij Dalej, aby kontynuować instalację.

#define DL_TITLE Pobieranie plików
#define DL_SUBTITLE Pobieranie wymaganych plików...
#define DL_BLURB Instalator pobiera pliki wymagane do instalacji programu $ProductShortName$.
#define DL_FILENAME Pobieranie:
#define DL_TIMELEFT Pozostało:

#define INSTALL_TITLE Instalowanie
#define INSTALL_SUBTITLE Instalowanie aplikacji $ProductShortName$...
#define INSTALL_BLURB Instalator rozpoczął kopiowanie i instalowanie plików.
#define INSTALL_STATUSFILE Przygotowywanie pliku:
#define INSTALL_STATUSCOMP Instalowanie:

#define COMPLETE_TITLE Zakończenie instalacji
#define COMPLETE_MESSAGE0 Program %s został zainstalowany pomyślnie.
#define COMPLETE_MESSAGE1 Naciśnij Zakończ, aby zakończyć instalację.
#define COMPLETE_LAUNCH Uruchom program %s.

#define DL2_TITLE $ProductShortName$ - Pobieranie plików
#define DL2_MESSAGE0 Instalator pobiera wymagane pliki. W zależności od szybkości połączenia sieciowego operacja ta może trochę potrwać.
#define DL2_RETRY Kontrola redundancji cyklicznej CRC wykazała, że pobranie niektórych z plików nie powiodło się. Instalator pobierze ponownie wyłącznie pliki, w których wystąpił błąd.

#define CLOSE_CHECK Instalacja aplikacji $ProductShortName$ zakończyła się pomyślnie. Program $ProductNameInternal$ musi zostać zamknięty, aby kontynuować instalację. Wybierz przycisk OK, aby wyłączyć $ProductNameInternal$ automatycznie i kontyunować instalację.
#define CLOSE_CHECK2 Program $ProductNameInternal$ musi zostać zamknięty, by kontynuować instalację. Kliknij OK, by zamknąć program $ProductNameInternal$ automatycznie i rozpocząć instalację.
#define CLOSE_WAIT Trwa zamykanie programu $ProductNameInternal$.  Proszę czekać...

#define XPCOM_SHORT Mozilla XPCOM
#define CELTX_SHORT $ProductShortName$
#define HELP_SHORT Pomoc dla programu $ProductShortName$
#define UNINSTALL_SHORT $CompanyName$ Deinstalator
#define LANGPACK_TITLE Pakiet językowy

#define ADT_SHORT Narzędzia programistyczne
#define ADT_LONG Inspektor DOM - narzędzie dla programistów stron WWW.

#define QFA_SHORT Narzędzie zgłaszania awarii
#define QFA_LONG Narzędzie do raportowania informacji o problemach krytycznych programu $ProductShortName$

#define RPT_SHORT Website Reporter
#define RPT_LONG Narzędzie do zgłaszania informacji o problemach zgodności witryn WWW z programem $ProductShortName$

#define CORE_PREPARING Trwa przygotowywanie instalacji, proszę czekać...
#define INST_UNINST Instalacja deinstalatora, proszę czekać...

#define MSG_UNFINISHED_DL Poprzednia instalacja nie powiodła się, jednak Instalator pobrał część wymaganych plików. Czy chcesz wykorzystać te pliki podczas aktualnej instalacji, aby uniknąć konieczności ich ponownego pobierania?
#define MSG_UNFINISHED_INSTALL Poprzednia instalacja nie zakończyła instalowania wszystkich wymaganych plików. Czy chcesz wykorzystać te pliki podczas aktualnej instalacji, aby uniknąć konieczności ich ponownego pobierania?
#define MSG_CORRUPTED Instalator wykrył, że następujące archiwa Instalatora są uszkodzone: %s Aby kontynuować instalację, konieczne jest uzyskanie działającej kopii Instalatora programu $ProductShortName$.
#define MSG_CORRUPTED_AUTO Instalator wykrył, że co najmniej jedno z archiwów Instalatora jest uszkodzone. Aby kontynuować instalację, konieczne jest uzyskanie działającej kopii Instalatora programu $ProductShortName$.
#define MSG_TOO_MANY_CRC Podczas pobierania plików wystąpiło zbyt wiele błędów. Instalacja zostanie przerwana. Żaden z już pobranych plików nie zostanie skasowany. Przy następnym uruchomieniu Instalatora nie będzie konieczne ponowne pobieranie tych plików.
#define MSG_TOO_MANY_NETWORK Podczas pobierania %s wystąpiło zbyt wiele błędów sieci.  Instalator zostanie teraz zatrzymany. Proszę wybrać przycisk Wznów, aby dokończyć pobieranie plików.
#define MSG_VERIFYING Sprawdzanie integralności archiwów, proszę czekać...
#define MSG_UNDEFINED Niezdefiniowany błąd
#define MSG_OOM Za mało pamięci!
#define MSG_STATUS_DL %s z prędkością %.2f KB/sec (Pobrano %u KB z %u KB)
#define MSG_COMPLETED %d%%
#define MSG_REQUIRED (Wymagany)
#define MSG_CANCELING Anulowanie instalacji, proszę czekać...
#define MSG_ERROR_UNCOMPRESS Błąd dekompresji pliku %s: %d
#define MSG_USAGE Sposób użycia: %s [opcje]\nParametr [opcje] może przyjmować jedną z poniższych wartości:\n-h: wyświetla obecne informacje.\n-a [ścieżka]: określa alternatywną ścieżkę wyszukiwania archiwów.\n-app [id aplikacji]: wskazuje identyfikator aplikacji, która uruchomi program instalacyjny (współdzielona instalacja)\n-app_path [aplikacja]: określa (pełną) ścieżkę dostępu do pliku uruchamiającego aplikację (współdzielona instalacja)\n-dd [ścieżka]: określa sugerowany katalog docelowy instalacji (współdzielona instalacja)\n-greLocal: wymusza instalację środowiska GRE w katalogu aplikacji\n-greShared: wymusza instalację środowiska GRE w globalnym, współdzielonym katalogu (standardowo) c:\program files\common files\mozilla.org\GRE\n-reg_path [path]: określa ścieżkę wprowadzanych zmian w rejestrze systemu Windows (współdzielona instalacja)\n-f: wymusza instalację instalatora środowiska GRE (współdzielona instalacja). Współpracuje również z instalatorami innymi niż instalatory środowiska GRE.\n-greForce: wymusza pobranie i instalację 'Środowiska GRE'. Operacja powoduje pominięcie wewnętrznych testów środowiska GRE określających, kiedy instalator środowiska powinien zostać uruchomiony z parametrem '-f'\n-n [nazwa-pliku]: określa nazwę pliku nadrzędnego procesu instalatora.\n-ma: uruchamia program instalacyjny w trybie automatycznym.\n-ms: uruchamia program instalacyjny w trybie bez komunikatów.\n-ira: ignoruje ustawienia sekcji [RunAppX].\n-ispf: ignoruje ustawienia sekcji [Program FolderX], które powodują wyświetlenie na końcu procesu instalacji folderu menu Start, zawierającego skróty do aplikacji.\n-showBanner: wyświetla baner programu w oknach pobierania i instalacji programu\n-hideBanner: ukrywa baner programu w oknach pobierania i instalacji programu\n-cleanupOnUpgrade: włącza rozpoznawanie rodzaju rozpoczętej instalacji. W przypadku aktualizacji (instalacja w katalogu, w którym zainstalowano poprzednią wersję programu), przy standardowym trybie instalacji zostanie wyświetlone zapytanie.\nWe wszystkich innych trybach katalog instalacyjny programu zostanie usunięty przed kontynuacją instalacji.\n-noCleanupOnUpgrade: wyłącza rozpoznawanie rodzaju rozpoczętej instalacji. W przypadku aktualizacji (instalacja w katalogu, w którym zainstalowano poprzednią wersję programu), funkcja automatycznego usuwania poprzedniej instalacji będzie zablokowana (co oznacza, że plik config.ini zostanie nadpisany).
#define MSG_USE_FTP Użyj &FTP do pobrania plików
#define MSG_USE_HTTP Użyj &HTTP do pobrania plików
#define MSG_SAVE_LOCALLY &Zachowaj pliki Instalatora lokalnie
#define MSG_DL_PAUSED Instalator napotkał problem z siecią i wstrzymał instalację. Jeśli właśnie zostało przerwane połączenie z siecią, proszę nacisnąć przycisk Wznów, kiedy połączenie sieciowe zostanie wznowione.
#define MSG_NOT_ADMIN Instalator wykrył, że użytkownik nie posiada wystarczających uprawnień Administratora na tym komputerze. Jest wysoce zalecane, aby nie kontynuować instalacji programu $ProductShortName$. W przeciwnym wypadku może on działać niestabilnie. Czy pomimo to chcesz kontynuować instalację?
#define MSG_NOT_ADMIN_AUTO Instalator wykrył, że użytkownik nie posiada wystarczających uprawnień Administratora na tym komputerze.  Instalator nie może kontynuować instalacji programu $ProductShortName$.

#define UNINST_RUNNING Program $ProductNameInternal$ jest w tym momencie uruchomiony. Proszę zamknąć program $ProductNameInternal$ przed kontynuacją.  Wybierz przycisk OK, aby automatycznie zamknąć program $ProductNameInternal$ i kontynuować deinstalację.
#define UNINST_SHUTDOWN Trwa zamykanie programu $ProductNameInternal$.  Proszę czekać...

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

#define UNINST_TITLE $ProductName$ - Deinstalator
#define UNINST_MESSAGE0 Czy na pewno chcesz usunąć program %s wraz ze wszystkimi komponentami?
#define BTN_UNINST &Odinstaluj
#define BTN_CANCEL An&uluj
#define BTN_MESSAGE1 Deinstalator wykrył, że poniższe współdzielone pliki nie są używane przez żaden inny program. Jeśli jakikolwiek inny program wymaga poniższych współdzielonych plików, a pliki te zostaną usunięte, może nieprawidłowo funkcjonować. Czy na pewno chcesz usunąć poniższe współdzielone pliki?
#define BTN_MESSAGE2 Pozostawienie tych plików nie uszkodzi Twojego systemu. Jeśli nie masz pewności, pozostaw te pliki.
#define BTN_FILENAME Nazwa pliku:
#define BTN_NO &Nie
#define BTN_NOTOALL N&ie na wszystkie
#define BTN_YES &Tak
#define BTN_YESTOALL T&ak na wszystkie

#define ERROR_DLL_LOAD Nie można załadować %s
#define ERROR_STRING_LOAD Nie można załadować zasobu ciągu ID %d
#define ERROR_STRING_NULL Napotkano pusty wskaźnik.
#define ERROR_GLOBALALLOC Błąd alokacji pamięci.
#define ERROR_FAILED Nie powiodło się: %s.
#define ERROR_DIALOG_CREATE Nie można wyświetlić okna dialogowego %s.
#define DLGQUITTITLE Pytanie
#define DLGQUITMSG Czy na pewno chcesz anulować?
#define ERROR_GET_SYSTEM_DIRECTORY_FAILED Wywołanie funkcji GetSystemDirectory() nie powiodło się.
#define ERROR_GET_WINDOWS_DIRECTORY_FAILED Wywołanie funkcji GetWindowsDirectory() nie powiodło się.
#define ERROR_CREATE_TEMP_DIR Deinstalator nie mógł stworzyć katalogu TEMP: %s
#define ERROR_SETUP_REQUIREMENT Wymagany system to Windows95 lub nowszy! Zamykanie deinstalatora...
#define MB_WARNING_STR Ostrzeżenie
#define ERROR_UNINSTALL_LOG_FOLDER Folder dziennika deinstalatora nie został znaleziony: %s
#define MB_MESSAGE_STR Wiadomość
#define DLG_REMOVE_FILE_TITLE Usunąć plik?
#define ERROR_GETVERSION Wywołanie funkcji GetVersionEx() nie powiodło się!
#define MB_ATTENTION_STR Ważne
#define MSG_FORCE_QUIT_PROCESS Deinstalator wykrył uruchomioną wersję programu %s (%s). Kliknij OK aby automatycznie zakończ pracę programu %s i rozpocząć proces instalacji. Można także użyć Menedżera zadań systemu Windows aby zakończyć pracę programu %s, a następnie kontynuować pracę deinstalatora.
#define MSG_FORCE_QUIT_PROCESS_FAILED Praca deinstalatora zostanie zakończona. Deinstalator nie może kontynuować pracy ponieważ program %s (%s) jest nadal uruchomiony. Należy użyć Menedżera zadań systemu Windows aby zakończyć pracę programu %s, a następnie ponownie uruchomić deinstalator.
#define MSG_DELETE_INSTALLATION_PATH W procesie deinstalacji nie wszystkie pliki zostały usunięte z katalogu instalacyjnego programu $ProductNameInternal$:\n\n  %s\n\nCzy całkowicie usunąć ten katalog?
#define MSG_INSTALLATION_PATH_WITHIN_WINDIR Deinstalator wykrył, że katalog instalacyjny programu $ProductNameInternal$ jest umieszczony wewnątrz katalogu systemowego Windows. Deinstalator nie usunie katalogu instalacyjnego programu $ProductNameInternal$ z powodu potencjalnej możliwości usunięcia ważnych plików systemowych.

#unfilter emptyLines

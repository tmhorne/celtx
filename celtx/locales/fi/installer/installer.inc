#filter emptyLines

# This file is in the UTF-8 encoding

# Installer keys (don't translate strings in $$)
#define SETUP_TITLE $ProductShortName$ asennusohjelma
#define SETUP_WELCOME %sin asentaja
#define SETUP_MESSAGE0 Olet asentamassa %sia.
#define SETUP_MESSAGE1 On suositeltavaa, että kaikki muut Windows-ohjelmat suljetaan ohjelman asentamisen ajaksi.
#define SETUP_MESSAGE1_UNIX On suositeltavaa, että kaikki %sin istunnot suljetaan ennen kuin käynnistät tämän asennusohjelman.
#define SETUP_MESSAGE2 Keskeytä asennus valitsemalla Peruuta, jonka jälkeen voit sulkea avoimet ohjelmat. Jatka asennusta valitsemalla Seuraava.
#define SETUP_MESSAGE3 Valitse Seuraava jatkaaksesi %sin asennusta.

#define LICENSE_TITLE Ohjelman lisenssisopimus
#define LICENSE_SUBTITLE Ohjelman käyttöehdot.
#define LICENSE_MESSAGE0 Lue lisenssisopimus siirtymällä eteenpäin vierityspalkista.
#define LICENSE_ACCEPT Hyväksyn lisenssisopimuksen
#define LICENSE_DECLINE En hyväksy lisenssisopimusta

#define SETUP_TYPE_TITLE Asennusmuoto
#define SETUP_TYPE_SUBTITLE Valitse asennuksen muoto.
#define SETUP_TYPE_MESSAGE0 Valitse haluamasi asennusmuoto ja napsauta Seuraava.
#define SETUP_TYPE_EXISTING Firefox on jo asennettu valittuun kansioon. Poistaaksesi kansion %s täydellisesti napsauta Poista kansio -painiketta. Tällä ei pitäisi olla vaikutusta asetuksillesi Firefoxissa. Vaihda asennuskansio napsauttamalla Peruuta-painiketta ja valitse uusi kohdekansio.

# &Ampersand is used to select a shortcut key
#define TYPE_STANDARD &Oletus
#define TYPE_STANDARD_DESC Selain asennetaan yleisimmillä ohjelmakomponenteilla.

#define TYPE_CUSTOM &Mukautettu
#define TYPE_CUSTOM_DESC Valitse mitkä ohjelmakomponentit asennetaan. Suositellaan kokeneille käyttäjille.

#define SELECT_TITLE Valitse ohjelmakomponentit
#define SELECT_SUBTITLE Lisäkomponentteja $ProductShortName$iin.
#define SELECT_MESSAGE0 Valitse lisäkomponentit, jotka haluat asentaa ja napsauta Seuraava.

#define LOCATION_TITLE Asennuskansio
#define LOCATION_SUBTITLE Kansio, johon $ProductShortName$ asennetaan.
#define LOCATION_MESSAGE0 $ProductShortName$ asennetaan kansioon:

#define UPGRADE_TITLE Päivitys
#define UPGRADE_SUBTITLE Päivittää asennetun $ProductShortName$in.
#define UPGRADE_CLEANUP Aikaisempi versio $ProductNameInternal$ista löydettiin valitusta kansiosta.

#define UPGRADE_CLEAN Asennus uudestaan
#define UPGRADE_CLEAN_MSG Asennus uudestaan poistaa TÄYDELLISESTI asennuskansion sisällön. Kaikki asentamasi kolmansien osapuolten laajennukset poistetaan. Tämä on suositeltua, koska se ehkäisee epäyhteensopivuusongelmia. (XXXben)
#define UPGRADE_OVER Jos et valitse Turvallista päivitystä, kolmansien osapuolten laajennuksia ei poisteta ja ne voivat aiheuttaa ennalta-arvaamattomia ongelmia.
#define UPGRADE_OVER_WINDIR Turvallista päivitystä ei voida tehdä, koska $ProductNameInternal$ on asennettu Windows-kansioon. Suosittelemme, että asennat $ProductNameInternal$in johonkin toiseen kansioon.

#define ADD_TITLE $ProductShortName$ asennus - Valitse lisäkomponentit
#define ADD_MESSAGE0 Valitse tai poista valinta lisäkomponenteista sen mukaan, mitä haluat asentaa.

#define WININT_TITLE Aseta pikalinkit
#define WININT_SUBTITLE Luo ohjelmakuvakkeet
#define WININT_MESSAGE0 Luo kuvakkeet $ProductShortName$ille:

#define WININT_DESKTOP Työpöydälle
#define WININT_START Käynnistä-valikon ohjelmakansioon
#define WININT_QUICKL Pikakäynnistyspalkkiin

#define USE_AS_DEFAULT Aseta %s oletusselaimeksi.

#define WININT_PFOLDER_TITLE $ProductShortName$ asennus - Valitse ohjelmakansio
#define WININT_PFOLDER_MESSAGE0 Asennusohjelmaa lisää ohjelmakuvakkeet alla annettuun ohjelmakansioon.  Kirjoita uuden kansion nimi tai valitse jokin kansio listasta.  Napsauta Seuraava jatkaaksesi.

#define ADDL_OPTIONS_TITLE $ProductShortName$ asennus - Lisäasetukset
#define ADDL_OPTIONS_MSG1 Valitse seuraava valinta, jos haluat tallentaa ladatut tiedostot tietokoneellesi. Näin voit suorittaa asennusohjelman uudestaan joutumatta lataamaan tiedostoja uudestaan. Asennustiedostot tallennetaan alla annettuun kansioon.

#define ADV_SETTINGS_TITLE $ProductShortName$ asennus - Lisäasetukset
#define ADV_SETTINGS_MSG Jos verkkoyhteytesi vaatii välityspalvelimen käyttämistä, syötä kenttiin palvelimen nimi ja porttitiedot. Jos yhteytesi ei vaadi välityspalvelinta, jätä kentät tyhjiksi.

#define START_TITLE Yhteenveto
#define START_SUBTITLE Valmis asentamaan $ProductShortName$.
#define START_INSTALL Asennetaan seuraavat ohjelmakomponentit:
#define START_DOWNLOAD Asennusohjelma lataa ja asentaa seuraavat ohjelmakomponentit:
#define START_MESSAGE0 Napsauta Seuraava jatkaaksesi.

#define DL_TITLE Ladataan
#define DL_SUBTITLE Ladataan tarvittavia komponentteja...
#define DL_BLURB Asennusohjelma lataa $ProductShortName$in asentamiseen vaadittuja tiedostoja.
#define DL_FILENAME Ladataan:
#define DL_TIMELEFT Aikaa jäljellä:

#define INSTALL_TITLE Asennetaan
#define INSTALL_SUBTITLE Asennetaan $ProductShortName$...
#define INSTALL_BLURB Asennusohjelma asentaa ohjelmatiedostoja.
#define INSTALL_STATUSFILE Valmistellaan tiedostoa:
#define INSTALL_STATUSCOMP Asennetaan:

#define COMPLETE_TITLE Asennus valmis
#define COMPLETE_MESSAGE0 %s asennettiin onnistuneesti.
#define COMPLETE_MESSAGE1 Napsauta Valmis lopettaaksesi asennuksen.
#define COMPLETE_LAUNCH Käynnistä %s nyt.

#define DL2_TITLE $ProductShortName$ asennus - Lataa
#define DL2_MESSAGE0 Asennusohjelma lataa nyt vaadittuja tiedostoja. Tiedostojen latauksen kesto riippuu verkkoyhteytesi nopeudesta.
#define DL2_RETRY Jotkin tiedostot eivät läpäisseet virheentarkistusta ja ne ladataan uudestaan.

#define CLOSE_CHECK $ProductShortName$in lataus onnistui. $ProductNameInternal$ pitää sulkea, jotta asennusta voidaan jatkaa. Napsauta OK sulkeaksesi $ProductNameInternal$in automaattisesti ja aloittaaksesi asennuksen.
#define CLOSE_CHECK2 $ProductNameInternal$ pitää sulkea, jotta asennusta voidaan jatkaa. Napsauta OK sulkeaksesi $ProductNameInternal$in automaattisesti ja aloittaaksesi asennuksen.
#define CLOSE_WAIT Suljetaan $ProductNameInternal$. Ole hyvä ja odota...

#define XPCOM_SHORT Alustariippumaton COM
#define CELTX_SHORT $ProductShortName$
#define HELP_SHORT $ProductShortName$in käytönaikainen ohje
#define UNINSTALL_SHORT $CompanyName$in asennuksen poistaja
#define LANGPACK_TITLE Kielipaketti

#define ADT_SHORT Kehitystyökalut
#define ADT_LONG Dokumenttien tutkija - työkalu www-kehittäjille

#define QFA_SHORT Laaduntarkistusagentti
#define QFA_LONG $ProductShortName$in kaatumistietojen ilmoittamisagentti

#define RPT_SHORT WWW-sivujen ilmoituslaajennus
#define RPT_LONG Sivustojen ja $ProductShortName$in yhteensopivuusongelmien ilmoittamiseen

#define CORE_PREPARING Valmistellaan asennusta. Ole hyvä ja odota...
#define INST_UNINST Asennetaan asennuksen poistajaa. Ole hyvä ja odota...

#define MSG_UNFINISHED_DL Asennusohjelman aikaisempi istunto ei ehtinyt ladata kaikkia tarvittavia tiedostoja. Haluatko käyttää jo ladattuja tiedostoja uudestaan, jotta niitä ei tarvitsisi ladata uudestaan?
#define MSG_UNFINISHED_INSTALL Asennusohjelman aikaisempi istunto ei ehtinyt asentaa kaikkia tarvittavia tiedostoja. Haluatko käyttää jo ladattuja tiedostoja uudestaan, jotta niitä ei tarvitsisi ladata uudestaan?
#define MSG_CORRUPTED Asennusohjelma havaitsi, että seuraavat sen paketeista ovat virheellisiä:%sAsennusta ei voida jatkaa tällä kopiolla asennusohjelmasta. Hanki toinen kopio asennusohjelmasta jatkaaksesi.
#define MSG_CORRUPTED_AUTO Asennusohjelma havaitsi, että ainakin yksi sen paketeista on virheellinen. Asennusta ei voida jatkaa tällä kopiolla asennusohjelmasta. Hanki toinen kopio asennusohjelmasta jatkaaksesi.
#define MSG_TOO_MANY_CRC Liian monta latausvirhettä. Asennusohjelma lopetetaan. Virheettömästi jo ladatut tiedostot säilytetään. Kun asennusohjelma suoritetaan seuraavan kerran, näitä tiedostoja voidaan hyödyntää.
#define MSG_TOO_MANY_NETWORK Liian monta verkkovirhettä ladattaessa %s. Asennusohjelma keskeytyy väliaikaisesti. Napsauta Jatka-painiketta jatkaaksesi tiedostojen lataamista.
#define MSG_VERIFYING Tarkistetaan tiedostoja virheiden varalta. Ole hyvä ja odota...
#define MSG_UNDEFINED Tuntematon virhe
#define MSG_OOM Muisti loppu!
#define MSG_STATUS_DL %s nopeudella %.2f kt/s (%u kt / %u kt ladattu)
#define MSG_COMPLETED %d%% valmis
#define MSG_REQUIRED (Pakollinen)
#define MSG_CANCELING Peruutetaan asennusta. Ole hyvä ja odota...
#define MSG_ERROR_UNCOMPRESS Virhe purettaessa tiedostoa %s: %d
#define MSG_USAGE Käyttö: %s [valitsimet]\n	[valitsimet] voivat olla yhdistelmiä seuraavista:\n		-h: Tämä ohje.\n		-a [polku]: Vaihtoehtoinen pakettien hakupolku.\n		-app [ohjelma-ID]: Asentajan käynnistävän ohjelman tunnus (ID)\n		 (yhteiskäyttöiset asennukset)\n		-app_path [ohjelma]: Points to (full path) representative file\n		 of application (yhteiskäyttöiset asennukset)\n	*	-dd [polku]: Asennuksen kohdehakemisto. (yhteiskäyttöiset\n		 asennukset)\n	*	-greLocal: Asenna GRE ohjelmahakemistoon.\n	*	-greShared: Asenna GRE globaaliin, yhteiskäyttöiseen\n		 hakemistoon, kuten\n		 (normaalisti) c:\program files\common files\mozilla.org\GRE\n		-reg_path [polku]: Merkintöjen sijainti Windows-rekisterissä.\n		 (yhteiskäyttöiset asennukset)\n		-f: Pakota GRE-asentajan käyttö (yhteiskäyttöiset asennukset).\n		 Toimii myös muilla asentajilla.\n		-greForce: Pakota GRE-komponentin lataus, suoritus ja\n		 asentaminen. Tällä ohitetaan GRE:n tarpeellisuuden tarkistus\n		 ja suoritetaan lopuksi asentaja "-f"-valinnalla.\n		-n [tiedostonimi]: Asennusohjelman vanhemman prosessin\n		 tiedostonimi.\n	*	-ma: Suorita asennus automaattisessa tilassa.\n	*	-ms: Suorita asennus hiljaisessa tilassa.\n		-ira: Ohita [RunAppX] osiot\n		-ispf: Ohita [Program FolderX] osiot, jotka näyttävät\n		 Käynnistysvalikon pikalinkkikansion asennuksen päätteeksi.\n	*	-showBanner: NÄytä banner-kuva lataus- ja asennusikkunoissa\n	*	-hideBanner: Älä näytä banner-kuvaa lataus- ja\n		 asennusikkunoissa\n	*	-cleanupOnUpgrade: Jos käyttäjä on päivittämässä tuotetta:\n			* NORMAALI-tila: kysy käyttäjältä kuinka edetään\n			* Muut tilat: Oleta, että halutaan poistaa edellinen\n			  asennus.\n	*	-noCleanupOnUpgrade: Älä poista edellistä asennusta\n		 päivitettäessä.\n\n	*:llä merkitään config.inin ylikirjoittamista
#define MSG_USE_FTP Käytä &FTP-yhteyttä tiedostojen lataamiseen
#define MSG_USE_HTTP Käytä &HTTP-yhteyttä tiedostojen lataamiseen
#define MSG_SAVE_LOCALLY &Tallenna asennustiedostot paikalliseen kansioon
#define MSG_DL_PAUSED Asennusohjelmalla on ongelmia verkon kanssa ja tiedoston lataus on keskeytetty. Jos verkkoyhteytesi katkesi juuri äsken, napsauta Jatka-painiketta kun verkkoyhteys on palautettu.
#define MSG_NOT_ADMIN Asennusohjelma havaitsi, että sinulla ei ole tarvittavia järjestelmän pääkäyttäjän oikeuksia. On erittäin suositeltua, että $ProductShortName$in asennus keskeytetään. Jos jatkat asennusta, $ProductShortName$ ei välttämättä toimi kunnolla. Jatketaanko asennusta?
#define MSG_NOT_ADMIN_AUTO Asennusohjelma havaitsi, että sinulla ei ole tarvittavia järjestelmän pääkäyttäjän oikeuksia. Asennus lopetetaan.

#define UNINST_RUNNING $ProductNameInternal$in havaittiin olevan käynnissä. Ole hyvä ja sulje $ProductNameInternal$, ennen kuin jatkat. Napsauta OK sulkeaksesi $ProductNameInternal$in automaattisesti ja jatkaaksesi asennuksen poistoa.
#define UNINST_SHUTDOWN Suljetaan $ProductNameInternal$ia. Ole hyvä ja odota...

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

#define UNINST_TITLE $ProductName$in asennuksen poistaja
#define UNINST_MESSAGE0 Haluatko varmasti poistaa %sin ja kaikki sen komponentit?
#define BTN_UNINST &Poista
#define BTN_CANCEL &Peruuta
#define BTN_MESSAGE1 Asennuksen poisto ei löytänyt yhtään ohjelmaa, joka käyttäisi seuraavaa jaettua tiedostoa. Jos joitain tällaisia ohjelmia on, ne eivät välttämättä toimi kunnolla jos tiedosto poistetaan. Poistetaan tiedosto?
#define BTN_MESSAGE2 Tiedoston jättäminen tietokoneelle ei ole vahingollista ja se on parempi jättää tietokoneelle, mikäli et ole varma.
#define BTN_FILENAME Tiedostonimi:
#define BTN_NO &Ei
#define BTN_NOTOALL Ei ka&ikille
#define BTN_YES &Kyllä
#define BTN_YESTOALL Ky&llä kaikille

#define ERROR_DLL_LOAD Kirjaston %s lataus epäonnistui
#define ERROR_STRING_LOAD Ei voitu ladata string-resurssitunnusta %d
#define ERROR_STRING_NULL Null pointer encountered.
#define ERROR_GLOBALALLOC Muistin osoitusvirhe.
#define ERROR_FAILED %s epäonnistui.
#define ERROR_DIALOG_CREATE Ei voitu luoda %s-valikkoa.
#define DLGQUITTITLE Kysymys
#define DLGQUITMSG Haluatko varmasti peruuttaa?
#define ERROR_GET_SYSTEM_DIRECTORY_FAILED GetSystemDirectory() epäonnistui.
#define ERROR_GET_WINDOWS_DIRECTORY_FAILED GetWindowsDirectory() epäonnistui.
#define ERROR_CREATE_TEMP_DIR Asennuksen poistaja ei voinut luoda väliaikaista TEMP-kansiota: %s
#define ERROR_SETUP_REQUIREMENT Tarvitaan Windows95 tai uudempi käyttöjärjestelmä! Lopetaan asennuksen poistaja...
#define MB_WARNING_STR Varoitus
#define ERROR_UNINSTALL_LOG_FOLDER Asennuksen poistajan lokikansiota ei löytynyt:%s
#define MB_MESSAGE_STR Viesti
#define DLG_REMOVE_FILE_TITLE Poistetaanko tiedosto?
#define ERROR_GETVERSION GetVersionEx() epäonnistui
#define MB_ATTENTION_STR Huomio
#define MSG_FORCE_QUIT_PROCESS Asennuksen poisto on havainnut, että %s (%s) on käynnissä. Napsauta OK lopettaaksesi %sin ja jatkaaksesi asennuksen poistoa. Vaihtoehtoisesti lopeta %s Windowsin Task managerilla ja napsauta sitten OK jatkaaksesi asennuksen poistoa.
#define MSG_FORCE_QUIT_PROCESS_FAILED Asennuksen poisto keskeytetään. Asennuksen poisto ei voi jatkaa, koska %s on edelleen käynnissä. Yritä käsin lopettaa %s Windowsin Task managerilla ja käynnistä asennuksen poisto sitten uudestaan.
#define MSG_DELETE_INSTALLATION_PATH Kaikkia tiedostoja asennuskansiosta ei poistettu:\n\n  %s\n\nPoistetaanko tämä kansio kokonaan?
#define MSG_INSTALLATION_PATH_WITHIN_WINDIR Asennuksen poistaja havaitsi, että $ProductNameInternal$ on asennettu Windows-kansiossa olevaan kansioon. Asennuksen poistaja ei yritä poistaa tätä asennusta, jotta ei poistettaisi kriittisiä järjestelmätiedostoja.

#unfilter emptyLines

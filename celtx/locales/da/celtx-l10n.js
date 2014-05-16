# ***** BEGIN LICENSE BLOCK *****
# Version: MPL 2.0
#
# This Source Code Form is subject to the terms of the Mozilla Public License,
# v. 2.0. If a copy of the MPL was not distributed with this file, You can
# obtain one at http://mozilla.org/MPL/2.0/.
#
# Software distributed under the License is distributed on an "AS IS" basis,
# WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
# for the specific language governing rights and limitations under the
# License.
#
# The Original Code is the Firefox browser.
#
# The Initial Developer of the Original Code is
# Benjamin Smedberg <bsmedberg@covad.net>
# Portions created by the Initial Developer are Copyright (C) 2004
# the Initial Developer. All Rights Reserved.
#
# Contributor(s):
#
# Alternatively, the contents of this file may be used under the terms of
# either the GNU General Public License Version 2 or later (the "GPL"), or
# the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
# in which case the provisions of the GPL or the LGPL are applicable instead
# of those above. If you wish to allow use of your version of this file only
# under the terms of either the GPL or the LGPL, and not to allow others to
# use your version of this file under the terms of the MPL, indicate your
# decision by deleting the provisions above and replace them with the notice
# and other provisions required by the GPL or the LGPL. If you do not delete
# the provisions above, a recipient may use your version of this file under
# the terms of any one of the MPL, the GPL or the LGPL.
#
# ***** END LICENSE BLOCK *****

#filter substitution

pref("general.useragent.locale", "@AB_CD@");
pref("spellchecker.dictionary", "da");

pref("celtx.scripteditor.intexts", "INT,EXT");
# This includes the following additional Danish day/night words:
# EFTERMIDDAG: Afternoon
# UAFBRUDT: Continuous
# DAGGRY: Dawn
# TUSMØRKE: Dusk
# AFTEN: Evening
# SENERE: Later
# MAGISK TIME: Magic Hour
# MIDNAT: Midnight
# ØJEBLIKKE SENERE: Moments Later
# MORGEN: Morning
# NÆSTE DAG: Next Day
# MIDDAG: Noon
# SOLOPGANG: Sunrise
# SOLNEDGANG: Sunset
pref("celtx.scripteditor.daynights", "DAG,NAT,EFTERMIDDAG,UAFBRUDT,DAGGRY,TUSMØRKE,AFTEN,SENERE,MAGISK TIME,MIDNAT,ØJEBLIKKE SENERE,MORGEN,NÆSTE DAG,MIDDAG,SOLOPGANG,SOLNEDGANG");
# This includes the following additional Danish shot words:
# MIDDELSTOR BRED: Very Wide Shot
# ZOOME IND: Zoom In
# CGI: CGI
# MONTAGE: Montage
# VEJROPTAGELSE: Weather Shot
# PANORA: Pan
# MIDDELSTOR NÆRBILLEDE: Medium Close Up
pref("celtx.scripteditor.shots","MIDDELSTOR BRED:,BRED:,OVERBLIK:,MIDDELSTOR:,MIDDELSTOR NÆRBILLEDE:,NÆRBILLEDE:,EKSTREM NÆRBILLEDE:,BORTKLIP:,INDKLIP:,DOBBELTBILLEDE:,OVER SKULDEREN:,SUBJEKTIV SYNSVINKEL:,ZOOME IND:,CGI:,MONTAGE:,VEJROPTAGELSE:,PANORA:");
pref("celtx.tag.white", "Plot A");
pref("celtx.tag.grey", "Plot B");
pref("celtx.tag.blue", "Plot C");
pref("celtx.tag.green", "Plot D");
pref("celtx.tag.yellow", "Plot E");
pref("celtx.tag.orange", "Plot F");
pref("celtx.tag.pink", "Plot G");
pref("celtx.tag.red", "Plot H");
pref("celtx.tag.purple", "Plot I");

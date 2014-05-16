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
 * The Original Code is Zip Writer Component.
 *
 * The Initial Developer of the Original Code is
 * Dave Townsend <dtownsend@oxymoronical.com>.
 *
 * Portions created by the Initial Developer are Copyright (C) 2007
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *      Mook <mook.moz+random.code@gmail.com>
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
 * ***** END LICENSE BLOCK *****
 */

#include "nsSafeZipWriter.h"
#include "StreamFunctions.h"
#include "nsISafeOutputStream.h"
#include "nsISeekableStream.h"
#include "nsComponentManagerUtils.h"
#include "nsStreamUtils.h"
#include "nsNetUtil.h"
#include "nsMemory.h"
#include "prio.h"

#define ZIP_EOCDR_HEADER_SIZE 22
#define ZIP_EOCDR_HEADER_SIGNATURE 0x06054b50


NS_IMPL_ADDREF_INHERITED(nsSafeZipWriter, nsZipWriter)
NS_IMPL_RELEASE_INHERITED(nsSafeZipWriter, nsZipWriter)

NS_INTERFACE_MAP_BEGIN(nsSafeZipWriter)
   NS_INTERFACE_MAP_ENTRY(nsISafeZipWriter)
NS_INTERFACE_MAP_END_INHERITING(nsZipWriter)

nsSafeZipWriter::nsSafeZipWriter()
{
}

nsSafeZipWriter::~nsSafeZipWriter()
{
}

/* void open (in nsIFile aFile, in PRInt32 aIoFlags); */
NS_IMETHODIMP nsSafeZipWriter::Open(nsIFile *aFile, PRInt32 aIoFlags)
{
    if (mStream)
        return NS_ERROR_ALREADY_INITIALIZED;

    NS_ENSURE_ARG_POINTER(aFile);

    // Need to be able to write to the file
    if (aIoFlags & PR_RDONLY)
        return NS_ERROR_FAILURE;
    
    nsresult rv = aFile->Clone(getter_AddRefs(mFile));
    NS_ENSURE_SUCCESS(rv, rv);

    PRBool exists;
    rv = mFile->Exists(&exists);
    NS_ENSURE_SUCCESS(rv, rv);
    if (!exists && !(aIoFlags & PR_CREATE_FILE))
        return NS_ERROR_FILE_NOT_FOUND;

    if (exists && !(aIoFlags & (PR_TRUNCATE | PR_WRONLY))) {
        rv = ReadFile(mFile);
        NS_ENSURE_SUCCESS(rv, rv);
        mCDSDirty = PR_FALSE;
    }
    else {
        mCDSOffset = 0;
        mCDSDirty = PR_TRUE;
        mComment.Truncate();
    }

    // Silently drop PR_APPEND
    aIoFlags &= 0xef;

    nsCOMPtr<nsIOutputStream> stream;
    rv = NS_NewSafeLocalFileOutputStream(getter_AddRefs(stream), mFile, aIoFlags);
    if (NS_FAILED(rv)) {
        mHeaders.Clear();
        mEntryHash.Clear();
        return rv;
    }

    rv = NS_NewBufferedOutputStream(getter_AddRefs(mStream), stream, 0x800);
    if (NS_FAILED(rv)) {
        stream->Close();
        mHeaders.Clear();
        mEntryHash.Clear();
        return rv;
    }

    if (mCDSOffset > 0) {
        rv = SeekCDS();
        NS_ENSURE_SUCCESS(rv, rv);
    }

    return NS_OK;
}

/* void close (); */
NS_IMETHODIMP nsSafeZipWriter::Close()
{
    Cleanup();
    return NS_OK;
}

/* void finish (); */
NS_IMETHODIMP nsSafeZipWriter::Finish()
{
    if (!mStream)
        return NS_ERROR_NOT_INITIALIZED;
    if (mInQueue)
        return NS_ERROR_IN_PROGRESS;

    if (mCDSDirty) {
        PRUint32 size = 0;
        for (PRInt32 i = 0; i < mHeaders.Count(); i++) {
            nsresult rv = mHeaders[i]->WriteCDSHeader(mStream);
            if (NS_FAILED(rv)) {
                Cleanup();
                return rv;
            }
            size += mHeaders[i]->GetCDSHeaderLength();
        }

        char buf[ZIP_EOCDR_HEADER_SIZE];
        PRUint32 pos = 0;
        WRITE32(buf, &pos, ZIP_EOCDR_HEADER_SIGNATURE);
        WRITE16(buf, &pos, 0);
        WRITE16(buf, &pos, 0);
        WRITE16(buf, &pos, mHeaders.Count());
        WRITE16(buf, &pos, mHeaders.Count());
        WRITE32(buf, &pos, size);
        WRITE32(buf, &pos, mCDSOffset);
        WRITE16(buf, &pos, mComment.Length());

        nsresult rv = ZW_WriteData(mStream, buf, pos);
        if (NS_FAILED(rv)) {
            Cleanup();
            return rv;
        }

        rv = ZW_WriteData(mStream, mComment.get(), mComment.Length());
        if (NS_FAILED(rv)) {
            Cleanup();
            return rv;
        }

        nsCOMPtr<nsISeekableStream> seekable = do_QueryInterface(mStream);
        rv = seekable->SetEOF();
        if (NS_FAILED(rv)) {
            Cleanup();
            return rv;
        }
    }

    nsresult rv = NS_OK;
    nsCOMPtr<nsISafeOutputStream> safeStream(do_QueryInterface(mStream));
    if (safeStream)
      rv = safeStream->Finish();
    else
      rv = NS_ERROR_UNEXPECTED;

    if (NS_SUCCEEDED(rv))
      rv = mStream->Close();
    mStream = nsnull;
    mHeaders.Clear();
    mEntryHash.Clear();
    mQueue.Clear();

    return rv;
}

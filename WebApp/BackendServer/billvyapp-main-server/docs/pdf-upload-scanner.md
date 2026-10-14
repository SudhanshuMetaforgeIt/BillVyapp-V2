# PDF upload scanner

PDF purchase bills are parsed, checked for active content and embedded files, and scanned for malware before Cloudinary upload. A missing or unsuccessful scanner blocks the upload.

The local Windows checkout uses the official portable ClamAV 1.4.6 LTS package under the repository's ignored `storage/scanner` directory. Its executable and database are configured in the backend's private `.env`:

- `UPLOAD_CLAMSCAN_PATH`: absolute path to `clamscan.exe`.
- `UPLOAD_CLAMSCAN_DATABASE_PATH`: absolute path to its `database` directory. Use Windows backslashes for the Windows ClamAV database path.

Run `node scripts/update-pdf-scanner.cjs` from the backend directory to refresh the official malware definitions. Keep these definitions updated through the host's operational maintenance. The one-time setup does not install a scheduled updater or change Windows antivirus settings.

For a different host, install ClamAV and configure that host's executable and database paths. Portable binaries and databases are runtime dependencies and are not committed to Git.

`node scripts/verify-pdf-storage.cjs` validates the repository's fictional sample invoice, scans it, uploads a temporary authenticated Cloudinary raw asset, downloads and compares the exact bytes, then removes the temporary asset. It does not create a purchase or attach a bill to business records.

The public API returns fixed scanner-specific setup, availability, and timeout messages. Other internal server exception details remain redacted.

References: [ClamAV downloads](https://www.clamav.net/downloads) and [installation documentation](https://docs.clamav.net/manual/Installing.html).

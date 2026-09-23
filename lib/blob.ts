import { put, del, head, type PutBlobResult, type HeadBlobResult } from '@vercel/blob';
import path from 'path';
import fs from 'fs/promises';

export interface UploadOptions {
  /**
   * Optional folder / prefix inside blob storage (e.g., 'category', 'subcategory', 'profile').
   */
  folder?: string;

  /**
   * Custom filename or relative path to store the blob as.
   * If omitted, will use `file.name` (for File instances) or generate a timestamped filename.
   */
  filename?: string;

  /**
   * Whether to allow overwriting an existing blob with the same pathname.
   * @default true
   */
  allowOverwrite?: boolean;

  /**
   * Access level for the blob. Currently only 'public' is supported by Vercel Blob store.
   * @default 'public'
   */
  access?: 'public';

  /**
   * Override the Vercel Blob token.
   * Defaults to process.env.BLOB_READ_WRITE_TOKEN.
   */
  token?: string;

  /**
   * Whether to automatically add a random suffix to the filename to avoid collisions.
   * Defaults to false when allowOverwrite is true.
   */
  addRandomSuffix?: boolean;

  /**
   * Explicit MIME content type (e.g., 'image/png', 'image/jpeg').
   * If omitted, inferred automatically from file extension or blob type.
   */
  contentType?: string;

  /**
   * Cache control max age in seconds.
   */
  cacheControlMaxAge?: number;
}

/**
 * Validates and retrieves the Vercel Blob Read/Write token.
 */
function getBlobToken(tokenOverride?: string): string {
  const token = tokenOverride || process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error(
      'Vercel Blob token is missing. Please set BLOB_READ_WRITE_TOKEN in your environment variables (.env).'
    );
  }
  return token;
}

/**
 * Cleans and formats the storage pathname from folder and filename.
 */
function buildPathname(filename: string, folder?: string): string {
  // Normalize Windows slashes and remove leading/trailing slashes
  const cleanFilename = filename.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!folder) {
    return cleanFilename;
  }
  const cleanFolder = folder.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  return `${cleanFolder}/${cleanFilename}`;
}

/**
 * Checks if a given string is a Vercel Blob URL or remote HTTP/HTTPS URL.
 */
export function isBlobUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  return (
    url.startsWith('https://') ||
    url.startsWith('http://') ||
    url.includes('blob.vercel-storage.com')
  );
}

/**
 * Uploads a single file to Vercel Blob storage.
 *
 * @param file - The File, Blob, or Buffer to upload.
 * @param filenameOrOptions - Either a custom filename (string) or UploadOptions object.
 * @param maybeOptions - UploadOptions if filename was passed as second argument.
 * @returns Promise<PutBlobResult> with url, downloadUrl, pathname, contentType, etc.
 *
 * @example
 * // 1. Direct upload with fileObj:
 * const result = await uploadFile(fileObj);
 *
 * @example
 * // 2. Upload with folder and custom name:
 * const result = await uploadFile(fileObj, 'avatar.jpg', { folder: 'profile' });
 *
 * @example
 * // 3. Upload with options object:
 * const result = await uploadFile(fileObj, {
 *   folder: 'category',
 *   allowOverwrite: true,
 * });
 */
export async function uploadFile(
  fileOrPathname: File | Blob | Buffer | string,
  fileOrFilenameOrOptions?: File | Blob | Buffer | string | UploadOptions,
  maybeOptions?: UploadOptions
): Promise<PutBlobResult> {
  let file: File | Blob | Buffer;
  let filename: string | null = null;
  let options: UploadOptions = {};

  if (typeof fileOrPathname === 'string') {
    // Called like: uploadFile(filename, fileObj, options)
    filename = fileOrPathname;
    file = fileOrFilenameOrOptions as File | Blob | Buffer;
    options = maybeOptions || {};
  } else {
    // Called like: uploadFile(fileObj, filename, options) or uploadFile(fileObj, options)
    file = fileOrPathname;
    if (typeof fileOrFilenameOrOptions === 'string') {
      filename = fileOrFilenameOrOptions;
      options = maybeOptions || {};
    } else if (typeof fileOrFilenameOrOptions === 'object' && fileOrFilenameOrOptions !== null) {
      options = fileOrFilenameOrOptions as UploadOptions;
      filename = options.filename || null;
    }
  }

  // Resolve filename if not explicitly provided
  if (!filename) {
    if (options.filename) {
      filename = options.filename;
    } else if (file instanceof File && file.name) {
      filename = file.name;
    } else {
      const ext = options.contentType ? options.contentType.split('/')[1] || 'bin' : 'bin';
      filename = `file-${Date.now()}.${ext}`;
    }
  }

  const token = getBlobToken(options.token);
  const pathname = buildPathname(filename, options.folder);

  const blob = await put(pathname, file, {
    access: options.access || 'public',
    token,
    allowOverwrite: options.allowOverwrite ?? true,
    addRandomSuffix: options.addRandomSuffix,
    contentType: options.contentType,
    cacheControlMaxAge: options.cacheControlMaxAge,
  });

  return blob;
}

/**
 * Uploads multiple files to Vercel Blob in parallel.
 *
 * @param files - Array of File, Blob, or Buffer objects.
 * @param options - Common UploadOptions for all files.
 * @returns Promise<PutBlobResult[]>
 *
 * @example
 * const blobs = await uploadMultipleFiles(fileArray, { folder: 'subcategories' });
 * const urls = blobs.map(b => b.url);
 */
export async function uploadMultipleFiles(
  files: (File | Blob | Buffer)[],
  options?: UploadOptions
): Promise<PutBlobResult[]> {
  if (!Array.isArray(files) || files.length === 0) {
    return [];
  }

  return Promise.all(files.map((file) => uploadFile(file, options)));
}

/**
 * Deletes one or multiple files from Vercel Blob storage.
 * Also safely cleans up legacy local server files (e.g. `/images/...`) for backward compatibility.
 *
 * @param urlOrUrls - Single URL string, array of URL strings, or null/undefined.
 * @param options - Optional configuration with token override.
 *
 * @example
 * // Delete single blob URL
 * await deleteFile('https://...blob.vercel-storage.com/...');
 *
 * @example
 * // Delete multiple blob URLs
 * await deleteFile(['https://...blob.vercel-storage.com/1', 'https://...blob.vercel-storage.com/2']);
 */
export async function deleteFile(
  urlOrUrls: string | string[] | null | undefined,
  options?: { token?: string }
): Promise<void> {
  if (!urlOrUrls) return;

  const rawList = Array.isArray(urlOrUrls) ? urlOrUrls : [urlOrUrls];
  const list = rawList.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);

  if (list.length === 0) return;

  const blobUrlsToDelete: string[] = [];

  for (const item of list) {
    const trimmed = item.trim();

    if (isBlobUrl(trimmed)) {
      blobUrlsToDelete.push(trimmed);
    } else if (trimmed.startsWith('/images/') || trimmed.startsWith('images/')) {
      // Legacy local file cleanup: safely remove from local public directory if it exists
      try {
        const relativePath = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
        const localPath = path.join(process.cwd(), 'public', relativePath);
        await fs.unlink(localPath).catch(() => {
          // Ignore if file was already deleted or doesn't exist
        });
      } catch {
        // Silently ignore local filesystem errors during cleanup
      }
    }
  }

  if (blobUrlsToDelete.length > 0) {
    const token = getBlobToken(options?.token);
    try {
      await del(blobUrlsToDelete, { token });
    } catch (err: any) {
      console.error('Error deleting blob from Vercel Blob:', err?.message || err);
      throw err;
    }
  }
}

/**
 * Retrieves metadata for a blob (size, contentType, uploadedAt, etc.).
 *
 * @param urlOrPathname - Full blob URL or store pathname.
 * @param options - Optional configuration with token override.
 */
export async function getFileInfo(
  urlOrPathname: string,
  options?: { token?: string }
): Promise<HeadBlobResult | null> {
  try {
    const token = getBlobToken(options?.token);
    return await head(urlOrPathname, { token });
  } catch (err) {
    console.error('Error fetching blob info:', err);
    return null;
  }
}

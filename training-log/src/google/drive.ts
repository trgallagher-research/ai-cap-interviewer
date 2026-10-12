import type { drive_v3 } from "googleapis";

export interface InboxFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
}

const FOLDER_MIME = "application/vnd.google-apps.folder";
const GOOGLE_NATIVE_PREFIX = "application/vnd.google-apps";

/** Files directly inside the inbox folder, oldest first. Folders (the
 * managed _archive/_quarantine/_duplicates subfolders) are excluded by the
 * mimeType filter, so callers never see their own housekeeping folders. */
export async function listInboxFiles(
  drive: drive_v3.Drive,
  inboxFolderId: string,
): Promise<InboxFile[]> {
  const files: InboxFile[] = [];
  let pageToken: string | undefined;
  do {
    const res = await drive.files.list({
      q: `'${inboxFolderId}' in parents and mimeType != '${FOLDER_MIME}' and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType, createdTime)",
      orderBy: "createdTime",
      pageSize: 100,
      pageToken,
    });
    for (const f of res.data.files ?? []) {
      if (!f.id || !f.name) continue;
      files.push({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType ?? "application/octet-stream",
        createdTime: f.createdTime ?? "",
      });
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  return files;
}

export function isGoogleNativeFile(mimeType: string): boolean {
  return mimeType.startsWith(GOOGLE_NATIVE_PREFIX);
}

export async function downloadFileText(
  drive: drive_v3.Drive,
  fileId: string,
): Promise<string> {
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" },
  );
  return Buffer.from(res.data as ArrayBuffer).toString("utf-8");
}

/** Find (or create) a subfolder by name directly under `parentId`. Idempotent. */
async function ensureSubfolder(
  drive: drive_v3.Drive,
  parentId: string,
  name: string,
): Promise<string> {
  const res = await drive.files.list({
    q: `'${parentId}' in parents and mimeType = '${FOLDER_MIME}' and name = '${name.replace(/'/g, "\\'")}' and trashed = false`,
    fields: "files(id)",
    pageSize: 1,
  });
  const existing = res.data.files?.[0]?.id;
  if (existing) return existing;

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: FOLDER_MIME,
      parents: [parentId],
    },
    fields: "id",
  });
  if (!created.data.id) {
    throw new Error(`Failed to create Drive folder '${name}'`);
  }
  return created.data.id;
}

export interface ManagedFolders {
  archiveId: string;
  quarantineId: string;
  duplicatesId: string;
}

export async function ensureManagedFolders(
  drive: drive_v3.Drive,
  inboxFolderId: string,
  names: { archive: string; quarantine: string; duplicates: string },
): Promise<ManagedFolders> {
  const [archiveId, quarantineId, duplicatesId] = await Promise.all([
    ensureSubfolder(drive, inboxFolderId, names.archive),
    ensureSubfolder(drive, inboxFolderId, names.quarantine),
    ensureSubfolder(drive, inboxFolderId, names.duplicates),
  ]);
  return { archiveId, quarantineId, duplicatesId };
}

/** Moves a file from one parent folder to another (Drive parents are a set;
 * this swaps membership rather than changing ownership). */
export async function moveFile(
  drive: drive_v3.Drive,
  fileId: string,
  fromFolderId: string,
  toFolderId: string,
): Promise<void> {
  await drive.files.update({
    fileId,
    addParents: toFolderId,
    removeParents: fromFolderId,
    fields: "id, parents",
  });
}

/** Sets the Drive file description — used to record why a file was
 * quarantined, visible right in the Drive UI without opening the file. */
export async function setFileDescription(
  drive: drive_v3.Drive,
  fileId: string,
  description: string,
): Promise<void> {
  await drive.files.update({
    fileId,
    requestBody: { description: description.slice(0, 4000) },
  });
}

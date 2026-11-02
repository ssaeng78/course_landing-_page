export const DEFAULT_DRIVE_FOLDER_ID = "1CcCgh6im2KEfwaYEd5iOcIpt1JbxNh46";
export const DEFAULT_DRIVE_FOLDER_URL =
  "https://drive.google.com/drive/folders/1CcCgh6im2KEfwaYEd5iOcIpt1JbxNh46";

export function driveFolderId() {
  return process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() || DEFAULT_DRIVE_FOLDER_ID;
}

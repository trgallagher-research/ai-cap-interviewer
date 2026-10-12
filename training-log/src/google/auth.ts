import { google } from "googleapis";
import type { Config } from "../config.js";

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive",
];

export function createGoogleAuth(config: Config) {
  return new google.auth.GoogleAuth({
    keyFile: config.googleApplicationCredentials,
    scopes: SCOPES,
  });
}

export function createGoogleClients(config: Config) {
  const auth = createGoogleAuth(config);
  return {
    sheets: google.sheets({ version: "v4", auth }),
    drive: google.drive({ version: "v3", auth }),
  };
}

export type GoogleClients = ReturnType<typeof createGoogleClients>;

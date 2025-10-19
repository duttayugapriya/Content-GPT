import { google } from "googleapis";
import fs from "fs";

export async function appendToSheet(content, score, campaign) {
  const auth = new google.auth.GoogleAuth({
    keyFile: "./src/credentials.json",
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = "1Ctz9rfByUlhxbmxOPpb8FU0zXV1C-sOFvkmDWg_tMcc"; // from the sheet URL

  const date = new Date().toLocaleString();
  const values = [[date, campaign, content, score]];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "Sheet1!A:D",
    valueInputOption: "RAW",
    resource: { values },
  });
}


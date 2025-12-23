// src/utils/sheets.js
import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

const authClient = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_KEYFILE || "./src/credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

export async function appendRowToSheet(sheetName, rowArray) {
  try {
    const auth = await authClient.getClient();
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.SPREADSHEET_ID || "1Ctz9rfByUlhxbmxOPpb8FU0zXV1C-sOFvkmDWg_tMcc";
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [rowArray],
      },
    });
    return { success: true };
  } catch (err) {
    console.error("appendRowToSheet error:", err);
    return { success: false, error: err.message || err };
  }
}

export {appendRowToSheet as appendToSheet};
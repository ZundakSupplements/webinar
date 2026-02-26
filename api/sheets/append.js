const { google } = require("googleapis");

function getPrivateKey() {
  const b64 = process.env.GOOGLE_PRIVATE_KEY_BASE64;
  if (!b64) throw new Error("Missing GOOGLE_PRIVATE_KEY_BASE64");

  const decoded = Buffer.from(b64, "base64").toString("utf8").trim();

  if (!decoded.includes("BEGIN PRIVATE KEY")) {
    throw new Error("Decoded key does not contain BEGIN PRIVATE KEY");
  }

  return decoded;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, step: "method", error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});

    const tipoNegocio = String(body.tipoNegocio || "").trim();
    const dificuldade = String(body.dificuldade || "").trim();
    const duvida = String(body.duvida || "").trim();

    if (!tipoNegocio) {
      return res.status(400).json({ ok: false, step: "validation", error: "tipoNegocio missing" });
    }
    if (!dificuldade) {
      return res.status(400).json({ ok: false, step: "validation", error: "dificuldade missing" });
    }
    if (!duvida) {
      return res.status(400).json({ ok: false, step: "validation", error: "duvida missing" });
    }

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const tabName = process.env.GOOGLE_SHEET_TAB || "Respostas";
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = getPrivateKey();

    if (!spreadsheetId) throw new Error("Missing GOOGLE_SHEET_ID");
    if (!email) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_EMAIL");

    const auth = new google.auth.JWT({
      email,
      key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    // Step 1: verify auth explicitly
    await auth.authorize();

    const sheets = google.sheets({ version: "v4", auth });

    // Step 2: verify spreadsheet exists
    await sheets.spreadsheets.get({
      spreadsheetId,
    });

    // Step 3: append row
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${tabName}!A:Z`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [[
          new Date().toISOString(),
          tipoNegocio,
          dificuldade,
          duvida,
          String(body.page || ""),
          String(body.ref || ""),
          String(body.ua || ""),
        ]],
      },
    });

    return res.status(200).json({
      ok: true,
      step: "done",
    });
  } catch (e) {
    console.error("SHEETS ERROR:", e);

    return res.status(500).json({
      ok: false,
      step: "catch",
      error: e?.message || "Unexpected error",
      details: e?.response?.data || null,
    });
  }
};
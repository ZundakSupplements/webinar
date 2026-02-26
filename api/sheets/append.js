const { google } = require("googleapis");

function getServiceAccount() {
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;
  if (!b64) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_JSON_BASE64");

  const json = Buffer.from(b64, "base64").toString("utf8");
  const creds = JSON.parse(json);

  if (!creds.client_email) throw new Error("Missing client_email in service account JSON");
  if (!creds.private_key || !creds.private_key.includes("BEGIN PRIVATE KEY")) {
    throw new Error("Invalid private_key in service account JSON");
  }

  return creds;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});

    const tipoNegocio = String(body.tipoNegocio || "").trim();
    const dificuldade = String(body.dificuldade || "").trim();
    const duvida = String(body.duvida || "").trim();

    if (!tipoNegocio) return res.status(400).json({ ok: false, error: "tipoNegocio missing" });
    if (!dificuldade) return res.status(400).json({ ok: false, error: "dificuldade missing" });
    if (!duvida) return res.status(400).json({ ok: false, error: "duvida missing" });

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const tabName = process.env.GOOGLE_SHEET_TAB || "Respostas";
    if (!spreadsheetId) throw new Error("Missing GOOGLE_SHEET_ID");

    const creds = getServiceAccount();

    const auth = new google.auth.JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    await auth.authorize();

    const sheets = google.sheets({ version: "v4", auth });

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

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: e?.message || "Unexpected error",
      details: e?.response?.data || null,
    });
  }
};
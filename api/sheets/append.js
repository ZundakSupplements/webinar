const { google } = require("googleapis");

function getPrivateKey() {
  let key = process.env.GOOGLE_PRIVATE_KEY;
  if (!key) throw new Error("Missing GOOGLE_PRIVATE_KEY");

  // remove aspas se a env var ficou tipo "-----BEGIN..."
  key = key.trim().replace(/^"|"$/g, "");

  // suporta tanto \n literais como \\n
  key = key.replace(/\\n/g, "\n");

  return key;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    // Honeypot anti-bot
    if (body?.company_website && String(body.company_website).trim().length > 0) {
      return res.status(200).json({ ok: true });
    }

    const tipoNegocio = String(body?.tipoNegocio || "").trim();
    const dificuldade = String(body?.dificuldade || "").trim();
    const duvida = String(body?.duvida || "").trim();

    if (!tipoNegocio) return res.status(400).json({ ok: false, error: "tipoNegocio é obrigatório." });
    if (!dificuldade) return res.status(400).json({ ok: false, error: "dificuldade é obrigatória." });
    if (!duvida) return res.status(400).json({ ok: false, error: "duvida é obrigatória." });

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const tabName = process.env.GOOGLE_SHEET_TAB || "Respostas";
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

    if (!spreadsheetId) throw new Error("Missing GOOGLE_SHEET_ID");
    if (!email) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_EMAIL");

    const auth = new google.auth.JWT({
      email,
      key: getPrivateKey(),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const row = [
      new Date().toISOString(),
      tipoNegocio,
      dificuldade,
      duvida,
      String(body?.page || ""),
      String(body?.ref || ""),
      String(body?.ua || ""),
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${tabName}!A:Z`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || "Unexpected error" });
  }
};
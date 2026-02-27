function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Respostas");
    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: "Sheet 'Respostas' not found" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var data = JSON.parse(e.postData.contents || "{}");

    var tipoNegocio = (data.tipoNegocio || "").toString().trim();
    var dificuldade = (data.dificuldade || "").toString().trim();
    var duvida = (data.duvida || "").toString().trim();
    var page = (data.page || "").toString();
    var ref = (data.ref || "").toString();
    var ua = (data.ua || "").toString();

    if (!tipoNegocio || !dificuldade || !duvida) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: "Missing required fields" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    sheet.appendRow([
      new Date(),
      tipoNegocio,
      dificuldade,
      duvida,
      page,
      ref,
      ua
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
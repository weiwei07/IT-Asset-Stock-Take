/******************************************************
 * IT Asset Stock Take System V4.0
 * REST API Backend - Google Apps Script
 ******************************************************/

const SPREADSHEET_ID = "1lUZrsjT4WrsjWqLulTLABp33lGxykA4EBklKFx1eV0I";
const SHEET_NAME = "Assets";

/******************************************************
 * Open Spreadsheet
 ******************************************************/
function getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    throw new Error("Sheet '" + SHEET_NAME + "' not found.");
  }

  return sheet;
}

/******************************************************
 * JSON Response
 ******************************************************/
function jsonOutput(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/******************************************************
 * GET API
 ******************************************************/
function doGet(e) {
  try {
    const action = (e.parameter.action || "").toLowerCase();
    Logger.log("GET Action: " + action);

    switch (action) {
      case "dashboard":
        return jsonOutput(getDashboard());

      case "locations":
        return jsonOutput({
          success: true,
          data: getLocations()
        });

      case "conditions":
        return jsonOutput({
          success: true,
          data: getConditions()
        });

      case "getasset":
        return jsonOutput(getAsset(e.parameter.id || ""));

      case "search":
        return jsonOutput({
          success: true,
          data: searchAssets(e.parameter.keyword || "")
        });

      case "pending":
        return jsonOutput({
          success: true,
          data: getPendingAssets()
        });

      case "verified":
        return jsonOutput({
          success: true,
          data: getVerifiedAssets()
        });

      case "version":
        return jsonOutput(version());

      case "system":
        return jsonOutput(systemInfo());

      default:
        return jsonOutput({
          success: false,
          message: "Unknown API action."
        });
    }
  } catch (err) {
    return jsonOutput({
      success: false,
      message: err.toString()
    });
  }
}

/******************************************************
 * POST API
 ******************************************************/
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = (body.action || "").toLowerCase();

    Logger.log("POST Action: " + action);

    switch (action) {
      case "verify":
        return jsonOutput(
          verifyAsset(
            body.row,
            body.location,
            body.verifier,
            body.condition
          )
        );

      case "reset":
        return jsonOutput(
          resetVerification(body.assetID)
        );

      default:
        return jsonOutput({
          success: false,
          message: "Unknown POST action."
        });
    }
  } catch (err) {
    return jsonOutput({
      success: false,
      message: err.toString()
    });
  }
}

/******************************************************
 * Dashboard
 ******************************************************/
function getDashboard() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return {
      success: true,
      total: 0,
      verified: 0,
      pending: 0
    };
  }

  const data = sheet.getRange(2, 1, lastRow - 1, 11).getValues();

  let verified = 0;
  data.forEach(function(row) {
    if (String(row[6]).trim().toUpperCase() == "YES") {
      verified++;
    }
  });

  return {
    success: true,
    total: data.length,
    verified: verified,
    pending: data.length - verified
  };
}

/******************************************************
 * Locations
 ******************************************************/
function getLocations() {
  return [
    "18Micron办公室",
    "VSMC项目",
    "Meeting Room",
    "Warehouse",
    "Store",
    "Server Room",
    "Reception",
    "IT Department"
  ];
}

/******************************************************
 * Conditions
 ******************************************************/
function getConditions() {
  return [
    "Good",
    "Damaged",
    "Repair",
    "Missing"
  ];
}

/******************************************************
 * Get Asset By Asset ID
 ******************************************************/
function getAsset(assetID) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return {
      success: false,
      message: "No asset found."
    };
  }

  assetID = String(assetID).trim().toUpperCase();
  const data = sheet.getRange(2, 1, lastRow - 1, 11).getValues();

  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim().toUpperCase() == assetID) {
      return {
        success: true,
        row: i + 2,
        assetID: data[i][0],
        assetName: data[i][1],
        user: data[i][2],
        purchaseDate: data[i][3],
        location: data[i][4],
        remarks: data[i][5],
        verified: data[i][6],
        verifyDate: data[i][7],
        verifiedBy: data[i][8],
        condition: data[i][9],
        status: data[i][10]
      };
    }
  }

  return {
    success: false,
    message: "Asset ID not found."
  };
}

/******************************************************
 * Search Assets
 ******************************************************/
function searchAssets(keyword) {
  keyword = String(keyword).trim().toLowerCase();

  const sheet = getSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return [];
  }

  const data = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
  let result = [];

  data.forEach(function(row, index) {
    let text = row.join(" ").toLowerCase();

    if (text.indexOf(keyword) > -1) {
      result.push({
        row: index + 2,
        assetID: row[0],
        assetName: row[1],
        user: row[2],
        purchaseDate: row[3],
        location: row[4],
        remarks: row[5],
        verified: row[6],
        verifyDate: row[7],
        verifiedBy: row[8],
        condition: row[9],
        status: row[10]
      });
    }
  });

  return result;
}

/******************************************************
 * Get Pending Assets
 ******************************************************/
function getPendingAssets() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return [];
  }

  const data = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
  let result = [];

  data.forEach(function(row) {
    if (String(row[6]).trim().toUpperCase() != "YES") {
      result.push({
        row: result.length + 2,
        assetID: row[0],
        assetName: row[1],
        user: row[2],
        purchaseDate: row[3],
        location: row[4],
        remarks: row[5],
        condition: row[9],
        status: row[10]
      });
    }
  });

  return result;
}

/******************************************************
 * Get Verified Assets
 ******************************************************/
function getVerifiedAssets() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return [];
  }

  const data = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
  let result = [];

  data.forEach(function(row) {
    if (String(row[6]).trim().toUpperCase() == "YES") {
      result.push({
        assetID: row[0],
        assetName: row[1],
        user: row[2],
        purchaseDate: row[3],
        location: row[4],
        remarks: row[5],
        verifyDate: row[7],
        verifiedBy: row[8],
        condition: row[9],
        status: row[10]
      });
    }
  });

  return result;
}

/******************************************************
 * Verify Asset
 ******************************************************/
function verifyAsset(row, location, verifier, condition) {
  try {
    const sheet = getSheet();
    row = Number(row);

    if (isNaN(row) || row < 2) {
      return {
        success: false,
        message: "Invalid row."
      };
    }

    sheet.getRange(row, 5).setValue(location);        // Location (Column E)
    sheet.getRange(row, 7).setValue("Yes");           // Verified (Column G)
    sheet.getRange(row, 8).setValue(new Date());      // Verify Date (Column H)
    sheet.getRange(row, 9).setValue(verifier);        // Verified By (Column I)
    sheet.getRange(row, 10).setValue(condition);      // Condition (Column J)
    sheet.getRange(row, 11).setValue("Verified");     // Status (Column K)

    SpreadsheetApp.flush();

    return {
      success: true,
      message: "Asset verified successfully."
    };
  } catch (err) {
    return {
      success: false,
      message: err.toString()
    };
  }
}

/******************************************************
 * Reset Verification
 ******************************************************/
function resetVerification(assetID) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return {
      success: false,
      message: "No asset found."
    };
  }

  assetID = String(assetID).trim().toUpperCase();
  const data = sheet.getRange(2, 1, lastRow - 1, 11).getValues();

  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim().toUpperCase() == assetID) {
      sheet.getRange(i + 2, 7).clearContent();   // Verified
      sheet.getRange(i + 2, 8).clearContent();   // Verify Date
      sheet.getRange(i + 2, 9).clearContent();   // Verified By
      sheet.getRange(i + 2, 10).clearContent();  // Condition
      sheet.getRange(i + 2, 11).setValue("Pending"); // Status

      SpreadsheetApp.flush();

      return {
        success: true,
        message: "Verification reset successfully."
      };
    }
  }

  return {
    success: false,
    message: "Asset ID not found."
  };
}

/******************************************************
 * Version Information
 ******************************************************/
function version() {
  return {
    success: true,
    version: "4.0",
    app: "IT Asset Stock Take System",
    lastUpdated: "2024-01-15"
  };
}

/******************************************************
 * System Information
 ******************************************************/
function systemInfo() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();

  return {
    success: true,
    spreadsheetId: SPREADSHEET_ID,
    sheetName: SHEET_NAME,
    totalRows: lastRow - 1,
    system: "Google Apps Script",
    apiVersion: "2.0"
  };
}

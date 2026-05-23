function generateCourseraAnalyticsWithOCR() {
  var targetFolderId = "Enter your drive folder Id"; 
  /*Example drive link: https://drive.google.com/drive/folders/1kEQ9xLkJ0_XgWKudaykumarangari-THha  
      the folder id for this drive link is the text after folders/ : 1kEQ9xLkJ0_XgWKudaykumarangari-THha
  */
  
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // Initialize headers only if the sheet is completely blank
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Student ID", "Total Certificates", "Course Names Extract"]);
    sheet.getRange("A1:C1").setFontWeight("bold").setBackground("#e6f2ff");
  }
  
  // Load already processed Student IDs into a Set for O(1) instant lookups
  var processedStudents = new Set();
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    var existingIds = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < existingIds.length; i++) {
      if (existingIds[i][0]) {
        processedStudents.add(existingIds[i][0].toString().trim());
      }
    }
  }
  
  try {
    var parentFolder = DriveApp.getFolderById(targetFolderId);
    var subFolders = parentFolder.getFolders();
    
    console.log("Starting/Resuming Coursera Scan...");
    console.log("Already processed students count: " + processedStudents.size);
    
    var processedInThisRun = 0;
    
    while (subFolders.hasNext()) {
      var folder = subFolders.next();
      var studentId = folder.getName().trim(); 
      
      // SKIP if we already extracted this student's data in a previous run
      if (processedStudents.has(studentId)) {
        console.log("Skipping (Already Processed): " + studentId);
        continue;
      }
      
      console.log("Processing New Student Folder: " + studentId);
      
      var files = folder.getFiles();
      var certificateCount = 0;
      var courseNames = [];
      
      while (files.hasNext()) {
        var file = files.next();
        certificateCount++;
        
        console.log(" OCR parsing file: " + file.getName());
        var extractedText = extractTextViaOCR(file.getId());
        
        if (extractedText) {
          var courseTitle = parsingCourseraText(extractedText);
          courseNames.push(courseTitle);
          console.log("Extracted Title: " + courseTitle);
        } else {
          courseNames.push("Unreadable Document");
          console.log("OCR failed or unreadable file layout.");
        }
      }
      
      // Append row immediately to the sheet to save state
      sheet.appendRow([studentId, certificateCount, courseNames.join(" , ")]);
      processedInThisRun++;
      
      // Optional safety check: Pause if the log stream gets too large
      SpreadsheetApp.flush(); 
    }
    
    if (processedInThisRun === 0) {
      SpreadsheetApp.getUi().alert("All folders inside this directory are already up to date!");
    } else {
      SpreadsheetApp.getUi().alert("Batch complete! Successfully added " + processedInThisRun + " new student profiles.");
    }
    
  } catch (error) {
    console.log("Execution broke off: " + error.toString());
    SpreadsheetApp.getUi().alert("Paused or Limited: Rerun the script to continue from row " + sheet.getLastRow());
  }
}

function extractTextViaOCR(fileId) {
  try {
    var resource = { title: 'Temp_OCR_Doc', mimeType: MimeType.GOOGLE_DOCS };
    var tempDoc = Drive.Files.copy(resource, fileId, {ocr: true});
    var doc = DocumentApp.openById(tempDoc.id);
    var text = doc.getBody().getText();
    Drive.Files.remove(tempDoc.id);
    return text;
  } catch(e) {
    return null;
  }
}

function parsingCourseraText(rawText) {
  var lines = rawText.split('\n');
  for (var i = 0; i < lines.length; i++) {
    var currentLine = lines[i].trim().toLowerCase();
    if (currentLine.includes("successfully completed") || currentLine.includes("has successfully completed")) {
      if (i + 1 < lines.length && lines[i+1].trim().length > 2) return lines[i+1].trim();
      if (i + 2 < lines.length && lines[i+2].trim().length > 2) return lines[i+2].trim();
    }
  }
  return "Course Title Not Found";
}

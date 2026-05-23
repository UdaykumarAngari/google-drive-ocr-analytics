# How I Automated Coursera Analytics for RGUKT Basar Students

## Why I Built This (Context & Ground Reality)

I am the Student Coordinator handling the Coursera campus subscriptions provided by the Deshpande Foundation for students at RGUKT Basar. To submit completion reports to our faculty advisors, I had to verify who finished which course.

That is where things got incredibly messy:

### The Messy Data

Over 200 students uploaded their certificates, but they didn’t name the files properly.

I was dealing with folders full of files named:

* `IMG_4229.JPG`
* `Document_1.pdf`
* `WA_Image.png`

Open up a random image, look at the course title, type it manually into an Excel sheet, close it, and repeat hundreds of times.

Doing this by hand was a massive time sink.

### The 6-Minute Wall

I tried running a simple automated script to read through the folders, but because converting high-res images to text takes a few seconds per file, the script kept hitting Google Apps Script's strict 6-minute execution limit and crashing halfway through.

To fix both issues, I sat down and built this custom OCR-based stateful pipeline to handle everything natively inside Google Workspace.

---

# How the System Works

Instead of building a massive external backend application, I wrote the entire engine inside Google Apps Script so it could talk directly to Google Drive and Google Sheets without needing complex API keys or local server setups.

The process follows a clean lifecycle:

## 1. Directory Scan

The script hooks into the main folder:

```text
drive folder id : 1QxwqjIX0aRElu8GWduday8MweojmSsQ74U
```

and loops through the subfolders (which are named by Student IDs).

---

## 2. The Checkpoint Filter

Before doing anything heavy, the script checks the current Google Sheet rows to see if that Student ID is already logged.

If it finds a match, it skips it instantly.

---

## 3. Canvas Image OCR

For new entries, it takes the un-named image or PDF and passes its file ID to Google's Advanced Drive API to extract the raw text content right out of the visual canvas.

---

## 4. Keyword Target Matching

The script reads the raw text string, looks for Coursera’s specific marker text:

```text
"has successfully completed"
```

and grabs the exact course title written right below it.

---

## 5. Database Update

It immediately appends a new row to the active Google Sheet with:

* Student ID
* Total certificate count
* Exact course names found

---

# Technical Hurdles I Had to Solve

## 1. Beating the Cloud Execution Timeout (Stateful Resuming)

The absolute biggest roadblock was Google's standard 6-minute limit for serverless scripts.

When processing bulk images for a large student cohort, a standard continuous script will always crash before finishing.

### My Workaround

I built a primitive state management layer using a JavaScript `Set`.

Instead of recalculating or re-scanning from scratch, the script loads all completed IDs into a lookup table at launch.

If it hits a timeout, I can just click run again—it skips completed folders instantly with $O(1)$ efficiency and resumes processing exactly where it got cut off.

---

## 2. Standardizing Arbitrary Filenames

Since I couldn't force 150+ students to rename their image attachments perfectly, I had to decouple my pipeline from metadata or filenames entirely.

### My Workaround

By using the advanced `Drive.Files.copy` engine configuration to force server-side rendering of image canvases into temporary underlying text documents, the code reads what's actually *inside* the certificate image rather than relying on what the student named the file.

---

# Quick Setup Guide

If you want to duplicate this setup for your own campus tracking, here are the exact manual steps:

## 1. Set Up the Script Environment

1. Open up a clean **Google Sheet** that you want to use as your tracker database.
2. Go to the top toolbar and click on:

```text
Extensions > Apps Script
```

3. Clear out the default boilerplate functions and create a file named:

```javascript
tracker.js
```

Paste the complete project code inside it.

---

## 2. Turn on the Advanced Drive Service

You have to manually give your script permission to use Google's backend OCR engine:

1. Look at the left sidebar menu in the editor and click the `+` icon next to **Services**.
2. Find **Drive API** in the list.
3. Ensure the version is set to `v3`.
4. Click **Add**.

---

## 3. Point to Your Root Directory

1. Open your parent Coursera folder in Google Drive and grab its unique ID string from your browser's URL address bar.
2. In your code, update the `targetFolderId` configuration line at the top to point to your specific folder:

```javascript
var targetFolderId = "1QxwqjIX0aRElu8GWduday8MweojmSsQ74U";
```

3. Hit the **Save (Disk icon)** button.

---

# 4. Run & Monitor Progress

1. Select `generateCourseraAnalyticsWithOCR` from the toolbar menu dropdown and hit:

```text
▶ Run
```

2. Accept the initial security popup to grant the script access to populate your sheet.
3. Keep the **Execution Log** drawer open at the bottom.
4. You will watch it log live text tracking updates as it moves through each student folder line-by-line.
5. If it hits a timeout, don't worry—just click run again, and watch it skip right past the finished students to finish the job!

---

# The Tech Stack I Used

## Runtime Platform

* Google Apps Script (V8 Engine / JavaScript)

## API Frameworks

* Google Drive Advanced Service (v3)
* Google DocumentApp
* SpreadsheetApp Engine

## Reporting Layer

* Google Sheets Data Layout
* Built-in Analytics Graphs


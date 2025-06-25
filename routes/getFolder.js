import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from "url";
import fs from 'fs';
import { createObjectCsvWriter } from "csv-writer";

// Resolve __dirname in ES module 
const __filename = fileURLToPath(import.meta.url); 
const __dirname = path.dirname(__filename);

const router = express.Router();
const upload = multer({ dest: 'uploads2/' }); // Temporary upload directory
 
// Ensure the /uploads2 directory exists
// console.log('__dirname:', __dirname);  
const uploadsDir = path.join(__dirname, '../uploads2'); 
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
} 

router.post('/', upload.array('folder'), async (req, res) => { 
  try {
    const files = req.files;  
    const relativePathIndex = req.body.relativePath; // Get the relative path from the request body
    // console.log('Relative path:', relativePath);
    // console.log('Files received: ', files);

 
    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    files.forEach((file, i) => {
      // This includes the full relative path (e.g., "mainFolder/subFolder1/file.svg")
      const relativePath = file.originalname; 
      const targetPath = path.join(uploadsDir, relativePathIndex[i], relativePath);
      // console.log('Processing file:', targetPath);
 
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      fs.renameSync(file.path, targetPath);  
    }); 

    if (files.length > 0) {
      // Generate CSV after all files are uploaded 
      await generateCSV();
      // Delete the uploads2 folder after processing
      fs.rmSync(uploadsDir, { recursive: true, force: true });
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log(`Folder "${uploadsDir}" has been deleted.`); 
    }

    return res.status(200).json({ message: 'Folder uploaded successfully' });
  } catch (error) {
    console.error('Error uploading folder:', error);
    return res.status(500).json({ message: 'Error uploading folder' });
  }
});
 

// Path to the main uploads folder and output CSV
// console.log(`Current directory: ${__dirname}`);
const basePath = path.join(__dirname, "../uploads2/"); 
const outputCsv = path.join(__dirname, "../uploadSvgs.csv");
 
// Initialize CSV writer with correct headers
const csvWriter = createObjectCsvWriter({
  path: outputCsv,
  header: [
    { id: "SKU", title: "SKU" },
    { id: "SVG", title: "SVG" },
  ],
});

// Function to read SVG file content inside a folder and return as single-line string
const getSvgContent = (folderPath) => {
  const files = fs.readdirSync(folderPath);
  for (const file of files) {
    if (file.toLowerCase().endsWith(".svg")) {
      const svgPath = path.join(folderPath, file);
      // console.log(`Checking file: ${svgPath}`);
      const content = fs.readFileSync(svgPath, "utf-8"); 
      return content.replace(/\s*\n\s*/g, " ").trim();
    }  
  } 
  return null;
};

// Main CSV generation logic
const generateCSV = async () => {
  const records = [];

  if (!fs.existsSync(basePath)) {
    console.error(`Error: Folder "${basePath}" does not exist.`);
    return;
  }

  const folders = fs.readdirSync(basePath);

  for (const folder of folders) {
    const folderPath = path.join(basePath, folder);
    console.log(`Processing folder: ${folder}`);
    if (fs.statSync(folderPath).isDirectory()) {
      const svgContent = getSvgContent(folderPath);

      if (svgContent) {
        records.push({
          SKU: folder,
          SVG: svgContent,
        });
      } else {  
        console.warn(`No SVG found in: ${folderPath}`);
      }
    }
  }

  if (records.length === 0) {
    console.warn("No valid folders with SVG content found.");
  } else {
    await csvWriter.writeRecords(records);
    console.log(
      `✅ CSV file "${outputCsv}" has been generated with ${records.length} rows.`
    );
  }
};

     
export default router;
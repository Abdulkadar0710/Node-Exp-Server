// import fs from "fs";
// import path from "path";
// import { fileURLToPath } from "url";
// import { createObjectCsvWriter } from "csv-writer";

// // Resolve __dirname in ES module
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// // Path to the main uploads folder and output CSV
// console.log(`Current directory: ${__dirname}`);
// const basePath = path.join(__dirname, "/uploads2/");
// const outputCsv = path.join(__dirname, "uploadSvgs.csv");
 
// // Initialize CSV writer with correct headers
// const csvWriter = createObjectCsvWriter({
//   path: outputCsv,
//   header: [
//     { id: "SKU", title: "SKU" },
//     { id: "SVG", title: "SVG" },
//   ],
// });

// // Function to read SVG file content inside a folder and return as single-line string
// const getSvgContent = (folderPath) => {
//   const files = fs.readdirSync(folderPath);
//   for (const file of files) {
//     if (file.toLowerCase().endsWith(".svg")) {
//       const svgPath = path.join(folderPath, file);
//       console.log(`Checking file: ${svgPath}`);
//       const content = fs.readFileSync(svgPath, "utf-8");
//       return content.replace(/\s*\n\s*/g, " ").trim();
//     }
//   }
//   return null;
// };

// // Main CSV generation logic
// const generateCSV = async () => {
//   const records = [];

//   if (!fs.existsSync(basePath)) {
//     console.error(`Error: Folder "${basePath}" does not exist.`);
//     return;
//   }

//   const folders = fs.readdirSync(basePath);

//   for (const folder of folders) {
//     const folderPath = path.join(basePath, folder);
//     console.log(`Processing folder: ${folder}`);
//     if (fs.statSync(folderPath).isDirectory()) {
//       const svgContent = getSvgContent(folderPath);

//       if (svgContent) {
//         records.push({
//           SKU: folder,
//           SVG: svgContent,
//         });
//       } else {
//         console.warn(`No SVG found in: ${folderPath}`);
//       }
//     }
//   }

//   if (records.length === 0) {
//     console.warn("No valid folders with SVG content found.");
//   } else {
//     await csvWriter.writeRecords(records);
//     console.log(
//       `✅ CSV file "${outputCsv}" has been generated with ${records.length} rows.`
//     );
//   }
// };

// generateCSV();

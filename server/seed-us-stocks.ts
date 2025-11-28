import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';

async function seedUSStocks() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  // Find Excel file
  const attachedAssetsDir = path.join(process.cwd(), 'attached_assets');
  let excelFile: string | null = null;

  if (fs.existsSync(attachedAssetsDir)) {
    const files = fs.readdirSync(attachedAssetsDir);
    const xlsxFile = files.find(f => f.endsWith('.xlsx'));
    if (xlsxFile) {
      excelFile = path.join(attachedAssetsDir, xlsxFile);
    }
  }

  if (!excelFile) {
    console.error('No Excel file found in attached_assets');
    process.exit(1);
  }

  console.log('Reading Excel file:', excelFile);

  // Read Excel file
  const workbook = XLSX.readFile(excelFile);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

  if (data.length === 0) {
    console.error('No data in Excel file');
    process.exit(1);
  }

  console.log(`Loaded ${data.length} rows from Excel`);

  // Detect columns (case insensitive)
  const firstRow = data[0];
  const columns = Object.keys(firstRow);

  let symbolCol = columns.find(
    c =>
      c.toLowerCase().includes('symbol') ||
      c.toLowerCase() === 'sembol' ||
      c.toLowerCase() === 'kod'
  );
  let nameCol = columns.find(
    c =>
      c.toLowerCase().includes('name') ||
      c.toLowerCase() === 'ad' ||
      c.toLowerCase().includes('adi')
  );

  if (!symbolCol) symbolCol = columns[0];
  if (!nameCol) nameCol = columns[1];

  console.log(
    `Using columns: symbol="${symbolCol}", name="${nameCol}"`
  );
  console.log('Sample row:', data[0]);

  // Extract and validate data
  const stocks = data
    .map(row => {
      let symbol = String(row[symbolCol] || '').trim().toUpperCase();
      let name = String(row[nameCol] || '').trim();
      
      // Handle Turkish Excel column names
      if (!symbol && row['Sembol']) symbol = String(row['Sembol']).trim().toUpperCase();
      if (!name && row['Açıklama']) name = String(row['Açıklama']).trim();
      if (!name && row['Adi']) name = String(row['Adi']).trim();
      
      return { symbol, name };
    })
    .filter(s => s.symbol && s.name && s.symbol.length > 0);

  console.log(`Prepared ${stocks.length} valid stocks to insert`);

  // Connect to database
  const sql = neon(dbUrl);

  try {
    // Clear existing stocks
    await sql`DELETE FROM us_stocks`;
    console.log('Cleared existing stocks');

    // Insert in batches
    const batchSize = 50;
    for (let i = 0; i < stocks.length; i += batchSize) {
      const batch = stocks.slice(i, i + batchSize);

      for (const stock of batch) {
        await sql`
          INSERT INTO us_stocks (symbol, name)
          VALUES (${stock.symbol}, ${stock.name})
          ON CONFLICT (symbol) DO UPDATE
          SET name = EXCLUDED.name
        `;
      }

      console.log(
        `Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          stocks.length / batchSize
        )} (${batch.length} stocks)`
      );
    }

    console.log(`✅ Successfully loaded ${stocks.length} stocks into database`);
    process.exit(0);
  } catch (error) {
    console.error('Database error:', error);
    process.exit(1);
  }
}

seedUSStocks();

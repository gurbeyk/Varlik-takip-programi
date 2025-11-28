import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';

async function seedBISTStocks() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const attachedAssetsDir = path.join(process.cwd(), 'attached_assets');
  let excelFile: string | null = null;

  if (fs.existsSync(attachedAssetsDir)) {
    const files = fs.readdirSync(attachedAssetsDir);
    const bistFiles = files.filter(f => f.toLowerCase().includes('bist') && f.endsWith('.xlsx'));
    // Get the most recent file (by timestamp in filename or modification time)
    if (bistFiles.length > 0) {
      const filePaths = bistFiles.map(f => path.join(attachedAssetsDir, f));
      const sorted = filePaths.sort((a, b) => fs.statSync(b).mtime.getTime() - fs.statSync(a).mtime.getTime());
      excelFile = sorted[0];
    }
  }

  if (!excelFile) {
    console.error('No BIST Excel file found in attached_assets');
    process.exit(1);
  }

  console.log('Reading Excel file:', path.basename(excelFile));

  const workbook = XLSX.readFile(excelFile);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

  if (data.length === 0) {
    console.error('No data in Excel file');
    process.exit(1);
  }

  console.log(`Loaded ${data.length} rows from Excel`);

  const stocks = data
    .map(row => ({
      symbol: String(row.symbol || '').trim().toUpperCase(),
      name: String(row.name || '').trim(),
    }))
    .filter(s => s.symbol && s.name && s.symbol.length > 0);

  console.log(`Prepared ${stocks.length} valid stocks to insert`);

  const sql = neon(dbUrl);

  try {
    await sql`DELETE FROM bist_stocks`;
    console.log('Cleared existing BIST stocks');

    const batchSize = 50;
    for (let i = 0; i < stocks.length; i += batchSize) {
      const batch = stocks.slice(i, i + batchSize);

      for (const stock of batch) {
        await sql`
          INSERT INTO bist_stocks (symbol, name)
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

    console.log(`✅ Successfully loaded ${stocks.length} BIST stocks into database`);
    process.exit(0);
  } catch (error) {
    console.error('Database error:', error);
    process.exit(1);
  }
}

seedBISTStocks();

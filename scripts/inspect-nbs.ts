import XLSX from 'xlsx';
const wb = XLSX.readFile('docs/nfse/reference/anexo-b-nbs.xlsx');
console.log('Sheets:', wb.SheetNames);
for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  console.log(`\nSheet "${name}" — ${range.e.r + 1} rows × ${range.e.c + 1} cols`);
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
  console.log('First 5 rows:');
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    console.log(' ', JSON.stringify(rows[i]).slice(0, 200));
  }
  console.log('Total data rows:', rows.length);
}

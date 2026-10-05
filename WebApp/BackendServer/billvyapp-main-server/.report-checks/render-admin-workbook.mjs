import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const runtime=createRequire('C:/Users/Sudhanshu Yadav/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {FileBlob,SpreadsheetFile}=await import(pathToFileURL(runtime.resolve('@oai/artifact-tool')).href);
const book=await SpreadsheetFile.importXlsx(await FileBlob.load('.report-checks/admin-overview.xlsx'));
console.log((await book.inspect({kind:'sheet',include:'id,name',maxChars:1800})).ndjson);
const names=['Executive Summary','Revenue Analysis','Bills - Transactions','Branch Performance','Customer Summary','Payment Methods','Services'];
for(const [i,name] of names.entries()){
 const preview=await book.render({sheetName:name,range:i===0?'A1:B26':i===2?'A1:L9':i===6?'A1:C9':'A1:R24',scale:1,format:'png'});
 await fs.writeFile(`.report-checks/sheet-${i+1}.png`,new Uint8Array(await preview.arrayBuffer()));
}
console.log('Rendered all 7 report worksheets');

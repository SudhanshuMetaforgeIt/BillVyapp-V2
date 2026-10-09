const { parentPort, workerData } = require('node:worker_threads');
const { PDFArray, PDFDict, PDFDocument, PDFName } = require('pdf-lib');

async function inspect() {
  const pdf = await PDFDocument.load(workerData, {
    ignoreEncryption: false,
    throwOnInvalidObject: true,
  });
  if (pdf.getPageCount() < 1 || pdf.getPageCount() > 200) throw new Error('Page count');
  const seen = new Set();
  function visit(object, depth = 0) {
    if (depth > 100) throw new Error('Excessive document nesting');
    if (!object || seen.has(object)) return;
    seen.add(object);
    if (object instanceof PDFArray) {
      for (const entry of object.asArray()) visit(entry, depth + 1);
      return;
    }
    const dictionary = object instanceof PDFDict ? object : object.dict;
    if (!(dictionary instanceof PDFDict)) return;
    for (const name of ['JS', 'JavaScript', 'Launch', 'EmbeddedFiles', 'EF', 'OpenAction', 'AA', 'AcroForm', 'RichMedia', 'XFA']) {
      if (dictionary.has(PDFName.of(name))) throw new Error('Active content');
    }
    const action = dictionary.get(PDFName.of('S'));
    if (action instanceof PDFName && ['JavaScript', 'Launch', 'GoToR', 'SubmitForm', 'ImportData', 'Rendition'].includes(action.decodeText())) {
      throw new Error('Unsafe action');
    }
    for (const entry of dictionary.values()) visit(entry, depth + 1);
  }
  for (const [, object] of pdf.context.enumerateIndirectObjects()) visit(object);
}
inspect().then(() => parentPort.postMessage(true), () => parentPort.postMessage(false));

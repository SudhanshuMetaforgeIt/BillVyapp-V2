import { PDFDocument, PDFName, PDFString } from 'pdf-lib';
import { EventEmitter } from 'node:events';
import { spawn } from 'node:child_process';
import {
  assertAttachmentMetadata,
  validateAttachment,
} from './attachment-validation';
jest.mock('node:child_process', () => ({ spawn: jest.fn() }));

describe('PDF attachment boundary', () => {
  let previous: string | undefined;
  beforeEach(() => {
    previous = process.env.UPLOAD_CLAMSCAN_PATH;
    delete process.env.UPLOAD_CLAMSCAN_PATH;
    jest.clearAllMocks();
  });
  afterEach(() => {
    if (previous === undefined) delete process.env.UPLOAD_CLAMSCAN_PATH;
    else process.env.UPLOAD_CLAMSCAN_PATH = previous;
  });
  const pdfBytes = async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage();
    return Buffer.from(await pdf.save());
  };
  it.each([
    'application/x-msdownload',
    'text/html',
    'image/svg+xml',
    'application/zip',
  ])('rejects arbitrary type %s', (mime) => {
    expect(() => assertAttachmentMetadata('file.bin', mime, 100)).toThrow();
  });
  it.each(['../receipt.pdf', 'path\\receipt.pdf', 'nul\0.pdf'])(
    'rejects unsafe filename %s',
    (name) => {
      expect(() =>
        assertAttachmentMetadata(name, 'application/pdf', 100),
      ).toThrow();
    },
  );
  it('requires an available malware scanner even for a valid PDF', async () => {
    await expect(
      validateAttachment(await pdfBytes(), 'application/pdf'),
    ).rejects.toThrow('scanning');
    expect(spawn).not.toHaveBeenCalled();
  });
  it('rejects invalid PDFs and nested active content before scanning', async () => {
    await expect(
      validateAttachment(Buffer.from('%PDF-1.7 forged'), 'application/pdf'),
    ).rejects.toThrow('valid');
    const pdf = await PDFDocument.create();
    pdf.addPage();
    pdf.catalog.set(
      PDFName.of('Names'),
      pdf.context.obj({
        JavaScript: pdf.context.obj({
          JS: PDFString.of('app.alert("unsafe")'),
        }),
      }),
    );
    await expect(
      validateAttachment(Buffer.from(await pdf.save()), 'application/pdf'),
    ).rejects.toThrow('active content');
    expect(spawn).not.toHaveBeenCalled();
  });
  it.each([0, 1, 2])(
    'accepts only a successful scanner exit code (%i)',
    async (code) => {
      process.env.UPLOAD_CLAMSCAN_PATH = 'operator-configured-scanner';
      jest.mocked(spawn).mockImplementation(() => {
        const child = Object.assign(new EventEmitter(), { kill: jest.fn() });
        queueMicrotask(() => child.emit('close', code));
        return child as unknown as ReturnType<typeof spawn>;
      });
      const bytes = await pdfBytes();
      const operation = validateAttachment(bytes, 'application/pdf');
      if (code === 0) await expect(operation).resolves.toEqual(bytes);
      else await expect(operation).rejects.toThrow();
      expect(spawn).toHaveBeenCalledWith(
        'operator-configured-scanner',
        ['--no-summary', expect.stringContaining('attachment.pdf')],
        expect.objectContaining({
          shell: false,
          windowsHide: true,
          stdio: 'ignore',
        }),
      );
    },
  );
});

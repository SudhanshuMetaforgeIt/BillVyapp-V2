const esbuild = require('esbuild');
const zlib = require('zlib');
const path = require('path');

async function measure(name, code, external = ['react', 'react-dom']) {
  const result = await esbuild.build({
    stdin: {
      contents: code,
      resolveDir: process.cwd(),
      loader: 'tsx',
    },
    bundle: true,
    minify: true,
    format: 'esm',
    external,
    write: false,
  });
  const buf = Buffer.from(result.outputFiles[0].contents);
  const gz = zlib.gzipSync(buf);
  console.log(
    name.padEnd(42) +
    ' | ' +
    (buf.length / 1024).toFixed(1).padStart(7) +
    ' KiB min | ' +
    (gz.length / 1024).toFixed(1).padStart(6) +
    ' KiB gzip'
  );
}

async function run() {
  console.log('Animation Library Bundle Benchmark:');
  console.log('='.repeat(72));
  await measure('gsap (core only)', "import gsap from 'gsap'; console.log(gsap);");
  await measure('@gsap/react (hook only)', "import { useGSAP } from '@gsap/react'; console.log(useGSAP);");
  await measure('gsap + @gsap/react (current setup)', "import gsap from 'gsap'; import { useGSAP } from '@gsap/react'; gsap.registerPlugin(useGSAP); console.log(gsap, useGSAP);");
  await measure('Current lib/animations/index.ts', "import * as anim from './lib/animations/index'; console.log(anim);");
  console.log('-'.repeat(72));
  await measure('motion/react (motion.* component)', "import { motion } from 'motion/react'; console.log(motion);");
  await measure('motion/react (m + LazyMotion minimal)', "import { m, LazyMotion, domAnimation } from 'motion/react'; console.log(m, LazyMotion, domAnimation);");
  await measure('motion/react (AnimatePresence)', "import { AnimatePresence } from 'motion/react'; console.log(AnimatePresence);");
  await measure('motion (vanilla animate function)', "import { animate } from 'motion'; console.log(animate);");
  console.log('='.repeat(72));
}

run().catch(console.error);

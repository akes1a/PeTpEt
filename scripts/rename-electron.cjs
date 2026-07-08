const fs = require('fs');
const dir = 'dist-electron';
if (!fs.existsSync(dir)) { console.log('dist-electron not found, skipping rename'); process.exit(0); }
['main','preload'].forEach((n) => {
  const js = `${dir}/${n}.js`;
  const cjs = `${dir}/${n}.cjs`;
  const map = `${dir}/${n}.js.map`;
  if (!fs.existsSync(js)) return;
  if (fs.existsSync(cjs)) { fs.unlinkSync(cjs); console.log(`deleted stale ${cjs}`); }
  fs.renameSync(js, cjs);
  console.log(`renamed ${js} -> ${cjs}`);
});

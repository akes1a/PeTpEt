/**
 * 把 dist-electron 下 tsc 输出的 CommonJS .js 模块改名为 .cjs,
 * 并把模块内部的相对 require("./x") 改写为 require("./x.cjs")。
 * 原因:package.json 声明了 "type": "module",.js 会被 Node 当作 ESM,
 * 而 Electron 主进程以 CommonJS 加载,必须统一 .cjs 后缀。
 */
const fs = require('fs');
const path = require('path');

const dir = 'dist-electron';
if (!fs.existsSync(dir)) {
  console.log('dist-electron not found, skipping rename');
  process.exit(0);
}

for (const file of fs.readdirSync(dir)) {
  if (!file.endsWith('.js')) continue;

  const jsPath = path.join(dir, file);
  let code = fs.readFileSync(jsPath, 'utf8');

  // 相对路径 require("./x") / require("../x") -> 追加 .cjs(跳过已带后缀的)
  code = code.replace(
    /require\(\s*(['"])(\.\.?\/[^'"]+?)\1\s*\)/g,
    (match, quote, spec) => {
      if (/\.(cjs|json|node)$/.test(spec)) return match;
      return match.replace(spec, `${spec}.cjs`);
    },
  );

  const cjsName = file.replace(/\.js$/, '.cjs');
  const cjsPath = path.join(dir, cjsName);
  if (fs.existsSync(cjsPath)) {
    fs.unlinkSync(cjsPath);
    console.log(`deleted stale ${cjsName}`);
  }
  fs.writeFileSync(cjsPath, code);
  fs.unlinkSync(jsPath);
  console.log(`renamed ${file} -> ${cjsName}`);
}

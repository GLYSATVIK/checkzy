const esbuild = require('esbuild');
const fs = require('fs');

const isWatch = process.argv.includes('--watch');

const buildOptions = {
    entryPoints: [
        'src/background.ts',
        'src/content.ts',
        'src/popup.ts'
    ],
    bundle: true,
    outdir: 'dist',
    platform: 'browser',
    target: ['chrome100'],
    sourcemap: true,
    loader: { '.png': 'file', '.svg': 'text' },
    define: { 'process.env.NODE_ENV': '"production"' }
};

async function build() {
    if (!fs.existsSync('dist')) fs.mkdirSync('dist');

    // Copy static
    fs.copyFileSync('manifest.json', 'dist/manifest.json');
    if (fs.existsSync('src/popup.html')) fs.copyFileSync('src/popup.html', 'dist/popup.html');
    if (fs.existsSync('src/ui.css')) fs.copyFileSync('src/ui.css', 'dist/ui.css');

    // Copy Icons
    if (!fs.existsSync('dist/icons')) fs.mkdirSync('dist/icons');
    // TODO: Copy icons if they exist

    if (isWatch) {
        const ctx = await esbuild.context(buildOptions);
        await ctx.watch();
        console.log('Watching...');
    } else {
        await esbuild.build(buildOptions);
        console.log('Build complete');
    }
}

build().catch(() => process.exit(1));

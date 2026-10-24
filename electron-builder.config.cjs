module.exports = {
  appId: 'org.reisian.studio',
  productName: 'Reisian',
  copyright: 'Copyright © 2026 Reisian contributors',
  asar: true,
  afterPack: './scripts/after-pack.cjs',
  directories: { output: 'release' },
  files: ['dist/**/*', 'electron/**/*', 'package.json'],
  artifactName: 'Reisian-${version}-${os}-${arch}.${ext}',
  linux: {
    icon: 'public/brand/reisian-app.png',
    target: ['dir'],
    category: 'Development',
    executableName: 'reisian',
  },
  win: {
    icon: 'public/brand/reisian-app.ico',
    target: ['portable'],
    executableName: 'Reisian',
    signAndEditExecutable: true,
  },
  portable: { artifactName: 'Reisian-${version}-windows-${arch}.exe' },
};

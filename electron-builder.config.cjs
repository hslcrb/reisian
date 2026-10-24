module.exports = {
  appId: 'org.reisian.studio',
  productName: 'Reisian',
  copyright: 'Copyright © 2026 Reisian contributors',
  asar: true,
  directories: { output: 'release' },
  files: ['dist/**/*', 'electron/**/*', 'package.json'],
  artifactName: 'Reisian-${version}-${os}-${arch}.${ext}',
  linux: { target: ['dir'], category: 'Development', executableName: 'reisian' },
  win: { target: ['portable'], executableName: 'Reisian', signAndEditExecutable: false },
  portable: { artifactName: 'Reisian-${version}-windows-${arch}.exe' },
};

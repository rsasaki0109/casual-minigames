const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const path = require('path');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const inputPath = path.join(__dirname, '..', 'recordings', 'gameplay.webm');
const outputPath = path.join(__dirname, '..', 'docs', 'preview.gif');

console.log('Converting webm to gif...');
console.log('Input:', inputPath);
console.log('Output:', outputPath);

ffmpeg(inputPath)
  .outputOptions([
    '-vf', 'fps=15,scale=400:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
    '-loop', '0'
  ])
  .output(outputPath)
  .on('end', () => {
    console.log('✅ GIF created successfully:', outputPath);
  })
  .on('error', (err) => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  })
  .run();

const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');
const cors = require('cors');
const { exec } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'public')));

app.post('/generate', async (req, res) => {
  const { videoUrl, greeting, greeter } = req.body;

  if (!videoUrl || !greeting || !greeter) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const id = uuidv4();
    const tmpDir = path.join(os.tmpdir(), id);
    await fs.mkdir(tmpDir);

    const inputPath = path.join(tmpDir, 'input.mp4');
    const outputPath = path.join(tmpDir, 'output.mp4');
    const fontPath = path.join(__dirname, 'public/font/HONORSansArabicUI-B.ttf');

    const response = await fetch(videoUrl);
    const buffer = await response.buffer();
    await fs.writeFile(inputPath, buffer);

    // ✅ FIXED: Proper formatting of template literal (no escaped backticks or backslashes)
    const ffmpegCmd = `${ffmpegPath} -i "${inputPath}" -vf "drawtext=fontfile='${fontPath}':text='${greeter}':x=90:y=h-180:fontsize=36:fontcolor=white:shadowcolor=black:shadowx=2:shadowy=2,drawtext=fontfile='${fontPath}':text='${greeting}':x=(w-text_w)/2:y=(h-text_h)/2:fontsize=72:fontcolor=white:shadowcolor=black:shadowx=3:shadowy=3" -codec:a copy "${outputPath}"`;

    await new Promise((resolve, reject) => {
      exec(ffmpegCmd, (error, stdout, stderr) => {
        if (error) {
          console.error('FFmpeg error:', stderr);
          return reject(error);
        }
        resolve(stdout);
      });
    });

    const video = await fs.readFile(outputPath);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', 'attachment; filename=greeting.mp4');
    res.send(video);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Failed to generate video' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

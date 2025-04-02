const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');
const cors = require('cors');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'public')));

const progressStore = {}; // jobId: progress (0.0 to 1.0)

app.get('/progress/:jobId', (req, res) => {
  const jobId = req.params.jobId;
  const progress = progressStore[jobId];
  if (progress === undefined) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json({ progress });
});

app.post('/generate', async (req, res) => {
  const { videoUrl, greeting, greeter } = req.body;

  if (!videoUrl || !greeting || !greeter) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const jobId = uuidv4();
  progressStore[jobId] = 0;

  res.json({ jobId }); // Return jobId immediately

  try {
    const tmpDir = path.join(os.tmpdir(), jobId);
    await fs.mkdir(tmpDir);

    const inputPath = path.join(tmpDir, 'input.mp4');
    const outputPath = path.join(tmpDir, 'output.mp4');
    const progressPath = path.join(tmpDir, 'progress.txt');
    const fontPath = path.join(__dirname, 'public/font/HONORSansArabicUI-B.ttf');

    const response = await fetch(videoUrl);
    const buffer = await response.buffer();
    await fs.writeFile(inputPath, buffer);

    const args = [
      '-i', inputPath,
      '-vf', `drawtext=fontfile='${fontPath}':text='${greeter}':x=90:y=h-180:fontsize=36:fontcolor=white:shadowcolor=black:shadowx=2:shadowy=2,drawtext=fontfile='${fontPath}':text='${greeting}':x=(w-text_w)/2:y=(h-text_h)/2:fontsize=72:fontcolor=white:shadowcolor=black:shadowx=3:shadowy=3`,
      '-codec:a', 'copy',
      '-progress', 'pipe:1',
      '-y',
      outputPath
    ];

    const ffmpeg = spawn(ffmpegPath, args);

    ffmpeg.stdout.on('data', data => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.startsWith('progress=')) {
          if (line.includes('end')) {
            progressStore[jobId] = 1.0;
          }
        }
        if (line.startsWith('out_time_ms=')) {
          const outMs = parseInt(line.split('=')[1]);
          const durationMs = 10000; // estimate 10s video — optionally parse real duration
          const progress = Math.min(outMs / durationMs, 1);
          progressStore[jobId] = progress;
        }
      }
    });

    ffmpeg.stderr.on('data', data => {
      console.error('stderr:', data.toString());
    });

    ffmpeg.on('close', async () => {
      const video = await fs.readFile(outputPath);
      // Optionally store or stream this later from endpoint
    });

  } catch (err) {
    console.error(err);
    progressStore[jobId] = -1;
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

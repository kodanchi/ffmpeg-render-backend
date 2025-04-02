# FFmpeg Greeting API (Render Ready)

## Setup

1. Upload this folder to a GitHub repo
2. Go to https://render.com and create a new Web Service:
   - Use your repo
   - Build Command: npm install
   - Start Command: npm start

## API Endpoint

POST /generate

**Body**:
{
  "videoUrl": "https://yourdomain.com/videos/video1.mp4",
  "greeting": "عيدكم مبارك",
  "greeter": "مع تحيات محمد"
}

Returns: video/mp4 with Arabic overlay.
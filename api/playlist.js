import YouTube from "youtube-sr";

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

export default async function getPlaylist(req, res) {
  try {
    const origin = req.headers.origin;

    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    } else {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }

    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { url } = req.body || {};

    if (!url) {
      return res.status(400).json({ error: "Missing playlist URL" });
    }

    const playlistId = url.match(/[?&]list=([a-zA-Z0-9_-]+)/)?.[1];

    if (!playlistId) {
      return res.status(400).json({ error: "Invalid playlist URL" });
    }

       const videos = await YouTube.search({
      query: playlistId,
      type: "video",
      limit: 50,
    });

    const songs = videos.map(video => ({
      title: video.title,
      id: video.id,
      url: `https://www.youtube.com/watch?v=${video.id}`,
    }));

    return res.status(200).json({ songs });

  } catch (err) {
    console.error("Playlist API error:", err);

    return res.status(500).json({
      error: "Internal server error",
      details: err.message,
    });
  }
}
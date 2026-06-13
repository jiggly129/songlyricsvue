import YouTube from "youtube-sr";

const allowedOrigins = [
  'http://localhost:5173',
  'https://localhost',
];

export default async function getPlaylist(req, res) {
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
  try {

    const { url } = req.body || {};

    if (!url) {
      return res.status(400).json({ error: "Missing playlist URL" });
    }

    function extractPlaylistId(url) {
      const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
      return match ? match[1] : null;
    }

    const playlistId = extractPlaylistId(url);

    if (!playlistId) {
      return res.status(400).json({ error: "Invalid playlist URL" });
    }

    const playlist = await YouTube.getPlaylist(playlistId, { fetchAll: true });

    const videos = await playlist.fetch();

    const songs = videos.map(video => ({
      title: video.title,
      id: video.id,
      url: `https://www.youtube.com/watch?v=${video.id}`
    }));

    return res.status(200).json({ songs });

  } catch (err) {
    console.error("Playlist API error:", err);
    return res.status(500).json({
      error: "Internal server error",
      details: err.message
    });
  }
}

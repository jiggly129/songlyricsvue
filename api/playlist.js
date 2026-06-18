import { Innertube } from "youtubei.js";

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

let yt;

async function getYT() {
  if (!yt) {
    yt = await Innertube.create();
  }
  return yt;
}

export default async function handler(req, res) {
  try {
    const origin = req.headers.origin;

    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    } else {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }

    res.setHeader(
      "Access-Control-Allow-Methods",
      "POST, OPTIONS"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type"
    );

    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }

    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Method not allowed",
      });
    }

    const { url } = req.body;

    const playlistId =
      url.match(/[?&]list=([a-zA-Z0-9_-]+)/)?.[1];

    if (!playlistId) {
      return res.status(400).json({
        error: "Invalid playlist URL",
      });
    }

    const youtube = await getYT();

    const playlist = await youtube.getPlaylist(playlistId);

    const songs = playlist.items.map(video => ({
      title: video.title.text,
      id: video.id,
      url: `https://www.youtube.com/watch?v=${video.id}`,
    }));

    return res.json({
      playlist: {
        title: playlist.info.title,
        author: playlist.info.author?.name ?? null,
      },
      songs,
    });

  } catch (e) {
    console.error(e);

    return res.status(500).json({
      error: e.message,
    });
  }
}
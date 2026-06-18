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
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }

  try {
    const { url } = req.body || {};

    if (!url) {
      return res.status(400).json({ error: "Missing URL" });
    }

    const playlistId = url.match(/[?&]list=([a-zA-Z0-9_-]+)/)?.[1];

    if (!playlistId) {
      return res.status(400).json({ error: "Invalid playlist URL" });
    }

    const response = await fetch(
      `https://www.youtube.com/playlist?list=${playlistId}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0"
        }
      }
    );

    const html = await response.text();

    // Extract JSON from ytInitialData
    const match = html.match(/var ytInitialData = (.*?);\s*<\/script>/);

    if (!match) {
      return res.status(500).json({
        error: "Failed to parse playlist"
      });
    }

    const data = JSON.parse(match[1]);

    const videos =
      data.contents
        ?.twoColumnBrowseResultsRenderer
        ?.tabs?.[0]
        ?.tabRenderer
        ?.content
        ?.sectionListRenderer
        ?.contents?.[0]
        ?.itemSectionRenderer
        ?.contents?.[0]
        ?.playlistVideoListRenderer
        ?.contents || [];

    const songs = videos
      .map(v => v.playlistVideoRenderer)
      .filter(Boolean)
      .map(v => ({
        title: v.title?.runs?.[0]?.text,
        id: v.videoId,
        url: `https://www.youtube.com/watch?v=${v.videoId}`
      }));

    return res.status(200).json({
      songs
    });

  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
}
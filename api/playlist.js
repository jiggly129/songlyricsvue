// import {Innertube} from 'youtubei.js'
// // import SpotifyWebApi from 'spotify-web-api-node';

// // const spotifyApi = new SpotifyWebApi()

// const allowedOrigins = [
//   'http://localhost:5173',
//   'https://localhost',
// ]

// export default async function getPlaylist(req, res) {
//   const origin = req.headers.origin

//   if (allowedOrigins.includes(origin)) {
//     res.setHeader('Access-Control-Allow-Origin', origin)
//   }

//   res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
//   res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

//   if (req.method === 'OPTIONS') {
//     return res.status(200).end()
//   }
  
//   try {
//     console.log(req.body)

//     if (!req.body?.url) {
//       return res.status(400).json({
//         error: 'Missing url',
//         body: req.body
//       })
//     }

//     const timeoutPromise = new Promise((_, reject) => 
//       setTimeout(() => reject(new Error('Playlist fetch timeout')), 15000)
//     )

//     const fetchPlaylist = async () => {
//       const youtube = await Innertube.create();
//       const playlistId = new URL(req.body.url).searchParams.get('list')

//       let response = await youtube.getPlaylist(playlistId)

//       res.json({
//         debug: {
//           playlistId,
//           title: response.title,
//           videoCount: response.video_count,
//           itemCount: response.items.length,
//           hasContinuation: response.has_continuation,
//           keys: Object.keys(response)
  
//         }
//       })

//       const items = [...response.items]

//       while (response.has_continuation) {
//         const next = await response.getContinuation()
//         next.items.forEach((item) => items.push(item))
        
//         response = next
        
//         if (response.has_continuation === false) {
//           break
//         }
//       }
  
//       const data = {songs: []}

//       items.forEach((item) => {
//           data.songs.push({url: item.id, title: item.title.text, author: item.author.name, duration: item.duration.seconds})
//       })

//       return data
//     }

//     const data = await Promise.race([fetchPlaylist(), timeoutPromise])
//     res.json(data)
//     console.log('SENT PlAYLIST')
//   } catch (error) {
//       console.log(error)
//       res.status(400).json({
//         error: 'Failed to fetch playlist. Please check the URL and try again.',
//         details: error.message
//       })
//   }
// }

import {Innertube} from 'youtubei.js'
// import SpotifyWebApi from 'spotify-web-api-node';

// const spotifyApi = new SpotifyWebApi()

import YouTube from "youtube-sr";

const allowedOrigins = [
  'http://localhost:5173',
  'https://localhost',
];

export default async function getPlaylist(req, res) {
  try {
    const origin = req.headers.origin;

    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }

    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

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

    const playlist = await YouTube.getPlaylist(playlistId);
    
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

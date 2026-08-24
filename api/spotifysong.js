import spotifyUrlInfo from 'spotify-url-info'
import fetch from 'isomorphic-unfetch'
import { Innertube } from 'youtubei.js'

const { getData } = spotifyUrlInfo(fetch)

let youtube

async function getYouTube() {
  if (!youtube) {
    youtube = await Innertube.create()
  }

  return youtube
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed'
    })
  }

  try {
    const { url } = req.body || {}

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        error: 'Spotify URL is required'
      })
    }

    const match = url
      .trim()
      .match(
        /^https?:\/\/open\.spotify\.com\/track\/([A-Za-z0-9]+)/i
      )

    if (!match) {
      return res.status(400).json({
        error: 'Invalid Spotify track URL'
      })
    }

    const trackId = match[1]

    const spotifyData = await getData(
      `https://open.spotify.com/track/${trackId}`,
      {
        headers: {
          'user-agent': 'googlebot'
        }
      }
    )

    const title = spotifyData?.title
    const artist = spotifyData?.artists?.[0]?.name

    if (
      typeof title !== 'string' ||
      !title.trim() ||
      typeof artist !== 'string' ||
      !artist.trim()
    ) {
      return res.status(404).json({
        error: 'Could not find Spotify artist/title'
      })
    }

    const yt = await getYouTube()

    const search = await yt.search(
      `${artist} - ${title} official audio`,
      {
        type: 'video'
      }
    )

    const video = search?.videos?.[0]

    if (!video?.id) {
      return res.status(404).json({
        error: 'Could not find YouTube video',
        artist,
        title
      })
    }

    return res.json({
      artist,
      title,
      videoId: video.id,
      url: `https://www.youtube.com/watch?v=${video.id}`
    })
  } catch (error) {
    console.error('Spotify → YouTube error:', error)

    return res.status(500).json({
      error: 'Failed to process Spotify song',
      details: error?.message || String(error)
    })
  }
}
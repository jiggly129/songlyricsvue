import { Innertube } from 'youtubei.js'

let youtube

async function getYouTube() {
  if (!youtube) {
    youtube = await Innertube.create()
  }

  return youtube
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed'
    })
  }

  try {
    const { url } = req.body || {}

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        error: 'YouTube URL is required'
      })
    }

    const videoId = url.match(
      /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
    )?.[1]

    if (!videoId) {
      return res.status(400).json({
        error: 'Invalid YouTube URL'
      })
    }

    const yt = await getYouTube()
    const video = await yt.getInfo(videoId)

    const title =
      video?.basic_info?.title || ''

    const author =
      video?.basic_info?.author ||
      video?.basic_info?.channel_name ||
      ''

    return res.json({
      videoId,
      title,
      artist: author
    })
  } catch (error) {
    console.error('YouTube metadata error:', error)

    return res.status(500).json({
      error: 'Failed to get YouTube metadata'
    })
  }
}
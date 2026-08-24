import { Innertube } from 'youtubei.js'

let youtubePromise = null

async function getYouTube() {
  if (!youtubePromise) {
    youtubePromise = Innertube.create()
  }

  return youtubePromise
}

function getVideoId(input) {
  try {
    const parsed = new URL(input)

    if (parsed.hostname === 'youtu.be') {
      return parsed.pathname.split('/').filter(Boolean)[0] || null
    }

    const hostname = parsed.hostname.replace(/^www\./, '')

    if (
      hostname === 'youtube.com' ||
      hostname === 'm.youtube.com' ||
      hostname === 'music.youtube.com'
    ) {
      if (parsed.pathname === '/watch') {
        return parsed.searchParams.get('v')
      }

      const parts = parsed.pathname
        .split('/')
        .filter(Boolean)

      if (
        ['shorts', 'embed', 'live'].includes(parts[0])
      ) {
        return parts[1] || null
      }
    }

    return null
  } catch {
    return null
  }
}

function cleanText(value) {
  if (!value) return ''

  if (typeof value === 'string') {
    return value.trim()
  }

  if (typeof value.toString === 'function') {
    return value.toString().trim()
  }

  return ''
}

function normalizeArtist(value) {
  return cleanText(value)
    .replace(/\s+/g, ' ')
    .trim()
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader(
    'Access-Control-Allow-Methods',
    'POST, OPTIONS'
  )
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type'
  )

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

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

    const videoId = getVideoId(url)

    if (
      !videoId ||
      !/^[A-Za-z0-9_-]{11}$/.test(videoId)
    ) {
      return res.status(400).json({
        error: 'Invalid YouTube URL'
      })
    }

    const yt = await getYouTube()

    let video

    try {
      video = await yt.getInfo(videoId)
    } catch (error) {
      console.warn(
        'getInfo failed, trying getBasicInfo:',
        error.message
      )

      video = await yt.getBasicInfo(videoId)
    }

    const basicInfo = video?.basic_info || {}

    const musicTracks = Array.isArray(video?.music_tracks)
      ? video.music_tracks
      : []

    const firstMusicTrack =
      musicTracks.find(track =>
        track &&
        (
          cleanText(track.song) ||
          cleanText(track.artist)
        )
      ) || null

    let title =
      cleanText(firstMusicTrack?.song) ||
      cleanText(basicInfo.title) ||
      cleanText(video?.primary_info?.title)

    let artist =
      normalizeArtist(firstMusicTrack?.artist) ||
      normalizeArtist(basicInfo.author) ||
      normalizeArtist(basicInfo.channel_name)

    if (!artist) {
      const owner =
        video?.secondary_info?.owner ||
        video?.secondary_info?.owner?.author

      artist = normalizeArtist(
        owner?.author?.name ||
        owner?.name ||
        owner
      )
    }

    if (!firstMusicTrack && title) {
      const separators = [
        ' - ',
        ' – ',
        ' — '
      ]

      for (const separator of separators) {
        if (!title.includes(separator)) continue

        const parts = title
          .split(separator)
          .map(part => part.trim())
          .filter(Boolean)

        if (parts.length >= 2) {
          const possibleArtist = parts[0]

          const possibleTitle = parts
            .slice(1)
            .join(separator)

          if (!artist) {
            artist = possibleArtist
          }

          title = possibleTitle

          break
        }
      }
    }

    title = title
      .replace(
        /\s*\((official\s*)?(music\s*)?video\)\s*$/i,
        ''
      )
      .replace(
        /\s*\[(official\s*)?(music\s*)?video\]\s*$/i,
        ''
      )
      .replace(
        /\s*\((official\s*)?audio\)\s*$/i,
        ''
      )
      .replace(
        /\s*\[(official\s*)?audio\]\s*$/i,
        ''
      )
      .trim()

    return res.status(200).json({
      videoId,
      title,
      artist,

      source: firstMusicTrack
        ? 'youtube-music-metadata'
        : 'video-metadata',

      duration:
        typeof basicInfo.duration === 'number'
          ? basicInfo.duration
          : null,

      channel:
        cleanText(basicInfo.author) ||
        cleanText(basicInfo.channel_name) ||
        null
    })

  } catch (error) {
    console.error(
      'YouTube metadata error:',
      error
    )

    return res.status(500).json({
      error: 'Failed to get YouTube metadata',
      details: error.message
    })
  }
}
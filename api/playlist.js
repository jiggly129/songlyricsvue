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
        error: 'Missing playlist URL'
      })
    }

    const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/)

    if (!match) {
      return res.status(400).json({
        error: 'Invalid YouTube playlist URL'
      })
    }

    const playlistId = match[1]

    const yt = await getYouTube()
    const playlist = await yt.getPlaylist(playlistId)

    let videos = [...(playlist.videos || [])]
    let page = playlist

    while (page.has_continuation) {
      try {
        page = await page.getContinuation()

        if (!page) {
          break
        }

        const newVideos = page.videos || []

        if (newVideos.length === 0) {
          break
        }

        videos.push(...newVideos)

        if (videos.length > 10000) {
          break
        }
      } catch (error) {
        console.error('Continuation error:', error)
        break
      }
    }

    const songs = videos
      .filter(video => video?.content_id)
      .map(video => {
        const id = video.content_id

        let title = 'Unknown Title'
        let author = 'Unknown Artist'

        try {
          title =
            video?.metadata?.title?.text ||
            'Unknown Title'

          const rows =
            video?.metadata?.metadata?.metadata_rows

          if (rows?.length > 0) {
            const artistText =
              rows[0]
                ?.metadata_parts?.[0]
                ?.text
                ?.text

            if (
              typeof artistText === 'string' &&
              artistText.trim()
            ) {
              author = artistText.trim()
            }
          }
        } catch (error) {
          console.error(
            `Failed to get author for ${id}:`,
            error
          )
        }

        return {
          id,
          title,
          author,
          url: `https://www.youtube.com/watch?v=${id}`,
          duration: null
        }
      })

    const uniqueSongs = Array.from(
      new Map(
        songs.map(song => [song.id, song])
      ).values()
    )

    return res.status(200).json({
      songs: uniqueSongs,
      count: uniqueSongs.length
    })
  } catch (error) {
    console.error('Playlist error:', error)

    return res.status(500).json({
      error: 'Failed to load playlist',
      details: error?.message || String(error)
    })
  }
}
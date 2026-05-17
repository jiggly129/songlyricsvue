import {Innertube} from 'youtubei.js'
// import SpotifyWebApi from 'spotify-web-api-node';

// const spotifyApi = new SpotifyWebApi()

const allowedOrigins = [
  'http://localhost:5173',
  'https://localhost',
]

export default async function getPlaylist(req, res) {
  const origin = req.headers.origin

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  try {
    console.log(req.body)

    if (!req.body?.url) {
      return res.status(400).json({
        error: 'Missing url',
        body: req.body
      })
    }

    const youtube = await Innertube.create();
    let response = await youtube.getPlaylist(req.body.url.split('=')[1])
    
    const items = [...response.items]

    while (response.has_continuation) {
      const next = await response.getContinuation()
      next.items.forEach((item) => items.push(item))
      
      response = next
      
      if (response.has_continuation === false) {
        break
      }
    }
    
    const data = {songs: []}

    items.forEach((item) => {
        data.songs.push({url: item.id, title: item.title.text, author: item.author.name, duration: item.duration.seconds})
    })

    res.json(data)
    console.log('SENT PlAYLIST')
  } catch (error) {
      console.log(error)
      // try {
        // const response = await spotifyApi.getPlaylist(req.body.url.substring(34, req.body.url.indexOf('?')))
        // console.log(response.data.body)
      // } catch (error) {
      //   console.log(error)
      // }
  }  
}
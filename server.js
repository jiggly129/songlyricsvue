import express from 'express'
import getPlaylist from './api/playlist.js'
import getLyrics from './api/getlyrics.js'

const app = express()

app.use(express.json())

app.post('/api/playlist', getPlaylist)
app.post('/api/getlyrics', getLyrics)

app.listen(3000, () => {
  console.log('API running on http://localhost:3000')
})
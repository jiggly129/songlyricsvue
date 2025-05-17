import express from 'express'
import ytpl from '@distube/ytpl'
import cors from 'cors'
import axios from 'axios'
import os from 'os'
import fs from 'fs'
import path from 'path'

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended: true}))

function getLocalIPv4() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        try {
          fs.writeFileSync(path.join(import.meta.dirname, '..', 'public', 'config.json'), JSON.stringify({ipv4: iface.address}))
        } catch (error) {
          console.log(error)
        }
      }
    }
  }
}

getLocalIPv4()

app.post('/playlist', async (req, res, next) => {
    try {
        const response = await ytpl(req.body.url)
        const data = {songs: []}

        response.items.forEach((item) => {
            data.songs.push({url: item.shortUrl, title: item.title, author: item.author.name, duration: (parseInt(item.duration.split(':')[0]) * 60) + parseInt(item.duration.split(':')[1])})
        })

        res.json(data)
        console.log('SENT PlAYLIST')
    } catch (error) {
        console.log(error)
    }
})

app.post('/getlyrics', async (req,res,next) => {
    try {
      const response = await axios.get(`https://lrclib.net/api/get?artist_name=${req.body.artist}&track_name=${req.body.song}&duration=${req.body.duration}`)
      const lyrics = []

      if (response.data.syncedLyrics === null) {
        return res.send(false)
      } 

      response.data.syncedLyrics.split('\n').forEach((line, i) => {
        lyrics.push({
            seconds: (parseInt(line.split(']')[0].substring(1,3)) * 60) + parseInt(line.split(']')[0].substring(4,6)) + (parseInt(line.split(']')[0].substring(7,9)) / 100),
            lyrics: line.substring(11, line.length)
        })
      })

      res.json({
        song: response.data.trackName,
        artist: response.data.artistName,
        lyrics: lyrics
      })
      
      console.log('SENT LYRICS')
    } catch (error) {
      console.log(error)
    }
})

app.listen(3000)
import axios from 'axios'
import https from 'https'
import { Client, MusicClient } from "youtubei";

const youtube = new Client()

export default async function getLyrics(req, res) {
  let lyrics = []

  const parse = (response) => {
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
      lyrics: lyrics,
      fallback: false
    })
  }

  if (req.body.method === 'single' && req.body.artist === '' && req.body.song === '') {
    let artist
    let song

    try {
      const video = await youtube.getVideo(`${req.body.videoUrl}`)

      if (video.title.includes('-')) {
        artist = video.title.split('-')[0].replace(/[\(\[][^\)\]]*[\)\]]|(?:\s*(?:ft\.?|feat\.?|&).*?)$/gi, '')
        song = video.title.split('-')[1].replace(/[\(\[][^\)\]]*[\)\]]|(?:\s*(?:ft\.?|feat\.?|&).*?)$/gi, '')
      } else {
        artist = video.channel.name.replace(/[\(\[][^\)\]]*[\)\]]|(?:\s*(?:ft\.?|feat\.?|&).*?)$/gi, '')

        if (video.channel.name.includes('-')) {
          artist = artist.split('-')[0]
        }
        song = video.title.replace(/[\(\[][^\)\]]*[\)\]]|(?:\s*(?:ft\.?|feat\.?|&).*?)$/gi, '')
      }
      
      parse(await axios.get(`https://lrclib.net/api/get?artist_name=${artist}&track_name=${song}&duration=${video.duration}`))
    } catch (e) {console.log(e)}
  } else {
    try {
      if (req.body.duration === undefined) {
        parse(await axios.get(`https://lrclib.net/api/get?artist_name=${req.body.artist}&track_name=${req.body.song}`))
      } else {
        parse(await axios.get(`https://lrclib.net/api/get?artist_name=${req.body.artist}&track_name=${req.body.song}&duration=${req.body.duration}`))
      }
      
      console.log('SENT LYRICS')
    } catch (error) {
      try {
        parse(await axios.get(`https://lrclib.net/api/get?artist_name=${req.body.artist.substring(0, req.body.artist.indexOf("%", req.body.artist.indexOf("%") + 1))}&track_name=${req.body.song}&duration=${req.body.duration}`))
      } catch (error) {
        const agent = new https.Agent({
          rejectUnauthorized: false,
        });
        
        try {
          const response = await axios.get(`https://api.textyl.co/api/lyrics?q=${req.body.url}`, {insecureHTTPParser: true, httpsAgent: agent})
          const lyrics = response.data
  
          lyrics.forEach((lyric) => lyric.seconds = `${lyric.seconds}.00`)
  
          res.json({lyrics: lyrics, fallback: true})
          console.log('SENT LYRICS FALLBACK')
        } catch (error) {
          console.log('NO LYRICS FOUND', error)
          res.send(false)
        }
      } 
    }
  }
}


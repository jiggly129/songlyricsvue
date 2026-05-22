<script setup>
import {ref} from 'vue'
import axios from 'axios'
import { encode } from 'ascii-url-encoder';
import vueSelect from 'vue-select'
import 'vue-select/dist/vue-select.css';
import playImg from '@/assets/play.png'
import pauseImg from '@/assets/pause.png'
import { useMagicKeys } from '@vueuse/core'
// import https from 'https'
// import { Client, MusicClient } from "youtubei";

// const youtube = new Client()
 
let lyrics
let player
let apiUrl = ''
let artists
let words
let currIndex
let artistName = ''
let songName = ''
let checkInterval
let roundedPlayerFullTime
let timeSliderInterval
let duration
let loop = false
let shuffle = false
let isSwitchingSong = false
const artist = ref('')
const song = ref('')
const currentLyricsVal = ref('')
const currentLyrics = ref(null)
const songUrlInput = ref('')
const songEmbed = ref(null)
const beforeLyrics = ref([])
const afterLyrics = ref([])
const playlistUrl = ref('')
const playlistSongs = ref([])
const selectedInput = ref('Single')
const visibleOptions = ref({single: true, playlist: false})
const playlistVisible = ref(false)
const songData = ref(null)
const coverSrc = ref('')
const currArtist = ref('')
const currSong = ref('')
const songStateImg = ref('songStateImg')
const currentTimeSlider = ref('currentTimeSlider')
const playlistSongsParent = ref('playlistSongsParent')
const currentVolume = ref(50)
const timeBarIndicatorStyles = ref({left: 0, opacity: 0})
const inputsVisibleImg = ref('inputsVisibleImg')
const inputsVisible = ref(true)
const activeIndex = ref(null)
const inputWrapper = ref('inputWrapper')
const currTime = ref(0)
const songTime = ref('songtime')
const loopActive = ref(false)
const shuffleActive = ref(false)
const progressPercent = ref(0)

const {space} = useMagicKeys()

const seekToTime = (e) => {
  if (!player || !player.getDuration) return

  const bar = e.currentTarget
  const rect = bar.getBoundingClientRect()
  const clickX = e.clientX - rect.left

  const percent = clickX / rect.width
  const newTime = player.getDuration() * percent

  player.seekTo(newTime)
}

const cleanArtistSongFromTitle = (title) => {
  if (!title) return { artist: '', song: '' }

  let [artistPart, songPart] = title.split('-')

  if (!songPart) {
    return { artist: '', song: title }
  }

  const badSuffixes = ['topic', 'vevo', 'official', 'lyrics']

  const cleanedArtist = artistPart
    .trim()
    .replace(/\[.*?\]|\(.*?\)/g, '')
    .trim()

  const cleanedSong = songPart
    .trim()
    .replace(/\[.*?\]|\(.*?\)/g, '')
    .trim()

  const isBadArtist = badSuffixes.some(bad =>
    cleanedArtist.toLowerCase().includes(bad)
  )

  return {
    artist: isBadArtist ? '' : cleanedArtist,
    song: cleanedSong
  }
}

const getNextIndex = () => {
  if (!playlistSongs.value.length) return -1
  return (currIndex + 1) % playlistSongs.value.length
}

const getPrevIndex = () => {
  if (!playlistSongs.value.length) return -1
  return (currIndex - 1 + playlistSongs.value.length) % playlistSongs.value.length
}

const getLyrics = async (method) => {
      let lyricsLoc = []

      const parse = (response) => {
        if (response.data.syncedLyrics === null) {
          return false
        } 

        response.data.syncedLyrics.split('\n').forEach((line, i) => {
          lyricsLoc.push({
              seconds: (parseInt(line.split(']')[0].substring(1,3)) * 60) + parseInt(line.split(']')[0].substring(4,6)) + (parseInt(line.split(']')[0].substring(7,9)) / 100),
              lyrics: line.substring(11, line.length)
          })
        })

        return {
          song: response.data.trackName,
          artist: response.data.artistName,
          lyrics: lyricsLoc,
          fallback: false,
          duration: response.data.duration
        }
      }

      if (method === 'single' && encode(artistName) === '' && encode(songName) === '') {
        // YOUTUBE API
      } else {
        try {
          console.log('SENT LYRICS')
          if (duration === undefined) {
            return parse(await axios.get(`https://lrclib.net/api/get?artist_name=${encode(artistName)}&track_name=${encode(songName)}`))
          } else {
            return parse(await axios.get(`https://lrclib.net/api/get?artist_name=${encode(artistName)}&track_name=${encode(songName)}&duration=${duration}`))
          }
        } catch (error) {
          try {
            return parse(await axios.get(`https://lrclib.net/api/get?artist_name=${encode(artistName).substring(0, encode(artistName).indexOf("%", encode(artistName).indexOf("%") + 1))}&track_name=${encode(songName)}&duration=${duration}`))
          } catch (error) {
            // const agent = new https.Agent({
            //   rejectUnauthorized: false,
            // });
            
            try {
              const response = await axios.get(`https://api.textyl.co/api/lyrics?q=${apiUrl}`, {insecureHTTPParser: true})
              const lyricsLoc2 = response.data
      
              lyricsLoc2.forEach((lyric) => lyric.seconds = `${lyric.seconds}.00`)
              
              console.log('SENT LYRICS FALLBACK')
              return {lyrics: lyricsLoc2, fallback: true}
            } catch (error) {
              console.log('NO LYRICS FOUND', error)
              return false
            }
          } 
        }
      }
  }

function loadYouTubeAPI() {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT)
      return
    }

    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)

    window.onYouTubeIframeAPIReady = () => {
      resolve(window.YT)
    }
  })
}

const togglePlaylistVisible = () => {
  playlistVisible.value = !playlistVisible.value

  if (
    playlistVisible.value &&
    playlistSongsParent.value &&
    playlistSongs.value.length
  ) {
    setTimeout(() => {
      const el = playlistSongsParent.value.children[currIndex]
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
  }
}

const toggleInputsVisible = () => {
  if (inputsVisible.value === false) {
    inputsVisible.value = true
    inputWrapper.value.style.height = '90vh'
    return inputsVisibleImg.value.classList.toggle('active')
  }
  inputsVisible.value = false
  inputsVisibleImg.value.classList.remove('active')
  inputWrapper.value.style.height = '0px'
} 

const updateApiUrl = () => {
  apiUrl = ''
  
  try {
    artists = artists.replace(/[\(\[][^\)\]]*[\)\]]|(?:\s*(?:ft\.?|feat\.?|&).*?)$/gi, '').match((/(\b[^\s]+\b)/g))
    words = words.replace(/[\(\[][^\)\]]*[\)\]]/g, '').match((/(\b[^\s]+\b)/g))

    artists.forEach((artist) => apiUrl += ` ${artist}`)
    words.forEach((word) => apiUrl += ` ${word}`)

    apiUrl = encode(apiUrl)
  } catch (e) {console.log(e)}
}

const updateInputs = () => {
  if (selectedInput.value === 'Playlist') {
    visibleOptions.value.single = false
    return visibleOptions.value.playlist = true
  }

  visibleOptions.value.single = true
  visibleOptions.value.playlist = false
} 

const updatePlayer = async (id) => {
  if (player !== undefined) {
    player.destroy()
    player = undefined
  }

  const YT = await loadYouTubeAPI()
    player = new YT.Player(songEmbed.value, {
    height: '360',
    width: '640',
    videoId: id,
    events: {
      onReady: () => {
        player.playVideo()
        player.setVolume(currentVolume.value * 2)
        songStateImg.value.setAttribute('src', pauseImg)
        timeBarIndicatorStyles.value.left = `0%`
      }
    }
  })

  songData.value.style.backgroundImage = `url(https://img.youtube.com/vi/${id}/maxresdefault.jpg)`
  coverSrc.value = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`
}

const setImgAttribute = (type, img) => {
  if (type === 'play') {
    return img.setAttribute('src', playImg)
  }
  img.setAttribute('src', pauseImg)
}

const playPlaylistSong = async (i, el) => {
  if (!playlistSongs.value[i]) return

  activeIndex.value = i
  currIndex = i

  const song = playlistSongs.value[i]

  await updatePlayer(song.url)

  words = song.title
  artists = song.author

  updateApiUrl()
  await updateLyrics()

  if (el) {
    setImgAttribute('pause', el)
  }

  if (playlistSongsParent.value?.children?.[i]) {
    playlistSongsParent.value.children[i].scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    })
  }
}

const playlistAction = (state, i) => {
  clearInterval(checkInterval)
  clearInterval(timeSliderInterval)

  if (!playlistSongs.value.length) return

  if (state === 'next') {
    if (shuffle) {
      const randomIndex = Math.floor(Math.random() * playlistSongs.value.length)

      return playPlaylistSong(randomIndex)
    }

    return playPlaylistSong(getNextIndex())
  }

  if (state === 'previous') {
    return playPlaylistSong(getPrevIndex())
  }

  if (state === 'remove') {
    if (i === undefined) return
    playlistSongs.value.splice(i, 1)

    if (currIndex === i) {
      currIndex = Math.min(i, playlistSongs.value.length - 1)
      if (playlistSongs.value[currIndex]) {
        playPlaylistSong(currIndex)
      }
    }

    return
  }

  if (shuffle) {
    const randomIndex = Math.floor(Math.random() * playlistSongs.value.length)
    return playPlaylistSong(randomIndex)
  }

  if (typeof i === 'number' && playlistSongs.value[i]) {
    return playPlaylistSong(i)
  }
}

const animateTimeSlider = () => {
  currentTimeSlider.value.classList.toggle('fade')
  currentTimeSlider.value.addEventListener('animationend', (e) => currentTimeSlider.value.classList.remove('fade'))
}

const updateSongState = (type, e) => {  
  switch (type) {
    case 'state': {
      if (player.getPlayerState() === 2) {
        player.playVideo()
        setImgAttribute('pause', playlistSongsParent.value.children[currIndex].children[2])
        return songStateImg.value.setAttribute('src', pauseImg)
      }
      player.pauseVideo()
      setImgAttribute('play', playlistSongsParent.value.children[currIndex].children[2])
      songStateImg.value.setAttribute('src', playImg)
      break
    } case 'duration': {
        const percentileDuration = (e.clientX / window.innerWidth)
        player.seekTo(Math.round(player.getDuration()) * percentileDuration)
        animateTimeSlider()

        timeBarIndicatorStyles.value.left = `${(e.clientX / window.innerWidth) * 100}%`
        timeBarIndicatorStyles.value.opacity = 1

        setTimeout(() => timeBarIndicatorStyles.value.opacity = 0 , 1000)
      break
    } case 'loop': {
        loop = !loop
        loopActive.value = loop
        break
    } case 'shuffle': {
      shuffle = !shuffle
      shuffleActive.value = shuffle
      break
    } case 'volume': {
        if (!player || typeof player.setVolume !== 'function') return
          player.unMute()
          player.setVolume(currentVolume.value * 2)
          break
       }
    }
}

const updateArrays = () => {
  artistName = ''
  songName = ''

  try {
    artists.forEach((artist) => artistName += ` ${artist}`)
    words.forEach((word) => songName += ` ${word}`)
  } catch (e) {console.log(e)}
}

const updateLyrics = async (type) => {
  lyrics = undefined
  afterLyrics.value = []
  beforeLyrics.value = []
  
  try {
    updateArrays()
    
    if (type !== 'single') {
      const parsed = cleanArtistSongFromTitle(
      playlistSongs.value[currIndex].title
    )

    artists = parsed.artist
    words = parsed.song
      
      duration = playlistSongs.value[currIndex].duration
    } else {
      duration = undefined
    }

    const response = await getLyrics((artistName === '' || songName === '') ? 'single' : type)

    if (lyrics === undefined) {
      if (response.fallback !== true) {  
        lyrics = response.lyrics
        currArtist.value = response.artist
        currSong.value = response.song
      } else {
        lyrics = response.lyrics
        currSong.value = songName
        currArtist.value = artistName
      }

      if (type === 'single') {
        playlistSongs.value.push({url: songUrlInput.value.split('=')[1], title: currSong.value, author: currArtist.value, duration: response.duration})
        currIndex = playlistSongs.value.length - 1
      }

      if (response === false) {
        console.log('NO LYRICS AVAILABLE')
        lyrics = undefined
        currSong.value = playlistSongs.value[currIndex].title
        currArtist.value = playlistSongs.value[currIndex].author
      }

      if (timeSliderInterval) {
        clearInterval(timeSliderInterval)
        timeSliderInterval = null
      }

      timeSliderInterval = setInterval(() => {
        currentTimeSlider.value.style.left = `${(Math.round(player.getCurrentTime()) / Math.round(player.getDuration())) * 100}%`
        animateTimeSlider()
      }, 3000)
    }
          
    checkInterval = setInterval(() => {
      try {
        currTime.value = Math.round(player.getCurrentTime())
        roundedPlayerFullTime = Math.round(player.getDuration())

        songTime.value = `${currTime.value} / ${roundedPlayerFullTime}`
        progressPercent.value = (player.getCurrentTime() / player.getDuration()) * 100
        
      } catch (e) {
        songTime.value = `Loading`
      }

      if (lyrics === undefined) {
        currentLyricsVal.value = 'No Lyrics Found'
      } else {
        if (currTime.value < Math.round(lyrics[0].seconds) && afterLyrics.value.length === 0) {
          currentLyricsVal.value = ''
          for (let i4 = 0; i4 < lyrics.length; i4++) { afterLyrics.value.push(lyrics[i4])}
        }

        let previousCurrentLyrics

        lyrics.forEach((lyric, i) => {
          if (player.getPlayerState() !== 2) {
              if (parseInt(lyric.seconds).toFixed(1) === player.getCurrentTime().toFixed(1) && previousCurrentLyrics !== lyric.seconds) {
                previousCurrentLyrics = lyric.seconds
                currentLyricsVal.value = lyric.lyrics
                afterLyrics.value = []
                beforeLyrics.value = []
                  
                if (i !== 0) {
                  for (let i2 = 0; i2 < i; i2++) { beforeLyrics.value.push(lyrics[i2]);}
                }
                for (let i3 = i + 1; i3 < lyrics.length; i3++) { afterLyrics.value.push(lyrics[i3]) }
                  
                currentLyrics.value.scrollIntoView({behavior: 'smooth', block: 'center'})
            }
          } 
        })
      }

      if (currTime.value >= roundedPlayerFullTime - 1 && !isSwitchingSong) {
        isSwitchingSong = true

        if (loop === true) {
          player.seekTo(0)
          isSwitchingSong = false
          return
        }

        if (playlistSongs.value.length) {
          if (shuffle) {
            const randomIndex = Math.floor(
              Math.random() * playlistSongs.value.length
            )

            playPlaylistSong(randomIndex)
          } else {
            playPlaylistSong(getNextIndex())
          }
        }

        setTimeout(() => {
          isSwitchingSong = false
        }, 1000)
      }
    },100)
  } catch (e) {console.log(e)}
}

const handleInput = async (type, queue) => {
  artists = []
  words = []

  if (type ===  'playlist') {
    try {
      const response = await axios.post(`https://syncedlyrics.vercel.app/api/playlist`, {
          url: `${playlistUrl.value}`
      })
      
      const newSongs = response.data.songs || []

      newSongs.forEach(song => {
        const exists = playlistSongs.value.some(
          s => s.url === song.url
        )

        if (!exists) {
          playlistSongs.value.push(song)
        }
      })

    togglePlaylistVisible()
    toggleInputsVisible()
    } catch (e) {console.log(e)}
  } else {
    words = song.value
    artists = artist.value

    updateApiUrl()

    toggleInputsVisible()

    if (queue === true) {
      const videoId = songUrlInput.value.split('=')[1]

      playlistSongs.value.push({
        url: videoId,
        title: song.value,
        author: artist.value
      })

      return
  } else {
      clearInterval(timeSliderInterval)
      clearInterval(checkInterval)
      await updatePlayer(songUrlInput.value.split('=')[1])
      await updateLyrics('single')
    }
  }
}

</script>

<template>
  <main>
    <h1>Song Lyrics (BETA VERSION, MADE BY: SHLEV)</h1>

    <div id="inputwrapper" ref="inputWrapper">
      <img src="../assets/play.png" id="inputsVisibleImg" @click="toggleInputsVisible" ref="inputsVisibleImg" class="visibleimages active">
      <div id="startui" v-show="inputsVisible">

        <div id="inputselector">
          <vueSelect :options="['Single', 'Playlist']" v-model="selectedInput" :on-change="updateInputs()"></vueSelect>
        </div>

        <div id="inputs">
          <form v-show="visibleOptions.single" id="singleinputdiv" class="inputdiv">
            <div class="inputs">
              <input type="text" placeholder="Enter artist name (Optional)" v-model="artist">
              <input type="text" placeholder="Enter song name (Optional)" v-model="song">
              <input type="text" placeholder="Enter song url" v-model="songUrlInput">
            </div>

            <div id="buttonsdiv">
              <button type="submit" class="submit" @click.prevent="handleInput('single')">Play</button>
              <button type="submit" class="submit" @click.prevent="handleInput('single', true)">Add to Queue</button>
            </div>
          </form>

          <form @submit.prevent="handleInput('playlist')" v-show="visibleOptions.playlist" id="playlistinputdiv" class="inputdiv">
            <div class="inputs">
              <input type="text" placeholder="Enter youtube playlist url" v-model="playlistUrl">
            </div>
            <button type="submit" class="submit">Submit</button>
          </form>
        </div>
        </div>
      </div>

      <div class="playlist-toggle" @click="togglePlaylistVisible">☰</div>

      <div v-if="playlistVisible" class="playlist-backdrop" @click="togglePlaylistVisible"></div>

      <div class="playlist-panel" :class="{ open: playlistVisible }">

        <div class="playlist-header"><p>Playlist</p></div>

        <div class="playlist-body" ref="playlistSongsParent">

          <div v-for="(song, i) in playlistSongs" :key="song.url" class="playlist-item" :class="{ active: i === activeIndex }">

            <div class="playlist-text">
              <p class="playlist-title">{{ song.title }}</p>
              <p class="playlist-author">{{ song.author }}</p>
            </div>

            <div class="playlist-buttons">

              <img src="../assets/play.png" class="playlist-icon" @click="playPlaylistSong(i, $event.currentTarget)" id="playplaylistsong"/>

              <img src="../assets/remove.png" class="playlist-icon" @click="playlistAction('remove', i)" />

            </div>

          </div>

        </div>

      </div>

    <div id="songdata" ref="songData">
      <div id="content">
        <div id="songEmbed" ref="songEmbed" v-show="false"></div>
      
        <div id="lyrics">
          <div id="previouslyrics" class="lyricsdiv">
            <p class="lyric" v-for="(lyric, i) in beforeLyrics" :key="i">{{ lyric.lyrics }}</p>
          </div>
          <p id="currentlyrics" ref="currentLyrics" class="lyric">{{ currentLyricsVal }}</p>
          <div id="afterlyrics" class="lyricsdiv">
            <p class="lyric" v-for="lyric in afterLyrics">{{ lyric.lyrics }}</p>
          </div>
        </div>
      </div>
    </div>

    <div id="newcurrentlyplayingdiv">
        <div id="newtimebardiv" @mouseenter="newTimeBarClass = 'active'"
        @mouseleave="newTimeBarClass = ''">

          <div id="newtimebar" @click="seekToTime($event)">
            <div id="newtimefill" :style="{ width: progressPercent + '%' }"></div>
          </div>
        </div>

  <div id="newcurrentlyplayingmain">
      <div id="newleftsection">
        <img id="newcover" :src="coverSrc">

        <div id="newdetails">
          <p id="newsongname">{{ currSong }}</p>
          <p id="newsongartist">{{ currArtist }}</p>
        </div>
      </div>

      <div id="newcentersection">

        <img
          src="../assets/previous.png"
          @click="playlistAction('previous')"
          class="newcontrolimage"
        >

        <img
          ref="songStateImg"
          @click="updateSongState('state')"
          id="newsongStateImg"
          :src="playImg"
        />

        <img
          src="../assets/next.png"
          @click="playlistAction('next')"
          class="newcontrolimage"
        >

        <p id="newsongtime">
          {{ songTime }}
        </p>

      </div>

      <div id="newrightsection">

        <img
          src="../assets/loop.png"
          @click="updateSongState('loop')"
          class="newcontrolimage"
          :class="{ inactive: !loopActive }"
        />

        <img
          src="../assets/shuffle.png"
          @click="updateSongState('shuffle')"
          class="newcontrolimage"
          :class="{ inactive: !shuffleActive }"
        />

        <div id="newvolumediv">
          <img
            src="../assets/volume.png"
            class="newcontrolimage"
          >

          <input
            type="range"
            id="newvolumeslider"
            min="0"
            max="100"
            step="1"
            v-model.number="currentVolume"
            @input="updateSongState('volume')"
          />
        </div>

      </div>

    </div>
  </div>
  </main>
</template>

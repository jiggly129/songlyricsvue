<script setup>
import {ref} from 'vue'
import axios from 'axios'
import { encode } from 'ascii-url-encoder';
import vueSelect from 'vue-select'
import 'vue-select/dist/vue-select.css';
import playImg from '@/assets/play.png'
import pauseImg from '@/assets/pause.png'
import { useMagicKeys } from '@vueuse/core'
import { watch } from 'vue';
import config from '../../public/config.json'
 
let lyrics
let player
let apiUrl = ''
let artists
let words
let currIndex
let artistName = ''
let songName = ''
let checkInterval
let roundedPlayerTime
let rounedPlayerFullTime
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
const playlistVisible = ref(true)
const songData = ref(null)
const coverSrc = ref('')
const currArtist = ref('')
const currSong = ref('')
const songStateImg = ref('songStateImg')
const songTimeSlider = ref('songTimeSlider')
const songTimeSliderClass = ref('')
const songTime = ref('')

const {space} = useMagicKeys()

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

const updateApiUrl = () => {
  apiUrl = ''

  artists.forEach((artist) => apiUrl += ` ${artist}`)
  words.forEach((word) => apiUrl += ` ${word}`)

  apiUrl = encode(apiUrl)
}

watch(space, (v) => {
  if (v) { updateSongState('state') }
})

const updatePlaylist = () => {
  if (playlistVisible.value === true) {
    return playlistVisible.value = false
  }
  playlistVisible.value = true
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
        songStateImg.value.setAttribute('src', pauseImg)
      }
    }
  })

  songData.value.style.backgroundImage = `url(https://img.youtube.com/vi/${id}/maxresdefault.jpg)`
  coverSrc.value = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`
}

const playPlaylistSong = async (i) => {
  artists = []
  words = []

  currIndex = i

  await updatePlayer(await playlistSongs.value[i].url.split('=')[1])

  words = playlistSongs.value[i].title.match((/(\b[^\s]+\b)/g))
  artists = playlistSongs.value[i].author.match((/(\b[^\s]+\b)/g))
  
  updateApiUrl()
  
  playlistVisible.value = false
  await updateLyrics()
}

const playlistAction = (i) => {
  clearInterval(checkInterval)
  playPlaylistSong(i)
}

const updateSongState = (type, e) => {  
  switch (type) {
    case 'state': {
      if (player.getPlayerState() === 2) {
        player.playVideo()
        return songStateImg.value.setAttribute('src', pauseImg)
      }
      player.pauseVideo()
      songStateImg.value.setAttribute('src', playImg)
      break
    } case 'previous': {
      playlistAction(currIndex - 1)
      break
    } case 'next': {
      playlistAction(currIndex + 1)
      break
    } case 'duration': {
      const percentileDuration = (e.clientX / window.innerWidth)
      player.seekTo(Math.round(player.getDuration()) * percentileDuration)
      songTimeSlider.value.style.left = `${percentileDuration * 100}%`
      songTimeSliderClass.value = 'fade'

      songTimeSlider.value.addEventListener('animationend', (e) => songTimeSliderClass.value = '')
    }
  } 
}

const updateArrays = () => {
  artistName = ''
  songName = ''

  artists.forEach((artist) => artistName += ` ${artist}`)
  words.forEach((word) => songName += ` ${word}`)
}

const updateLyrics = async () => {
  lyrics = undefined
  afterLyrics.value = []
  beforeLyrics.value = []
  
  try {
    updateArrays()
    
    if (playlistSongs.value[currIndex].title.includes('-') === true) {
      artists = playlistSongs.value[currIndex].title.split('-')[0].replace(/[\(\[][^\)\]]*[\)\]]/g, '').replace(/(.*?) ft.*/i, "$1").replace(/(.*?) feat.*/i, "$1").match((/(\b[^\s]+\b)/g))
      words = playlistSongs.value[currIndex].title.split('-')[1].replace(/[\(\[][^\)\]]*[\)\]]/g, '').match((/(\b[^\s]+\b)/g))
      updateArrays()
      updateApiUrl()
    }   
    
    const response = await axios.post(`http://${config.ipv4}:3000/getlyrics`, {
        artist: encode(artistName),
        song: encode(songName),
        duration: playlistSongs.value[currIndex].duration
    })

    lyrics = response.data.lyrics
    currArtist.value = response.data.artist
    currSong.value = response.data.song

    if (response.data === false) {
      try {
        const response2 = await axios.get(`/api/api/lyrics?q=${apiUrl}`)
        lyrics = response2.data
        lyrics.forEach((lyric) => lyric.seconds = `${lyric.seconds}.00`)

        currSong.value = songName
        currArtist.value = artistName
      } catch (error) {
        console.log(error, 'NO LYRICS AVAILABLE')
        lyrics = undefined
        currSong.value = playlistSongs.value[currIndex].title
        currArtist.value = playlistSongs.value[currIndex].author
      }
    }
          
    checkInterval = setInterval(() => {
      roundedPlayerTime = Math.round(player.getCurrentTime())
      rounedPlayerFullTime = Math.round(player.getDuration())

      songTime.value = `${roundedPlayerTime} / ${rounedPlayerFullTime}`

      if (lyrics === undefined) {
        currentLyricsVal.value = 'No Lyrics Found'
      }

      if (Math.round(player.getCurrentTime()) < Math.round(lyrics[0].seconds)) {
        currentLyricsVal.value = ''
        for (let i4 = 0; i4 < lyrics.length; i4++) { afterLyrics.value.push(lyrics[i4])}
      }

      lyrics.forEach((lyric, i) => {
        if (player.getPlayerState() !== 2) {
            if (lyric.seconds.toFixed(1) === player.getCurrentTime().toFixed(1)) {
              currentLyricsVal.value = lyric.lyrics
              afterLyrics.value = []
              beforeLyrics.value = []
                
              if (i !== 0) {
                for (let i2 = 0; i2 < i; i2++) { beforeLyrics.value.push(lyrics[i2]);}
              }
              for (let i3 = i + 1; i3 < lyrics.length; i3++) { afterLyrics.value.push(lyrics[i3]) }
                
              if (player.getPlayerState() !== 2) {
                currentLyrics.value.scrollIntoView({behavior: 'smooth', block: 'center'})
              }
          }
        } 
      })

      if (roundedPlayerTime ===  rounedPlayerFullTime || roundedPlayerTime === rounedPlayerFullTime - 1) {
        playlistAction(Math.floor(Math.random() * playlistSongs.value.length))
      }
    },50)
  } catch (error) {
    console.log(error)
  }
}

const handleInput = async (type) => {
  artists = []
  words = []

  if (type ===  'playlist') {
    try {
      const response = await axios.post(`http://${config.ipv4}:3000/playlist`, {
          url: `${playlistUrl.value}`
      })
      
      playlistSongs.value = response.data.songs
    } catch (error) {
      console.log(error)
    }
  } else {
    words = song.value.match((/(\b[^\s]+\b)/g))
    artists = artist.value.match((/(\b[^\s]+\b)/g))

    updateApiUrl()

    await updatePlayer(songUrlInput.value.split('=')[1])
    await updateLyrics()
  }
}

</script>

<template>
  <main>
    <h1>Song Lyrics</h1>
    <div id="inputselector">
      <vueSelect :options="['Single', 'Playlist']" v-model="selectedInput" :on-change="updateInputs()"></vueSelect>
    </div>
    <div id="inputs">
      <form @submit.prevent="handleInput('single')" v-show="visibleOptions.single">
        <input type="text" placeholder="Enter artist name" v-model="artist">
        <input type="text" placeholder="Enter song name" v-model="song">
        <input type="text" placeholder="Enter song url" v-model="songUrlInput">
        <button type="submit">Submit</button>
      </form>

      <form @submit.prevent="handleInput('playlist')" v-show="visibleOptions.playlist">
        <input type="text" placeholder="Enter youtube playlist url" v-model="playlistUrl">
        <button type="submit">Submit</button>
      </form>
    </div>
    
    <div id="playlistvisiblediv">
      <button id="playlistvisible" @click="updatePlaylist">
        <p v-if="playlistVisible === true">Hide Playlist</p>
        <p v-else>Show Playlist</p>
      </button>
    </div>

    <div id="playlist" v-show="playlistVisible">
      <div v-for="(song, i) in playlistSongs" id="playlistsongdiv">
        <p id="title" class="songdata">{{ song.title }}</p>
        <p id="author" class="songdata">{{ song.author }}</p>
        <button @click="playPlaylistSong(i)">Play</button>
      </div>
    </div>

    <div id="songdata" ref="songData">
      <div id="content">
        <div id="songEmbed" ref="songEmbed" v-show="false"></div>
      
        <div id="lyrics">
          <div id="previouslyrics" class="lyricsdiv">
            <p class="lyric" v-for="lyric in beforeLyrics">{{ lyric.lyrics }}</p>
          </div>
          <p id="currentlyrics" ref="currentLyrics" class="lyric">{{ currentLyricsVal }}</p>
          <div id="afterlyrics" class="lyricsdiv">
            <p class="lyric" v-for="lyric in afterLyrics">{{ lyric.lyrics }}</p>
          </div>
        </div>
      </div>
    </div>

    <div id="currentlyplayingdiv" @click="updateSongState('duration', $event)">
      <div id="songtimeslider" ref="songTimeSlider" :class="songTimeSliderClass"></div>
      <div id="playoptions">
        <img src="../assets/previous.png" id="previoussongimg" @click="updateSongState('previous')">
        <img ref="songStateImg" @click="updateSongState('state')" id="songStateImg" :src="playImg">
        <img src="../assets//next.png" id="nextsongimg" @click="updateSongState('next')">
        <p id="songtime">{{ songTime }}</p>
      </div>

      <div id="songinfo">
        <img id="cover" :src="coverSrc">
        <div id="details">
          <p id="songname">{{ currSong }}</p>
          <p id="songartist">{{ currArtist }}</p>
        </div>
      </div>
    </div>
  </main>
</template>

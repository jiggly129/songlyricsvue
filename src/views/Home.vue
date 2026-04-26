<script setup>
import {ref} from 'vue'
import axios from 'axios'
import { encode } from 'ascii-url-encoder';
import vueSelect from 'vue-select'
import 'vue-select/dist/vue-select.css';
import playImg from '@/assets/play.png'
import pauseImg from '@/assets/pause.png'
import { useMagicKeys } from '@vueuse/core'
 
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
let timeSliderInterval
let duration
let loop = false
let clickableHover = false
let shuffle = false
let playedSongs = []
let currAbsoluteIndex = 0
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
const songTime = ref('')
const playlistVisibleImg = ref('playlistVisibleImg')
const loopImg = ref('loopImg')
const shuffleImg = ref('shuffleImg')
const playlistSongsParent = ref('playlistSongsParent')
const currentVolume = ref(50)
const volumeSliderOpacity = ref(0)
const timeBarIndicatorStyles = ref({left: 0, opacity: 0})
const timeBarClass = ref('')
const inputsVisibleImg = ref('inputsVisibleImg')
const inputsVisible = ref(true)
const activeIndex = ref(null)

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

const togglePlaylistVisible = () => {
  if (playlistVisible.value === false && playlistSongs.value.length !== 0) {
    playlistVisible.value = true
    playlistVisibleImg.value.classList.toggle('active')
    return setTimeout(() => {
      playlistSongsParent.value.children[currIndex].scrollIntoView({behavior: 'instant', block: 'center'})
    }, 50)
  }
  playlistVisible.value = false
  playlistVisibleImg.value.classList.remove('active')
}

const toggleInputsVisible = () => {
  if (inputsVisible.value === false) {
    inputsVisible.value = true
    return inputsVisibleImg.value.classList.toggle('active')
  }
  inputsVisible.value = false
  inputsVisibleImg.value.classList.remove('active')
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
  activeIndex.value = i

  if (i === currIndex) {
    if (player.getPlayerState() === 2) {
      player.playVideo()
      setImgAttribute('pause', songStateImg.value)
      return setImgAttribute('pause', el)
    }
    player.pauseVideo()
    setImgAttribute('play', songStateImg.value)
    return setImgAttribute('play', el)
  } 

  if (playedSongs.length !== 0) {
    let found = false
    playedSongs.forEach((songIndex, index) => {
      if (songIndex === i) {
        found = true
      } else if (index === playedSongs.length - 1 && found === false) {
        playedSongs.push(i)
        setImgAttribute('play', playlistSongsParent.value.children[playedSongs[playedSongs.length - 2]].children[2])
      }
    })
  } else {
    playedSongs.push(i)
  }

  artists = []
  words = []

  currIndex = i

  await updatePlayer(await playlistSongs.value[i].url)

  words = playlistSongs.value[i].title
  artists = playlistSongs.value[i].author
  
  updateApiUrl()
  
  await updateLyrics()
  
  setImgAttribute('pause', playlistSongsParent.value.children[i].children[2])
  playlistSongsParent.value.children[i].scrollIntoView({behavior: 'smooth', block: 'center'})
}

const playlistAction = (state, i) => {
  clearInterval(checkInterval)
  clearInterval(timeSliderInterval)

  if (state === 'previous' && playedSongs.length > 1) {
    currAbsoluteIndex -= 1
    return playPlaylistSong(playedSongs[(playedSongs.length - 1) + currAbsoluteIndex])
  } else if (state === 'next' && currAbsoluteIndex < 0) {
    currAbsoluteIndex += 1
    return playPlaylistSong(playedSongs[(playedSongs.length - 1) + currAbsoluteIndex])
  } else if (state === 'remove') {
    if (currIndex !== i) {return playlistSongs.value.splice(i, 1)}
  }
  
  if (shuffle === true) {
    return playPlaylistSong(Math.floor(Math.random() * playlistSongs.value.length))
  }

  if (playlistSongs.value[i] !== undefined && state !== 'remove') { playPlaylistSong(i) }
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
      if (loop === false) {
        loop = true
        return loopImg.value.classList.toggle('active')
      }
      loop = false
      loopImg.value.classList.remove('active')
      break
    } case 'shuffle': {
      if (shuffle === false) {
        shuffle = true
        return shuffleImg.value.classList.toggle('active')
      }
      shuffle = false
      shuffleImg.value.classList.remove('active')
      break
    } case 'volume': {
      if (volumeSliderOpacity.value !== 0) {
        player.setVolume(currentVolume.value * 2)
      }
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
      if (playlistSongs.value[currIndex].title.includes('-') === true) {
        artists = playlistSongs.value[currIndex].title.split('-')[0]
        words = playlistSongs.value[currIndex].title.split('-')[1]
        updateApiUrl()
        updateArrays()
      }
      
      duration = playlistSongs.value[currIndex].duration
    } else {
      duration = undefined
    }
    
    const response = await axios.post(`/api/getlyrics`, {
        artist: encode(artistName),
        song: encode(songName),
        duration: duration,
        url: apiUrl,
        method: (artistName === '' || songName === '') ? 'single' : type,
        videoUrl: songUrlInput.value.split('=')[1]
    })

    if (lyrics === undefined) {
      if (response.data.fallback !== true) {  
        lyrics = response.data.lyrics
        currArtist.value = response.data.artist
        currSong.value = response.data.song
      } else {
        lyrics = response.data.lyrics
        currSong.value = songName
        currArtist.value = artistName
      }

      if (type === 'single') {
        playlistSongs.value.push({url: songUrlInput.value.split('=')[1], title: currSong.value, author: currArtist.value, duration: response.data.duration})
        currIndex = playlistSongs.value.length - 1
      }

      if (response.data === false) {
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
        roundedPlayerTime = Math.round(player.getCurrentTime())
        rounedPlayerFullTime = Math.round(player.getDuration())
        songTime.value = `${roundedPlayerTime} / ${rounedPlayerFullTime}`
      } catch (e) {
        songTime.value = `Loading`
      }

      if (lyrics === undefined) {
        currentLyricsVal.value = 'No Lyrics Found'
      } else {
        if (Math.round(player.getCurrentTime()) < Math.round(lyrics[0].seconds) && afterLyrics.value.length === 0) {
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

      if (roundedPlayerTime >= rounedPlayerFullTime - 1 && !isSwitchingSong) {
        isSwitchingSong = true

        if (loop === true) {
          player.seekTo(0)
          isSwitchingSong = false
          return
        }

        if (playlistSongs.value.length !== 0) {
          if (shuffle === true) {
            playlistAction('', Math.floor(Math.random() * playlistSongs.value.length))
          } else {
            playlistAction('', currIndex + 1)
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
      const response = await axios.post(`/api/playlist`, {
          url: `${playlistUrl.value}`
      })
      
      playlistSongs.value = response.data.songs
      playedSongs = []
      currAbsoluteIndex = 0
      togglePlaylistVisible()
      toggleInputsVisible()
    } catch (e) {console.log(e)}
  } else {
    words = song.value
    artists = artist.value

    updateApiUrl()

    toggleInputsVisible()

    if (queue === true) {
      try {
        const response = await axios.post(`/api/getlyrics`, {
          artist: encode(artist.value),
          song: encode(song.value),
          duration: undefined,
          url: apiUrl,
          method: type,
          videoUrl: songUrlInput.value.split('=')[1]
        })

        playlistSongs.value.push({url: songUrlInput.value.split('=')[1], title: response.data.song, author: response.data.artist})
      } catch (e) {
        console.log(e)
      }
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

    <div id="playlistparent">
      <img src="../assets/play.png" id="playlistVisibleImg" @click="togglePlaylistVisible" ref="playlistVisibleImg" class="visibleimages">
      <div id="playlist" v-show="playlistVisible">
        <div id="playlistsongsparent" ref="playlistSongsParent">
          <div v-for="(song, i) in playlistSongs" :key="song.url" :class="{ active: i === activeIndex }" id="playlistsongdiv">
            <p id="title">{{ song.title }}</p>
            <p id="author">{{ song.author }}</p>
            <img src="../assets/play.png" id="playplaylistsong" @click="playPlaylistSong(i, $event.currentTarget)">
            <img src="../assets/remove.png" @click="playlistAction('remove', i)">
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

    <div id="currentlyplayingdiv">
      <div id="timebardiv" @mouseenter="timeBarClass = 'active'" @mouseleave="timeBarClass = ''">
        <div id="timebar" @click="updateSongState('duration', $event)" :class="timeBarClass"></div>
        <div id="timeBarIndicator" ref="timeBarIndicator" :style="{left: timeBarIndicatorStyles.left, opacity: timeBarIndicatorStyles.opacity}"></div>
      </div>
      <div id="currentlyplayingmain">
        <div id="currenttimeslider" ref="currentTimeSlider"></div>
        <div id="playdata">
          <div id="playoptions" @mouseenter="clickableHover = true" @mouseleave="clickableHover = false">
            <img src="../assets/previous.png" @click="playlistAction('previous')" class="controlimage">
            <img ref="songStateImg" @click="updateSongState('state')" id="songStateImg" :src="playImg">
            <img src="../assets/next.png" @click= "playlistAction('next', currIndex + 1)" id="nextbtnimage">
          </div>
          <p id="songtime">{{ songTime }}</p>
        </div>

        <div id="songinfo">
          <img id="cover" :src="coverSrc">
          <div id="details">
            <p id="songname">{{ currSong }}</p>
            <p id="songartist">{{ currArtist }}</p>
        </div>

        <div id="extraplayoptions" @mouseenter="clickableHover = true" @mouseleave="clickableHover = false">
          <img id="loopImg" src="../assets/loop.png" @click="updateSongState('loop')" ref="loopImg" class="controlimage">
          <img id="shuffleImg" src="../assets/shuffle.png" @click="updateSongState('shuffle')" ref="shuffleImg" class="controlimage">
          <div id="volumediv"  @mouseleave="volumeSliderOpacity = 0">
            <img id="volumeImg" src="../assets/volume.png" ref="volumeImg" @mouseenter="volumeSliderOpacity = 1" class="controlimage"> 
            <input type="range" id="volumeslider" min="0" max="50" v-model="currentVolume" @input="updateSongState('volume')" :style="{opacity: volumeSliderOpacity}">
          </div>
        </div>
      </div>
    </div>
    </div>
  </main>
</template>

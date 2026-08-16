<script setup>
import {ref, computed} from 'vue'
import axios from 'axios'
import { encode } from 'ascii-url-encoder';
import playImg from '@/assets/play.png'
import pauseImg from '@/assets/pause.png'
import volumeImg from '@/assets/volume.png'
import mutedImg from '@/assets/muted.png'
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
let roundedPlayerFullTime
let timeSliderInterval
let duration
let loop = false
let shuffle = false
let isSwitchingSong = false
let lyricsAbortController = null
let lyricsSynced = false
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
const isMuted = ref(false)
const inputsVisible = ref(true)
const activeIndex = ref(null)
const inputWrapper = ref('inputWrapper')
const currTime = ref(0)
const songTime = ref('songtime')
const loopActive = ref(false)
const shuffleActive = ref(false)
const progressPercent = ref(0)
const lyricsColor = ref('#ffffff')
const currentRequestId = ref(0)
const playlistStatus = ref('')
const isFetchingLyrics = ref(false)
const playlistSearch = ref('')

const {space} = useMagicKeys()

const isSpotifyPlaylist = (url) => {
  if (!url) return false

  return /^https?:\/\/open\.spotify\.com\/playlist\/[A-Za-z0-9]+/i.test(
    url.trim()
  )
}

const filteredPlaylistSongs = computed(() => {
  const query = playlistSearch.value.trim().toLowerCase()

  if (!query) {
    return playlistSongs.value.map((song, index) => ({
      song,
      originalIndex: index
    }))
  }

  return playlistSongs.value
    .map((song, index) => ({
      song,
      originalIndex: index
    }))
    .filter(({ song }) => {
      const title = (song.title || '').toLowerCase()
      const author = (song.author || '').toLowerCase()

      return title.includes(query) || author.includes(query)
    })
})

const extractImageColor = (imageUrl) => {
  const img = new Image()

  img.crossOrigin = 'Anonymous'

  img.onload = () => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    canvas.width = img.width
    canvas.height = img.height

    ctx.drawImage(img, 0, 0)

    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data

    let r = 0
    let g = 0
    let b = 0
    let count = 0

    for (let i = 0; i < data.length; i += 40) {
      r += data[i]
      g += data[i + 1]
      b += data[i + 2]
      count++
    }

    r = Math.min(Math.floor(r / count) + 30, 255)
    g = Math.min(Math.floor(g / count) + 30, 255)
    b = Math.min(Math.floor(b / count) + 30, 255)

    document.documentElement.style.setProperty(
      '--accent-color',
      `rgb(${r}, ${g}, ${b})`
    )
  }

  img.src = imageUrl
}

const seekToTime = (e) => {
  if (!player || !player.getDuration) return

  const bar = e.currentTarget
  const rect = bar.getBoundingClientRect()
  const clickX = e.clientX - rect.left

  const percent = clickX / rect.width
  const newTime = player.getDuration() * percent

  player.seekTo(newTime)
}

const sanitizeArtistName = (rawArtist) => {
  if (!rawArtist || typeof rawArtist !== 'string') return ''

  const badWords = [
    'topic',
    'vevo',
    'official',
    'lyrics',
    'audio',
    'video',
    'music',
    'remix',
    'cover',
    'feat',
    'ft',
    'produced',
    'presented',
    'presents'
  ]

  const cleanFragment = (fragment) =>
    fragment
      .trim()
      .replace(/\[.*?\]|\(.*?\)/g, '')
      .trim()

  const isBadFragment = (fragment) =>
    badWords.some((bad) => new RegExp(`\\b${bad}\\b`, 'i').test(fragment))

  const fragments = rawArtist
    .split(/\s*[-–—]\s*/)
    .map(cleanFragment)
    .filter(Boolean)

  if (fragments.length === 0) return ''
  if (fragments.length === 1) return fragments[0]

  const filtered = fragments.filter((fragment) => !isBadFragment(fragment))
  if (filtered.length === 1) return filtered[0]

  if (isBadFragment(fragments[0])) return fragments[1]
  if (isBadFragment(fragments[1])) return fragments[0]

  return fragments[0]
}

const cleanArtistSongFromTitle = (title) => {
  if (!title || typeof title !== 'string') {
    return {
      artist: '',
      song: ''
    }
  }

  let cleaned = title
    .replace(/\[.*?\]|\(.*?\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  // Artist - Song
  const separatorMatch = cleaned.match(
    /^(.+?)\s+[-–—]\s+(.+)$/
  )

  if (separatorMatch) {
    return {
      artist: sanitizeArtistName(separatorMatch[1]),
      song: separatorMatch[2].trim()
    }
  }

  return {
    artist: '',
    song: cleaned
  }
}

const extractYouTubeVideoId = (url) => {
  if (!url || typeof url !== 'string') return ''
  const trimmed = url.trim()
  const match = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/) || trimmed.match(/([A-Za-z0-9_-]{11})$/)
  return match ? match[1] : ''
}

const isYouTubeUrl = (url) => {
  if (!url || typeof url !== 'string') return false

  try {
    const parsed = new URL(url.trim())
    const host = parsed.hostname.toLowerCase()

    // youtube.com, www.youtube.com, music.youtube.com
    if (
      host === 'youtube.com' ||
      host === 'www.youtube.com' ||
      host === 'music.youtube.com'
    ) {
      // Normal watch URL
      if (
        parsed.pathname === '/watch' &&
        parsed.searchParams.has('v')
      ) {
        return true
      }

      // Shorts
      if (/^\/shorts\/[A-Za-z0-9_-]{11}$/.test(parsed.pathname)) {
        return true
      }

      // Embed
      if (/^\/embed\/[A-Za-z0-9_-]{11}$/.test(parsed.pathname)) {
        return true
      }
    }

    // youtu.be/VIDEO_ID
    if (host === 'youtu.be') {
      return /^\/[A-Za-z0-9_-]{11}$/.test(parsed.pathname)
    }

    return false
  } catch {
    return false
  }
}

const isSpotifyTrackUrl = (url) => {
  if (!url || typeof url !== 'string') return false

  try {
    const parsed = new URL(url.trim())

    return (
      parsed.hostname === 'open.spotify.com' &&
      /^\/track\/[A-Za-z0-9]+$/.test(parsed.pathname)
    )
  } catch {
    return false
  }
}

const extractSpotifyTrackId = (url) => {
  if (!url || typeof url !== 'string') return ''

  try {
    const parsed = new URL(url.trim())

    if (parsed.hostname !== 'open.spotify.com') return ''

    const match = parsed.pathname.match(
      /^\/track\/([A-Za-z0-9]+)$/
    )

    return match ? match[1] : ''
  } catch {
    return ''
  }
}

const getSongUrlType = (url) => {
  if (isYouTubeUrl(url)) return 'youtube'
  if (isSpotifyTrackUrl(url)) return 'spotify'
  return null
}

const getNextIndex = () => {
  if (!playlistSongs.value.length) return -1
  return (currIndex + 1) % playlistSongs.value.length
}

const getPrevIndex = () => {
  if (!playlistSongs.value.length) return -1
  return (currIndex - 1 + playlistSongs.value.length) % playlistSongs.value.length
}

const getLyrics = async (method, signal) => {
  const lyricsLoc = []

  const parse = (response) => {
    const data = response.data

    if (data?.syncedLyrics) {
      lyricsLoc.length = 0

      data.syncedLyrics.split('\n').forEach((line) => {
        const match = line.match(
          /^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/
        )

        if (!match) return

        const minutes = Number(match[1])
        const seconds = Number(match[2])
        const text = match[3]

        lyricsLoc.push({
          seconds: minutes * 60 + seconds,
          lyrics: text
        })
      })

      return {
        song: data.trackName,
        artist: data.artistName,
        lyrics: [...lyricsLoc],
        synced: true,
        fallback: false,
        duration: data.duration
      }
    }

    if (data?.plainLyrics) {
      const plainLines = data.plainLyrics
        .split('\n')
        .map(line => line.trim())
        .filter(line => line !== '')

      const plainLyrics = plainLines.map(line => ({
        lyrics: line
      }))

      return {
        song: data.trackName,
        artist: data.artistName,
        lyrics: plainLyrics,
        synced: false,
        fallback: false,
        duration: data.duration
      }
    }

    return false
  }

  if (
    method === 'single' &&
    encode(artistName) === '' &&
    encode(songName) === ''
  ) {
  } else {
    const artistCandidates = []

    const addArtistCandidate = (value) => {
      if (!value) return

      const cleaned = value.trim()

      if (
        cleaned &&
        !artistCandidates.some(
          candidate => candidate.toLowerCase() === cleaned.toLowerCase()
        )
      ) {
        artistCandidates.push(cleaned)
      }
    }

    addArtistCandidate(artistName)

    if (artistName.includes('-')) {
      const parts = artistName.split(/\s*[-–—]\s*/)

      parts.forEach(part => {
        addArtistCandidate(part)
      })
    }

    console.log('Trying lyric artists:', artistCandidates)

    for (const artistCandidate of artistCandidates) {
      if (signal?.aborted) return false

      try {
        const params = new URLSearchParams({
          artist_name: artistCandidate,
          track_name: songName
        })

        if (duration !== undefined) {
          params.append('duration', duration)
        }

        console.log(
          `Trying LRCLIB: "${artistCandidate}" - "${songName}"`
        )

        const response = await axios.get(
          `https://lrclib.net/api/get?${params.toString()}`,
          { signal }
        )

        const result = parse(response)

        if (result !== false) {
          console.log(
            `Lyrics found using artist: "${artistCandidate}"`
          )

          return result
        }
      } catch (error) {
        if (error.name === 'CanceledError') {
          return false
        }

        console.log(
          `LRCLIB failed for artist "${artistCandidate}"`,
          error
        )
      }
    }

    try {
      const response = await axios.get(
        `https://api.textyl.co/api/lyrics?q=${apiUrl}`,
        {
          insecureHTTPParser: true,
          signal
        }
      )

      const lyricsLoc2 = response.data

      lyricsLoc2.forEach(
        lyric => lyric.seconds = `${lyric.seconds}.00`
      )

      console.log('SENT LYRICS FALLBACK')

      return {
        lyrics: lyricsLoc2,
        fallback: true
      }
    } catch (error) {
      if (error.name === 'CanceledError') {
        return false
      }

      console.log('NO LYRICS FOUND', error)
      return false
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
  inputsVisible.value = !inputsVisible.value
  if (!inputWrapper.value) return
  inputWrapper.value.style.height = inputsVisible.value ? '90vh' : '0px'
}

const updateApiUrl = () => {
  apiUrl = ''

  try {
    let artistWords = Array.isArray(artists)
      ? artists.join(' ')
      : (artists || '')

    let songWords = Array.isArray(words)
      ? words.join(' ')
      : (words || '')

    artistWords = sanitizeArtistName(artistWords)

    artistWords = artistWords
      .replace(
        /[\(\[][^\)\]]*[\)\]]|(?:\s*(?:ft\.?|feat\.?|&).*?)$/gi,
        ''
      )

    songWords = songWords.replace(
      /[\(\[][^\)\]]*[\)\]]/g,
      ''
    )

    const artistMatches =
      artistWords.match(/\b[^\s]+\b/g) || []

    const songMatches =
      songWords.match(/\b[^\s]+\b/g) || []

    artistMatches.forEach((artist) => {
      apiUrl += ` ${artist}`
    })

    songMatches.forEach((word) => {
      apiUrl += ` ${word}`
    })

    apiUrl = encode(apiUrl)

  } catch (e) {
    console.log('updateApiUrl error:', e)
    apiUrl = ''
  }
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

  await new Promise((resolve) => {
    player = new YT.Player(songEmbed.value, {
      height: '360',
      width: '640',
      videoId: id,
      events: {
        onReady: () => {
          try {
            player.playVideo()
            player.setVolume(currentVolume.value * 2)
            songStateImg.value.src = pauseImg
            timeBarIndicatorStyles.value.left = `0%`

            duration = Math.round(player.getDuration() || 0)

            if (!duration || duration === 0) {
              // retry shortly if duration is not yet available
              setTimeout(() => {
                duration = Math.round(player.getDuration() || 0)
                resolve()
              }, 300)
            } else {
              resolve()
            }
          } catch (e) {
            // proceed even if reading duration fails
            resolve()
          }
        }
      }
    })
  })

  if (songData.value) {
    songData.value.style.backgroundImage = `url(https://img.youtube.com/vi/${id}/maxresdefault.jpg)`
  }
  coverSrc.value = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`
  extractImageColor(coverSrc.value)
}

const setImgAttribute = (type, img) => {
  if (type === 'play') {
    return img.setAttribute('src', playImg)
  }
  img.setAttribute('src', pauseImg)
}

const playPlaylistSong = async (i) => {
  const song = playlistSongs.value[i]

  if (!song) return

  activeIndex.value = i
  currIndex = i

  const requestId = ++currentRequestId.value

  console.log('Playlist song selected:', song)

  let videoId =
    song.videoId ||
    song.id ||
    extractYouTubeVideoId(song.url)

  if (!videoId && isSpotifyTrackUrl(song.url)) {
    try {
      console.log('Converting Spotify track to YouTube:', song.url)

      const spotifySong = await getSpotifySong(song.url)

      if (currentRequestId.value !== requestId) return

      if (!spotifySong?.videoId) {
        console.error(
          'Could not find YouTube video for Spotify song:',
          song
        )

        currentLyricsVal.value = 'YouTube video not found'
        return
      }

      videoId = spotifySong.videoId

      song.videoId = videoId

      if (spotifySong.title) {
        song.title = spotifySong.title
      }

      if (spotifySong.artist) {
        song.author = spotifySong.artist
      }

      if (spotifySong.duration) {
        song.duration = spotifySong.duration
      }

    } catch (error) {
      console.error(
        'Failed to convert Spotify playlist song:',
        error
      )

      currentLyricsVal.value = 'Failed to load Spotify song'
      return
    }
  }

  if (!videoId) {
    console.error(
      'No playable YouTube video found for playlist item:',
      song
    )

    currentLyricsVal.value = 'Unable to play song'
    return
  }

  console.log('Playing YouTube video:', videoId)

  currSong.value =
    song.title || 'Unknown Title'

  currArtist.value =
    song.author || 'Unknown Artist'

  artists = song.author || ''
  words = song.title || ''

  duration = song.duration || undefined

  clearInterval(checkInterval)
  clearInterval(timeSliderInterval)

  await updatePlayer(videoId)

  if (currentRequestId.value !== requestId) return

  await updateLyrics(
    requestId,
    'playlist'
  )

  if (currentRequestId.value !== requestId) return

  const playlistItem =
    playlistSongsParent.value?.children?.[i]

  if (playlistItem) {
    playlistItem.scrollIntoView({
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
  if (!currentTimeSlider.value) return
  currentTimeSlider.value.classList.toggle('fade')
  currentTimeSlider.value.addEventListener('animationend', (e) => currentTimeSlider.value?.classList.remove('fade'))
}

const updateSongState = (type, e) => {  
  switch (type) {
    case 'state': {
      if (!player) return

      const activePlaylistImg = playlistSongsParent.value?.children?.[currIndex]?.querySelector('.playlist-buttons img')

      if (player.getPlayerState() === 2) {
        player.playVideo()
        if (activePlaylistImg) setImgAttribute('pause', activePlaylistImg)
        return songStateImg.value.setAttribute('src', pauseImg)
      }

      player.pauseVideo()
      if (activePlaylistImg) setImgAttribute('play', activePlaylistImg)
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
        if (!isMuted.value) {
          player.setVolume(currentVolume.value * 2)
        }
        break
       }
    }
}

const toggleMute = () => {
  if (!player) return
  
  if (isMuted.value) {
    player.unMute()
    player.setVolume(currentVolume.value * 2)
  } else {
    player.mute()
  }
  
  isMuted.value = !isMuted.value
}

const updateArrays = () => {
  artistName = ''
  songName = ''

  if (Array.isArray(artists)) {
    artistName = artists.join(' ')
  } else if (typeof artists === 'string') {
    artistName = artists
  }

  if (Array.isArray(words)) {
    songName = words.join(' ')
  } else if (typeof words === 'string') {
    songName = words
  }

  artistName = artistName.trim()
  songName = songName.trim()

  let depth = 0
  let splitIndex = -1

  for (let i = 0; i < songName.length; i++) {
    const char = songName[i]

    if (char === '(' || char === '[') {
      depth++
      continue
    }

    if (char === ')' || char === ']') {
      depth = Math.max(0, depth - 1)
      continue
    }

    if (
      depth === 0 &&
      (char === '-' || char === '–' || char === '—') &&
      i > 0 &&
      i < songName.length - 1
    ) {
      const before = songName[i - 1]
      const after = songName[i + 1]

      if (/\s/.test(before) && /\s/.test(after)) {
        splitIndex = i
        break
      }
    }
  }

  if (splitIndex !== -1) {
    artistName = songName.slice(0, splitIndex).trim()
    songName = songName.slice(splitIndex + 1).trim()
  }

  artistName = artistName
    .replace(/\[.*?\]|\(.*?\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  songName = songName
    .replace(/\[.*?\]|\(.*?\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const updateLyrics = async (requestId, type) => {
  isFetchingLyrics.value = true
  currentLyricsVal.value = 'Fetching lyrics...'

  if (lyricsAbortController) {
    lyricsAbortController.abort()
  }

  lyricsAbortController = new AbortController()

  lyrics = undefined
  afterLyrics.value = []
  beforeLyrics.value = []

  try {
    if (currentRequestId.value !== requestId) return

    if (type === 'playlist') {
      const currentSong = playlistSongs.value[currIndex]

      if (!currentSong) {
        console.error('No current playlist song')
        return
      }

      artists = currentSong.author || ''
      words = currentSong.title || ''

      duration = currentSong.duration || undefined

      console.log('Lyrics search:', {
        artist: artists,
        song: words,
        duration
      })
    }

    updateArrays()

    if (currentRequestId.value !== requestId) return

    const response = await getLyrics(
      (artistName === '' || songName === '') ? 'single' : type,
      lyricsAbortController.signal
    )

    if (currentRequestId.value !== requestId) return

    if (response === false) {
      isFetchingLyrics.value = false
      console.log('NO LYRICS AVAILABLE')
      lyrics = undefined
      currentLyricsVal.value = 'No Lyrics Found'

      if (type === 'single') {
        currSong.value = songName || song.value || 'Unknown Title'
        currArtist.value = artistName || artist.value || 'Unknown Artist'
      } else {
        currSong.value = playlistSongs.value[currIndex]?.title || ''
        currArtist.value = playlistSongs.value[currIndex]?.author || ''
      }

      if (type === 'single' && songUrlInput.value) {
        const id = songUrlInput.value.split('=')[1]
        if (id) {
          playlistSongs.value.push({url: id, title: currSong.value, author: currArtist.value, duration: duration})
          currIndex = playlistSongs.value.length - 1
        }
      }
    } else {
      isFetchingLyrics.value = false

      if (lyrics === undefined) {
        lyrics = response.lyrics

        lyricsSynced = response.synced === true

        if (response.fallback !== true) {
          currArtist.value = response.artist
          currSong.value = response.song
        } else {
          currSong.value = songName
          currArtist.value = artistName
        }

        if (type === 'single') {
          playlistSongs.value.push({
            url: songUrlInput.value,
            videoId: songUrlInput.value.includes('spotify.com')
              ? null
              : extractYouTubeVideoId(songUrlInput.value),
            title: currSong.value,
            author: currArtist.value,
            duration: response.duration
          })

          currIndex = playlistSongs.value.length - 1
          activeIndex.value = currIndex
        }
      }
    }

    if (timeSliderInterval) {
      clearInterval(timeSliderInterval)
      timeSliderInterval = null
    }

    timeSliderInterval = setInterval(() => {
      if (currentTimeSlider.value) {
        currentTimeSlider.value.style.left = `${(Math.round(player.getCurrentTime()) / Math.round(player.getDuration())) * 100}%`
      }
      animateTimeSlider()
    }, 3000)
          
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
      } else if (!lyricsSynced) {
    
        if (beforeLyrics.value.length === 0 && afterLyrics.value.length === 0) {
          currentLyricsVal.value = ''

          afterLyrics.value = [...lyrics]
        }

      } else {

        if (
          lyrics.length > 0 &&
          currTime.value < Math.round(lyrics[0].seconds) &&
          afterLyrics.value.length === 0
        ) {
          currentLyricsVal.value = ''

          for (let i4 = 0; i4 < lyrics.length; i4++) {
            afterLyrics.value.push(lyrics[i4])
          }
        }

        let previousCurrentLyrics

        lyrics.forEach((lyric, i) => {
          if (player.getPlayerState() !== 2) {
            if (
              parseInt(lyric.seconds).toFixed(1) ===
              player.getCurrentTime().toFixed(1) &&
              previousCurrentLyrics !== lyric.seconds
            ) {
              previousCurrentLyrics = lyric.seconds

              currentLyricsVal.value = lyric.lyrics

              afterLyrics.value = []
              beforeLyrics.value = []

              if (i !== 0) {
                for (let i2 = 0; i2 < i; i2++) {
                  beforeLyrics.value.push(lyrics[i2])
                }
              }

              for (let i3 = i + 1; i3 < lyrics.length; i3++) {
                afterLyrics.value.push(lyrics[i3])
              }

              currentLyrics.value?.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
              })
            }
          }
        })
      }

      if (currTime.value >= roundedPlayerFullTime - 1 && !isSwitchingSong) {
        isSwitchingSong = true

        if (loop === true) {
          player.seekTo(0)
          player.playVideo()

          setTimeout(() => {
            isSwitchingSong = false
          }, 500)

          return
        }

        if (playlistSongs.value.length === 1) {
          player.seekTo(0)
          player.playVideo()

          setTimeout(() => {
            isSwitchingSong = false
          }, 500)

          return
        }

        if (playlistSongs.value.length > 1) {
          if (shuffle) {
            let randomIndex = Math.floor(
              Math.random() * playlistSongs.value.length
            )

            if (playlistSongs.value.length > 1) {
              while (randomIndex === currIndex) {
                randomIndex = Math.floor(
                  Math.random() * playlistSongs.value.length
                )
              }
            }

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
  } catch (e) {
    isFetchingLyrics.value = false
    console.log(e)
  }
}

const getSpotifySong = async (url) => {
  const response = await axios.post('/api/spotifysong', {
    url
  })

  return response.data
}

const findPlaylistSongIndex = (videoId, title = '', artist = '') => {
  return playlistSongs.value.findIndex(song => {
    const songVideoId =
      song.videoId ||
      song.id ||
      extractYouTubeVideoId(song.url)

    if (songVideoId && songVideoId === videoId) {
      return true
    }

    const sameTitle =
      title &&
      song.title &&
      song.title.toLowerCase().trim() === title.toLowerCase().trim()

    const sameArtist =
      artist &&
      song.author &&
      song.author.toLowerCase().trim() === artist.toLowerCase().trim()

    return sameTitle && sameArtist
  })
}

const handleInput = async (type, queue) => {
  artists = []
  words = []

  if (type === 'playlist') {
    playlistStatus.value = 'Fetching playlist...'

    try {
      if (!playlistUrl.value.trim()) {
        playlistStatus.value = 'Please enter a valid playlist URL'
        setTimeout(() => {
          playlistStatus.value = ''
        }, 3000)
        return
      }

      const playlistInput = playlistUrl.value.trim()

      const isSpotify =
        /^https?:\/\/open\.spotify\.com\/playlist\//i.test(
          playlistInput
        )

      const endpoint = isSpotify
        ? '/api/playlist'
        : '/api/playlist'

      const response = await axios.post(endpoint, {
        url: playlistInput
      })

      console.log(response.data)

      const newSongs = response.data.songs || []

      if (newSongs.length === 0) {
        playlistStatus.value = 'No songs found in playlist'

        setTimeout(() => {
          playlistStatus.value = ''
        }, 3000)

        return
      }

      newSongs.forEach(song => {
        const exists = playlistSongs.value.some(
          s => s.url === song.url
        )

        if (!exists) {
          playlistSongs.value.push(song)
        }
      })

      playlistStatus.value = `Loaded ${newSongs.length} songs`

      setTimeout(() => {
        playlistStatus.value = ''
      }, 2000)

      togglePlaylistVisible()
      toggleInputsVisible()

    } catch (e) {
      console.error('Playlist error:', e)

      playlistStatus.value =
        'Failed to load playlist. Check the URL and try again.'

      setTimeout(() => {
        playlistStatus.value = ''
      }, 3000)
    }

    return
  }

  const inputUrl = songUrlInput.value.trim()

  if (!inputUrl) {
    console.log('Please enter a YouTube or Spotify track URL.')
    return
  }

  const urlType = getSongUrlType(inputUrl)

  if (!urlType) {
    console.log(
      'Please enter a valid YouTube or Spotify track URL.'
    )
    return
  }

  artists =
    typeof artist.value === 'string'
      ? artist.value.trim()
      : ''

  words =
    typeof song.value === 'string'
      ? song.value.trim()
      : ''

  if (urlType === 'youtube') {

    const videoId = extractYouTubeVideoId(inputUrl)

    if (!videoId) {
      console.log('Could not extract YouTube video ID')
      return
    }
    if (!artists || !words) {
      try {
        const response = await axios.post(
          '/api/youtube-song',
          {
            url: inputUrl
          }
        )

        console.log(
          'YouTube metadata:',
          response.data
        )

        if (!artists) {
          artists = response.data.artist || ''
        }

        if (!words) {
          words = response.data.title || ''
        }

      } catch (e) {
        console.error(
          'Failed to get YouTube metadata:',
          e
        )
      }
    }

    // ---------------------------------
    // Make sure they're strings
    // ---------------------------------

    artists = artists || ''
    words = words || ''

    artistName = artists
    songName = words

    currArtist.value =
      artists || 'Unknown Artist'

    currSong.value =
      words || 'Unknown Title'

    // ---------------------------------
    // Lyrics search URL
    // ---------------------------------

    if (artists && words) {
      updateApiUrl()
    } else {
      apiUrl = ''
    }

    toggleInputsVisible()

    // ---------------------------------
    // Queue
    // ---------------------------------

    if (queue === true) {

      playlistSongs.value.push({
        url: videoId,
        title: words || 'Unknown Title',
        author: artists || 'Unknown Artist'
      })

      console.log(
        'YouTube song added to queue:',
        {
          videoId,
          title: words,
          artist: artists
        }
      )

      return
    }

    clearInterval(timeSliderInterval)
    clearInterval(checkInterval)

    const requestId =
    ++currentRequestId.value

    const playlistIndex = findPlaylistSongIndex(
      videoId,
      words,
      artists
    )

    if (playlistIndex !== -1) {
      activeIndex.value = playlistIndex
      currIndex = playlistIndex
    } else {
      activeIndex.value = null
    }

    await updatePlayer(videoId)

    if (
      currentRequestId.value === requestId
    ) {
      await updateLyrics(
        requestId,
        'single'
      )
    }

    return
  }

  if (urlType === 'spotify') {

    console.log(
      'Fetching Spotify metadata...'
    )

    let spotifySong

    try {
      spotifySong =
        await getSpotifySong(inputUrl)
    } catch (e) {
      console.error(
        'Spotify request failed:',
        e
      )

      currentLyricsVal.value =
        'Failed to load Spotify song'

      return
    }

    if (!spotifySong) {
      console.log(
        'No Spotify song returned'
      )
      return
    }

    console.log(
      'Spotify → YouTube:',
      spotifySong
    )

    if (!spotifySong.videoId) {
      console.log(
        'No YouTube video found'
      )

      currentLyricsVal.value =
        'YouTube video not found'

      return
    }

    artists =
      spotifySong.artist || ''

    words =
      spotifySong.title || ''

    artistName =
      artists

    songName =
      words

    currArtist.value =
      artists || 'Unknown Artist'

    currSong.value =
      words || 'Unknown Title'

    // ---------------------------------
    // Update lyrics API URL
    // ---------------------------------

    if (artists && words) {
      updateApiUrl()
    } else {
      apiUrl = ''
    }

    toggleInputsVisible()

    // ---------------------------------
    // Queue Spotify song
    // ---------------------------------

    if (queue === true) {
      playlistSongs.value.push({
        url: spotifySong.videoId,
        title: words || 'Unknown Title',
        author: artists || 'Unknown Artist',
        duration: spotifySong.duration || null
      })

      console.log(
        'Spotify → YouTube song added to queue:',
        {
          videoId: spotifySong.videoId,
          title: words,
          artist: artists
        }
      )

      return
    }

    clearInterval(timeSliderInterval)
    clearInterval(checkInterval)

   const requestId =
        ++currentRequestId.value

    const playlistIndex = findPlaylistSongIndex(
      spotifySong.videoId,
      spotifySong.title,
      spotifySong.artist
    )

    if (playlistIndex !== -1) {
      activeIndex.value = playlistIndex
      currIndex = playlistIndex
    } else {
      activeIndex.value = null
    }

    await updatePlayer(
      spotifySong.videoId
    )

    if (
      currentRequestId.value === requestId
    ) {
      await updateLyrics(
        requestId,
        'single'
      )
    }

    return
  }
}

</script>

<template>
  <main>
    <h1>Song Lyrics (BETA VERSION, MADE BY: SHLEV)</h1>

    <div id="inputwrapper" ref="inputWrapper">
      <button
        id="inputsToggleBtn"
        type="button"
        class="toggle-input-button"
        :class="{ open: inputsVisible }"
        @click="toggleInputsVisible"
        :aria-expanded="inputsVisible"
      >
        <span class="toggle-icon">{{ inputsVisible ? '✕' : '➤' }}</span>
        <span class="toggle-label">{{ inputsVisible ? 'Close inputs' : 'Show inputs' }}</span>
      </button>
      <div id="startui" v-show="inputsVisible">

        <div id="inputselector">
          <select v-model="selectedInput" @change="updateInputs">
            <option value="Single">Single</option>
            <option value="Playlist">Playlist</option>
          </select>
        </div>

        <div id="inputs">
          <form v-show="visibleOptions.single" id="singleinputdiv" class="inputdiv">
            <div class="inputs">
              <input type="text" placeholder="Enter artist name (Optional)" v-model="artist">
              <input type="text" placeholder="Enter song name (Optional)" v-model="song">
              <input type="text" placeholder="Enter youtube or spotify song url" v-model="songUrlInput">
            </div>

            <div id="buttonsdiv">
              <button type="submit" class="submit" @click.prevent="handleInput('single')">Play</button>
              <button type="submit" class="submit" @click.prevent="handleInput('single', true)">Add to Queue</button>
            </div>
          </form>

          <form @submit.prevent="handleInput('playlist')" v-show="visibleOptions.playlist" id="playlistinputdiv" class="inputdiv">
            <div class="inputs">
              <input type="text" placeholder="Enter YouTube or Spotify playlist URL" v-model="playlistUrl">
            </div>
            <button type="submit" class="submit">Submit</button>
            <div v-if="playlistStatus" class="playlist-status">{{ playlistStatus }}</div>
          </form>
        </div>
        </div>
      </div>

      <div class="playlist-toggle" @click="togglePlaylistVisible">☰</div>

      <div v-if="playlistVisible" class="playlist-backdrop" @click="togglePlaylistVisible"></div>

      <div class="playlist-panel" :class="{ open: playlistVisible }">

        <div class="playlist-header">
          <p>Playlist</p>

          <input
            v-model="playlistSearch"
            type="text"
            class="playlist-search"
            placeholder="Search songs or artists..."
          />
        </div>

        <div class="playlist-body" ref="playlistSongsParent">

          <div
            v-for="item in filteredPlaylistSongs"
            :key="item.song.url"
            class="playlist-item"
            :class="{ active: item.originalIndex === activeIndex }"
          >

            <div class="playlist-text">
              <p class="playlist-title">{{ item.song.title }}</p>
              <p class="playlist-author">{{ item.song.author }}</p>
            </div>

            <div class="playlist-buttons">

              <img
                  :src="item.originalIndex === activeIndex ? pauseImg : playImg"
                  class="playlist-icon"
                  @click="playPlaylistSong(item.originalIndex)"
                  id="playplaylistsong"
                />

              <img src="../assets/remove.png" class="playlist-icon" @click="playlistAction('remove', item.originalIndex)" />

            </div>

          </div>

        </div>

      </div>

    <div id="songdata" ref="songData">
      <div id="content">
        <div id="songEmbed" ref="songEmbed" v-show="false"></div>
      
        <div id="lyrics">
           <div v-if="lyrics && !lyricsSynced" class="unsynced-lyrics-box">
              <div class="unsynced-lyrics-title">
                Unsynced Lyrics
              </div>
            </div>
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
            :src="isMuted ? mutedImg : volumeImg"
            class="newcontrolimage"
            @click="toggleMute"
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

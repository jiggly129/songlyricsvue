import { chromium as playwright } from 'playwright-core'
import chromium from '@sparticuz/chromium'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed'
    })
  }

  const { url } = req.body || {}

  if (!url) {
    return res.status(400).json({
      error: 'Spotify playlist URL is required'
    })
  }

  let browser

  try {
    browser = await playwright.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true
    })

    const page = await browser.newPage()

    await page.setViewportSize({
      width: 1280,
      height: 900
    })

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    })

    try {
      await page.waitForSelector('a[href*="/track/"]', {
        timeout: 15000
      })
    } catch {
      console.log('Timed out waiting for Spotify tracks')
    }

    console.log('Page URL:', page.url())
    console.log('Page title:', await page.title())

    console.log(
      'Initial track links:',
      await page.locator('a[href*="/track/"]').count()
    )

    const songs = await page.evaluate(async () => {
      const delay = (ms) =>
        new Promise(resolve => setTimeout(resolve, ms))

      const songs = new Map()

      const collectTracks = () => {
        const links = document.querySelectorAll(
          'a[href*="/track/"]'
        )

        for (const link of links) {
          const trackUrl = link.href

          if (!trackUrl || songs.has(trackUrl)) {
            continue
          }

          const container =
            link.closest('[data-testid="tracklist-row"]') ||
            link.closest('[role="row"]') ||
            link.parentElement?.parentElement ||
            link.parentElement

          const text =
            container?.innerText ||
            link.innerText ||
            ''

          const lines = text
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean)

          const title =
            link.innerText?.trim() ||
            lines[1] ||
            lines[0] ||
            ''

          let author = ''

          if (container) {
            const artistLinks = [
              ...container.querySelectorAll(
                'a[href*="/artist/"]'
              )
            ]

            author = artistLinks
              .map(artist => artist.innerText.trim())
              .filter(Boolean)
              .join(', ')
          }

          if (!author) {
            const explicitIndex = lines.indexOf('E')

            author =
              explicitIndex !== -1
                ? lines[explicitIndex + 1] || ''
                : lines[2] || ''
          }

          const durationText =
            lines.find(line =>
              /^\d+:\d{1,2}$/.test(line)
            ) || ''

          let duration = null

          const durationMatch =
            durationText.match(/^(\d+):(\d{1,2})$/)

          if (durationMatch) {
            duration =
              Number(durationMatch[1]) * 60 +
              Number(durationMatch[2])
          }

          const id =
            trackUrl
              .split('/track/')[1]
              ?.split('?')[0] || null

          songs.set(trackUrl, {
            id,
            title,
            author,
            url: trackUrl,
            duration
          })
        }
      }

      const getScrollContainer = () => {
        const elements = [
          ...document.querySelectorAll('main, div')
        ]

        const scrollable = elements
          .filter(element => {
            const style =
              window.getComputedStyle(element)

            return (
              ['auto', 'scroll'].includes(
                style.overflowY
              ) &&
              element.scrollHeight >
                element.clientHeight + 100
            )
          })
          .sort((a, b) => {
            const aSize =
              a.scrollHeight - a.clientHeight

            const bSize =
              b.scrollHeight - b.clientHeight

            return bSize - aSize
          })

        return (
          scrollable[0] ||
          document.scrollingElement ||
          document.documentElement
        )
      }

      const scrollContainer =
        getScrollContainer()

      collectTracks()

      let noNewTracks = 0
      let lastCount = songs.size

      for (let i = 0; i < 200; i++) {
        const maxScroll =
          scrollContainer.scrollHeight -
          scrollContainer.clientHeight

        const before =
          scrollContainer.scrollTop

        const jump = Math.max(
          scrollContainer.clientHeight * 2,
          1500
        )

        scrollContainer.scrollTop =
          Math.min(before + jump, maxScroll)

        await delay(150)

        collectTracks()

        const currentCount = songs.size

        const isAtBottom =
          scrollContainer.scrollTop >= maxScroll - 5

        if (currentCount === lastCount) {
          noNewTracks++

          if (!isAtBottom) {
            await delay(300)
            collectTracks()
          }
        } else {
          noNewTracks = 0
          lastCount = currentCount
        }

        if (isAtBottom) {
          for (let j = 0; j < 3; j++) {
            await delay(400)
            collectTracks()
          }

          break
        }

        if (
          scrollContainer.scrollTop === before &&
          noNewTracks >= 3
        ) {
          window.scrollBy(0, 2000)

          await delay(200)

          collectTracks()
        }
      }

      return [...songs.values()]
    })

    console.log('Total songs found:', songs.length)

    console.log(
      'First 5 songs:',
      songs.slice(0, 5)
    )

    return res.status(200).json({
      count: songs.length,
      songs
    })

  } catch (error) {
    console.error('Spotify crawl error:', error)

    return res.status(500).json({
      error: error.message
    })

  } finally {
    if (browser) {
      await browser.close()
    }
  }
}
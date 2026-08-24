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

    const page = await browser.newPage({
      viewport: {
        width: 1280,
        height: 900
      }
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

    await page.waitForTimeout(1000)

    const songs = new Map()

    const collectTracks = async () => {
      const tracks = await page.evaluate(() => {
        const results = []

        const links = document.querySelectorAll(
          'a[href*="/track/"]'
        )

        for (const link of links) {
          const trackUrl = link.href

          if (!trackUrl) {
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

          const artistLinks = container
            ? [
                ...container.querySelectorAll(
                  'a[href*="/artist/"]'
                )
              ]
            : []

          let author = artistLinks
            .map(artist => artist.innerText.trim())
            .filter(Boolean)
            .join(', ')

          const title =
            link.innerText?.trim() ||
            lines[1] ||
            lines[0] ||
            ''

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
              ?.split('?')[0] ||
            null

          results.push({
            id,
            title,
            author,
            url: trackUrl,
            duration
          })
        }

        return results
      })

      for (const track of tracks) {
        if (!songs.has(track.url)) {
          songs.set(track.url, track)
        }
      }

      return songs.size
    }

    await collectTracks()

    console.log(
      'Initial songs found:',
      songs.size
    )

    let unchangedCount = 0
    let previousCount = songs.size

    await page.mouse.move(640, 600)

    for (let i = 0; i < 500; i++) {
      await page.mouse.wheel(0, 1200)

      await page.waitForTimeout(250)

      const currentCount = await collectTracks()

      console.log(
        `Scroll ${i + 1}: ${currentCount} songs`
      )

      if (currentCount === previousCount) {
        unchangedCount++
      } else {
        unchangedCount = 0
        previousCount = currentCount
      }

      if (unchangedCount >= 12) {
        await page.waitForTimeout(1000)

        const finalCount = await collectTracks()

        if (finalCount === previousCount) {
          break
        }

        previousCount = finalCount
        unchangedCount = 0
      }
    }

    for (let i = 0; i < 5; i++) {
      await page.mouse.wheel(0, 2000)
      await page.waitForTimeout(300)
      await collectTracks()
    }

    const result = [...songs.values()]

    console.log(
      'Total songs found:',
      result.length
    )

    return res.status(200).json({
      count: result.length,
      songs: result
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
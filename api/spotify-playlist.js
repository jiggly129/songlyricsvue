import axios from 'axios'
import { chromium as playwright } from 'playwright-core'
import chromium from '@sparticuz/chromium'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { url } = req.body

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

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    })

    try {
      await page.waitForSelector('a[href*="/track/"]', {
        timeout: 15000
      })
    } catch (error) {
      console.log('Timed out waiting for Spotify tracks')
    }

    console.log('Page URL:', page.url())
    console.log('Page title:', await page.title())

    console.log(
      'Track links:',
      await page.locator('a[href*="/track/"]').count()
    )

    console.log(
      'Track rows:',
      await page.locator('[data-testid="tracklist-row"]').count()
    )

    const tracks = await page.evaluate(() => {
      const tracks = []
      const seen = new Set()

      for (const link of document.querySelectorAll('a[href*="/track/"]')) {
        const trackUrl = link.href

        if (!trackUrl || seen.has(trackUrl)) continue

        seen.add(trackUrl)

        const container =
          link.closest('[data-testid="tracklist-row"]') ||
          link.parentElement

        const text = container?.innerText || ''

        tracks.push({
          spotifyUrl: trackUrl,
          text
        })
      }

      return tracks
    })

    const songs = tracks
    .map((track) => {
      const lines = track.text
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)

      const title = lines[1] || ''

      const hasExplicitLabel = lines[2] === 'E'

      const author = hasExplicitLabel
        ? lines[3] || ''
        : lines[2] || ''

      const durationText =
        lines[lines.length - 1] || ''

      let duration = null

      const durationMatch =
        durationText.match(/^(\d+):(\d{1,2})$/)

      if (durationMatch) {
        const minutes = Number(durationMatch[1])
        const seconds = Number(durationMatch[2])

        duration = minutes * 60 + seconds
      }

      return {
        id: null,
        title,
        author,
        url: track.spotifyUrl,
        duration
      }
    })
    .filter(song => song.title && song.author)

    return res.status(200).json({
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
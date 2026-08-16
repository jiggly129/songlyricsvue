import sys
import json
import traceback

from spotify_scraper import SpotifyClient

def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "Missing Spotify playlist URL"
        }))
        sys.exit(1)

    url = sys.argv[1]

    try:
        print(
            f"Fetching Spotify playlist: {url}",
            file=sys.stderr
        )

        with SpotifyClient() as client:
            playlist = client.get_playlist(
                url,
                max_tracks=None
            )

        songs = []

        for entry in playlist.tracks:
            track = entry.track

            if not track:
                continue

            title = track.name or "Unknown Title"

            artists = ", ".join(
                artist.name
                for artist in track.artists
                if artist.name
            )

            if not artists:
                artists = "Unknown Artist"

            songs.append({
                "spotifyId": track.id,
                "title": title,
                "author": artists,
                "duration": round(
                    track.duration_ms / 1000
                ) if track.duration_ms else None
            })

        print(
            f"Spotify tracks extracted: {len(songs)}",
            file=sys.stderr
        )

        print(json.dumps({
            "name": playlist.name,
            "count": len(songs),
            "songs": songs
        }))

    except Exception as error:
        print(
            "Spotify scraper error:",
            file=sys.stderr
        )
        traceback.print_exc(file=sys.stderr)

        print(json.dumps({
            "error": str(error)
        }))

        sys.exit(1)


if __name__ == "__main__":
    main()
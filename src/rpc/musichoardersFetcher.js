
const axios = require('axios');
const fs = require('fs');
const levenshtein = require("js-levenshtein");
const path = require('path');

/**
 * Caching fetcher for [MusicHoarders](https://covers.musichoarders.xyz/)
 *   Caching may be either in memory only, or to a file in the `cache/` directory.
 */
class MusicHoardersFetcher
{
  static #services = {
    "applemusic": "Apple Music",
    "bandcamp": "Bandcamp",
    "deezer": "Deezer",
    "qobuz": "Qobuz",
    "spotify": "Spotify",
    "soundcloud": "SoundCloud",
    "tidal": "Tidal",
  };
  static #apiUrl = "https://covers.musichoarders.xyz/api/search";

  /** @type {!string} */
  #cacheFilePath = path.join(__dirname, '..', '..', 'cache', 'MusicHoardersCache.json');

  /** @type {boolean} */
  #usePersistentCache;
  /** @type {!Object} #knownResults [metadataJSON][service] = {{fetchedFrom: string, artworkUrl: string, joinUrl: string}} */
  #knownResults = {};

  /**
   * @param {boolean} useFileBasedCache
   */
  constructor(usePersistentCache){
    this.#usePersistentCache = usePersistentCache;
    if (usePersistentCache)
    {
      // Load cache from cache file
      try {
        const cacheData = fs.readFileSync(this.#cacheFilePath, 'utf-8');
        this.#knownResults = JSON.parse(cacheData);
      }
      catch (error)
      {
        if (error.code === 'ENOENT')
        {
          // If the cache file does not exist, create an empty cache object
          console.log('Cache file not found. Starting with an empty cache.');
        }
        else
        {
          console.warn('Error loading cache from file:', error.message);
        }
      }

      process.on('exit', () => {
        // Save the cache to the file when the application exits
        this.#saveCacheToFile();
      });

      process.on('SIGINT', () => {
        // Save the cache to the file when the application is terminated using SIGINT (Ctrl+C)
        this.#saveCacheToFile();
        process.exit(0); // Otherwise won't exit
      });
    }
  }

  /**
   * Save content in #knownResults to the cache file
   */
  #saveCacheToFile()
  {
    try {
      fs.writeFileSync(this.#cacheFilePath, JSON.stringify(this.#knownResults), 'utf-8');
      console.log('Cache saved to file.');
    }
    catch (error)
    {
      console.error('Error saving cache to file:', error.message);
    }
  }

  /**
   * Fetch artwork and join URLs if not cached, otherwise return cached
   * @param {string} service  service name, e.g. "spotify"
   * @param {Object} metadata VLC metadata
   * @returns {?{artworkFrom: ?string, artworkUrl: ?string, joinFrom: ?string, joinUrl: ?string}}
   */
  async fetch(service, metadata)
  {
    if ((metadata.ALBUMARTIST || metadata.artist) && metadata.album)
    {
      // Create key that can be reasonably expected to be same for all songs in an album
      let metadataJSON = JSON.stringify({
        artist: metadata.ALBUMARTIST || metadata.artist,
        album: metadata.album,
        date: metadata.date,
        publisher: metadata.publisher,
      });
      if (metadataJSON in this.#knownResults
          && service in this.#knownResults[metadataJSON])
      { // Use cached results if possible
        return this.#knownResults[metadataJSON][service];
      }
      else
      { // Otherwise make a new request
        const data = {
          artist: metadata.ALBUMARTIST || metadata.artist,
          album: metadata.album,
          country: "gb", // this can be static
          sources: Object.keys(MusicHoardersFetcher.#services)
        };

        const response = await axios.post(MusicHoardersFetcher.#apiUrl,
                                          data, { headers: { 'User-Agent':'VLC-RPC V1.2' }});
        const albumsData = response.data.split("\n").map((line) => {
          try {
            if (line.trim().length > 0) {
              return JSON.parse(line);
            }
            return null;
          } catch (error) {
            console.error("Error parsing JSON:", error);
            return null;
          }
        }).filter(e => e); // Filter out invalids

        let bestResults = {};
        for (let album of albumsData)
        {
          if (album.releaseInfo && album.releaseInfo.artist)
          {
            const levenshteinScore =
              levenshtein(album.releaseInfo.title.toLowerCase(), data.album.toLowerCase())
              + levenshtein(album.releaseInfo.artist.toLowerCase(), data.artist.toLowerCase());

            if (!bestResults[album.source] || levenshteinScore < bestResults[album.source].score)
            { // If better fit than earlier covers from the service, set as best for service
              bestResults[album.source] = { album, score: levenshteinScore };
              if (!bestResults["musichoarders"] || levenshteinScore < bestResults["musichoarders"].score)
              { // If better fit than earlier covers overall, set as best for "musichoarders"
                bestResults["musichoarders"] = { album, score: levenshteinScore };
              }
            }
          }
        }

        if (Object.keys(bestResults).length > 0)
        {
          for (let serviceKey in bestResults)
          {
            bestResults[serviceKey] = {
              artworkFrom: MusicHoardersFetcher.#services[bestResults[serviceKey].album.source],
              artworkUrl: bestResults[serviceKey].album.smallCoverUrl,
              joinFrom: MusicHoardersFetcher.#services[bestResults[serviceKey].album.source],
              joinUrl: bestResults[serviceKey].album.releaseInfo.url,
            };
          };
          //console.log(this.#lastResults);

          this.#knownResults[metadataJSON] = bestResults;
          return this.#knownResults[metadataJSON][service];
        }
      }
    }
  }
}

module.exports = MusicHoardersFetcher;

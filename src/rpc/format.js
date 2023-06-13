/**
 * Description: Decides what information to display based on the nature of the media (video, music, etc)
 */


const fs = require('fs');
const log = require('../helpers/lager.js');
const config = require('../../config/config.js');
const axios = require('axios');
const albumArt = require('album-art');
const yt = require("ytsr");



module.exports = async (status) => {
  // if playback is stopped
  if (status.state === 'stopped') {
    return {
      state: 'Stopped',
      details: 'Nothing is playing',
      largeImageKey: config.rpc.largeIcon,
      smallImageKey: 'stopped',
      instance: true,
    }; 
  } // else
  const { meta } = status.information.category;




  const fetchArtworkApple = async (searchQuery) => {
    const params = {
      media: "music",
      term: searchQuery,
    };
    return axios.get("https://itunes.apple.com/search", {
      params,
    });
  };

  let display_artist = String(undefined);
  if (meta.albumartist)
  {
    display_artist = String(meta.albumartist + " ");
  }
  else if (meta.artist)
  {
    display_artist = String(meta.artist + " ");
  }
  
  const options = {
    album: String(encodeURIComponent(meta.album))
  }

  var appleresponse = await fetchArtworkApple(`${meta.title} ${display_artist}`);
  
  if (config.rpc.whereToFetchOnline === 'apple')
  {
    if (!(meta.title === undefined || display_artist === "undefined"))
    {
      if (appleresponse.data.results[0] === undefined) {
        try{
          var testartwork = await albumArt(display_artist, options).then((data) => data);
          var artwork = testartwork;
          var fetched = "Spotify";
          var enableYoutubeButton = true;
        } catch (err) {
          var artwork = config.rpc.largeIcon;
          var fetched = "Nowhere";
          var enableYoutubeButton = "true";
          console.log(err)
        }
      } else {
        
        var artwork = appleresponse.data.results[0].artworkUrl100;
        var fetched = "Apple";
      }
     
    }
  } else {
    var artwork = await albumArt(display_artist, options).then((data) => data);
    var fetched = "Spotify";
  }

  
  if (config.debug === 'true') {
    console.log(artwork);
    console.log(status.state);
    console.log(fetched);
    console.log(meta.title);
    console.log(meta.artist, display_artist);
    console.log(meta.albumartist)
    console.log(status.stats.decodedvideo)
  }

  if(config.rpc.changeButtonProvider === "youtube"){
    var enableYoutubeButton = "true";
  } 

  if (display_artist === "undefined"){
    var artwork = config.rpc.largeIcon;
    var fetched = "Nowhere";
    var enableYoutubeButton = "true";
  } else if (meta.title === undefined) {
    var artwork = config.rpc.largeIcon;
    var fetched = "Nowhere";
    var enableYoutubeButton = "true";
  }


  // Really not much
  if (config.rpc.largeImageText === "artist"){
    var largeImageTextIs = decodeURI(artist);
  } else if (config.rpc.largeImageText === "album") {
    var largeImageTextIs = meta.album;
  } else if (config.rpc.largeImageText === "volume") {
    var largeImageTextIs = `Volume: ${Math.round(status.volume / 2.56)}%`;
  } else if (config.rpc.largeImageText === "title") {
    var largeImageTextIs = meta.title;
  } else if (config.rpc.largeImageText === "fetched") {
    var largeImageTextIs = `Artwork fetched from ${fetched}`;
  }
  
// Checks if youtube button is turned on in the config, then searches the names on youtube
  if(enableYoutubeButton){
    if (meta.title === undefined) {
      const search = await yt(`${meta.filename}`, { limit: 1 });
      const resultunjson = JSON.stringify(search.items);
      const result = JSON.parse(resultunjson);
      if (result[0] === undefined) {
        var url = "https://videolan.com/vlc";
        var label = "Visit VLC today!";
      } else {
        var url = result[0].url;
        var label = "Listen on Youtube"; 
      }
      
    } else if (display_artist === "undefined") {
      const search = await yt(`${meta.filename}`, { limit: 1 });
      const resultunjson = JSON.stringify(search.items);
      const result = JSON.parse(resultunjson);
      if (result[0] === undefined) {
        var url = "https://videolan.com/vlc";
        var label = "Visit VLC today!";
      } else {
        var url = result[0].url;
        var label = "Listen on Youtube";
      }
    } else {
      const search = await yt(`${meta.title} ${display_artist}`, { limit: 1 });
      const resultunjson = JSON.stringify(search.items);
      const result = JSON.parse(resultunjson);
      var url = result[0].url;
      var label = "Listen on Youtube";
    }
    

  } else {
    var url = appleresponse.data.results[0].trackViewUrl;
    
    var label = "Listen on Apple Music";
  }


  const output = {
    // Shows file thats playing.. well most of the time
    details: meta.title || meta.filename || "Playing something..",
    // Line 99 - 109 determines this
    largeImageText: largeImageTextIs,
    // Sets album art depending on whats set in the file, or if album art cannot be found
    largeImageKey: artwork || "https://i.pinimg.com/originals/67/f6/cb/67f6cb14f862297e3c145014cdd6b635.jpg",
    smallImageKey: status.state,
    smallImageText: `Volume: ${Math.round(status.volume / 2.56)}%`,
    instance: true,
    buttons: [
        {
          label: label,
          url: url,
        },
      ]
  };
  // if video
  if(status.stats.decodedvideo > 0) {
    // if youtube video
    if (meta['YouTube Start Time'] !== undefined) {
      output.largeImageKey = 'youtube';
      output.largeImageText = meta.url;
    }
    // if a tv show
    if (meta.showName) output.details = meta.showName;
    if (meta.episodeNumber) {
      output.state = `Episode ${meta.episodeNumber}`;
      if (meta.seasonNumber) {
        output.state += ` - Season ${meta.seasonNumber}`;
      }
    } else if (!display_artist === "undefined") {
      output.state = display_artist;
    } else {
      output.state = `${(status.date || '')} Video`;
    }
  } else if (meta.now_playing) {
    // if a stream
    output.state = meta.now_playing || "Stream";
  } else if (display_artist) {
    // Add artist to the state
    output.state = display_artist;

    // Add album to the state if possible
    if (meta.album)
      output.state += ` - ${meta.album}`;

    //Trim the state if too longdisplay_artist
    if (output.state.length > 128)
    {
      console.warn("The string ('" + output.state + "') is too long for discord :/");
      output.state = output.state.substring(0, 128);
    }

    // display track #
    if (meta.track_number && meta.track_total && config.rpc.displayTrackNumber) {
      output.partySize = parseInt(meta.track_number, 10);
      output.partyMax = parseInt(meta.track_total, 10);
    }
  } else {
    output.state = status.state;
  }
  const end = Math.floor(Date.now() / 1000 + ((status.length - status.time) / status.rate));
  if (status.state === 'playing' && config.rpc.displayTimeRemaining && status.length != 0) {
    output.endTimestamp = end;
  }
  log('Format output', output);
  return output;
};
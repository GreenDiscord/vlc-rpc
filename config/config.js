module.exports = {

  // The full path to your VLC executable
  // If left blank, typical defaults are used
  vlcPath: "E:/Programs/VLC/vlc.exe",
  
  debug : "false",

  console: {
    // Sets the "Presence Updated" text to off or on
    presencestate : false,
    
    // Sets the console to Task icon mode (wip)
    taskicon : false

  },

  rpc: {
    
    // Set the text for the large image, this accepts, title, album, volume, artist and fetched.
    largeImageText: "fetched",

    // The Discord application ID for the rich presence
    id: '1032293686098272316',

    // How frequently in milliseconds to check for updates
    updateInterval: 1000,

    // Change where to fetch the album artwork (spotify and apple only supported)
    whereToFetchOnline: "apple",

    // Change the provider for the rpc button (youtube and apple only, not yet implemented)
    changeButtonProvider: "apple",

    // When playback is paused, wait this many milliseconds 
    // before removing your rich presence
    sleepTime: 30000,

    // Show the album track number when applicable. Example: (2 of 10)
    displayTrackNumber: true,

    // Show the remaining playback time
    displayTimeRemaining: true,

    // Keep rich presence when playback is stopped 
    showStopped: true,

    // If true, VLC will not be opened for you.
    // Note: You must set a password
    detached: true,

    // Changes the big icon of the rich presence
    // Some of the available icons are: vlc, vlcflat, vlcblue, vlcneon, vlcxmas
    largeIcon: "vlc",

  },

  vlc: {

    // If no password is given, a random password is used
    password: 'passwordgoeshere',

    // This must correspond with the port VLC's web interface uses
    port: 8080,

    // Hostname of the VLC web interface. Nobody should need to change this
    address: 'localhost'

  },
};

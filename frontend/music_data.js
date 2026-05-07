const MUSIC_DB = [
  // Happy/Upbeat
  { type: 'song', title: "Happy", artist: "Pharrell Williams", genres: "Pop", mood: "happy", lang: "English", year: 2013 },
  { type: 'song', title: "Uptown Funk", artist: "Mark Ronson ft. Bruno Mars", genres: "Funk Pop", mood: "happy", lang: "English", year: 2014 },
  { type: 'song', title: "Can't Stop the Feeling", artist: "Justin Timberlake", genres: "Pop", mood: "happy", lang: "English", year: 2016 },
  { type: 'song', title: "Shake It Off", artist: "Taylor Swift", genres: "Pop", mood: "happy", lang: "English", year: 2014 },
  { type: 'song', title: "Walking on Sunshine", artist: "Katrina and the Waves", genres: "Rock", mood: "happy", lang: "English", year: 1985 },
  { type: 'song', title: "Good Vibrations", artist: "The Beach Boys", genres: "Rock", mood: "happy", lang: "English", year: 1966 },
  { type: 'song', title: "Mr. Blue Sky", artist: "Electric Light Orchestra", genres: "Rock", mood: "happy", lang: "English", year: 1977 },
  { type: 'song', title: "Don't Stop Me Now", artist: "Queen", genres: "Rock", mood: "happy", lang: "English", year: 1978 },
  { type: 'song', title: "I Wanna Dance with Somebody", artist: "Whitney Houston", genres: "Pop", mood: "happy", lang: "English", year: 1987 },
  { type: 'song', title: "Celebration", artist: "Kool & The Gang", genres: "Funk", mood: "happy", lang: "English", year: 1980 },

  // Sad/Emotional
  { type: 'song', title: "Someone Like You", artist: "Adele", genres: "Pop Soul", mood: "sad", lang: "English", year: 2011 },
  { type: 'song', title: "Fix You", artist: "Coldplay", genres: "Alternative Rock", mood: "sad", lang: "English", year: 2005 },
  { type: 'song', title: "The Night We Met", artist: "Lord Huron", genres: "Indie Folk", mood: "sad", lang: "English", year: 2015 },
  { type: 'song', title: "Hurt", artist: "Johnny Cash", genres: "Country", mood: "sad", lang: "English", year: 2002 },
  { type: 'song', title: "Mad World", artist: "Gary Jules", genres: "Alternative", mood: "sad", lang: "English", year: 2001 },
  { type: 'song', title: "Everybody Hurts", artist: "R.E.M.", genres: "Rock", mood: "sad", lang: "English", year: 1992 },
  { type: 'song', title: "Tears in Heaven", artist: "Eric Clapton", genres: "Rock", mood: "sad", lang: "English", year: 1992 },
  { type: 'song', title: "Nothing Compares 2 U", artist: "Sinead O'Connor", genres: "Pop", mood: "sad", lang: "English", year: 1990 },
  { type: 'song', title: "Black", artist: "Pearl Jam", genres: "Grunge", mood: "sad", lang: "English", year: 1991 },
  { type: 'song', title: "Hallelujah", artist: "Jeff Buckley", genres: "Alternative", mood: "sad", lang: "English", year: 1994 },

  // Energetic/Workout
  { type: 'song', title: "Eye of the Tiger", artist: "Survivor", genres: "Rock", mood: "energetic", lang: "English", year: 1982 },
  { type: 'song', title: "Stronger", artist: "Kanye West", genres: "Hip Hop", mood: "energetic", lang: "English", year: 2007 },
  { type: 'song', title: "Lose Yourself", artist: "Eminem", genres: "Hip Hop", mood: "energetic", lang: "English", year: 2002 },
  { type: 'song', title: "Thunderstruck", artist: "AC/DC", genres: "Rock", mood: "energetic", lang: "English", year: 1990 },
  { type: 'song', title: "Welcome to the Jungle", artist: "Guns N' Roses", genres: "Rock", mood: "energetic", lang: "English", year: 1987 },
  { type: 'song', title: "Power", artist: "Kanye West", genres: "Hip Hop", mood: "energetic", lang: "English", year: 2010 },
  { type: 'song', title: "Sandstorm", artist: "Darude", genres: "Electronic", mood: "energetic", lang: "Instrumental", year: 1999 },
  { type: 'song', title: "Titanium", artist: "David Guetta ft. Sia", genres: "EDM", mood: "energetic", lang: "English", year: 2011 },
  { type: 'song', title: "Levels", artist: "Avicii", genres: "EDM", mood: "energetic", lang: "Instrumental", year: 2011 },
  { type: 'song', title: "Pump It", artist: "The Black Eyed Peas", genres: "Hip Hop", mood: "energetic", lang: "English", year: 2005 },

  // Chill/Relax
  { type: 'song', title: "Weightless", artist: "Marconi Union", genres: "Ambient", mood: "chill", lang: "Instrumental", year: 2011 },
  { type: 'song', title: "Clair de Lune", artist: "Debussy", genres: "Classical", mood: "chill", lang: "Instrumental", year: 1905 },
  { type: 'song', title: "River Flows in You", artist: "Yiruma", genres: "Classical", mood: "chill", lang: "Instrumental", year: 2001 },
  { type: 'song', title: "Sunset Lover", artist: "Petit Biscuit", genres: "Electronic", mood: "chill", lang: "Instrumental", year: 2015 },
  { type: 'song', title: "Intro", artist: "The xx", genres: "Indie", mood: "chill", lang: "Instrumental", year: 2009 },
  { type: 'song', title: "Midnight City", artist: "M83", genres: "Electronic", mood: "chill", lang: "English", year: 2011 },
  { type: 'song', title: "Electric Feel", artist: "MGMT", genres: "Indie", mood: "chill", lang: "English", year: 2007 },
  { type: 'song', title: "Dreams", artist: "Fleetwood Mac", genres: "Rock", mood: "chill", lang: "English", year: 1977 },
  { type: 'song', title: "Pink + White", artist: "Frank Ocean", genres: "R&B", mood: "chill", lang: "English", year: 2016 },
  { type: 'song', title: "The Less I Know the Better", artist: "Tame Impala", genres: "Psychedelic", mood: "chill", lang: "English", year: 2015 },

  // Romantic
  { type: 'song', title: "Perfect", artist: "Ed Sheeran", genres: "Pop", mood: "romantic", lang: "English", year: 2017 },
  { type: 'song', title: "All of Me", artist: "John Legend", genres: "R&B", mood: "romantic", lang: "English", year: 2013 },
  { type: 'song', title: "Thinking Out Loud", artist: "Ed Sheeran", genres: "Pop", mood: "romantic", lang: "English", year: 2014 },
  { type: 'song', title: "A Thousand Years", artist: "Christina Perri", genres: "Pop", mood: "romantic", lang: "English", year: 2011 },
  { type: 'song', title: "Make You Feel My Love", artist: "Adele", genres: "Pop", mood: "romantic", lang: "English", year: 2008 },
  { type: 'song', title: "Unchained Melody", artist: "The Righteous Brothers", genres: "Soul", mood: "romantic", lang: "English", year: 1965 },
  { type: 'song', title: "At Last", artist: "Etta James", genres: "Soul", mood: "romantic", lang: "English", year: 1960 },
  { type: 'song', title: "Can't Help Falling in Love", artist: "Elvis Presley", genres: "Rock", mood: "romantic", lang: "English", year: 1961 },
  { type: 'song', title: "Your Song", artist: "Elton John", genres: "Pop", mood: "romantic", lang: "English", year: 1970 },
  { type: 'song', title: "Endless Love", artist: "Diana Ross & Lionel Richie", genres: "R&B", mood: "romantic", lang: "English", year: 1981 },

  // Party/Dance
  { type: 'song', title: "Blinding Lights", artist: "The Weeknd", genres: "Synth Pop", mood: "party", lang: "English", year: 2019 },
  { type: 'song', title: "Levitating", artist: "Dua Lipa", genres: "Pop", mood: "party", lang: "English", year: 2020 },
  { type: 'song', title: "Get Lucky", artist: "Daft Punk", genres: "Funk", mood: "party", lang: "English", year: 2013 },
  { type: 'song', title: "One More Time", artist: "Daft Punk", genres: "Electronic", mood: "party", lang: "English", year: 2000 },
  { type: 'song', title: "Yeah!", artist: "Usher", genres: "R&B", mood: "party", lang: "English", year: 2004 },
  { type: 'song', title: "I Gotta Feeling", artist: "The Black Eyed Peas", genres: "Pop", mood: "party", lang: "English", year: 2009 },
  { type: 'song', title: "Dancing Queen", artist: "ABBA", genres: "Pop", mood: "party", lang: "English", year: 1976 },
  { type: 'song', title: "Stayin' Alive", artist: "Bee Gees", genres: "Disco", mood: "party", lang: "English", year: 1977 },
  { type: 'song', title: "Billie Jean", artist: "Michael Jackson", genres: "Pop", mood: "party", lang: "English", year: 1982 },
  { type: 'song', title: "24K Magic", artist: "Bruno Mars", genres: "Funk", mood: "party", lang: "English", year: 2016 },

  // Indian Music - Happy
  { type: 'song', title: "Kal Ho Naa Ho", artist: "Sonu Nigam", genres: "Bollywood", mood: "happy", lang: "Hindi", year: 2003 },
  { type: 'song', title: "Chaiyya Chaiyya", artist: "Sukhwinder Singh", genres: "Bollywood", mood: "happy", lang: "Hindi", year: 1998 },
  { type: 'song', title: "Dil Chahta Hai", artist: "Shankar Mahadevan", genres: "Bollywood", mood: "happy", lang: "Hindi", year: 2001 },
  { type: 'song', title: "Masti", artist: "Mika Singh", genres: "Bhangra", mood: "happy", lang: "Punjabi", year: 2010 },
  { type: 'song', title: "Badtameez Dil", artist: "Benny Dayal", genres: "Bollywood", mood: "happy", lang: "Hindi", year: 2013 },

  // Indian Music - Romantic
  { type: 'song', title: "Tum Hi Ho", artist: "Arijit Singh", genres: "Bollywood", mood: "romantic", lang: "Hindi", year: 2013 },
  { type: 'song', title: "Raabta", artist: "Shreya Ghoshal", genres: "Bollywood", mood: "romantic", lang: "Hindi", year: 2012 },
  { type: 'song', title: "Ae Dil Hai Mushkil", artist: "Arijit Singh", genres: "Bollywood", mood: "romantic", lang: "Hindi", year: 2016 },
  { type: 'song', title: "Pehla Nasha", artist: "Udit Narayan", genres: "Bollywood", mood: "romantic", lang: "Hindi", year: 1992 },
  { type: 'song', title: "Tujh Mein Rab Dikhta Hai", artist: "Shreya Ghoshal", genres: "Bollywood", mood: "romantic", lang: "Hindi", year: 2008 },

  // Indian Music - Sad
  { type: 'song', title: "Agar Tum Saath Ho", artist: "Alka Yagnik", genres: "Bollywood", mood: "sad", lang: "Hindi", year: 2015 },
  { type: 'song', title: "Hamari Adhuri Kahani", artist: "Arijit Singh", genres: "Bollywood", mood: "sad", lang: "Hindi", year: 2015 },
  { type: 'song', title: "Kabhi Jo Badal Barse", artist: "Arijit Singh", genres: "Bollywood", mood: "sad", lang: "Hindi", year: 2014 },
  { type: 'song', title: "Phir Le Aya Dil", artist: "Arijit Singh", genres: "Bollywood", mood: "sad", lang: "Hindi", year: 2012 },
  { type: 'song', title: "Kun Faya Kun", artist: "A.R. Rahman", genres: "Sufi", mood: "sad", lang: "Hindi", year: 2011 },

  // Indian Music - Party
  { type: 'song', title: "Ghungroo", artist: "Arijit Singh", genres: "Bollywood", mood: "party", lang: "Hindi", year: 2019 },
  { type: 'song', title: "London Thumakda", artist: "Labh Janjua", genres: "Bhangra", mood: "party", lang: "Punjabi", year: 2014 },
  { type: 'song', title: "Desi Girl", artist: "Shankar Mahadevan", genres: "Bollywood", mood: "party", lang: "Hindi", year: 2007 },
  { type: 'song', title: "Sheila Ki Jawani", artist: "Sunidhi Chauhan", genres: "Bollywood", mood: "party", lang: "Hindi", year: 2010 },
  { type: 'song', title: "Gallan Goodiyaan", artist: "Yashita Sharma", genres: "Bollywood", mood: "party", lang: "Hindi", year: 2015 },
];

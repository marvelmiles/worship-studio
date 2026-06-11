import type { Song } from "../types";
import { now, uid } from "../lib/id";
import { parseLyrics } from "../lib/parser";

interface SeedInput {
  title: string;
  artist: string;
  category: string;
  themeId: string;
  backgroundId: string;
  lyrics: string;
}

function buildSong(input: SeedInput): Song {
  const song: Song = {
    id: uid(),
    title: input.title,
    artist: input.artist,
    category: input.category,
    defaultThemeId: input.themeId,
    defaultBackgroundId: input.backgroundId,
    defaultAudioId: null,
    lyrics: input.lyrics,
    maxLines: 6,
    createdAt: now(),
    updatedAt: now(),
    deleted: false,
    builtIn: true,
    style: {},
    slides: [],
  };
  song.slides = parseLyrics(input.lyrics, 6);
  return song;
}

const SEED_INPUTS: SeedInput[] = [
  {
    title: "Amazing Grace",
    artist: "John Newton",
    category: "Hymns",
    themeId: "hymnbook",
    backgroundId: "bg-parchment",
    lyrics: `[verse]
Amazing grace how sweet the sound
That saved a wretch like me
I once was lost but now am found
Was blind but now I see

[verse]
'Twas grace that taught my heart to fear
And grace my fears relieved
How precious did that grace appear
The hour I first believed

[verse]
Through many dangers, toils and snares
I have already come
'Tis grace hath brought me safe thus far
And grace will lead me home`,
  },
  {
    title: "Blessed Assurance",
    artist: "Fanny Crosby",
    category: "Worship",
    themeId: "classic",
    backgroundId: "bg-dawn",
    lyrics: `[verse]
Blessed assurance, Jesus is mine
Oh what a foretaste of glory divine
Heir of salvation, purchase of God
Born of His Spirit, washed in His blood

[refrain]
This is my story, this is my song
Praising my Savior all the day long`,
  },
  {
    title: "Holy, Holy, Holy",
    artist: "Reginald Heber",
    category: "Worship",
    themeId: "dark",
    backgroundId: "bg-rays",
    lyrics: `[verse]
Holy, holy, holy! Lord God Almighty!
Early in the morning our song shall rise to Thee
Holy, holy, holy! merciful and mighty!
God in three Persons, blessed Trinity!`,
  },
  {
    title: "It Is Well With My Soul",
    artist: "Horatio Spafford",
    category: "Hymns",
    themeId: "hymnbook",
    backgroundId: "bg-vintage",
    lyrics: `[verse]
When peace like a river attendeth my way
When sorrows like sea billows roll
Whatever my lot, Thou hast taught me to say
It is well, it is well with my soul

[chorus]
It is well with my soul
It is well, it is well with my soul`,
  },
  {
    title: "Great Is Thy Faithfulness",
    artist: "Thomas Chisholm",
    category: "Worship",
    themeId: "classic",
    backgroundId: "bg-heaven",
    lyrics: `[verse]
Great is Thy faithfulness, O God my Father
There is no shadow of turning with Thee
Thou changest not, Thy compassions they fail not
As Thou hast been Thou forever wilt be

[chorus]
Great is Thy faithfulness, great is Thy faithfulness
Morning by morning new mercies I see
All I have needed Thy hand hath provided
Great is Thy faithfulness, Lord, unto me`,
  },
  {
    title: "Come Thou Fount",
    artist: "Robert Robinson",
    category: "Hymns",
    themeId: "hymnbook",
    backgroundId: "bg-parchment",
    lyrics: `[verse]
Come Thou Fount of every blessing
Tune my heart to sing Thy grace
Streams of mercy never ceasing
Call for songs of loudest praise

[verse]
Teach me some melodious sonnet
Sung by flaming tongues above
Praise the mount, I'm fixed upon it
Mount of Thy redeeming love`,
  },
  {
    title: "Crown Him With Many Crowns",
    artist: "Matthew Bridges",
    category: "Praise",
    themeId: "celebration",
    backgroundId: "bg-celebration",
    lyrics: `[verse]
Crown Him with many crowns
The Lamb upon His throne
Hark how the heavenly anthem drowns
All music but its own

[verse]
Awake my soul and sing
Of Him who died for thee
And hail Him as thy matchless King
Through all eternity`,
  },
  {
    title: "Doxology",
    artist: "Thomas Ken",
    category: "Worship",
    themeId: "dark",
    backgroundId: "bg-deep",
    lyrics: `[verse]
Praise God from whom all blessings flow
Praise Him all creatures here below
Praise Him above ye heavenly host
Praise Father, Son, and Holy Ghost`,
  },
];

export function seedSongs(): Song[] {
  return SEED_INPUTS.map(buildSong);
}

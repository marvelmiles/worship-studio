import type { Manuscript } from "../types";
import type { Collection } from "./collections";
import { now, uid } from "../lib/id";
import { parseManuscriptSlides } from "../lib/parser";

interface SeedInput {
  title: string;
  author: string;
  collection: Collection;
  themeId: string;
  backgroundId: string;
  body: string;
}

function buildManuscript(input: SeedInput): Manuscript {
  return {
    id: uid(),
    title: input.title,
    author: input.author,
    collection: input.collection,
    defaultThemeId: input.themeId,
    defaultBackgroundId: input.backgroundId,
    defaultAudioId: null,
    body: input.body,
    maxLines: 6,
    createdAt: now(),
    updatedAt: now(),
    deleted: false,
    builtIn: true,
    style: {},
    slides: parseManuscriptSlides(input.body, { maxLines: 6 }),
  };
}

const SEED_INPUTS: SeedInput[] = [
  {
    title: "Amazing Grace",
    author: "John Newton",
    collection: "Hymns",
    themeId: "hymnbook",
    backgroundId: "bg-parchment",
    body: `[verse]
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
    author: "Fanny Crosby",
    collection: "Worship",
    themeId: "classic",
    backgroundId: "bg-dawn",
    body: `[verse]
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
    author: "Reginald Heber",
    collection: "Worship",
    themeId: "dark",
    backgroundId: "bg-rays",
    body: `[verse]
Holy, holy, holy! Lord God Almighty!
Early in the morning our song shall rise to Thee
Holy, holy, holy! merciful and mighty!
God in three Persons, blessed Trinity!`,
  },
  {
    title: "It Is Well With My Soul",
    author: "Horatio Spafford",
    collection: "Hymns",
    themeId: "hymnbook",
    backgroundId: "bg-vintage",
    body: `[verse]
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
    author: "Thomas Chisholm",
    collection: "Worship",
    themeId: "classic",
    backgroundId: "bg-heaven",
    body: `[verse]
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
    author: "Robert Robinson",
    collection: "Hymns",
    themeId: "hymnbook",
    backgroundId: "bg-parchment",
    body: `[verse]
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
    author: "Matthew Bridges",
    collection: "Praise",
    themeId: "celebration",
    backgroundId: "bg-celebration",
    body: `[verse]
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
    author: "Thomas Ken",
    collection: "Worship",
    themeId: "dark",
    backgroundId: "bg-deep",
    body: `[verse]
Praise God from whom all blessings flow
Praise Him all creatures here below
Praise Him above ye heavenly host
Praise Father, Son, and Holy Ghost`,
  },
];

export function seedManuscripts(): Manuscript[] {
  return SEED_INPUTS.map(buildManuscript);
}

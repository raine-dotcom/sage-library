// Canonical genre shelves shared with Spaces. These are the *identifiers*
// accepted by its library/import-contract.ts; avoid renaming casually.
export const SHELVES=Object.freeze([
  "Fantasy","Science Fiction","Romance","Horror","Mystery & Thriller",
  "Literary Fiction","Poetry","Philosophy","Psychology","Science & Mathematics",
  "History & Society","Nature & Environment","Technology & AI",
  "Personal Growth","Classics","Unclassified"
]);
const VALID=new Set(SHELVES);

// Initial reviewed bibliography: fixed assignments for existing source IDs.
// All future books still enter automatically; explicit source subjects and
// strongly identifiable genre descriptors are used before Unclassified.
const KNOWN=new Map(Object.entries({
  "1984":"Science Fiction",
  "1961-a-canticle-for-leibowitz":"Science Fiction",
  "a-man-called-ove":"Literary Fiction",
  "a-touch-of-darkness":"Romance",
  "annihilation":"Science Fiction",
  "attached-are-you-anxious-avoidant-or-secure-how-the-science-of-adult-attachment-can-help-you-find-and-keep-love":"Psychology",
  "blindsight":"Science Fiction",
  "being-you-a-new-science-of-consciousness-9780571337736":"Science & Mathematics",
  "beyond-the-aquila-rift":"Science Fiction",
  "braiding-sweetgrass-indigenous-wisdom-scientific-knowledge-and-the-teachings-of-plants-epub":"Nature & Environment",
  "does-god-play-dice-the-new-mathematics-of-chaos":"Science & Mathematics",
  "dune":"Science Fiction",
  "dune-messiah":"Science Fiction",
  "echopraxia":"Science Fiction",
  "forbidden-lyrics-wrecked-roommates":"Romance",
  "fourth-wing":"Fantasy",
  "godel-escher-bach-an-eternal-golden-braid":"Science & Mathematics",
  "good-omens":"Fantasy",
  "his-dark-materials-the-complete-trilogy":"Fantasy",
  "house-of-leaves":"Horror",
  "hunting-adeline-cat-and-mouse-duet-book-2":"Romance",
  "learning-to-love-the-spaces-in-between":"Personal Growth",
  "letters-to-a-young-poet":"Poetry",
  "life-3-0-being-human-in-the-age-of-artificial-intelligence":"Technology & AI",
  "lights-out-a-dark-stalker-rom-com":"Romance",
  "liminality-and-the-modern":"History & Society",
  "love-poems-new-directions-paperbook":"Poetry",
  "lovecraft-country":"Horror",
  "discworld-04-mort":"Fantasy",
  "nonlinear-dynamics-and-chaos":"Science & Mathematics",
  "neon-gods":"Romance",
  "night-magic":"Nature & Environment",
  "pratchett-terry-discworld-16-soul-music":"Fantasy",
  "project-hail-mary":"Science Fiction",
  "project-hail-mary-a-novel":"Science Fiction",
  "into-the-drowning-deep":"Horror",
  "rook-rebel":"Romance",
  "slaughterhouse-five-publisher-dell":"Literary Fiction",
  "the-alignment-problem":"Technology & AI",
  "the-body-keeps-the-score":"Psychology",
  "the-book-of-disquiet-penguin-classics":"Philosophy",
  "the-code-of-the-woosters":"Classics",
  "the-daughter-of-sherlock-holmes-a-mystery":"Mystery & Thriller",
  "the-essence-of-chaos-the-jessie-and-john-danz-lecture":"Science & Mathematics",
  "the-hidden-life-of-trees":"Nature & Environment",
  "the-hidden-life-of-trees-1-mysteries-of-nature":"Nature & Environment",
  "the-hour-of-the-star":"Literary Fiction",
  "the-left-hand-of-darkness":"Science Fiction",
  "the-liminal-odyssey-the-alchemical-power-of-the-spaces-in-between":"Personal Growth",
  "the-name-of-the-rose":"Mystery & Thriller",
  "the-ocean-at-the-end-of-the-lane":"Fantasy",
  "the-ritual-a-dark-college-romance":"Romance",
  "the-shadow-of-the-wind":"Literary Fiction",
  "the-snow-queen":"Science Fiction",
  "the-society-of-the-spectacle":"Philosophy",
  "the-starless-sea":"Fantasy",
  "the-summer-queen":"Science Fiction",
  "the-tao-of-physics":"Philosophy",
  "the-three-body-problem":"Science Fiction",
  "the-unbearable-lightness-of-being":"Literary Fiction",
  "the-art-of-gathering-how-we-meet-and-why-it-matters":"Personal Growth",
  "three-men-in-a-boat-amazonclassics-edition":"Classics",
  "tomorrow-and-tomorrow-and-tomorrow-a-novel":"Literary Fiction",
  "twenty-love-poems-and-a-song-of-despair":"Poetry",
  "zodiac-academy-3-the-reckoning-an-academy-bully-romance-supernatural-bullies-and-beasts":"Fantasy",
  "zodiac-academy-ruthless-fae-an-academy-bully-romance":"Fantasy",
  "zodiac-academy-the-awakening-supernatural-bullies-and":"Fantasy",
  "a-court-of-mist-and-fury":"Fantasy",
  "a-court-of-wings-and-ruin":"Fantasy",
  "a-court-of-frost-and-starlight-a-court-of-thorns-and-roses":"Fantasy",
  "hitchhiker-s-guide-to-the-galaxy-01-the-hitchhiker-s-guide-to-the-galaxy-the-trilogy-of-five":"Science Fiction"
}));

// Only strong, explicit genre terms. Avoid guessing from a generic word
// like 'love', 'war', 'science' or the presence of a fantasy character.
const TERMS=[
  [/\b(?:science fiction|sci-fi|space opera|cyberpunk)\b/i,"Science Fiction"],
  [/\b(?:fantasy fiction|high fantasy|epic fantasy|urban fantasy|romantasy)\b/i,"Fantasy"],
  [/\b(?:romance fiction|romantic suspense|romantic comedy|dark romance)\b/i,"Romance"],
  [/\b(?:horror fiction|cosmic horror|gothic horror)\b/i,"Horror"],
  [/\b(?:crime fiction|detective fiction|mystery fiction|psychological thriller)\b/i,"Mystery & Thriller"],
  [/\b(?:literary fiction|contemporary fiction)\b/i,"Literary Fiction"],
  [/\b(?:poetry|poems|verse collection)\b/i,"Poetry"],
  [/\b(?:philosophy|metaphysics|phenomenology)\b/i,"Philosophy"],
  [/\b(?:psychology|psychotherapy|clinical psychology)\b/i,"Psychology"],
  [/\b(?:mathematics|theoretical physics|natural sciences)\b/i,"Science & Mathematics"],
  [/\b(?:history|anthropology|sociology)\b/i,"History & Society"],
  [/\b(?:nature writing|ecology|botany|environmental studies)\b/i,"Nature & Environment"],
  [/\b(?:artificial intelligence|computer science|machine learning)\b/i,"Technology & AI"],
  [/\b(?:personal development|self-help|self improvement)\b/i,"Personal Growth"]
];
export function resolveShelf(book){
  if(book && VALID.has(book.genre) && book.genre!=="Unclassified")return book.genre;
  const explicit=[book?.subjects,book?.subject,book?.categories].flat(Infinity).filter(x=>typeof x==="string").join(" ");
  for(const [re,shelf] of TERMS)if(re.test(explicit))return shelf;
  const known=KNOWN.get(book?.id);
  if(known)return known;
  for(const [re,shelf] of TERMS)if(re.test(String(book?.description||"")))return shelf;
  return "Unclassified";
}

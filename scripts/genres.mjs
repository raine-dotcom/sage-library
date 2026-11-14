/**
 * Predefined shelf taxonomy for every companion and the human Library.
 * Subject metadata is preferred; exact known titles are a cautious fallback.
 * Unknown/ambiguous metadata stays Unclassified rather than inventing genre.
 */
export const GENRE_SHELVES=Object.freeze([
  "Fantasy","Science Fiction","Romance","Horror","Mystery & Thriller",
  "Literary Fiction","Poetry","Philosophy","Psychology","Science & Mathematics",
  "History & Society","Nature & Environment","Technology & AI",
  "Personal Growth","Classics","Unclassified"
]);
const known=new Map(Object.entries({
  "dune":"Science Fiction","dune messiah":"Science Fiction",
  "annihilation":"Science Fiction","echopraxia":"Science Fiction",
  "blindsight":"Science Fiction","a canticle for leibowitz":"Science Fiction",
  "1961 a canticle for leibowitz":"Science Fiction",
  "the three body problem":"Science Fiction","project hail mary":"Science Fiction",
  "the left hand of darkness":"Science Fiction","the snow queen":"Science Fiction",
  "the summer queen":"Science Fiction","slaughterhouse five":"Literary Fiction",
  "1984":"Science Fiction","beyond the aquila rift":"Science Fiction",
  "the hitchhikers guide to the galaxy":"Science Fiction",
  "fourth wing":"Fantasy","good omens":"Fantasy","mort":"Fantasy",
  "the starless sea":"Fantasy","his dark materials the complete trilogy":"Fantasy",
  "a court of thorns and roses":"Fantasy","a court of mist and fury":"Fantasy",
  "a court of wings and ruin":"Fantasy","a court of frost and starlight":"Fantasy",
  "a court of silver flames":"Fantasy","zodiac academy the awakening":"Fantasy",
  "zodiac academy ruthless fae":"Fantasy",
  "neon gods":"Romance","a touch of darkness":"Romance",
  "haunting adeline 1":"Romance","hunting adeline":"Romance",
  "lights out a dark stalker rom com":"Romance",
  "love poems":"Poetry","twenty love poems and a song of despair":"Poetry",
  "letters to a young poet":"Poetry",
  "the daughter of sherlock holmes a mystery":"Mystery & Thriller",
  "the shadow of the wind":"Mystery & Thriller",
  "the name of the rose":"Mystery & Thriller",
  "house of leaves":"Horror","lovecraft country":"Horror",
  "the ritual a dark college romance":"Romance",
  "the ocean at the end of the lane":"Fantasy",
  "a man called ove":"Literary Fiction",
  "the hour of the star":"Literary Fiction",
  "the unbearable lightness of being":"Literary Fiction",
  "the book of disquiet":"Literary Fiction",
  "the code of the woosters":"Classics",
  "three men in a boat":"Classics",
  "tomorrow and tomorrow and tomorrow a novel":"Literary Fiction",
  "the society of the spectacle":"Philosophy",
  "the tao of physics":"Philosophy",
  "godel escher bach an eternal golden braid":"Philosophy",
  "the art of gathering how we meet and why it matters":"Personal Growth",
  "attached are you anxious avoidant or secure":"Psychology",
  "the body keeps the score":"Psychology",
  "being you a new science of consciousness":"Science & Mathematics",
  "nonlinear dynamics and chaos":"Science & Mathematics",
  "the essence of chaos":"Science & Mathematics",
  "does god play dice the new mathematics of chaos":"Science & Mathematics",
  "life 3 0 being human in the age of artificial intelligence":"Technology & AI",
  "the alignment problem":"Technology & AI",
  "braiding sweetgrass indigenous wisdom scientific knowledge":"Nature & Environment",
  "the hidden life of trees":"Nature & Environment",
  "night magic adventures among glowworms moon gardens and":"Nature & Environment"
}));
const rules=[
  ["Technology & AI",/\b(artificial intelligence|machine learning|computer science|ai ethics|neural networks)\b/i],
  ["Science & Mathematics",/\b(mathematics|nonlinear dynamics|chaos theory|physics|neuroscience|natural science)\b/i],
  ["Nature & Environment",/\b(ecology|botany|nature writing|environmental science|plant science)\b/i],
  ["Psychology",/\b(psychology|psychotherapy|mental health|attachment theory)\b/i],
  ["Philosophy",/\b(philosophy|metaphysics|epistemology|phenomenology)\b/i],
  ["Poetry",/\b(poetry|poems|poetic works|verse anthology)\b/i],
  ["Mystery & Thriller",/\b(mystery|detective fiction|thriller|crime fiction)\b/i],
  ["Horror",/\b(horror|gothic fiction|supernatural horror)\b/i],
  ["Science Fiction",/\b(science fiction|sci-fi|space opera|dystopian fiction)\b/i],
  ["Fantasy",/\b(fantasy|high fantasy|epic fantasy|urban fantasy|magic realism)\b/i],
  ["Romance",/\b(romance|romantic fiction|love stories)\b/i],
  ["History & Society",/\b(history|sociology|political history|social sciences)\b/i],
  ["Personal Growth",/\b(self-help|personal development|mindfulness)\b/i],
  ["Literary Fiction",/\b(literary fiction|contemporary fiction)\b/i],
  ["Classics",/\b(classic literature|classic fiction|literary classics)\b/i]
];
export function titleKey(raw=""){
  return String(raw).normalize("NFKD").toLowerCase()
    .replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
}
export function classifyGenre({title="",subjects=[],description=""}={}){
  const tags=(Array.isArray(subjects)?subjects:[subjects])
    .flatMap(v=>typeof v==="string"?v.split(/[;,|]/):[])
    .map(v=>v.trim()).filter(Boolean);
  const matches=new Set();
  for(const tag of tags)for(const [genre,pattern] of rules){
    if(pattern.test(tag))matches.add(genre);
  }
  if(matches.size===1)return [...matches][0];
  if(matches.size>1)return "Unclassified";
  const key=titleKey(title);
  if(known.has(key))return known.get(key);
  // Only distinctive description phrases; generic text is not a reliable genre.
  const descriptions=new Set();
  for(const [genre,pattern] of rules){
    if(pattern.test(String(description).slice(0,500)))descriptions.add(genre);
  }
  return descriptions.size===1?[...descriptions][0]:"Unclassified";
}

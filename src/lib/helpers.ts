export function getRandomQuote() {
  const quotes = [
    {
      text: `GoBuddy har hjulpet mig med at møde nye mennesker i byen. 
      Nu har jeg faste aktiviteter med nye venner hver uge. Anbefales til dem, der vil udvide deres sociale cirkel.`,
      author: "Søren Hansen",
      image: "https://images.unsplash.com/photo-1648805498318-4c368161bea6",
    },
  ];
  return quotes[Math.floor(Math.random() * quotes.length)];
}

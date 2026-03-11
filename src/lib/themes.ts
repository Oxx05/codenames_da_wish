export type ThemeId = 'pokemon' | 'superheroes' | 'harrypotter' | 'rickandmorty' | 'dogs' | 'countries' | 'digimon' | 'gameofthrones' | 'invizimals' | 'classicwords' | 'classicwords_pt' | 'starwars' | 'onepiece' | 'naruto' | 'animals';

export interface ThemeItem {
  id: number;
  name: string;
  image: string | null;
}

export interface Theme {
  id: ThemeId;
  name: string;
  loaderText: string;
  maxCards?: number; // Maximum number of unique cards this theme can provide
  fetchData: () => Promise<ThemeItem[]>;
}

export const themes: Record<ThemeId, Theme> = {
  pokemon: {
    id: 'pokemon',
    name: 'Pokémon',
    loaderText: 'Catching Pokémon...',
    maxCards: 60, // Capped for mobile legibility
    fetchData: async () => {
      const generations = [151, 100, 135, 107, 156];
      const maxId = generations.reduce((a, b) => a + b, 0);
      const chosenIds = new Set<number>();
      while (chosenIds.size < 60) {
        chosenIds.add(Math.floor(Math.random() * maxId) + 1);
      }
      return Promise.all(
        Array.from(chosenIds).map(async (id) => {
          const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
          const p = await res.json();
          // Prefer official artwork, fallback to default sprite
          const image = p.sprites.other['official-artwork']?.front_default || p.sprites.front_default;
          return { id: p.id, name: p.name, image };
        })
      );
    }
  },
  superheroes: {
    id: 'superheroes',
    name: 'Super Heroes',
    loaderText: 'Assembling Heroes...',
    maxCards: 60,
    fetchData: async () => {
      const res = await fetch('https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.2.0/api/all.json');
      const all: any[] = await res.json();
      const shuffled = all.sort(() => 0.5 - Math.random()).slice(0, 60);
      return shuffled.map(h => ({ id: h.id, name: h.name, image: h.images.md }));
    }
  },
  harrypotter: {
    id: 'harrypotter',
    name: 'Harry Potter',
    loaderText: 'Casting Spells...',
    maxCards: 60,
    fetchData: async () => {
      const res = await fetch('https://hp-api.onrender.com/api/characters');
      const all: any[] = await res.json();
      // Include all characters, not just those with images
      const shuffled = all.sort(() => 0.5 - Math.random()).slice(0, 60);
      return shuffled.map((c, i) => ({ id: i, name: c.name, image: c.image || null }));
    }
  },
  rickandmorty: {
    id: 'rickandmorty',
    name: 'Rick & Morty',
    loaderText: 'Opening Portals...',
    maxCards: 60,
    fetchData: async () => {
      const randomPages = [1, 2, 3, 4].sort(() => 0.5 - Math.random()).slice(0, 3);
      let all: any[] = [];
      for (const page of randomPages) {
        const res = await fetch(`https://rickandmortyapi.com/api/character/?page=${page}`);
        const data = await res.json();
        all = all.concat(data.results);
      }
      return all.slice(0, 60).map(c => ({ id: c.id, name: c.name, image: c.image }));
    }
  },
  dogs: {
    id: 'dogs',
    name: 'Cute Dogs',
    loaderText: 'Fetching Dogs...',
    maxCards: 50, // API allows fetching random 50
    fetchData: async () => {
      const res = await fetch('https://dog.ceo/api/breeds/image/random/50');
      const data = await res.json();
      return data.message.map((url: string, i: number) => {
        let nameMatch = url.match(/breeds\/([^\/]+)/);
        let name = nameMatch ? nameMatch[1].replace('-', ' ') : 'Dog';
        return { id: i, name, image: url };
      });
    }
  },
  countries: {
    id: 'countries',
    name: 'Countries / Flags',
    loaderText: 'Boarding Flights...',
    maxCards: 60,
    fetchData: async () => {
      const res = await fetch('https://restcountries.com/v3.1/all?fields=name,flags');
      const all: any[] = await res.json();
      const shuffled = all.sort(() => 0.5 - Math.random()).slice(0, 60);
      return shuffled.map((c, i) => ({
        id: i,
        name: c.name.common,
        image: c.flags.svg || c.flags.png
      }));
    }
  },
  digimon: {
    id: 'digimon',
    name: 'Digimon',
    loaderText: 'Digivolving...',
    maxCards: 60,
    fetchData: async () => {
      const res = await fetch('https://digi-api.com/api/v1/digimon?pageSize=50');
      const data = await res.json();
      const items = data.content || [];
      return items.map((d: any) => ({
        id: d.id,
        name: d.name,
        image: d.image
      }));
    }
  },
  gameofthrones: {
    id: 'gameofthrones',
    name: 'Game of Thrones',
    loaderText: 'Winter is Coming...',
    maxCards: 53,
    fetchData: async () => {
      const res = await fetch('https://thronesapi.com/api/v2/Characters');
      const all: any[] = await res.json();
      const shuffled = all.sort(() => 0.5 - Math.random()).slice(0, 60);
      return shuffled.map(c => ({ id: c.id, name: c.fullName, image: c.imageUrl }));
    }
  },
  invizimals: {
    id: 'invizimals',
    name: 'Invizimals',
    loaderText: 'A invocar Invizimals...',
    maxCards: 73,
    fetchData: async () => {
      const words = [
        "STINGWING", "FLAMECLAW", "TIGERSHARK", "ICELION", "JETCRAB",
        "PORCUPAIN", "TOXITOAD", "BRATBAT", "SNAPPER", "SKYTALON",
        "FIRECRACKER", "MOBULA", "SIREN", "VIPERA", "RATTLERAPTOR",
        "MOONHOWLER", "METALMUTT", "IRONBUG", "FURMIN", "TUSKER",
        "TUNDERWULFE", "KRAKEN", "ZAPHYRA", "SALMA", "SCALINHA",
        "SKYSAUR", "PHALAMOS", "ROARHIDE", "MOBY", "BONESHELL",
        "HILLTOPPER", "HYDRA", "DRACO", "SABRETOOTH", "KRILLER",
        "GOTICA", "AXOLOTL", "OCELOTL", "GRIFFONATOR", "DRAGÃO DO DESERTO",
        "BULLHORN", "BONGORILLA", "BEATWIDOW", "BANDOLERO",
        "CHUPACABRA", "CERBERUS", "AUDREY", "BONESNAPPER",
        "XIONG MAO", "UBERJACKAL", "NESSIE", "DRAGÃO ESTELAR",
        "CHOP CHOP", "HIPPOROCK", "VENOMWEB", "MOONSTRUCK",
        "MAGMATUN", "SHADOWFOX", "GRYPHON", "SPECTRODON",
        "FROSTBITE", "THUNDERHAWK", "LAVARAPTOR", "AQUAZOID",
        "SANDSTORM", "NIGHTCLAW", "IRONJAW", "CRYSTALWING",
        "BLAZETOOTH", "MUDSLINGER", "VOLTFANG", "STORMRIDER",
        "GHOSTSHARK", "CORALCRAB", "TERRADON", "EMBERWOLF"
      ];
      return words.map((w, i) => ({ id: i, name: w, image: null }));
    }
  },
  classicwords: {
    id: 'classicwords',
    name: 'Classic Words (EN)',
    loaderText: 'Shuffling Words...',
    maxCards: 60,
    fetchData: async () => {
      const res = await fetch('https://raw.githubusercontent.com/jbowens/codenames/master/assets/original.txt');
      const text = await res.text();
      const allWords = text.split('\n').map(w => w.trim()).filter(w => w.length > 0);
      const shuffled = allWords.sort(() => 0.5 - Math.random()).slice(0, 200); // 200 for EN words because they are light
      return shuffled.map((w, i) => ({ id: i, name: w, image: null }));
    }
  },
  classicwords_pt: {
    id: 'classicwords_pt',
    name: 'Classic Words (PT)',
    loaderText: 'A baralhar palavras...',
    maxCards: 60,
    fetchData: async () => {
      const words = [
        "ÁFRICA", "AGENTE", "ÁGUA", "ÁGUIA", "AGULHA", "ALEMANHA", "ALGODÃO", "ALPES", "ALVO", "AMAZÓNIA",
        "AMÉRICA", "ANEL", "ANJO", "ANTÁRCTIDA", "ANÃO", "AQUÁRIO", "ARANHA", "ARCO", "ARTE", "ASSASSINO",
        "ATLÂNTIDA", "AUSTRÁLIA", "AZTECA", "AZUL", "AÇO", "BAILE", "BALA", "BALANÇA", "BALÃO", "BANCO",
        "BANDEIRA", "BANDA", "BAR", "BARCO", "BASE", "BATERIA", "BATMAN", "BERLIM", "BERMUDA", "BOMBA",
        "BRASIL", "BRUXA", "CÂMARA", "CAMPO", "CANAL", "CANETA", "CAPITAL", "CARRO", "CASA", "CASTELO",
        "CAVALO", "CENTRO", "CHINA", "CIÊNCIA", "CINEMA", "COBRA", "COMETA", "CORAÇÃO", "COROA", "CRIANÇA",
        "DADO", "DESERTO", "DIAMANTE", "DINOSSAURO", "DOUTOR", "DRAGÃO", "EGITO", "ELEFANTE", "ESCOLA", "ESPADA",
        "ESPIÃO", "ESTRELA", "FADA", "FERRO", "FOGO", "FONTE", "FRANCE", "GATO", "GIGANTE", "GELO",
        "GUERRA", "GUITARRA", "HERÓI", "HOSPITAL", "ILHA", "ÍNDIA", "JARDIM", "JOGO", "JÚPITER", "LAVA",
        "LEÃO", "LIVRO", "LOBO", "LONDRES", "LUA", "MÁQUINA", "MAPA", "MONTANHA", "MONSTRO", "MUNDO",
        "NAVIO", "NEVE", "NINJA", "NOITE", "OCEANO", "OURO", "PALÁCIO", "PARIS", "PIRATA", "PLANETA",
        "PLANTA", "PONTE", "PORTA", "PRAIA", "PRINCESA", "RAINHA", "REI", "RIO", "ROBÔ", "ROMA"
      ];
      return words.map((w, i) => ({ id: i, name: w, image: null }));
    }
  },
  starwars: {
    id: 'starwars',
    name: 'Star Wars',
    loaderText: 'The Force is loading...',
    maxCards: 80,
    fetchData: async () => {
      const names: { name: string; id: number }[] = [];
      for (let page = 1; page <= 4; page++) {
        try {
          const res = await fetch(`https://swapi.dev/api/people/?page=${page}`);
          const data = await res.json();
          data.results.forEach((p: any) => {
            const urlParts = p.url.replace(/\/$/, '').split('/');
            const charId = parseInt(urlParts[urlParts.length - 1]);
            names.push({ name: p.name, id: charId });
          });
        } catch { break; }
      }
      const shuffled = names.sort(() => 0.5 - Math.random()).slice(0, 60); // SWAPI is slow, limiting a bit but more than 60
      return shuffled.map((item, i) => ({
        id: i,
        name: item.name,
        image: `https://starwars-visualguide.com/assets/img/characters/${item.id}.jpg`
      }));
    }
  },
  onepiece: {
    id: 'onepiece',
    name: 'One Piece',
    loaderText: 'Setting sail...',
    maxCards: 100,
    fetchData: async () => {
      try {
        // Try fetching from API with images
        const res = await fetch('https://api.api-onepiece.com/v2/characters/en?limit=100');
        const data = await res.json();
        const chars = Array.isArray(data) ? data : data.characters || data.data || [];
        if (chars.length > 0) {
          const shuffled = chars.sort(() => 0.5 - Math.random()).slice(0, 60);
          return shuffled.map((c: any, i: number) => ({
            id: i,
            name: (c.name || c.english_name || 'Unknown').toUpperCase(),
            image: c.image || c.picture || c.img || null
          }));
        }
      } catch { /* fallback below */ }
      // Fallback: text-only with hardcoded list
      const characters = [
        "LUFFY", "ZORO", "NAMI", "USOPP", "SANJI", "CHOPPER", "ROBIN", "FRANKY", "BROOK", "JINBE",
        "SHANKS", "BLACKBEARD", "ACE", "SABO", "DRAGON", "GARP", "AKAINU", "AOKIJI", "KIZARU", "FUJITORA",
        "KAIDO", "BIG MOM", "DOFLAMINGO", "CROCODILE", "MIHAWK", "BUGGY", "BOA HANCOCK", "LAW", "KID",
        "WHITEBEARD", "ROGER", "RAYLEIGH", "COBY", "SMOKER", "TASHIGI", "VIVI", "YAMATO", "CARROT",
        "KATAKURI", "MARCO", "IVANKOV", "KUMA", "MORIA", "ARLONG", "ENEL", "CAESAR", "MAGELLAN",
        "IMPEL DOWN", "ALABASTA", "WANO", "SKYPIEA", "WATER 7", "THRILLER BARK", "DRESSROSA",
        "WHOLE CAKE", "MARINEFORD", "SABAODY", "FISHMAN ISLAND", "PUNK HAZARD", "ENIES LOBBY"
      ];
      return characters.sort(() => 0.5 - Math.random()).slice(0, 60).map((name, i) => ({ id: i, name, image: null }));
    }
  },
  naruto: {
    id: 'naruto',
    name: 'Naruto',
    loaderText: 'Summoning jutsu...',
    maxCards: 100,
    fetchData: async () => {
      try {
        const res = await fetch('https://dattebayo-api.onrender.com/characters?limit=100');
        const data = await res.json();
        const chars = data.characters || data || [];
        const shuffled = chars.sort(() => 0.5 - Math.random()).slice(0, 60);
        return shuffled.map((c: any, i: number) => ({
          id: i,
          name: c.name || 'Unknown',
          image: (c.images && c.images[0]) || null
        }));
      } catch {
        // Fallback to text-only list
        const characters = [
          "NARUTO", "SASUKE", "SAKURA", "KAKASHI", "ITACHI", "GAARA", "HINATA", "ROCK LEE", "NEJI",
          "SHIKAMARU", "INO", "CHOJI", "KIBA", "SHINO", "TENTEN", "GUY", "TSUNADE", "JIRAIYA", "OROCHIMARU",
          "MINATO", "KUSHINA", "OBITO", "MADARA", "HASHIRAMA", "TOBIRAMA", "HIRUZEN", "PAIN", "KONAN",
          "NAGATO", "DEIDARA", "SASORI", "HIDAN", "KAKUZU", "KISAME", "ZETSU", "TOBI", "KABUTO",
          "KILLER BEE", "RAIKAGE", "KAZEKAGE", "MIZUKAGE", "TSUCHIKAGE", "DANZO", "SAI", "YAMATO",
          "TEMARI", "KANKURO", "ZABUZA", "HAKU", "ASUMA"
        ];
        return characters.sort(() => 0.5 - Math.random()).slice(0, 60).map((name, i) => ({ id: i, name, image: null }));
      }
    }
  },
  animals: {
    id: 'animals',
    name: 'Animals',
    loaderText: 'Gathering creatures...',
    maxCards: 50,
    fetchData: async () => {
      // Use random fox API + Dog API for mixed animal images
      const results: ThemeItem[] = [];
      try {
        // 25 dogs
        const dogs = await fetch('https://dog.ceo/api/breeds/image/random/25');
        const dogData = await dogs.json();
        dogData.message.forEach((url: string, i: number) => {
          const match = url.match(/breeds\/([^\/]+)/);
          results.push({ id: i, name: match ? match[1].replace('-', ' ') : 'Dog', image: url });
        });
        // 25 cats
        const cats = await fetch('https://api.thecatapi.com/v1/images/search?limit=25');
        const catData = await cats.json();
        catData.forEach((c: any, i: number) => {
          results.push({ id: 25 + i, name: `Cat ${i + 1}`, image: c.url });
        });
      } catch {
        // Fallback text-only
        const animals = ["LION","TIGER","ELEPHANT","GIRAFFE","ZEBRA","PANDA","KOALA","KANGAROO","PENGUIN","EAGLE",
          "DOLPHIN","WHALE","SHARK","OCTOPUS","JELLYFISH","SEAHORSE","TURTLE","CROCODILE","SNAKE","LIZARD",
          "WOLF","FOX","BEAR","DEER","RABBIT","SQUIRREL","HEDGEHOG","OWL","PARROT","FLAMINGO",
          "GORILLA","CHIMPANZEE","ORANGUTAN","LEMUR","BAT","OTTER","SEAL","WALRUS","POLAR BEAR","MOOSE",
          "CHEETAH","LEOPARD","JAGUAR","LYNX","PANTHER","HYENA","MEERKAT","CAPYBARA","AXOLOTL","PLATYPUS"];
        return animals.map((name, i) => ({ id: i, name, image: null }));
      }
      return results.sort(() => 0.5 - Math.random()).slice(0, 50);
    }
  }
};

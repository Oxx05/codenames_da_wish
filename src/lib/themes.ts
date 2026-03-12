export type ThemeId = 'pokemon' | 'superheroes' | 'harrypotter' | 'rickandmorty' | 'dogs' | 'countries' | 'digimon' | 'gameofthrones' | 'invizimals' | 'classicwords' | 'classicwords_pt' | 'starwars' | 'onepiece' | 'naruto' | 'animals' | 'leagueoflegends' | 'disney' | 'dota2' | 'harrypotter_spells' | 'lotr' | 'cities' | 'animals_kids' | 'foods' | 'mythology' | 'tech';

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
    name: 'Animals (EN)',
    loaderText: 'Going on Safari...',
    maxCards: 60,
    fetchData: async () => {
      const words = [
        "LION", "TIGER", "BEAR", "ELEPHANT", "GIRAFFE", "ZEBRA", "MONKEY", "GORILLA", "KANGAROO", "KOALA",
        "PANDA", "WOLF", "FOX", "DEER", "MOOSE", "RABBIT", "SQUIRREL", "MOUSE", "RAT", "BAT",
        "EAGLE", "HAWK", "OWL", "PARROT", "PENGUIN", "OSTRICH", "PEACOCK", "SWAN", "DUCK", "GOOSE",
        "SHARK", "WHALE", "DOLPHIN", "OCTOPUS", "SQUID", "CRAB", "LOBSTER", "STARFISH", "SEAL", "WALRUS",
        "SNAKE", "LIZARD", "TURTLE", "CROCODILE", "ALLIGATOR", "FROG", "TOAD", "SALAMANDER", "BUTTERFLY", "BEE",
        "ANT", "SPIDER", "SCORPION", "SNAIL", "WORM", "HORSE", "COW", "PIG", "SHEEP", "GOAT",
        "DOG", "CAT", "CHICKEN", "TURKEY", "DONKEY", "CAMEL", "LLAMA", "ALPACA", "CHEETAH", "LEOPARD",
        "PANTHER", "JAGUAR", "RHINO", "HIPPO", "SLOTH", "ARMADILLO", "PORCUPINE", "HEDGEHOG", "BEAVER", "OTTER",
        "BADGER", "WEASEL", "FERRET", "MINK", "RACCOON", "SKUNK", "MEERKAT", "MONGOOSE", "LEMUR", "IGUANA"
      ];
      return words.map((w, i) => ({ id: i, name: w, image: null }));
    }
  },
  leagueoflegends: {
    id: 'leagueoflegends',
    name: 'League of Legends',
    loaderText: 'Welcome to Summoner\'s Rift...',
    maxCards: 100,
    fetchData: async () => {
      const versionRes = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
      const versions = await versionRes.json();
      const latestVersion = versions[0];
      const res = await fetch(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion.json`);
      const data = await res.json();
      const champions = Object.values(data.data) as any[];
      const shuffled = champions.sort(() => 0.5 - Math.random()).slice(0, 100);
      return shuffled.map((c, i) => ({
        id: i,
        name: c.name,
        image: `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/champion/${c.image.full}`
      }));
    }
  },
  disney: {
    id: 'disney',
    name: 'Disney Characters',
    loaderText: 'Sprinkling Pixie Dust...',
    maxCards: 60,
    fetchData: async () => {
      let chars: any[] = [];
      const pages = [1, 2, 3, 4, 5].sort(() => 0.5 - Math.random()).slice(0, 3);
      for (const p of pages) {
        try {
          const res = await fetch(`https://api.disneyapi.dev/character?page=${p}&pageSize=50`);
          const data = await res.json();
          chars = chars.concat(data.data.filter((c: any) => c.imageUrl));
        } catch {}
      }
      const shuffled = chars.sort(() => 0.5 - Math.random()).slice(0, 60);
      return shuffled.map((c, i) => ({
        id: i,
        name: c.name,
        image: c.imageUrl
      }));
    }
  },
  dota2: {
    id: 'dota2',
    name: 'Dota 2 Heroes',
    loaderText: 'Defending the Ancients...',
    maxCards: 60,
    fetchData: async () => {
      const res = await fetch('https://api.opendota.com/api/heroes');
      const data = await res.json();
      const shuffled = data.sort(() => 0.5 - Math.random()).slice(0, 60);
      return shuffled.map((h: any, i: number) => ({ id: i, name: h.localized_name, image: null }));
    }
  },
  harrypotter_spells: {
    id: 'harrypotter_spells',
    name: 'Harry Potter Spells',
    loaderText: 'Lumos...',
    maxCards: 60,
    fetchData: async () => {
      const res = await fetch('https://hp-api.onrender.com/api/spells');
      const data = await res.json();
      const shuffled = data.sort(() => 0.5 - Math.random()).slice(0, 60);
      return shuffled.map((s: any, i: number) => ({ id: i, name: s.name, image: null }));
    }
  },
  lotr: {
    id: 'lotr',
    name: 'Lord of the Rings',
    loaderText: 'Entering Mordor...',
    maxCards: 55,
    fetchData: async () => {
      const words = [
        "FRODO", "SAM", "GANDALF", "ARAGORN", "LEGOLAS", "GIMLI", "BOROMIR", "MERRY", "PIPPIN", "GOLLUM",
        "SAURON", "SARUMAN", "ELROND", "GALADRIEL", "ARWEN", "EOWYN", "EOMER", "THEODEN", "FARAMIR", "BILBO",
        "TREEBEARD", "SMAUG", "RING", "HOBBIT", "SHIRE", "RIVENDELL", "MORDOR", "GONDOR", "ROHAN", "ISENGARD",
        "ORC", "GOBLIN", "TROLL", "BALROG", "ELF", "DWARF", "ENT", "WIZARD", "NAZGUL", "EAGLE",
        "STING", "MITHRIL", "ANDURIL", "PALANTIR", "MINAS TIRITH", "HELM'S DEEP", "MOUNT DOOM", "FELLOWSHIP", "TWO TOWERS", "RETURN OF THE KING",
        "SHADOWFAX", "WITCH-KING", "BREE", "PRANCING PONY", "LORIEN"
      ];
      return words.sort(() => 0.5 - Math.random()).map((w, i) => ({ id: i, name: w, image: null }));
    }
  },
  cities: {
    id: 'cities',
    name: 'World Cities',
    loaderText: 'Boarding Flights...',
    maxCards: 80,
    fetchData: async () => {
      const words = [
        "PARIS", "LONDON", "NEW YORK", "TOKYO", "ROME", "BERLIN", "MADRID", "BEIJING", "MOSCOW", "SYDNEY",
        "CAIRO", "RIO DE JANEIRO", "BUENOS AIRES", "CAPE TOWN", "MUMBAI", "DUBAI", "SINGAPORE", "HONG KONG", "BANGKOK", "SEOUL",
        "TORONTO", "LOS ANGELES", "CHICAGO", "MEXICO CITY", "LIMA", "BOGOTA", "SANTIAGO", "CARACAS", "HAVANA", "LISBON",
        "BARCELONA", "AMSTERDAM", "VIENNA", "PRAGUE", "BUDAPEST", "WARSAW", "STOCKHOLM", "OSLO", "COPENHAGEN", "HELSINKI",
        "ATHENS", "ISTANBUL", "JERUSALEM", "DELHI", "JAKARTA", "MANILA", "KUALA LUMPUR", "MELBOURNE", "AUCKLAND", "JOHANNESBURG",
        "NAIROBI", "LAGOS", "DAKAR", "CASABLANCA", "ALGIERS", "TEHRAN", "RIYADH", "BAGHDAD", "KABUL", "ISLAMABAD",
        "COLOMBO", "KATHMANDU", "HANOI", "TAIPEI", "SHANGHAI", "OSAKA", "KYOTO", "BRISBANE", "PERTH", "VANCOUVER",
        "MONTREAL", "MIAMI", "SAN FRANCISCO", "SEATTLE", "BOSTON", "WASHINGTON", "PHILADELPHIA", "DALLAS", "HOUSTON", "ATLANTA"
      ];
      return words.sort(() => 0.5 - Math.random()).map((w, i) => ({ id: i, name: w, image: null }));
    }
  },
  animals_kids: {
    id: 'animals_kids',
    name: 'Animais (PT)',
    loaderText: 'A ir para o Safari...',
    maxCards: 60,
    fetchData: async () => {
      const words = [
        "LEÃO", "TIGRE", "URSO", "ELEFANTE", "GIRAFA", "ZEBRA", "MACACO", "GORILA", "CANGURU", "COALA",
        "PANDA", "LOBO", "RAPOSA", "VEADO", "ALCE", "COELHO", "ESQUILO", "RATO", "MORCEGO", "ÁGUIA",
        "FALCÃO", "CORUJA", "PAPAGAIO", "PINGUIM", "AVESTRUZ", "PAVÃO", "CISNE", "PATO", "GANSO", "TUBARÃO",
        "BALEIA", "GOLFINHO", "POLVO", "LULA", "CARANGUEJO", "LAGOSTA", "FOCA", "MORSA", "COBRA", "LAGARTO",
        "TARTARUGA", "CROCODILO", "JACARÉ", "SAPO", "RÃ", "SALAMANDRA", "BORBOLETA", "ABELHA", "FORMIGA", "ARANHA",
        "ESCORPIÃO", "CARACOL", "MINHOCA", "CAVALO", "VACA", "PORCO", "OVELHA", "CABRA", "CÃO", "GATO"
      ];
      return words.sort(() => 0.5 - Math.random()).map((w, i) => ({ id: i, name: w, image: null }));
    }
  },
  foods: {
    id: 'foods',
    name: 'Food & Cooking',
    loaderText: 'Cooking Dinner...',
    maxCards: 80,
    fetchData: async () => {
      const words = [
        "PIZZA", "BURGER", "PASTA", "SUSHI", "MESA", "CHAIR", "APPLE", "BANANA", "ORANGE", "GRAPE",
        "STRAWBERRY", "WATERMELON", "PINEAPPLE", "MANGO", "PEACH", "CHERRY", "TOMATO", "POTATO", "ONION", "GARLIC",
        "CARROT", "BROCCOLI", "SPINACH", "MUSHROOM", "CORN", "BREAD", "CHEESE", "MILK", "BUTTER", "EGG",
        "CHICKEN", "BEEF", "PORK", "FISH", "SHRIMP", "RICE", "BEANS", "CEREAL", "OATMEAL", "PANCAKE",
        "WAFFLE", "SYRUP", "HONEY", "JAM", "PEANUT BUTTER", "JELLY", "CHOCOLATE", "VANILLA", "ICE CREAM", "COOKIES",
        "CAKE", "PIE", "CANDY", "GUM", "SODA", "WATER", "JUICE", "TEA", "COFFEE", "WINE",
        "BEER", "VODKA", "RUM", "WHISKEY", "SALT", "PEPPER", "SUGAR", "FLOUR", "OIL", "VINEGAR",
        "MUSTARD", "KETCHUP", "MAYO", "SOY SAUCE", "HOT SAUCE", "SALAD", "SOUP", "SANDWICH", "TACO", "BURRITO"
      ];
      return words.sort(() => 0.5 - Math.random()).map((w, i) => ({ id: i, name: w, image: null }));
    }
  },
  mythology: {
    id: 'mythology',
    name: 'Mythology',
    loaderText: 'Consulting Oracles...',
    maxCards: 75,
    fetchData: async () => {
      const words = [
        "ZEUS", "POSEIDON", "HADES", "HERA", "ATHENA", "ARES", "APOLLO", "ARTEMIS", "APHRODITE", "HERMES",
        "HEPHAESTUS", "DIONYSUS", "PERSEPHONE", "DEMETER", "HESTIA", "ACHILLES", "HERCULES", "THESEUS", "PERSEUS", "ODYSSEUS",
        "MEDUSA", "MINOTAUR", "HYDRA", "CERBERUS", "PEGASUS", "CENTAUR", "CYCLOPS", "SIREN", "SPHINX", "GRIFFIN",
        "ODIN", "THOR", "LOKI", "FREYA", "BALDER", "TYR", "HEIMDALL", "FENRIR", "JORMUNGANDR", "VALKYRIE",
        "ASGARD", "VALHALLA", "RAGNAROK", "YGGDRASIL", "MJOLNIR", "RA", "OSIRIS", "ISIS", "HORUS", "ANUBIS",
        "THOTH", "SET", "BASTET", "SOBEK", "PTAH", "PHARAOH", "PYRAMID", "MUMMY", "SCARAB", "NILE",
        "NIMROD", "GILGAMESH", "ENKIDU", "ISHTAR", "MARDUK", "TIAMAT", "BABA YAGA", "KITSUNE", "TENGU", "ONI",
        "DRAGON", "PHOENIX", "UNICORN", "MERMAID", "KRAKEN"
      ];
      return words.sort(() => 0.5 - Math.random()).map((w, i) => ({ id: i, name: w, image: null }));
    }
  },
  tech: {
    id: 'tech',
    name: 'Tech & Code',
    loaderText: 'Compiling Code...',
    maxCards: 80,
    fetchData: async () => {
      const words = [
        "COMPUTER", "LAPTOP", "PHONE", "TABLET", "KEYBOARD", "MOUSE", "MONITOR", "SCREEN", "PRINTER", "SCANNER",
        "SERVER", "DATABASE", "CLOUD", "NETWORK", "ROUTER", "MODEM", "WIFI", "INTERNET", "WEBSITE", "DOMAIN",
        "CODE", "SOFTWARE", "HARDWARE", "BUG", "VIRUS", "HACKER", "PASSWORD", "ENCRYPTION", "BINARY", "ALGORITHM",
        "PYTHON", "JAVASCRIPT", "JAVA", "C++", "HTML", "CSS", "PHP", "SQL", "RUBY", "SWIFT",
        "REACT", "ANGULAR", "VUE", "NODE", "EXPRESS", "DJANGO", "SPRING", "LARAVEL", "GIT", "GITHUB",
        "DOCKER", "KUBERNETES", "AWS", "AZURE", "LINUX", "WINDOWS", "MACOS", "IOS", "ANDROID", "APP",
        "API", "JSON", "XML", "HTTP", "REST", "GRAPHQL", "VARIABLE", "FUNCTION", "CLASS", "OBJECT",
        "ARRAY", "STRING", "INTEGER", "BOOLEAN", "LOOP", "IF", "ELSE", "SWITCH", "DEBUGGER", "COMPILER"
      ];
      return words.sort(() => 0.5 - Math.random()).map((w, i) => ({ id: i, name: w, image: null }));
    }
  }
};

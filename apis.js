const GAME_APIS = {
    pokemon: {
        id: 'pokemon',
        name: 'Pokémon',
        loaderText: 'Catching Pokémon...',
        fetchData: async () => {
            const limit = 1025;
            const res = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${limit}`);
            const data = await res.json();
            return data.results.map((p, index) => ({
                id: index + 1,
                name: p.name.charAt(0).toUpperCase() + p.name.slice(1),
                image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${index + 1}.png`
            }));
        }
    },
    superheroes: {
        id: 'superheroes',
        name: 'Super Heroes',
        loaderText: 'Assembling Heroes...',
        fetchData: async () => {
            const res = await fetch('https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/all.json');
            const data = await res.json();
            return data.map(hero => ({
                id: hero.id,
                name: hero.name,
                image: hero.images.lg
            }));
        }
    },
    rickandmorty: {
        id: 'rickandmorty',
        name: 'Rick & Morty',
        loaderText: 'Opening Portals...',
        fetchData: async () => {
            // Fetch first 4 pages
            let characters = [];
            for (let i = 1; i <= 4; i++) {
                const res = await fetch(`https://rickandmortyapi.com/api/character/?page=${i}`);
                if (!res.ok) continue;
                const data = await res.json();
                characters = characters.concat(data.results);
            }
            return characters.map(char => ({
                id: char.id,
                name: char.name,
                image: char.image
            }));
        }
    },
    dogs: {
        id: 'dogs',
        name: 'Cute Dogs',
        loaderText: 'Fetching Dogs...',
        fetchData: async () => {
            // Fetch 50 random dog images
            const res = await fetch('https://dog.ceo/api/breeds/image/random/50');
            const data = await res.json();
            return data.message.map((url, index) => {
                // Extract breed from URL
                const breedPart = url.split('/breeds/')[1].split('/')[0];
                const breedWords = breedPart.split('-').reverse();
                const name = breedWords.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                return {
                    id: index,
                    name: name,
                    image: url
                };
            });
        }
    },
    harrypotter: {
        id: 'harrypotter',
        name: 'Harry Potter',
        loaderText: 'Boarding Express...',
        fetchData: async () => {
            const res = await fetch('https://hp-api.onrender.com/api/characters');
            const data = await res.json();
            // Filter out those without images to have a consistent look, or use placeholder
            const withImages = data.filter(c => c.image);
            return withImages.map(char => ({
                id: char.id,
                name: char.name,
                image: char.image
            }));
        }
    },
    countries: {
        id: 'countries',
        name: 'Countries',
        loaderText: 'Loading Maps...',
        fetchData: async () => {
            // Using v3.1 is correct but the API sometimes hangs on /all. 
            // We can also use a simplified field filter to speed it up and prevent hangs
            const res = await fetch('https://restcountries.com/v3.1/all?fields=name,flags');
            const data = await res.json();
            return data.map((c, idx) => ({
                id: idx,
                name: c.name.common,
                image: c.flags.svg
            }));
        }
    },
    digimon: {
        id: 'digimon',
        name: 'Digimon',
        loaderText: 'Digivolving...',
        fetchData: async () => {
            const res = await fetch('https://digimon-api.vercel.app/api/digimon');
            const data = await res.json();
            return data.map((d, idx) => ({
                id: idx,
                name: d.name,
                image: d.img
            }));
        }
    },
    gameofthrones: {
        id: 'gameofthrones',
        name: 'Game Of Thrones',
        loaderText: 'Winter is Coming...',
        fetchData: async () => {
            const res = await fetch('https://thronesapi.com/api/v2/Characters');
            const data = await res.json();
            return data.map((c) => ({
                id: c.id,
                name: c.fullName,
                image: c.imageUrl
            }));
        }
    },
    invizimals: {
        id: 'invizimals',
        name: 'Invizimals',
        loaderText: 'A invocar Invizimals...',
        fetchData: async () => {
            const words = [
                // Invizimals (Original)
                "STINGWING", "FLAMECLAW", "TIGERSHARK", "ICELION", "JETCRAB",
                "PORCUPAIN", "TOXITOAD", "BRATBAT", "SNAPPER", "SKYTALON",
                "FIRECRACKER", "MOBULA", "SIREN", "VIPERA", "RATTLERAPTOR",
                "MOONHOWLER", "METALMUTT", "IRONBUG", "FURMIN", "TUSKER",
                "TUNDERWULFE", "KRAKEN", "ZAPHYRA", "SALMA", "SCALINHA",
                "SKYSAUR", "PHALAMOS", "ROARHIDE", "MOBY", "BONESHELL",
                // Invizimals: Shadow Zone
                "HILLTOPPER", "HYDRA", "DRACO", "SABRETOOTH", "KRILLER",
                "GOTICA", "AXOLOTL", "OCELOTL", "GRIFFONATOR", "DRAGÃO DO DESERTO",
                "BULLHORN", "BONGORILLA", "BEATWIDOW", "BANDOLERO",
                // Invizimals: As Tribos Perdidas
                "CHUPACABRA", "CERBERUS", "AUDREY", "BONESNAPPER",
                // Invizimals: A Aliança
                "XIONG MAO", "UBERJACKAL", "NESSIE", "DRAGÃO ESTELAR",
                "CHOP CHOP", "HIPPOROCK", "VENOMWEB", "MOONSTRUCK",
                // Extras
                "MAGMATUN", "SHADOWFOX", "GRYPHON", "SPECTRODON",
                "FROSTBITE", "THUNDERHAWK", "LAVARAPTOR", "AQUAZOID",
                "SANDSTORM", "NIGHTCLAW", "IRONJAW", "CRYSTALWING",
                "BLAZETOOTH", "MUDSLINGER", "VOLTFANG", "STORMRIDER",
                "GHOSTSHARK", "CORALCRAB", "TERRADON", "EMBERWOLF"
            ];
            return words.map((w, i) => ({
                id: i,
                name: w,
                image: null
            }));
        }
    },
    classicwords: {
        id: 'classicwords',
        name: 'Classic Words (EN)',
        loaderText: 'Generating Codes...',
        fetchData: async () => {
            const words = [
                "AFRICA", "AGENT", "AIR", "ALIEN", "ALPS", "AMAZON", "AMBULANCE", "AMERICA", "ANGEL", "ANTARCTICA", "APPLE", "ARM", "ATLANTIS", "AUSTRALIA", "AZTEC", "BACK", "BALL", "BAND", "BANK", "BAR", "BARK", "BAT", "BATTERY", "BEACH", "BEAR", "BEAT", "BED", "BEIJING", "BELL", "BERMUDA", "BERRY", "BILL", "BLOCK", "BOARD", "BOLT", "BOMB", "BOND", "BOOM", "BOOT", "BOTTLE", "BOW", "BOX", "BRIDGE", "BRUSH", "BUCK", "BUFFALO", "BUG", "BUGLE", "BUTTON", "CALF", "CANADA", "CAP", "CAPITAL", "CAR", "CARD", "CARROT", "CASINO", "CAST", "CAT", "CELL", "CENTAUR", "CENTER", "CHAIR", "CHANGE", "CHARGE", "CHECK", "CHEST", "CHICK", "CHINA", "CHOCOLATE", "CHURCH", "CIRCLE", "CLIFF", "CLOAK", "CLUB", "CODE", "COLD", "COMIC", "COMPOUND", "CONCERT", "CONDUCTOR", "CONTRACT", "COOK", "COPPER", "COTTON", "COURT", "COVER", "CRANE", "CRASH", "CRICKET", "CROSS", "CROWN", "CYCLE", "CZECH", "DANCE", "DATE", "DAY", "DEATH", "DECK", "DEGREE", "DIAMOND", "DICE", "DINOSAUR", "DISEASE", "DOCTOR", "DOG", "DRAFT", "DRAGON", "DRESS", "DRILL", "DROP", "DUCK", "DWARF", "EAGLE", "EGYPT", "EMBASSY", "ENGINE", "ENGLAND", "EUROPE", "EYE", "FACE", "FAIR", "FALL", "FAN", "FENCE", "FIELD", "FIGHTER", "FIGURE", "FILE", "FILM", "FIRE", "FISH", "FLUTE", "FLY", "FOOT", "FORCE", "FOREST", "FORK", "FRANCE", "GAME", "GAS", "GENIUS", "GERMANY", "GHOST", "GIANT", "GLASS", "GLOVE", "GOLD", "GRACE", "GRASS", "GREECE", "GREEN", "GROUND", "HAM", "HAND", "HAWK", "HEAD", "HEART", "HELICOPTER", "HIMALAYAS", "HOLE", "HOLLYWOOD", "HONEY", "HOOD", "HOOK", "HORN", "HORSE", "HORSESHOE", "HOSPITAL", "HOTEL", "ICE", "ICE CREAM", "INDIA", "IRON", "IVORY", "JACK", "JAM", "JET", "JUPITER", "KANGAROO", "KETCHUP", "KEY", "KID", "KING", "KIWI", "KNIFE", "KNIGHT", "LAB", "LAP", "LASER", "LAWYER", "LEAD", "LEMON", "LEPRECHAUN", "LIFE", "LIGHT", "LIMOUSINE", "LINE", "LINK", "LION", "LITTER", "LOCH NESS", "LOCK", "LOG", "LONDON", "LUCK", "MAIL", "MAMMOTH", "MAPLE", "MARBLE", "MARCH", "MASS", "MATCH", "MERCURY", "MEXICO", "MICROSCOPE", "MILLIONAIRE", "MINE", "MINT", "MISSILE", "MODEL", "MOLE", "MOON", "MOSCOW", "MOUNT", "MOUSE", "MOUTH", "MUG", "NAIL", "NINJA", "NOTE", "NOVEL", "NURSE", "NUT", "OCTOPUS", "OIL", "OLIVE", "OLYMPUS", "OPERA", "ORANGE", "ORCHESTRA", "PANTS", "PAPER", "PARACHUTE", "PARK", "PART", "PASS", "PASTE", "PENGUIN", "PIANO", "PIE", "PILOT", "PIN", "PIPE", "PIRATE", "PISTOL", "PIT", "PITCH", "PITCHER", "PLAN", "PLASTIC", "PLATE", "PLATYPUS", "PLAY", "PLOT", "POISON", "POLICE", "POOL", "PORT", "POST", "POUND", "PRESS", "PRINCESS", "PUMPKIN", "PYRAMID", "QUEEN", "RABBIT", "RADAR", "RADIATION", "RADIO", "RAG", "RAT", "RECORD", "RED", "REVOLUTION", "RING", "ROBIN", "ROBOT", "ROCK", "ROME", "ROOT", "ROSE", "ROULETTE", "ROUND", "ROW", "RULER", "SATELLITE", "SATURN", "SCALE", "SCHOOL", "SCIENTIST", "SCORPION", "SCREEN", "SCUBA DIVER", "SEAL", "SERVER", "SHADOW", "SHAKESPEARE", "SHARK", "SHIP", "SHOE", "SHOP", "SHOT", "SINK", "SKYSCRAPER", "SLIP", "SLUG", "SMUGGLER", "SNOW", "SNOWMAN", "SOCK", "SOLDIER", "SOUL", "SOUND", "SPACE", "SPELL", "SPIDER", "SPIKE", "SPINE", "SPOT", "SPRING", "SPY", "SQUARE", "STADIUM", "STAFF", "STAR", "STATE", "STICK", "STOCK", "STRIKE", "STRING", "SUB", "SUIT", "SUPERHERO", "SWING", "SWITCH", "SWORD", "TABLE", "TABLET", "TAG", "TAIL", "TAP", "TEACHER", "TELESCOPE", "TEMPLE", "THEATER", "THIEF", "THUMB", "TICK", "TIE", "TIME", "TOKYO", "TOOTH", "TORCH", "TOWER", "TRACK", "TRAIN", "TRIANGLE", "TRIP", "TRUNK", "TUBE", "TURKEY", "UNDERTAKER", "UNICORN", "VACUUM", "VAN", "VET", "WAKE", "WALL", "WAR", "WASHER", "WATCH", "WATER", "WAVE", "WEB", "WELL", "WHALE", "WHIP", "WIND", "WITCH", "WORM", "YARD",
                "ASTRONAUT", "BUTTERFLY", "CABBAGE", "CASTLE", "CHAIN", "CHEEKS", "CLOUD", "COMET", "COMPASS", "CORAL", "CORN", "CROW", "DIARY", "DOOR", "EAR", "ECLIPSE", "GIRAFFE", "GLACIER", "GOAT", "GRAPE", "GRAVITY", "GUITAR", "HAT", "HORIZON", "ISLAND", "KITE", "LADYBUG", "LAMP", "LEAF", "MAGNET", "MUSHROOM", "ONION", "PEARL", "PIZZA", "RAIN", "RIVER", "SADDLE", "SCISSORS", "SILVER", "SNAKE", "SUN", "TOMATO", "TORNADO", "VOLCANO", "WAGON",
                "ANCHOR", "APARTMENT", "ARMOR", "ASYLUM", "AVALANCHE", "AXE", "BABOON", "BACON", "BALLOON", "BAMBOO", "BANANA", "BARBECUE", "BASKET", "BATHTUB", "BATMAN", "BATTLE", "BEE", "BEEF", "BEER", "BICYCLE", "BIKINI", "BINGO", "BIRD", "BISCUIT", "BLACK", "BLADE", "BLANKET", "BLIND", "BLIZZARD", "BLOOD", "BLOUSE", "BLUE", "BOAT", "BONE", "BOOK", "BORDER", "BOSS", "BOWL", "BRAIN", "BREAD", "BREAKFAST", "BRICK", "BRIDE", "BROTHER", "BUBBLE", "BUCKET", "BUILDING", "BULB", "BULL", "BURGER", "BUS", "BUTTER", "CABIN", "CABLE", "CACTUS", "CAFE", "CAKE", "CALCULATOR", "CALENDAR", "CAME", "CAMEL", "CAMERA", "CAMP", "CAN", "CANDLE", "CANDY", "CANNON", "CANVAS", "CANYON", "CAPE", "CARPET", "CARRIAGE", "CART", "CATERPILLAR", "CAVE", "CEILING", "CELLAR", "CEMENT", "CEMETERY", "CENT", "CHAINSAW", "CHALK", "CHAMPION", "CHEESE", "CHEF", "CHERRY", "CHESS", "CHICKEN", "CHILD", "CHIMNEY", "CHIN", "CHIP", "CIRCUIT", "CITY", "CLAM", "CLASS", "CLAW", "CLAY", "CLIP", "CLOCK"
            ];
            return words.map((w, i) => ({
                id: i,
                name: w,
                image: null
            }));
        }
    },
    classicwords_pt: {
        id: 'classicwords_pt',
        name: 'Classic Words (PT)',
        loaderText: 'A gerar códigos...',
        fetchData: async () => {
             const words = [
                "ÁFRICA", "AGENTE", "AR", "ALIENÍGENA", "ALPES", "AMAZÓNIA", "AMBULÂNCIA", "AMÉRICA", "ANJO", "ANTÁRCTIDA", "MAÇÃ", "BRAÇO", "ATLÂNTIDA", "AUSTRÁLIA", "ASTECA", "COSTAS", "BOLA", "BANDA", "BANCO", "BAR", "LADRAR", "MORCEGO", "BATERIA", "PRAIA", "URSO", "BATIDA", "CAMA", "PEQUIM", "SINO", "BERMUDAS", "BAGA", "CONTA", "BLOCO", "QUADRO", "PARAFUSO", "BOMBA", "LAÇO", "EXPLOSÃO", "BOTA", "GARRAFA", "ARCO", "CAIXA", "PONTE", "ESCOVA", "CORÇA", "BÚFALO", "INSETO", "CORNETA", "BOTÃO", "VITELA", "CANADÁ", "BONÉ", "CAPITAL", "CARRO", "CARTA", "CENOURA", "CASINO", "MOLDE", "GATO", "CÉLULA", "CENTAURO", "CENTRO", "CADEIRA", "TROCO", "CARGA", "CHEQUE", "BAÚ", "PINTO", "CHINA", "CHOCOLATE", "IGREJA", "CÍRCULO", "PENHASCO", "CAPA", "CLUBE", "CÓDIGO", "FRIO", "CÓMICO", "COMPOSTO", "CONCERTO", "MAESTRO", "CONTRATO", "COZINHEIRO", "COBRE", "ALGODÃO", "TRIBUNAL", "CAPA", "GRUOTA", "ACIDENTE", "CRÍQUETE", "CRUZ", "COROA", "CICLO", "CHECA", "DANÇA", "DATA", "DIA", "MORTE", "BARALHO", "GRAU", "DIAMANTE", "DADO", "DINOSSAURO", "DOENÇA", "MÉDICO", "CÃO", "RASCUNHO", "DRAGÃO", "VESTIDO", "BROCA", "GOTA", "PATO", "ANÃO", "ÁGUIA", "EGITO", "EMBAIXADA", "MOTOR", "INGLATERRA", "EUROPA", "OLHO", "ROSTO", "FEIRA", "QUEDA", "VENTILADOR", "CERCA", "CAMPO", "LUTADOR", "FIGURA", "FICHEIRO", "FILME", "FOGO", "PEIXE", "FLAUTA", "MOSCA", "PÉ", "FORÇA", "FLORESTA", "GARFO", "FRANÇA", "JOGO", "GÁS", "GÉNIO", "ALEMANHA", "FANTASMA", "GIGANTE", "VIDRO", "LUVA", "OURO", "GRAÇA", "RELVA", "GRÉCIA", "VERDE", "CHÃO", "FIAMBRE", "MÃO", "FALCÃO", "CABEÇA", "CORAÇÃO", "HELICÓPTERO", "HIMALAIAS", "BURACO", "HOLLYWOOD", "MEL", "CAPUZ", "GANCHO", "CHIFRE", "CAVALO", "FERRADURA", "HOSPITAL", "HOTEL", "GELO", "GELADO", "ÍNDIA", "FERRO", "MARFIM", "VALETE", "COMPOTA", "JATO", "JÚPITER", "CANGURU", "KETCHUP", "CHAVE", "MIÚDO", "REI", "KIWI", "FACA", "CAVALEIRO", "LABORATÓRIO", "COLO", "LASER", "ADVOGADO", "CHUMBO", "LIMÃO", "DUENDE", "VIDA", "LUZ", "LIMUSINA", "LINHA", "LIGAÇÃO", "LEÃO", "LIXO", "LOCH NESS", "FECHADURA", "TRONCO", "LONDRES", "SORTE", "CORREIO", "MAMUTE", "ÁRVORE", "MÁRMORE", "MARCHA", "MASSA", "FÓSFORO", "MERCÚRIO", "MÉXICO", "MICROSCÓPIO", "MILIONÁRIO", "MINA", "MENTA", "MÍSSIL", "MODELO", "TOUPEIRA", "LUA", "MOSCOVO", "MONTE", "RATO", "BOCA", "CANECA", "PREGO", "NINJA", "NOTA", "ROMANCE", "ENFERMEIRA", "NOZ", "POLVO", "ÓLEO", "AZEITONA", "OLIMPO", "ÓPERA", "LARANJA", "ORQUESTRA", "CALÇAS", "PAPEL", "PARAQUEDAS", "PARQUE", "PEÇA", "PASSE", "PASTA", "PINGUIM", "PIANO", "TARTE", "PILOTO", "ALFINETE", "TUBO", "PIRATA", "PISTOLA", "FOSSO", "TOM", "LANÇADOR", "PLANO", "PLÁSTICO", "PRATO", "ORNITORRINCO", "PEÇA", "ENREDO", "VENENO", "POLÍCIA", "PISCINA", "PORTO", "POSTO", "LIBRA", "IMPRENSA", "PRINCESA", "ABÓBORA", "PIRÂMIDE", "RAINHA", "COELHO", "RADAR", "RADIAÇÃO", "RÁDIO", "PANO", "RATOZANA", "RECORDE", "VERMELHO", "REVOLUÇÃO", "ANEL", "PINTASSILGO", "ROBÔ", "ROCHA", "ROMA", "RAIZ", "ROSA", "ROLETA", "RONDA", "FILA", "RÉGUA", "SATÉLITE", "SATURNO", "BALANÇA", "ESCOLA", "CIENTISTA", "ESCORPIÃO", "ECRÃ", "MERGULHADOR", "FOCA", "SERVIDOR", "SOMBRA", "SHAKESPEARE", "TUBARÃO", "NAVIO", "SAPATO", "LOJA", "TIRO", "LAVA-LOUÇAS", "ARRANHA-CÉUS", "ESCORREGÃO", "LESMA", "CONTRABANDISTA", "NEVE", "BONECO", "MEIA", "SOLDADO", "ALMA", "SOM", "ESPAÇO", "FEITIÇO", "ARANHA", "ESPINHO", "ESPINHA", "MANCHA", "MOLA", "ESPIÃO", "QUADRADO", "ESTÁDIO", "CAJADO", "ESTRELA", "ESTADO",                "AÇÕES", "GREVE", "FIO", "SUBMARINO", "FATO", "SUPER-HERÓI", "BALOIÇO", "INTERRUPTOR", "ESPADA", "MESA", "COMPRIMIDO", "ETIQUETA", "CAUDA", "TORNEIRA", "PROFESSOR", "TELESCÓPIO", "TEMPLO", "TEATRO", "LADRÃO", "POLEGAR", "CARRAPATO", "GRAVATA", "TEMPO", "TÓQUIO", "DENTE", "TOCHA", "TORRE", "PISTA", "COMBOIO", "TRIÂNGULO", "VIAGEM", "MALA", "TUBO", "PERU", "AGENTE FUNERÁRIO", "UNICÓRNIO", "ASPIRADOR", "CARRINHA", "VETERINÁRIO", "VELÓRIO", "PAREDE", "GUERRA", "MÁQUINA", "RELÓGIO", "ÁGUA", "ONDA", "TEIA", "POÇO", "BALEIA", "CHICOTE", "VENTO", "BRUXA", "VERME", "JARDIM",
                "ÂNCORA", "APARTAMENTO", "ARMADURA", "ASILO", "AVALANCHE", "MACHADO", "BABUÍNO", "BACON", "BALÃO", "BAMBU", "BANANA", "CHURRASCO", "CESTO", "BANHEIRA", "BATMAN", "BATALHA", "ABELHA", "CARNE", "CERVEJA", "BICICLETA", "BIQUÍNI", "BINGO", "PÁSSARO", "BISCOITO", "PRETO", "LÂMINA", "COBERTOR", "CEGO", "NEVASCA", "SANGUE", "BLUSA", "AZUL", "BARCO", "OSSO", "LIVRO", "FRONTEIRA", "CHEFE", "TIGELA", "CÉREBRO", "PÃO", "PEQUENO-ALMOÇO", "TIJOLO", "NOIVA", "IRMÃO", "BOLHA", "BALDE", "EDIFÍCIO", "LÂMPADA", "TOURO", "HMBÚRGUER", "AUTOCARRO", "MANTEIGA", "CABANA", "CABO", "CACTO", "CAFÉ", "BOLO", "CALCULADORA", "CALENDÁRIO", "CAMELO", "CÂMARA", "ACAMPAMENTO", "LATA", "VELA", "DOCE", "CANHÃO", "TELA", "DESFILADEIRO", "CAPA", "TAPETE", "CARRUAGEM", "CARRINHO", "MOLDE", "LAGARTA", "CAVERNA", "TETO", "CAVE", "CIMENTO", "CEMITÉRIO", "CÊNTIMO", "MOTOSSERRA", "GIZ", "CAMPEÃO", "QUEIJO", "CHEF", "CEREJA", "XADREZ", "FRANGO", "CRIANÇA", "CHAMINÉ", "QUEIXO", "CHIP", "CIRCUITO", "CIDADE", "AMÊIJOA", "AULA", "GARRA", "BARRO", "CLIPE", "RELÓGIO"
            ];
            return words.map((w, i) => ({
                id: i,
                name: w,
                image: null
            }));
        }
    }
};

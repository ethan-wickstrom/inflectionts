// Linguistic wordlists and inflection tables ported verbatim from jaraco/inflect.
//
// Names follow upstream's scheme, read left to right:
//   pl_ / si_    rules for pluralizing / singularizing
//   sb / v / adj substantive (noun) / verb / adjective
//   U / C        applied unconditionally / only in classical mode (see `classical`)
//   a_ae         the ending rewrite, here "..a" -> "..ae"
//   _complete    whole words; _endings matches word endings; _caps is case-sensitive
//   _bysize      derived lookup tables keyed by length (computed below, not edited)
//
// To make a noun plural to itself (like "sheep"), add it in lowercase to
// `pl_sb_uninflected_complete`; plural.ts checks that list case-insensitively.
// Some lists repeat entries from upstream (for example the tails of
// `pl_sb_uninflected_s_complete` and `pl_sb_uninflected_complete`), so edit by line,
// not by matching a list's last entry.
import * as Predicate from "effect/Predicate"

import type { Gender } from "../Schema.ts"
import { bysize, enclose, joinstem, makePlSiLists } from "./helpers.ts"

export const pl_sb_irregular_s: Readonly<Record<string, string>> = {
  corpus: "corpuses|corpora",
  opus: "opuses|opera",
  genus: "genera",
  mythos: "mythoi",
  penis: "penises|penes",
  testis: "testes",
  atlas: "atlases|atlantes",
  yes: "yeses"
}

export const pl_sb_irregular: Readonly<Record<string, string>> = {
  child: "children",
  chili: "chilis|chilies",
  brother: "brothers|brethren",
  infinity: "infinities|infinity",
  loaf: "loaves",
  lore: "lores|lore",
  hoof: "hoofs|hooves",
  beef: "beefs|beeves",
  thief: "thiefs|thieves",
  money: "monies",
  mongoose: "mongooses",
  ox: "oxen",
  cow: "cows|kine",
  graffito: "graffiti",
  octopus: "octopuses|octopodes",
  genie: "genies|genii",
  ganglion: "ganglions|ganglia",
  trilby: "trilbys",
  turf: "turfs|turves",
  numen: "numina",
  atman: "atmas",
  occiput: "occiputs|occipita",
  sabretooth: "sabretooths",
  sabertooth: "sabertooths",
  lowlife: "lowlifes",
  flatfoot: "flatfoots",
  tenderfoot: "tenderfoots",
  romany: "romanies",
  jerry: "jerries",
  mary: "maries",
  talouse: "talouses",
  rom: "roma",
  carmen: "carmina",
  corpus: "corpuses|corpora",
  opus: "opuses|opera",
  genus: "genera",
  mythos: "mythoi",
  penis: "penises|penes",
  testis: "testes",
  atlas: "atlases|atlantes",
  yes: "yeses"
}

export const pl_sb_irregular_caps: Readonly<Record<string, string>> = {
  Romany: "Romanies",
  Jerry: "Jerrys",
  Mary: "Marys",
  Rom: "Roma"
}

export const pl_sb_irregular_compound: Readonly<Record<string, string>> = {
  "prima donna": "prima donnas|prime donne"
}

export const pl_sb_z_zes_list: ReadonlyArray<string> = ["quartz", "topaz"]

export const pl_sb_ze_zes_list: ReadonlyArray<string> = ["snooze"]

export const pl_sb_C_is_ides_complete: ReadonlyArray<string> = [
  "ephemeris",
  "iris",
  "clitoris",
  "chrysalis",
  "epididymis"
]

export const pl_sb_C_is_ides_endings: ReadonlyArray<string> = ["itis"]

export const pl_sb_C_a_ata_list: ReadonlyArray<string> = [
  "anathema",
  "bema",
  "carcinoma",
  "charisma",
  "diploma",
  "dogma",
  "drama",
  "edema",
  "enema",
  "enigma",
  "lemma",
  "lymphoma",
  "magma",
  "melisma",
  "miasma",
  "oedema",
  "sarcoma",
  "schema",
  "soma",
  "stigma",
  "stoma",
  "trauma",
  "gumma",
  "pragma"
]

export const pl_sb_U_a_ae_list: ReadonlyArray<string> = [
  "alumna",
  "alga",
  "vertebra",
  "persona",
  "vita"
]

export const pl_sb_C_a_ae_list: ReadonlyArray<string> = [
  "amoeba",
  "antenna",
  "formula",
  "hyperbola",
  "medusa",
  "nebula",
  "parabola",
  "abscissa",
  "hydra",
  "nova",
  "lacuna",
  "aurora",
  "umbra",
  "flora",
  "fauna"
]

export const pl_sb_C_en_ina_list: ReadonlyArray<string> = ["stamen", "foramen", "lumen"]

export const pl_sb_U_um_a_list: ReadonlyArray<string> = [
  "bacterium",
  "agendum",
  "desideratum",
  "erratum",
  "stratum",
  "datum",
  "ovum",
  "extremum",
  "candelabrum"
]

export const pl_sb_C_um_a_list: ReadonlyArray<string> = [
  "maximum",
  "minimum",
  "momentum",
  "optimum",
  "quantum",
  "cranium",
  "curriculum",
  "dictum",
  "phylum",
  "aquarium",
  "compendium",
  "emporium",
  "encomium",
  "gymnasium",
  "honorarium",
  "interregnum",
  "lustrum",
  "memorandum",
  "millennium",
  "rostrum",
  "spectrum",
  "speculum",
  "stadium",
  "trapezium",
  "ultimatum",
  "medium",
  "vacuum",
  "velum",
  "consortium",
  "arboretum"
]

export const pl_sb_U_us_i_list: ReadonlyArray<string> = [
  "alumnus",
  "alveolus",
  "bacillus",
  "bronchus",
  "locus",
  "nucleus",
  "stimulus",
  "meniscus",
  "sarcophagus"
]

export const pl_sb_C_us_i_list: ReadonlyArray<string> = [
  "focus",
  "radius",
  "genius",
  "incubus",
  "succubus",
  "nimbus",
  "fungus",
  "nucleolus",
  "stylus",
  "torus",
  "umbilicus",
  "uterus",
  "hippopotamus",
  "cactus"
]

export const pl_sb_C_us_us: ReadonlyArray<string> = [
  "status",
  "apparatus",
  "prospectus",
  "sinus",
  "hiatus",
  "impetus",
  "plexus"
]

export const pl_sb_U_on_a_list: ReadonlyArray<string> = [
  "criterion",
  "perihelion",
  "aphelion",
  "phenomenon",
  "prolegomenon",
  "noumenon",
  "organon",
  "asyndeton",
  "hyperbaton"
]

export const pl_sb_C_on_a_list: ReadonlyArray<string> = ["oxymoron"]

export const pl_sb_C_o_i: ReadonlyArray<string> = [
  "solo",
  "soprano",
  "basso",
  "alto",
  "contralto",
  "tempo",
  "piano",
  "virtuoso"
]

export const pl_sb_U_o_os_complete: ReadonlyArray<string> = [
  "ISO",
  "NATO",
  "NCO",
  "NGO",
  "ado",
  "oto"
]

export const pl_sb_U_o_os_endings: ReadonlyArray<string> = [
  "aficionado",
  "aggro",
  "albino",
  "allegro",
  "ammo",
  "Antananarivo",
  "archipelago",
  "armadillo",
  "auto",
  "avocado",
  "Bamako",
  "Barquisimeto",
  "bimbo",
  "bingo",
  "Biro",
  "bolero",
  "Bolzano",
  "bongo",
  "Boto",
  "burro",
  "Cairo",
  "canto",
  "cappuccino",
  "casino",
  "cello",
  "Chicago",
  "Chimango",
  "cilantro",
  "cochito",
  "coco",
  "Colombo",
  "Colorado",
  "commando",
  "concertino",
  "contango",
  "credo",
  "crescendo",
  "cyano",
  "demo",
  "ditto",
  "Draco",
  "dynamo",
  "embryo",
  "Esperanto",
  "espresso",
  "euro",
  "falsetto",
  "Faro",
  "fiasco",
  "Filipino",
  "flamenco",
  "furioso",
  "generalissimo",
  "Gestapo",
  "ghetto",
  "gigolo",
  "gizmo",
  "Greensboro",
  "gringo",
  "Guaiabero",
  "guano",
  "gumbo",
  "gyro",
  "hairdo",
  "hippo",
  "Idaho",
  "impetigo",
  "inferno",
  "info",
  "intermezzo",
  "intertrigo",
  "Iquico",
  "jumbo",
  "junto",
  "Kakapo",
  "kilo",
  "Kinkimavo",
  "Kokako",
  "Kosovo",
  "Lesotho",
  "libero",
  "libido",
  "libretto",
  "lido",
  "Lilo",
  "limbo",
  "limo",
  "lineno",
  "lingo",
  "lino",
  "livedo",
  "loco",
  "logo",
  "lumbago",
  "macho",
  "macro",
  "mafioso",
  "magneto",
  "magnifico",
  "Majuro",
  "Malabo",
  "manifesto",
  "Maputo",
  "Maracaibo",
  "medico",
  "memo",
  "metro",
  "Mexico",
  "micro",
  "Milano",
  "Monaco",
  "mono",
  "Montenegro",
  "Morocco",
  "Muqdisho",
  "myo",
  "neutrino",
  "Ningbo",
  "octavo",
  "oregano",
  "Orinoco",
  "Orlando",
  "Oslo",
  "panto",
  "Paramaribo",
  "Pardusco",
  "pedalo",
  "photo",
  "pimento",
  "pinto",
  "pleco",
  "Pluto",
  "pogo",
  "polo",
  "poncho",
  "Porto-Novo",
  "Porto",
  "pro",
  "psycho",
  "pueblo",
  "quarto",
  "Quito",
  "repo",
  "rhino",
  "risotto",
  "rococo",
  "rondo",
  "Sacramento",
  "saddo",
  "sago",
  "salvo",
  "Santiago",
  "Sapporo",
  "Sarajevo",
  "scherzando",
  "scherzo",
  "silo",
  "sirocco",
  "sombrero",
  "staccato",
  "sterno",
  "stucco",
  "stylo",
  "sumo",
  "Taiko",
  "techno",
  "terrazzo",
  "testudo",
  "timpano",
  "tiro",
  "tobacco",
  "Togo",
  "Tokyo",
  "torero",
  "Torino",
  "Toronto",
  "torso",
  "tremolo",
  "typo",
  "tyro",
  "ufo",
  "UNESCO",
  "vaquero",
  "vermicello",
  "verso",
  "vibrato",
  "violoncello",
  "Virgo",
  "weirdo",
  "WHO",
  "WTO",
  "Yamoussoukro",
  "yo-yo",
  "zero",
  "Zibo",
  "solo",
  "soprano",
  "basso",
  "alto",
  "contralto",
  "tempo",
  "piano",
  "virtuoso"
]

export const pl_sb_U_ch_chs_list: ReadonlyArray<string> = ["czech", "eunuch", "stomach"]

export const pl_sb_U_ex_ices_list: ReadonlyArray<string> = ["codex", "murex", "silex"]

export const pl_sb_U_ix_ices_list: ReadonlyArray<string> = ["radix", "helix"]

export const pl_sb_C_ex_ices_list: ReadonlyArray<string> = [
  "vortex",
  "vertex",
  "cortex",
  "latex",
  "pontifex",
  "apex",
  "index",
  "simplex"
]

export const pl_sb_C_ix_ices_list: ReadonlyArray<string> = ["appendix"]

export const pl_sb_C_i_list: ReadonlyArray<string> = ["afrit", "afreet", "efreet"]

export const pl_sb_C_im_list: ReadonlyArray<string> = ["goy", "seraph", "cherub"]

export const pl_sb_U_man_mans_list: ReadonlyArray<string> = [
  "ataman",
  "caiman",
  "cayman",
  "ceriman",
  "desman",
  "dolman",
  "farman",
  "harman",
  "hetman",
  "human",
  "leman",
  "ottoman",
  "shaman",
  "talisman"
]

export const pl_sb_U_man_mans_caps_list: ReadonlyArray<string> = [
  "Alabaman",
  "Bahaman",
  "Burman",
  "German",
  "Hiroshiman",
  "Liman",
  "Nakayaman",
  "Norman",
  "Oklahoman",
  "Panaman",
  "Roman",
  "Selman",
  "Sonaman",
  "Tacoman",
  "Yakiman",
  "Yokohaman",
  "Yuman"
]

export const pl_sb_U_louse_lice_list: ReadonlyArray<string> = [
  "booklouse",
  "grapelouse",
  "louse",
  "woodlouse"
]

export const pl_sb_uninflected_s_complete: ReadonlyArray<string> = [
  "breeches",
  "britches",
  "pajamas",
  "pyjamas",
  "clippers",
  "gallows",
  "hijinks",
  "headquarters",
  "pliers",
  "scissors",
  "testes",
  "herpes",
  "pincers",
  "shears",
  "proceedings",
  "trousers",
  "cantus",
  "coitus",
  "nexus",
  "contretemps",
  "corps",
  "debris",
  "siemens",
  "mumps",
  "diabetes",
  "jackanapes",
  "series",
  "species",
  "subspecies",
  "rabies",
  "chassis",
  "innings",
  "news",
  "mews",
  "haggis"
]

export const pl_sb_uninflected_s_endings: ReadonlyArray<string> = ["ois", "measles"]

export const pl_sb_uninflected_herd: ReadonlyArray<string> = [
  "wildebeest",
  "swine",
  "eland",
  "bison",
  "buffalo",
  "cattle",
  "elk",
  "rhinoceros",
  "zucchini",
  "caribou",
  "dace",
  "grouse",
  "guinea fowl",
  "guinea-fowl",
  "haddock",
  "hake",
  "halibut",
  "herring",
  "mackerel",
  "pickerel",
  "pike",
  "roe",
  "seed",
  "shad",
  "snipe",
  "teal",
  "turbot",
  "water fowl",
  "water-fowl"
]

export const pl_sb_uninflected_complete: ReadonlyArray<string> = [
  "tuna",
  "salmon",
  "mackerel",
  "trout",
  "bream",
  "sea-bass",
  "sea bass",
  "carp",
  "cod",
  "flounder",
  "whiting",
  "moose",
  "graffiti",
  "djinn",
  "samuri",
  "offspring",
  "pence",
  "quid",
  "hertz",
  "breeches",
  "britches",
  "pajamas",
  "pyjamas",
  "clippers",
  "gallows",
  "hijinks",
  "headquarters",
  "pliers",
  "scissors",
  "testes",
  "herpes",
  "pincers",
  "shears",
  "proceedings",
  "trousers",
  "cantus",
  "coitus",
  "nexus",
  "contretemps",
  "corps",
  "debris",
  "siemens",
  "mumps",
  "diabetes",
  "jackanapes",
  "series",
  "species",
  "subspecies",
  "rabies",
  "chassis",
  "innings",
  "news",
  "mews",
  "haggis"
]

export const pl_sb_uninflected_caps: ReadonlyArray<string> = [
  "Portuguese",
  "Amoyese",
  "Borghese",
  "Congoese",
  "Faroese",
  "Foochowese",
  "Genevese",
  "Genoese",
  "Gilbertese",
  "Hottentotese",
  "Kiplingese",
  "Kongoese",
  "Lucchese",
  "Maltese",
  "Nankingese",
  "Niasese",
  "Pekingese",
  "Piedmontese",
  "Pistoiese",
  "Sarawakese",
  "Shavese",
  "Vermontese",
  "Wenchowese",
  "Yengeese"
]

export const pl_sb_uninflected_endings: ReadonlyArray<string> = [
  "butter",
  "cash",
  "furniture",
  "information",
  "equipment",
  "luggage",
  "baggage",
  "jewelry",
  "machinery",
  "cutlery",
  "livestock",
  "fish",
  "deer",
  "sheep",
  "nese",
  "rese",
  "lese",
  "mese",
  "pox",
  "craft",
  "ois",
  "measles"
]

export const pl_sb_singular_s_complete: ReadonlyArray<string> = [
  "acropolis",
  "aegis",
  "alias",
  "asbestos",
  "bathos",
  "bias",
  "bronchitis",
  "bursitis",
  "caddis",
  "cannabis",
  "canvas",
  "chaos",
  "cosmos",
  "dais",
  "digitalis",
  "epidermis",
  "ethos",
  "eyas",
  "gas",
  "glottis",
  "hubris",
  "ibis",
  "lens",
  "mantis",
  "marquis",
  "metropolis",
  "pathos",
  "pelvis",
  "polis",
  "rhinoceros",
  "sassafras",
  "trellis",
  "ephemeris",
  "iris",
  "clitoris",
  "chrysalis",
  "epididymis"
]

export const si_sb_ois_oi_case: ReadonlyArray<string> = ["Bolshois", "Hanois"]

export const si_sb_uses_use_case: ReadonlyArray<string> = [
  "Betelgeuses",
  "Duses",
  "Meuses",
  "Syracuses",
  "Toulouses"
]

export const si_sb_uses_use: ReadonlyArray<string> = [
  "abuses",
  "applauses",
  "blouses",
  "carouses",
  "causes",
  "chartreuses",
  "clauses",
  "contuses",
  "douses",
  "excuses",
  "fuses",
  "grouses",
  "hypotenuses",
  "masseuses",
  "menopauses",
  "misuses",
  "muses",
  "overuses",
  "pauses",
  "peruses",
  "profuses",
  "recluses",
  "reuses",
  "ruses",
  "souses",
  "spouses",
  "suffuses",
  "transfuses",
  "uses"
]

export const si_sb_ies_ie_case: ReadonlyArray<string> = [
  "Addies",
  "Aggies",
  "Allies",
  "Amies",
  "Angies",
  "Annies",
  "Annmaries",
  "Archies",
  "Arties",
  "Aussies",
  "Barbies",
  "Barries",
  "Basies",
  "Bennies",
  "Bernies",
  "Berties",
  "Bessies",
  "Betties",
  "Billies",
  "Blondies",
  "Bobbies",
  "Bonnies",
  "Bowies",
  "Brandies",
  "Bries",
  "Brownies",
  "Callies",
  "Carnegies",
  "Carries",
  "Cassies",
  "Charlies",
  "Cheries",
  "Christies",
  "Connies",
  "Curies",
  "Dannies",
  "Debbies",
  "Dixies",
  "Dollies",
  "Donnies",
  "Drambuies",
  "Eddies",
  "Effies",
  "Ellies",
  "Elsies",
  "Eries",
  "Ernies",
  "Essies",
  "Eugenies",
  "Fannies",
  "Flossies",
  "Frankies",
  "Freddies",
  "Gillespies",
  "Goldies",
  "Gracies",
  "Guthries",
  "Hallies",
  "Hatties",
  "Hetties",
  "Hollies",
  "Jackies",
  "Jamies",
  "Janies",
  "Jannies",
  "Jeanies",
  "Jeannies",
  "Jennies",
  "Jessies",
  "Jimmies",
  "Jodies",
  "Johnies",
  "Johnnies",
  "Josies",
  "Julies",
  "Kalgoorlies",
  "Kathies",
  "Katies",
  "Kellies",
  "Kewpies",
  "Kristies",
  "Laramies",
  "Lassies",
  "Lauries",
  "Leslies",
  "Lessies",
  "Lillies",
  "Lizzies",
  "Lonnies",
  "Lories",
  "Lorries",
  "Lotties",
  "Louies",
  "Mackenzies",
  "Maggies",
  "Maisies",
  "Mamies",
  "Marcies",
  "Margies",
  "Maries",
  "Marjories",
  "Matties",
  "McKenzies",
  "Melanies",
  "Mickies",
  "Millies",
  "Minnies",
  "Mollies",
  "Mounties",
  "Nannies",
  "Natalies",
  "Nellies",
  "Netties",
  "Ollies",
  "Ozzies",
  "Pearlies",
  "Pottawatomies",
  "Reggies",
  "Richies",
  "Rickies",
  "Robbies",
  "Ronnies",
  "Rosalies",
  "Rosemaries",
  "Rosies",
  "Roxies",
  "Rushdies",
  "Ruthies",
  "Sadies",
  "Sallies",
  "Sammies",
  "Scotties",
  "Selassies",
  "Sherries",
  "Sophies",
  "Stacies",
  "Stefanies",
  "Stephanies",
  "Stevies",
  "Susies",
  "Sylvies",
  "Tammies",
  "Terries",
  "Tessies",
  "Tommies",
  "Tracies",
  "Trekkies",
  "Valaries",
  "Valeries",
  "Valkyries",
  "Vickies",
  "Virgies",
  "Willies",
  "Winnies",
  "Wylies",
  "Yorkies"
]

export const si_sb_ies_ie: ReadonlyArray<string> = [
  "aeries",
  "baggies",
  "belies",
  "biggies",
  "birdies",
  "bogies",
  "bonnies",
  "boogies",
  "bookies",
  "bourgeoisies",
  "brownies",
  "budgies",
  "caddies",
  "calories",
  "camaraderies",
  "cockamamies",
  "collies",
  "cookies",
  "coolies",
  "cooties",
  "coteries",
  "crappies",
  "curies",
  "cutesies",
  "dogies",
  "eyries",
  "floozies",
  "footsies",
  "freebies",
  "genies",
  "goalies",
  "groupies",
  "hies",
  "jalousies",
  "junkies",
  "kiddies",
  "laddies",
  "lassies",
  "lies",
  "lingeries",
  "magpies",
  "menageries",
  "mommies",
  "movies",
  "neckties",
  "newbies",
  "nighties",
  "oldies",
  "organdies",
  "overlies",
  "pies",
  "pinkies",
  "pixies",
  "potpies",
  "prairies",
  "quickies",
  "reveries",
  "rookies",
  "rotisseries",
  "softies",
  "sorties",
  "species",
  "stymies",
  "sweeties",
  "ties",
  "underlies",
  "unties",
  "veggies",
  "vies",
  "yuppies",
  "zombies"
]

export const si_sb_oes_oe_case: ReadonlyArray<string> = [
  "Chloes",
  "Crusoes",
  "Defoes",
  "Faeroes",
  "Ivanhoes",
  "Joes",
  "McEnroes",
  "Moes",
  "Monroes",
  "Noes",
  "Poes",
  "Roscoes",
  "Tahoes",
  "Tippecanoes",
  "Zoes"
]

export const si_sb_oes_oe: ReadonlyArray<string> = [
  "aloes",
  "backhoes",
  "canoes",
  "does",
  "floes",
  "foes",
  "hoes",
  "mistletoes",
  "oboes",
  "pekoes",
  "roes",
  "sloes",
  "throes",
  "tiptoes",
  "toes",
  "woes"
]

export const si_sb_z_zes: ReadonlyArray<string> = ["quartzes", "topazes"]

export const si_sb_zzes_zz: ReadonlyArray<string> = ["buzzes", "fizzes", "frizzes", "razzes"]

export const si_sb_ches_che_case: ReadonlyArray<string> = [
  "Andromaches",
  "Apaches",
  "Blanches",
  "Comanches",
  "Nietzsches",
  "Porsches",
  "Roches"
]

export const si_sb_ches_che: ReadonlyArray<string> = [
  "aches",
  "avalanches",
  "backaches",
  "bellyaches",
  "caches",
  "cloches",
  "creches",
  "douches",
  "earaches",
  "fiches",
  "headaches",
  "heartaches",
  "microfiches",
  "niches",
  "pastiches",
  "psyches",
  "quiches",
  "stomachaches",
  "toothaches",
  "tranches"
]

export const si_sb_xes_xe: ReadonlyArray<string> = ["annexes", "axes", "deluxes", "pickaxes"]

export const si_sb_sses_sse_case: ReadonlyArray<string> = [
  "Hesses",
  "Jesses",
  "Larousses",
  "Matisses"
]

export const si_sb_sses_sse: ReadonlyArray<string> = [
  "bouillabaisses",
  "crevasses",
  "demitasses",
  "impasses",
  "mousses",
  "posses"
]

export const si_sb_ves_ve_case: ReadonlyArray<string> = ["Clives", "Palmolives"]

export const si_sb_ves_ve: ReadonlyArray<string> = [
  "interweaves",
  "weaves",
  "olives",
  "bivalves",
  "dissolves",
  "resolves",
  "salves",
  "twelves",
  "valves"
]

export const si_sb_es_is: ReadonlyArray<string> = [
  "amanuenses",
  "amniocenteses",
  "analyses",
  "antitheses",
  "apotheoses",
  "arterioscleroses",
  "atheroscleroses",
  "axes",
  "catalyses",
  "catharses",
  "chasses",
  "cirrhoses",
  "cocces",
  "crises",
  "diagnoses",
  "dialyses",
  "diereses",
  "electrolyses",
  "emphases",
  "exegeses",
  "geneses",
  "halitoses",
  "hydrolyses",
  "hypnoses",
  "hypotheses",
  "hystereses",
  "metamorphoses",
  "metastases",
  "misdiagnoses",
  "mitoses",
  "mononucleoses",
  "narcoses",
  "necroses",
  "nemeses",
  "neuroses",
  "oases",
  "osmoses",
  "osteoporoses",
  "paralyses",
  "parentheses",
  "parthenogeneses",
  "periphrases",
  "photosyntheses",
  "probosces",
  "prognoses",
  "prophylaxes",
  "prostheses",
  "preces",
  "psoriases",
  "psychoanalyses",
  "psychokineses",
  "psychoses",
  "scleroses",
  "scolioses",
  "sepses",
  "silicoses",
  "symbioses",
  "synopses",
  "syntheses",
  "taxes",
  "telekineses",
  "theses",
  "thromboses",
  "tuberculoses",
  "urinalyses"
]

export const pl_prep_list: ReadonlyArray<string> = [
  "about",
  "above",
  "across",
  "after",
  "among",
  "around",
  "at",
  "athwart",
  "before",
  "behind",
  "below",
  "beneath",
  "beside",
  "besides",
  "between",
  "betwixt",
  "beyond",
  "but",
  "by",
  "during",
  "except",
  "for",
  "from",
  "in",
  "into",
  "near",
  "of",
  "off",
  "on",
  "onto",
  "out",
  "over",
  "since",
  "till",
  "to",
  "under",
  "until",
  "unto",
  "upon",
  "with"
]

export const pl_pron_nom: Readonly<Record<string, string>> = {
  i: "we",
  myself: "ourselves",
  you: "you",
  yourself: "yourselves",
  she: "they",
  herself: "themselves",
  he: "they",
  himself: "themselves",
  it: "they",
  itself: "themselves",
  they: "they",
  themself: "themselves",
  mine: "ours",
  yours: "yours",
  hers: "theirs",
  his: "theirs",
  its: "theirs",
  theirs: "theirs"
}

export const pl_pron_acc: Readonly<Record<string, string>> = {
  me: "us",
  myself: "ourselves",
  you: "you",
  yourself: "yourselves",
  her: "them",
  herself: "themselves",
  him: "them",
  himself: "themselves",
  it: "them",
  itself: "themselves",
  them: "them",
  themself: "themselves"
}

export const plverb_irregular_pres: Readonly<Record<string, string>> = {
  am: "are",
  are: "are",
  is: "are",
  was: "were",
  were: "were",
  have: "have",
  has: "have",
  do: "do",
  does: "do"
}

export const plverb_ambiguous_pres: Readonly<Record<string, string>> = {
  act: "act",
  acts: "act",
  blame: "blame",
  blames: "blame",
  can: "can",
  must: "must",
  fly: "fly",
  flies: "fly",
  copy: "copy",
  copies: "copy",
  drink: "drink",
  drinks: "drink",
  fight: "fight",
  fights: "fight",
  fire: "fire",
  fires: "fire",
  like: "like",
  likes: "like",
  look: "look",
  looks: "look",
  make: "make",
  makes: "make",
  reach: "reach",
  reaches: "reach",
  run: "run",
  runs: "run",
  sink: "sink",
  sinks: "sink",
  sleep: "sleep",
  sleeps: "sleep",
  view: "view",
  views: "view"
}

export const plverb_irregular_non_pres: ReadonlyArray<string> = [
  "did",
  "had",
  "ate",
  "made",
  "put",
  "spent",
  "fought",
  "sank",
  "gave",
  "sought",
  "shall",
  "could",
  "ought",
  "should"
]

export const pl_v_oes_oe: ReadonlyArray<string> = [
  "canoes",
  "floes",
  "oboes",
  "roes",
  "throes",
  "woes"
]

export const pl_v_oes_oe_endings_size4: ReadonlyArray<string> = ["hoes", "toes"]

export const pl_v_oes_oe_endings_size5: ReadonlyArray<string> = ["shoes"]

export const pl_adj_special: Readonly<Record<string, string>> = {
  a: "some",
  an: "some",
  this: "these",
  that: "those"
}

export const pl_adj_poss: Readonly<Record<string, string>> = {
  my: "our",
  your: "your",
  its: "their",
  her: "their",
  his: "their",
  their: "their"
}

// Derived irregular singular maps (expanding "modern|classical" alternations)
function invertIrregular(table: Readonly<Record<string, string>>): ReadonlyMap<string, string> {
  const result = new Map<string, string>()
  for (const [singular, plural] of Object.entries(table)) {
    if (plural.includes("|")) {
      for (const variant of plural.split("|")) {
        result.set(variant, singular)
      }
    } else {
      result.set(plural, singular)
    }
  }
  return result
}

export const pl_sb_irregular_values: ReadonlySet<string> = new Set([
  ...Object.values(pl_sb_irregular_s),
  ...Object.values(pl_sb_irregular),
  ...Object.values(pl_sb_irregular_caps)
])

export const si_sb_irregular: ReadonlyMap<string, string> = invertIrregular(pl_sb_irregular)
export const si_sb_irregular_caps: ReadonlyMap<string, string> =
  invertIrregular(pl_sb_irregular_caps)
export const si_sb_irregular_compound: ReadonlyMap<string, string> =
  invertIrregular(pl_sb_irregular_compound)

// Derived bysize maps, sets, and regex stems
export const pl_sb_z_zes_bysize = bysize(pl_sb_z_zes_list)
export const pl_sb_ze_zes_bysize = bysize(pl_sb_ze_zes_list)

export const pl_sb_C_is_ides = joinstem(-2, [
  ...pl_sb_C_is_ides_complete,
  ...pl_sb_C_is_ides_endings.map((w) => `.*${w}`)
])
export const pl_sb_C_is_ides_list: ReadonlyArray<string> = [
  ...pl_sb_C_is_ides_complete,
  ...pl_sb_C_is_ides_endings
]
const cIsIdes = makePlSiLists(pl_sb_C_is_ides_list, "ides", 2, false)
export const si_sb_C_is_ides_bysize = cIsIdes.siBysize
export const pl_sb_C_is_ides_bysize = cIsIdes.plBysize

const cAAta = makePlSiLists(pl_sb_C_a_ata_list, "ata", 1)
export const si_sb_C_a_ata_bysize = cAAta.siBysize
export const pl_sb_C_a_ata_bysize = cAAta.plBysize
export const pl_sb_C_a_ata = cAAta.stem

const uAAe = makePlSiLists(pl_sb_U_a_ae_list, "e", null)
export const si_sb_U_a_ae_bysize = uAAe.siBysize
export const pl_sb_U_a_ae_bysize = uAAe.plBysize

const cAAe = makePlSiLists(pl_sb_C_a_ae_list, "e", null)
export const si_sb_C_a_ae_bysize = cAAe.siBysize
export const pl_sb_C_a_ae_bysize = cAAe.plBysize
export const pl_sb_C_a_ae = cAAe.stem

const cEnIna = makePlSiLists(pl_sb_C_en_ina_list, "ina", 2)
export const si_sb_C_en_ina_bysize = cEnIna.siBysize
export const pl_sb_C_en_ina_bysize = cEnIna.plBysize
export const pl_sb_C_en_ina = cEnIna.stem

const uUmA = makePlSiLists(pl_sb_U_um_a_list, "a", 2)
export const si_sb_U_um_a_bysize = uUmA.siBysize
export const pl_sb_U_um_a_bysize = uUmA.plBysize

const cUmA = makePlSiLists(pl_sb_C_um_a_list, "a", 2)
export const si_sb_C_um_a_bysize = cUmA.siBysize
export const pl_sb_C_um_a_bysize = cUmA.plBysize
export const pl_sb_C_um_a = cUmA.stem

const uUsI = makePlSiLists(pl_sb_U_us_i_list, "i", 2)
export const si_sb_U_us_i_bysize = uUsI.siBysize
export const pl_sb_U_us_i_bysize = uUsI.plBysize

const cUsI = makePlSiLists(pl_sb_C_us_i_list, "i", 2)
export const si_sb_C_us_i_bysize = cUsI.siBysize
export const pl_sb_C_us_i_bysize = cUsI.plBysize
export const pl_sb_C_us_i = cUsI.stem

export const pl_sb_C_us_us_set: ReadonlySet<string> = new Set(pl_sb_C_us_us)
export const pl_sb_C_us_us_bysize = bysize(pl_sb_C_us_us)

const uOnA = makePlSiLists(pl_sb_U_on_a_list, "a", 2)
export const si_sb_U_on_a_bysize = uOnA.siBysize
export const pl_sb_U_on_a_bysize = uOnA.plBysize

const cOnA = makePlSiLists(pl_sb_C_on_a_list, "a", 2)
export const si_sb_C_on_a_bysize = cOnA.siBysize
export const pl_sb_C_on_a_bysize = cOnA.plBysize
export const pl_sb_C_on_a = cOnA.stem

export const pl_sb_C_o_i_bysize = bysize(pl_sb_C_o_i)
export const si_sb_C_o_i_bysize = bysize(pl_sb_C_o_i.map((w) => `${w.slice(0, -1)}i`))
export const pl_sb_C_o_i_stems = joinstem(-1, pl_sb_C_o_i)

export const pl_sb_U_o_os_complete_set: ReadonlySet<string> = new Set(pl_sb_U_o_os_complete)
export const si_sb_U_o_os_complete_set: ReadonlySet<string> = new Set(
  pl_sb_U_o_os_complete.map((w) => `${w}s`)
)
export const pl_sb_U_o_os_bysize = bysize(pl_sb_U_o_os_endings)
export const si_sb_U_o_os_bysize = bysize(pl_sb_U_o_os_endings.map((w) => `${w}s`))

const uChChs = makePlSiLists(pl_sb_U_ch_chs_list, "s", null)
export const si_sb_U_ch_chs_bysize = uChChs.siBysize
export const pl_sb_U_ch_chs_bysize = uChChs.plBysize

const uExIces = makePlSiLists(pl_sb_U_ex_ices_list, "ices", 2)
export const si_sb_U_ex_ices_bysize = uExIces.siBysize
export const pl_sb_U_ex_ices_bysize = uExIces.plBysize

const uIxIces = makePlSiLists(pl_sb_U_ix_ices_list, "ices", 2)
export const si_sb_U_ix_ices_bysize = uIxIces.siBysize
export const pl_sb_U_ix_ices_bysize = uIxIces.plBysize

const cExIces = makePlSiLists(pl_sb_C_ex_ices_list, "ices", 2)
export const si_sb_C_ex_ices_bysize = cExIces.siBysize
export const pl_sb_C_ex_ices_bysize = cExIces.plBysize
export const pl_sb_C_ex_ices = cExIces.stem

const cIxIces = makePlSiLists(pl_sb_C_ix_ices_list, "ices", 2)
export const si_sb_C_ix_ices_bysize = cIxIces.siBysize
export const pl_sb_C_ix_ices_bysize = cIxIces.plBysize
export const pl_sb_C_ix_ices = cIxIces.stem

const cI = makePlSiLists(pl_sb_C_i_list, "i", null)
export const si_sb_C_i_bysize = cI.siBysize
export const pl_sb_C_i_bysize = cI.plBysize
export const pl_sb_C_i = cI.stem

const cIm = makePlSiLists(pl_sb_C_im_list, "im", null)
export const si_sb_C_im_bysize = cIm.siBysize
export const pl_sb_C_im_bysize = cIm.plBysize
export const pl_sb_C_im = cIm.stem

const uManMans = makePlSiLists(pl_sb_U_man_mans_list, "s", null, false)
export const si_sb_U_man_mans_bysize = uManMans.siBysize
export const pl_sb_U_man_mans_bysize = uManMans.plBysize

const uManMansCaps = makePlSiLists(pl_sb_U_man_mans_caps_list, "s", null, false)
export const si_sb_U_man_mans_caps_bysize = uManMansCaps.siBysize
export const pl_sb_U_man_mans_caps_bysize = uManMansCaps.plBysize

const uLouseLice = makePlSiLists(pl_sb_U_louse_lice_list, "lice", 5, false)
export const si_sb_U_louse_lice_bysize = uLouseLice.siBysize
export const pl_sb_U_louse_lice_bysize = uLouseLice.plBysize

export const pl_sb_uninflected_s: ReadonlyArray<string> = [
  ...pl_sb_uninflected_s_complete,
  ...pl_sb_uninflected_s_endings.map((w) => `.*${w}`)
]
export const pl_sb_uninflected_herd_set: ReadonlySet<string> = new Set(pl_sb_uninflected_herd)
export const pl_sb_uninflected_complete_set: ReadonlySet<string> = new Set(
  pl_sb_uninflected_complete
)
export const pl_sb_uninflected_caps_set: ReadonlySet<string> = new Set(pl_sb_uninflected_caps)
export const pl_sb_uninflected_bysize = bysize(pl_sb_uninflected_endings)

export const pl_sb_singular_s_complete_set: ReadonlySet<string> = new Set(pl_sb_singular_s_complete)
export const pl_sb_singular_s_endings: ReadonlyArray<string> = [
  "ss",
  "us",
  ...pl_sb_C_is_ides_endings
]
export const pl_sb_singular_s_bysize = bysize(pl_sb_singular_s_endings)

export const si_sb_singular_s_complete_set: ReadonlySet<string> = new Set(
  pl_sb_singular_s_complete.map((w) => `${w}es`)
)
export const si_sb_singular_s_endings: ReadonlyArray<string> = pl_sb_singular_s_endings.map(
  (w) => `${w}es`
)
export const si_sb_singular_s_bysize = bysize(si_sb_singular_s_endings)

export const pl_sb_singular_s = enclose(
  [
    ...pl_sb_singular_s_complete,
    ...pl_sb_singular_s_endings.map((w) => `.*${w}`),
    "[A-Z].*es"
  ].join("|")
)

export const si_sb_ois_oi_case_set: ReadonlySet<string> = new Set(si_sb_ois_oi_case)
export const si_sb_uses_use_case_set: ReadonlySet<string> = new Set(si_sb_uses_use_case)
export const si_sb_uses_use_set: ReadonlySet<string> = new Set(si_sb_uses_use)
export const si_sb_ies_ie_case_set: ReadonlySet<string> = new Set(si_sb_ies_ie_case)
export const si_sb_ies_ie_set: ReadonlySet<string> = new Set(si_sb_ies_ie)
export const si_sb_oes_oe_case_set: ReadonlySet<string> = new Set(si_sb_oes_oe_case)
export const si_sb_oes_oe_set: ReadonlySet<string> = new Set(si_sb_oes_oe)
export const si_sb_z_zes_set: ReadonlySet<string> = new Set(si_sb_z_zes)
export const si_sb_zzes_zz_set: ReadonlySet<string> = new Set(si_sb_zzes_zz)
export const si_sb_ches_che_case_set: ReadonlySet<string> = new Set(si_sb_ches_che_case)
export const si_sb_ches_che_set: ReadonlySet<string> = new Set(si_sb_ches_che)
export const si_sb_xes_xe_set: ReadonlySet<string> = new Set(si_sb_xes_xe)
export const si_sb_sses_sse_case_set: ReadonlySet<string> = new Set(si_sb_sses_sse_case)
export const si_sb_sses_sse_set: ReadonlySet<string> = new Set(si_sb_sses_sse)
export const si_sb_ves_ve_case_set: ReadonlySet<string> = new Set(si_sb_ves_ve_case)
export const si_sb_ves_ve_set: ReadonlySet<string> = new Set(si_sb_ves_ve)
export const si_sb_es_is_set: ReadonlySet<string> = new Set(si_sb_es_is)

export const plverb_special_s = enclose(
  [
    pl_sb_singular_s,
    ...pl_sb_uninflected_s,
    ...Object.keys(pl_sb_irregular_s),
    "(.*[csx])is",
    "(.*)ceps",
    "[A-Z].*s"
  ].join("|")
)
export const PLVERB_SPECIAL_S_RE = new RegExp(`^(${plverb_special_s})$`)

const postfixAdjDefn: ReadonlyArray<readonly [string, string]> = [
  ["general", enclose("(?!major|lieutenant|brigadier|adjutant|.*star)\\S+")],
  ["martial", enclose("court")],
  ["force", enclose("pound")]
]
const plSbPostfixAdj = postfixAdjDefn.map(([key, val]) => enclose(`${val}(?=(?:-|\\s+)${key})`))
export const PL_SB_POSTFIX_ADJ_STEMS_RE = new RegExp(`^(?:(${plSbPostfixAdj.join("|")})(.*))$`, "i")

export const pl_prep_list_da: ReadonlyArray<string> = [...pl_prep_list, "de", "du", "da"]
export const pl_prep_set: ReadonlySet<string> = new Set(pl_prep_list_da)
export const pl_prep_bysize = bysize(pl_prep_list_da)
export const pl_prep = enclose(pl_prep_list_da.join("|"))
export const PL_SB_PREP_DUAL_COMPOUND_RE = new RegExp(
  `^(?:(.*?)((?:-|\\s+)(?:${pl_prep})(?:-|\\s+))a(?:-|\\s+)(.*))$`,
  "i"
)

// Pronouns
export const pl_pron_acc_keys_bysize = bysize(Object.keys(pl_pron_acc))

type SingularPronounEntry = string | Readonly<Record<Gender, string>>

function buildSiPron(): {
  readonly nom: ReadonlyMap<string, SingularPronounEntry>
  readonly acc: ReadonlyMap<string, SingularPronounEntry>
} {
  const nom = new Map<string, SingularPronounEntry>()
  for (const [sing, plur] of Object.entries(pl_pron_nom)) {
    nom.set(plur, sing)
  }
  nom.set("we", "I")
  nom.set("they", {
    neuter: "it",
    feminine: "she",
    masculine: "he",
    "gender-neutral": "they",
    "feminine or masculine": "she or he",
    "masculine or feminine": "he or she"
  })
  nom.set("themselves", {
    neuter: "itself",
    feminine: "herself",
    masculine: "himself",
    "gender-neutral": "themself",
    "feminine or masculine": "herself or himself",
    "masculine or feminine": "himself or herself"
  })
  nom.set("theirs", {
    neuter: "its",
    feminine: "hers",
    masculine: "his",
    "gender-neutral": "theirs",
    "feminine or masculine": "hers or his",
    "masculine or feminine": "his or hers"
  })

  const acc = new Map<string, SingularPronounEntry>()
  for (const [sing, plur] of Object.entries(pl_pron_acc)) {
    acc.set(plur, sing)
  }
  acc.set("them", {
    neuter: "it",
    feminine: "her",
    masculine: "him",
    "gender-neutral": "them",
    "feminine or masculine": "her or him",
    "masculine or feminine": "him or her"
  })
  acc.set("themselves", {
    neuter: "itself",
    feminine: "herself",
    masculine: "himself",
    "gender-neutral": "themself",
    "feminine or masculine": "herself or himself",
    "masculine or feminine": "himself or herself"
  })

  return { nom, acc }
}

export const si_pron = buildSiPron()
export const si_pron_acc_keys_bysize = bysize(si_pron.acc.keys())

export function getSiPron(
  theCase: "nom" | "acc",
  word: string,
  gender: Gender
): string | undefined {
  const entry = si_pron[theCase].get(word)
  if (entry === undefined) {
    return undefined
  }
  if (Predicate.isString(entry)) {
    return entry
  }
  return entry[gender]
}

// Verbs & Adjectives
export const plverb_ambiguous_pres_keys = new RegExp(
  `^(${enclose(Object.keys(plverb_ambiguous_pres).join("|"))})((\\s.*)?)$`,
  "i"
)
export const plverb_irregular_non_pres_set: ReadonlySet<string> = new Set(plverb_irregular_non_pres)
export const plverb_ambiguous_non_pres = /^((?:thought|saw|bent|will|might|cut))((\s.*)?)$/i
export const pl_v_oes_oe_set: ReadonlySet<string> = new Set(pl_v_oes_oe)
export const pl_v_oes_oe_endings_size4_set: ReadonlySet<string> = new Set(pl_v_oes_oe_endings_size4)
export const pl_v_oes_oe_endings_size5_set: ReadonlySet<string> = new Set(pl_v_oes_oe_endings_size5)

export const pl_adj_special_keys = new RegExp(
  `^(${enclose(Object.keys(pl_adj_special).join("|"))})$`,
  "i"
)
export const pl_adj_poss_keys = new RegExp(
  `^(${enclose(Object.keys(pl_adj_poss).join("|"))})$`,
  "i"
)

// Indefinite article patterns (A_abbrev has Python re.VERBOSE whitespace stripped)
export const A_abbrev =
  /^(?!FJO|[HLMNS]Y.|RY[EO]|SQU|(F[LR]?|[HL]|MN?|N|RH?|S[CHKLMNPTVW]?|X(YL)?)[AEIOU])[FHLMNRSX][A-Z]/
export const A_y_cons = /^(y(b[lor]|cl[ea]|fere|gg|p[ios]|rou|tt))/i
export const A_explicit_a = /^((?:unabomber|unanimous|US))/i
export const A_explicit_an = /^((?:euler|hour(?!i)|heir|honest|hono[ur]|mpeg))/i
export const A_ordinal_an = /^([aefhilmnorsx]-?th)/i
export const A_ordinal_a = /^([bcdgjkpqtuvwyz]-?th)/i

// Numerals and ordinals
export const nth: Readonly<Record<number, string>> = {
  0: "th",
  1: "st",
  2: "nd",
  3: "rd",
  4: "th",
  5: "th",
  6: "th",
  7: "th",
  8: "th",
  9: "th",
  11: "th",
  12: "th",
  13: "th"
}
export const nth_suff: ReadonlySet<string> = new Set(Object.values(nth))

export const ordinal_map: Readonly<Record<string, string>> = {
  ty: "tieth",
  one: "first",
  two: "second",
  three: "third",
  five: "fifth",
  eight: "eighth",
  nine: "ninth",
  twelve: "twelfth"
}
export const ordinal_suff = new RegExp(`(${Object.keys(ordinal_map).join("|")})$`)

export const unit: ReadonlyArray<string> = [
  "",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine"
]
export const teen: ReadonlyArray<string> = [
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen"
]
export const ten: ReadonlyArray<string> = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety"
]
export const mill: ReadonlyArray<string> = [
  " ",
  " thousand",
  " million",
  " billion",
  " trillion",
  " quadrillion",
  " quintillion",
  " sextillion",
  " septillion",
  " octillion",
  " nonillion",
  " decillion"
]

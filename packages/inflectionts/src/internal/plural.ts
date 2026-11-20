import * as Option from "effect/Option"

import {
  allClassical,
  ComparisonResult,
  noClassical,
  type CountInput,
  type Gender,
  type InflectorState
} from "../Schema.ts"
import * as Data from "./data.ts"
import {
  formatCountValue,
  getCount,
  handlePrepositionalPhrase,
  matchesBysizeSuffix,
  parseWords,
  partitionWord,
  PL_COUNT_ZERO,
  postprocess,
  slicePrefix,
  udMatch,
  type ParsedWords
} from "./helpers.ts"

const DENOMINATOR_RE = /(.+)( (?:per|a) .+)/
const WHITESPACE_RE = /\s/
const ENDS_WITH_S_RE = /^(.*[^s])s$/i
const ENDS_WITH_APOSTROPHE_S_RE = /^(.+)'s?$/
const VOWELS_SET: ReadonlySet<string> = new Set(["a", "e", "i", "o", "u"])

const PRESENT_PARTICIPLE_REPLACEMENTS: ReadonlyArray<readonly [RegExp, string]> = [
  [/ie$/, "y"],
  [/ue$/, "u"],
  [/([auy])e$/, "$1"],
  [/ski$/, "ski"],
  [/[^b]i$/, ""],
  [/^(are|were)$/, "be"],
  [/^(had)$/, "hav"],
  [/^(hoe|be)$/, "$1"],
  [/([^e])e$/, "$1"],
  [/er$/, "er"],
  [/([aeiou]c)$/, "$1k"],
  [/([^aeiou][aeiouy]([bdgmnprst]))$/, "$1$2"]
]

const PL_UNASSIMILATED_RULES: ReadonlyArray<
  readonly [string, ReadonlyMap<number, ReadonlySet<string>>, number | null, string]
> = [
  ["h", Data.pl_sb_U_ch_chs_bysize, null, "s"],
  ["x", Data.pl_sb_U_ex_ices_bysize, -2, "ices"],
  ["x", Data.pl_sb_U_ix_ices_bysize, -2, "ices"],
  ["m", Data.pl_sb_U_um_a_bysize, -2, "a"],
  ["s", Data.pl_sb_U_us_i_bysize, -2, "i"],
  ["n", Data.pl_sb_U_on_a_bysize, -2, "a"],
  ["a", Data.pl_sb_U_a_ae_bysize, null, "e"]
]

const PL_ANCIENT_RULES: ReadonlyArray<
  readonly [string, ReadonlyMap<number, ReadonlySet<string>>, number | null, string]
> = [
  ["n", Data.pl_sb_C_en_ina_bysize, -2, "ina"],
  ["x", Data.pl_sb_C_ex_ices_bysize, -2, "ices"],
  ["x", Data.pl_sb_C_ix_ices_bysize, -2, "ices"],
  ["m", Data.pl_sb_C_um_a_bysize, -2, "a"],
  ["s", Data.pl_sb_C_us_i_bysize, -2, "i"],
  ["s", Data.pl_sb_C_us_us_bysize, null, ""],
  ["a", Data.pl_sb_C_a_ae_bysize, null, "e"],
  ["a", Data.pl_sb_C_a_ata_bysize, null, "ta"],
  ["s", Data.pl_sb_C_is_ides_bysize, -1, "des"],
  ["o", Data.pl_sb_C_o_i_bysize, -1, "i"],
  ["n", Data.pl_sb_C_on_a_bysize, -2, "a"]
]

const SI_UNASSIMILATED_RULES: ReadonlyArray<
  readonly [string, ReadonlyMap<number, ReadonlySet<string>>, number | null, string]
> = [
  ["s", Data.si_sb_U_ch_chs_bysize, -1, ""],
  ["s", Data.si_sb_U_ex_ices_bysize, -4, "ex"],
  ["s", Data.si_sb_U_ix_ices_bysize, -4, "ix"],
  ["a", Data.si_sb_U_um_a_bysize, -1, "um"],
  ["i", Data.si_sb_U_us_i_bysize, -1, "us"],
  ["a", Data.si_sb_U_on_a_bysize, -1, "on"],
  ["e", Data.si_sb_U_a_ae_bysize, -1, ""]
]

const SI_ANCIENT_RULES: ReadonlyArray<
  readonly [string, ReadonlyMap<number, ReadonlySet<string>>, number | null, string]
> = [
  ["a", Data.si_sb_C_en_ina_bysize, -3, "en"],
  ["s", Data.si_sb_C_ex_ices_bysize, -4, "ex"],
  ["s", Data.si_sb_C_ix_ices_bysize, -4, "ix"],
  ["a", Data.si_sb_C_um_a_bysize, -1, "um"],
  ["i", Data.si_sb_C_us_i_bysize, -1, "us"],
  ["s", Data.pl_sb_C_us_us_bysize, null, ""],
  ["e", Data.si_sb_C_a_ae_bysize, -1, ""],
  ["a", Data.si_sb_C_a_ata_bysize, -2, ""],
  ["s", Data.si_sb_C_is_ides_bysize, -3, "s"],
  ["i", Data.si_sb_C_o_i_bysize, -1, "o"],
  ["a", Data.si_sb_C_on_a_bysize, -1, "on"],
  ["m", Data.si_sb_C_im_bysize, -2, ""],
  ["i", Data.si_sb_C_i_bysize, -1, ""]
]

const COMPARE_STEM_ENDINGS: ReadonlyArray<readonly [string, string, string]> = [
  [Data.pl_sb_C_a_ata, "as", "ata"],
  [Data.pl_sb_C_is_ides, "is", "ides"],
  [Data.pl_sb_C_a_ae, "s", "e"],
  [Data.pl_sb_C_en_ina, "ens", "ina"],
  [Data.pl_sb_C_um_a, "ums", "a"],
  [Data.pl_sb_C_us_i, "uses", "i"],
  [Data.pl_sb_C_on_a, "ons", "a"],
  [Data.pl_sb_C_o_i_stems, "os", "i"],
  [Data.pl_sb_C_ex_ices, "exes", "ices"],
  [Data.pl_sb_C_ix_ices, "ixes", "ices"],
  [Data.pl_sb_C_i, "s", "i"],
  [Data.pl_sb_C_im, "s", "im"],
  [".*eau", "s", "x"],
  [".*ieu", "s", "x"],
  [".*tri", "xes", "ces"],
  [".{2,}[yia]n", "xes", "ges"]
]

function handleLongCompounds(
  words: ParsedWords,
  count: 1 | 2,
  state: InflectorState
): string | undefined {
  const tokens = words.split
  for (let i = 0; i <= tokens.length - 2; i++) {
    const cand = tokens[i]
    const prep = tokens[i + 1]
    if (cand === undefined || prep === undefined) {
      continue
    }
    if (!Data.pl_prep_set.has(prep)) {
      continue
    }
    let inflected: string
    if (count === 1) {
      const singular = sinoun(cand, 1, state.gender, state)
      inflected = Option.getOrElse(singular, () => cand)
    } else {
      inflected = plnoun(cand, 2, state)
    }
    const leader = tokens.slice(0, i)
    const trailer = tokens.slice(i + 2)
    return [...leader, inflected, prep, ...trailer].join(" ")
  }
  return undefined
}

export function plnoun(word: string, count: CountInput, state: InflectorState): string {
  const effectiveCount = getCount(count, state)
  if (effectiveCount === 1) {
    return word
  }

  const userDefined = udMatch(word, state.plSbUserDefined)
  if (userDefined !== undefined) {
    return userDefined
  }

  if (word === "") {
    return word
  }

  const words = parseWords(word)
  if (words === undefined) {
    return word
  }

  const loweredLast = words.last.toLowerCase()

  if (Data.pl_sb_uninflected_complete_set.has(loweredLast)) {
    if (words.split.length >= 3) {
      return handleLongCompounds(words, 2, state) ?? word
    }
    return word
  }

  if (Data.pl_sb_uninflected_caps_set.has(word)) {
    return word
  }

  if (matchesBysizeSuffix(words.lowered, Data.pl_sb_uninflected_bysize)) {
    return word
  }

  if (state.classical.herd && Data.pl_sb_uninflected_herd_set.has(loweredLast)) {
    return word
  }

  // Compounds: "Governor General", "mother-in-law", "aide-de-camp", etc.
  const postfixMatch = Data.PL_SB_POSTFIX_ADJ_STEMS_RE.exec(word)
  if (postfixMatch !== null) {
    const g1 = postfixMatch[1]
    const g2 = postfixMatch[2]
    if (g1 !== undefined && g2 !== undefined && g2 !== "") {
      return `${plnoun(g1, 2, state)}${g2}`
    }
  }

  if (words.lowered.includes(" a ") || words.lowered.includes("-a-")) {
    const dualMatch = Data.PL_SB_PREP_DUAL_COMPOUND_RE.exec(word)
    if (dualMatch !== null) {
      const g1 = dualMatch[1]
      const g2 = dualMatch[2]
      const g3 = dualMatch[3]
      if (g1 !== undefined && g2 !== undefined && g3 !== undefined && g2 !== "" && g3 !== "") {
        return `${plnoun(g1, 2, state)}${g2}${plnoun(g3, undefined, state)}`
      }
    }
  }

  if (words.split.length >= 3) {
    const handled = handleLongCompounds(words, 2, state)
    if (handled !== undefined) {
      return handled
    }
  }

  // Only pluralize denominators in units
  const denomMatch = DENOMINATOR_RE.exec(words.lowered)
  if (denomMatch !== null && denomMatch[1] !== undefined) {
    const index = denomMatch[1].length
    return `${plnoun(word.slice(0, index), undefined, state)}${word.slice(index)}`
  }

  // Handle units given in degrees
  if (words.split.length >= 2 && words.split[words.split.length - 2] === "degree") {
    return [plnoun(words.first, undefined, state), ...words.split.slice(1)].join(" ")
  }

  const hyphenPrep = handlePrepositionalPhrase(
    words.lowered,
    (part) => plnoun(part, 2, state),
    "-",
    Data.pl_prep_set
  )
  if (hyphenPrep !== undefined) {
    return hyphenPrep
  }

  // Pronouns
  for (const [k, accSet] of Data.pl_pron_acc_keys_bysize) {
    const suffix = words.lowered.slice(-k)
    if (words.lowered.length >= k && accSet.has(suffix)) {
      for (const [pk, prepSet] of Data.pl_prep_bysize) {
        const prefix = words.lowered.slice(0, pk)
        if (words.lowered.length >= pk && prepSet.has(prefix)) {
          const toks = words.split
          if (
            toks.length === 2 &&
            toks[0]?.toLowerCase() === prefix &&
            toks[1]?.toLowerCase() === suffix
          ) {
            const replacement = Data.pl_pron_acc[suffix]
            if (replacement !== undefined) {
              return words.lowered.slice(0, -k) + replacement
            }
          }
        }
      }
    }
  }

  const nomPron = Data.pl_pron_nom[words.lowered]
  if (nomPron !== undefined) {
    return nomPron
  }

  const accPron = Data.pl_pron_acc[words.lowered]
  if (accPron !== undefined) {
    return accPron
  }

  // Isolated irregular plurals
  const irregCap = Data.pl_sb_irregular_caps[words.last]
  if (irregCap !== undefined) {
    return `${word.slice(0, word.length - words.last.length)}${irregCap}`
  }

  const irreg = Data.pl_sb_irregular[loweredLast]
  if (irreg !== undefined) {
    return `${word.slice(0, word.length - loweredLast.length)}${irreg}`
  }

  const dashSplit = words.lowered.split("-")
  const lastTwoDash = dashSplit.slice(-2).join(" ")
  const irregCompound = Data.pl_sb_irregular_compound[lastTwoDash]
  if (irregCompound !== undefined) {
    return `${word.slice(0, word.length - lastTwoDash.length)}${irregCompound}`
  }

  if (words.lowered.slice(-3) === "quy") {
    return `${word.slice(0, -1)}ies`
  }

  if (words.lowered.slice(-6) === "person") {
    return state.classical.persons ? `${word}s` : `${word.slice(0, -4)}ople`
  }

  // Families of irregular plurals
  if (words.lowered.slice(-3) === "man") {
    if (
      matchesBysizeSuffix(words.lowered, Data.pl_sb_U_man_mans_bysize) ||
      matchesBysizeSuffix(word, Data.pl_sb_U_man_mans_caps_bysize)
    ) {
      return `${word}s`
    }
    return `${word.slice(0, -3)}men`
  }
  if (words.lowered.slice(-5) === "mouse") {
    return `${word.slice(0, -5)}mice`
  }
  if (words.lowered.slice(-5) === "louse") {
    const bucket = Data.pl_sb_U_louse_lice_bysize.get(word.length)
    if (bucket !== undefined && bucket.has(words.lowered)) {
      return `${word.slice(0, -5)}lice`
    }
    return `${word}s`
  }
  if (words.lowered.slice(-5) === "goose") {
    return `${word.slice(0, -5)}geese`
  }
  if (words.lowered.slice(-5) === "tooth") {
    return `${word.slice(0, -5)}teeth`
  }
  if (words.lowered.slice(-4) === "foot") {
    return `${word.slice(0, -4)}feet`
  }
  if (words.lowered.slice(-4) === "taco") {
    return `${word.slice(0, -5)}tacos`
  }
  if (words.lowered === "die") {
    return "dice"
  }

  // Unassimilated imports
  if (words.lowered.slice(-4) === "ceps") {
    return word
  }
  if (words.lowered.slice(-4) === "zoon") {
    return `${word.slice(0, -2)}a`
  }
  const last3 = words.lowered.slice(-3)
  if (last3 === "cis" || last3 === "sis" || last3 === "xis") {
    return `${word.slice(0, -2)}es`
  }

  const lastChar = words.lowered.slice(-1)
  for (const [lastLet, table, numEnd, post] of PL_UNASSIMILATED_RULES) {
    if (lastChar === lastLet && matchesBysizeSuffix(words.lowered, table)) {
      return slicePrefix(word, numEnd) + post
    }
  }

  // Incompletely assimilated imports (classical ancient)
  if (state.classical.ancient) {
    if (words.lowered.slice(-4) === "trix") {
      return `${word.slice(0, -1)}ces`
    }
    if (last3 === "eau" || last3 === "ieu") {
      return `${word}x`
    }
    if ((last3 === "ynx" || last3 === "inx" || last3 === "anx") && word.length > 4) {
      return `${word.slice(0, -1)}ges`
    }

    for (const [lastLet, table, numEnd, post] of PL_ANCIENT_RULES) {
      if (lastChar === lastLet && matchesBysizeSuffix(words.lowered, table)) {
        return slicePrefix(word, numEnd) + post
      }
    }

    if (matchesBysizeSuffix(words.lowered, Data.pl_sb_C_i_bysize)) {
      return `${word}i`
    }
    if (matchesBysizeSuffix(words.lowered, Data.pl_sb_C_im_bysize)) {
      return `${word}im`
    }
  }

  // Singular nouns ending in ...s or other sibilants
  if (Data.pl_sb_singular_s_complete_set.has(loweredLast)) {
    return `${word}es`
  }

  if (matchesBysizeSuffix(words.lowered, Data.pl_sb_singular_s_bysize)) {
    return `${word}es`
  }

  const last2 = words.lowered.slice(-2)
  const firstChar = word.charAt(0)
  if (last2 === "es" && firstChar === firstChar.toUpperCase()) {
    return `${word}es`
  }

  if (lastChar === "z") {
    if (matchesBysizeSuffix(words.lowered, Data.pl_sb_z_zes_bysize)) {
      return `${word}es`
    }
    if (words.lowered.slice(-2, -1) !== "z") {
      return `${word}zes`
    }
  }

  if (last2 === "ze" && matchesBysizeSuffix(words.lowered, Data.pl_sb_ze_zes_bysize)) {
    return `${word}s`
  }

  if (last2 === "ch" || last2 === "sh" || last2 === "zz" || last2 === "ss" || lastChar === "x") {
    return `${word}es`
  }

  // ...f -> ...ves
  if (last3 === "elf" || last3 === "alf" || last3 === "olf" || last3 === "arf") {
    return `${word.slice(0, -1)}ves`
  }
  if (last3 === "eaf" && words.lowered.slice(-4, -3) !== "d") {
    return `${word.slice(0, -1)}ves`
  }
  const last4 = words.lowered.slice(-4)
  if (last4 === "nife" || last4 === "life" || last4 === "wife") {
    return `${word.slice(0, -2)}ves`
  }

  // ...y
  if (lastChar === "y") {
    if (VOWELS_SET.has(words.lowered.slice(-2, -1)) || word.length === 1) {
      return `${word}s`
    }
    const lastWordFirst = words.last.charAt(0)
    if (state.classical.names && lastWordFirst === lastWordFirst.toUpperCase()) {
      return `${word}s`
    }
    return `${word.slice(0, -1)}ies`
  }

  // ...o
  if (Data.pl_sb_U_o_os_complete_set.has(loweredLast)) {
    return `${word}s`
  }
  if (matchesBysizeSuffix(words.lowered, Data.pl_sb_U_o_os_bysize)) {
    return `${word}s`
  }
  if (last2 === "ao" || last2 === "eo" || last2 === "io" || last2 === "oo" || last2 === "uo") {
    return `${word}s`
  }
  if (lastChar === "o") {
    return `${word}es`
  }

  return `${word}s`
}

export function plSpecialVerb(
  word: string,
  count: CountInput,
  state: InflectorState
): string | undefined {
  if (state.classical.zero && count !== undefined && count !== null) {
    if (PL_COUNT_ZERO.has(formatCountValue(count).toLowerCase())) {
      return undefined
    }
  }

  const effectiveCount = getCount(count, state)
  if (effectiveCount === 1) {
    return word
  }

  const userDefined = udMatch(word, state.plVUserDefined)
  if (userDefined !== undefined) {
    return userDefined
  }

  const words = parseWords(word)
  if (words === undefined) {
    return undefined
  }

  const irregPres = Data.plverb_irregular_pres[words.first]
  if (irregPres !== undefined) {
    return `${irregPres}${word.slice(words.first.length)}`
  }

  if (Data.plverb_irregular_non_pres_set.has(words.first)) {
    return word
  }

  if (words.first.endsWith("n't")) {
    const stem = words.first.slice(0, -3)
    const irregNeg = Data.plverb_irregular_pres[stem]
    if (irregNeg !== undefined) {
      return `${irregNeg}n't${word.slice(words.first.length)}`
    }
    return word
  }

  if (Data.PLVERB_SPECIAL_S_RE.test(word)) {
    return undefined
  }
  if (WHITESPACE_RE.test(word)) {
    return undefined
  }

  if (words.lowered === "quizzes") {
    return "quiz"
  }

  const last4 = words.lowered.slice(-4)
  const last3 = words.lowered.slice(-3)
  if (
    last4 === "ches" ||
    last4 === "shes" ||
    last4 === "zzes" ||
    last4 === "sses" ||
    last3 === "xes"
  ) {
    return word.slice(0, -2)
  }

  if (last3 === "ies" && word.length > 3) {
    return `${words.lowered.slice(0, -3)}y`
  }

  if (
    Data.pl_v_oes_oe_set.has(words.last.toLowerCase()) ||
    Data.pl_v_oes_oe_endings_size4_set.has(last4) ||
    Data.pl_v_oes_oe_endings_size5_set.has(words.lowered.slice(-5))
  ) {
    return word.slice(0, -1)
  }

  if (words.lowered.endsWith("oes") && word.length > 3) {
    return words.lowered.slice(0, -2)
  }

  const endsWithSMatch = ENDS_WITH_S_RE.exec(word)
  if (endsWithSMatch !== null && endsWithSMatch[1] !== undefined) {
    return endsWithSMatch[1]
  }

  return undefined
}

export function plGeneralVerb(word: string, count: CountInput, state: InflectorState): string {
  const effectiveCount = getCount(count, state)
  if (effectiveCount === 1) {
    return word
  }

  const ambigPresMatch = Data.plverb_ambiguous_pres_keys.exec(word)
  if (ambigPresMatch !== null && ambigPresMatch[1] !== undefined) {
    const replacement = Data.plverb_ambiguous_pres[ambigPresMatch[1].toLowerCase()]
    if (replacement !== undefined) {
      return `${replacement}${ambigPresMatch[2] ?? ""}`
    }
  }

  if (Data.plverb_ambiguous_non_pres.test(word)) {
    return word
  }

  return word
}

export function plSpecialAdjective(
  word: string,
  count: CountInput,
  state: InflectorState
): string | undefined {
  const effectiveCount = getCount(count, state)
  if (effectiveCount === 1) {
    return word
  }

  const userDefined = udMatch(word, state.plAdjUserDefined)
  if (userDefined !== undefined) {
    return userDefined
  }

  const specialMatch = Data.pl_adj_special_keys.exec(word)
  if (specialMatch !== null && specialMatch[1] !== undefined) {
    const replacement = Data.pl_adj_special[specialMatch[1].toLowerCase()]
    if (replacement !== undefined) {
      return replacement
    }
  }

  const possMatch = Data.pl_adj_poss_keys.exec(word)
  if (possMatch !== null && possMatch[1] !== undefined) {
    const replacement = Data.pl_adj_poss[possMatch[1].toLowerCase()]
    if (replacement !== undefined) {
      return replacement
    }
  }

  const aposMatch = ENDS_WITH_APOSTROPHE_S_RE.exec(word)
  if (aposMatch !== null && aposMatch[1] !== undefined) {
    const pl = pluralNounWord(aposMatch[1], undefined, state)
    const trailingS = pl.endsWith("s") ? "" : "s"
    return `${pl}'${trailingS}`
  }

  return undefined
}

export function sinoun(
  word: string,
  count: CountInput,
  gender: Gender,
  state: InflectorState
): Option.Option<string> {
  const effectiveCount = getCount(count, state)
  if (effectiveCount === 2) {
    return Option.some(word)
  }

  const userDefined = udMatch(word, state.siSbUserDefined)
  if (userDefined !== undefined) {
    return Option.some(userDefined)
  }

  if (word === "") {
    return Option.some(word)
  }

  if (Data.si_sb_ois_oi_case_set.has(word)) {
    return Option.some(word.slice(0, -1))
  }

  const words = parseWords(word)
  if (words === undefined) {
    return Option.none()
  }

  const loweredLast = words.last.toLowerCase()

  if (Data.pl_sb_uninflected_complete_set.has(loweredLast)) {
    if (words.split.length >= 3) {
      return Option.some(handleLongCompounds(words, 1, state) ?? word)
    }
    return Option.some(word)
  }

  if (Data.pl_sb_uninflected_caps_set.has(word)) {
    return Option.some(word)
  }

  if (matchesBysizeSuffix(words.lowered, Data.pl_sb_uninflected_bysize)) {
    return Option.some(word)
  }

  if (state.classical.herd && Data.pl_sb_uninflected_herd_set.has(loweredLast)) {
    return Option.some(word)
  }

  if (Data.pl_sb_C_us_us_set.has(loweredLast)) {
    return state.classical.ancient ? Option.some(word) : Option.none()
  }

  // Compounds
  const postfixMatch = Data.PL_SB_POSTFIX_ADJ_STEMS_RE.exec(word)
  if (postfixMatch !== null) {
    const g1 = postfixMatch[1]
    const g2 = postfixMatch[2]
    if (g1 !== undefined && g2 !== undefined && g2 !== "") {
      const singHead = sinoun(g1, 1, gender, state)
      return Option.map(singHead, (head) => `${head}${g2}`)
    }
  }

  const spacePrep = handlePrepositionalPhrase(
    words.lowered,
    (part) => Option.getOrUndefined(sinoun(part, 1, gender, state)),
    " ",
    Data.pl_prep_set
  )
  if (spacePrep !== undefined) {
    return Option.some(spacePrep)
  }

  const hyphenPrep = handlePrepositionalPhrase(
    words.lowered,
    (part) => Option.getOrUndefined(sinoun(part, 1, gender, state)),
    "-",
    Data.pl_prep_set
  )
  if (hyphenPrep !== undefined) {
    return Option.some(hyphenPrep)
  }

  // Pronouns
  for (const [k, accSet] of Data.si_pron_acc_keys_bysize) {
    const suffix = words.lowered.slice(-k)
    if (words.lowered.length >= k && accSet.has(suffix)) {
      for (const [pk, prepSet] of Data.pl_prep_bysize) {
        const prefix = words.lowered.slice(0, pk)
        if (words.lowered.length >= pk && prepSet.has(prefix)) {
          const toks = words.split
          if (
            toks.length === 2 &&
            toks[0]?.toLowerCase() === prefix &&
            toks[1]?.toLowerCase() === suffix
          ) {
            const singPron = Data.getSiPron("acc", suffix, gender)
            if (singPron !== undefined) {
              return Option.some(words.lowered.slice(0, -k) + singPron)
            }
          }
        }
      }
    }
  }

  const nomSing = Data.getSiPron("nom", words.lowered, gender)
  if (nomSing !== undefined) {
    return Option.some(nomSing)
  }

  const accSing = Data.getSiPron("acc", words.lowered, gender)
  if (accSing !== undefined) {
    return Option.some(accSing)
  }

  // Isolated irregular plurals
  const irregCap = Data.si_sb_irregular_caps.get(words.last)
  if (irregCap !== undefined) {
    return Option.some(`${word.slice(0, word.length - words.last.length)}${irregCap}`)
  }

  const irreg = Data.si_sb_irregular.get(loweredLast)
  if (irreg !== undefined) {
    return Option.some(`${word.slice(0, word.length - loweredLast.length)}${irreg}`)
  }

  const dashSplit = words.lowered.split("-")
  const lastTwoDash = dashSplit.slice(-2).join(" ")
  const irregCompound = Data.si_sb_irregular_compound.get(lastTwoDash)
  if (irregCompound !== undefined) {
    return Option.some(`${word.slice(0, word.length - lastTwoDash.length)}${irregCompound}`)
  }

  if (words.lowered.slice(-5) === "quies") {
    return Option.some(`${word.slice(0, -3)}y`)
  }
  if (words.lowered.slice(-7) === "persons") {
    return Option.some(word.slice(0, -1))
  }
  if (words.lowered.slice(-6) === "people") {
    return Option.some(`${word.slice(0, -4)}rson`)
  }

  // Families of irregular plurals
  const last4 = words.lowered.slice(-4)
  const last3 = words.lowered.slice(-3)
  const last5 = words.lowered.slice(-5)

  if (last4 === "mans") {
    if (
      matchesBysizeSuffix(words.lowered, Data.si_sb_U_man_mans_bysize) ||
      matchesBysizeSuffix(word, Data.si_sb_U_man_mans_caps_bysize)
    ) {
      return Option.some(word.slice(0, -1))
    }
  }
  if (last3 === "men") {
    return Option.some(`${word.slice(0, -3)}man`)
  }
  if (last4 === "mice") {
    return Option.some(`${word.slice(0, -4)}mouse`)
  }
  if (last4 === "lice") {
    const bucket = Data.si_sb_U_louse_lice_bysize.get(word.length)
    if (bucket !== undefined && bucket.has(words.lowered)) {
      return Option.some(`${word.slice(0, -4)}louse`)
    }
  }
  if (last5 === "geese") {
    return Option.some(`${word.slice(0, -5)}goose`)
  }
  if (last5 === "teeth") {
    return Option.some(`${word.slice(0, -5)}tooth`)
  }
  if (last4 === "feet") {
    return Option.some(`${word.slice(0, -4)}foot`)
  }
  if (words.lowered === "dice") {
    return Option.some("die")
  }

  // Unassimilated imports
  if (last4 === "ceps") {
    return Option.some(word)
  }
  if (last3 === "zoa") {
    return Option.some(`${word.slice(0, -1)}on`)
  }

  const lastChar = words.lowered.slice(-1)
  for (const [lastLet, table, numEnd, post] of SI_UNASSIMILATED_RULES) {
    if (lastChar === lastLet && matchesBysizeSuffix(words.lowered, table)) {
      return Option.some(slicePrefix(word, numEnd) + post)
    }
  }

  // Incompletely assimilated imports
  if (state.classical.ancient) {
    if (words.lowered.slice(-6) === "trices") {
      return Option.some(`${word.slice(0, -3)}x`)
    }
    if (last4 === "eaux" || last4 === "ieux") {
      return Option.some(word.slice(0, -1))
    }
    if ((last5 === "ynges" || last5 === "inges" || last5 === "anges") && word.length > 6) {
      return Option.some(`${word.slice(0, -3)}x`)
    }

    for (const [lastLet, table, numEnd, post] of SI_ANCIENT_RULES) {
      if (lastChar === lastLet && matchesBysizeSuffix(words.lowered, table)) {
        return Option.some(slicePrefix(word, numEnd) + post)
      }
    }
  }

  // uses -> use
  if (
    words.lowered.slice(-6) === "houses" ||
    Data.si_sb_uses_use_case_set.has(word) ||
    Data.si_sb_uses_use_set.has(loweredLast)
  ) {
    return Option.some(word.slice(0, -1))
  }

  // ies -> ie
  if (Data.si_sb_ies_ie_case_set.has(word) || Data.si_sb_ies_ie_set.has(loweredLast)) {
    return Option.some(word.slice(0, -1))
  }

  // oes -> oe
  if (
    last5 === "shoes" ||
    Data.si_sb_oes_oe_case_set.has(word) ||
    Data.si_sb_oes_oe_set.has(loweredLast)
  ) {
    return Option.some(word.slice(0, -1))
  }

  // sibilants
  if (Data.si_sb_sses_sse_case_set.has(word) || Data.si_sb_sses_sse_set.has(loweredLast)) {
    return Option.some(word.slice(0, -1))
  }

  if (Data.si_sb_singular_s_complete_set.has(loweredLast)) {
    return Option.some(word.slice(0, -2))
  }

  if (matchesBysizeSuffix(words.lowered, Data.si_sb_singular_s_bysize)) {
    return Option.some(word.slice(0, -2))
  }

  const firstChar = word.charAt(0)
  if (last4 === "eses" && firstChar === firstChar.toUpperCase()) {
    return Option.some(word.slice(0, -2))
  }

  if (Data.si_sb_z_zes_set.has(loweredLast) || Data.si_sb_zzes_zz_set.has(loweredLast)) {
    return Option.some(word.slice(0, -2))
  }

  if (last4 === "zzes") {
    return Option.some(word.slice(0, -3))
  }

  if (Data.si_sb_ches_che_case_set.has(word) || Data.si_sb_ches_che_set.has(loweredLast)) {
    return Option.some(word.slice(0, -1))
  }

  if (last4 === "ches" || last4 === "shes") {
    return Option.some(word.slice(0, -2))
  }

  if (Data.si_sb_xes_xe_set.has(loweredLast)) {
    return Option.some(word.slice(0, -1))
  }

  if (last3 === "xes") {
    return Option.some(word.slice(0, -2))
  }

  // ...f -> ...ves
  if (Data.si_sb_ves_ve_case_set.has(word) || Data.si_sb_ves_ve_set.has(loweredLast)) {
    return Option.some(word.slice(0, -1))
  }

  if (last3 === "ves") {
    const mid = words.lowered.slice(-5, -3)
    if (mid === "el" || mid === "al" || mid === "ol" || mid === "ar") {
      return Option.some(`${word.slice(0, -3)}f`)
    }
    if (mid === "ea" && word.slice(-6, -5) !== "d") {
      return Option.some(`${word.slice(0, -3)}f`)
    }
    if (mid === "ni" || mid === "li" || mid === "wi") {
      return Option.some(`${word.slice(0, -3)}fe`)
    }
  }

  // ...y
  const last2 = words.lowered.slice(-2)
  if (last2 === "ys") {
    if (
      words.lowered.length > 2 &&
      VOWELS_SET.has(words.lowered.charAt(words.lowered.length - 3))
    ) {
      return Option.some(word.slice(0, -1))
    }
    if (state.classical.names && firstChar === firstChar.toUpperCase()) {
      return Option.some(word.slice(0, -1))
    }
  }

  if (last3 === "ies") {
    return Option.some(`${word.slice(0, -3)}y`)
  }

  // ...o
  if (last2 === "os") {
    if (Data.si_sb_U_o_os_complete_set.has(loweredLast)) {
      return Option.some(word.slice(0, -1))
    }
    if (matchesBysizeSuffix(words.lowered, Data.si_sb_U_o_os_bysize)) {
      return Option.some(word.slice(0, -1))
    }
    if (
      last3 === "aos" ||
      last3 === "eos" ||
      last3 === "ios" ||
      last3 === "oos" ||
      last3 === "uos"
    ) {
      return Option.some(word.slice(0, -1))
    }
  }

  if (last3 === "oes") {
    return Option.some(word.slice(0, -2))
  }

  // Unassimilated imports final rule
  if (Data.si_sb_es_is_set.has(word)) {
    return Option.some(`${word.slice(0, -2)}is`)
  }

  // Words ending in -ss are already singular
  if (last2 === "ss") {
    return Option.none()
  }

  if (lastChar === "s") {
    return Option.some(word.slice(0, -1))
  }

  return Option.none()
}

export function pluralWord(text: string, count: CountInput, state: InflectorState): string {
  const [pre, word, post] = partitionWord(text)
  if (word === "") {
    return text
  }
  const inflected =
    plSpecialAdjective(word, count, state) ??
    plSpecialVerb(word, count, state) ??
    plnoun(word, count, state)
  return `${pre}${postprocess(word, inflected, state)}${post}`
}

export function pluralNounWord(text: string, count: CountInput, state: InflectorState): string {
  const [pre, word, post] = partitionWord(text)
  if (word === "") {
    return text
  }
  return `${pre}${postprocess(word, plnoun(word, count, state), state)}${post}`
}

export function pluralVerbWord(text: string, count: CountInput, state: InflectorState): string {
  const [pre, word, post] = partitionWord(text)
  if (word === "") {
    return text
  }
  const inflected = plSpecialVerb(word, count, state) ?? plGeneralVerb(word, count, state)
  return `${pre}${postprocess(word, inflected, state)}${post}`
}

export function pluralAdjWord(text: string, count: CountInput, state: InflectorState): string {
  const [pre, word, post] = partitionWord(text)
  if (word === "") {
    return text
  }
  const inflected = plSpecialAdjective(word, count, state) ?? word
  return `${pre}${postprocess(word, inflected, state)}${post}`
}

export function singularNounWord(
  text: string,
  count: CountInput,
  gender: Gender,
  state: InflectorState
): Option.Option<string> {
  const [pre, word, post] = partitionWord(text)
  if (word === "") {
    return Option.some(text)
  }
  return Option.map(
    sinoun(word, count, gender, state),
    (sing) => `${pre}${postprocess(word, sing, state)}${post}`
  )
}

export function presentParticipleWord(word: string, state: InflectorState): string {
  const plv = pluralVerbWord(word, 2, state)
  for (const [regex, repl] of PRESENT_PARTICIPLE_REPLACEMENTS) {
    if (regex.test(plv)) {
      return `${plv.replace(regex, repl)}ing`
    }
  }
  return `${plv}ing`
}

export function plRegPlurals(pair: string, stems: string, end1: string, end2: string): boolean {
  const pattern = new RegExp(`(${stems})(${end1}\\|\\1${end2}|${end2}\\|\\1${end1})`)
  return pattern.test(pair)
}

export function plCheckPluralsNoun(word1: string, word2: string): boolean {
  const w1 = parseWords(word1)
  const w2 = parseWords(word2)
  if (w1 === undefined || w2 === undefined) {
    return false
  }
  const pair = `${w1.last}|${w2.last}`
  if (Data.pl_sb_irregular_values.has(pair)) {
    return true
  }
  for (const [stems, end1, end2] of COMPARE_STEM_ENDINGS) {
    if (plRegPlurals(pair, stems, end1, end2)) {
      return true
    }
  }
  return false
}

export function plCheckPluralsAdj(word1: string, word2: string): boolean {
  const word1a =
    word1.endsWith("'s") || word1.endsWith("'") ? word1.slice(0, word1.lastIndexOf("'")) : ""
  const word2a =
    word2.endsWith("'s") || word2.endsWith("'") ? word2.slice(0, word2.lastIndexOf("'")) : ""
  return (
    word1a !== "" &&
    word2a !== "" &&
    (plCheckPluralsNoun(word1a, word2a) || plCheckPluralsNoun(word2a, word1a))
  )
}

type PluralMode = "all" | "noun" | "verb" | "adj"

function applyPluralMode(mode: PluralMode, word: string, state: InflectorState): string {
  switch (mode) {
    case "all":
      return pluralWord(word, undefined, state)
    case "noun":
      return pluralNounWord(word, undefined, state)
    case "verb":
      return pluralVerbWord(word, undefined, state)
    case "adj":
      return pluralAdjWord(word, undefined, state)
  }
}

function plEqual(
  word1: string,
  word2: string,
  mode: PluralMode,
  state: InflectorState
): ComparisonResult {
  for (const classical of [allClassical, noClassical]) {
    const tempState: InflectorState = { ...state, classical }
    if (word1 === word2) {
      return ComparisonResult.cases.Equal.make({})
    }
    if (word1 === applyPluralMode(mode, word2, tempState)) {
      return ComparisonResult.cases.PluralSingular.make({})
    }
    if (applyPluralMode(mode, word1, tempState) === word2) {
      return ComparisonResult.cases.SingularPlural.make({})
    }
  }

  if (mode === "all" || mode === "noun") {
    if (plCheckPluralsNoun(word1, word2) || plCheckPluralsNoun(word2, word1)) {
      return ComparisonResult.cases.PluralPlural.make({})
    }
  }
  if ((mode === "all" || mode === "adj") && plCheckPluralsAdj(word1, word2)) {
    return ComparisonResult.cases.PluralPlural.make({})
  }
  return ComparisonResult.cases.NotEqual.make({})
}

const COMPARE_MODES: ReadonlyArray<PluralMode> = ["noun", "verb", "adj"]

export function compareWords(
  word1: string,
  word2: string,
  state: InflectorState
): ComparisonResult {
  for (const mode of COMPARE_MODES) {
    const result = plEqual(word1, word2, mode, state)
    if (result._tag !== "NotEqual") {
      return result
    }
  }
  return ComparisonResult.cases.NotEqual.make({})
}

export function compareNounWords(
  word1: string,
  word2: string,
  state: InflectorState
): ComparisonResult {
  return plEqual(word1, word2, "noun", state)
}

export function compareVerbWords(
  word1: string,
  word2: string,
  state: InflectorState
): ComparisonResult {
  return plEqual(word1, word2, "verb", state)
}

export function compareAdjWords(
  word1: string,
  word2: string,
  state: InflectorState
): ComparisonResult {
  return plEqual(word1, word2, "adj", state)
}

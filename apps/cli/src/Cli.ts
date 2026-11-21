import { Argument, CliError, Command, Flag } from "effect/cli"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Match from "effect/Match"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import {
  a,
  applyClassical,
  applyGender,
  compare,
  compareAdjs,
  compareNouns,
  compareVerbs,
  comparisonCode,
  defaultState,
  inflect,
  Inflector,
  join,
  makeInflector,
  no,
  numberToCurrency,
  numberToWords,
  numberToWordsList,
  ordinal,
  plural,
  pluralAdj,
  pluralNoun,
  pluralVerb,
  presentParticiple,
  singularNoun,
  type ClassicalPatch,
  type Gender as GenderType,
  type NumberToWordsOptions,
  Word
} from "inflectionts"

export class AlreadySingularError extends Schema.TaggedError<
  AlreadySingularError,
  { readonly brand: unique symbol }
>()("AlreadySingularError", {
  word: Schema.String,
  message: Schema.String
}) {}

// Command.run prints a UserError as a one-line message with exit code 1, instead of
// logging the typed library error with a stack trace.
const asUserError = Effect.mapError(
  (cause: { readonly message: string }) => new CliError.UserError({ cause })
)

const GENDER_CHOICES: ReadonlyArray<GenderType> = [
  "neuter",
  "feminine",
  "masculine",
  "gender-neutral",
  "feminine or masculine",
  "masculine or feminine"
]

const partFlag = Flag.Literals("part", ["all", "noun", "verb", "adj"]).pipe(
  Flag.withAlias("p"),
  Flag.withDescription("Part of speech rules to apply"),
  Flag.withDefault("all")
)

const countFlag = Flag.String("count").pipe(
  Flag.withAlias("n"),
  Flag.withDescription("Grammatical count (number or word such as '1', '0', 'one')"),
  Flag.optional
)

const wordArg = Argument.String("word").pipe(
  Argument.withDescription("English word or phrase"),
  Argument.withSchema(Word)
)

const root = Command.make("inflect").pipe(
  Command.withDescription(
    "English inflection CLI: plurals, singulars, word comparison, articles, ordinals, number words, check amounts, lists, and templates. Docs: https://github.com/ethan-wickstrom/inflectionts#readme"
  ),
  Command.withSharedFlags({
    classical: Flag.Boolean("classical").pipe(
      Flag.withAlias("C"),
      Flag.withDescription("Enable all classical pluralization modes"),
      Flag.withDefault(false)
    ),
    classicalAncient: Flag.Boolean("classical-ancient").pipe(
      Flag.withDescription("Enable classical Latin/Greek plurals (e.g. formula -> formulae)"),
      Flag.optional
    ),
    classicalHerd: Flag.Boolean("classical-herd").pipe(
      Flag.withDescription("Enable classical herd plurals (e.g. wildebeest -> wildebeest)"),
      Flag.optional
    ),
    classicalNames: Flag.Boolean("classical-names").pipe(
      Flag.withDescription(
        "Control classical proper-name plurals (default on; pass --no-classical-names to disable)"
      ),
      Flag.optional
    ),
    classicalPersons: Flag.Boolean("classical-persons").pipe(
      Flag.withDescription("Enable classical person plurals (e.g. person -> persons)"),
      Flag.optional
    ),
    classicalZero: Flag.Boolean("classical-zero").pipe(
      Flag.withDescription("Treat zero as singular (e.g. 0 error)"),
      Flag.optional
    ),
    gender: Flag.Literals("gender", GENDER_CHOICES).pipe(
      Flag.withAlias("g"),
      Flag.withDescription(
        "Default grammatical gender for singularizing third-person plural pronouns"
      ),
      Flag.withDefault("neuter")
    )
  })
)

const pluralCmd = Command.make(
  "plural",
  {
    word: wordArg,
    count: countFlag,
    part: partFlag
  },
  Effect.fn("cli.plural")(function* ({ count, part, word }) {
    const countVal = Option.getOrUndefined(count)
    const result = yield* Match.value(part).pipe(
      Match.when("all", () => plural(word, countVal)),
      Match.when("noun", () => pluralNoun(word, countVal)),
      Match.when("verb", () => pluralVerb(word, countVal)),
      Match.when("adj", () => pluralAdj(word, countVal)),
      Match.exhaustive
    )
    yield* Console.log(result)
  }, asUserError)
).pipe(
  Command.withAlias("pl"),
  Command.withDescription("Pluralize a singular noun, verb, adjective, or general word"),
  Command.withExamples([
    { command: "inflect plural person", description: "Pluralize a noun -> people" },
    { command: "inflect plural cat --count 1", description: "Keep singular for count 1 -> cat" },
    { command: "inflect plural was --part verb", description: "Pluralize a verb -> were" }
  ])
)

const singularCmd = Command.make(
  "singular",
  {
    word: wordArg,
    count: countFlag,
    genderOverride: Flag.Literals("gender-override", GENDER_CHOICES).pipe(
      Flag.withDescription("Override pronoun gender for this lookup"),
      Flag.optional
    ),
    fallback: Flag.Boolean("fallback").pipe(
      Flag.withDescription(
        "Print the input word unchanged instead of failing when already singular"
      ),
      Flag.withDefault(false)
    )
  },
  Effect.fn("cli.singular")(function* ({ count, fallback, genderOverride, word }) {
    const result = yield* singularNoun(
      word,
      Option.getOrUndefined(count),
      Option.getOrUndefined(genderOverride)
    )
    if (Option.isSome(result)) {
      yield* Console.log(result.value)
      return
    }
    if (fallback) {
      yield* Console.log(word)
      return
    }
    return yield* new AlreadySingularError({
      word,
      message: `'${word}' is already singular or has no singular form; pass --fallback to print it unchanged`
    })
  }, asUserError)
).pipe(
  Command.withAlias("sg"),
  Command.withDescription("Convert a plural noun or pronoun to its singular form"),
  Command.withExamples([
    { command: "inflect singular people", description: "Singularize a plural noun -> person" },
    {
      command: "inflect --gender feminine singular they",
      description: "Singularize pronoun -> she"
    }
  ])
)

const compareCmd = Command.make(
  "compare",
  {
    word1: Argument.String("word1").pipe(
      Argument.withDescription("First word"),
      Argument.withSchema(Word)
    ),
    word2: Argument.String("word2").pipe(
      Argument.withDescription("Second word"),
      Argument.withSchema(Word)
    ),
    part: partFlag
  },
  Effect.fn("cli.compare")(function* ({ part, word1, word2 }) {
    const comparison = yield* Match.value(part).pipe(
      Match.when("all", () => compare(word1, word2)),
      Match.when("noun", () => compareNouns(word1, word2)),
      Match.when("verb", () => compareVerbs(word1, word2)),
      Match.when("adj", () => compareAdjs(word1, word2)),
      Match.exhaustive
    )
    yield* Console.log(comparisonCode(comparison) ?? "none")
  }, asUserError)
).pipe(
  Command.withAlias("cmp"),
  Command.withDescription(
    "Compare two words regardless of grammatical number (eq, s:p, p:s, p:p, or none)"
  ),
  Command.withExamples([
    { command: "inflect compare index indices", description: "Singular vs plural -> s:p" }
  ])
)

const articleCmd = Command.make(
  "article",
  {
    word: wordArg,
    count: countFlag
  },
  Effect.fn("cli.article")(function* ({ count, word }) {
    const result = yield* a(word, Option.getOrUndefined(count))
    yield* Console.log(result)
  }, asUserError)
).pipe(
  Command.withAlias("a"),
  Command.withDescription("Prepend the appropriate indefinite article ('a' or 'an') to a word"),
  Command.withExamples([
    { command: "inflect article hour", description: "-> an hour" },
    { command: "inflect a university", description: "-> a university" }
  ])
)

const noCmd = Command.make(
  "no",
  {
    word: wordArg,
    count: countFlag
  },
  Effect.fn("cli.no")(function* ({ count, word }) {
    const result = yield* no(word, Option.getOrUndefined(count))
    yield* Console.log(result)
  }, asUserError)
).pipe(
  Command.withDescription("Format a count-prefixed noun, replacing zero counts with 'no'"),
  Command.withExamples([
    { command: "inflect no error --count 0", description: "-> no errors" },
    { command: "inflect no error --count 1", description: "-> 1 error" }
  ])
)

const participleCmd = Command.make(
  "participle",
  {
    word: Argument.String("verb").pipe(
      Argument.withDescription("Third-person singular verb"),
      Argument.withSchema(Word)
    )
  },
  Effect.fn("cli.participle")(function* ({ word }) {
    yield* Console.log(yield* presentParticiple(word))
  }, asUserError)
).pipe(
  Command.withAlias("ing"),
  Command.withDescription("Generate the present participle (-ing form) for a verb"),
  Command.withExamples([{ command: "inflect participle run", description: "-> running" }])
)

const ordinalCmd = Command.make(
  "ordinal",
  {
    value: Argument.String("value").pipe(
      Argument.withDescription("Number or number word"),
      Argument.withSchema(Word)
    )
  },
  Effect.fn("cli.ordinal")(function* ({ value }) {
    yield* Console.log(yield* ordinal(value))
  }, asUserError)
).pipe(
  Command.withAlias("ord"),
  Command.withDescription("Convert a numeral or number word to its English ordinal"),
  Command.withExamples([
    { command: "inflect ordinal 21", description: "-> 21st" },
    { command: "inflect ordinal twenty-one", description: "-> twenty-first" }
  ])
)

const wordsCmd = Command.make(
  "words",
  {
    value: Argument.String("value").pipe(
      Argument.withDescription("Number or ordinal string to spell out"),
      Argument.withSchema(Word)
    ),
    group: Flag.Int("group").pipe(
      Flag.withDescription("Digit grouping width (0, 1, 2, or 3)"),
      Flag.optional
    ),
    andword: Flag.String("andword").pipe(
      Flag.withDescription("Conjunction word (default 'and'; pass '' to omit)"),
      Flag.optional
    ),
    comma: Flag.String("comma").pipe(
      Flag.withDescription("Group separator string (default ',')"),
      Flag.optional
    ),
    noComma: Flag.Boolean("no-comma").pipe(
      Flag.withDescription("Disable comma separators"),
      Flag.withDefault(false)
    ),
    zero: Flag.String("zero").pipe(
      Flag.withDescription("Word used for zero (default 'zero')"),
      Flag.optional
    ),
    one: Flag.String("one").pipe(
      Flag.withDescription("Word used for one (default 'one')"),
      Flag.optional
    ),
    decimal: Flag.String("decimal").pipe(
      Flag.withDescription("Word used for decimal point (default 'point')"),
      Flag.optional
    ),
    noDecimal: Flag.Boolean("no-decimal").pipe(
      Flag.withDescription("Treat decimals as part of the integer"),
      Flag.withDefault(false)
    ),
    threshold: Flag.Int("threshold").pipe(
      Flag.withDescription("Keep numbers strictly above this threshold as digits"),
      Flag.optional
    ),
    list: Flag.Boolean("list").pipe(
      Flag.withDescription("Print word chunks as a JSON array"),
      Flag.withDefault(false)
    )
  },
  Effect.fn("cli.words")(function* (args) {
    const options: NumberToWordsOptions = {
      group: Option.getOrUndefined(args.group),
      andword: Option.getOrUndefined(args.andword),
      comma: args.noComma ? false : Option.getOrUndefined(args.comma),
      zero: Option.getOrUndefined(args.zero),
      one: Option.getOrUndefined(args.one),
      decimal: args.noDecimal ? false : Option.getOrUndefined(args.decimal),
      threshold: Option.getOrUndefined(args.threshold)
    }

    if (args.list) {
      const chunks = yield* numberToWordsList(args.value, options)
      yield* Console.log(JSON.stringify(chunks))
      return
    }
    yield* Console.log(yield* numberToWords(args.value, options))
  }, asUserError)
).pipe(
  Command.withDescription("Spell out a number as English words"),
  Command.withExamples([
    { command: "inflect words 1234", description: "-> one thousand, two hundred and thirty-four" },
    {
      command: "inflect words 5551202 --group 1 --zero oh",
      description: "-> five, five, five, one, two, oh, two"
    }
  ])
)

const currencyCmd = Command.make(
  "currency",
  {
    amount: Argument.String("amount").pipe(
      Argument.withDescription("Numeric currency amount"),
      Argument.withSchema(Word)
    ),
    andword: Flag.String("andword").pipe(
      Flag.withDescription("Conjunction word for whole-dollar part (default 'and')"),
      Flag.optional
    )
  },
  Effect.fn("cli.currency")(function* ({ amount, andword }) {
    const result = yield* numberToCurrency(amount, {
      andword: Option.getOrUndefined(andword)
    })
    yield* Console.log(result)
  }, asUserError)
).pipe(
  Command.withDescription(
    "Format an amount in check-style currency words with half-up cent rounding"
  ),
  Command.withExamples([
    {
      command: "inflect currency 1234.56",
      description: "-> one thousand, two hundred and thirty-four and 56/100"
    }
  ])
)

const joinCmd = Command.make(
  "join",
  {
    words: Argument.String("words").pipe(
      Argument.withDescription("Words to join"),
      Argument.withSchema(Word),
      Argument.variadic()
    ),
    sep: Flag.String("sep").pipe(
      Flag.withDescription("Item separator (defaults to ',' or ';' if items contain commas)"),
      Flag.optional
    ),
    sepSpaced: Flag.Boolean("sep-spaced").pipe(
      Flag.withDescription("Include a space after separators (pass --no-sep-spaced to omit)"),
      Flag.withDefault(true)
    ),
    finalSep: Flag.String("final-sep").pipe(
      Flag.withDescription("Final separator before conjunction"),
      Flag.optional
    ),
    conj: Flag.String("conj").pipe(
      Flag.withDescription("Conjunction word (default 'and')"),
      Flag.optional
    ),
    conjSpaced: Flag.Boolean("conj-spaced").pipe(
      Flag.withDescription("Include spaces around the conjunction (pass --no-conj-spaced to omit)"),
      Flag.withDefault(true)
    )
  },
  Effect.fn("cli.join")(function* ({ conj, conjSpaced, finalSep, sep, sepSpaced, words }) {
    const result = yield* join(words, {
      sep: Option.getOrUndefined(sep),
      sepSpaced,
      finalSep: Option.getOrUndefined(finalSep),
      conj: Option.getOrUndefined(conj),
      conjSpaced
    })
    yield* Console.log(result)
  }, asUserError)
).pipe(
  Command.withDescription("Join words into an English conjunction list"),
  Command.withExamples([
    { command: "inflect join apple banana carrot", description: "-> apple, banana, and carrot" },
    {
      command: "inflect join apple banana carrot --conj or",
      description: "-> apple, banana, or carrot"
    }
  ])
)

const templateCmd = Command.make(
  "template",
  {
    text: Argument.String("text").pipe(
      Argument.withDescription("Template string containing inline inflection calls"),
      Argument.withSchema(Word)
    )
  },
  Effect.fn("cli.template")(function* ({ text }) {
    yield* Console.log(yield* inflect(text))
  }, asUserError)
).pipe(
  Command.withAlias("eval"),
  Command.withDescription("Interpolate inline inflection expressions inside a template string"),
  Command.withExamples([
    {
      command: "inflect template \"There plural_verb('was',2) no('error',2)\"",
      description: "-> There were 2 errors"
    }
  ])
)

const buildInflectorFromRoot = Effect.fn("cli.buildInflector")(function* (flags: {
  readonly classical: boolean
  readonly classicalAncient: Option.Option<boolean>
  readonly classicalHerd: Option.Option<boolean>
  readonly classicalNames: Option.Option<boolean>
  readonly classicalPersons: Option.Option<boolean>
  readonly classicalZero: Option.Option<boolean>
  readonly gender: GenderType
}) {
  let state = defaultState
  const patch: ClassicalPatch = {
    all: flags.classical ? true : undefined,
    ancient: Option.getOrUndefined(flags.classicalAncient),
    herd: Option.getOrUndefined(flags.classicalHerd),
    names: Option.getOrUndefined(flags.classicalNames),
    persons: Option.getOrUndefined(flags.classicalPersons),
    zero: Option.getOrUndefined(flags.classicalZero)
  }
  const hasPatch =
    patch.all !== undefined ||
    patch.ancient !== undefined ||
    patch.herd !== undefined ||
    patch.names !== undefined ||
    patch.persons !== undefined ||
    patch.zero !== undefined
  if (hasPatch) {
    state = yield* applyClassical(state, patch)
  }
  state = yield* applyGender(state, flags.gender)
  return yield* makeInflector(state)
})

export const cli = root.pipe(
  Command.withSubcommands([
    pluralCmd,
    singularCmd,
    compareCmd,
    articleCmd,
    noCmd,
    participleCmd,
    ordinalCmd,
    wordsCmd,
    currencyCmd,
    joinCmd,
    templateCmd
  ]),
  Command.provideEffect(Inflector, buildInflectorFromRoot)
)

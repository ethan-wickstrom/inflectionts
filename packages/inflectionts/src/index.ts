/**
 * Public entrypoint for `inflectionts`.
 *
 * @stability stable
 * @since 0.1.0
 */
export {
  BadChunkingOptionError,
  BadGenderError,
  BadNumValueError,
  BadUserDefinedPatternError,
  InflectTemplateError,
  InvalidWordError,
  NumOutOfRangeError,
  UnknownClassicalModeError,
  type InflectError
} from "./Errors.ts"

export {
  a,
  an,
  applyClassical,
  applyDefAdj,
  applyDefArticle,
  applyDefNoun,
  applyDefVerb,
  applyGender,
  applyNum,
  classical,
  compare,
  compareAdjs,
  compareNouns,
  compareVerbs,
  defa,
  defadj,
  defan,
  defnoun,
  defverb,
  gender,
  getState,
  inflect,
  Inflector,
  isInflectorService,
  join,
  makeInflector,
  no,
  num,
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
  TypeId,
  type InflectorService
} from "./Inflector.ts"

export {
  allClassical,
  CaseMode,
  ClassicalConfig,
  ClassicalMode,
  ComparisonCode,
  comparisonCode,
  ComparisonResult,
  defaultClassical,
  defaultPreserveCase,
  defaultState,
  Gender,
  isGender,
  isInflectorState,
  noClassical,
  NumberGroup,
  StateTypeId,
  Word,
  type ClassicalPatch,
  type CountInput,
  type DefNounOptions,
  type InflectorState,
  type JoinOptions,
  type NumberInput,
  type NumberToCurrencyOptions,
  type NumberToWordsOptions,
  type UserDefinedEntry
} from "./Schema.ts"

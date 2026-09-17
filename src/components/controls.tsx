import { useId } from 'react';
import {
  EXPLANATION_LANGUAGES,
  LANGUAGE_INFO,
  UI_LANGUAGES,
  type ExplanationLanguage,
  type UiLanguage,
} from '../../shared/languages';
import type { AnalysisResult } from '../../shared/schema';
import { useI18n } from '../i18n/I18nProvider';
import type { MessageKey } from '../i18n/messages/en';
import { fairnessByParty, fairnessForReader } from '../lib/insights';
import { partyLabel, type Perspective } from '../lib/perspective';
import {
  TEXT_SIZES,
  THEMES,
  useSettings,
  type ReadingLevel,
  type TextSize,
  type ThemePreference,
} from '../settings/SettingsProvider';
import { Icon, type IconName } from './Icon';
import { Select } from './Select';

/**
 * Reusable brutalist controls. All choice groups are native radio inputs inside a
 * fieldset, so keyboard (arrow keys) and screen-reader behaviour come for free.
 */

interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
  lang?: string;
  /** Accessible name when the visible label is a symbol. */
  title?: string;
}

export function Segmented<T extends string>({
  legend,
  value,
  options,
  onChange,
  compact = false,
  hideLegend = false,
}: {
  legend: string;
  value: T;
  options: readonly SegmentOption<T>[];
  onChange: (value: T) => void;
  compact?: boolean;
  hideLegend?: boolean;
}) {
  const name = useId();
  return (
    <fieldset className={`segmented${compact ? ' segmented--compact' : ''}`}>
      <legend className={hideLegend ? 'visually-hidden' : 'segmented__legend'}>{legend}</legend>
      <div className="segmented__options">
        {options.map((option) => (
          <label key={option.value} className="segmented__option" lang={option.lang}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span className="segmented__face">
              {option.icon && <Icon name={option.icon} />}
              <span aria-hidden={option.title ? true : undefined}>{option.label}</span>
              {option.title && <span className="visually-hidden">{option.title}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Interface language, each option written in its own script. */
export function LanguageSwitch() {
  const { t, language } = useI18n();
  const { setUiLanguage } = useSettings();
  return (
    <Segmented<UiLanguage>
      legend={t('uiLanguageLabel')}
      value={language}
      options={UI_LANGUAGES.map((option) => ({
        value: option,
        label: LANGUAGE_INFO[option].nativeName,
        lang: option,
      }))}
      onChange={setUiLanguage}
    />
  );
}

/** Compact interface-language dropdown for page headers. */
export function LanguageSelect() {
  const { t, language } = useI18n();
  const { setUiLanguage } = useSettings();
  return (
    <Select<UiLanguage>
      label={t('uiLanguageLabel')}
      hideLabel
      compact
      value={language}
      options={UI_LANGUAGES.map((option) => ({
        value: option,
        label: LANGUAGE_INFO[option].nativeName,
        lang: option,
      }))}
      onChange={setUiLanguage}
    />
  );
}

/** The language Gemini writes explanations in (10 Indian languages). */
export function ExplanationLanguageSelect() {
  const { t } = useI18n();
  const { explanationLanguage, setExplanationLanguage } = useSettings();
  return (
    <Select<ExplanationLanguage>
      label={t('explanationLanguageLabel')}
      labelIcon="globe"
      value={explanationLanguage}
      options={EXPLANATION_LANGUAGES.map((option) => ({
        value: option,
        label: LANGUAGE_INFO[option].nativeName,
        hint: option === 'en' ? undefined : LANGUAGE_INFO[option].englishName,
        lang: option,
      }))}
      onChange={setExplanationLanguage}
    />
  );
}

const THEME_META: Record<ThemePreference, { key: MessageKey; icon: IconName }> = {
  system: { key: 'themeSystem', icon: 'monitor' },
  light: { key: 'themeLight', icon: 'sun' },
  dark: { key: 'themeDark', icon: 'moon' },
};

export function ThemeSwitch() {
  const { t } = useI18n();
  const { theme, setTheme } = useSettings();
  return (
    <Segmented<ThemePreference>
      legend={t('themeLabel')}
      value={theme}
      options={THEMES.map((option) => ({
        value: option,
        label: t(THEME_META[option].key),
        icon: THEME_META[option].icon,
      }))}
      onChange={setTheme}
    />
  );
}

const TEXT_SIZE_META: Record<TextSize, { label: string; key: MessageKey }> = {
  normal: { label: 'A', key: 'textSizeNormal' },
  large: { label: 'A+', key: 'textSizeLarge' },
  xlarge: { label: 'A++', key: 'textSizeXLarge' },
};

export function TextSizeSwitch() {
  const { t } = useI18n();
  const { textSize, setTextSize } = useSettings();
  return (
    <Segmented<TextSize>
      legend={t('textSizeLabel')}
      value={textSize}
      options={TEXT_SIZES.map((option) => ({
        value: option,
        label: TEXT_SIZE_META[option].label,
        title: t(TEXT_SIZE_META[option].key),
      }))}
      onChange={setTextSize}
    />
  );
}

export function ReadingLevelSwitch() {
  const { t } = useI18n();
  const { readingLevel, setReadingLevel } = useSettings();
  return (
    <Segmented<ReadingLevel>
      legend={t('readingLevel')}
      value={readingLevel}
      options={[
        { value: 'simple', label: t('levelSimple') },
        { value: 'detailed', label: t('levelDetailed') },
      ]}
      onChange={setReadingLevel}
    />
  );
}

/** "Who are you in this paper?" — relabels every clause from the reader's side. */
export function RolePicker({
  analysis,
  perspective,
  onChange,
  hideLegend = false,
}: {
  analysis: AnalysisResult;
  perspective: Perspective;
  onChange: (perspective: Perspective) => void;
  /** When a surrounding heading already asks the question. */
  hideLegend?: boolean;
}) {
  const { t } = useI18n();
  const name = useId();
  const options = [
    ...analysis.parties.map((party) => ({
      id: party.id as string | null,
      label: party.role,
      hint: party.name,
    })),
    { id: null, label: t('perspectiveNone'), hint: '' },
  ];
  return (
    <fieldset className="roles">
      <legend className={hideLegend ? 'visually-hidden' : 'roles__legend'}>
        <Icon name="user" /> {t('perspectiveQuestion')}
      </legend>
      <div className="roles__options">
        {options.map((option) => (
          <label key={option.id ?? 'none'} className="role">
            <input
              type="radio"
              name={name}
              checked={perspective === option.id}
              onChange={() => onChange(option.id)}
            />
            <span className="role__face">
              <span className="role__label" lang={option.id ? analysis.language : undefined}>
                {option.label}
              </span>
              {option.hint && <span className="role__hint">{option.hint}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Stacked bar of which side the clauses favour. */
export function FairnessBar({
  analysis,
  perspective,
}: {
  analysis: AnalysisResult;
  perspective: Perspective;
}) {
  const { t } = useI18n();
  const total = Math.max(1, analysis.points.length);

  const segments =
    perspective === null
      ? fairnessByParty(analysis.points, analysis.parties).map((row, index) => ({
          key: row.partyId ?? 'balanced',
          tone: row.partyId === null ? 'balanced' : index === 0 ? 'party-a' : 'party-b',
          label:
            row.partyId === null
              ? t('fairnessBalanced')
              : t('fairnessByParty', { party: partyLabel(analysis.parties, row.partyId) }),
          count: row.count,
        }))
      : (() => {
          const counts = fairnessForReader(analysis.points, perspective);
          return [
            { key: 'you', tone: 'you', label: t('fairnessForYou'), count: counts.you },
            {
              key: 'balanced',
              tone: 'balanced',
              label: t('fairnessBalanced'),
              count: counts.balanced,
            },
            { key: 'others', tone: 'others', label: t('fairnessForOthers'), count: counts.others },
          ];
        })();

  return (
    <div className="fairness">
      <div className="fairness__bar" aria-hidden="true">
        {segments
          .filter((segment) => segment.count > 0)
          .map((segment) => (
            <span
              key={segment.key}
              className={`fairness__segment fairness__segment--${segment.tone}`}
              style={{ flexGrow: segment.count }}
            >
              {segment.count}
            </span>
          ))}
      </div>
      <ul className="fairness__legend">
        {segments.map((segment) => (
          <li key={segment.key}>
            <span className={`swatch swatch--${segment.tone}`} aria-hidden="true" />
            <span lang={segment.key === 'balanced' ? undefined : analysis.language}>
              {segment.label}
            </span>
            <strong>
              {segment.count}
              <span className="muted"> / {total}</span>
            </strong>
          </li>
        ))}
      </ul>
      {perspective === null && <p className="hint">{t('fairnessPickRole')}</p>}
    </div>
  );
}

/** "in 12 days" / "today" / "3 days ago". */
export function useCountdown(): (days: number) => string {
  const { t } = useI18n();
  return (days) => {
    if (days === 0) return t('dayToday');
    if (days === 1) return t('dayTomorrow');
    if (days < 0) return t('dayPast', { count: Math.abs(days) });
    return t('daysLeft', { count: days });
  };
}

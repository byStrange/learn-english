import {audioUrl} from '../lib/speech';

/**
 * A word's picture: content, never a UI icon. Either an emoji character,
 * "swatch:#hex" for a colour, or a file path under public/.
 * An empty label makes it decorative (the word is written next to it).
 */
export function Picture({value, label, size = 'md'}: {value?: string; label: string; size?: 'sm' | 'md' | 'lg'}) {
  if (!value) return null;
  const a11y = label ? {role: 'img' as const, 'aria-label': label} : {'aria-hidden': true as const};
  if (value.startsWith('swatch:')) {
    return <span className={`picture picture-${size} picture-swatch`} {...a11y} style={{background: value.slice(7)}} />;
  }
  if (value.startsWith('/')) {
    return <img className={`picture picture-${size} picture-img`} src={audioUrl(value)} alt={label} />;
  }
  return (
    <span className={`picture picture-${size}`} {...a11y}>
      {value}
    </span>
  );
}

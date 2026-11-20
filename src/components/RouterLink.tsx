import type {AnchorHTMLAttributes, Ref} from 'react';
import {Link} from 'react-router';

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {href?: string; ref?: Ref<HTMLAnchorElement>};

/**
 * Curialy UI components render links through this: in-app paths go through the
 * hash router, outside links (http…, mailto:) stay plain anchors.
 */
export function RouterLink({href = '/', ref, ...rest}: Props) {
  if (/^(https?:|mailto:|tel:)/.test(href) || href.startsWith('#')) {
    return <a ref={ref} href={href} {...rest} />;
  }
  return <Link ref={ref} to={href} {...rest} />;
}

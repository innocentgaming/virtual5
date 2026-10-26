import React, { useEffect } from 'react';
import { navigate } from './router';

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  replace?: boolean;
}

export const Link: React.FC<LinkProps> = ({ to, replace, onClick, target, children, ...rest }) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (
      !e.defaultPrevented &&
      e.button === 0 &&
      (!target || target === '_self') &&
      !e.metaKey &&
      !e.altKey &&
      !e.ctrlKey &&
      !e.shiftKey
    ) {
      e.preventDefault();
      navigate(to, { replace });
    }
  };

  return (
    <a href={to} onClick={handleClick} target={target} {...rest}>
      {children}
    </a>
  );
};

export const Redirect: React.FC<{ to: string; replace?: boolean }> = ({ to, replace = true }) => {
  useEffect(() => {
    navigate(to, { replace });
  }, [to, replace]);

  return null;
};

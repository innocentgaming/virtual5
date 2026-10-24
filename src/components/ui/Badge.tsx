import React from 'react';

export type BadgeVariant =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'dietary'
  | 'gold'
  | 'wedding'
  | 'birthday'
  | 'community';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dietaryType?: 'jain' | 'pure_veg';
  dot?: boolean;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  dietaryType,
  dot = false,
  icon,
  size,
  className = '',
  children,
  ...props
}) => {
  const isDietary = variant === 'dietary' || Boolean(dietaryType);
  const dietaryClass = dietaryType ? `ui-badge--dietary-${dietaryType}` : '';
  const sizeClass = size ? `badge-${size} ui-badge--${size}` : '';

  return (
    <span
      className={`ui-badge badge badge-${variant} ui-badge--${variant} ${dietaryClass} ${sizeClass} ${className}`.trim()}
      {...props}
    >
      {dot && <span className="ui-badge__dot" aria-hidden="true" />}
      {icon && <span className="ui-badge__icon" aria-hidden="true">{icon}</span>}
      {isDietary && dietaryType === 'jain' && !dot && !icon && (
        <span className="ui-badge__icon" aria-hidden="true">🥗</span>
      )}
      {isDietary && dietaryType === 'pure_veg' && !dot && !icon && (
        <span className="ui-badge__icon" aria-hidden="true">🌱</span>
      )}
      <span>{children}</span>
    </span>
  );
};

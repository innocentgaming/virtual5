import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'subtle' | 'elevated' | 'glass' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  ...props
}) => {
  const variantClass = variant !== 'default' ? `card-${variant}` : '';
  const paddingClass = padding !== 'md' ? `card-p-${padding}` : '';

  return (
    <div
      className={`card ${variantClass} ${paddingClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
};

export interface CardHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
  icon,
  children,
  className = '',
  ...props
}) => {
  if (children) {
    return (
      <div className={`card-header ${className}`.trim()} {...props}>
        {children}
      </div>
    );
  }

  return (
    <div className={`card-header ${className}`.trim()} {...props}>
      <div className="card-header-main">
        {title && (
          <h3 className="card-title">
            {icon && <span className="card-header-icon" aria-hidden="true">{icon}</span>}
            {title}
          </h3>
        )}
        {subtitle && <p className="card-subtitle">{subtitle}</p>}
      </div>
      {action && <div className="card-header-action">{action}</div>}
    </div>
  );
};

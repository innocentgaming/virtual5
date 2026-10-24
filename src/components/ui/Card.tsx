import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'subtle' | 'interactive' | string;
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  interactive = false,
  className = '',
  children,
  ...props
}) => {
  const isInteractive = interactive || variant === 'interactive';
  const variantClass = variant === 'subtle' ? 'ui-card--subtle card-subtle' : '';

  return (
    <div
      className={`ui-card card ${isInteractive ? 'ui-card--interactive card-interactive' : ''} ${variantClass} ${className}`.trim()}
      tabIndex={isInteractive ? 0 : undefined}
      {...props}
    >
      {children}
    </div>
  );
};

export interface CardHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  icon,
  action,
  className = '',
  children,
  ...props
}) => {
  return (
    <div className={`ui-card__header card-header ${className}`.trim()} {...props}>
      <div className="ui-card__header-content">
        {title && (
          <h3 className="ui-card__title card-title">
            {icon && <span className="card-title-icon" aria-hidden="true">{icon}</span>}
            <span>{title}</span>
          </h3>
        )}
        {subtitle && <p className="ui-card__subtitle card-subtitle">{subtitle}</p>}
        {children}
      </div>
      {action && <div className="ui-card__header-action">{action}</div>}
    </div>
  );
};

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardBody: React.FC<CardBodyProps> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <div className={`ui-card__body ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardContent = CardBody;

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardFooter: React.FC<CardFooterProps> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <div className={`ui-card__footer ${className}`} {...props}>
      {children}
    </div>
  );
};

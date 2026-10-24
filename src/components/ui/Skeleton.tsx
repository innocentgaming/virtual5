import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shape?: 'line' | 'block' | 'circle';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  shape = 'block',
  width,
  height,
  className = '',
  style,
  ...props
}) => {
  return (
    <div
      className={`ui-skeleton ui-skeleton--${shape} ${className}`}
      style={{
        width,
        height,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    />
  );
};

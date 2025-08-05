import React from 'npm:react@18.3.1';
import { Link } from 'npm:@react-email/components@0.0.22';
import { buttonStyle } from '../utils/email-styles.ts';

interface ButtonProps {
  href: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const Button = ({ href, children, style = {} }: ButtonProps) => (
  <Link 
    href={href}
    style={{
      ...buttonStyle,
      ...style,
    }}
  >
    {children}
  </Link>
);
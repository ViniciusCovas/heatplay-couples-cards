export const emailStyles = {
  colors: {
    primary: '#ff6b6b',
    secondary: '#4ecdc4',
    white: '#ffffff',
    black: '#333333',
    gray: '#666666',
    lightGray: '#f8f9fa',
    gradient: 'linear-gradient(135deg, #ff6b6b, #4ecdc4)',
  },
  fonts: {
    main: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  spacing: {
    xs: '8px',
    sm: '12px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '40px',
  },
  borderRadius: {
    sm: '6px',
    md: '12px',
    lg: '25px',
  },
  shadows: {
    light: '0 10px 30px rgba(0,0,0,0.1)',
    medium: '0 20px 40px rgba(0,0,0,0.15)',
  },
} as const;

export const containerStyle = {
  maxWidth: '600px',
  margin: '0 auto',
  backgroundColor: emailStyles.colors.white,
  borderRadius: emailStyles.borderRadius.md,
  overflow: 'hidden',
  boxShadow: emailStyles.shadows.medium,
};

export const headerStyle = {
  background: emailStyles.colors.gradient,
  padding: `${emailStyles.spacing.xxl} ${emailStyles.spacing.lg}`,
  textAlign: 'center' as const,
  color: emailStyles.colors.white,
};

export const contentStyle = {
  padding: `${emailStyles.spacing.xxl} ${emailStyles.spacing.xl}`,
  lineHeight: '1.6',
  color: emailStyles.colors.black,
  fontFamily: emailStyles.fonts.main,
};

export const footerStyle = {
  backgroundColor: emailStyles.colors.lightGray,
  padding: emailStyles.spacing.lg,
  textAlign: 'center' as const,
  fontSize: '14px',
  color: emailStyles.colors.gray,
};

export const buttonStyle = {
  display: 'inline-block',
  background: emailStyles.colors.gradient,
  color: emailStyles.colors.white,
  textDecoration: 'none',
  padding: `${emailStyles.spacing.md} ${emailStyles.spacing.xl}`,
  borderRadius: emailStyles.borderRadius.lg,
  fontWeight: '600',
  margin: `${emailStyles.spacing.lg} 0`,
  textAlign: 'center' as const,
};

export const headingStyle = {
  margin: '0 0 16px 0',
  fontSize: '28px',
  fontWeight: '700',
  color: emailStyles.colors.white,
};

export const subheadingStyle = {
  margin: '0 0 24px 0',
  fontSize: '20px',
  fontWeight: '600',
  color: emailStyles.colors.black,
};

export const listStyle = {
  paddingLeft: '20px',
  margin: '16px 0',
};

export const listItemStyle = {
  marginBottom: '8px',
  color: emailStyles.colors.black,
};
import React from 'npm:react@18.3.1';
import {
  Html,
  Head,
  Body,
  Container,
  Preview,
} from 'npm:@react-email/components@0.0.22';
import { Header } from './Header.tsx';
import { Footer } from './Footer.tsx';
import { containerStyle } from '../utils/email-styles.ts';

interface BaseLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export const BaseLayout = ({ preview, children }: BaseLayoutProps) => (
  <Html lang="en">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={{ 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      margin: '0',
      padding: '0',
      background: 'linear-gradient(135deg, #ff6b6b, #4ecdc4)',
      color: '#333',
    }}>
      <Container style={containerStyle}>
        <Header />
        {children}
        <Footer />
      </Container>
    </Body>
  </Html>
);
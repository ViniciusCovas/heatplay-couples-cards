import React from 'npm:react@18.3.1';
import { Section, Text, Link } from 'npm:@react-email/components@0.0.22';
import { footerStyle } from '../utils/email-styles.ts';

export const Footer = () => (
  <Section style={footerStyle}>
    <Text style={{ margin: '0 0 8px 0' }}>
      Thank you for being part of Connection Cards!
    </Text>
    <Text style={{ margin: '0' }}>
      Questions? Reply to this email - we'd love to hear from you.
    </Text>
    <Text style={{ 
      margin: '16px 0 0 0',
      fontSize: '12px',
      color: '#999',
    }}>
      <Link 
        href="https://9efb8ab7-d861-473b-88f1-2736da9c245d.lovableproject.com"
        style={{ color: '#999', textDecoration: 'underline' }}
      >
        Connection Cards
      </Link>
      {' • '}
      <Link 
        href="#" 
        style={{ color: '#999', textDecoration: 'underline' }}
      >
        Unsubscribe
      </Link>
    </Text>
  </Section>
);
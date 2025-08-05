import React from 'npm:react@18.3.1';
import { Section, Heading, Text } from 'npm:@react-email/components@0.0.22';
import { headerStyle, headingStyle } from '../utils/email-styles.ts';

export const Header = () => (
  <Section style={headerStyle}>
    <Heading style={headingStyle}>Connection Cards 💕</Heading>
    <Text style={{ 
      margin: '0',
      fontSize: '16px',
      color: 'white',
      opacity: 0.9,
    }}>
      Deepen your relationships through meaningful conversations
    </Text>
  </Section>
);
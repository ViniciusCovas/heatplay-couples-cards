import React from 'npm:react@18.3.1';
import { Section, Text, Heading } from 'npm:@react-email/components@0.0.22';
import { BaseLayout } from '../components/BaseLayout.tsx';
import { Button } from '../components/Button.tsx';
import { contentStyle, subheadingStyle, listStyle, listItemStyle } from '../utils/email-styles.ts';

interface ReengagementEmailProps {
  email: string;
  last_seen?: string;
  days_inactive?: number;
}

export const ReengagementEmail = ({ email, days_inactive = 14 }: ReengagementEmailProps) => (
  <BaseLayout preview="We miss you! Come back to Connection Cards 💕">
    <Section style={contentStyle}>
      <Heading style={subheadingStyle}>We miss you at Connection Cards! 💔</Heading>
      
      <Text style={{ marginBottom: '20px' }}>
        It's been {days_inactive} days since we last saw you, and your relationship deserves those meaningful moments of connection.
      </Text>
      
      <Text style={{ marginBottom: '24px' }}>
        Life gets busy, but the strongest relationships are built through consistent, intentional conversations. 
        Connection Cards is here to help you create those special moments with your partner.
      </Text>
      
      <Heading as="h3" style={{ 
        ...subheadingStyle,
        fontSize: '18px',
        marginBottom: '12px',
        marginTop: '32px',
      }}>
        What's new since you've been away:
      </Heading>
      
      <ul style={listStyle}>
        <li style={listItemStyle}>🆕 Enhanced AI question selection for better conversations</li>
        <li style={listItemStyle}>🌟 New intimacy levels with fresh question categories</li>
        <li style={listItemStyle}>📱 Improved mobile experience for on-the-go connection</li>
        <li style={listItemStyle}>🎯 Better relationship insights and analysis</li>
        <li style={listItemStyle}>🌍 More languages and cultural adaptations</li>
      </ul>
      
      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <Button href="https://9efb8ab7-d861-473b-88f1-2736da9c245d.lovableproject.com">
          Start a New Game
        </Button>
      </div>
      
      <Text style={{ 
        backgroundColor: '#f8f9fa',
        padding: '20px',
        borderRadius: '12px',
        marginTop: '24px',
        fontStyle: 'italic',
      }}>
        💡 <strong>Pro tip:</strong> Set aside just 15 minutes tonight to reconnect with your partner. 
        You'll be amazed at what you discover about each other!
      </Text>
      
      <Text style={{ 
        marginTop: '24px',
        fontSize: '14px',
        color: '#666',
        textAlign: 'center',
      }}>
        Don't want to receive these emails? 
        <a href="#" style={{ color: '#ff6b6b', textDecoration: 'underline' }}>
          Unsubscribe here
        </a>
      </Text>
    </Section>
  </BaseLayout>
);
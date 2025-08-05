import React from 'npm:react@18.3.1';
import { Section, Text, Heading } from 'npm:@react-email/components@0.0.22';
import { BaseLayout } from '../components/BaseLayout.tsx';
import { Button } from '../components/Button.tsx';
import { contentStyle, subheadingStyle, listStyle, listItemStyle } from '../utils/email-styles.ts';

interface WelcomeEmailProps {
  email: string;
  user_id?: string;
  created_at?: string;
}

export const WelcomeEmail = ({ email }: WelcomeEmailProps) => (
  <BaseLayout preview="Welcome to Connection Cards! 💕">
    <Section style={contentStyle}>
      <Heading style={subheadingStyle}>Ready to strengthen your connection?</Heading>
      
      <Text style={{ marginBottom: '20px' }}>
        Welcome to Connection Cards - the AI-powered couples game that helps you discover new depths in your relationship through thoughtfully crafted conversation prompts.
      </Text>
      
      <Heading as="h3" style={{ 
        ...subheadingStyle,
        fontSize: '18px',
        marginBottom: '12px',
        marginTop: '32px',
      }}>
        What you can expect:
      </Heading>
      
      <ul style={listStyle}>
        <li style={listItemStyle}>🎯 AI-selected questions tailored to your relationship</li>
        <li style={listItemStyle}>🔥 Progressive intimacy levels from spark to deep connection</li>
        <li style={listItemStyle}>💬 Real-time multiplayer experience with your partner</li>
        <li style={listItemStyle}>📊 Relationship insights and compatibility analysis</li>
        <li style={listItemStyle}>🌍 Available in multiple languages</li>
      </ul>
      
      <Text style={{ margin: '24px 0' }}>
        Your journey to deeper connection starts now!
      </Text>
      
      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <Button href="https://9efb8ab7-d861-473b-88f1-2736da9c245d.lovableproject.com">
          Start Your First Game
        </Button>
      </div>
      
      <Heading as="h3" style={{ 
        ...subheadingStyle,
        fontSize: '18px',
        marginBottom: '12px',
        marginTop: '32px',
      }}>
        Tips for the best experience:
      </Heading>
      
      <ul style={listStyle}>
        <li style={listItemStyle}>Find a comfortable, private space with your partner</li>
        <li style={listItemStyle}>Put away distractions and focus on each other</li>
        <li style={listItemStyle}>Be honest and open in your responses</li>
        <li style={listItemStyle}>Remember: there are no wrong answers, only opportunities to connect</li>
      </ul>
    </Section>
  </BaseLayout>
);
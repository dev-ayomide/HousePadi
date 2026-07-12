import React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Hr,
  Img,
} from '@react-email/components';
import { SITE_URL } from '@/lib/constants';

interface AgencyRevokedEmailProps {
  agencyName: string;
}

export const AgencyRevokedEmail: React.FC<AgencyRevokedEmailProps> = ({
  agencyName,
}) => {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Img
              src={`${SITE_URL}/logo.svg`}
              width="40"
              height="40"
              alt="HousePadi Logo"
              style={logo}
            />
            <Text style={brandName}>HOUSEPADI</Text>
          </Section>
          <Hr style={divider} />
          <Section style={content}>
            <Heading style={title}>Application Update</Heading>
            <Text style={text}>
              Dear {agencyName},
            </Text>
            <Text style={text}>
              Thank you for your interest in joining the HousePadi network. After careful review of your application and verification documents, we are currently unable to approve your agency account.
            </Text>
            <Text style={text}>
              Our moderators maintain strict verification standards to ensure the quality and security of the spatial real estate ecosystem.
            </Text>
            <Text style={text}>
              If you believe this decision was made in error, or if you have updated verification documents, please contact our support team.
            </Text>
          </Section>
          <Hr style={divider} />
          <Section style={footer}>
            <Text style={footerText}>
              &copy; {new Date().getFullYear()} HousePadi. The spatial evolution of real estate.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default AgencyRevokedEmail;

const main = {
  backgroundColor: '#050505',
  fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  margin: '0',
  padding: '40px 0',
};

const container = {
  backgroundColor: '#111111',
  border: '1px solid #222222',
  borderRadius: '8px',
  margin: '0 auto',
  maxWidth: '600px',
  padding: '40px',
};

const header = {
  display: 'flex',
  alignItems: 'center',
  marginBottom: '20px',
};

const logo = {
  display: 'inline-block',
  filter: 'brightness(0) invert(1)',
};

const brandName = {
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: '700',
  letterSpacing: '0.3em',
  marginLeft: '12px',
  display: 'inline-block',
  textTransform: 'uppercase' as const,
};

const title = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: '300',
  letterSpacing: '-0.02em',
  marginBottom: '24px',
};

const text = {
  color: '#888888',
  fontSize: '14px',
  lineHeight: '24px',
  marginBottom: '20px',
  fontWeight: '300',
};

const divider = {
  borderColor: '#222222',
  margin: '30px 0',
};

const content = {
  marginBottom: '40px',
};

const footer = {
  textAlign: 'center' as const,
};

const footerText = {
  color: '#555555',
  fontSize: '10px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.1em',
};

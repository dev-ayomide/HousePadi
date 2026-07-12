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

interface VendorOTPEmailProps {
  businessName: string;
  otpCode: string;
}

export const VendorOTPEmail: React.FC<VendorOTPEmailProps> = ({
  businessName,
  otpCode,
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
            <Heading style={title}>Verify Your Vendor Account</Heading>
            <Text style={text}>
              Hello {businessName},
            </Text>
            <Text style={text}>
              Thank you for registering as a Product Vendor on HousePadi. To complete your setup and begin listing your 3D products, please verify your email address using the confirmation code below:
            </Text>
            
            <Section style={codeBox}>
              <Text style={codeLabel}>Verification Code</Text>
              <Text style={codeValue}>{otpCode}</Text>
            </Section>

            <Text style={text}>
              This code is valid for a limited time. If you didn't create this account, please ignore this email.
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

export default VendorOTPEmail;

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

const codeBox = {
  backgroundColor: '#000000',
  border: '1px solid #333333',
  padding: '24px',
  marginBottom: '24px',
  borderRadius: '4px',
  textAlign: 'center' as const,
};

const codeLabel = {
  color: '#555555',
  fontSize: '10px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.1em',
  margin: '0 0 8px 0',
};

const codeValue = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0',
  fontFamily: 'monospace',
  letterSpacing: '3px',
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

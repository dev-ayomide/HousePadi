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
  Button,
} from '@react-email/components';
import { SITE_URL } from '@/lib/constants';

interface VendorWelcomeEmailProps {
  businessName: string;
}

export const VendorWelcomeEmail: React.FC<VendorWelcomeEmailProps> = ({
  businessName,
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
            <Heading style={title}>Welcome to HousePadi!</Heading>
            <Text style={text}>
              Hello {businessName},
            </Text>
            <Text style={text}>
              We're excited to have you join our growing network of vendors helping customers discover products and spaces in a more immersive and convenient way.
            </Text>
            <Text style={text}>
              Your vendor account has been successfully created, and you can now begin setting up your storefront, managing your inventory, and showcasing your products to potential customers across the platform.
            </Text>
            <Text style={text}>
              With HousePadi, your products can become part of a richer digital experience that helps users explore, evaluate, and make purchasing decisions with greater confidence.
            </Text>

            <Heading style={subtitle}>Getting Started</Heading>
            <Text style={text}>
              Here are a few things you can do next:
            </Text>
            <ul style={list}>
              <li style={listItem}>Complete your vendor profile</li>
              <li style={listItem}>Add your products and product information</li>
              <li style={listItem}>Upload high-quality images and media</li>
              <li style={listItem}>Monitor customer engagement and inquiries</li>
              <li style={listItem}>Keep your inventory and pricing up to date</li>
            </ul>

            <Heading style={subtitle}>Why Sell on HousePadi?</Heading>
            <ul style={list}>
              <li style={listItem}>Reach a growing audience actively exploring products and spaces</li>
              <li style={listItem}>Increase visibility through immersive digital experiences</li>
              <li style={listItem}>Manage your offerings from a dedicated vendor dashboard</li>
              <li style={listItem}>Be part of a platform shaping the future of digital commerce and property exploration</li>
            </ul>

            <Text style={text}>
              If you have any questions or need assistance getting started, our support team is always available to help.
            </Text>

            <Text style={text}>
              Thank you for choosing HousePadi. We look forward to seeing your products on the platform.
            </Text>

            <Text style={text}>
              Best regards,<br/>
              <strong style={{ color: '#ffffff' }}>The HousePadi Team</strong>
            </Text>

            <Text style={{ ...text, fontStyle: 'italic', color: '#555555' }}>
              Helping people explore before they visit.
            </Text>

            <Button href={`${SITE_URL}/auth/login`} style={button}>
              Access Vendor Dashboard
            </Button>
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

export default VendorWelcomeEmail;

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

const subtitle = {
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '500',
  letterSpacing: '-0.01em',
  marginTop: '32px',
  marginBottom: '16px',
};

const text = {
  color: '#888888',
  fontSize: '14px',
  lineHeight: '24px',
  marginBottom: '20px',
  fontWeight: '300',
};

const list = {
  color: '#888888',
  fontSize: '14px',
  lineHeight: '24px',
  marginBottom: '20px',
  fontWeight: '300',
  paddingLeft: '20px',
};

const listItem = {
  marginBottom: '8px',
};

const button = {
  backgroundColor: '#ffffff',
  color: '#000000',
  padding: '12px 24px',
  borderRadius: '0px',
  fontSize: '12px',
  fontWeight: '700',
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  textDecoration: 'none',
  display: 'inline-block',
  marginTop: '20px',
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

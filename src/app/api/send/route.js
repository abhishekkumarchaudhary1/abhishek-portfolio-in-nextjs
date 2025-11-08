import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import twilio from 'twilio';

export async function POST(request) {
  try {
    const { name, email, phone, subject, message } = await request.json();

    // Debug: Log environment variables (remove in production)
    console.log('Email User:', process.env.EMAIL_USER);
    console.log('Email Pass exists:', !!process.env.EMAIL_PASS);

    // Create a transporter using SMTP
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Email content
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to yourself
      subject: `New Contact Form Submission: ${subject}`,
      text: `
        Name: ${name}
        Email: ${email}
        Phone: ${phone || 'Not provided'}
        Subject: ${subject}
        Message: ${message}
      `,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    // Send SMS notification if Twilio is configured
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER && process.env.MY_PHONE_NUMBER) {
      try {
        const client = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );

        // Format phone numbers to E.164 format (remove spaces, ensure + prefix)
        const formatPhoneNumber = (phone) => {
          if (!phone) return null;
          // Remove all spaces, dashes, and parentheses
          let formatted = phone.replace(/[\s\-\(\)]/g, '');
          // Ensure it starts with +
          if (!formatted.startsWith('+')) {
            formatted = '+' + formatted;
          }
          return formatted;
        };

        const twilioPhone = formatPhoneNumber(process.env.TWILIO_PHONE_NUMBER);
        const recipientPhone = formatPhoneNumber(process.env.MY_PHONE_NUMBER);

        if (!twilioPhone || !recipientPhone) {
          throw new Error('Invalid phone number format');
        }

        // Validate phone number format (basic check)
        if (!/^\+[1-9]\d{1,14}$/.test(twilioPhone)) {
          throw new Error(`Invalid Twilio phone number format: ${twilioPhone}. Must be in E.164 format (e.g., +1234567890)`);
        }

        if (!/^\+[1-9]\d{1,14}$/.test(recipientPhone)) {
          throw new Error(`Invalid recipient phone number format: ${recipientPhone}. Must be in E.164 format (e.g., +919876543210)`);
        }

        const smsMessage = `New contact form submission from ${name} (${email}). Phone: ${phone || 'Not provided'}. Subject: ${subject}. Message: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`;

        await client.messages.create({
          body: smsMessage,
          from: twilioPhone,
          to: recipientPhone,
        });

        console.log('SMS sent successfully to', recipientPhone);
      } catch (smsError) {
        // Log SMS error with helpful message but don't fail the request if email was sent
        if (smsError.code === 21659 || smsError.message?.includes('not a Twilio phone number')) {
          console.error('SMS Error: The phone number used for TWILIO_PHONE_NUMBER is not a valid Twilio number.');
          console.error('Please ensure you are using a phone number you own in your Twilio account.');
          console.error('To get a Twilio number: Go to Twilio Console → Phone Numbers → Manage → Buy a number');
          console.error('Current TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER);
        } else {
          console.error('Error sending SMS:', smsError.message || smsError);
        }
        // Continue even if SMS fails
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send email' },
      { status: 500 }
    );
  }
} 
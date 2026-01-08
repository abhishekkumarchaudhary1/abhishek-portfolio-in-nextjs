import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import twilio from 'twilio';

export async function POST(request) {
  try {
    const { name, email, phone, subject, message } = await request.json();

    // Debug: Log environment variables (remove in production)
    console.log('Email User:', process.env.EMAIL_USER);
    console.log('Email Pass exists:', !!process.env.EMAIL_PASS);

    // Generate messageId: first name + last 4 digits of phone + timestamp
    const firstName = name.split(' ')[0].toUpperCase();
    const phoneDigits = phone ? phone.replace(/\D/g, '') : ''; // Remove non-digits
    const last4Digits = phoneDigits.length >= 4 ? phoneDigits.slice(-4) : phoneDigits || 'XXXX';
    
    // Generate timestamp: DDMMMYYYYHHMMam/pm (e.g., 08jan20261010pm)
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const month = monthNames[now.getMonth()];
    const year = now.getFullYear();
    const hours24 = now.getHours();
    const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
    const hours = String(hours12).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours24 >= 12 ? 'pm' : 'am';
    const timestamp = `${day}${month}${year}${hours}${minutes}${ampm}`;
    
    const messageId = `${firstName}-${last4Digits}-${timestamp}`;

    // Create a transporter using GoDaddy Titan Mail SMTP
    const transporter = nodemailer.createTransport({
      host: 'smtpout.secureserver.net',
      port: 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Email content - send to both email addresses
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: [
        process.env.EMAIL_USER, // support@abhishek-chaudhary.com
        'allencarrierinst@gmail.com'
      ],
      subject: `New Contact Form Submission (${messageId}): ${subject}`,
      text: `
        Message ID: ${messageId}
        Name: ${name}
        Email: ${email}
        Phone: ${phone || 'Not provided'}
        Subject: ${subject}
        Message: ${message}
      `,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Message ID:</strong> ${messageId}</p>
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

        const smsMessage = `New contact form submission [${messageId}] from ${name} (${email}). Phone: ${phone || 'Not provided'}. Subject: ${subject}. Message: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`;

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
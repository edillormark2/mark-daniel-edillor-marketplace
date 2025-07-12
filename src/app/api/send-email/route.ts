// src/app/api/send-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Create transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function POST(request: NextRequest) {
  try {
    console.log("Environment check:", {
      hasGmailUser: !!process.env.GMAIL_USER,
      hasGmailPassword: !!process.env.GMAIL_APP_PASSWORD,
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    });

    // Get the authorization header
    const authHeader = request.headers.get("authorization");
    console.log("Auth header present:", !!authHeader);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("Missing or invalid authorization header");
      return NextResponse.json(
        { error: "Missing authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1];

    // Verify the token with Supabase
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    console.log("Auth check:", {
      hasUser: !!user,
      authError: authError?.message,
      userId: user?.id,
    });

    if (authError || !user) {
      console.error("Authentication failed:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { to, subject, message, senderName, senderEmail, postTitle } = body;

    console.log("Request data:", {
      to: !!to,
      subject: !!subject,
      message: !!message,
      senderName: !!senderName,
      senderEmail: !!senderEmail,
    });

    // Validate required fields
    if (!to || !subject || !message || !senderName || !senderEmail) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to) || !emailRegex.test(senderEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Create enhanced email HTML content
    const emailHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Message from Capmus Marketplace</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              margin: 0; 
              padding: 0; 
              background-color: #f5f5f5;
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              background-color: white;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            .header { 
              background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
              color: white; 
              padding: 30px 20px; 
              text-align: center; 
            }
            .header h1 { 
              margin: 0; 
              font-size: 28px; 
              font-weight: 600;
            }
            .header p { 
              margin: 10px 0 0 0; 
              opacity: 0.9;
              font-size: 16px;
            }
            .content { 
              padding: 30px 20px; 
            }
            .message-header {
              background-color: #f8fafc;
              border-left: 4px solid #3b82f6;
              padding: 20px;
              margin: 20px 0;
              border-radius: 0 8px 8px 0;
            }
            .message-header h2 {
              margin: 0 0 10px 0;
              color: #1e293b;
              font-size: 20px;
            }
            .sender-info {
              display: flex;
              align-items: center;
              gap: 10px;
              margin: 15px 0;
            }
            .sender-details {
              flex: 1;
            }
            .sender-name {
              font-weight: 600;
              color: #1e293b;
              margin: 0;
            }
            .sender-email {
              color: #64748b;
              font-size: 14px;
              margin: 2px 0 0 0;
            }
            .message-box { 
              background-color: white; 
              padding: 25px; 
              border: 1px solid #e2e8f0;
              border-radius: 12px; 
              margin: 25px 0;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .message-content {
              font-size: 16px;
              line-height: 1.7;
              color: #334155;
              white-space: pre-wrap;
            }
            .reply-section {
              background-color: #f1f5f9;
              padding: 20px;
              border-radius: 8px;
              margin: 25px 0;
              text-align: center;
            }
            .reply-button {
              display: inline-block;
              padding: 12px 30px;
              background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
              color: white;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              transition: transform 0.2s;
            }
            .reply-button:hover {
              transform: translateY(-1px);
            }
            .footer { 
              text-align: center; 
              padding: 30px 20px; 
              background-color: #f8fafc;
              border-top: 1px solid #e2e8f0;
              color: #64748b; 
              font-size: 14px; 
            }
            .footer a {
              color: #3b82f6;
              text-decoration: none;
            }
            .timestamp {
              color: #64748b;
              font-size: 14px;
              margin-top: 15px;
            }
            @media (max-width: 600px) {
              .container { margin: 0; }
              .header { padding: 20px 15px; }
              .content { padding: 20px 15px; }
              .message-box { padding: 20px 15px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Capmus Marketplace</h1>
              <p>You have a new message!</p>
            </div>
            
            <div class="content">
              <div class="message-header">
                <h2>${subject}</h2>
                ${
                  postTitle
                    ? `<p><strong>Regarding:</strong> ${postTitle}</p>`
                    : ""
                }
              </div>
              
              <div class="sender-info">
                <div class="sender-details">
                  <p class="sender-name">${senderName}</p>
                  <p class="sender-email">${senderEmail}</p>
                </div>
              </div>
              
              <div class="message-box">
                <div class="message-content">${message}</div>
                <div class="timestamp">
                  Sent on ${new Date().toLocaleString()}
                </div>
              </div>
              
              <div class="reply-section">
                <p><strong>Ready to reply?</strong></p>
                <p>You can respond directly to this email or contact ${senderName} at:</p>
                <a href="mailto:${senderEmail}?subject=Re: ${subject}" class="reply-button">
                  Reply to ${senderName}
                </a>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <p><strong>💡 Pro tip:</strong> This message was sent through Capmus Marketplace. 
                You can reply directly to this email to continue the conversation.</p>
              </div>
            </div>
            
            <div class="footer">
              <p><strong>Capmus Marketplace</strong> - Connecting Capmus Communities</p>
              <p>This message was sent via our secure platform. 
              <a href="mailto:support@Capmusmarketplace.com">Contact Support</a> if you have any concerns.</p>
              <p style="margin-top: 15px; opacity: 0.7;">
                This email was sent to ${to} because you listed an item on Capmus Marketplace.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    console.log("Attempting to send email...");

    // Send email using Nodemailer
    const mailOptions = {
      from: `"Capmus Marketplace" <${process.env.GMAIL_USER}>`,
      to: to,
      subject: `[Capmus Marketplace] ${subject}`,
      html: emailHTML,
      replyTo: senderEmail,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("Email sent successfully:", info.messageId);

    return NextResponse.json({
      message: "Email sent successfully",
      emailId: info.messageId,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

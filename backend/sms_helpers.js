// backend/sms_helpers.js
require("dotenv").config();
const twilio = require("twilio");

// Configure Twilio client only if credentials exist
let client = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

/**
 * sendSMS - send a text message to a phone number
 * If Twilio credentials are not set, it will just log the message.
 */
async function sendSMS(phoneNumber, message) {
  if (!phoneNumber || !message) {
    console.warn("⚠️ sendSMS called without phone number or message");
    return;
  }

  if (client) {
    try {
      await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber,
      });
      console.log(`✅ SMS sent to ${phoneNumber}: ${message}`);
    } catch (err) {
      console.error("❌ SMS sending failed:", err);
    }
  } else {
    // Fallback: just log
    console.log(`📱 [LOG ONLY] SMS to ${phoneNumber}: ${message}`);
  }
}

module.exports = { sendSMS };
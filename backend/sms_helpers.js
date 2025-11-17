// backend/sms_helpers.js
require("dotenv").config();

/**
 * sendSMS - send a text message to a phone number
 * Replace with your SMS provider integration (Twilio, Nexmo, etc.)
 */
async function sendSMS(phoneNumber, message) {
  console.log(`📱 Sending SMS to ${phoneNumber}: ${message}`);

  // Example for Twilio (replace with your credentials):
  /*
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const client = require('twilio')(accountSid, authToken);

  await client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phoneNumber,
  });
  */
}

module.exports = { sendSMS };
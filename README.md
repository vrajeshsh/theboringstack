# TheBoringStack - Growth Marketing Architect

## Setting up the NVIDIA Llama Nemotron Search Bar

To make the search bar work with your NVIDIA Llama Nemotron API key, you need to configure the environment variable in your deployment or local environment.

1. **Get your API Key**: Obtain your NVIDIA API key from the NVIDIA API catalog (build.nvidia.com).
2. **Set the Environment Variable**:
   - In your local `.env` file, add:
     ```env
     NVIDIA_API_KEY=your_nvidia_api_key_here
     ```
   - In your production environment (e.g., Vercel, Render, Heroku, or AI Studio), add `NVIDIA_API_KEY` to your environment variables.

The search bar is now configured to use the `nvidia/llama-3.1-nemotron-70b-instruct` model via the `https://integrate.api.nvidia.com/v1/chat/completions` endpoint.

## Setting up the Mailing System

Currently, the application captures leads (names and emails) and stores them in a local SQLite database (`blueprints.db`) under the `subscribers` and `marketing_queries` tables.

To set up a fully functional mailing system (e.g., to automatically email the generated blueprint to the user or send follow-up sequences), you need to integrate an email service provider like Resend, SendGrid, or Mailgun.

### Steps to Integrate an Email Provider (e.g., Resend):

1. **Install the SDK**:
   ```bash
   npm install resend
   ```

2. **Add your API Key**:
   Add your email provider's API key to your `.env` file:
   ```env
   RESEND_API_KEY=your_resend_api_key
   ```

3. **Update the Backend (`server.ts`)**:
   In the `/api/unlock-query` endpoint, after the blueprint is successfully generated and unlocked, add the email sending logic:

   ```typescript
   import { Resend } from 'resend';
   const resend = new Resend(process.env.RESEND_API_KEY);

   // Inside app.post("/api/unlock-query", async (req, res) => { ...
   // After retrieving fullBlueprint:
   
   await resend.emails.send({
     from: 'Vrajesh <hello@yourdomain.com>',
     to: email,
     subject: 'Your Growth Marketing Blueprint',
     html: `
       <h1>Here is your custom architecture</h1>
       <p>Hi ${name},</p>
       <p>Thanks for using TheBoringStack. Here is your blueprint:</p>
       <pre>${JSON.stringify(fullBlueprint, null, 2)}</pre>
     `
   });
   ```

4. **Domain Verification**:
   Ensure you have verified your sending domain (e.g., `yourdomain.com`) in your email provider's dashboard to ensure high deliverability and avoid spam folders.

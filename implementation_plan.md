# Goal Description

Implement a new "WhatsApp Bulk Messaging" feature allowing the user to paste a list of numbers and send a broadcast message to all of them with a 10-second delay between each send to avoid bans. The sent messages and any replies must appear in the normal WhatsApp chat interface. Additionally, add a global toggle button in the WhatsApp page to easily stop or start the AI auto-responder.

## Proposed Changes

### Backend Changes

- Update `backend/models/CompanyModel.js` to include a global `aiEnabled` boolean property.
- Update `backend/controllers/webhookHandler.js` to respect the global `aiEnabled` flag. If it is false, incoming WhatsApp messages will not trigger an AI reply and will be marked as needing human attention.
- Update `backend/routes/Company.js` (or similar settings route) to provide an endpoint for toggling this global `aiEnabled` status.

### Frontend Changes

- Create `frontend/src/pages/dashboard/WhatsappBulk.jsx`: A new premium-designed page where users can paste numbers, type a message, and start the bulk send process. The sending will happen on the frontend by calling the existing send API sequentially with a 10-second delay, providing real-time progress feedback.
- Update `frontend/src/pages/dashboard/WhatsappTab.jsx` to include the global AI toggle button, styled prominently.
- Update `frontend/src/layouts/DashboardLayout.jsx` and `frontend/src/App.jsx` to register the new `WhatsappBulk` page route and add it to the sidebar navigation.

## Verification Plan

### Automated Tests
- N/A

### Manual Verification
- Go to the WhatsApp tab and toggle the AI setting. Verify that it saves correctly.
- Go to the new WhatsApp Bulk Sender page.
- Paste 2-3 test numbers and a message.
- Start sending and observe the 10-second delay and the progress indicator.
- Check the "Inbox" or "Conversations" page to ensure the sent messages appear in the chat history for each number.

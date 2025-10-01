Ntfy me for Homey
=================

Ntfy me is a Homey app that lets you trigger ntfyme.net push notifications straight from your Homey flows. Use it to forward critical alerts, flows events, or attach images captured by Homey-enabled devices without leaving the Homey ecosystem.

Features
--------
- Send plain text or pre-formatted JSON payloads to ntfyme.net.
- Automatically wrap simple messages in a JSON envelope when needed.
- Build JSON payloads inside a flow with the `Build JSON` action card.
- Include images (drop tokens or flow tokens) in notifications.

Requirements
------------
- Homey firmware v12.4.0 or higher.
- The ntfyme.net app for iOS or android

Getting Started
---------------
1. Install the Ntfy me app from the Homey App Store.
2. Add the "Ntfy me" device to your Homey. Pairing creates a virtual device that represents your ntfy endpoint.
3. Open the device settings and paste your ntfyme.net token.
4. Create or edit a Homey flow and add one of the Ntfy me action cards.
5. Test your flow to confirm notifications arrive in the ntfy.me app

Flow Action Cards
-----------------
- Ntfy me: Send a raw message (plain text or JSON).
- Ntfy me (flow): Send a message with the flow name included in the payload.
- Ntfy me (img): Upload an image along with an optional JSON body.
- Build JSON: Accumulate key/value pairs into a JSON string token that can be reused by subsequent actions.

Tips
----
- When the message field contains plain text, the app automatically wraps it in `{ "topic": "homey-message", "msg": "..." }` so ntfy understands the payload.
- Provide a full JSON string if you want to control fields manually (for example, to set `priority` or `tags`).
- The image action accepts uploaded images, Drop tokens, and image tokens from other cards.
- Use the Build JSON card at the start of a flow, then pass its output to a later Ntfy me card for complex payloads.

Troubleshooting
---------------
- "No device available": ensure the flow card is linked to the Ntfy me device.
- "No message provided": double-check that the message field is not empty or whitespace.
- ntfy.me request failed: verify that your bearer token is valid and that ntfyme.net is reachable from your network.

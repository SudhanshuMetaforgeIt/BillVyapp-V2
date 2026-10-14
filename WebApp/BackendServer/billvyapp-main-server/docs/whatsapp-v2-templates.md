# Billvy V2 WhatsApp templates

Tenant: `thestarrkuts`. Language: `en_IN`. The user confirmed all six names and the documented variable order. A read-only provider check on 14 Oct 2026 confirmed these names, language and body variable counts.

The latest read-only provider check on 14 Oct 2026 reported all six V2 templates as `APPROVED`, with `en_IN` and the expected body variable counts: OTP 1, bill confirmation 4, membership activation 5, appointment confirmation 5, appointment reminder 4, and membership expiry 4.

## Connection and activation

The backend now includes a Sparklebot template client and an OTP sender. It uses the existing Redis OTP verification flow. The local ignored `.env` has been configured with the existing token as requested; template listing authentication succeeded. One explicitly authorized test bill-confirmation message was sent on 14 Oct 2026 and the user confirmed receipt in WhatsApp. WhatsApp OTP delivery is now enabled and the backend was restarted and passed its health check. Registered active customer accounts can request a login code; manager/admin accounts still use password login. Automatic business-event triggers are not yet connected.

The live API returns `status: "success"` with nested `data.whatsapp_response`. The client accepts that response alongside the documented `success: true` shape. Confirmed acceptance without a message reference does not become a retryable failure; delivery tracking remains unavailable for that message.

Copy the WhatsApp block from `.env.example` to the backend `.env`. Set a newly rotated `WHATSAPP_ACCESS_TOKEN` privately. Use a plain URL for `WHATSAPP_API_BASE_URL`, not a Markdown link. Keep only one copy of each setting.

Never commit credentials or put them in frontend environment variables.

Set `WHATSAPP_OTP_TEMPLATE_NAME` to an approved template name. The existing `starrkuts_login_otp` can be reused if you confirm it is active and accepts one body field. For a new authentication template, verify whether Sparklebot requires additional OTP button parameters: the implemented client currently supports ordered body fields only. Do not enable a template that requires unsupported button or header fields.

Once the template has been confirmed, set `WHATSAPP_ENABLED=true` and restart the backend. WhatsApp takes precedence over the development logging sender. `LOGIN_OTP_RETURN_IN_RESPONSE=false` suppresses developer OTP responses; production always suppresses them. V2 selects the sender through `WHATSAPP_ENABLED`; V1's `VERIFICATION_CHANNELS` and `SMS_ENABLED` are not used by this backend. No SMS sender is configured.

Provider acceptance returns a message reference; it is not proof of delivery. Delivery/read webhooks and automatic business-event dispatch are not connected yet. Notification queue records currently feed the existing email integration. New WhatsApp event triggers need their own template mappings, duplicate protection, and delivery tracking before activation.

Provider reference: https://www.smsgatewayhub.com/free-sms-gateway-developer-api (WhatsApp API section).

## V2 templates

| Proposed name | Intended category | Variables in order | Trigger to connect after approval |
| --- | --- | --- | --- |
| `billvy_v2_login_otp` | Authentication | OTP | Login/account verification |
| `billvy_v2_bill_confirmation` | Utility | Customer name, salon name, bill number, total paid | Successfully completed bill |
| `billvy_v2_membership_activated` | Utility | Customer name, salon name, plan name, expiry date, coupon code | Active membership enrollment |
| `billvy_v2_appointment_confirmation` | Utility | Customer name, salon name, date, time, service names | Confirmed appointment |
| `billvy_v2_appointment_reminder` | Utility | Customer name, salon name, date, time | Scheduled reminder for an upcoming confirmed appointment |
| `billvy_v2_membership_expiry` | Utility candidate; provider review decides | Customer name, plan name, salon name, expiry date | Upcoming membership expiry |

The provider decides template category/approval. Authentication wording and buttons must use the provider's supported authentication template setup. Promotional offers should use separate marketing templates and customer messaging preferences.

## Message drafts

### Login OTP

Use Sparklebot's authentication template builder. The single body variable is the verification code. Configure the expiry note to match the application's OTP expiry.

### Bill confirmation

Hi {{1}}, your payment at {{2}} is confirmed. Bill number: {{3}}. Total paid: {{4}}. Thank you for visiting.

### Membership activated

Hi {{1}}, your {{3}} membership at {{2}} is active until {{4}}. Your membership coupon code is {{5}}. Please keep it for your next eligible visit.

### Appointment confirmation

Hi {{1}}, your appointment at {{2}} is confirmed for {{3}} at {{4}}. Services: {{5}}. Please contact the salon if you need to change your appointment.

### Appointment reminder

Hi {{1}}, this is a reminder of your appointment at {{2}} on {{3}} at {{4}}. We look forward to seeing you.

### Membership expiry

Hi {{1}}, your {{2}} membership at {{3}} expires on {{4}}. Please contact the salon if you have questions about your membership.

Start with text-only templates. PDF invoice attachments need a document-header template and a separate secure delivery design; existing private Cloudinary bill URLs should not be made public for this integration.

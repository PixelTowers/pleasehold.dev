-- Remove waitlist position sentence from seeded confirmation email templates.
-- The default template no longer shows position; this updates existing rows to match.
UPDATE email_templates
SET body_html = REPLACE(
  body_html,
  '<p>You''re <strong>#{{position}}</strong> on the waitlist. We''ll keep you updated as things progress.</p>',
  '<p>We''ll keep you updated as things progress.</p>'
)
WHERE type = 'confirmation'
  AND body_html LIKE '%#{{position}}%';

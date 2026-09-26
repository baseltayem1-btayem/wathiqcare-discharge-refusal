SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_name = 'signing_secure_tokens' AND column_name = 'token';

function(ctx)
  local identity = ctx.identity;
  local traits = std.get(identity, 'traits', {});
  local address = std.get(traits, 'company', std.get(traits, 'billingAddress', {}));
  local country = std.stripChars(std.get(address, 'country', ''), ' ');
  local fullName = std.join(' ', [n for n in [std.get(traits, 'name', ''), std.get(traits, 'surname', '')] if n != '']);
  local emailAddr = [a for a in std.get(identity, 'verifiable_addresses', []) if a.value == traits.email];
  local optional(key, value) = if value != '' then { [key]: value } else {};
  {
    identifier: identity.id,
    email: traits.email,
    name: if fullName != '' then fullName else traits.email,
    additional_attributes:
      optional('company_name', std.get(std.get(traits, 'company', {}), 'name', ''))
      + optional('country', country)
      + (if std.length(country) == 2 then { country_code: std.asciiUpper(country) } else {}),
    custom_attributes: {
      account_type: identity.schema_id,
      email_verified: std.length(emailAddr) > 0 && std.get(emailAddr[0], 'verified', false),
    }
    + optional('street_address', std.get(address, 'streetAddress', ''))
    + optional('postal_code', std.get(address, 'postalCode', ''))
    + optional('country', country)
    + optional('signed_up_at', std.get(identity, 'created_at', '')),
  }
